import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PERF_COUNT_PROMPT = `
  You are an expert philatelist's assistant specializing in stamp analysis.
  Your task is to analyze the provided image of a postage stamp and determine its perforation count.

  Instructions:
  1. Carefully examine the edges of the stamp in the image.
  2. Count the number of perforations (holes) along the horizontal edge.
  3. Count the number of perforations (holes) along the vertical edge.
  4. Your analysis must be precise. If the image is unclear or you cannot determine the count accurately, provide your best estimate and a confidence score.
  5. Return the result ONLY in the following JSON format:
  {
    "horizontal": <number>,
    "vertical": <number>,
    "confidence": <number_between_0_and_1>,
    "notes": "<Your notes on the analysis, e.g., 'Image is slightly blurry on the right edge'>"
  }

  Do not include any other text, markdown, or explanations outside of the JSON structure.
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType = 'image/jpeg' } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API key not configured." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const geminiPayload = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64,
              },
            },
            {
              text: PERF_COUNT_PROMPT,
            },
          ],
        },
      ],
      "generationConfig": {
        "responseMimeType": "application/json",
      }
    };

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API Error:", errorText);
      return new Response(JSON.stringify({ error: "Failed to call Gemini API", details: errorText }), {
        status: geminiResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiResponse.json();
    
    if (geminiData.candidates && geminiData.candidates[0]?.content?.parts?.[0]?.text) {
      const responseText = geminiData.candidates[0].content.parts[0].text;
      const perfCountData = JSON.parse(responseText);
      
      return new Response(JSON.stringify(perfCountData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      throw new Error("Invalid response structure from Gemini API");
    }

  } catch (error) {
    console.error("Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
