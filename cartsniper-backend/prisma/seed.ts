/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Canadian grocery stores across the GTA — multiple locations per chain
const stores = [
  // ── Walmart ──
  { name: 'Walmart', slug: 'walmart', latitude: 43.6532, longitude: -79.3832, address: '900 Dufferin St, Toronto, ON', priceMatchPolicy: 'Price matches identical items from local competitors' },
  { name: 'Walmart', slug: 'walmart-milton', latitude: 43.5183, longitude: -79.8774, address: '1280 Steeles Ave E, Milton, ON', priceMatchPolicy: 'Price matches identical items from local competitors' },
  { name: 'Walmart', slug: 'walmart-mississauga', latitude: 43.5890, longitude: -79.6441, address: '3100 Dixie Rd, Mississauga, ON', priceMatchPolicy: 'Price matches identical items from local competitors' },
  { name: 'Walmart', slug: 'walmart-brampton', latitude: 43.7315, longitude: -79.7624, address: '35 Worthington Ave, Brampton, ON', priceMatchPolicy: 'Price matches identical items from local competitors' },
  { name: 'Walmart', slug: 'walmart-oakville', latitude: 43.4675, longitude: -79.6877, address: '240 Leighland Ave, Oakville, ON', priceMatchPolicy: 'Price matches identical items from local competitors' },
  // ── Loblaws ──
  { name: 'Loblaws', slug: 'loblaws', latitude: 43.6675, longitude: -79.3995, address: '396 St Clair Ave W, Toronto, ON', priceMatchPolicy: 'PC Optimum points on all purchases' },
  { name: 'Loblaws', slug: 'loblaws-milton', latitude: 43.5231, longitude: -79.8830, address: '55 Ontario St S, Milton, ON', priceMatchPolicy: 'PC Optimum points on all purchases' },
  { name: 'Loblaws', slug: 'loblaws-mississauga', latitude: 43.5468, longitude: -79.6603, address: '3045 Clayhill Rd, Mississauga, ON', priceMatchPolicy: 'PC Optimum points on all purchases' },
  { name: 'Loblaws', slug: 'loblaws-brampton', latitude: 43.6833, longitude: -79.7590, address: '9980 Airport Rd, Brampton, ON', priceMatchPolicy: 'PC Optimum points on all purchases' },
  { name: 'Loblaws', slug: 'loblaws-oakville', latitude: 43.4478, longitude: -79.6667, address: '469 Cornwall Rd, Oakville, ON', priceMatchPolicy: 'PC Optimum points on all purchases' },
  // ── No Frills ──
  { name: 'No Frills', slug: 'nofrills', latitude: 43.6789, longitude: -79.4103, address: '2280 Dundas St W, Toronto, ON', priceMatchPolicy: 'Lowest price guarantee - we match flyer prices' },
  { name: 'No Frills', slug: 'nofrills-milton', latitude: 43.5107, longitude: -79.8838, address: '490 Childs Dr, Milton, ON', priceMatchPolicy: 'Lowest price guarantee - we match flyer prices' },
  { name: 'No Frills', slug: 'nofrills-mississauga', latitude: 43.5712, longitude: -79.6139, address: '3476 Glen Erin Dr, Mississauga, ON', priceMatchPolicy: 'Lowest price guarantee - we match flyer prices' },
  { name: 'No Frills', slug: 'nofrills-brampton', latitude: 43.7088, longitude: -79.7314, address: '10088 McLaughlin Rd, Brampton, ON', priceMatchPolicy: 'Lowest price guarantee - we match flyer prices' },
  { name: 'No Frills', slug: 'nofrills-oakville', latitude: 43.4555, longitude: -79.7012, address: '1011 Upper Middle Rd E, Oakville, ON', priceMatchPolicy: 'Lowest price guarantee - we match flyer prices' },
  // ── FreshCo ──
  { name: 'FreshCo', slug: 'freshco', latitude: 43.6543, longitude: -79.4256, address: '1245 Dupont St, Toronto, ON', priceMatchPolicy: 'Fresh prices daily' },
  { name: 'FreshCo', slug: 'freshco-milton', latitude: 43.5150, longitude: -79.8700, address: '315 Main St E, Milton, ON', priceMatchPolicy: 'Fresh prices daily' },
  { name: 'FreshCo', slug: 'freshco-mississauga', latitude: 43.5955, longitude: -79.5876, address: '2550 Hurontario St, Mississauga, ON', priceMatchPolicy: 'Fresh prices daily' },
  { name: 'FreshCo', slug: 'freshco-brampton', latitude: 43.6912, longitude: -79.7567, address: '499 Main St S, Brampton, ON', priceMatchPolicy: 'Fresh prices daily' },
  // ── Metro ──
  { name: 'Metro', slug: 'metro', latitude: 43.6712, longitude: -79.3867, address: '425 Bloor St W, Toronto, ON', priceMatchPolicy: 'Metro & Moi rewards program' },
  { name: 'Metro', slug: 'metro-milton', latitude: 43.5204, longitude: -79.8817, address: '400 Main St E, Milton, ON', priceMatchPolicy: 'Metro & Moi rewards program' },
  { name: 'Metro', slug: 'metro-mississauga', latitude: 43.5517, longitude: -79.6574, address: '1585 Mississauga Valley Blvd, Mississauga, ON', priceMatchPolicy: 'Metro & Moi rewards program' },
  { name: 'Metro', slug: 'metro-oakville', latitude: 43.4505, longitude: -79.6815, address: '280 North Service Rd W, Oakville, ON', priceMatchPolicy: 'Metro & Moi rewards program' },
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
  const variance = (Math.random() * 0.3 - 0.15);
  return Math.round((basePrice * (1 + variance)) * 100) / 100;
}

// Base prices for products (in CAD)
const basePrices: Record<string, number> = {
  '0055577100103': 3.49,
  '0068700100208': 6.99,
  '0063100100105': 5.99,
  '0057000000103': 4.49,
  '0041000001048': 6.49,
  '0060410001202': 7.99,
  '0066721008007': 4.29,
  '006038388860': 5.99,
  '0068700115010': 5.49,
  '006038301107': 4.29,
  '0055742352104': 6.99,
  '0068700003004': 3.49,
  '0057000012847': 1.99,
  '0068700100307': 9.99,
  '0066721006010': 2.99,
};

// Flyer page layouts
const FLYER_LAYOUTS = [
  [
    { x: 0.02, y: 0.02, width: 0.47, height: 0.30 },
    { x: 0.51, y: 0.02, width: 0.47, height: 0.30 },
    { x: 0.02, y: 0.34, width: 0.47, height: 0.30 },
    { x: 0.51, y: 0.34, width: 0.47, height: 0.30 },
    { x: 0.02, y: 0.66, width: 0.47, height: 0.30 },
    { x: 0.51, y: 0.66, width: 0.47, height: 0.30 },
  ],
  [
    { x: 0.02, y: 0.02, width: 0.96, height: 0.40 },
    { x: 0.02, y: 0.44, width: 0.47, height: 0.26 },
    { x: 0.51, y: 0.44, width: 0.47, height: 0.26 },
    { x: 0.02, y: 0.72, width: 0.47, height: 0.26 },
    { x: 0.51, y: 0.72, width: 0.47, height: 0.26 },
  ],
  [
    { x: 0.02, y: 0.02, width: 0.30, height: 0.46 },
    { x: 0.34, y: 0.02, width: 0.30, height: 0.46 },
    { x: 0.66, y: 0.02, width: 0.30, height: 0.46 },
    { x: 0.02, y: 0.50, width: 0.30, height: 0.46 },
    { x: 0.34, y: 0.50, width: 0.30, height: 0.46 },
    { x: 0.66, y: 0.50, width: 0.30, height: 0.46 },
  ],
];

function flyerPageImageUrl(storeSlug: string, pageNum: number): string {
  return `/flyer-images/${storeSlug}-page-${pageNum}.svg`;
}

function generatePlu(): string {
  return String(1000 + Math.floor(Math.random() * 9000));
}

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.flyerItem.deleteMany();
  await prisma.flyerPage.deleteMany();
  await prisma.flyer.deleteMany();
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
      const isOnSale = Math.random() < 0.2;
      const salePrice = isOnSale ? Math.round(price * 0.85 * 100) / 100 : null;

      await prisma.price.create({
        data: {
          productId: product.id,
          storeId: store.id,
          price,
          salePrice,
          inStock: Math.random() > 0.1,
          unit: 'each',
        },
      });
    }
  }

  // Seed flyers (one active flyer per store — only for main/Toronto locations)
  console.log('📰 Creating flyers...');
  const now = new Date();
  const validFrom = new Date(now);
  validFrom.setDate(validFrom.getDate() - 2);
  const validTo = new Date(now);
  validTo.setDate(validTo.getDate() + 5);

  // Only create flyers for the 5 main stores (not every location)
  const mainStores = allStores.filter(s => !s.slug.includes('-') || s.slug === 'nofrills');
  for (const store of mainStores) {
    const totalPages = 3;

    const flyer = await prisma.flyer.create({
      data: {
        storeId: store.id,
        title: `${store.name} Weekly Flyer`,
        validFrom,
        validTo,
        totalPages,
      },
    });

    const shuffledProducts = [...allProducts].sort(() => Math.random() - 0.5);

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await prisma.flyerPage.create({
        data: {
          flyerId: flyer.id,
          pageNumber: pageNum,
          imageUrl: flyerPageImageUrl(store.slug, pageNum),
        },
      });

      const layout = FLYER_LAYOUTS[(pageNum - 1) % FLYER_LAYOUTS.length];
      const pageProducts = shuffledProducts.slice(
        (pageNum - 1) * 5,
        pageNum * 5
      );

      for (let i = 0; i < pageProducts.length && i < layout.length; i++) {
        const product = pageProducts[i];
        const pos = layout[i];
        const basePrice = basePrices[product.barcode] || 4.99;
        const isOnSale = Math.random() < 0.35;
        const itemPrice = isOnSale
          ? Math.round(basePrice * 0.82 * 100) / 100
          : basePrice;

        await prisma.flyerItem.create({
          data: {
            flyerPageId: page.id,
            productId: product.id,
            name: product.name,
            brand: product.brand,
            size: product.name.match(/\d+[gGmMlLkK]+/)?.[0] || null,
            price: itemPrice,
            originalPrice: isOnSale ? basePrice : null,
            saleStart: validFrom.toISOString().slice(0, 10),
            saleEnd: validTo.toISOString().slice(0, 10),
            plu: generatePlu(),
            upc: product.barcode,
            itemCode: `ITM-${Math.floor(Math.random() * 100000)}`,
            x: pos.x,
            y: pos.y,
            width: pos.width,
            height: pos.height,
          },
        });
      }
    }

    console.log(`   📰 ${store.name}: ${totalPages} pages with items`);
  }

  console.log('✅ Seeding complete!');
  console.log(`   - ${stores.length} stores (${stores.length / 5} locations × 5 chains)`);
  console.log(`   - ${products.length} products`);
  console.log(`   - ${allStores.length * products.length} prices`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
