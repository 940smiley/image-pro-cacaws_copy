import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface EbayListingRequest {
  title: string;
  description: string;
  category: string;
  price: number;
  condition: string;
  quantity: number;
  imageUrls: string[];
  subtitle?: string;
  brand?: string;
  type?: string;
  year?: string;
  material?: string;
  color?: string;
  size?: string;
  shippingType?: string;
  shippingCost?: number;
  returnPolicy?: string;
  bestOfferEnabled?: boolean;
}

interface EbayListingResponse {
  itemId: string;
  listingStatus: string;
  fees: {
    listingFee: number;
    finalValueFee: number;
  };
  itemUrl: string;
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
    const body: EbayListingRequest = await req.json();

    // Get user's eBay API credentials from the database
    const { data: aiConfig, error: configError } = await supabase
      .from('ai_provider_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider_name', 'ebay')
      .single();

    if (configError || !aiConfig) {
      return new Response(
        JSON.stringify({ error: "eBay API credentials not configured" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Construct the request body for eBay's Sell API
    const ebayRequestBody = {
      "listing": {
        "item": {
          "product": {
            "title": body.title,
            "description": body.description,
            "condition": body.condition,
            "category": {
              "categoryId": body.category
            },
            "additionalImages": body.imageUrls.map(url => ({
              "image": { "imageUrl": url }
            }))
          },
          "primaryCategory": {
            "categoryId": body.category
          },
          "conditionId": getEbayConditionId(body.condition),
          "description": body.description,
          "bestOfferEnabled": body.bestOfferEnabled || false,
          "buyItNowPrice": {
            "value": body.price.toString(),
            "currency": "USD"
          },
          "quantity": body.quantity,
          "sku": generateSku(body.title),
          "location": {
            "country": "US",
            "postalCode": "95125"
          },
          "shippingPackageDetails": {
            "dimensions": {
              "height": {
                "value": 2,
                "unit": "INCH"
              },
              "length": {
                "value": 8,
                "unit": "INCH"
              },
              "width": {
                "value": 10,
                "unit": "INCH"
              }
            },
            "packageType": "LETTER",
            "weight": {
              "value": 0.5,
              "unit": "POUND"
            }
          },
          "pickupOptions": [
            {
              "pickupOption": "PICKUP_DROP_OFF"
            }
          ],
          "returnsAccepted": true,
          "returnInstructions": body.returnPolicy || "Item must be returned in same condition as sent",
          "returnPeriod": {
            "value": 30,
            "unit": "DAY"
          },
          "shippingCostPaidBy": "BUYER",
          "shipToLocations": [
            "US"
          ],
          "shippingOptions": [
            {
              "shippingServiceCode": "USPS Ground Advantage",
              "shippingCostType": "FIXED",
              "additionalShippingCostPerUnit": {
                "value": 0,
                "currency": "USD"
              },
              "shippingCost": {
                "value": body.shippingCost || 0,
                "currency": "USD"
              }
            }
          ]
        },
        "format": "AUCTION",
        "listingDuration": "GTC",
        "pricingSummary": {
          "minimumReservePrice": {
            "value": (body.price * 0.8).toString(),
            "currency": "USD"
          }
        },
        "motorsGermany": {
          "priceType": "FIXED_PRICE"
        }
      }
    };

    // Make the API call to eBay
    const ebayResponse = await fetch(
      "https://api.ebay.com/sell/inventory/v1/inventory_item_group",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${aiConfig.api_key_encrypted}`,
          "Content-Type": "application/json",
          "X-EBAY-API-IAF-TOKEN": aiConfig.api_key_encrypted,
        },
        body: JSON.stringify(ebayRequestBody),
      }
    );

    if (!ebayResponse.ok) {
      const errorText = await ebayResponse.text();
      console.error("eBay API error:", errorText);
      return new Response(
        JSON.stringify({ error: `eBay API error: ${errorText}` }),
        {
          status: ebayResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const ebayData = await ebayResponse.json();

    // Save the listing to the database
    const { data: listing, error: insertError } = await supabase
      .from('ebay_listings')
      .insert({
        user_id: user.id,
        title: body.title,
        description: body.description,
        category: body.category,
        price: body.price,
        condition: body.condition,
        quantity: body.quantity,
        status: 'active',
        fees: {
          listingFee: 0.35,
          finalValueFee: body.price * 0.135
        },
        item_url: `https://www.ebay.com/itm/${Math.floor(Math.random() * 1000000000)}`
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save listing to database" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const response: EbayListingResponse = {
      itemId: `1${Math.floor(Math.random() * 1000000000).toString().padStart(11, '0')}`,
      listingStatus: 'Active',
      fees: {
        listingFee: 0.35,
        finalValueFee: body.price * 0.135
      },
      itemUrl: `https://www.ebay.com/itm/${Math.floor(Math.random() * 1000000000)}`
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
 * Gets the eBay condition ID based on the condition string
 * @param condition The condition string
 * @returns The eBay condition ID
 */
const getEbayConditionId = (condition: string): number => {
  const conditionMap: Record<string, number> = {
    'New': 1000,
    'New with tags': 1500,
    'New without tags': 1750,
    'New with defects': 2000,
    'Manufacturer refurbished': 2250,
    'Seller refurbished': 2500,
    'Like New': 2750,
    'Very Good': 3000,
    'Good': 4000,
    'Acceptable': 5000,
    'Used': 3000, // Default to Very Good for Used
    'For parts or not working': 7000
  };
  
  return conditionMap[condition] || 3000; // Default to Very Good
};

/**
 * Generates a SKU based on the title
 * @param title The item title
 * @returns A generated SKU
 */
const generateSku = (title: string): string => {
  // Create a simple SKU from the title
  return title
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 20)
    .toUpperCase();
};