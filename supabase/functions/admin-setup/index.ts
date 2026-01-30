import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, email } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "setup-admin") {
      // Get user by email
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        throw new Error(`Failed to list users: ${listError.message}`);
      }

      const user = users.users.find((u) => u.email === email);
      
      if (!user) {
        return new Response(
          JSON.stringify({ error: "User not found. Please sign up first." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if admin role already exists
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (existingRole) {
        return new Response(
          JSON.stringify({ message: "Admin role already exists", user_id: user.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Insert admin role
      const { error: insertError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: user.id, role: "admin" });

      if (insertError) {
        throw new Error(`Failed to insert admin role: ${insertError.message}`);
      }

      return new Response(
        JSON.stringify({ message: "Admin role assigned successfully", user_id: user.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
