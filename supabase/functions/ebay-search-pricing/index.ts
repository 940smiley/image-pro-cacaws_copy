import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface EbaySearchRequest {
  keywords: string;
  limit?: number;
}

interface EbayListing {
  itemId: string;
  title: string;
  currentPrice: string;
  condition: string;
  sellerInfo: {
    sellerUserName: string;
    feedbackRating: number;
  };
  listingStatus: string;
  endDate: string;
  itemUrl: string;
  imageUrl?: string;
}

interface EbayPricingData {
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  listings: EbayListing[];
  searchQuery: string;
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
    const ebayAppId = Deno.env.get("EBAY_APP_ID");
    const ebayAccessToken = Deno.env.get("EBAY_ACCESS_TOKEN");

    if (!ebayAppId || !ebayAccessToken) {
      return new Response(
        JSON.stringify({ error: "eBay API credentials not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body: EbaySearchRequest = await req.json();
    const limit = body.limit || 10;

    const searchUrl = new URL("https://svcs.ebay.com/services/search/FindingService/v1");
    searchUrl.searchParams.append("OPERATION-NAME", "findCompletedItems");
    searchUrl.searchParams.append("SERVICE-VERSION", "1.0.0");
    searchUrl.searchParams.append("SECURITY-APPNAME", ebayAppId);
    searchUrl.searchParams.append("RESPONSE-DATA-FORMAT", "JSON");
    searchUrl.searchParams.append("REST-PAYLOAD", "true");
    searchUrl.searchParams.append("keywords", body.keywords);
    searchUrl.searchParams.append("paginationInput.entriesPerPage", String(limit));
    searchUrl.searchParams.append("itemFilter(0).name", "SoldItemsOnly");
    searchUrl.searchParams.append("itemFilter(0).value", "true");

    const ebayResponse = await fetch(searchUrl.toString());

    if (!ebayResponse.ok) {
      const error = await ebayResponse.text();
      console.error("eBay API error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to search eBay listings" }),
        {
          status: ebayResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const ebayData = await ebayResponse.json();

    const listings: EbayListing[] = [];
    const prices: number[] = [];

    if (ebayData.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item) {
      const items = ebayData.findCompletedItemsResponse[0].searchResult[0].item;
      const itemsArray = Array.isArray(items) ? items : [items];

      itemsArray.slice(0, limit).forEach((item: Record<string, unknown>) => {
        try {
          const priceStr = (item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 0).toString();
          const price = parseFloat(priceStr);

          if (!isNaN(price)) {
            prices.push(price);
          }

          listings.push({
            itemId: (item.itemId?.[0] || "").toString(),
            title: (item.title?.[0] || "").toString(),
            currentPrice: priceStr,
            condition: (item.condition?.[0]?.conditionDisplayName?.[0] || "Unknown").toString(),
            sellerInfo: {
              sellerUserName: (item.sellerInfo?.[0]?.sellerUserName?.[0] || "").toString(),
              feedbackRating: parseInt((item.sellerInfo?.[0]?.positiveFeedbackPercent?.[0] || "0").toString()) || 0,
            },
            listingStatus: (item.listingInfo?.[0]?.listingStatus?.[0] || "").toString(),
            endDate: (item.listingInfo?.[0]?.endTime?.[0] || "").toString(),
            itemUrl: (item.viewItemURL?.[0] || "").toString(),
            imageUrl: (item.galleryURL?.[0] || "").toString(),
          });
        } catch (e) {
          console.warn("Error parsing item:", e);
        }
      });
    }

    const averagePrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    const pricingData: EbayPricingData = {
      averagePrice: Math.round(averagePrice * 100) / 100,
      minPrice: Math.round(minPrice * 100) / 100,
      maxPrice: Math.round(maxPrice * 100) / 100,
      listings,
      searchQuery: body.keywords,
    };

    return new Response(JSON.stringify(pricingData), {
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
