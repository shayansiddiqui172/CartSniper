import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { getProductByBarcode } from '../../integrations/openFoodFacts';
import { recognizeProduct } from '../../integrations/claudeVision';
import { recognizeProductGemini } from '../../integrations/geminiVision';
import { getPricesForProduct, getPricesNearby } from '../../services/priceService';

const router = Router();
const prisma = new PrismaClient();

// Canadian grocery store locations across the GTA
const CANADIAN_STORES = [
  { name: 'Walmart', slug: 'walmart', address: '900 Dufferin St, Toronto, ON', latitude: 43.6532, longitude: -79.3832 },
  { name: 'Walmart', slug: 'walmart-milton', address: '1280 Steeles Ave E, Milton, ON', latitude: 43.5183, longitude: -79.8774 },
  { name: 'Walmart', slug: 'walmart-mississauga', address: '3100 Dixie Rd, Mississauga, ON', latitude: 43.5890, longitude: -79.6441 },
  { name: 'Walmart', slug: 'walmart-brampton', address: '35 Worthington Ave, Brampton, ON', latitude: 43.7315, longitude: -79.7624 },
  { name: 'Walmart', slug: 'walmart-oakville', address: '240 Leighland Ave, Oakville, ON', latitude: 43.4675, longitude: -79.6877 },
  { name: 'Loblaws', slug: 'loblaws', address: '396 St Clair Ave W, Toronto, ON', latitude: 43.6675, longitude: -79.3995 },
  { name: 'Loblaws', slug: 'loblaws-milton', address: '55 Ontario St S, Milton, ON', latitude: 43.5231, longitude: -79.8830 },
  { name: 'Loblaws', slug: 'loblaws-mississauga', address: '3045 Clayhill Rd, Mississauga, ON', latitude: 43.5468, longitude: -79.6603 },
  { name: 'Loblaws', slug: 'loblaws-brampton', address: '9980 Airport Rd, Brampton, ON', latitude: 43.6833, longitude: -79.7590 },
  { name: 'Loblaws', slug: 'loblaws-oakville', address: '469 Cornwall Rd, Oakville, ON', latitude: 43.4478, longitude: -79.6667 },
  { name: 'No Frills', slug: 'nofrills', address: '2280 Dundas St W, Toronto, ON', latitude: 43.6789, longitude: -79.4103 },
  { name: 'No Frills', slug: 'nofrills-milton', address: '490 Childs Dr, Milton, ON', latitude: 43.5107, longitude: -79.8838 },
  { name: 'No Frills', slug: 'nofrills-mississauga', address: '3476 Glen Erin Dr, Mississauga, ON', latitude: 43.5712, longitude: -79.6139 },
  { name: 'No Frills', slug: 'nofrills-brampton', address: '10088 McLaughlin Rd, Brampton, ON', latitude: 43.7088, longitude: -79.7314 },
  { name: 'No Frills', slug: 'nofrills-oakville', address: '1011 Upper Middle Rd E, Oakville, ON', latitude: 43.4555, longitude: -79.7012 },
  { name: 'FreshCo', slug: 'freshco', address: '1245 Dupont St, Toronto, ON', latitude: 43.6543, longitude: -79.4256 },
  { name: 'FreshCo', slug: 'freshco-milton', address: '315 Main St E, Milton, ON', latitude: 43.5150, longitude: -79.8700 },
  { name: 'FreshCo', slug: 'freshco-mississauga', address: '2550 Hurontario St, Mississauga, ON', latitude: 43.5955, longitude: -79.5876 },
  { name: 'FreshCo', slug: 'freshco-brampton', address: '499 Main St S, Brampton, ON', latitude: 43.6912, longitude: -79.7567 },
  { name: 'Metro', slug: 'metro', address: '425 Bloor St W, Toronto, ON', latitude: 43.6712, longitude: -79.3867 },
  { name: 'Metro', slug: 'metro-milton', address: '400 Main St E, Milton, ON', latitude: 43.5204, longitude: -79.8817 },
  { name: 'Metro', slug: 'metro-mississauga', address: '1585 Mississauga Valley Blvd, Mississauga, ON', latitude: 43.5517, longitude: -79.6574 },
  { name: 'Metro', slug: 'metro-oakville', address: '280 North Service Rd W, Oakville, ON', latitude: 43.4505, longitude: -79.6815 },
];

// Haversine distance in km
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Generate deterministic mock prices seeded by barcode, filtered by location
// Fixed price ranges for specific products
const FIXED_PRICE_RANGES: Record<string, { min: number; max: number }> = {
  '0055577100103': { min: 3.99, max: 4.50 }, // Bread
  '0068700100208': { min: 5.99, max: 7.49 }, // Milk
};

function generateMockPrices(barcode: string, latitude?: number, longitude?: number, radiusKm: number = 15) {
  const seed = barcode || 'unknown';
  let hash = 0;
  for (const ch of seed) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  const base = 2 + Math.abs(hash % 1300) / 100;
  const fixedRange = FIXED_PRICE_RANGES[barcode];

  // Annotate all stores with distance
  const annotated = CANADIAN_STORES.map((store, i) => ({
    ...store,
    distance: (latitude && longitude)
      ? haversineDistance(latitude, longitude, store.latitude, store.longitude)
      : null as number | null,
    index: i,
  }));

  // Filter to radius — but if that yields nothing, fall back to the 5 nearest
  let stores = (latitude && longitude)
    ? annotated.filter(s => (s.distance as number) <= radiusKm)
    : annotated;

  if (stores.length === 0 && latitude && longitude) {
    stores = [...annotated]
      .sort((a, b) => (a.distance as number) - (b.distance as number))
      .slice(0, 5);
  }

  return stores.map((store) => {
    const i = store.index;
    let price: number;
    let onSale: boolean;
    let salePrice: number | null;
    if (fixedRange) {
      price = +(fixedRange.min + ((((hash >> (i * 3)) & 0x3F) / 63) * (fixedRange.max - fixedRange.min))).toFixed(2);
      onSale = false;
      salePrice = null;
    } else {
      const variation = 1 + ((((hash >> (i * 3)) & 0x3F) - 32) / 160);
      price = +(base * variation).toFixed(2);
      onSale = ((hash >> (i * 5)) & 0x7) < 2;
      salePrice = onSale ? +(price * 0.8).toFixed(2) : null;
    }

    return {
      id: `mock-${store.slug}-${seed}`,
      store: { id: store.slug, name: store.name, slug: store.slug, address: store.address },
      price,
      salePrice,
      effectivePrice: salePrice ?? price,
      inStock: true,
      unit: 'each',
      scrapedAt: new Date().toISOString(),
      distance: store.distance != null ? +store.distance.toFixed(1) : null,
    };
  }).sort((a, b) => a.effectivePrice - b.effectivePrice);
}

// POST /scan/barcode - Core endpoint
// Scans barcode → looks up product (DB cache or Open Food Facts) → returns prices
router.post('/barcode', async (req, res) => {
  try {
    const { barcode, latitude, longitude } = req.body;

    if (!barcode) {
      return res.status(400).json({ error: 'Barcode is required' });
    }

    const lat = latitude ? parseFloat(latitude) : undefined;
    const lng = longitude ? parseFloat(longitude) : undefined;

    // 1. Get product (cached in DB or fetched from Open Food Facts)
    const product = await getProductByBarcode(barcode);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // 2. Try real prices from DB first (nearby if coords provided)
    let dbPrices = (lat && lng)
      ? await getPricesNearby(product.id, lat, lng, 15)
      : await getPricesForProduct(product.id);

    // Add distance to DB prices if coordinates provided
    if (lat && lng && dbPrices.length > 0) {
      const allStores = await prisma.store.findMany();
      const storeMap = new Map(allStores.map(s => [s.id, s]));
      dbPrices = dbPrices.map(p => {
        const store = storeMap.get(p.store.id);
        const distance = store
          ? +haversineDistance(lat, lng, store.latitude, store.longitude).toFixed(1)
          : null;
        return { ...p, distance };
      });
    }

    // 3. If no real prices, return mock Canadian store prices
    const prices = dbPrices.length > 0
      ? dbPrices
      : generateMockPrices(barcode, lat, lng);

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
    const { imageBase64, latitude, longitude } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image is required (base64)' });
    }

    const lat = latitude ? parseFloat(latitude) : undefined;
    const lng = longitude ? parseFloat(longitude) : undefined;

    // Try Gemini first, fall back to Claude Vision
    const identifiedProduct = await recognizeProductGemini(imageBase64)
      || await recognizeProduct(imageBase64);

    if (!identifiedProduct) {
      return res.status(404).json({ error: 'Could not identify product from image' });
    }

    // If Gemini read a UPC off the packaging, try barcode lookup first
    let product = identifiedProduct.upc
      ? await prisma.product.findFirst({ where: { barcode: identifiedProduct.upc } })
      : null;

    // Fall back to name/brand search
    if (!product) {
      product = await prisma.product.findFirst({
        where: {
          OR: [
            { name: { contains: identifiedProduct.name } },
            { brand: { contains: identifiedProduct.brand || '' } },
          ],
        },
      });
    }

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
      : generateMockPrices(product.barcode || product.id, lat, lng);

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

// ─── PRODUCT SEARCH (autofill) ───
router.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    if (q.length < 2) return res.json({ results: [] });

    // Search FlyerItem table
    const flyerItems = await prisma.flyerItem.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { brand: { contains: q } },
        ],
      },
      include: {
        flyerPage: {
          include: {
            flyer: {
              include: { store: true },
            },
          },
        },
      },
      take: 20,
    });

    // Search Product table
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { brand: { contains: q } },
        ],
      },
      take: 10,
    });

    const results = [
      ...flyerItems.map((fi) => ({
        id: fi.id,
        name: fi.name,
        brand: fi.brand,
        size: fi.size,
        price: fi.price,
        originalPrice: fi.originalPrice,
        store: fi.flyerPage?.flyer?.store?.name || null,
        storeSlug: fi.flyerPage?.flyer?.store?.slug || null,
        source: 'flyer' as const,
      })),
      ...products.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        size: null,
        price: null,
        originalPrice: null,
        store: null,
        storeSlug: null,
        source: 'product' as const,
        barcode: p.barcode,
      })),
    ];

    return res.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
