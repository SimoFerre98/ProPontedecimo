import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/resend.ts";
import { medicalReminderTemplate } from "../_shared/templates.ts";

// Utility per calcolare la differenza in giorni
function getDaysLeft(expiryDateStr: string): number {
  const expiryDate = new Date(expiryDateStr);
  const today = new Date();
  
  // Resetta l'ora per calcolare solo la differenza in giorni interi
  expiryDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffTime = expiryDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // In un caso d'uso reale cron, useremmo il service_role key
    // Poiché può essere invocata manualmente, supportiamo l'auth header
    const authHeader = req.headers.get("Authorization");
    const supabaseKey = authHeader ? authHeader.replace("Bearer ", "") : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseKey) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      supabaseKey,
      {
        global: {
          headers: authHeader ? { Authorization: authHeader } : undefined,
        },
      }
    );

    let body: any = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        // Body vuoto o non valido è OK per cron
      }
    }

    // Parametro N giorni, default 15
    const daysWarning = body.daysWarning ?? 15;

    // Seleziona atleti con scadenza medica non nulla, attivi e con email
    const { data: players, error: playersError } = await supabaseClient
      .from("players")
      .select("id, first_name, last_name, email, medical_expiry")
      .eq("is_active", true)
      .not("email", "is", null)
      .not("medical_expiry", "is", null);

    if (playersError) {
      throw playersError;
    }

    const results = [];
    const errors = [];
    let sentCount = 0;

    for (const player of players || []) {
      if (!player.medical_expiry || !player.email) continue;

      const daysLeft = getDaysLeft(player.medical_expiry);

      // Invia promemoria se mancano esattamente 'daysWarning' giorni, oppure 0 giorni
      if (daysLeft === daysWarning || daysLeft === 0) {
        try {
          const playerName = `${player.first_name} ${player.last_name}`;
          const html = medicalReminderTemplate({
            playerName,
            expiryDate: formatDate(player.medical_expiry),
            daysLeft,
          });

          await sendEmail({
            to: player.email,
            subject: `Promemoria Visita Medica Sportiva - ${playerName}`,
            html: html,
          });

          results.push({ player: playerName, email: player.email, status: "sent" });
          sentCount++;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Unknown error";
          console.error(`Error sending email to ${player.email}:`, errMsg);
          errors.push({ player: player.id, error: errMsg });
        }
      }
    }

    // Registra in email_usage se abbiamo inviato qualcosa
    if (sentCount > 0) {
      let sentBy = null;
      if (authHeader) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        sentBy = user?.id;
      }

      await supabaseClient.from("email_usage").insert({
        sent_by: sentBy,
        recipient_count: sentCount,
        target_group: "medical-reminders",
        subject: "Promemoria Visita Medica Batch"
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: results.length, 
      sent: sentCount, 
      errors 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("medical-reminders error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
