import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ORIENTATION_PROMPT = `
  You are an AI assistant that specializes in image analysis. Your task is to determine the orientation of the provided image.

  Instructions:
  1. Analyze the image to identify its correct "up" direction.
  2. Determine the clockwise rotation angle in degrees required to correct the image's orientation.
  3. The angle must be one of the following values: 0, 90, 180, 270.
  4. Return the result ONLY in the following JSON format:
  {
    "rotation": <angle>
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
              text: ORIENTATION_PROMPT,
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
      const orientationData = JSON.parse(responseText);
      
      return new Response(JSON.stringify(orientationData), {
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
