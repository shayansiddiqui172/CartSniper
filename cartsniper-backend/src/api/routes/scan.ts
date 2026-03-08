import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { getProductByBarcode } from '../../integrations/openFoodFacts';
import { recognizeProduct } from '../../integrations/claudeVision';
import { recognizeProductGemini } from '../../integrations/geminiVision';
import { getPricesForProduct } from '../../services/priceService';

const router = Router();
const prisma = new PrismaClient();

// 5 Canadian grocery stores for mock prices
const CANADIAN_STORES = [
  { name: 'Walmart', slug: 'walmart', address: 'Walmart Supercentre' },
  { name: 'Loblaws', slug: 'loblaws', address: 'Loblaws City Market' },
  { name: 'No Frills', slug: 'nofrills', address: 'No Frills' },
  { name: 'FreshCo', slug: 'freshco', address: 'FreshCo' },
  { name: 'Metro', slug: 'metro', address: 'Metro' },
];

// Generate deterministic mock prices seeded by barcode so they stay stable
function generateMockPrices(barcode: string) {
  // Simple hash from barcode to get a base price between $2 and $15
  let hash = 0;
  for (const ch of barcode) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  const base = 2 + Math.abs(hash % 1300) / 100; // $2.00 – $15.00

  return CANADIAN_STORES.map((store, i) => {
    // Each store varies ±20% from base, deterministic per store index
    const variation = 1 + ((((hash >> (i * 3)) & 0x3F) - 32) / 160);
    const price = +(base * variation).toFixed(2);
    // ~30% chance of a sale (deterministic)
    const onSale = ((hash >> (i * 5)) & 0x7) < 2;
    const salePrice = onSale ? +(price * 0.8).toFixed(2) : null;

    return {
      id: `mock-${store.slug}-${barcode}`,
      store: { id: store.slug, name: store.name, slug: store.slug, address: store.address },
      price,
      salePrice,
      effectivePrice: salePrice ?? price,
      inStock: true,
      unit: 'each',
      scrapedAt: new Date().toISOString(),
    };
  }).sort((a, b) => a.effectivePrice - b.effectivePrice);
}

// POST /scan/barcode - Core endpoint
// Scans barcode → looks up product (DB cache or Open Food Facts) → returns prices
router.post('/barcode', async (req, res) => {
  try {
    const { barcode } = req.body;

    if (!barcode) {
      return res.status(400).json({ error: 'Barcode is required' });
    }

    // 1. Get product (cached in DB or fetched from Open Food Facts)
    const product = await getProductByBarcode(barcode);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // 2. Try real prices from DB first
    const dbPrices = await getPricesForProduct(product.id);

    // 3. If no real prices, return mock Canadian store prices
    const prices = dbPrices.length > 0
      ? dbPrices
      : generateMockPrices(barcode);

    return res.json({
      product,
      prices,
      bestPrice: prices[0] || null,
    });
  } catch (error) {
    console.error('Scan barcode error:', error);
    return res.status(500).json({ error: 'Failed to scan barcode' });
  }
});

// POST /scan/image - Image recognition fallback
// Sends image to Gemini/Claude Vision to identify product
router.post('/image', async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image is required (base64)' });
    }

    // Try Gemini first, fall back to Claude Vision
    const identifiedProduct = await recognizeProductGemini(imageBase64)
      || await recognizeProduct(imageBase64);

    if (!identifiedProduct) {
      return res.status(404).json({ error: 'Could not identify product from image' });
    }

    // Search for product in our DB by name
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { name: { contains: identifiedProduct.name } },
          { brand: { contains: identifiedProduct.brand || '' } },
        ],
      },
    });

    if (!product) {
      return res.json({
        identified: identifiedProduct,
        product: null,
        prices: [],
        message: 'Product identified but not in our database yet. Try scanning the barcode.',
      });
    }

    const dbPrices = await getPricesForProduct(product.id);
    const prices = dbPrices.length > 0
      ? dbPrices
      : generateMockPrices(product.barcode);

    return res.json({
      identified: identifiedProduct,
      product,
      prices,
      bestPrice: prices[0] || null,
    });
  } catch (error) {
    console.error('Scan image error:', error);
    return res.status(500).json({ error: 'Failed to process image' });
  }
});

export default router;
