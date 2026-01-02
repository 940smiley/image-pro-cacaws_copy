import { GeminiAnalysis, EbayPricingData } from '../types';

const API_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

const getHeaders = (): Record<string, string> => {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  };
};

export const analyzeImageWithGemini = async (imageFile: File): Promise<GeminiAnalysis> => {
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        const mimeType = imageFile.type || 'image/jpeg';

        const response = await fetch(`${API_BASE_URL}/analyze-image-gemini`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };

    reader.readAsDataURL(imageFile);
  });
};

export const analyzeCollectibleWithGemini = async (imageFile: File, collectibleType: 'stamp' | 'trading-card' | 'postcard' | 'war-letter' | 'other' = 'other'): Promise<GeminiAnalysis> => {
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        const mimeType = imageFile.type || 'image/jpeg';

        const response = await fetch(`${API_BASE_URL}/analyze-image-gemini`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType,
            collectibleType,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };

    reader.readAsDataURL(imageFile);
  });
};

export const searchEbayPricing = async (keywords: string, limit: number = 10): Promise<EbayPricingData> => {
  const response = await fetch(`${API_BASE_URL}/ebay-search-pricing`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      keywords,
      limit,
    }),
  });

  if (!response.ok) {
    throw new Error(`eBay API error: ${response.statusText}`);
  }

  return response.json();
};

export const analyzeAndPrice = async (imageFile: File): Promise<{ analysis: GeminiAnalysis; pricing?: EbayPricingData }> => {
  try {
    const analysis = await analyzeImageWithGemini(imageFile);

    let pricing: EbayPricingData | undefined;

    if (analysis.objects && analysis.objects.length > 0) {
      const searchQuery = analysis.objects.slice(0, 2).join(' ');

      try {
        pricing = await searchEbayPricing(searchQuery, 15);
      } catch (error) {
        console.warn('Failed to fetch eBay pricing:', error);
      }
    }

    return { analysis, pricing };
  } catch (error) {
    console.error('Analysis and pricing failed:', error);
    throw error;
  }
};
