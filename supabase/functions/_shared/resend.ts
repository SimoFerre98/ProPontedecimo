const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Pro Pontedecimo <onboarding@resend.dev>';

export interface SendEmailOptions {
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail(options: SendEmailOptions) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY non configurata. Esegui: supabase secrets set RESEND_API_KEY=...');
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: options.from || RESEND_FROM_EMAIL,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Resend API error:', data);
    throw new Error(data.message || 'Errore durante l\'invio dell\'email con Resend');
  }

  return data;
}
