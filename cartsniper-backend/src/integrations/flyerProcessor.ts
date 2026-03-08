// Gemini-based flyer image processor
// Extracts products + bounding boxes from grocery store flyer images

import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';

export interface ExtractedFlyerItem {
  name: string;
  brand: string | null;
  size: string | null;
  price: number;
  originalPrice: number | null;
  category: string | null;
  upc: string | null;
  // Bounding box coordinates normalized 0-1
  x: number;
  y: number;
  width: number;
  height: number;
}

const FLYER_PROMPT = `You are a grocery flyer analysis engine for CartSniper, a Canadian grocery price comparison app.

Analyze this grocery store flyer image and extract ALL visible product deals/items.

For each product, provide:
1. Product details (name, brand, size, price, original price if on sale)
2. A bounding box showing where the product appears in the image, using coordinates normalized from 0 to 1 (where 0,0 is top-left and 1,1 is bottom-right)

Return ONLY a valid JSON object with no markdown, no backticks, no explanation:

{
  "items": [
    {
      "name": "full product name",
      "brand": "brand name or null",
      "size": "weight/volume/count e.g. 750ml, 454g, 12pk, or null",
      "price": 3.99,
      "originalPrice": 5.49,
      "category": "Dairy|Beverages|Snacks|Produce|Meat|Bakery|Frozen|Pantry|Condiments|Cereal|Eggs|Soup|Pasta|Other",
      "upc": null,
      "x": 0.05,
      "y": 0.12,
      "width": 0.18,
      "height": 0.25
    }
  ]
}

Rules:
- Extract EVERY visible product deal, not just a few
- Price must be a number (e.g. 3.99 not "$3.99")
- originalPrice is the crossed-out/regular price if the item is on sale, otherwise null
- Bounding box must tightly surround each product's section in the flyer (including its image, name, and price tag)
- x, y = top-left corner of the bounding box (0-1 normalized)
- width, height = size of the bounding box (0-1 normalized)
- Coordinates must stay within 0-1 range
- If brand is not clearly visible, set to null
- size should include the unit (g, kg, ml, L, pk, etc.)
- This is a STORE_NAME flyer — use that context for brand recognition
- Never return markdown or prose, only the raw JSON object`;

export async function extractFlyerItems(
  imageBase64: string,
  storeName: string,
  mimeType: string = 'image/png'
): Promise<ExtractedFlyerItem[]> {
  if (!env.GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY not set — skipping flyer extraction');
    return [];
  }

  const prompt = FLYER_PROMPT.replace('STORE_NAME', storeName);
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      console.log(`  🔍 Sending ${storeName} flyer to Gemini for extraction${attempt > 1 ? ` (attempt ${attempt})` : ''}...`);

      const result = await model.generateContent([
        { inlineData: { mimeType, data: imageBase64 } },
        prompt,
      ]);

      const text = result.response.text();
      if (!text) {
        console.warn(`  ⚠️  Empty Gemini response for ${storeName}`);
        return [];
      }

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn(`  ⚠️  No JSON found in Gemini response for ${storeName}`);
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed.items)) {
        console.warn(`  ⚠️  No items array in Gemini response for ${storeName}`);
        return [];
      }

      // Validate and clamp bounding boxes to 0-1
      const items: ExtractedFlyerItem[] = parsed.items
        .filter((item: any) => item.name && typeof item.price === 'number')
        .map((item: any) => ({
          name: String(item.name),
          brand: item.brand ? String(item.brand) : null,
          size: item.size ? String(item.size) : null,
          price: item.price,
          originalPrice: typeof item.originalPrice === 'number' ? item.originalPrice : null,
          category: item.category ? String(item.category) : null,
          upc: item.upc ? String(item.upc) : null,
          x: clamp(item.x ?? 0, 0, 1),
          y: clamp(item.y ?? 0, 0, 1),
          width: clamp(item.width ?? 0.1, 0.01, 1),
          height: clamp(item.height ?? 0.1, 0.01, 1),
        }));

      console.log(`  ✅ Extracted ${items.length} items from ${storeName} flyer`);
      return items;
    } catch (error: any) {
      // Retry on rate limit (429)
      if (error?.status === 429 && attempt < maxRetries) {
        const retryDelay = Math.min(35 * attempt, 90);
        console.log(`  ⏳ Rate limited — waiting ${retryDelay}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
        continue;
      }
      console.error(`  ❌ Gemini flyer extraction error for ${storeName}:`, error);
      return [];
    }
  }
  return [];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
