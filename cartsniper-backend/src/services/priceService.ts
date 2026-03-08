import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PriceWithStore {
  id: string;
  price: number;
  salePrice: number | null;
  effectivePrice: number; // salePrice if available, otherwise price
  inStock: boolean;
  unit: string | null;
  scrapedAt: Date;
  store: {
    id: string;
    name: string;
    slug: string;
    address: string | null;
  };
}

// Get all prices for a product, sorted low → high
export async function getPricesForProduct(productId: string): Promise<PriceWithStore[]> {
  const prices = await prisma.price.findMany({
    where: { productId },
    include: {
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          address: true,
        },
      },
    },
    orderBy: { price: 'asc' },
  });

  return prices.map((p) => ({
    ...p,
    effectivePrice: p.salePrice ?? p.price,
  })).sort((a, b) => a.effectivePrice - b.effectivePrice);
}

// Get the single best price for a product
export async function getBestPrice(productId: string): Promise<PriceWithStore | null> {
  const prices = await getPricesForProduct(productId);
  return prices.find((p) => p.inStock) || prices[0] || null;
}

// Get prices for a product at nearby stores
export async function getPricesNearby(
  productId: string,
  latitude: number,
  longitude: number,
  radiusKm: number = 10
): Promise<PriceWithStore[]> {
  // Simple Haversine distance calculation
  const stores = await prisma.store.findMany();
  
  const nearbyStoreIds = stores
    .filter((store) => {
      const distance = haversineDistance(
        latitude, longitude,
        store.latitude, store.longitude
      );
      return distance <= radiusKm;
    })
    .map((s) => s.id);

  const prices = await prisma.price.findMany({
    where: {
      productId,
      storeId: { in: nearbyStoreIds },
    },
    include: {
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          address: true,
        },
      },
    },
  });

  return prices.map((p) => ({
    ...p,
    effectivePrice: p.salePrice ?? p.price,
  })).sort((a, b) => a.effectivePrice - b.effectivePrice);
}

// Compare prices for multiple products at once
export async function comparePrices(productIds: string[]) {
  const stores = await prisma.store.findMany();
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  // Get all prices for all products
  const allPrices = await prisma.price.findMany({
    where: { productId: { in: productIds } },
    include: { store: true, product: true },
  });

  // Calculate totals per store
  const storeTotals = stores.map((store) => {
    const storePrices = allPrices.filter((p) => p.storeId === store.id);
    const total = storePrices.reduce((sum, p) => {
      const effectivePrice = p.salePrice ?? p.price;
      return sum + effectivePrice;
    }, 0);

    const missingProducts = productIds.filter(
      (pid) => !storePrices.some((p) => p.productId === pid)
    );

    return {
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
      },
      total: Math.round(total * 100) / 100,
      itemCount: storePrices.length,
      missingProducts: missingProducts.length,
      breakdown: storePrices.map((p) => ({
        productId: p.productId,
        productName: p.product.name,
        price: p.salePrice ?? p.price,
        onSale: p.salePrice !== null,
      })),
    };
  });

  // Sort by total (cheapest first)
  storeTotals.sort((a, b) => a.total - b.total);

  return {
    products: products.map((p) => ({ id: p.id, name: p.name })),
    byStore: storeTotals,
    bestOption: storeTotals[0],
  };
}

// Haversine formula for distance between two lat/lng points
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
