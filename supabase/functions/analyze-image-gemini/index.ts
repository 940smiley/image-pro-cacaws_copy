import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getStampResourcePreprocessor } from '../utils/stampResourcePreprocessor';

interface GeminiRequest {
  imageBase64: string;
  mimeType: string;
  enhancedPrompt?: string;
}

interface CollectibleDetails {
  type: string; // stamp, trading card, postcard, letter, etc.
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

    // Use the enhanced prompt if provided, otherwise use the default
    let prompt = body.enhancedPrompt || `Analyze this image and provide:
1. A detailed description (1-2 sentences)
2. List of identified objects/items
3. Categories the image belongs to
4. Dominant colors
5. Confidence level (0-100)

Format your response as JSON with these keys: description, objects (array), categories (array), colors (array), confidence (number).`;

    // Check if this is a stamp being analyzed and add additional context from our stamp resources
    if (body.enhancedPrompt && body.enhancedPrompt.toLowerCase().includes('stamp')) {
      const preprocessor = getStampResourcePreprocessor();
      await preprocessor.initialize();
      const stampKnowledge = preprocessor.getStampKnowledge();

      // Add the stamp knowledge to the prompt
      prompt = `Using the following knowledge about stamp identification:\n\n${stampKnowledge}\n\n${body.enhancedPrompt}`;
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
