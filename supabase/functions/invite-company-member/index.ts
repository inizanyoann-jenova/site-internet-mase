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

  // Envoyer l'email via Supabase Auth invite (ou SMTP si configuré)
  const appUrl = Deno.env.get('APP_URL')!;
  const inviteUrl = `${appUrl}/dashboard/rejoindre?token=${invitationToken}`;

  // Utiliser le système d'email de Supabase Auth
  const { error: emailErr } = await supabase.auth.admin.inviteUserByEmail(body.email, {
    data: { invite_url: inviteUrl },
    redirectTo: inviteUrl,
  });

  if (emailErr) {
    console.error('Email invitation error:', emailErr.message);
    // Ne pas bloquer : le token est créé, l'admin peut partager le lien manuellement
  }

  return new Response(JSON.stringify({ success: true, invite_url: inviteUrl }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
