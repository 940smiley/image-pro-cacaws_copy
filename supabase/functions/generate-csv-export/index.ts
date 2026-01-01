import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from '@supabase/supabase-js';

interface CsvExportRequest {
  results: Array<{
    id: string;
    originalFilename: string;
    newFilename: string;
    analysis: any; // GeminiAnalysis
    operations: any[]; // ProcessingOperation[]
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
    const body: CsvExportRequest = await req.json();

    // Create eBay-compatible CSV headers
    const headers = [
      'Title',
      'Subtitle',
      'Description',
      'Primary Category',
      'Secondary Category',
      'Store Category',
      'Store Category 2',
      'Condition',
      'Condition Description',
      'Brand',
      'Type',
      'Size',
      'Color',
      'Material',
      'Year',
      'Genre',
      'Theme',
      'Features',
      'Country/Region of Manufacture',
      'MPN',
      'Model',
      'Size Type',
      'Department',
      'Style',
      'ISBN',
      'UPC',
      'EAN',
      'ISBN/EAN/UPC',
      'ISBN/EAN/UPC Exemption',
      'Quantity',
      'Duration',
      'Start Price',
      'Reserve Price',
      'Buy It Now Price',
      'Best Offer',
      'Best Offer Accept',
      'Best Offer Decline',
      'Shipping Type',
      'Shipping Cost',
      'Shipping Additional Cost',
      'Shipping Service',
      'Shipping Service Additional Cost',
      'Shipping Service Priority',
      'Shipping Package',
      'Shipping Weight',
      'Shipping Length',
      'Shipping Width',
      'Shipping Height',
      'Shipping International Service',
      'Shipping Insurance',
      'Shipping Insurance Fee',
      'Return Accepted',
      'Return Period',
      'Return Description',
      'Return Shipping Paid By',
      'Return Admin Fee',
      'International Return Accepted',
      'International Return Period',
      'International Return Shipping Paid By',
      'International Return Admin Fee',
      'Shipping Location',
      'International Shipping Service',
      'International Shipping Cost',
      'International Shipping Additional Cost',
      'PayPal Accept',
      'PayPal Email',
      'PayPal Immediate Payment',
      'Charity',
      'Charity Name',
      'Charity Percentage',
      'Charity ID',
      'Charity Donation',
      'Gallery Type',
      'Gallery Featured',
      'Bold Title',
      'Digital Delivery',
      'Digital Delivery Type',
      'Digital Delivery Resale',
      'Digital Delivery Use Limit',
      'Digital Delivery Expire',
      'Digital Delivery Terms',
      'Digital Delivery Delivery Time',
      'Digital Delivery Delivery Method',
      'Digital Delivery Delivery Frequency',
      'Digital Delivery Delivery Format',
      'Digital Delivery Delivery Access',
      'Digital Delivery Delivery Rights',
      'Digital Delivery Delivery Restrictions',
      'Digital Delivery Delivery Requirements',
      'Digital Delivery Delivery Limitations',
      'Digital Delivery Delivery Terms URL',
      'Digital Delivery Delivery Instructions',
      'Digital Delivery Delivery Notes',
      'Digital Delivery Delivery Contact',
      'Digital Delivery Delivery Support',
      'Digital Delivery Delivery Guarantee',
      'Digital Delivery Delivery Warranty',
      'Digital Delivery Delivery Service',
      'Digital Delivery Delivery Provider',
      'Digital Delivery Delivery Platform',
      'Digital Delivery Delivery Format Type',
      'Digital Delivery Delivery Format Version',
      'Digital Delivery Delivery Format Compatibility',
      'Digital Delivery Delivery Format Requirements',
      'Digital Delivery Delivery Format Limitations',
      'Digital Delivery Delivery Format Notes',
      'Digital Delivery Delivery Format Instructions',
      'Digital Delivery Delivery Format Support',
      'Digital Delivery Delivery Format Guarantee',
      'Digital Delivery Delivery Format Warranty',
      'Digital Delivery Delivery Format Service',
      'Digital Delivery Delivery Format Provider',
      'Digital Delivery Delivery Format Platform'
    ];

    // Create CSV content
    let csvContent = headers.join(',') + '\n';

    body.results.forEach(result => {
      // Create row data based on the result
      const row = [
        result.newFilename.replace(/,/g, ''), // Title
        '', // Subtitle
        result.analysis.description.replace(/,/g, ''), // Description
        'Collectibles', // Primary Category
        result.analysis.collectibleDetails?.type || '', // Secondary Category
        '', // Store Category
        '', // Store Category 2
        result.analysis.collectibleDetails?.condition || 'Used', // Condition
        result.analysis.conditionAssessment?.replace(/,/g, '') || '', // Condition Description
        '', // Brand
        result.analysis.collectibleDetails?.type || '', // Type
        '', // Size
        result.analysis.colors?.join(' ').replace(/,/g, '') || '', // Color
        '', // Material
        result.analysis.collectibleDetails?.year || '', // Year
        '', // Genre
        '', // Theme
        result.analysis.collectibleDetails?.specialFeatures?.join(' ').replace(/,/g, '') || '', // Features
        result.analysis.collectibleDetails?.country || '', // Country/Region of Manufacture
        '', // MPN
        '', // Model
        '', // Size Type
        '', // Department
        '', // Style
        '', // ISBN
        '', // UPC
        '', // EAN
        '', // ISBN/EAN/UPC
        'No', // ISBN/EAN/UPC Exemption
        '1', // Quantity
        'GTC', // Duration
        result.analysis.estimatedValueRange?.min || '10.00', // Start Price
        '', // Reserve Price
        result.analysis.estimatedValueRange?.max || '', // Buy It Now Price
        'Yes', // Best Offer
        '', // Best Offer Accept
        '', // Best Offer Decline
        'Flat', // Shipping Type
        '0.00', // Shipping Cost
        '0.00', // Shipping Additional Cost
        'USPS Ground Advantage', // Shipping Service
        '0.00', // Shipping Service Additional Cost
        '1', // Shipping Service Priority
        'Package', // Shipping Package
        '0.5', // Shipping Weight
        '8', // Shipping Length
        '10', // Shipping Width
        '2', // Shipping Height
        'USPS First Class Package International', // Shipping International Service
        'No', // Shipping Insurance
        '0.00', // Shipping Insurance Fee
        'Yes', // Return Accepted
        '30 Days', // Return Period
        'Item must be returned in same condition as sent', // Return Description
        'Buyer', // Return Shipping Paid By
        'No', // Return Admin Fee
        'Yes', // International Return Accepted
        '30 Days', // International Return Period
        'Buyer', // International Return Shipping Paid By
        'No', // International Return Admin Fee
        'Worldwide', // Shipping Location
        'USPS First Class Package International', // International Shipping Service
        '5.00', // International Shipping Cost
        '0.00', // International Shipping Additional Cost
        'Yes', // PayPal Accept
        '', // PayPal Email
        'Yes', // PayPal Immediate Payment
        'No', // Charity
        '', // Charity Name
        '', // Charity Percentage
        '', // Charity ID
        'No', // Charity Donation
        'Standard', // Gallery Type
        'No', // Gallery Featured
        'No', // Bold Title
        'No', // Digital Delivery
      ].map(field => `"${field}"`).join(',');

      csvContent += row + '\n';
    });

    // Return the CSV as a response
    return new Response(csvContent, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=results.csv"
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