import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting helpers
interface RateLimitCheck {
  allowed: boolean;
  remaining?: number;
}

// deno-lint-ignore no-explicit-any
async function checkRateLimit(
  supabase: any,
  identifier: string,
  action: string,
  maxRequests: number = 10,
  windowMinutes: number = 60
): Promise<RateLimitCheck> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from("rate_limits")
    .select("id")
    .eq("identifier", identifier)
    .eq("action", action)
    .gte("timestamp", windowStart);
  
  if (error) {
    console.error("Rate limit check error:", error);
    return { allowed: true }; // Fail open to avoid breaking service
  }
  
  const count = data?.length || 0;
  return {
    allowed: count < maxRequests,
    remaining: Math.max(0, maxRequests - count - 1)
  };
}

// deno-lint-ignore no-explicit-any
async function recordRateLimit(supabase: any, identifier: string, action: string) {
  await supabase
    .from("rate_limits")
    .insert({ identifier, action });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP for rate limiting
    const identifier = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
                      req.headers.get("x-real-ip") || 
                      "unknown";

    // Check rate limit (10 uploads per hour)
    const rateLimitCheck = await checkRateLimit(supabaseAdmin, identifier, "upload_resume", 10, 60);
    
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded. You can upload 10 resumes per hour. Please try again later." 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": "0",
            "Retry-After": "3600"
          } 
        }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return new Response(
        JSON.stringify({ error: "Only PDF files are allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File size must be under 10MB" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file name
    const originalName = file.name;
    if (!originalName || originalName.length > 500) {
      return new Response(
        JSON.stringify({ error: "Invalid file name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate secure file name
    const fileName = `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    // Upload to storage using service role
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from("resumes")
      .upload(fileName, fileBuffer, {
        contentType: "application/pdf",
        upsert: false
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate signed URL (24 hours) using service role
    const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
      .from("resumes")
      .createSignedUrl(fileName, 86400);

    if (urlError || !signedUrlData) {
      console.error("Signed URL error:", urlError);
      return new Response(
        JSON.stringify({ error: "Failed to generate access URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record rate limit
    await recordRateLimit(supabaseAdmin, identifier, "upload_resume");

    // Return the file name and signed URL for use in analysis
    return new Response(
      JSON.stringify({ 
        fileName,
        originalName,
        signedUrl: signedUrlData.signedUrl
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in upload-resume function:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your upload" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
