import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface MultiProviderAIRequest {
  imageBase64: string;
  mimeType: string;
  provider: 'gemini' | 'openai' | 'anthropic';
  enhancedPrompt?: string;
}

interface GeminiAnalysis {
  description: string;
  objects: string[];
  categories: string[];
  colors: string[];
  confidence: number;
  collectibleDetails?: any;
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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase environment variables" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    // Get the authenticated user
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing authorization token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse the request body
    const body: MultiProviderAIRequest = await req.json();

    // Get user's AI provider configuration from the database
    const { data: aiConfig, error: configError } = await supabase
      .from('ai_provider_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider_name', body.provider)
      .single();

    if (configError || !aiConfig) {
      return new Response(
        JSON.stringify({ error: `${body.provider} API credentials not configured` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let analysis: GeminiAnalysis;

    switch (body.provider) {
      case 'gemini':
        analysis = await analyzeWithGemini(body, aiConfig.api_key_encrypted);
        break;
      case 'openai':
        analysis = await analyzeWithOpenAI(body, aiConfig.api_key_encrypted);
        break;
      case 'anthropic':
        analysis = await analyzeWithAnthropic(body, aiConfig.api_key_encrypted);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unsupported provider: ${body.provider}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
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

/**
 * Analyze image with Google Gemini
 */
const analyzeWithGemini = async (body: MultiProviderAIRequest, apiKey: string): Promise<GeminiAnalysis> => {
  // Use the enhanced prompt if provided, otherwise use the default
  const prompt = body.enhancedPrompt || `Analyze this image and provide:
1. A detailed description (1-2 sentences)
2. List of identified objects/items
3. Categories the image belongs to
4. Dominant colors
5. Confidence level (0-100)

Format your response as JSON with these keys: description, objects (array), categories (array), colors (array), confidence (number).`;

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
    throw new Error(`Failed to analyze image with Gemini: ${error}`);
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

  return analysis;
};

/**
 * Analyze image with OpenAI
 */
const analyzeWithOpenAI = async (body: MultiProviderAIRequest, apiKey: string): Promise<GeminiAnalysis> => {
  // Use the enhanced prompt if provided, otherwise use the default
  const prompt = body.enhancedPrompt || `Analyze this image and provide:
1. A detailed description (1-2 sentences)
2. List of identified objects/items
3. Categories the image belongs to
4. Dominant colors
5. Confidence level (0-100)

Format your response as JSON with these keys: description, objects (array), categories (array), colors (array), confidence (number).`;

  const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${body.mimeType};base64,${body.imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    }),
  });

  if (!openaiResponse.ok) {
    const error = await openaiResponse.text();
    console.error("OpenAI API error:", error);
    throw new Error(`Failed to analyze image with OpenAI: ${error}`);
  }

  const openaiData = await openaiResponse.json();

  // Parse the response to match GeminiAnalysis format
  const content = openaiData.choices[0].message.content;

  let analysis: GeminiAnalysis = {
    description: "",
    objects: [],
    categories: [],
    colors: [],
    confidence: 0,
  };

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      analysis = JSON.parse(jsonMatch[0]);
    }
  } catch (parseError) {
    analysis.description = content;
  }

  return analysis;
};

/**
 * Analyze image with Anthropic
 */
const analyzeWithAnthropic = async (body: MultiProviderAIRequest, apiKey: string): Promise<GeminiAnalysis> => {
  // Use the enhanced prompt if provided, otherwise use the default
  const prompt = body.enhancedPrompt || `Analyze this image and provide:
1. A detailed description (1-2 sentences)
2. List of identified objects/items
3. Categories the image belongs to
4. Dominant colors
5. Confidence level (0-100)

Format your response as JSON with these keys: description, objects (array), categories (array), colors (array), confidence (number).`;

  const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: body.mimeType,
                data: body.imageBase64,
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  if (!anthropicResponse.ok) {
    const error = await anthropicResponse.text();
    console.error("Anthropic API error:", error);
    throw new Error(`Failed to analyze image with Anthropic: ${error}`);
  }

  const anthropicData = await anthropicResponse.json();

  // Parse the response to match GeminiAnalysis format
  const content = anthropicData.content[0].text;

  let analysis: GeminiAnalysis = {
    description: "",
    objects: [],
    categories: [],
    colors: [],
    confidence: 0,
  };

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      analysis = JSON.parse(jsonMatch[0]);
    }
  } catch (parseError) {
    analysis.description = content;
  }

  return analysis;
};