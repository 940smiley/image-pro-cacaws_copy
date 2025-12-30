import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from '@supabase/supabase-js';

interface RenameImageRequest {
  originalFilename: string;
  analysis: any; // GeminiAnalysis
}

interface RenameImageResponse {
  originalFilename: string;
  newFilename: string;
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
    const body: RenameImageRequest = await req.json();

    // Generate a new filename based on the analysis
    let newFilename = generateSmartFilename(body.originalFilename, body.analysis);

    // Return the response
    const response: RenameImageResponse = {
      originalFilename: body.originalFilename,
      newFilename: newFilename
    };

    return new Response(JSON.stringify(response), {
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
 * Generates a smart filename based on Gemini analysis
 * @param originalFilename The original filename
 * @param analysis The Gemini analysis result
 * @returns A new filename based on the analysis
 */
const generateSmartFilename = (originalFilename: string, analysis: any): string => {
  // Extract the file extension
  const fileExtension = originalFilename.split('.').pop() || 'jpg';
  
  // Create a base name based on the analysis
  let baseName = '';
  
  if (analysis.collectibleDetails) {
    // For collectibles, create a descriptive name
    const { type, year, country, denomination, condition } = analysis.collectibleDetails;
    
    // Build the name based on available details
    const parts = [];
    
    if (year) parts.push(year);
    if (country) parts.push(country);
    if (type) parts.push(type);
    if (denomination) parts.push(denomination);
    
    // Add description if available
    if (analysis.description) {
      // Clean the description to remove special characters
      const cleanDescription = analysis.description
        .replace(/[^\w\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 50); // Limit length
      
      parts.push(cleanDescription);
    }
    
    baseName = parts.join(' ').replace(/\s+/g, ' ').trim();
  } else if (analysis.objects && analysis.objects.length > 0) {
    // For non-collectibles, use the main objects identified
    baseName = analysis.objects.slice(0, 3).join(' ').replace(/\s+/g, ' ').trim();
  } else {
    // Fallback to the original name with a prefix
    baseName = `analyzed-${originalFilename.replace(/\.[^/.]+$/, '')}`;
  }
  
  // Clean the base name to ensure it's a valid filename
  baseName = baseName
    .replace(/[<>:"/\\|?*]/g, ' ') // Replace invalid characters
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
  
  // Limit the total length to avoid filesystem issues
  if (baseName.length > 100) {
    baseName = baseName.substring(0, 100).trim();
  }
  
  // Return the new filename with the original extension
  return `${baseName}.${fileExtension}`;
};