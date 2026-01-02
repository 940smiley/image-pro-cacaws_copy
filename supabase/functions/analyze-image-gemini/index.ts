import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getStampResourcePreprocessor } from '../utils/stampResourcePreprocessor.ts';

interface GeminiRequest {
  imageBase64: string;
  mimeType: string;
  collectibleType?: 'stamp' | 'trading-card' | 'postcard' | 'war-letter' | 'other';
  enhancedPrompt?: string; // Legacy support or custom prompts
}

interface CollectibleDetails {
  type: string;
  era: string;
  country?: string;
  year?: string;
  denomination?: string;
  condition: string;
  rarity: string;
  estimatedValue: number;
  authentication: string[];
  grading?: string;
  historicalSignificance?: string;
  specialFeatures?: string[];
}

interface GeminiAnalysis {
  description: string;
  objects: string[];
  categories: string[];
  colors: string[];
  confidence: number;
  collectibleDetails?: CollectibleDetails;
  conditionAssessment?: string;
  authenticityMarkers?: string[];
  estimatedValueRange?: { min: number; max: number };
}

const COLLECTIBLE_PROMPTS: Record<string, string> = {
  'stamp': `Analyze this stamp in detail and provide:
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

    Format your response as JSON with these keys: description, objects (array), categories (array), colors (array), confidence (number), collectibleDetails (object with type, era, country, year, denomination, condition, rarity, estimatedValue, authentication, specialFeatures), conditionAssessment, authenticityMarkers (array), estimatedValueRange (object with min and max values).`,

  'trading-card': `Analyze this trading card in detail and provide:
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

    Format your response as JSON with these keys: description, objects (array), categories (array), colors (array), confidence (number), collectibleDetails (object with type, era, year, condition, rarity, estimatedValue, authentication, grading), conditionAssessment, authenticityMarkers (array), estimatedValueRange (object with min and max values).`,

  'postcard': `Analyze this postcard in detail and provide:
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

    Format your response as JSON with these keys: description, objects (array), categories (array), colors (array), confidence (number), collectibleDetails (object with type, era, country, year, condition, rarity, estimatedValue, authentication, historicalSignificance), conditionAssessment, authenticityMarkers (array), estimatedValueRange (object with min and max values).`,

  'war-letter': `Analyze this wartime correspondence in detail and provide:
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

    Format your response as JSON with these keys: description, objects (array), categories (array), colors (array), confidence (number), collectibleDetails (object with type, era, year, condition, estimatedValue, authentication, historicalSignificance), conditionAssessment, authenticityMarkers (array), estimatedValueRange (object with min and max values).`,

  'other': `Analyze this image and provide:
    1. A detailed description (1-2 sentences)
    2. List of identified objects/items
    3. Categories the image belongs to
    4. Dominant colors
    5. Confidence level (0-100)

    Format your response as JSON with these keys: description, objects (array), categories (array), colors (array), confidence (number).`
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body: GeminiRequest = await req.json();

    // Determine the prompt to use
    let prompt = "";
    if (body.enhancedPrompt) {
      prompt = body.enhancedPrompt;
    } else if (body.collectibleType && COLLECTIBLE_PROMPTS[body.collectibleType]) {
      prompt = COLLECTIBLE_PROMPTS[body.collectibleType];
    } else {
      prompt = COLLECTIBLE_PROMPTS['other'];
    }

    // Check if this is a stamp being analyzed and add additional context from our stamp resources
    if (body.collectibleType === 'stamp' || (body.enhancedPrompt && body.enhancedPrompt.toLowerCase().includes('stamp'))) {
      const preprocessor = getStampResourcePreprocessor();
      await preprocessor.initialize();
      const stampKnowledge = preprocessor.getStampKnowledge();

      // Add the stamp knowledge to the prompt
      prompt = `Using the following knowledge about stamp identification:\n\n${stampKnowledge}\n\n${prompt}`;
    }

    const geminiPayload = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: body.mimeType,
                data: body.imageBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
    };

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      }
    );

    if (!geminiResponse.ok) {
      const error = await geminiResponse.text();
      console.error("Gemini API error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to analyze image with Gemini" }),
        {
          status: geminiResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const geminiData = await geminiResponse.json();

    let analysis: GeminiAnalysis = {
      description: "",
      objects: [],
      categories: [],
      colors: [],
      confidence: 0,
    };

    if (
      geminiData.candidates &&
      geminiData.candidates[0]?.content?.parts?.[0]?.text
    ) {
      const responseText = geminiData.candidates[0].content.parts[0].text;

      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        analysis.description = responseText;
      }
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
