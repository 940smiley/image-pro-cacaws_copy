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

        // Enhanced prompt based on collectible type
        let enhancedPrompt = '';

        switch(collectibleType) {
          case 'stamp':
            enhancedPrompt = `Analyze this stamp in detail and provide:
            1. Country of origin and issuing authority
            2. Year of issue
            3. Denomination and currency
            4. Scott catalog number if identifiable
            5. Condition assessment (mint, used, hinged, etc.)
            6. Rarity classification
            7. Estimated market value range ($)
            8. Authentication markers to look for
            9. Any special features (watermarks, perforations, etc.)
            10. Historical significance if applicable

            Format your response as JSON with these keys: description, objects (array), categories (array), colors (array), confidence (number), collectibleDetails (object with type, era, country, year, denomination, condition, rarity, estimatedValue, authentication, specialFeatures), conditionAssessment, authenticityMarkers (array), estimatedValueRange (object with min and max values).`;
            break;

          case 'trading-card':
            enhancedPrompt = `Analyze this trading card in detail and provide:
            1. Sport and league
            2. Year of issue
            3. Player name and team (if applicable)
            4. Card set and manufacturer
            5. Card number if present
            6. Condition assessment (Mint, Near Mint, Very Good, etc.)
            7. Grading information (PSA, BGS, etc.) if visible
            8. Estimated market value range ($)
            9. Authentication markers to verify genuineness
            10. Rarity classification

            Format your response as JSON with these keys: description, objects (array), categories (array), colors (array), confidence (number), collectibleDetails (object with type, era, year, condition, rarity, estimatedValue, authentication, grading), conditionAssessment, authenticityMarkers (array), estimatedValueRange (object with min and max values).`;
            break;

          case 'postcard':
            enhancedPrompt = `Analyze this postcard in detail and provide:
            1. Era of production (vintage period)
            2. Location depicted
            3. Publisher and series if identifiable
            4. Type (real photo, linen, chrome, etc.)
            5. Condition assessment
            6. Historical significance
            7. Estimated value range ($)
            8. Authentication markers for vintage authenticity
            9. Rarity assessment
            10. Any special historical context

            Format your response as JSON with these keys: description, objects (array), categories (array), colors (array), confidence (number), collectibleDetails (object with type, era, country, year, condition, rarity, estimatedValue, authentication, historicalSignificance), conditionAssessment, authenticityMarkers (array), estimatedValueRange (object with min and max values).`;
            break;

          case 'war-letter':
            enhancedPrompt = `Analyze this wartime correspondence in detail and provide:
            1. Approximate date and war/conflict period
            2. Origin location and destination if visible
            3. Military unit or branch if indicated
            4. Historical context and significance
            5. Condition assessment considering age
            6. Estimated historical value ($)
            7. Authentication markers for legitimacy
            8. Provenance indicators if present
            9. Rarity assessment
            10. Any censored or redacted content

            Format your response as JSON with these keys: description, objects (array), categories (array), colors (array), confidence (number), collectibleDetails (object with type, era, year, condition, estimatedValue, authentication, historicalSignificance), conditionAssessment, authenticityMarkers (array), estimatedValueRange (object with min and max values).`;
            break;

          default:
            enhancedPrompt = `Analyze this image and provide:
            1. A detailed description (1-2 sentences)
            2. List of identified objects/items
            3. Categories the image belongs to
            4. Dominant colors
            5. Confidence level (0-100)

            Format your response as JSON with these keys: description, objects (array), categories (array), colors (array), confidence (number).`;
        }

        const response = await fetch(`${API_BASE_URL}/analyze-image-gemini`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType,
            enhancedPrompt, // This will be used in the backend to customize the analysis
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
    throw error;
  }
};
