// Gemini Vision API integration for product recognition
// Used for identifying grocery products from photos

import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';

export interface RecognizedProduct {
  name: string;
  brand: string | null;
  category: string | null;
  confidence: 'high' | 'medium' | 'low';
  size: string | null;
  keywords: string[];
  upc: string | null;
  description: string | null;
  alternatives: string[];
}

const PROMPT = `You are CartSniper's grocery product recognition engine.

Analyze this grocery product image and extract structured data.

Return ONLY a valid JSON object with no markdown, no explanation, no backticks.

{
  "found": true,
  "confidence": "high" | "medium" | "low",
  "name": "full product name",
  "brand": "brand name",
  "size": "size/weight/volume e.g. 1.54L, 900g, 12pk",
  "category": "Dairy | Beverages | Snacks | Produce | Meat | Bakery | Frozen | Pantry | Personal Care | Other",
  "keywords": ["search term 1", "search term 2"],
  "upc": "barcode number if visible on packaging, otherwise null",
  "description": "one sentence product description for display",
  "alternatives": ["similar generic or cheaper product name 1", "similar generic or cheaper product name 2"]
}

Rules:
- If the image is NOT a grocery product, return { "found": false, "reason": "brief explanation" }
- If confidence is low, still try your best but set confidence to "low"
- Size must always include the unit
- Keywords should be terms a shopper would search to find this item
- Alternatives should be store-brand or generic equivalents of the same product
- UPC only if clearly readable in the image, otherwise null
- Never return markdown or prose, only the raw JSON object`;

export async function recognizeProductGemini(imageBase64: string): Promise<RecognizedProduct | null> {
  if (!env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not configured');
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent([
      { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
      PROMPT,
    ]);

    const text = result.response.text();
    if (!text) return null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.found) return null;

    return {
      name: parsed.name,
      brand: parsed.brand || null,
      category: parsed.category || null,
      confidence: parsed.confidence || 'medium',
      size: parsed.size || null,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      upc: parsed.upc || null,
      description: parsed.description || null,
      alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
    };
  } catch (error) {
    console.error('Gemini Vision error:', error);
    return null;
  }
}

