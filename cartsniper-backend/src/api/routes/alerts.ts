import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { checkAlerts } from '../../services/alertService';

const router = Router();
const prisma = new PrismaClient();

// GET /alerts - Get user's price alerts
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const alerts = await prisma.alert.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(alerts);
  } catch (error) {
    console.error('Get alerts error:', error);
    return res.status(500).json({ error: 'Failed to get alerts' });
  }
});

// POST /alerts - Create a price alert
router.post('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { productId, targetPrice } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    if (!productId || !targetPrice) {
      return res.status(400).json({ error: 'productId and targetPrice required' });
    }

    // Verify product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Upsert alert (one alert per user/product)
    const alert = await prisma.alert.upsert({
      where: {
        userId_productId: { userId, productId },
      },
      update: { targetPrice, triggered: false, triggeredAt: null },
      create: { userId, productId, targetPrice },
      include: { product: true },
    });

    return res.status(201).json(alert);
  } catch (error) {
    console.error('Create alert error:', error);
    return res.status(500).json({ error: 'Failed to create alert' });
  }
});

// DELETE /alerts/:alertId - Delete an alert
router.delete('/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    // Ensure user owns this alert
    const alert = await prisma.alert.findFirst({
      where: { id: alertId, userId },
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    await prisma.alert.delete({ where: { id: alertId } });

    return res.status(204).send();
  } catch (error) {
    console.error('Delete alert error:', error);
    return res.status(500).json({ error: 'Failed to delete alert' });
  }
});

// POST /alerts/check - Manually trigger alert check (for demo)
router.post('/check', async (req, res) => {
  try {
    const triggered = await checkAlerts();
    return res.json({ triggered });
  } catch (error) {
    console.error('Check alerts error:', error);
    return res.status(500).json({ error: 'Failed to check alerts' });
  }
});

export default router;
