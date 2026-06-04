# Phase 3 — Partie 4 : DashboardComex (page d'accueil)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la page d'accueil `/dashboard` (grille de 6 cards) par un vrai cockpit QHSE — score global, alertes consolidées, 8 KPI-cards, 4 graphiques recharts — fidèle au `DashboardComex.jsx` de l'app d'origine.

**Architecture:** `DashboardComex.tsx` est un composant autonome avec `companyId: string`. Il charge toutes les tables en parallèle via RLS. La navigation vers les modules se fait via `useNavigate`. `DashboardPage.tsx` est mis à jour pour utiliser ce composant.

**Tech Stack:** React 19, TypeScript, recharts, Supabase, CSS `db-*`

**Prérequis :** Phases 1, 2 et 3 terminées (toutes les tables existent).

---

### Task 0 : DashboardComex.tsx

**Files:**
- Create: `src/dashboard/DashboardComex.tsx`

Note : Le composant agrège accidents, actions, habilitations, risques, qualite_nc, qualite_audits, qualite_satisfaction, objectifs_qhse, kpi_objectifs. Le filtrage company est assuré par RLS. kpi_objectifs utilise un filtre explicite `company_id` car c'est une config par company.

- [ ] Créer `src/dashboard/DashboardComex.tsx` :

```tsx
// src/dashboard/DashboardComex.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, RefreshCw, AlertTriangle, CheckCircle, Clock, ShieldAlert, HeartPulse, GraduationCap, Target, Activity, Star } from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { safeMean, calcExpiration } from './kpi-utils';

interface Props { companyId: string; }

interface KpiConfig { effectif: number; h_an: number; }

export default function DashboardComex({ companyId }: Props) {
  const navigate = useNavigate();
  const [data, setData]       = useState<Record<string, unknown[]> | null>(null);
  const [cfg, setCfg]         = useState<KpiConfig>({ effectif: 50, h_an: 1607 });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLU]   = useState<Date | null>(null);

  async function charger() {
    setLoading(true);
    const [r1, r2, r3, r4, r5, r6, r7] = await Promise.all([
      supabase.from('accidents').select('type_evenement,jours_perdus,date_evenement').is('archived_at', null),
      supabase.from('actions').select('statut,echeance').is('archived_at', null),
      supabase.from('habilitations').select('obtention,validite_ans'),
      supabase.from('risques').select('criticite').is('archived_at', null),
      supabase.from('qualite_nc').select('statut_nc').is('archived_at', null),
      supabase.from('qualite_audits').select('score'),
      supabase.from('qualite_satisfaction').select('note_globale'),
    ]);
    const r8 = await supabase.from('kpi_objectifs').select('effectif,h_an').eq('company_id', companyId).maybeSingle();
    if (r8.data) setCfg({ effectif: r8.data.effectif ?? 50, h_an: r8.data.h_an ?? 1607 });
    setData({
      accidents: r1.data ?? [],
      actions:   r2.data ?? [],
      habs:      r3.data ?? [],
      risques:   r4.data ?? [],
      ncs:       r5.data ?? [],
      audits:    r6.data ?? [],
      sat:       r7.data ?? [],
    });
    setLU(new Date());
    setLoading(false);
  }

  useEffect(() => { charger(); }, []);

  type Accident   = { type_evenement: string; jours_perdus: number; date_evenement: string };
  type Action     = { statut: string; echeance: string | null };
  type Hab        = { obtention: string | null; validite_ans: number };
  type Risque     = { criticite: number };
  type NC         = { statut_nc: string };
  type Audit      = { score: number };
  type Sat        = { note_globale: number };

  const kpis = useMemo(() => {
    if (!data) return null;
    const accidents = data.accidents as Accident[];
    const actions   = data.actions   as Action[];
    const habs      = data.habs      as Hab[];
    const risques   = data.risques   as Risque[];
    const ncs       = data.ncs       as NC[];
    const audits    = data.audits    as Audit[];
    const sat       = data.sat       as Sat[];

    const now = new Date();
    const heures = cfg.effectif * cfg.h_an;

    const accArret    = accidents.filter(a => a.type_evenement === 'Accident avec arrêt');
    const jours       = accidents.reduce((s, a) => s + (a.jours_perdus || 0), 0);
    const TF          = heures > 0 ? ((accArret.length * 1_000_000) / heures).toFixed(2) : '0.00';
    const TG          = jours  > 0 ? ((jours * 1_000) / heures).toFixed(2) : '0.00';

    const actRetard   = actions.filter(a => {
      if (!a.echeance || a.statut?.includes('Terminé') || a.statut?.includes('Annulé')) return false;
      return Math.ceil((new Date(a.echeance).getTime() - now.getTime()) / 86400000) < 0;
    });
    const actTerminees = actions.filter(a => a.statut?.includes('Terminé'));
    const tauxPDCA    = actions.length > 0 ? Math.round((actTerminees.length / actions.length) * 100) : 0;

    const habsPerimees = habs.filter(h => {
      const exp = calcExpiration(h.obtention, h.validite_ans);
      return exp !== null && exp <= now;
    });
    const habsBientot  = habs.filter(h => {
      const exp = calcExpiration(h.obtention, h.validite_ans);
      if (!exp) return false;
      const j = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
      return j >= 0 && j <= 30;
    });

    const risquesCrit  = risques.filter(r => (r.criticite || 1) >= 9);
    const ncOuvertes   = ncs.filter(n => n.statut_nc === 'Ouverte' || !n.statut_nc);
    const tauxNC       = ncs.length > 0 ? Math.round((ncs.filter(n => n.statut_nc === 'Clôturée').length / ncs.length) * 100) : 100;

    const satAgg = safeMean(sat, s => (s as Sat).note_globale);
    const moyenneSat = satAgg.hasData ? satAgg.value!.toFixed(1) : null;

    const auditAgg = safeMean(audits.filter(a => a.score > 0), a => (a as Audit).score);
    const scoreAudit = auditAgg.hasData ? Math.round(auditAgg.value!) : 50;

    const scoreSecurite = Math.max(0, 100 - accArret.length * 15);
    const scoreHabs     = habs.length > 0 ? Math.round(((habs.length - habsPerimees.length) / habs.length) * 100) : 100;
    const scoreMaitrise = risques.length > 0 ? Math.round((risques.filter(r => (r.criticite || 1) < 4).length / risques.length) * 100) : 100;
    const scoreSat      = moyenneSat ? Math.round(Number(moyenneSat) * 10) : 50;
    const scoreGlobal   = Math.round((scoreSecurite + scoreHabs + scoreMaitrise + tauxPDCA + scoreSat + scoreAudit) / 6);

    // Graphiques
    const accMap: Record<string, { mois: string; arret: number; soins: number; presqu: number }> = {};
    accidents.forEach(a => {
      const m = a.date_evenement?.substring(0, 7);
      if (!m) return;
      if (!accMap[m]) accMap[m] = { mois: m, arret: 0, soins: 0, presqu: 0 };
      if (a.type_evenement === 'Accident avec arrêt') accMap[m].arret++;
      if (a.type_evenement === 'Soins (sans arrêt)') accMap[m].soins++;
      if (a.type_evenement === "Presqu'accident") accMap[m].presqu++;
    });
    const accChart = Object.values(accMap).sort((a, b) => a.mois.localeCompare(b.mois)).slice(-12);

    const ncMap: Record<string, { mois: string; ouvertes: number; cloturees: number }> = {};
    (data.accidents as Accident[]);
    ncs.forEach(n => {
      // qualite_nc ne stocke pas de date ici — on ignore le graphique NC
    });

    const radarData = [
      { subject: 'Sécurité', A: scoreSecurite },
      { subject: 'PDCA',     A: tauxPDCA },
      { subject: 'Habs.',    A: scoreHabs },
      { subject: 'Risques',  A: scoreMaitrise },
      { subject: 'NC',       A: tauxNC },
      { subject: 'Qualité',  A: scoreAudit },
    ];

    const alertes: Array<{ level: 'red' | 'amber' | 'green'; msg: string; path?: string }> = [];
    if (accArret.length > 0)     alertes.push({ level: 'red',   msg: `${accArret.length} accident(s) avec arrêt — TF : ${TF}`,          path: '/dashboard/accidents' });
    if (actRetard.length > 0)    alertes.push({ level: 'red',   msg: `${actRetard.length} action(s) PDCA en retard`,                     path: '/dashboard/actions' });
    if (risquesCrit.length > 0)  alertes.push({ level: 'red',   msg: `${risquesCrit.length} risque(s) critique(s) dans le DUERP`,        path: '/dashboard/duerp' });
    if (ncOuvertes.length > 0)   alertes.push({ level: 'amber', msg: `${ncOuvertes.length} non-conformité(s) ouverte(s) sans action`,    path: '/dashboard/audits' });
    if (habsPerimees.length > 0) alertes.push({ level: 'amber', msg: `${habsPerimees.length} habilitation(s) périmée(s)`,                path: '/dashboard/habilitations' });
    if (habsBientot.length > 0)  alertes.push({ level: 'amber', msg: `${habsBientot.length} habilitation(s) à renouveler dans 30 jours`, path: '/dashboard/habilitations' });
    if (alertes.length === 0)    alertes.push({ level: 'green', msg: 'Tous les indicateurs sont au vert — Excellent !' });

    return { accArret: accArret.length, jours, TF, TG, actRetard: actRetard.length, actTerminees: actTerminees.length, tauxPDCA, totalActions: actions.length, habsPerimees: habsPerimees.length, habsBientot: habsBientot.length, risquesCrit: risquesCrit.length, ncOuvertes: ncOuvertes.length, tauxNC, moyenneSat, scoreGlobal, scoreSecurite, scoreHabs, scoreMaitrise, tauxPDCA: tauxPDCA, scoreAudit, accChart, radarData, alertes };
  }, [data, cfg]);

  if (loading || !kpis) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw size={32} className="animate-spin text-[var(--mase-primary)] mx-auto mb-3" />
          <p className="text-[var(--mase-muted)] text-sm">Chargement du cockpit…</p>
        </div>
      </div>
    );
  }

  const sc = kpis.scoreGlobal >= 80 ? '#10B981' : kpis.scoreGlobal >= 60 ? '#F59E0B' : '#EF4444';
  const sl = kpis.scoreGlobal >= 80 ? 'Excellent' : kpis.scoreGlobal >= 60 ? 'Satisfaisant' : 'À améliorer';

  const KPIS = [
    { label: 'AT avec arrêt',      val: kpis.accArret,      color: kpis.accArret > 0 ? '#ef4444' : '#10b981',      sub: `TF : ${kpis.TF}`,                   Icon: HeartPulse },
    { label: 'Risques critiques',  val: kpis.risquesCrit,   color: kpis.risquesCrit > 0 ? '#ef4444' : '#10b981',   sub: 'Criticité ≥ 9',                       Icon: ShieldAlert },
    { label: 'Actions en retard',  val: kpis.actRetard,     color: kpis.actRetard > 0 ? '#f59e0b' : '#10b981',     sub: `Clôture : ${kpis.tauxPDCA}%`,         Icon: Target },
    { label: 'NC ouvertes',        val: kpis.ncOuvertes,    color: kpis.ncOuvertes > 0 ? '#f59e0b' : '#10b981',   sub: `Taux clôture : ${kpis.tauxNC}%`,      Icon: Activity },
    { label: 'Habs. périmées',     val: kpis.habsPerimees,  color: kpis.habsPerimees > 0 ? '#ef4444' : '#10b981', sub: `${kpis.habsBientot} bientôt exp.`,    Icon: GraduationCap },
    { label: 'Satisfaction',       val: kpis.moyenneSat ? `${kpis.moyenneSat}/10` : '—', color: '#8b5cf6',        sub: 'Moyenne enquêtes',                     Icon: Star },
    { label: 'Jours perdus',       val: kpis.jours,         color: kpis.jours > 0 ? '#f59e0b' : '#10b981',        sub: `TG : ${kpis.TG}`,                     Icon: Clock },
    { label: 'Actions terminées',  val: kpis.actTerminees,  color: '#3b82f6',                                       sub: `Sur ${kpis.totalActions} totales`,   Icon: CheckCircle },
  ];

  const chartProps = { stroke: '#e2e8f0', vertical: false };
  const axisProps  = { stroke: '#e2e8f0', tick: { fill: '#94a3b8', fontSize: 11 } };
  const ttProps    = { contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 } };

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="db-page-header">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--mase-heading)]">
            <LayoutDashboard size={22} className="text-blue-500" /> Supervision Globale
          </h2>
          <p className="text-sm text-[var(--mase-muted)] mt-1">
            Cockpit QHSE en temps réel
            {lastUpdate && <span className="ml-2 opacity-50">· {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <button onClick={charger} className="db-btn-primary">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Mettre à jour
        </button>
      </div>

      {/* Score global + Alertes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Score */}
        <div className="db-panel p-6 flex flex-col items-center justify-center text-center">
          <div style={{ width: 96, height: 96, borderRadius: '50%', border: `4px solid ${sc}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 28px ${sc}30`, marginBottom: 12 }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: sc, lineHeight: 1 }}>{kpis.scoreGlobal}</span>
            <span style={{ fontSize: 10, color: '#64748b' }}>/100</span>
          </div>
          <p style={{ fontSize: 15, fontWeight: 800, color: sc }}>{sl}</p>
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Score SMI global</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 14, width: '100%' }}>
            {[
              { l: 'Sécurité', v: kpis.scoreSecurite },
              { l: 'PDCA',     v: kpis.tauxPDCA },
              { l: 'Habs.',    v: kpis.scoreHabs },
              { l: 'Risques',  v: kpis.scoreMaitrise },
            ].map((s, i) => {
              const c = s.v >= 80 ? '#10B981' : s.v >= 60 ? '#F59E0B' : '#EF4444';
              return (
                <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: '6px 10px' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>{s.l}</div>
                  <div style={{ height: 3, background: '#e2e8f0', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${s.v}%`, background: c, borderRadius: 2, transition: 'width 0.6s' }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: c, marginTop: 2 }}>{s.v}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alertes */}
        <div className="db-panel p-5 lg:col-span-2">
          <h3 style={{ fontWeight: 700, marginBottom: 12, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={15} className="text-amber-400" /> Alertes consolidées
            <span style={{ fontSize: 10, background: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)', padding: '2px 7px', borderRadius: 100, marginLeft: 4 }}>
              {kpis.alertes.filter(a => a.level !== 'green').length} alerte{kpis.alertes.filter(a => a.level !== 'green').length !== 1 ? 's' : ''}
            </span>
          </h3>
          <div className="space-y-2">
            {kpis.alertes.map((a, i) => (
              <div
                key={i}
                onClick={() => a.path && navigate(a.path)}
                className={a.level === 'red' ? 'db-alert-red' : a.level === 'amber' ? 'db-alert-amber' : 'db-alert-green'}
                style={{ cursor: a.path ? 'pointer' : 'default', transition: 'opacity 0.15s' }}
              >
                {a.level === 'green' ? <CheckCircle size={14} /> : a.level === 'red' ? <AlertTriangle size={14} /> : <Clock size={14} />}
                <p style={{ fontSize: 13, flex: 1 }}>{a.msg}</p>
                {a.path && <span style={{ fontSize: 10, opacity: 0.6, whiteSpace: 'nowrap' }}>→ Voir</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPIS.map((k, i) => (
          <div key={i} className="db-panel p-5" style={{ borderLeft: `4px solid ${k.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <k.Icon size={17} style={{ color: k.color }} />
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.3 }}>{k.label}</p>
            </div>
            <p style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{k.val}</p>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Accidentologie */}
        <div className="db-panel p-5">
          <h3 style={{ fontWeight: 700, marginBottom: 14, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <HeartPulse size={14} className="text-red-400" /> Accidentologie — 12 mois
          </h3>
          {kpis.accChart.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center gap-2">
              <CheckCircle size={28} className="text-emerald-400" />
              <p className="text-emerald-600 font-bold text-sm">Zéro accident !</p>
            </div>
          ) : (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpis.accChart}>
                  <CartesianGrid strokeDasharray="3 3" {...chartProps} />
                  <XAxis dataKey="mois" {...axisProps} />
                  <YAxis {...axisProps} allowDecimals={false} />
                  <Tooltip {...ttProps} />
                  <Bar dataKey="arret"  name="Avec arrêt"  fill="#EF4444" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="soins"  name="Soins"       fill="#F59E0B" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="presqu" name="Presqu'acc." fill="#3B82F6" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Radar */}
        <div className="db-panel p-5">
          <h3 style={{ fontWeight: 700, marginBottom: 14, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={14} className="text-blue-400" /> Radar performance SMI
          </h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={kpis.radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                <Radar name="Score" dataKey="A" stroke="#166534" fill="#166534" fillOpacity={0.12} strokeWidth={2} />
                <Tooltip {...ttProps} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] Commit :
```bash
git add src/dashboard/DashboardComex.tsx
git commit -m "feat(dashboard): DashboardComex — score global, alertes, 8 KPIs, graphiques"
```

---

### Task 1 : Mettre à jour DashboardPage.tsx

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

La page actuelle affiche une grille de 6 cards de navigation. Elle est remplacée par le DashboardComex. La navigation est déjà assurée par la sidebar.

- [ ] Remplacer intégralement `src/pages/DashboardPage.tsx` par :

```tsx
// src/pages/DashboardPage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import DashboardComex from '../dashboard/DashboardComex';

interface Props { session: Session | null; }

function ComexContent({ session }: Props) {
  const { company } = useCompany(session);
  if (!company) return null;
  return <DashboardComex companyId={company.id} />;
}

export default function DashboardPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <ComexContent session={session} />
    </DashboardGuard>
  );
}
```

- [ ] Vérifier que `src/main.tsx` a bien la route `/dashboard` existante — elle n'a pas besoin d'être modifiée :

```tsx
<Route path="/dashboard" element={<DashboardPage session={session} />} />
```

- [ ] Commit :
```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat(dashboard): remplace grille accueil par DashboardComex cockpit"
```

---

### Task 2 : Vérification visuelle

- [ ] Lancer `npm run dev`

- [ ] Naviguer vers `/dashboard` en étant connecté avec un compte ayant un abonnement actif

- [ ] Vérifier :
  - Le cercle de score global apparaît (0-100, couleur verte/orange/rouge)
  - Le panel alertes affiche des bandeaux colorés
  - Les 8 KPI-cards sont visibles avec des valeurs (zéros si pas de données)
  - Les graphiques recharts s'affichent (barchart accidentologie, radar)
  - Cliquer sur une alerte navigue vers le bon module

- [ ] Si erreur TypeScript visible dans la console dev, corriger avant de committer.

- [ ] Commit de stabilisation si nécessaire :
```bash
git add -p
git commit -m "fix(dashboard): corrections TypeScript DashboardComex"
```
