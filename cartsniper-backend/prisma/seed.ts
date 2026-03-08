/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Canadian grocery stores with GTA locations
const stores = [
  {
    name: 'Walmart',
    slug: 'walmart',
    latitude: 43.6532,
    longitude: -79.3832,
    address: '900 Dufferin St, Toronto, ON',
    priceMatchPolicy: 'Price matches identical items from local competitors',
  },
  {
    name: 'Loblaws',
    slug: 'loblaws',
    latitude: 43.6675,
    longitude: -79.3995,
    address: '396 St Clair Ave W, Toronto, ON',
    priceMatchPolicy: 'PC Optimum points on all purchases',
  },
  {
    name: 'No Frills',
    slug: 'nofrills',
    latitude: 43.6789,
    longitude: -79.4103,
    address: '2280 Dundas St W, Toronto, ON',
    priceMatchPolicy: 'Lowest price guarantee - we match flyer prices',
  },
  {
    name: 'FreshCo',
    slug: 'freshco',
    latitude: 43.6543,
    longitude: -79.4256,
    address: '1245 Dupont St, Toronto, ON',
    priceMatchPolicy: 'Fresh prices daily',
  },
  {
    name: 'Metro',
    slug: 'metro',
    latitude: 43.6712,
    longitude: -79.3867,
    address: '425 Bloor St W, Toronto, ON',
    priceMatchPolicy: 'Metro & Moi rewards program',
  },
];

// Common grocery products with realistic Canadian prices
const products = [
  { barcode: '0055577100103', name: "PC Blue Menu Whole Grain Bread", brand: "President's Choice", category: 'Bread' },
  { barcode: '0068700100208', name: 'Natrel 2% Milk 4L', brand: 'Natrel', category: 'Dairy' },
  { barcode: '0063100100105', name: 'Lactantia Butter 454g', brand: 'Lactantia', category: 'Dairy' },
  { barcode: '0057000000103', name: 'Heinz Ketchup 750ml', brand: 'Heinz', category: 'Condiments' },
  { barcode: '0041000001048', name: "Hellmann's Mayonnaise 890ml", brand: "Hellmann's", category: 'Condiments' },
  { barcode: '0060410001202', name: 'Maple Leaf Bacon 375g', brand: 'Maple Leaf', category: 'Meat' },
  { barcode: '0066721008007', name: 'Oasis Orange Juice 1.65L', brand: 'Oasis', category: 'Beverages' },
  { barcode: '006038388860', name: 'Cheerios Cereal 430g', brand: 'General Mills', category: 'Cereal' },
  { barcode: '0068700115010', name: 'PC Free-Run Eggs Large 12pk', brand: "President's Choice", category: 'Eggs' },
  { barcode: '006038301107', name: "Lay's Classic Chips 235g", brand: "Lay's", category: 'Snacks' },
  { barcode: '0055742352104', name: 'Compliments Frozen Pizza', brand: 'Compliments', category: 'Frozen' },
  { barcode: '0068700003004', name: 'PC Loads of Chicken Broth 900ml', brand: "President's Choice", category: 'Soup' },
  { barcode: '0057000012847', name: 'Kraft Dinner Original', brand: 'Kraft', category: 'Pasta' },
  { barcode: '0068700100307', name: 'PC Whole Bean Coffee 340g', brand: "President's Choice", category: 'Beverages' },
  { barcode: '0066721006010', name: 'Beatrice Chocolate Milk 1L', brand: 'Beatrice', category: 'Dairy' },
];

// Generate realistic price with ±15% variance between stores
function generatePrice(basePrice: number): number {
  const variance = (Math.random() * 0.3 - 0.15); // -15% to +15%
  return Math.round((basePrice * (1 + variance)) * 100) / 100;
}

// Base prices for products (in CAD)
const basePrices: Record<string, number> = {
  '0055577100103': 3.49, // Bread
  '0068700100208': 6.99, // Milk 4L
  '0063100100105': 5.99, // Butter
  '0057000000103': 4.49, // Ketchup
  '0041000001048': 6.49, // Mayo
  '0060410001202': 7.99, // Bacon
  '0066721008007': 4.29, // OJ
  '006038388860': 5.99,  // Cheerios
  '0068700115010': 5.49, // Eggs
  '006038301107': 4.29,  // Chips
  '0055742352104': 6.99, // Frozen pizza
  '0068700003004': 3.49, // Chicken broth
  '0057000012847': 1.99, // KD
  '0068700100307': 9.99, // Coffee
  '0066721006010': 2.99, // Chocolate milk
};

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.price.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.product.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();

  // Seed stores
  console.log('📍 Creating stores...');
  for (const store of stores) {
    await prisma.store.create({ data: store });
  }

  // Seed products
  console.log('📦 Creating products...');
  for (const product of products) {
    await prisma.product.create({ data: product });
  }

  // Seed prices (each product at each store)
  console.log('💰 Creating prices...');
  const allStores = await prisma.store.findMany();
  const allProducts = await prisma.product.findMany();

  for (const product of allProducts) {
    const basePrice = basePrices[product.barcode] || 4.99;
    
    for (const store of allStores) {
      const price = generatePrice(basePrice);
      // 20% chance of being on sale
      const isOnSale = Math.random() < 0.2;
      const salePrice = isOnSale ? Math.round(price * 0.85 * 100) / 100 : null;

      await prisma.price.create({
        data: {
          productId: product.id,
          storeId: store.id,
          price,
          salePrice,
          inStock: Math.random() > 0.1, // 90% in stock
          unit: 'each',
        },
      });
    }
  }

  console.log('✅ Seeding complete!');
  console.log(`   - ${stores.length} stores`);
  console.log(`   - ${products.length} products`);
  console.log(`   - ${stores.length * products.length} prices`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
