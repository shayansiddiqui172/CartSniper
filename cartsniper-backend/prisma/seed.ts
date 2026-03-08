/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import { extractFlyerItems, ExtractedFlyerItem } from '../src/integrations/flyerProcessor';
import * as fs from 'fs';
import * as path from 'path';

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

// Chain slug → store name mapping for flyer images
const CHAIN_FLYERS: { chain: string; storeName: string }[] = [
  { chain: 'walmart', storeName: 'Walmart' },
  { chain: 'loblaws', storeName: 'Loblaws' },
  { chain: 'nofrills', storeName: 'No Frills' },
  { chain: 'metro', storeName: 'Metro' },
  { chain: 'freshco', storeName: 'FreshCo' },
];

// Fallback mock items when Gemini is unavailable or image missing
const FALLBACK_LAYOUTS = [
  { x: 0.02, y: 0.02, width: 0.47, height: 0.30 },
  { x: 0.51, y: 0.02, width: 0.47, height: 0.30 },
  { x: 0.02, y: 0.34, width: 0.47, height: 0.30 },
  { x: 0.51, y: 0.34, width: 0.47, height: 0.30 },
  { x: 0.02, y: 0.66, width: 0.47, height: 0.30 },
  { x: 0.51, y: 0.66, width: 0.47, height: 0.30 },
];

function generatePlu(): string {
  return String(1000 + Math.floor(Math.random() * 9000));
}

// Fuzzy match helper — same logic as flyerService
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const wordsA = na.split(' ');
  const wordsB = nb.split(' ');
  const common = wordsA.filter(w => wordsB.includes(w));
  return common.length / Math.max(wordsA.length, wordsB.length);
}

function findMatchingProduct(
  item: ExtractedFlyerItem,
  allProducts: { id: string; barcode: string; name: string; brand: string | null }[]
): string | null {
  // Try UPC match
  if (item.upc) {
    const match = allProducts.find(p => p.barcode === item.upc);
    if (match) return match.id;
  }

  // Fuzzy name+brand match
  let bestId: string | null = null;
  let bestScore = 0;

  for (const product of allProducts) {
    let score = similarity(item.name, product.name);
    if (item.brand && product.brand) {
      const brandSim = similarity(item.brand, product.brand);
      score = score * 0.7 + brandSim * 0.3;
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = product.id;
    }
  }

  return bestScore >= 0.4 ? bestId : null;
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

  // ─── Seed flyers with real images + Gemini extraction ───
  console.log('📰 Creating flyers with real images...');
  const now = new Date();
  const validFrom = new Date(now);
  validFrom.setDate(validFrom.getDate() - 2);
  const validTo = new Date(now);
  validTo.setDate(validTo.getDate() + 5);

  const flyerImagesDir = path.join(__dirname, '..', 'public', 'flyer-images');

  // Cache Gemini results per chain (process each flyer image once)
  // Uses a local cache file to avoid re-calling Gemini on every seed
  const chainItems: Record<string, ExtractedFlyerItem[]> = {};
  const cacheFile = path.join(flyerImagesDir, '.gemini-cache.json');
  let cache: Record<string, ExtractedFlyerItem[]> = {};
  try {
    if (fs.existsSync(cacheFile)) {
      cache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      console.log('  📦 Loaded Gemini extraction cache');
    }
  } catch { /* ignore */ }

  for (const { chain, storeName } of CHAIN_FLYERS) {
    // Check for real flyer image (try png, jpg, jpeg)
    let imagePath: string | null = null;
    let mimeType = 'image/png';
    for (const ext of ['png', 'jpg', 'jpeg']) {
      const candidate = path.join(flyerImagesDir, `${chain}-page-1.${ext}`);
      if (fs.existsSync(candidate)) {
        imagePath = candidate;
        mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        break;
      }
    }

    if (imagePath) {
      // Check cache first
      if (cache[chain] && cache[chain].length > 0) {
        console.log(`  📦 Using cached extraction for ${storeName}: ${cache[chain].length} items`);
        chainItems[chain] = cache[chain];
      } else {
        console.log(`  📸 Found real flyer image for ${storeName}: ${path.basename(imagePath)}`);
        const imageBase64 = fs.readFileSync(imagePath).toString('base64');
        const extracted = await extractFlyerItems(imageBase64, storeName, mimeType);
        chainItems[chain] = extracted;
        if (extracted.length > 0) {
          cache[chain] = extracted;
        }
      }
    } else {
      console.log(`  ⚠️  No flyer image for ${storeName} — using mock items`);
      chainItems[chain] = [];
    }
  }

  // Save cache
  if (Object.keys(cache).length > 0) {
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
    console.log('  💾 Saved Gemini extraction cache');
  }

  // Create flyers for ALL stores (each location gets the chain's flyer)
  for (const store of allStores) {
    // Determine which chain this store belongs to
    const chain = CHAIN_FLYERS.find(c => store.slug === c.chain || store.slug.startsWith(c.chain + '-'));
    if (!chain) continue;

    const imageUrl = `/flyer-images/${chain.chain}-page-1.png`;
    // Check if a jpg exists instead
    const jpgPath = path.join(flyerImagesDir, `${chain.chain}-page-1.jpg`);
    const jpegPath = path.join(flyerImagesDir, `${chain.chain}-page-1.jpeg`);
    const actualImageUrl = fs.existsSync(jpgPath) ? `/flyer-images/${chain.chain}-page-1.jpg`
      : fs.existsSync(jpegPath) ? `/flyer-images/${chain.chain}-page-1.jpeg`
      : imageUrl;

    const flyer = await prisma.flyer.create({
      data: {
        storeId: store.id,
        title: `${chain.storeName} Weekly Flyer`,
        validFrom,
        validTo,
        totalPages: 1,
      },
    });

    const page = await prisma.flyerPage.create({
      data: {
        flyerId: flyer.id,
        pageNumber: 1,
        imageUrl: actualImageUrl,
      },
    });

    const items = chainItems[chain.chain];

    if (items.length > 0) {
      // Use Gemini-extracted items
      for (const item of items) {
        const productId = findMatchingProduct(item, allProducts);

        await prisma.flyerItem.create({
          data: {
            flyerPageId: page.id,
            productId,
            name: item.name,
            brand: item.brand,
            size: item.size,
            price: item.price,
            originalPrice: item.originalPrice,
            saleStart: validFrom.toISOString().slice(0, 10),
            saleEnd: validTo.toISOString().slice(0, 10),
            plu: generatePlu(),
            upc: item.upc,
            itemCode: `ITM-${Math.floor(Math.random() * 100000)}`,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
          },
        });
      }
      console.log(`   📰 ${store.name} (${store.slug}): ${items.length} Gemini-extracted items`);
    } else {
      // Fallback: use mock items from our product list
      const shuffledProducts = [...allProducts].sort(() => Math.random() - 0.5);
      const pageProducts = shuffledProducts.slice(0, FALLBACK_LAYOUTS.length);

      for (let i = 0; i < pageProducts.length && i < FALLBACK_LAYOUTS.length; i++) {
        const product = pageProducts[i];
        const pos = FALLBACK_LAYOUTS[i];
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
      console.log(`   📰 ${store.name} (${store.slug}): ${pageProducts.length} mock items (no image)`);
    }
  }

  console.log('✅ Seeding complete!');
  console.log(`   - ${stores.length} stores`);
  console.log(`   - ${products.length} products`);
  console.log(`   - ${allStores.length * products.length} prices`);
  console.log(`   - ${allStores.length} store flyers`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
