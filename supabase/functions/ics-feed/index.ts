import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { generateIcs } from "../_shared/ics.ts";

serve(async (req) => {
  // Gestione preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Questo endpoint deve supportare solo richieste GET
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { 
      status: 405, 
      headers: { ...corsHeaders, "Allow": "GET" } 
    });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response("Not Found", { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Validazione formato UUID del token
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return new Response("Not Found", { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Usiamo la service role key per bypassare le RLS ed effettuare la query
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseServiceKey) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
      return new Response("Internal Server Error", { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Risoluzione del profilo tramite token
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("ics_token", token)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile by token:", profileError);
      return new Response("Internal Server Error", { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Se il token non corrisponde a nessun utente, ritorniamo 404 per sicurezza (token non valido/rigenerato)
    if (!profile) {
      return new Response("Not Found", { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Recupera tutti gli eventi societari ordinati per start_date
    const { data: events, error: eventsError } = await supabaseClient
      .from("events")
      .select("*")
      .order("start_date", { ascending: true });

    if (eventsError) {
      console.error("Error fetching events:", eventsError);
      return new Response("Internal Server Error", { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Generazione del feed iCal
    const icsContent = generateIcs(events || []);

    return new Response(icsContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="feed.ics"',
        // Evitiamo che i client memorizzino la risposta in cache per garantire il refresh del calendario
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });

  } catch (error) {
    console.error("Error in ics-feed:", error);
    return new Response("Internal Server Error", { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
