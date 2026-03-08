// Gemini Vision API integration for product recognition
// Used for identifying grocery products from photos

import { env } from '../config/env';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface RecognizedProduct {
  name: string;
  brand: string | null;
  category: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export async function recognizeProductGemini(imageBase64: string): Promise<RecognizedProduct | null> {
  if (!env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not configured');
    return null;
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
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
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      console.error('Gemini API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json() as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) return null;

    // Extract JSON from response (Gemini sometimes wraps in markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    if (parsed.error) return null;

    return {
      name: parsed.name,
      brand: parsed.brand || null,
      category: parsed.category || null,
      confidence: parsed.confidence || 'medium',
    };
  } catch (error) {
    console.error('Gemini Vision error:', error);
    return null;
  }
}
