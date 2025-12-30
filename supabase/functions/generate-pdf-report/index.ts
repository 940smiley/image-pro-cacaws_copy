import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, rgb } from 'pdf-lib';

interface PdfReportRequest {
  results: Array<{
    id: string;
    originalFilename: string;
    newFilename: string;
    analysis: any; // GeminiAnalysis
    operations: any[]; // ProcessingOperation[]
  }>;
  images: Array<{
    id: string;
    file: {
      name: string;
    };
    result?: string;
  }>;
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
    const body: PdfReportRequest = await req.json();

    // Create a PDF document
    const pdfDoc = await PDFDocument.create();
    
    for (const result of body.results) {
      // Add a new page for each result
      const page = pdfDoc.addPage([595, 842]); // A4 size in points
      const { width, height } = page.getSize();
      const fontSize = 12;
      
      // Add title
      page.drawText(`Image: ${result.newFilename}`, {
        x: 50,
        y: height - 50,
        size: 16,
        color: rgb(0, 0, 0),
      });
      
      // Add description
      page.drawText(`Description: ${result.analysis.description}`, {
        x: 50,
        y: height - 80,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
      
      // Add objects identified
      page.drawText(`Objects: ${result.analysis.objects?.join(', ') || ''}`, {
        x: 50,
        y: height - 100,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
      
      // Add categories
      page.drawText(`Categories: ${result.analysis.categories?.join(', ') || ''}`, {
        x: 50,
        y: height - 120,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
      
      // Add colors
      page.drawText(`Colors: ${result.analysis.colors?.join(', ') || ''}`, {
        x: 50,
        y: height - 140,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
      
      // Add collectible details if available
      if (result.analysis.collectibleDetails) {
        const details = result.analysis.collectibleDetails;
        let yPos = height - 170;
        
        page.drawText(`Collectible Type: ${details.type}`, {
          x: 50,
          y: yPos,
          size: fontSize,
          color: rgb(0, 0, 0),
        });
        yPos -= 20;
        
        if (details.era) {
          page.drawText(`Era: ${details.era}`, {
            x: 50,
            y: yPos,
            size: fontSize,
            color: rgb(0, 0, 0),
          });
          yPos -= 20;
        }
        
        if (details.country) {
          page.drawText(`Country: ${details.country}`, {
            x: 50,
            y: yPos,
            size: fontSize,
            color: rgb(0, 0, 0),
          });
          yPos -= 20;
        }
        
        if (details.year) {
          page.drawText(`Year: ${details.year}`, {
            x: 50,
            y: yPos,
            size: fontSize,
            color: rgb(0, 0, 0),
          });
          yPos -= 20;
        }
        
        if (details.condition) {
          page.drawText(`Condition: ${details.condition}`, {
            x: 50,
            y: yPos,
            size: fontSize,
            color: rgb(0, 0, 0),
          });
          yPos -= 20;
        }
        
        if (details.rarity) {
          page.drawText(`Rarity: ${details.rarity}`, {
            x: 50,
            y: yPos,
            size: fontSize,
            color: rgb(0, 0, 0),
          });
          yPos -= 20;
        }
        
        page.drawText(`Estimated Value: $${details.estimatedValue}`, {
          x: 50,
          y: yPos,
          size: fontSize,
          color: rgb(0, 0, 0),
        });
        yPos -= 20;
      }
      
      // Add condition assessment
      if (result.analysis.conditionAssessment) {
        page.drawText(`Condition Assessment: ${result.analysis.conditionAssessment}`, {
          x: 50,
          y: height - 250,
          size: fontSize,
          color: rgb(0, 0, 0),
        });
      }
      
      // Add estimated value range
      if (result.analysis.estimatedValueRange) {
        const { min, max } = result.analysis.estimatedValueRange;
        page.drawText(`Estimated Value Range: $${min} - $${max}`, {
          x: 50,
          y: height - 270,
          size: fontSize,
          color: rgb(0, 0, 0),
        });
      }
      
      // Add confidence
      page.drawText(`Analysis Confidence: ${result.analysis.confidence}%`, {
        x: 50,
        y: height - 290,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
      
      // Add processing operations
      const operations = result.operations.map(op => `${op.type}: ${JSON.stringify(op.params)}`).join(', ');
      page.drawText(`Processing Operations: ${operations}`, {
        x: 50,
        y: height - 310,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
    }
    
    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();
    
    // Return the PDF as a response
    return new Response(pdfBytes, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=report.pdf"
      },
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