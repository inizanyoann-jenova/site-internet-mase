# Phase 3 — Partie 5 : Export Excel/PDF + Routing final + Build check

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter la page d'export Excel/PDF (`/dashboard/export`), finaliser toutes les routes dans `main.tsx`, vérifier que le build TypeScript passe sans erreur.

**Architecture:** L'export Excel utilise la lib `xlsx` (npm). Chaque table est exportée dans un onglet séparé. L'export PDF utilise `window.print()` avec une page HTML générée. `ArchivesExport.tsx` récupère les comptages par table et propose l'export.

**Tech Stack:** React 19, TypeScript, xlsx, Supabase

**Prérequis :** Phases 1–4 terminées. Toutes les tables existent.

---

### Task 0 : Installer xlsx

**Files:**
- Modify: `package.json`

- [ ] Dans le terminal du projet, exécuter :

```bash
npm install xlsx
```

- [ ] Vérifier que `package.json` contient maintenant `"xlsx"` dans les dependencies.

- [ ] Commit :
```bash
git add package.json package-lock.json
git commit -m "feat(deps): add xlsx for Excel export"
```

---

### Task 1 : ArchivesExport.tsx

**Files:**
- Create: `src/dashboard/ArchivesExport.tsx`

Note : Les tables à exporter sont celles créées en Phase 2 et Phase 3. Le RLS filtre automatiquement par company.

- [ ] Créer `src/dashboard/ArchivesExport.tsx` :

```tsx
// src/dashboard/ArchivesExport.tsx
import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, Database, FileSpreadsheet, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

interface Props { companyId: string; }

const TABLES = [
  { id: 'accidents',          label: 'Accidents & Incidents',    color: '#EF4444', module: '/dashboard/accidents' },
  { id: 'actions',            label: "Plan d'Actions (PDCA)",    color: '#3B82F6', module: '/dashboard/actions' },
  { id: 'habilitations',      label: 'Habilitations',            color: '#10B981', module: '/dashboard/habilitations' },
  { id: 'risques',            label: 'Registre DUERP',           color: '#F59E0B', module: '/dashboard/duerp' },
  { id: 'qualite_nc',         label: 'Non-Conformités',          color: '#8B5CF6', module: '/dashboard/audits' },
  { id: 'qualite_audits',     label: 'Audits',                   color: '#06B6D4', module: '/dashboard/audits' },
  { id: 'qualite_satisfaction', label: 'Satisfaction Client',    color: '#EC4899', module: '/dashboard/audits' },
  { id: 'qualite_qvt',        label: 'QVT',                      color: '#84CC16', module: '/dashboard/audits' },
  { id: 'objectifs_qhse',     label: 'Objectifs QHSE',           color: '#F97316', module: '/dashboard/objectifs' },
  { id: 'rh_employes',        label: 'Employés',                 color: '#64748B', module: '/dashboard/rh' },
  { id: 'rh_formations',      label: 'Formations',               color: '#0EA5E9', module: '/dashboard/rh' },
  { id: 'reunions_qhse',      label: 'Réunions QHSE',            color: '#14B8A6', module: '/dashboard/reunions' },
] as const;

type TableId = typeof TABLES[number]['id'];

function fmt(v: unknown): string | number | boolean {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return v as string | number | boolean;
}

export default function ArchivesExport({ companyId: _companyId }: Props) {
  const [counts, setCounts]     = useState<Partial<Record<TableId, number>>>({});
  const [loading, setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<Set<TableId>>(new Set(TABLES.map(t => t.id)));

  async function chargerCompteurs() {
    setLoading(true);
    const results = await Promise.all(
      TABLES.map(t => supabase.from(t.id).select('id', { count: 'exact', head: true }))
    );
    const c: Partial<Record<TableId, number>> = {};
    TABLES.forEach((t, i) => { c[t.id] = results[i].count ?? 0; });
    setCounts(c);
    setLoading(false);
  }

  useEffect(() => { chargerCompteurs(); }, []);

  const toggleTable = (id: TableId) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const totalRows = Array.from(selected).reduce((s, id) => s + (counts[id] ?? 0), 0);

  /* ── Export Excel ── */
  const exporterExcel = async () => {
    if (selected.size === 0) return;
    setExporting(true);

    const wb = XLSX.utils.book_new();

    for (const tableInfo of TABLES) {
      if (!selected.has(tableInfo.id)) continue;
      const { data } = await supabase.from(tableInfo.id).select('*');
      if (!data || data.length === 0) continue;

      const rows = data.map(row =>
        Object.fromEntries(
          Object.entries(row).map(([k, v]) => [k, fmt(v)])
        )
      );
      const ws = XLSX.utils.json_to_sheet(rows);
      // Largeur automatique des colonnes
      const cols = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, 12) }));
      ws['!cols'] = cols;
      XLSX.utils.book_append_sheet(wb, ws, tableInfo.label.slice(0, 31));
    }

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `SMI-Dashboard-Export-${date}.xlsx`);
    setExporting(false);
  };

  /* ── Export PDF (impression) ── */
  const exporterPDF = () => {
    const lines = TABLES.filter(t => selected.has(t.id)).map(t =>
      `<tr><td>${t.label}</td><td style="text-align:right;font-weight:700">${counts[t.id] ?? 0}</td></tr>`
    ).join('');

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
<title>Rapport Export — SMI Dashboard</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #1e293b; }
  h1 { font-size: 20px; border-bottom: 3px solid #166534; padding-bottom: 8px; color: #166534; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th { background: #166534; color: white; padding: 8px 12px; text-align: left; font-size: 12px; }
  td { padding: 7px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .total { font-weight: 700; padding: 10px 12px; background: #f0fdf4; }
  .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; }
  @media print { body { margin: 20px; } }
</style></head><body>
<h1>Rapport d'Export — SMI Dashboard</h1>
<p style="font-size:12px;color:#64748b">Généré le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
<table>
  <thead><tr><th>Module</th><th style="text-align:right">Enregistrements</th></tr></thead>
  <tbody>
    ${lines}
    <tr class="total"><td>Total</td><td style="text-align:right">${totalRows}</td></tr>
  </tbody>
</table>
<div class="footer">SMI Dashboard Pro — Export confidentiel</div>
</body></html>`;

    const w = window.open('', '_blank', 'width=700,height=600');
    if (!w) { alert('Popup bloquée. Autorisez les popups.'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="db-page-header">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--mase-heading)]">
            <Database size={22} className="text-blue-500" /> Export Excel / PDF
          </h2>
          <p className="text-sm text-[var(--mase-muted)] mt-1">
            Exportez vos données QHSE en Excel multi-onglets ou en rapport PDF
          </p>
        </div>
        <button onClick={chargerCompteurs} className="db-btn-secondary">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      {/* Sélection tables */}
      <div className="db-panel p-5">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>Sélectionner les données à exporter</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setSelected(new Set(TABLES.map(t => t.id)))} style={{ fontSize: 12, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Tout sélectionner</button>
            <button onClick={() => setSelected(new Set())} style={{ fontSize: 12, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Tout désélectionner</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {TABLES.map(t => {
            const isSelected = selected.has(t.id);
            const count = counts[t.id] ?? 0;
            return (
              <button
                key={t.id}
                onClick={() => toggleTable(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${isSelected ? t.color : '#e2e8f0'}`,
                  background: isSelected ? `${t.color}0D` : '#f8fafc',
                  transition: 'all 0.15s', textAlign: 'left',
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? '#0f172a' : '#64748b' }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{loading ? '…' : `${count} ligne${count !== 1 ? 's' : ''}`}</div>
                </div>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${isSelected ? t.color : '#cbd5e1'}`, background: isSelected ? t.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isSelected && <span style={{ color: 'white', fontSize: 11, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Résumé sélection */}
        <div style={{ marginTop: 16, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileSpreadsheet size={16} className="text-green-600" />
          <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>
            {selected.size} table{selected.size !== 1 ? 's' : ''} sélectionnée{selected.size !== 1 ? 's' : ''} · {totalRows} ligne{totalRows !== 1 ? 's' : ''} au total
          </span>
        </div>
      </div>

      {/* Boutons export */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Excel */}
        <div className="db-panel p-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileSpreadsheet size={22} style={{ color: '#10b981' }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Export Excel</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Fichier .xlsx, un onglet par module</div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
            Toutes les données sélectionnées sont exportées dans un fichier Excel avec un onglet par table. Idéal pour analyser, filtrer et partager.
          </p>
          <button
            onClick={exporterExcel}
            disabled={exporting || selected.size === 0 || totalRows === 0}
            className="db-btn-primary"
            style={{ width: '100%', justifyContent: 'center', background: '#10b981' }}
          >
            {exporting ? <><RefreshCw size={14} className="animate-spin" /> Export en cours…</> : <><Download size={14} /> Télécharger Excel ({totalRows} lignes)</>}
          </button>
        </div>

        {/* PDF */}
        <div className="db-panel p-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Printer size={22} style={{ color: '#ef4444' }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Rapport PDF</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Synthèse imprimable</div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
            Génère un rapport synthétique avec le nombre d'enregistrements par module. Idéal pour un audit ou une présentation direction.
          </p>
          <button
            onClick={exporterPDF}
            disabled={selected.size === 0}
            className="db-btn-primary"
            style={{ width: '100%', justifyContent: 'center', background: '#ef4444' }}
          >
            <Printer size={14} /> Générer rapport PDF
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] Commit :
```bash
git add src/dashboard/ArchivesExport.tsx
git commit -m "feat(dashboard): ArchivesExport — export Excel multi-onglets + rapport PDF"
```

---

### Task 2 : DashboardExportPage.tsx + routing final

**Files:**
- Create: `src/pages/DashboardExportPage.tsx`
- Modify: `src/main.tsx` — ajouter les 3 routes manquantes + 1 route export

- [ ] Créer `src/pages/DashboardExportPage.tsx` :

```tsx
// src/pages/DashboardExportPage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import ArchivesExport from '../dashboard/ArchivesExport';

interface Props { session: Session | null; }

function ExportContent({ session }: Props) {
  const { company } = useCompany(session);
  if (!company) return null;
  return <ArchivesExport companyId={company.id} />;
}

export default function DashboardExportPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <ExportContent session={session} />
    </DashboardGuard>
  );
}
```

- [ ] Dans `src/main.tsx`, ajouter les imports manquants (après les imports existants) :

```tsx
import DashboardObjectifsPage from './pages/DashboardObjectifsPage';
import DashboardQualitePage   from './pages/DashboardQualitePage';
import DashboardRHPage        from './pages/DashboardRHPage';
import DashboardReunionsPage  from './pages/DashboardReunionsPage';
import DashboardExportPage    from './pages/DashboardExportPage';
```

**Note :** Certains imports auront peut-être déjà été ajoutés dans les phases précédentes. Vérifier les doublons et ne pas les répéter.

- [ ] Dans `src/main.tsx`, dans le bloc `<Routes>`, ajouter les routes manquantes (avant la fermeture `</Routes>`) :

```tsx
<Route path="/dashboard/objectifs" element={<DashboardObjectifsPage session={session} />} />
<Route path="/dashboard/audits"    element={<DashboardQualitePage   session={session} />} />
<Route path="/dashboard/rh"        element={<DashboardRHPage        session={session} />} />
<Route path="/dashboard/reunions"  element={<DashboardReunionsPage  session={session} />} />
<Route path="/dashboard/export"    element={<DashboardExportPage    session={session} />} />
```

**Note :** Ne pas dupliquer des routes déjà ajoutées dans les phases précédentes.

- [ ] Vérifier que le fichier `src/main.tsx` final contient exactement ces routes dashboard (sans doublons) :

```
/dashboard            → DashboardPage
/dashboard/onboarding → DashboardOnboardingPage
/dashboard/rejoindre  → DashboardJoinPage
/dashboard/equipe     → DashboardTeamPage
/dashboard/acheter    → DashboardPurchasePage
/dashboard/duerp      → DashboardDuerpPage
/dashboard/actions    → DashboardActionsPage
/dashboard/accidents  → DashboardAccidentsPage
/dashboard/habilitations → DashboardHabilitationsPage
/dashboard/kpis       → DashboardKPIsPage
/dashboard/revue      → DashboardRevuePage
/dashboard/objectifs  → DashboardObjectifsPage
/dashboard/audits     → DashboardQualitePage
/dashboard/rh         → DashboardRHPage
/dashboard/reunions   → DashboardReunionsPage
/dashboard/export     → DashboardExportPage
```

- [ ] Commit :
```bash
git add src/pages/DashboardExportPage.tsx src/main.tsx
git commit -m "feat(dashboard): page export + routing final (16 routes dashboard)"
```

---

### Task 3 : Build check TypeScript

**Files:** aucun nouveau fichier — corrections si erreurs

- [ ] Lancer le build :

```bash
npm run build
```

Résultat attendu : `✓ built in X.XXs` sans erreur TypeScript ni erreur Vite.

- [ ] Si des erreurs TypeScript apparaissent, les corriger une par une. Exemples courants :

  **Erreur : Type 'string' is not assignable to type 'max' | 'min'**
  → Dans ObjectifsQHSE.tsx, s'assurer que `form.sens` est typé `'max' | 'min'` et que le `FORM_INIT` utilise `as const`.

  **Erreur : Object is possibly 'null'**
  → Utiliser l'opérateur `?.` ou un guard `if (!data) return`.

  **Erreur : Cannot find module 'xlsx'**
  → Relancer `npm install xlsx` et vérifier que le `package.json` a bien `"xlsx"` dans les dependencies.

  **Erreur : Property 'X' does not exist on type 'never'**
  → Vérifier les interfaces TypeScript dans le composant concerné.

- [ ] Une fois le build propre, committer les corrections :
```bash
git add -p
git commit -m "fix(build): corrections TypeScript Phase 3"
```

---

### Task 4 : Tag git Phase 3

- [ ] Poser le tag `phase3-v1-complete` sur le commit final :

```bash
git tag phase3-v1-complete
```

- [ ] Vérifier que le tag est posé :

```bash
git log --oneline -5
```

---

### Récapitulatif Phase 3 complète

À l'issue des 5 parties, le dashboard V1 est complet avec 16 modules :

| Route | Module |
|---|---|
| `/dashboard` | Cockpit DashboardComex |
| `/dashboard/duerp` | DUERP |
| `/dashboard/actions` | Plan d'actions PDCA |
| `/dashboard/accidents` | Accidents & Incidents |
| `/dashboard/habilitations` | Habilitations |
| `/dashboard/kpis` | KPIs Sécurité |
| `/dashboard/revue` | Revue de Direction |
| `/dashboard/objectifs` | Objectifs QHSE |
| `/dashboard/audits` | Qualité & Audits (4 onglets) |
| `/dashboard/rh` | Social RH (2 onglets) |
| `/dashboard/reunions` | Réunions QHSE |
| `/dashboard/export` | Export Excel / PDF |
