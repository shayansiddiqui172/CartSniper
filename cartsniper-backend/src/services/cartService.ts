import { PrismaClient } from '@prisma/client';
import { comparePrices } from './priceService';

const prisma = new PrismaClient();

interface CartItemWithProduct {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    barcode: string;
    brand: string | null;
    category: string | null;
    imageUrl: string | null;
  };
}

export interface CartOptimization {
  singleStore: {
    store: { id: string; name: string; slug: string };
    total: number;
    savings: number; // vs worst option
  };
  splitTrip: {
    stores: { name: string; items: string[]; subtotal: number }[];
    total: number;
    savings: number;
  } | null;
  recommendation: 'single' | 'split';
}

// Calculate optimized cart totals
export async function optimizeCart(
  items: CartItemWithProduct[]
): Promise<CartOptimization | null> {
  if (items.length === 0) {
    return null;
  }

  const productIds = items.map((item) => item.productId);
  const comparison = await comparePrices(productIds);

  if (comparison.byStore.length === 0) {
    return null;
  }

  // Single store optimization (simplest)
  const bestStore = comparison.byStore[0];
  const worstStore = comparison.byStore[comparison.byStore.length - 1];
  const singleStoreSavings = worstStore.total - bestStore.total;

  // Split trip optimization (buy each item at its cheapest store)
  const splitTrip = await calculateSplitTrip(productIds);

  // Determine recommendation
  // Split is only worth it if savings > $5 (not worth driving to 2+ stores for less)
  const splitSavings = splitTrip ? bestStore.total - splitTrip.total : 0;
  const recommendation = splitSavings > 5 ? 'split' : 'single';

  return {
    singleStore: {
      store: bestStore.store,
      total: bestStore.total,
      savings: Math.round(singleStoreSavings * 100) / 100,
    },
    splitTrip: splitTrip
      ? {
          ...splitTrip,
          savings: Math.round(splitSavings * 100) / 100,
        }
      : null,
    recommendation,
  };
}

// Calculate optimal split between stores
async function calculateSplitTrip(productIds: string[]) {
  const prices = await prisma.price.findMany({
    where: { productId: { in: productIds } },
    include: { store: true, product: true },
  });

  if (prices.length === 0) return null;

  // For each product, find the cheapest store
  const cheapestByProduct: Record<string, {
    storeId: string;
    storeName: string;
    productName: string;
    price: number;
  }> = {};

  for (const productId of productIds) {
    const productPrices = prices.filter((p) => p.productId === productId);
    if (productPrices.length === 0) continue;

    const cheapest = productPrices.reduce((best, current) => {
      const currentPrice = current.salePrice ?? current.price;
      const bestPrice = best.salePrice ?? best.price;
      return currentPrice < bestPrice ? current : best;
    });

    cheapestByProduct[productId] = {
      storeId: cheapest.storeId,
      storeName: cheapest.store.name,
      productName: cheapest.product.name,
      price: cheapest.salePrice ?? cheapest.price,
    };
  }

  // Group by store
  const byStore: Record<string, { name: string; items: string[]; subtotal: number }> = {};

  for (const [productId, data] of Object.entries(cheapestByProduct)) {
    if (!byStore[data.storeId]) {
      byStore[data.storeId] = { name: data.storeName, items: [], subtotal: 0 };
    }
    byStore[data.storeId].items.push(data.productName);
    byStore[data.storeId].subtotal += data.price;
  }

  const stores = Object.values(byStore).map((s) => ({
    ...s,
    subtotal: Math.round(s.subtotal * 100) / 100,
  }));

  const total = stores.reduce((sum, s) => sum + s.subtotal, 0);

  return {
    stores,
    total: Math.round(total * 100) / 100,
  };
}
