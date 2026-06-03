// supabase/functions/invite-company-member/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/resend.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildInvitationEmail(companyName: string, role: string, inviteUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f5f5f3;margin:0;padding:24px;">
<div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <div style="text-align:center;margin-bottom:24px;">
    <span style="font-size:24px;font-weight:800;color:#1B4F8A;">MASE Dashboard</span>
  </div>
  <h1 style="font-size:20px;color:#1a1a1a;margin:0 0 12px;">Vous avez été invité à rejoindre une équipe</h1>
  <p style="color:#64748b;font-size:15px;line-height:1.6;">
    Vous avez été invité à rejoindre l'équipe <strong style="color:#1a1a1a;">${companyName}</strong>
    en tant que <strong style="color:#1a1a1a;">${role.replace(/_/g, ' ')}</strong>.
  </p>
  <div style="text-align:center;margin:32px 0;">
    <a href="${inviteUrl}"
       style="background:#1B4F8A;color:white;padding:14px 28px;border-radius:50px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
      Rejoindre l'équipe
    </a>
  </div>
  <p style="color:#94a3b8;font-size:13px;text-align:center;margin-top:24px;">
    Ce lien est à usage unique. S'il ne fonctionne pas, demandez une nouvelle invitation à votre administrateur.
  </p>
</div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { company_id: string; email: string; role: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON invalide' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const VALID_ROLES = ['admin', 'responsable_qhse', 'direction', 'lecteur', 'operateur'];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!body.company_id || !body.email || !body.role) {
    return new Response(JSON.stringify({ error: 'Champs manquants: company_id, email, role requis' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!emailRegex.test(body.email.trim())) {
    return new Response(JSON.stringify({ error: 'Adresse email invalide' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!VALID_ROLES.includes(body.role)) {
    return new Response(JSON.stringify({ error: `Rôle invalide. Valeurs acceptées: ${VALID_ROLES.join(', ')}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  body.email = body.email.trim();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Token invalide' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: membership } = await supabase
    .from('company_members')
    .select('role')
    .eq('company_id', body.company_id)
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .not('accepted_at', 'is', null)
    .maybeSingle();

  if (!membership) {
    return new Response(JSON.stringify({ error: 'Accès refusé — admin requis' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Récupérer le nom de la company pour l'email
  const { data: companyData } = await supabase
    .from('companies')
    .select('name')
    .eq('id', body.company_id)
    .maybeSingle();
  const companyName = companyData?.name ?? 'votre équipe';

  const appUrl = Deno.env.get('APP_URL')!;

  const { data: existingInvite } = await supabase
    .from('company_members')
    .select('id, invitation_token')
    .eq('company_id', body.company_id)
    .eq('email', body.email)
    .is('accepted_at', null)
    .maybeSingle();

  if (existingInvite) {
    const existingUrl = `${appUrl}/dashboard/rejoindre?token=${existingInvite.invitation_token}`;
    try {
      await sendEmail(
        body.email,
        `Vous avez été invité à rejoindre ${companyName} sur MASE Dashboard`,
        buildInvitationEmail(companyName, body.role, existingUrl),
      );
    } catch (e) {
      console.error('[invite] Erreur envoi email (invitation existante):', e);
    }
    return new Response(JSON.stringify({ success: true, invite_url: existingUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const invitationToken = crypto.randomUUID();

  const { error: insertErr } = await supabase.from('company_members').insert({
    company_id: body.company_id,
    email: body.email,
    role: body.role,
    invitation_token: invitationToken,
  });

  if (insertErr) {
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const inviteUrl = `${appUrl}/dashboard/rejoindre?token=${invitationToken}`;

  try {
    await sendEmail(
      body.email,
      `Vous avez été invité à rejoindre ${companyName} sur MASE Dashboard`,
      buildInvitationEmail(companyName, body.role, inviteUrl),
    );
  } catch (e) {
    console.error('[invite] Erreur envoi email:', e);
  }

  return new Response(JSON.stringify({ success: true, invite_url: inviteUrl }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
