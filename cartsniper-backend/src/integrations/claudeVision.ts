// Claude Vision API integration for product recognition
// Used when barcode scanning fails or for receipt scanning

import { env } from '../config/env';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export interface RecognizedProduct {
  name: string;
  brand: string | null;
  category: string | null;
  confidence: 'high' | 'medium' | 'low';
}

// Recognize grocery product from image
export async function recognizeProduct(imageBase64: string): Promise<RecognizedProduct | null> {
  if (!env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not configured');
    return null;
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: `Identify this grocery product. Respond with ONLY valid JSON in this exact format:
{
  "name": "exact product name as you see it",
  "brand": "brand name or null",
  "category": "category like 'Dairy', 'Snacks', 'Beverages', etc.",
  "confidence": "high/medium/low"
}

If you cannot identify a grocery product, respond with: {"error": "not_found"}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Claude API error:', response.status);
      return null;
    }

    const data = await response.json() as any;
    const text = data.content?.[0]?.text;

    if (!text) return null;

    const parsed = JSON.parse(text);
    
    if (parsed.error) return null;

    return {
      name: parsed.name,
      brand: parsed.brand,
      category: parsed.category,
      confidence: parsed.confidence || 'medium',
    };
  } catch (error) {
    console.error('Claude Vision error:', error);
    return null;
  }
}

// Recognize multiple products from a receipt image
export async function recognizeReceipt(imageBase64: string): Promise<string[]> {
  if (!env.ANTHROPIC_API_KEY) {
    return [];
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: `Extract all grocery product names from this receipt. Respond with ONLY a JSON array of product names:
["Product 1", "Product 2", "Product 3"]

If no products are visible, respond with: []`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) return [];

    const data = await response.json() as any;
    const text = data.content?.[0]?.text;

    if (!text) return [];

    return JSON.parse(text);
  } catch (error) {
    console.error('Receipt recognition error:', error);
    return [];
  }
}
