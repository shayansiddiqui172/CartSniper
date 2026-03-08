// Open Food Facts API integration
// Free database of food products with barcodes
// Docs: https://wiki.openfoodfacts.org/API

const BASE_URL = 'https://world.openfoodfacts.org/api/v2';
const USER_AGENT = 'CartSniper/1.0 (hackathon@cartsniper.app)';

export interface OpenFoodFactsProduct {
  name: string;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  ingredients: string | null;
  nutritionGrade: string | null;
}

// Lookup product by barcode (UPC/EAN)
export async function lookupBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  try {
    const response = await fetch(`${BASE_URL}/product/${barcode}.json`, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      console.error(`Open Food Facts API error: ${response.status}`);
      return null;
    }

    const data = await response.json() as any;

    if (data.status !== 1 || !data.product) {
      return null; // Product not found
    }

    const product = data.product;

    return {
      name: product.product_name || product.product_name_en || 'Unknown Product',
      brand: product.brands || null,
      category: product.categories?.split(',')[0]?.trim() || null,
      imageUrl: product.image_url || product.image_front_url || null,
      ingredients: product.ingredients_text || null,
      nutritionGrade: product.nutrition_grades || null,
    };
  } catch (error) {
    console.error('Open Food Facts lookup error:', error);
    return null;
  }
}

// Search products by name (use sparingly - rate limited to 10 req/min)
export async function searchProducts(query: string, limit: number = 10): Promise<OpenFoodFactsProduct[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/search?search_terms=${encodeURIComponent(query)}&page_size=${limit}&json=1`,
      {
        headers: {
          'User-Agent': USER_AGENT,
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json() as any;

    return (data.products || []).map((product: any) => ({
      name: product.product_name || 'Unknown',
      brand: product.brands || null,
      category: product.categories?.split(',')[0]?.trim() || null,
      imageUrl: product.image_url || null,
      ingredients: null,
      nutritionGrade: product.nutrition_grades || null,
    }));
  } catch (error) {
    console.error('Open Food Facts search error:', error);
    return [];
  }
}
