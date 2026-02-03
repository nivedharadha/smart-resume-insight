import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { recordId, accessToken } = await req.json();

    // Validate inputs
    if (!recordId || !accessToken) {
      return new Response(
        JSON.stringify({ error: "Record ID and access token are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate record ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(recordId)) {
      return new Response(
        JSON.stringify({ error: "Invalid record ID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate access token format (64 hex characters)
    const hexRegex = /^[0-9a-f]{64}$/i;
    if (!hexRegex.test(accessToken)) {
      return new Response(
        JSON.stringify({ error: "Invalid access token format" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the access token matches the record and hasn't expired
    const { data: record, error: recordError } = await supabaseAdmin
      .from("analysis_records")
      .select("resume_file_name, access_token, expires_at")
      .eq("id", recordId)
      .single();

    if (recordError || !record) {
      return new Response(
        JSON.stringify({ error: "Record not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify token matches
    if (record.access_token !== accessToken) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify not expired
    if (record.expires_at && new Date(record.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Access link has expired" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a short-lived signed URL (1 hour instead of 24 hours for viewing)
    const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
      .from("resumes")
      .createSignedUrl(record.resume_file_name, 3600); // 1 hour

    if (urlError || !signedUrlData) {
      console.error("Signed URL error:", urlError);
      return new Response(
        JSON.stringify({ error: "Failed to generate resume URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ signedUrl: signedUrlData.signedUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-resume-url function:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
