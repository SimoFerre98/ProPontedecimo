import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/resend.ts";
import { baseLayout } from "../_shared/templates.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Verify user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user role from profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedRoles = ["president", "director", "coach"];
    if (!allowedRoles.includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Forbidden: insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { to, subject, html, groupTarget } = body;

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, subject, html" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipients = Array.isArray(to) ? to : [to];
    
    // Non inviare se non ci sono destinatari validi
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0, message: "Nessun destinatario" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Wrap the raw HTML into the branded base layout
    const brandedHtml = baseLayout(subject, html);

    // Send email via Resend
    await sendEmail({
      to: recipients,
      subject,
      html: brandedHtml,
    });

    // Log the usage
    const { error: usageError } = await supabaseClient
      .from("email_usage")
      .insert({
        sent_by: user.id,
        recipient_count: recipients.length,
        target_group: groupTarget || "single",
        subject: subject
      });

    if (usageError) {
      console.error("Failed to log email usage:", usageError);
      // We don't fail the request if just the logging fails
    }

    return new Response(JSON.stringify({ success: true, count: recipients.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-email error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
