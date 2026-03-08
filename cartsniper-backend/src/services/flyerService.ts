import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type MatchConfidence = 'high' | 'medium' | 'low';

export interface FlyerMatchResult {
  productId: string;
  storeId: string;
  storeName: string;
  flyerId: string;
  flyerTitle: string;
  flyerPage: number;
  flyerItemId: string;
  flyerImageUrl: string;
  matchConfidence: MatchConfidence;
  matchSource: string;
  focusTarget: {
    type: 'bounding_box';
    x: number;
    y: number;
    width: number;
    height: number;
  };
  productDetails: {
    name: string;
    brand: string | null;
    size: string | null;
    price: number;
    originalPrice: number | null;
    saleStart: string | null;
    saleEnd: string | null;
    plu: string | null;
    itemCode: string | null;
    upc: string | null;
  };
  totalPages: number;
  allPages: { pageNumber: number; imageUrl: string }[];
}

export interface FlyerMatchResponse {
  found: boolean;
  match: FlyerMatchResult | null;
  fallback?: {
    type: 'page_only' | 'flyer_only' | 'no_flyer';
    message: string;
    flyerId?: string;
    flyerTitle?: string;
    flyerPage?: number;
    flyerImageUrl?: string;
    totalPages?: number;
    allPages?: { pageNumber: number; imageUrl: string }[];
  };
}

// Normalize text for fuzzy matching
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Calculate similarity between two strings (0-1)
function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  // Word overlap
  const wordsA = na.split(' ');
  const wordsB = nb.split(' ');
  const common = wordsA.filter(w => wordsB.includes(w));
  const overlap = common.length / Math.max(wordsA.length, wordsB.length);

  return overlap;
}

export async function matchProductToFlyer(
  productId: string,
  storeSlug: string
): Promise<FlyerMatchResponse> {
  // 1. Find the store
  const store = await prisma.store.findUnique({ where: { slug: storeSlug } });
  if (!store) {
    return { found: false, match: null, fallback: { type: 'no_flyer', message: 'Store not found.' } };
  }

  // 2. Find active flyer for the store (or chain fallback)
  const now = new Date();
  let flyer = await prisma.flyer.findFirst({
    where: {
      storeId: store.id,
      validTo: { gte: now },
    },
    include: {
      pages: {
        include: { items: true },
        orderBy: { pageNumber: 'asc' },
      },
    },
    orderBy: { validFrom: 'desc' },
  });

  // Chain fallback: if no flyer for this store, try the base chain store
  if (!flyer && storeSlug.includes('-')) {
    const baseSlug = storeSlug.replace(/-[^-]+$/, '');
    const baseStore = await prisma.store.findUnique({ where: { slug: baseSlug } });
    if (baseStore) {
      flyer = await prisma.flyer.findFirst({
        where: {
          storeId: baseStore.id,
          validTo: { gte: now },
        },
        include: {
          pages: {
            include: { items: true },
            orderBy: { pageNumber: 'asc' },
          },
        },
        orderBy: { validFrom: 'desc' },
      });
    }
  }

  if (!flyer) {
    return {
      found: false,
      match: null,
      fallback: {
        type: 'no_flyer',
        message: 'No current weekly flyer available for this store.',
      },
    };
  }

  const allPages = flyer.pages.map(p => ({ pageNumber: p.pageNumber, imageUrl: p.imageUrl }));

  // 3. Look up product info
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return {
      found: false,
      match: null,
      fallback: {
        type: 'flyer_only',
        message: 'Could not find the product in our database.',
        flyerId: flyer.id,
        flyerTitle: flyer.title,
        totalPages: flyer.totalPages,
        allPages,
        flyerPage: 1,
        flyerImageUrl: allPages[0]?.imageUrl || '',
      },
    };
  }

  // 4. Try exact match via productId link
  for (const page of flyer.pages) {
    for (const item of page.items) {
      if (item.productId === productId) {
        return {
          found: true,
          match: buildMatchResult(item, page, flyer, store, 'high', 'exact_product_link', allPages),
        };
      }
    }
  }

  // 5. Try UPC/barcode match
  if (product.barcode) {
    for (const page of flyer.pages) {
      for (const item of page.items) {
        if (item.upc && item.upc === product.barcode) {
          return {
            found: true,
            match: buildMatchResult(item, page, flyer, store, 'high', 'upc_match', allPages),
          };
        }
      }
    }
  }

  // 6. Fuzzy match on name/brand
  let bestMatch: { item: any; page: any; score: number } | null = null;

  for (const page of flyer.pages) {
    for (const item of page.items) {
      let score = similarity(item.name, product.name);

      // Boost if brand matches
      if (item.brand && product.brand) {
        const brandSim = similarity(item.brand, product.brand);
        score = score * 0.7 + brandSim * 0.3;
      }

      // Boost if category matches
      if (item.brand && product.category) {
        const catWords = normalize(product.category).split(' ');
        const nameWords = normalize(item.name).split(' ');
        if (catWords.some(w => nameWords.includes(w))) {
          score += 0.1;
        }
      }

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { item, page, score };
      }
    }
  }

  if (bestMatch) {
    let confidence: MatchConfidence;
    let source: string;

    if (bestMatch.score >= 0.75) {
      confidence = 'high';
      source = 'fuzzy_name_brand_match';
    } else if (bestMatch.score >= 0.45) {
      confidence = 'medium';
      source = 'fuzzy_partial_match';
    } else {
      confidence = 'low';
      source = 'fuzzy_weak_match';
    }

    return {
      found: true,
      match: buildMatchResult(bestMatch.item, bestMatch.page, flyer, store, confidence, source, allPages),
    };
  }

  // 7. No item match — fallback to flyer only
  return {
    found: false,
    match: null,
    fallback: {
      type: 'flyer_only',
      message: 'Could not focus exact item yet, but this is the latest flyer for this store.',
      flyerId: flyer.id,
      flyerTitle: flyer.title,
      totalPages: flyer.totalPages,
      allPages,
      flyerPage: 1,
      flyerImageUrl: allPages[0]?.imageUrl || '',
    },
  };
}

function buildMatchResult(
  item: any,
  page: any,
  flyer: any,
  store: any,
  confidence: MatchConfidence,
  source: string,
  allPages: { pageNumber: number; imageUrl: string }[]
): FlyerMatchResult {
  return {
    productId: item.productId || '',
    storeId: store.id,
    storeName: store.name,
    flyerId: flyer.id,
    flyerTitle: flyer.title,
    flyerPage: page.pageNumber,
    flyerItemId: item.id,
    flyerImageUrl: page.imageUrl,
    matchConfidence: confidence,
    matchSource: source,
    focusTarget: {
      type: 'bounding_box',
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
    },
    productDetails: {
      name: item.name,
      brand: item.brand,
      size: item.size,
      price: item.price,
      originalPrice: item.originalPrice,
      saleStart: item.saleStart,
      saleEnd: item.saleEnd,
      plu: item.plu,
      itemCode: item.itemCode,
      upc: item.upc,
    },
    totalPages: flyer.totalPages,
    allPages,
  };
}
