import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { optimizeCart } from '../../services/cartService';

const router = Router();
const prisma = new PrismaClient();

// GET /cart - Get user's cart with optimized totals
router.get('/', async (req, res) => {
  try {
    // TODO: Get userId from auth middleware
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    let cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart) {
      // Create default cart
      cart = await prisma.cart.create({
        data: { userId },
        include: { items: { include: { product: true } } },
      });
    }

    // Calculate optimized totals
    const optimization = await optimizeCart(cart.items);

    return res.json({
      ...cart,
      optimization,
    });
  } catch (error) {
    console.error('Get cart error:', error);
    return res.status(500).json({ error: 'Failed to get cart' });
  }
});

// POST /cart/items - Add item to cart
router.post('/items', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { productId, quantity = 1 } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

    // Get or create cart
    let cart = await prisma.cart.findFirst({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    // Upsert cart item
    const item = await prisma.cartItem.upsert({
      where: {
        cartId_productId: { cartId: cart.id, productId },
      },
      update: {
        quantity: { increment: quantity },
      },
      create: {
        cartId: cart.id,
        productId,
        quantity,
      },
      include: { product: true },
    });

    return res.status(201).json(item);
  } catch (error) {
    console.error('Add to cart error:', error);
    return res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

// PATCH /cart/items/:itemId - Update item quantity
router.patch('/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    const item = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: { product: true },
    });

    return res.json(item);
  } catch (error) {
    console.error('Update cart item error:', error);
    return res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE /cart/items/:itemId - Remove item from cart
router.delete('/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;

    await prisma.cartItem.delete({ where: { id: itemId } });

    return res.status(204).send();
  } catch (error) {
    console.error('Delete cart item error:', error);
    return res.status(500).json({ error: 'Failed to remove item' });
  }
});

// DELETE /cart - Clear entire cart
router.delete('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const cart = await prisma.cart.findFirst({ where: { userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('Clear cart error:', error);
    return res.status(500).json({ error: 'Failed to clear cart' });
  }
});

export default router;
