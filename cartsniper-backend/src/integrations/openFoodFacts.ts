// Open Food Facts API integration
// Free database of food products with barcodes
// Docs: https://wiki.openfoodfacts.org/API

import { PrismaClient } from '@prisma/client';

const BASE_URL = 'https://world.openfoodfacts.org/api/v2';
const USER_AGENT = 'CartSniper/1.0 (hackathon@example.com)';

const prisma = new PrismaClient();

export interface OpenFoodFactsProduct {
  name: string;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  ingredients: string | null;
  nutritionGrade: string | null;
  calories: number | null;
  servingSize: string | null;
  barcode: string;
}

// Lookup product by barcode from Open Food Facts API
export async function lookupBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  try {
    const response = await fetch(`${BASE_URL}/product/${barcode}.json`, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!response.ok) {
      console.error(`Open Food Facts API error: ${response.status}`);
      return null;
    }

    const data = await response.json() as any;

    if (data.status !== 1 || !data.product) {
      return null;
    }

    const p = data.product;
    const nutriments = p.nutriments || {};

    return {
      name: p.product_name || p.product_name_en || 'Unknown Product',
      brand: p.brands || null,
      category: p.categories?.split(',')[0]?.trim() || null,
      imageUrl: p.image_url || p.image_front_url || null,
      ingredients: p.ingredients_text || null,
      nutritionGrade: p.nutrition_grades || null,
      calories: nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'] ?? null,
      servingSize: p.serving_size || null,
      barcode,
    };
  } catch (error) {
    console.error('Open Food Facts lookup error:', error);
    return null;
  }
}

// High-level function: check Prisma cache first, then fetch from API and cache
export async function getProductByBarcode(barcode: string) {
  // 1. Check DB cache
  const cached = await prisma.product.findUnique({ where: { barcode } });
  if (cached) return cached;

  // 2. Fetch from Open Food Facts
  const offProduct = await lookupBarcode(barcode);
  if (!offProduct) return null;

  // 3. Cache in Prisma
  const product = await prisma.product.create({
    data: {
      barcode,
      name: offProduct.name,
      brand: offProduct.brand,
      category: offProduct.category,
      imageUrl: offProduct.imageUrl,
    },
  });

  // Attach extra fields that aren't in the Prisma model (returned but not persisted)
  return {
    ...product,
    calories: offProduct.calories,
    servingSize: offProduct.servingSize,
    ingredients: offProduct.ingredients,
  };
}

// Search products by name (use sparingly - rate limited to 10 req/min)
export async function searchProducts(query: string, limit: number = 10): Promise<OpenFoodFactsProduct[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/search?search_terms=${encodeURIComponent(query)}&page_size=${limit}&json=1`,
      { headers: { 'User-Agent': USER_AGENT } },
    );

    if (!response.ok) return [];

    const data = await response.json() as any;

    return (data.products || []).map((p: any) => ({
      name: p.product_name || 'Unknown',
      brand: p.brands || null,
      category: p.categories?.split(',')[0]?.trim() || null,
      imageUrl: p.image_url || null,
      ingredients: null,
      nutritionGrade: p.nutrition_grades || null,
      calories: p.nutriments?.['energy-kcal_100g'] ?? null,
      servingSize: p.serving_size || null,
      barcode: p.code || '',
    }));
  } catch (error) {
    console.error('Open Food Facts search error:', error);
    return [];
  }
}
