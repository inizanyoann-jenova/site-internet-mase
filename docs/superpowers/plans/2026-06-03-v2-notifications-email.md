# Notifications Email — Plan d'implémentation V2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Envoyer des emails automatiques d'alerte aux admins quand des habilitations approchent de l'expiration (30j, 14j, 7j) ou quand des actions PDCA sont en retard — avec une page de configuration des préférences de notification.

**Architecture:** Deux parties — (1) une Supabase Edge Function `daily-notifications` déclenchée chaque matin par pg_cron qui envoie les emails via Resend API, (2) une table `notification_preferences` + composant React de configuration. La clé Resend est stockée dans les secrets Supabase.

**Tech Stack:** React 19 + TypeScript, Supabase Edge Functions (Deno), Supabase pg_cron, Resend API (gratuit jusqu'à 3000 emails/mois), Tailwind CSS, classes `.db-*`

---

### Task 0 : Créer un compte Resend et configurer les secrets

**Files :**
- Aucun fichier créé (configuration externe)

- [ ] **Step 1 : Créer un compte Resend**

1. Aller sur https://resend.com → Sign up (gratuit, 3000 emails/mois)
2. Settings → API Keys → Create API Key → Name: `smi-dashboard` → Full access → Create
3. Copier la clé (commence par `re_...`)

- [ ] **Step 2 : Ajouter le domaine d'envoi dans Resend**

Option A (simple, pour commencer) : utiliser le domaine Resend sandbox `onboarding@resend.dev` — aucune config DNS
Option B (production) : Settings → Domains → Add Domain → suivre les instructions DNS

Pour V2, option A est suffisante.

- [ ] **Step 3 : Stocker la clé API dans les secrets Supabase**

```powershell
npx supabase secrets set RESEND_API_KEY=re_votre_cle_ici
```
Résultat attendu : `Finished supabase secrets set.`

- [ ] **Step 4 : Vérifier que les secrets sont configurés**

```powershell
npx supabase secrets list
```
Résultat attendu : liste incluant `RESEND_API_KEY`

---

### Task 1 : Migration SQL — table notification_preferences

**Files :**
- Create : `supabase/migrations/20260604000008_notifications.sql`

- [ ] **Step 1 : Créer la migration**

```sql
-- supabase/migrations/20260604000008_notifications.sql

create table if not exists notification_preferences (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references companies(id) on delete cascade,
  -- Habilitations expirantes
  notif_habilitations   boolean not null default true,
  hab_jours_avant       int[] not null default '{30,14,7}',
  -- Actions en retard
  notif_actions_retard  boolean not null default true,
  -- Réunions à venir
  notif_reunions        boolean not null default false,
  reunions_jours_avant  int not null default 3,
  -- Destinataires (liste d'emails séparés par virgule)
  emails_destinataires  text not null default '',
  -- Heure d'envoi (format HH:MM, UTC)
  heure_envoi           text not null default '07:00',
  updated_at            timestamptz default now(),
  unique (company_id)
);

alter table notification_preferences enable row level security;

create policy "notif_pref_select" on notification_preferences for select using (company_id = get_user_company_id());
create policy "notif_pref_insert" on notification_preferences for insert with check (company_id = get_user_company_id());
create policy "notif_pref_update" on notification_preferences for update using (company_id = get_user_company_id());

-- Activer pg_cron (extension nécessaire pour la tâche planifiée)
create extension if not exists pg_cron;

-- Tâche cron : appeler l'Edge Function tous les jours à 7h00 UTC
select cron.schedule(
  'daily-notifications',
  '0 7 * * *',
  $$
  select net.http_post(
    url := (select value from vault.decrypted_secrets where name = 'SUPABASE_URL') || '/functions/v1/daily-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select value from vault.decrypted_secrets where name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

**Note :** Si `vault.decrypted_secrets` n'est pas disponible, créer le cron via le dashboard Supabase → Database → Cron Jobs → New cron job.

- [ ] **Step 2 : Appliquer**

```powershell
npx supabase db push
```
Résultat attendu : `Applying migration 20260604000008_notifications.sql... done`

- [ ] **Step 3 : Commit**

```powershell
git add supabase/migrations/20260604000008_notifications.sql
git commit -m "feat(v2): migration SQL notification_preferences + pg_cron"
```

---

### Task 2 : Edge Function daily-notifications

**Files :**
- Create : `supabase/functions/daily-notifications/index.ts`

- [ ] **Step 1 : Créer le dossier et l'Edge Function**

```powershell
New-Item -ItemType Directory -Force "supabase/functions/daily-notifications"
```

- [ ] **Step 2 : Créer `supabase/functions/daily-notifications/index.ts`**

```typescript
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
    const maxJours = Math.max(...prefs.hab_jours_avant);
    const dateLimite = new Date(today);
    dateLimite.setDate(dateLimite.getDate() + maxJours);

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
```

- [ ] **Step 3 : Déployer l'Edge Function**

```powershell
npx supabase functions deploy daily-notifications --no-verify-jwt
```
Résultat attendu : `Deployed Function daily-notifications`

- [ ] **Step 4 : Tester manuellement l'Edge Function**

```powershell
npx supabase functions invoke daily-notifications --no-verify-jwt
```
Résultat attendu : `{"ok":true,"processed":N}`

- [ ] **Step 5 : Commit**

```powershell
git add supabase/functions/daily-notifications/index.ts
git commit -m "feat(v2): Edge Function daily-notifications (habilitations + actions en retard)"
```

---

### Task 3 : Composant NotificationsSettings

**Files :**
- Create : `src/dashboard/NotificationsSettings.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
// src/dashboard/NotificationsSettings.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface NotifPrefs {
  notif_habilitations: boolean;
  hab_jours_avant: number[];
  notif_actions_retard: boolean;
  notif_reunions: boolean;
  reunions_jours_avant: number;
  emails_destinataires: string;
  heure_envoi: string;
}

const DEFAULT: NotifPrefs = {
  notif_habilitations: true,
  hab_jours_avant: [30, 14, 7],
  notif_actions_retard: true,
  notif_reunions: false,
  reunions_jours_avant: 3,
  emails_destinataires: '',
  heure_envoi: '07:00',
};

interface Props { companyId: string; isAdmin: boolean }

export default function NotificationsSettings({ companyId, isAdmin }: Props) {
  const [prefs, setPrefs] = useState<NotifPrefs>({ ...DEFAULT });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [prefId, setPrefId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('notification_preferences')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrefId(data.id);
          setPrefs({
            notif_habilitations: data.notif_habilitations,
            hab_jours_avant: data.hab_jours_avant ?? [30, 14, 7],
            notif_actions_retard: data.notif_actions_retard,
            notif_reunions: data.notif_reunions,
            reunions_jours_avant: data.reunions_jours_avant,
            emails_destinataires: data.emails_destinataires,
            heure_envoi: data.heure_envoi,
          });
        }
        setLoaded(true);
      });
  }, [companyId]);

  function toggleJour(j: number) {
    setPrefs(p => ({
      ...p,
      hab_jours_avant: p.hab_jours_avant.includes(j)
        ? p.hab_jours_avant.filter(d => d !== j)
        : [...p.hab_jours_avant, j].sort((a, b) => b - a),
    }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const payload = { ...prefs, company_id: companyId, updated_at: new Date().toISOString() };
    const { error } = prefId
      ? await supabase.from('notification_preferences').update(payload).eq('id', prefId)
      : await supabase.from('notification_preferences').insert(payload).select().single().then(async r => {
          if (r.data) setPrefId(r.data.id);
          return r;
        });
    setSaving(false);
    if (error) setMsg({ type: 'err', text: `Erreur : ${error.message}` });
    else setMsg({ type: 'ok', text: 'Préférences enregistrées. Les alertes seront envoyées chaque matin.' });
  }

  if (!loaded) return <div className="p-6 text-gray-500">Chargement…</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="db-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifications email</h1>
          <p className="text-sm text-gray-500">Alertes automatiques envoyées chaque matin</p>
        </div>
      </div>

      {msg && <div className={msg.type === 'ok' ? 'db-alert-green' : 'db-alert-red'}>{msg.text}</div>}

      <div className="db-panel space-y-6">
        {/* Destinataires */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Adresses email destinataires</label>
          <input
            className="db-input"
            value={prefs.emails_destinataires}
            onChange={e => setPrefs(p => ({ ...p, emails_destinataires: e.target.value }))}
            placeholder="admin@entreprise.fr, qhse@entreprise.fr"
            disabled={!isAdmin}
          />
          <p className="mt-1 text-xs text-gray-400">Séparer plusieurs adresses par des virgules</p>
        </div>

        {/* Habilitations */}
        <div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="hab" checked={prefs.notif_habilitations} onChange={e => setPrefs(p => ({ ...p, notif_habilitations: e.target.checked }))} disabled={!isAdmin} />
            <label htmlFor="hab" className="text-sm font-medium text-gray-700">Alertes habilitations expirantes</label>
          </div>
          {prefs.notif_habilitations && (
            <div className="mt-2 ml-6">
              <p className="mb-2 text-xs text-gray-500">Envoyer un email X jours avant l'expiration :</p>
              <div className="flex gap-2">
                {[60, 30, 14, 7, 3].map(j => (
                  <button
                    key={j}
                    onClick={() => isAdmin && toggleJour(j)}
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${prefs.hab_jours_avant.includes(j) ? 'bg-mase-green text-white' : 'bg-gray-100 text-gray-600'} ${!isAdmin ? 'cursor-default opacity-60' : 'hover:bg-mase-green/80 hover:text-white'}`}
                  >
                    {j}j
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions en retard */}
        <div className="flex items-center gap-3">
          <input type="checkbox" id="actions" checked={prefs.notif_actions_retard} onChange={e => setPrefs(p => ({ ...p, notif_actions_retard: e.target.checked }))} disabled={!isAdmin} />
          <label htmlFor="actions" className="text-sm font-medium text-gray-700">Alertes actions PDCA en retard</label>
        </div>

        {/* Réunions */}
        <div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="reunions" checked={prefs.notif_reunions} onChange={e => setPrefs(p => ({ ...p, notif_reunions: e.target.checked }))} disabled={!isAdmin} />
            <label htmlFor="reunions" className="text-sm font-medium text-gray-700">Rappel réunions QHSE à venir</label>
          </div>
          {prefs.notif_reunions && (
            <div className="mt-2 ml-6 flex items-center gap-2">
              <input
                type="number" min={1} max={14} className="db-input w-20"
                value={prefs.reunions_jours_avant}
                onChange={e => setPrefs(p => ({ ...p, reunions_jours_avant: Number(e.target.value) }))}
                disabled={!isAdmin}
              />
              <span className="text-sm text-gray-600">jours avant</span>
            </div>
          )}
        </div>

        {isAdmin && (
          <button className="db-btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer les préférences'}
          </button>
        )}

        {!isAdmin && (
          <p className="text-sm text-gray-500">Seul l'admin peut modifier ces paramètres.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Commit**

```powershell
git add src/dashboard/NotificationsSettings.tsx
git commit -m "feat(v2): composant NotificationsSettings"
```

---

### Task 4 : Page wrapper + routing + sidebar

**Files :**
- Create : `src/pages/DashboardNotificationsPage.tsx`
- Modify : `src/main.tsx`
- Modify : `src/components/dashboard/DashboardSidebar.tsx`

- [ ] **Step 1 : Créer la page wrapper**

```tsx
// src/pages/DashboardNotificationsPage.tsx
import type { Session } from '@supabase/supabase-js';
import DashboardGuard from '../components/dashboard/DashboardGuard';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import NotificationsSettings from '../dashboard/NotificationsSettings';
import { useCompany } from '../hooks/useCompany';

interface Props { session: Session | null }

function NotifContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  return (
    <DashboardLayout company={company} membership={membership}>
      <NotificationsSettings companyId={company.id} isAdmin={membership?.role === 'admin'} />
    </DashboardLayout>
  );
}

export default function DashboardNotificationsPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <NotifContent session={session} />
    </DashboardGuard>
  );
}
```

- [ ] **Step 2 : Ajouter dans `src/main.tsx`**

Ajouter l'import :
```tsx
import DashboardNotificationsPage from './pages/DashboardNotificationsPage';
```

Ajouter la route :
```tsx
<Route path="/dashboard/notifications" element={<DashboardNotificationsPage session={session} />} />
```

- [ ] **Step 3 : Ajouter dans `src/components/dashboard/DashboardSidebar.tsx`**

Dans le groupe `Direction`, ajouter après "Export Excel/PDF" :
```tsx
{ path: '/dashboard/notifications', label: 'Notifications', icon: '🔔' },
```

- [ ] **Step 4 : Vérifier la compilation**

```powershell
npx tsc --noEmit
```
Résultat attendu : aucune erreur

- [ ] **Step 5 : Commit final**

```powershell
git add src/pages/DashboardNotificationsPage.tsx src/main.tsx src/components/dashboard/DashboardSidebar.tsx
git commit -m "feat(v2): route /dashboard/notifications + sidebar"
```
