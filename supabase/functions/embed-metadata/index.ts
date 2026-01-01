import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface MetadataEmbedRequest {
  imageBase64: string;
  analysis: any; // GeminiAnalysis
  operations: any[]; // ProcessingOperation[]
  filename: string;
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
    const body: MetadataEmbedRequest = await req.json();

    // In a real implementation, we would use a library like exiftool to embed metadata
    // For this implementation, we'll simulate the process by creating a response
    // that includes the original image with metadata as a JSON object
    
    // Create metadata object from analysis and operations
    const metadata = {
      // Standard metadata
      'Image Filename': body.filename,
      'Processing Date': new Date().toISOString(),
      'Analysis Confidence': body.analysis.confidence,
      
      // Analysis results
      'Description': body.analysis.description,
      'Objects Identified': body.analysis.objects?.join(', ') || '',
      'Categories': body.analysis.categories?.join(', ') || '',
      'Colors': body.analysis.colors?.join(', ') || '',
      
      // Collectible details if available
      ...(body.analysis.collectibleDetails && {
        'Collectible Type': body.analysis.collectibleDetails.type,
        'Era': body.analysis.collectibleDetails.era,
        'Country': body.analysis.collectibleDetails.country,
        'Year': body.analysis.collectibleDetails.year,
        'Denomination': body.analysis.collectibleDetails.denomination,
        'Condition': body.analysis.collectibleDetails.condition,
        'Rarity': body.analysis.collectibleDetails.rarity,
        'Estimated Value': body.analysis.collectibleDetails.estimatedValue,
        'Authentication Markers': body.analysis.collectibleDetails.authentication?.join(', '),
        'Grading': body.analysis.collectibleDetails.grading,
        'Historical Significance': body.analysis.collectibleDetails.historicalSignificance,
        'Special Features': body.analysis.collectibleDetails.specialFeatures?.join(', '),
      }),
      
      // Condition and authenticity
      ...(body.analysis.conditionAssessment && { 'Condition Assessment': body.analysis.conditionAssessment }),
      ...(body.analysis.authenticityMarkers && { 'Authenticity Markers': body.analysis.authenticityMarkers.join(', ') }),
      
      // Value estimation
      ...(body.analysis.estimatedValueRange && {
        'Estimated Value Min': body.analysis.estimatedValueRange.min,
        'Estimated Value Max': body.analysis.estimatedValueRange.max,
      }),
      
      // Processing operations
      'Processing Operations': body.operations.map(op => `${op.type}: ${JSON.stringify(op.params)}`).join('; '),
      
      // Application-specific metadata
      'Application': 'Image Pro',
      'Version': '1.0.0',
    };

    // In a real implementation, we would embed this metadata into the image
    // For now, we'll return the original image with the metadata as a separate field
    const response = {
      imageBase64: body.imageBase64, // In a real implementation, this would be the image with embedded metadata
      metadata: metadata,
      success: true
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