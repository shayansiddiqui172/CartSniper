import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { lookupBarcode } from '../../integrations/openFoodFacts';
import { recognizeProduct } from '../../integrations/claudeVision';
import { getPricesForProduct } from '../../services/priceService';

const router = Router();
const prisma = new PrismaClient();

// POST /scan/barcode - Core demo endpoint
// Scans barcode → looks up product → returns with prices from all stores
router.post('/barcode', async (req, res) => {
  try {
    const { barcode } = req.body;
    
    if (!barcode) {
      return res.status(400).json({ error: 'Barcode is required' });
    }

    // 1. Check if product exists in our DB
    let product = await prisma.product.findUnique({
      where: { barcode },
    });

    // 2. If not found, lookup from Open Food Facts
    if (!product) {
      const offProduct = await lookupBarcode(barcode);
      
      if (!offProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Save to our DB for future lookups
      product = await prisma.product.create({
        data: {
          barcode,
          name: offProduct.name,
          brand: offProduct.brand,
          category: offProduct.category,
          imageUrl: offProduct.imageUrl,
        },
      });
    }

    // 3. Get prices from all stores
    const prices = await getPricesForProduct(product.id);

    return res.json({
      product,
      prices,
      bestPrice: prices[0] || null, // Already sorted low → high
    });
  } catch (error) {
    console.error('Scan barcode error:', error);
    return res.status(500).json({ error: 'Failed to scan barcode' });
  }
});

// POST /scan/image - Image recognition fallback
// Sends image to Claude Vision to identify product
router.post('/image', async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image is required (base64)' });
    }

    // Use Claude Vision to identify the product
    const identifiedProduct = await recognizeProduct(imageBase64);

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
        message: 'Product identified but not in our database',
      });
    }

    const prices = await getPricesForProduct(product.id);

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
