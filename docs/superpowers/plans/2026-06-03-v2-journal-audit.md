# Journal d'Audit — Plan d'implémentation V2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un journal d'audit qui trace automatiquement toutes les modifications (INSERT/UPDATE/DELETE) sur les tables du dashboard, consultable par les admins en lecture seule.

**Architecture:** Table `audit_log` alimentée par des triggers PostgreSQL sur chaque table métier. Le composant React est 100% lecture : filtre par module/date/action, pagination côté serveur. Aucune écriture possible depuis l'UI.

**Tech Stack:** React 19 + TypeScript, Supabase PostgreSQL (triggers + `audit_log`), Tailwind CSS, classes `.db-*`

---

### Task 0 : Migration SQL — table audit_log + triggers

**Files :**
- Create : `supabase/migrations/20260604000002_journal_audit.sql`

- [ ] **Step 1 : Créer la migration**

```sql
-- supabase/migrations/20260604000002_journal_audit.sql

-- Table journal d'audit
create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  table_name  text not null,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  record_id   uuid,
  user_id     uuid references auth.users,
  user_email  text,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz default now()
);

create index on audit_log (company_id, created_at desc);
create index on audit_log (company_id, table_name);

alter table audit_log enable row level security;

create policy "audit_log_select"
  on audit_log for select
  using (company_id = get_user_company_id());

-- Fonction générique de trigger d'audit
create or replace function fn_audit_log()
returns trigger
language plpgsql
security definer
as $$
declare
  v_company_id uuid;
  v_record_id  uuid;
  v_old        jsonb;
  v_new        jsonb;
  v_user_email text;
begin
  if TG_OP = 'DELETE' then
    v_company_id := OLD.company_id;
    v_record_id  := OLD.id;
    v_old        := to_jsonb(OLD);
    v_new        := null;
  elsif TG_OP = 'INSERT' then
    v_company_id := NEW.company_id;
    v_record_id  := NEW.id;
    v_old        := null;
    v_new        := to_jsonb(NEW);
  else -- UPDATE
    v_company_id := NEW.company_id;
    v_record_id  := NEW.id;
    v_old        := to_jsonb(OLD);
    v_new        := to_jsonb(NEW);
  end if;

  select email into v_user_email
  from auth.users
  where id = auth.uid();

  insert into audit_log (company_id, table_name, action, record_id, user_id, user_email, old_data, new_data)
  values (v_company_id, TG_TABLE_NAME, TG_OP, v_record_id, auth.uid(), v_user_email, v_old, v_new);

  return null;
end;
$$;

-- Triggers sur toutes les tables métier
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'risques','actions','accidents','habilitations','kpi_objectifs',
    'objectifs_qhse','reunions_qhse','qualite_audits','qualite_nc',
    'rh_employes','rh_formations'
  ] loop
    execute format(
      'create trigger audit_%I
       after insert or update or delete on %I
       for each row execute function fn_audit_log();',
      tbl, tbl
    );
  end loop;
end;
$$;
```

- [ ] **Step 2 : Appliquer la migration**

```powershell
npx supabase db push
```
Résultat attendu : `Applying migration 20260604000002_journal_audit.sql... done`

- [ ] **Step 3 : Commit**

```powershell
git add supabase/migrations/20260604000002_journal_audit.sql
git commit -m "feat(v2): migration SQL journal d'audit (table + triggers)"
```

---

### Task 1 : Composant JournalAudit

**Files :**
- Create : `src/dashboard/JournalAudit.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
// src/dashboard/JournalAudit.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface AuditEntry {
  id: string;
  table_name: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string | null;
  user_email: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

const TABLE_LABELS: Record<string, string> = {
  risques: 'DUERP',
  actions: "Plan d'actions",
  accidents: 'Accidents',
  habilitations: 'Habilitations',
  kpi_objectifs: 'KPIs',
  objectifs_qhse: 'Objectifs QHSE',
  reunions_qhse: 'Réunions',
  qualite_audits: 'Audits',
  qualite_nc: 'Non-conformités',
  rh_employes: 'Employés',
  rh_formations: 'Formations',
};

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
};

const PAGE_SIZE = 50;

interface Props {
  companyId: string;
}

export default function JournalAudit({ companyId }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filterTable, setFilterTable] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (filterTable) q = q.eq('table_name', filterTable);
    if (filterAction) q = q.eq('action', filterAction);
    const { data, count } = await q;
    setEntries((data ?? []) as AuditEntry[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [companyId, page, filterTable, filterAction]);

  useEffect(() => { load(); }, [load]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function getSummary(entry: AuditEntry): string {
    const data = entry.new_data ?? entry.old_data;
    if (!data) return '';
    const candidates = ['danger', 'action', 'employe', 'titre', 'nom', 'name'];
    for (const k of candidates) {
      if (data[k]) return String(data[k]).slice(0, 60);
    }
    return entry.record_id?.slice(0, 8) ?? '';
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4 p-6">
      <div className="db-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Journal d'audit</h1>
          <p className="text-sm text-gray-500">Traçabilité de toutes les modifications — lecture seule</p>
        </div>
        <div className="db-kpi">
          <div className="text-2xl font-bold text-gray-900">{total}</div>
          <div className="text-xs text-gray-500">entrées</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <select
          className="db-input w-auto"
          value={filterTable}
          onChange={e => { setFilterTable(e.target.value); setPage(0); }}
        >
          <option value="">Tous les modules</option>
          {Object.entries(TABLE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          className="db-input w-auto"
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value); setPage(0); }}
        >
          <option value="">Toutes les actions</option>
          <option value="INSERT">Création</option>
          <option value="UPDATE">Modification</option>
          <option value="DELETE">Suppression</option>
        </select>
      </div>

      {/* Table */}
      <div className="db-panel overflow-x-auto p-0">
        {loading ? (
          <div className="p-6 text-center text-gray-400">Chargement…</div>
        ) : entries.length === 0 ? (
          <div className="p-6 text-center text-gray-400">Aucune entrée pour ces filtres.</div>
        ) : (
          <table className="db-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Module</th>
                <th>Action</th>
                <th>Résumé</th>
                <th>Utilisateur</th>
                <th>Détail</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <>
                  <tr key={e.id}>
                    <td className="whitespace-nowrap text-xs text-gray-500">{formatDate(e.created_at)}</td>
                    <td className="text-sm">{TABLE_LABELS[e.table_name] ?? e.table_name}</td>
                    <td>
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[e.action]}`}>
                        {e.action === 'INSERT' ? 'Création' : e.action === 'UPDATE' ? 'Modification' : 'Suppression'}
                      </span>
                    </td>
                    <td className="max-w-xs truncate text-sm text-gray-700">{getSummary(e)}</td>
                    <td className="text-xs text-gray-500">{e.user_email ?? '—'}</td>
                    <td>
                      <button
                        className="text-xs text-blue-600 hover:underline"
                        onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                      >
                        {expanded === e.id ? 'Masquer' : 'Voir'}
                      </button>
                    </td>
                  </tr>
                  {expanded === e.id && (
                    <tr key={`${e.id}-detail`}>
                      <td colSpan={6} className="bg-gray-50 p-3">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          {e.old_data && (
                            <div>
                              <div className="mb-1 font-semibold text-gray-500">Avant</div>
                              <pre className="overflow-auto rounded bg-white p-2 text-gray-600">
                                {JSON.stringify(e.old_data, null, 2)}
                              </pre>
                            </div>
                          )}
                          {e.new_data && (
                            <div>
                              <div className="mb-1 font-semibold text-gray-500">Après</div>
                              <pre className="overflow-auto rounded bg-white p-2 text-gray-600">
                                {JSON.stringify(e.new_data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Page {page + 1} / {totalPages}</span>
          <div className="flex gap-2">
            <button className="db-btn-secondary" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
              ← Précédent
            </button>
            <button className="db-btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
              Suivant →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2 : Commit**

```powershell
git add src/dashboard/JournalAudit.tsx
git commit -m "feat(v2): composant JournalAudit (lecture seule, filtres, pagination)"
```

---

### Task 2 : Page wrapper + routing + sidebar

**Files :**
- Create : `src/pages/DashboardJournalAuditPage.tsx`
- Modify : `src/main.tsx`
- Modify : `src/components/dashboard/DashboardSidebar.tsx`

- [ ] **Step 1 : Créer la page wrapper**

```tsx
// src/pages/DashboardJournalAuditPage.tsx
import type { Session } from '@supabase/supabase-js';
import DashboardGuard from '../components/dashboard/DashboardGuard';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import JournalAudit from '../dashboard/JournalAudit';
import { useCompany } from '../hooks/useCompany';

interface Props { session: Session | null }

function JournalContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  return (
    <DashboardLayout company={company} membership={membership}>
      <JournalAudit companyId={company.id} />
    </DashboardLayout>
  );
}

export default function DashboardJournalAuditPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <JournalContent session={session} />
    </DashboardGuard>
  );
}
```

- [ ] **Step 2 : Ajouter dans `src/main.tsx`**

Après `import DashboardParametresPage from './pages/DashboardParametresPage';`, ajouter :
```tsx
import DashboardJournalAuditPage from './pages/DashboardJournalAuditPage';
```

Après `<Route path="/dashboard/parametres" ... />`, ajouter :
```tsx
<Route path="/dashboard/journal-audit" element={<DashboardJournalAuditPage session={session} />} />
```

- [ ] **Step 3 : Ajouter dans `src/components/dashboard/DashboardSidebar.tsx`**

Dans `SIDEBAR_GROUPS`, dans le groupe `Direction`, ajouter après l'item Export :
```tsx
{ path: '/dashboard/journal-audit', label: "Journal d'audit", icon: '🗒️' },
```

- [ ] **Step 4 : Vérifier la compilation**

```powershell
npx tsc --noEmit
```
Résultat attendu : aucune erreur

- [ ] **Step 5 : Commit final**

```powershell
git add src/pages/DashboardJournalAuditPage.tsx src/main.tsx src/components/dashboard/DashboardSidebar.tsx
git commit -m "feat(v2): route /dashboard/journal-audit + sidebar"
```
