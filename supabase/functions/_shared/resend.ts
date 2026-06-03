// supabase/functions/_shared/resend.ts
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    console.warn('[resend] RESEND_API_KEY manquant — email non envoyé');
    return;
  }
  const from = Deno.env.get('RESEND_FROM') ?? 'MASE Dashboard <onboarding@resend.dev>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}
