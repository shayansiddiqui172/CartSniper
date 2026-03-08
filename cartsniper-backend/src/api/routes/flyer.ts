import { Router } from 'express';
import { matchProductToFlyer } from '../../services/flyerService';

const router = Router();

// GET /flyer/match/:productId/:storeSlug
// Returns flyer match data for a product at a specific store
router.get('/match/:productId/:storeSlug', async (req, res) => {
  try {
    const { productId, storeSlug } = req.params;

    if (!productId || !storeSlug) {
      return res.status(400).json({ error: 'productId and storeSlug are required' });
    }

    const result = await matchProductToFlyer(productId, storeSlug);
    return res.json(result);
  } catch (error) {
    console.error('Flyer match error:', error);
    return res.status(500).json({ error: 'Failed to match product to flyer' });
  }
});

export default router;
