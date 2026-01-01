import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface FacebookPostRequest {
  pageId: string;
  message: string;
  link?: string;
  picture?: string;
  caption?: string;
  description?: string;
  privacy?: {
    value: 'EVERYONE' | 'FRIENDS' | 'SELF';
  };
}

interface FacebookPostResponse {
  id: string;
  post_id: string;
  success: boolean;
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
    const body: FacebookPostRequest = await req.json();

    // Get user's Facebook API credentials from the database
    const { data: aiConfig, error: configError } = await supabase
      .from('ai_provider_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider_name', 'facebook')
      .single();

    if (configError || !aiConfig) {
      return new Response(
        JSON.stringify({ error: "Facebook API credentials not configured" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Construct the request body for Facebook's Graph API
    const facebookRequestBody = {
      message: body.message,
      link: body.link,
      picture: body.picture,
      caption: body.caption,
      description: body.description,
      privacy: body.privacy
    };

    // Make the API call to Facebook
    const facebookResponse = await fetch(
      `https://graph.facebook.com/v18.0/${body.pageId}/feed`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${aiConfig.api_key_encrypted}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(facebookRequestBody),
      }
    );

    if (!facebookResponse.ok) {
      const errorText = await facebookResponse.text();
      console.error("Facebook API error:", errorText);
      return new Response(
        JSON.stringify({ error: `Facebook API error: ${errorText}` }),
        {
          status: facebookResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const facebookData = await facebookResponse.json();

    // Save the post to the database
    const { data: post, error: insertError } = await supabase
      .from('facebook_posts')
      .insert({
        user_id: user.id,
        page_id: body.pageId,
        message: body.message,
        image_url: body.picture,
        status: 'published',
        post_url: `https://www.facebook.com/${body.pageId}/posts/${facebookData.id}`
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save post to database" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const response: FacebookPostResponse = {
      id: facebookData.id,
      post_id: `${body.pageId}_post_${Math.random().toString(36).substr(2, 9)}`,
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