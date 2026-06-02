// supabase/functions/invite-company-member/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  // Vérifier que l'appelant est admin de la company
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

  // Générer un token d'invitation unique
  const invitationToken = crypto.randomUUID();

  // Check for existing pending invitation for this email in this company
  const { data: existingInvite } = await supabase
    .from('company_members')
    .select('id, invitation_token')
    .eq('company_id', body.company_id)
    .eq('email', body.email)
    .is('accepted_at', null)
    .maybeSingle();

  if (existingInvite) {
    // Return the existing invite URL instead of creating a duplicate
    const appUrl = Deno.env.get('APP_URL')!;
    const existingUrl = `${appUrl}/dashboard/rejoindre?token=${existingInvite.invitation_token}`;
    return new Response(JSON.stringify({ success: true, invite_url: existingUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

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

  const appUrl = Deno.env.get('APP_URL')!;
  const inviteUrl = `${appUrl}/dashboard/rejoindre?token=${invitationToken}`;

  return new Response(JSON.stringify({ success: true, invite_url: inviteUrl }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
