import { Router } from 'express';
import { 
  getPricesForProduct, 
  getBestPrice, 
  comparePrices 
} from '../../services/priceService';

const router = Router();

// GET /prices/:productId - Get all prices for a product
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const prices = await getPricesForProduct(productId);

    if (prices.length === 0) {
      return res.status(404).json({ error: 'No prices found for this product' });
    }

    return res.json({
      productId,
      prices,
      bestPrice: prices[0],
      priceRange: {
        min: prices[0].price,
        max: prices[prices.length - 1].price,
      },
    });
  } catch (error) {
    console.error('Get prices error:', error);
    return res.status(500).json({ error: 'Failed to get prices' });
  }
});

// POST /prices/compare - Compare prices for multiple products
// Used for cart optimization
router.post('/compare', async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({ error: 'productIds array is required' });
    }

    const comparison = await comparePrices(productIds);

    return res.json(comparison);
  } catch (error) {
    console.error('Compare prices error:', error);
    return res.status(500).json({ error: 'Failed to compare prices' });
  }
});

// GET /prices/best/:productId - Get just the best price
router.get('/best/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const best = await getBestPrice(productId);

    if (!best) {
      return res.status(404).json({ error: 'No prices found' });
    }

    return res.json(best);
  } catch (error) {
    console.error('Get best price error:', error);
    return res.status(500).json({ error: 'Failed to get best price' });
  }
});

export default router;
