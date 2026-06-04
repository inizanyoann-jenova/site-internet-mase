// supabase/functions/daily-notifications/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FROM_EMAIL = 'SMI Dashboard <noreply@resend.dev>';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendEmail(to: string[], subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Resend error: ${err}`);
  }
}

async function processCompany(companyId: string, companyName: string, prefs: {
  notif_habilitations: boolean;
  hab_jours_avant: number[];
  notif_actions_retard: boolean;
  emails_destinataires: string;
}) {
  const emails = prefs.emails_destinataires.split(',').map(e => e.trim()).filter(Boolean);
  if (emails.length === 0) return;

  const today = new Date();
  const alertLines: string[] = [];

  // ── Habilitations expirantes ──────────────────────────────────────────────
  if (prefs.notif_habilitations && prefs.hab_jours_avant.length > 0) {
    const { data: habs } = await supabase
      .from('habilitations')
      .select('employe, domaine, validite_ans, created_at')
      .eq('company_id', companyId)
      .is('archived_at', null);

    for (const hab of habs ?? []) {
      if (!hab.validite_ans) continue;
      const expiration = new Date(hab.created_at);
      expiration.setFullYear(expiration.getFullYear() + hab.validite_ans);
      const joursRestants = Math.floor((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (prefs.hab_jours_avant.includes(joursRestants)) {
        alertLines.push(
          `<li>⚠️ <strong>${hab.employe}</strong> — ${hab.domaine} : expire dans <strong>${joursRestants} jour(s)</strong> (${expiration.toLocaleDateString('fr-FR')})</li>`
        );
      }
    }
  }

  // ── Actions en retard ─────────────────────────────────────────────────────
  if (prefs.notif_actions_retard) {
    const todayStr = today.toISOString().slice(0, 10);
    const { data: actions } = await supabase
      .from('actions')
      .select('action, pilote, echeance, statut')
      .eq('company_id', companyId)
      .lt('echeance', todayStr)
      .not('statut', 'in', '("Clôturée","Abandonnée")');

    for (const a of actions ?? []) {
      alertLines.push(
        `<li>🔴 <strong>${a.action?.slice(0, 60)}</strong> — Pilote : ${a.pilote ?? '—'} — Échéance dépassée : ${new Date(a.echeance).toLocaleDateString('fr-FR')}</li>`
      );
    }
  }

  if (alertLines.length === 0) return;

  const html = `
    <h2 style="color:#1a5276">SMI Dashboard — Alertes QHSE</h2>
    <p>Bonjour,</p>
    <p>Voici les alertes du jour pour <strong>${companyName}</strong> :</p>
    <ul style="line-height:2">${alertLines.join('')}</ul>
    <p style="color:#888;font-size:12px">Cet email est envoyé automatiquement par votre SMI Dashboard.<br>Pour modifier ces notifications, rendez-vous dans Dashboard → Notifications.</p>
  `;

  await sendEmail(
    emails,
    `[SMI Dashboard] ${alertLines.length} alerte(s) QHSE — ${companyName}`,
    html
  );
}

Deno.serve(async () => {
  try {
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('company_id, notif_habilitations, hab_jours_avant, notif_actions_retard, emails_destinataires')
      .neq('emails_destinataires', '');

    for (const pref of prefs ?? []) {
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', pref.company_id)
        .single();

      if (company) {
        await processCompany(pref.company_id, company.name, pref);
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: prefs?.length ?? 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
});
