# SMI Dashboard Phase 2 — Partie 5 : KPIs + Revue de Direction + Routing final

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Porter les modules KPIs Sécurité et Revue de Direction, finaliser le routing dans main.tsx, vérifier le build complet.

**Architecture:**
- KPIs : lit risques + actions + accidents + habilitations + kpi_objectifs. Config effectif/h_an dans kpi_objectifs (upsert au premier chargement).
- Revue de Direction : synthèse simplifiée des 4 tables Phase 2. Génère un rapport HTML imprimable.
- Routing : main.tsx complet avec toutes les routes Phase 2 + update DashboardPage.

---

### Task 8 : Module KPIs Sécurité

**Files:**
- Create: `src/dashboard/KPIsSecurite.tsx`
- Create: `src/pages/DashboardKPIsPage.tsx`

- [ ] **Step 1 : Créer `src/dashboard/KPIsSecurite.tsx`**

```tsx
// src/dashboard/KPIsSecurite.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, TrendingDown, TrendingUp, Target, Shield, Activity, AlertTriangle, CheckCircle, Settings, Save, BarChart2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { diffJours, calcExpiration } from './kpi-utils';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, ReferenceLine, Cell,
} from 'recharts';

interface Props {
  companyId: string;
  canWrite: boolean;
}

interface KpiObjectifs {
  effectif: number;
  h_an: number;
  tf: number;
  tg: number;
  taux_cloture: number;
  taux_habs: number;
  taux_maitrise: number;
  acc_arret: number;
  actions_retard: number;
  satisfaction: number;
}

const OBJ_DEFAULTS: KpiObjectifs = { effectif: 50, h_an: 1607, tf: 10, tg: 1, taux_cloture: 70, taux_habs: 90, taux_maitrise: 70, acc_arret: 0, actions_retard: 0, satisfaction: 7 };

export default function KPIsSecurite({ companyId, canWrite }: Props) {
  const [data, setData] = useState<{
    accidents: Array<{ type_evenement: string; jours_perdus: number; date_evenement: string }>;
    actions: Array<{ statut: string; echeance: string | null; domaine: string }>;
    habs: Array<{ obtention: string | null; validite_ans: number }>;
    risques: Array<{ criticite: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [objectifs, setObjectifs] = useState<KpiObjectifs>(OBJ_DEFAULTS);
  const [showObj, setShowObj] = useState(false);
  const [objEdit, setObjEdit] = useState<KpiObjectifs>(OBJ_DEFAULTS);

  useEffect(() => { charger(); }, []);

  async function charger() {
    setLoading(true);
    const [r1, r2, r3, r4, r5] = await Promise.all([
      supabase.from('accidents').select('type_evenement,jours_perdus,date_evenement').is('archived_at', null),
      supabase.from('actions').select('statut,echeance,domaine').is('archived_at', null),
      supabase.from('habilitations').select('obtention,validite_ans'),
      supabase.from('risques').select('criticite').is('archived_at', null),
      supabase.from('kpi_objectifs').select('*').eq('company_id', companyId).single(),
    ]);
    setData({ accidents: r1.data || [], actions: r2.data || [], habs: r3.data || [], risques: r4.data || [] });
    if (r5.data) {
      const obj: KpiObjectifs = {
        effectif: r5.data.effectif ?? OBJ_DEFAULTS.effectif,
        h_an: r5.data.h_an ?? OBJ_DEFAULTS.h_an,
        tf: r5.data.tf ?? OBJ_DEFAULTS.tf,
        tg: r5.data.tg ?? OBJ_DEFAULTS.tg,
        taux_cloture: r5.data.taux_cloture ?? OBJ_DEFAULTS.taux_cloture,
        taux_habs: r5.data.taux_habs ?? OBJ_DEFAULTS.taux_habs,
        taux_maitrise: r5.data.taux_maitrise ?? OBJ_DEFAULTS.taux_maitrise,
        acc_arret: r5.data.acc_arret ?? OBJ_DEFAULTS.acc_arret,
        actions_retard: r5.data.actions_retard ?? OBJ_DEFAULTS.actions_retard,
        satisfaction: r5.data.satisfaction ?? OBJ_DEFAULTS.satisfaction,
      };
      setObjectifs(obj); setObjEdit(obj);
    } else {
      // Créer la ligne de config pour cette company
      await supabase.from('kpi_objectifs').insert([{ company_id: companyId, ...OBJ_DEFAULTS }]);
    }
    setLoading(false);
  }

  async function sauvegarderObjectifs() {
    setObjectifs(objEdit);
    await supabase.from('kpi_objectifs').update({ ...objEdit, updated_at: new Date().toISOString() }).eq('company_id', companyId);
    setShowObj(false);
  }

  const c = useMemo(() => {
    if (!data) return null;
    const { accidents, actions, habs, risques } = data;
    const heures = objectifs.effectif * objectifs.h_an;
    const now = new Date();

    const accArret = accidents.filter(a => a.type_evenement === 'Accident avec arrêt');
    const jours = accidents.reduce((s, a) => s + (a.jours_perdus || 0), 0);
    const TF = heures > 0 ? +((accArret.length * 1000000) / heures).toFixed(2) : 0;
    const TG = heures > 0 ? +((jours * 1000) / heures).toFixed(2) : 0;

    const actTerminees = actions.filter(a => a.statut?.includes('Terminé'));
    const actRetard = actions.filter(a => {
      if (!a.echeance || a.statut?.includes('Terminé') || a.statut?.includes('Annulé')) return false;
      const dj = diffJours(a.echeance, now);
      return dj !== null && dj < 0;
    });
    const tauxCloture = actions.length > 0 ? Math.round((actTerminees.length / actions.length) * 100) : null;

    const parDomaine = ['Qualité', 'Sécurité', 'Environnement', 'Énergie', 'RH / Social'].map(d => {
      const total = actions.filter(a => a.domaine === d).length;
      const done = actions.filter(a => a.domaine === d && a.statut?.includes('Terminé')).length;
      return { domaine: d.split(' /')[0], total, done, taux: total > 0 ? Math.round((done / total) * 100) : 0 };
    }).filter(d => d.total > 0);

    const habValides = habs.filter(h => {
      const exp = calcExpiration(h.obtention, h.validite_ans);
      return exp !== null && exp > now;
    });
    const tauxHabs = habs.length > 0 ? Math.round((habValides.length / habs.length) * 100) : null;

    const risqAcc = risques.filter(r => (r.criticite || 1) < 4);
    const risqCrit = risques.filter(r => (r.criticite || 1) >= 9);
    const tauxMaitrise = risques.length > 0 ? Math.round((risqAcc.length / risques.length) * 100) : null;

    const scoreSecurite = Math.max(0, 100 - TF * 5 - accidents.filter(a => a.type_evenement === 'Soins (sans arrêt)').length * 2);
    const composantes = [scoreSecurite, tauxCloture, tauxHabs, tauxMaitrise].filter(v => v !== null) as number[];
    const scoreGlobal = composantes.length > 0 ? Math.round(composantes.reduce((s, v) => s + v, 0) / composantes.length) : null;

    const accMap: Record<string, { mois: string; TF: number; jours: number }> = {};
    accidents.forEach(a => {
      const m = a.date_evenement?.substring(0, 7); if (!m) return;
      if (!accMap[m]) accMap[m] = { mois: m, TF: 0, jours: 0 };
      if (a.type_evenement === 'Accident avec arrêt') accMap[m].TF++;
      accMap[m].jours += a.jours_perdus || 0;
    });
    const accChart = Object.values(accMap).sort((a, b) => a.mois.localeCompare(b.mois)).slice(-12).map(m => ({
      mois: m.mois, TF: heures > 0 ? +((m.TF * 1000000) / heures).toFixed(2) : 0,
    }));

    return { heures: Math.round(heures), TF, TG, accArret: accArret.length, accSansArret: accidents.filter(a => a.type_evenement === 'Soins (sans arrêt)').length, presquAcc: accidents.filter(a => a.type_evenement === "Presqu'accident").length, jours, tauxCloture, actRetard: actRetard.length, actTerminees: actTerminees.length, totalActions: actions.length, parDomaine, tauxHabs, habValides: habValides.length, totalHabs: habs.length, risqCrit: risqCrit.length, risqAcc: risqAcc.length, tauxMaitrise, scoreGlobal, accChart };
  }, [data, objectifs]);

  if (loading || !c) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center"><RefreshCw size={28} className="animate-spin text-blue-400 mx-auto mb-2" /><p className="text-slate-500 text-sm">Calcul des KPIs...</p></div>
    </div>
  );

  const scoreColor = c.scoreGlobal === null ? '#64748b' : c.scoreGlobal >= 80 ? '#10b981' : c.scoreGlobal >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-5 pb-10">
      {/* En-tête */}
      <div className="db-page-header">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--mase-heading)]"><BarChart2 size={22} className="text-blue-500" /> KPIs & Indicateurs</h2>
          <p className="text-sm text-[var(--mase-muted)] mt-1">Taux de Fréquence, Taux de Gravité — calculés en temps réel</p>
        </div>
        <div className="flex gap-2 items-center">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 12px' }}>
            <label style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>Effectif :</label>
            <input type="number" min="1" value={objectifs.effectif} onChange={e => setObjectifs(p => ({ ...p, effectif: Number(e.target.value) }))} style={{ width: 52, background: 'transparent', color: '#0f172a', fontSize: 14, fontWeight: 800, outline: 'none', textAlign: 'center', border: 'none' }} />
            <span style={{ fontSize: 11, color: '#94a3b8' }}>pers.</span>
          </div>
          {canWrite && <button onClick={() => { setObjEdit(objectifs); setShowObj(true); }} className="db-btn-secondary"><Settings size={14} /> Objectifs</button>}
          <button onClick={charger} className="db-btn-primary"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Recalculer</button>
        </div>
      </div>

      {/* Panneau objectifs */}
      {showObj && canWrite && (
        <div className="db-panel p-5" style={{ border: '1px solid rgba(59,130,246,0.2)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-[var(--mase-heading)] flex items-center gap-2"><Target size={15} className="text-blue-500" /> Objectifs annuels</h3>
            <button onClick={() => setShowObj(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Effectif', key: 'effectif' as keyof KpiObjectifs, step: 1 },
              { label: 'H/an', key: 'h_an' as keyof KpiObjectifs, step: 1 },
              { label: 'TF objectif (≤)', key: 'tf' as keyof KpiObjectifs, step: 0.1 },
              { label: 'TG objectif (≤)', key: 'tg' as keyof KpiObjectifs, step: 0.1 },
              { label: 'Clôture PDCA (≥%)', key: 'taux_cloture' as keyof KpiObjectifs, step: 1 },
              { label: 'Habilitations (≥%)', key: 'taux_habs' as keyof KpiObjectifs, step: 1 },
              { label: 'Maîtrise risques (≥%)', key: 'taux_maitrise' as keyof KpiObjectifs, step: 1 },
              { label: 'AT arrêt (≤)', key: 'acc_arret' as keyof KpiObjectifs, step: 1 },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{f.label}</label>
                <input type="number" step={f.step} value={objEdit[f.key] as number} onChange={e => setObjEdit(p => ({ ...p, [f.key]: Number(e.target.value) }))} style={{ padding: '7px 10px', fontSize: 14, fontWeight: 700, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 7, outline: 'none', width: '100%' }} />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowObj(false)} className="db-btn-secondary">Annuler</button>
            <button onClick={sauvegarderObjectifs} className="db-btn-primary"><Save size={13} /> Sauvegarder les objectifs</button>
          </div>
        </div>
      )}

      {/* Score global */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="db-panel p-6 text-center flex flex-col items-center justify-center">
          <div style={{ width: 96, height: 96, borderRadius: '50%', border: `4px solid ${scoreColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 24px ${scoreColor}25`, marginBottom: 10 }}>
            <span style={{ fontSize: c.scoreGlobal === null ? 18 : 30, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{c.scoreGlobal === null ? 'N/A' : c.scoreGlobal}</span>
            {c.scoreGlobal !== null && <span style={{ fontSize: 10, color: '#64748b' }}>/100</span>}
          </div>
          <p style={{ fontSize: 14, fontWeight: 800, color: scoreColor }}>{c.scoreGlobal === null ? 'Données insuffisantes' : c.scoreGlobal >= 80 ? 'Excellent' : c.scoreGlobal >= 60 ? 'Satisfaisant' : 'À améliorer'}</p>
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Score global SMI</p>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>Base : {c.heures.toLocaleString('fr-FR')} h</p>
        </div>

        {/* Atteinte objectifs */}
        <div className="db-panel p-5 lg:col-span-2">
          <h3 className="font-bold mb-3 text-[var(--mase-heading)] flex items-center gap-2"><Target size={15} className="text-blue-500" /> Atteinte des objectifs</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Taux de Fréquence', val: c.TF, obj: objectifs.tf, inverse: true },
              { label: 'Taux de Gravité', val: c.TG, obj: objectifs.tg, inverse: true },
              { label: 'Clôture PDCA', val: c.tauxCloture !== null ? `${c.tauxCloture}%` : 'N/A', ok: c.tauxCloture !== null && c.tauxCloture >= objectifs.taux_cloture, hasData: c.tauxCloture !== null },
              { label: 'Habilitations valides', val: c.tauxHabs !== null ? `${c.tauxHabs}%` : 'N/A', ok: c.tauxHabs !== null && c.tauxHabs >= objectifs.taux_habs, hasData: c.tauxHabs !== null },
              { label: 'Maîtrise risques', val: c.tauxMaitrise !== null ? `${c.tauxMaitrise}%` : 'N/A', ok: c.tauxMaitrise !== null && c.tauxMaitrise >= objectifs.taux_maitrise, hasData: c.tauxMaitrise !== null },
              { label: 'AT avec arrêt', val: c.accArret, obj: objectifs.acc_arret, inverse: true },
              { label: 'Actions en retard', val: c.actRetard, obj: objectifs.actions_retard, inverse: true },
            ].map((o, i) => {
              const ok = 'ok' in o ? o.ok : ('inverse' in o && o.inverse ? o.val <= o.obj! : o.val >= o.obj!);
              const hasData = 'hasData' in o ? o.hasData : true;
              const color = !hasData ? '#64748b' : ok ? '#10b981' : '#f59e0b';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#f8fafc', borderRadius: 8, border: `1px solid ${!hasData ? '#e2e8f0' : ok ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: '#334155' }}>{o.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color }}>{o.val}</span>
                  {'obj' in o && <span style={{ fontSize: 10, color: '#94a3b8' }}>obj:{o.inverse ? '≤' : '≥'}{o.obj}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* KPIs Sécurité */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Shield size={13} className="text-red-400" /> Indicateurs Sécurité</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { titre: 'Taux de Fréquence (TF)', val: c.TF, sous: 'Acc.×10⁶ / h travaillées', icon: <Activity size={20} />, color: c.TF === 0 ? '#10b981' : c.TF <= objectifs.tf ? '#f59e0b' : '#ef4444' },
            { titre: 'Taux de Gravité (TG)', val: c.TG, sous: `${c.jours} jours perdus`, icon: <TrendingDown size={20} />, color: c.TG === 0 ? '#10b981' : c.TG <= objectifs.tg ? '#f59e0b' : '#ef4444' },
            { titre: 'Accidents avec arrêt', val: c.accArret, sous: `+ ${c.accSansArret} soins sans arrêt`, icon: <AlertTriangle size={20} />, color: c.accArret === 0 ? '#10b981' : '#ef4444' },
            { titre: "Presqu'accidents", val: c.presquAcc, sous: 'Événements précurseurs', icon: <Shield size={20} />, color: '#3b82f6' },
          ].map((k, i) => (
            <div key={i} className="db-panel p-5" style={{ borderLeft: `4px solid ${k.color}` }}>
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 leading-tight flex-1">{k.titre}</p>
                <div style={{ padding: 8, borderRadius: 10, background: `${k.color}15`, color: k.color, flexShrink: 0, marginLeft: 8 }}>{k.icon}</div>
              </div>
              <h4 style={{ fontSize: 36, fontWeight: 900, color: '#0f172a' }}>{k.val}</h4>
              <p className="text-xs text-slate-500 mt-1">{k.sous}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs Conformité */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Target size={13} className="text-blue-400" /> Taux de Conformité</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { titre: "Clôture Plan d'Actions", val: c.tauxCloture, unite: '%', sous: `${c.actTerminees}/${c.totalActions} terminées`, icon: <CheckCircle size={20} />, color: c.tauxCloture === null ? '#3b82f6' : c.tauxCloture >= objectifs.taux_cloture ? '#10b981' : '#f59e0b' },
            { titre: 'Actions en retard', val: c.actRetard, unite: '', sous: 'Échéances dépassées', icon: <AlertTriangle size={20} />, color: c.actRetard === 0 ? '#10b981' : '#ef4444' },
            { titre: 'Habilitations valides', val: c.tauxHabs, unite: '%', sous: `${c.habValides}/${c.totalHabs} habilitations`, icon: <CheckCircle size={20} />, color: c.tauxHabs === null ? '#3b82f6' : c.tauxHabs >= objectifs.taux_habs ? '#10b981' : '#f59e0b' },
            { titre: 'Maîtrise des risques', val: c.tauxMaitrise, unite: '%', sous: `${c.risqAcc} acceptables / ${c.risqCrit} critiques`, icon: <Shield size={20} />, color: c.tauxMaitrise === null ? '#3b82f6' : c.tauxMaitrise >= objectifs.taux_maitrise ? '#10b981' : '#f59e0b' },
          ].map((k, i) => (
            <div key={i} className="db-panel p-5" style={{ borderLeft: `4px solid ${k.color}` }}>
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 leading-tight flex-1">{k.titre}</p>
                <div style={{ padding: 8, borderRadius: 10, background: `${k.color}15`, color: k.color, flexShrink: 0, marginLeft: 8 }}>{k.icon}</div>
              </div>
              <h4 style={{ fontSize: 36, fontWeight: 900, color: '#0f172a' }}>{k.val !== null ? k.val : 'N/A'}{k.val !== null && k.unite}</h4>
              <p className="text-xs text-slate-500 mt-1">{k.sous}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* TF évolution */}
        <div className="db-panel p-5">
          <h3 className="font-bold mb-3 text-sm text-[var(--mase-heading)] flex items-center gap-2"><Activity size={14} className="text-red-400" /> Évolution TF — 12 mois</h3>
          {c.accChart.length === 0 ? (
            <div style={{ height: 176 }} className="flex items-center justify-center flex-col gap-2"><CheckCircle size={24} className="text-emerald-400" /><p className="text-emerald-600 font-bold text-sm">TF = 0 sur toute la période</p></div>
          ) : (
            <div style={{ height: 176 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={c.accChart}>
                  <defs><linearGradient id="tfGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="mois" stroke="#e2e8f0" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis stroke="#e2e8f0" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 11 }} />
                  <ReferenceLine y={objectifs.tf} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `Obj.${objectifs.tf}`, fill: '#f59e0b', fontSize: 10 }} />
                  <Area type="monotone" dataKey="TF" name="TF" stroke="#ef4444" fill="url(#tfGrad)" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Clôture par domaine */}
        {c.parDomaine.length > 0 && (
          <div className="db-panel p-5">
            <h3 className="font-bold mb-3 text-sm text-[var(--mase-heading)] flex items-center gap-2"><Target size={14} className="text-blue-400" /> Clôture actions par domaine</h3>
            <div style={{ height: 176 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={c.parDomaine} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="#e2e8f0" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="domaine" stroke="#e2e8f0" tick={{ fill: '#64748b', fontSize: 11 }} width={70} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 11 }} formatter={(v: number) => [`${v}%`, 'Taux']} />
                  <ReferenceLine x={objectifs.taux_cloture} stroke="#f59e0b" strokeDasharray="4 4" />
                  <Bar dataKey="taux" name="Taux clôture" radius={[0, 6, 6, 0]}>
                    {c.parDomaine.map((d, i) => <Cell key={i} fill={d.taux >= objectifs.taux_cloture ? '#10b981' : d.taux >= 50 ? '#f59e0b' : '#ef4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Formules */}
      <div className="db-panel p-5" style={{ border: '1px solid rgba(59,130,246,0.15)' }}>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Formules réglementaires</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { titre: 'Taux de Fréquence (TF)', formule: 'TF = (Acc. avec arrêt × 1 000 000) / H travaillées', detail: `${objectifs.effectif} pers. × ${objectifs.h_an}h/an = ${c.heures.toLocaleString('fr-FR')}h` },
            { titre: 'Taux de Gravité (TG)', formule: 'TG = (Jours perdus × 1 000) / H travaillées', detail: `Jours perdus cumulés : ${c.jours} jour(s)` },
          ].map((f, i) => (
            <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
              <p className="font-bold text-sm text-[var(--mase-heading)] mb-1">{f.titre}</p>
              <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#2563eb' }}>{f.formule}</p>
              <p className="text-xs text-slate-500 mt-1">{f.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Créer `src/pages/DashboardKPIsPage.tsx`**

```tsx
// src/pages/DashboardKPIsPage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import KPIsSecurite from '../dashboard/KPIsSecurite';

interface Props { session: Session | null; }

function KPIsContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return <KPIsSecurite companyId={company.id} canWrite={canWrite} />;
}

export default function DashboardKPIsPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <KPIsContent session={session} />
    </DashboardGuard>
  );
}
```

- [ ] **Step 3 : Build check + commit**

```powershell
npm run build 2>&1 | Select-String -Pattern "error TS" | Select-Object -First 10
git add src/dashboard/KPIsSecurite.tsx src/pages/DashboardKPIsPage.tsx
git commit -m "feat(dashboard): add KPIs Sécurité module with recharts charts"
```

---

### Task 9 : Module Revue de Direction

**Files:**
- Create: `src/dashboard/RevueDirection.tsx`
- Create: `src/pages/DashboardRevuePage.tsx`

- [ ] **Step 1 : Créer `src/dashboard/RevueDirection.tsx`**

```tsx
// src/dashboard/RevueDirection.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { calcExpiration } from './kpi-utils';
import { FileText, RefreshCw, CheckCircle, AlertTriangle, Shield, Users, Activity, Target, TrendingUp, TrendingDown, Printer } from 'lucide-react';

interface Props {
  companyId: string;
  companyName: string;
  effectif?: number;
  hAn?: number;
}

export default function RevueDirection({ companyId, companyName, effectif = 50, hAn = 1607 }: Props) {
  const [data, setData] = useState<{
    accidents: Array<{ type_evenement: string; jours_perdus: number; statut_enquete: string }>;
    actions: Array<{ statut: string; echeance: string | null }>;
    habilitations: Array<{ obtention: string | null; validite_ans: number }>;
    risques: Array<{ criticite: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);

  useEffect(() => { chargerDonnees(); }, []);

  async function chargerDonnees() {
    setLoading(true);
    const [r1, r2, r3, r4] = await Promise.all([
      supabase.from('accidents').select('type_evenement,jours_perdus,statut_enquete').is('archived_at', null),
      supabase.from('actions').select('statut,echeance').is('archived_at', null),
      supabase.from('habilitations').select('obtention,validite_ans'),
      supabase.from('risques').select('criticite').is('archived_at', null),
    ]);
    setData({ accidents: r1.data || [], actions: r2.data || [], habilitations: r3.data || [], risques: r4.data || [] });
    setLoading(false);
  }

  const stats = useMemo(() => {
    if (!data) return null;
    const { accidents, actions, habilitations, risques } = data;
    const heures = effectif * hAn;
    const now = new Date();

    const accArret = accidents.filter(a => a.type_evenement === 'Accident avec arrêt');
    const joursPerdus = accidents.reduce((s, a) => s + (a.jours_perdus || 0), 0);
    const TF = accArret.length > 0 ? ((accArret.length * 1000000) / heures).toFixed(2) : '0.00';
    const TG = joursPerdus > 0   ? ((joursPerdus * 1000) / heures).toFixed(2) : '0.00';

    const actTerminees = actions.filter(a => a.statut?.includes('Terminé'));
    const actRetard = actions.filter(a => {
      if (!a.echeance || a.statut?.includes('Terminé') || a.statut?.includes('Annulé')) return false;
      const d = new Date(a.echeance);
      return d < now;
    });
    const tauxCloture = actions.length > 0 ? Math.round((actTerminees.length / actions.length) * 100) : 0;

    const habsValides = habilitations.filter(h => {
      const exp = calcExpiration(h.obtention, h.validite_ans);
      return exp !== null && exp > now;
    });
    const habsPerimees = habilitations.filter(h => {
      const exp = calcExpiration(h.obtention, h.validite_ans);
      return exp !== null && exp <= now;
    });
    const tauxHabs = habilitations.length > 0 ? Math.round((habsValides.length / habilitations.length) * 100) : 100;

    const risquesCritiques = risques.filter(r => (r.criticite || 1) >= 9);
    const tauxMaitrise = risques.length > 0 ? Math.round((risques.filter(r => (r.criticite || 1) < 4).length / risques.length) * 100) : 100;

    const scoreGlobal = Math.round((tauxCloture + tauxHabs + tauxMaitrise + Math.max(0, 100 - accArret.length * 15)) / 4);

    const pointsForts: string[] = [];
    const axesAmelioration: string[] = [];
    if (accArret.length === 0) pointsForts.push('Aucun accident avec arrêt enregistré');
    else axesAmelioration.push(`${accArret.length} accident(s) avec arrêt — TF : ${TF}`);
    if (tauxCloture >= 70) pointsForts.push(`Bon taux de clôture des actions : ${tauxCloture}%`);
    else axesAmelioration.push(`Taux de clôture PDCA insuffisant : ${tauxCloture}% (objectif 70%)`);
    if (habsPerimees.length === 0) pointsForts.push('Toutes les habilitations sont à jour');
    else axesAmelioration.push(`${habsPerimees.length} habilitation(s) périmée(s) à renouveler`);
    if (risquesCritiques.length === 0) pointsForts.push('Aucun risque critique dans le DUERP');
    else axesAmelioration.push(`${risquesCritiques.length} risque(s) critique(s) à traiter en priorité`);

    return { TF, TG, accArret, joursPerdus, tauxCloture, actRetard, actTerminees, habsValides, habsPerimees, tauxHabs, risquesCritiques, tauxMaitrise, scoreGlobal, pointsForts, axesAmelioration, totalActions: actions.length, totalRisques: risques.length, totalHabs: habilitations.length, totalAccidents: accidents.length };
  }, [data, effectif, hAn]);

  function genererRapport() {
    if (!stats) return;
    setGenerating(true);
    const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const scoreColor = stats.scoreGlobal >= 70 ? '#10b981' : '#f59e0b';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Revue de Direction ${annee} — ${companyName}</title>
<style>
  @page { margin: 2cm; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; font-size: 12px; line-height: 1.6; }
  .cover { height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: linear-gradient(135deg, #0f172a, #1e3a5f); color: white; text-align: center; page-break-after: always; }
  .cover h1 { font-size: 32px; font-weight: 900; margin-bottom: 12px; }
  .cover h2 { font-size: 18px; font-weight: 400; opacity: 0.7; }
  .cover .score-badge { margin: 30px auto; width: 120px; height: 120px; border-radius: 50%; border: 4px solid ${scoreColor}; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .cover .score-val { font-size: 36px; font-weight: 900; color: ${scoreColor}; }
  h2.section { font-size: 16px; font-weight: 800; color: #1e3a5f; border-left: 4px solid #3b82f6; padding-left: 12px; margin: 24px 0 14px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
  .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; text-align: center; }
  .kpi-val { font-size: 26px; font-weight: 900; }
  .kpi-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px; }
  .alert { display: flex; gap: 8px; padding: 10px 14px; border-radius: 8px; margin-bottom: 8px; font-size: 12px; }
  .alert-r { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
  .alert-g { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
  .card h4 { font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 10px; }
  ul.list { padding-left: 16px; }
  ul.list li { font-size: 12px; color: #475569; margin-bottom: 4px; }
  .page-break { page-break-before: always; }
  .footer { margin-top: 40px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; color: #94a3b8; font-size: 10px; }
</style>
</head>
<body>
<div class="cover">
  <div style="font-size:13px;opacity:0.5;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px;">${companyName} — SMI Dashboard</div>
  <h1>Revue de Direction</h1>
  <h2>Rapport annuel ${annee}</h2>
  <div class="score-badge">
    <div class="score-val">${stats.scoreGlobal}</div>
    <div style="font-size:11px;color:#94a3b8;">Score SMI</div>
  </div>
  <div style="font-size:16px;font-weight:600;color:${scoreColor};">${stats.scoreGlobal >= 80 ? 'Excellent' : stats.scoreGlobal >= 60 ? 'Satisfaisant' : 'À améliorer'}</div>
  <div style="font-size:12px;color:#64748b;margin-top:20px;">Document généré le ${date}</div>
</div>

<h2 class="section">1. Bilan Sécurité & Accidentologie</h2>
<div class="kpi-grid">
  <div class="kpi"><div class="kpi-val" style="color:${stats.accArret.length === 0 ? '#10b981' : '#ef4444'};">${stats.accArret.length}</div><div class="kpi-label">Accidents avec arrêt</div></div>
  <div class="kpi"><div class="kpi-val" style="color:${stats.joursPerdus === 0 ? '#10b981' : '#ef4444'};">${stats.joursPerdus}</div><div class="kpi-label">Jours perdus</div></div>
  <div class="kpi"><div class="kpi-val" style="color:${Number(stats.TF) === 0 ? '#10b981' : '#ef4444'};">${stats.TF}</div><div class="kpi-label">Taux de Fréquence</div></div>
  <div class="kpi"><div class="kpi-val" style="color:${Number(stats.TG) === 0 ? '#10b981' : '#f59e0b'};">${stats.TG}</div><div class="kpi-label">Taux de Gravité</div></div>
</div>
${stats.accArret.length === 0 ? '<div class="alert alert-g">✓ Aucun accident avec arrêt — Objectif zéro AT atteint.</div>' : `<div class="alert alert-r">⚠ ${stats.accArret.length} accident(s) avec arrêt — Actions correctives à renforcer.</div>`}

<h2 class="section">2. Plan d'Actions (PDCA)</h2>
<div class="kpi-grid">
  <div class="kpi"><div class="kpi-val" style="color:#3b82f6;">${stats.totalActions}</div><div class="kpi-label">Total actions</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#10b981;">${stats.actTerminees.length}</div><div class="kpi-label">Terminées</div></div>
  <div class="kpi"><div class="kpi-val" style="color:${stats.actRetard.length === 0 ? '#10b981' : '#ef4444'};">${stats.actRetard.length}</div><div class="kpi-label">En retard</div></div>
  <div class="kpi"><div class="kpi-val" style="color:${stats.tauxCloture >= 70 ? '#10b981' : '#f59e0b'};">${stats.tauxCloture}%</div><div class="kpi-label">Taux de clôture</div></div>
</div>

<h2 class="section">3. Habilitations & Compétences</h2>
<div class="kpi-grid">
  <div class="kpi"><div class="kpi-val" style="color:#3b82f6;">${stats.totalHabs}</div><div class="kpi-label">Total habilitations</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#10b981;">${stats.habsValides.length}</div><div class="kpi-label">Valides</div></div>
  <div class="kpi"><div class="kpi-val" style="color:${stats.habsPerimees.length === 0 ? '#10b981' : '#ef4444'};">${stats.habsPerimees.length}</div><div class="kpi-label">Périmées</div></div>
  <div class="kpi"><div class="kpi-val" style="color:${stats.tauxHabs >= 90 ? '#10b981' : '#f59e0b'};">${stats.tauxHabs}%</div><div class="kpi-label">Taux validité</div></div>
</div>

<div class="page-break"></div>
<h2 class="section">4. Évaluation des Risques — DUERP</h2>
<div class="kpi-grid">
  <div class="kpi"><div class="kpi-val" style="color:#3b82f6;">${stats.totalRisques}</div><div class="kpi-label">Risques évalués</div></div>
  <div class="kpi"><div class="kpi-val" style="color:${stats.risquesCritiques.length === 0 ? '#10b981' : '#ef4444'};">${stats.risquesCritiques.length}</div><div class="kpi-label">Critiques (≥9)</div></div>
  <div class="kpi"><div class="kpi-val" style="color:${stats.tauxMaitrise >= 70 ? '#10b981' : '#f59e0b'};">${stats.tauxMaitrise}%</div><div class="kpi-label">Taux maîtrise</div></div>
</div>

<h2 class="section">5. Points forts & Axes d'amélioration</h2>
<div class="two-col">
  <div class="card" style="border-left:4px solid #10b981;">
    <h4 style="color:#166534;">✓ Points forts ${annee}</h4>
    <ul class="list">${stats.pointsForts.map(p => `<li>${p}</li>`).join('') || '<li style="color:#94a3b8;">À compléter lors de la revue</li>'}</ul>
  </div>
  <div class="card" style="border-left:4px solid #ef4444;">
    <h4 style="color:#991b1b;">⚠ Axes d'amélioration</h4>
    <ul class="list">${stats.axesAmelioration.map(a => `<li>${a}</li>`).join('') || '<li style="color:#94a3b8;">Aucun axe majeur identifié</li>'}</ul>
  </div>
</div>

<div class="footer">
  <span>${companyName} — SMI Dashboard — Revue de Direction ${annee}</span>
  <span>Document généré automatiquement le ${date} — CONFIDENTIEL</span>
</div>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => { w.print(); setGenerating(false); }, 800); }
    else setGenerating(false);
  }

  if (loading || !stats) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center"><RefreshCw size={28} className="animate-spin text-blue-400 mx-auto mb-2" /><p className="text-slate-500 text-sm">Chargement des données...</p></div>
    </div>
  );

  const scoreColor = stats.scoreGlobal >= 80 ? '#10b981' : stats.scoreGlobal >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-6 pb-10">
      {/* En-tête */}
      <div className="db-page-header">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--mase-heading)]"><FileText size={22} className="text-blue-500" /> Revue de Direction</h2>
          <p className="text-sm text-[var(--mase-muted)] mt-1">Synthèse automatique de la performance SMI — prête à présenter</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2 db-btn-secondary">
            <span className="text-slate-500 text-sm">Année :</span>
            <input type="number" value={annee} onChange={e => setAnnee(Number(e.target.value))} style={{ background: 'transparent', color: '#0f172a', fontWeight: 700, fontSize: 14, outline: 'none', width: 64, textAlign: 'center', border: 'none' }} />
          </div>
          <button onClick={chargerDonnees} className="db-btn-secondary"><RefreshCw size={15} /> Actualiser</button>
          <button onClick={genererRapport} disabled={generating} className="db-btn-primary" style={{ background: 'linear-gradient(135deg,#4f63e7,#06b6d4)' }}><Printer size={15} /> {generating ? 'Génération...' : 'Générer le rapport PDF'}</button>
        </div>
      </div>

      {/* Score global */}
      <div className="db-panel p-6 flex items-center gap-8">
        <div className="text-center shrink-0">
          <div style={{ width: 100, height: 100, borderRadius: '50%', border: `4px solid ${scoreColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 24px ${scoreColor}30` }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: scoreColor }}>{stats.scoreGlobal}</span>
            <span style={{ fontSize: 10, color: '#64748b' }}>/ 100</span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: scoreColor, marginTop: 8 }}>{stats.scoreGlobal >= 80 ? 'Excellent' : stats.scoreGlobal >= 60 ? 'Satisfaisant' : 'À améliorer'}</p>
          <p style={{ fontSize: 11, color: '#64748b' }}>Score SMI global</p>
        </div>
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Sécurité',      val: `TF ${stats.TF}`,                 ok: Number(stats.TF) === 0,                    icon: <Shield size={15} /> },
            { label: 'Actions PDCA',  val: `${stats.tauxCloture}%`,           ok: stats.tauxCloture >= 70,                   icon: <Target size={15} /> },
            { label: 'Habilitations', val: `${stats.tauxHabs}%`,              ok: stats.tauxHabs >= 90,                      icon: <Users size={15} /> },
            { label: 'Risques',       val: `${stats.risquesCritiques.length} critiques`, ok: stats.risquesCritiques.length === 0, icon: <AlertTriangle size={15} /> },
            { label: 'AT arrêt',      val: stats.accArret.length,             ok: stats.accArret.length === 0,               icon: <Activity size={15} /> },
            { label: 'Actions retard',val: stats.actRetard.length,            ok: stats.actRetard.length === 0,              icon: <Activity size={15} /> },
          ].map((item, i) => (
            <div key={i} className="db-panel p-3 flex items-center gap-3">
              <div style={{ color: item.ok ? '#10b981' : '#ef4444' }}>{item.icon}</div>
              <div><p className="text-slate-400 text-xs">{item.label}</p><p className="font-bold text-sm text-[var(--mase-heading)]">{item.val}</p></div>
              {item.ok ? <CheckCircle size={13} className="text-emerald-400 ml-auto shrink-0" /> : <AlertTriangle size={13} className="text-red-400 ml-auto shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Points forts & axes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="db-panel p-5" style={{ borderLeft: '3px solid #10b981' }}>
          <h3 className="font-bold mb-3 text-[var(--mase-heading)] flex items-center gap-2"><TrendingUp size={16} className="text-emerald-500" /> Points forts {annee}</h3>
          <div className="space-y-2">
            {stats.pointsForts.length === 0 ? <p className="text-slate-400 text-sm italic">À compléter lors de la revue</p> : stats.pointsForts.map((p, i) => (
              <div key={i} className="flex items-start gap-2"><CheckCircle size={13} className="text-emerald-400 shrink-0 mt-0.5" /><span className="text-sm text-slate-700">{p}</span></div>
            ))}
          </div>
        </div>
        <div className="db-panel p-5" style={{ borderLeft: '3px solid #ef4444' }}>
          <h3 className="font-bold mb-3 text-[var(--mase-heading)] flex items-center gap-2"><TrendingDown size={16} className="text-red-400" /> Axes d'amélioration</h3>
          <div className="space-y-2">
            {stats.axesAmelioration.length === 0 ? <p className="text-emerald-600 text-sm">✓ Aucun axe majeur identifié — Excellent !</p> : stats.axesAmelioration.map((a, i) => (
              <div key={i} className="flex items-start gap-2"><AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" /><span className="text-sm text-slate-700">{a}</span></div>
            ))}
          </div>
        </div>
      </div>

      {/* Call to action */}
      <div className="db-panel p-5 flex items-center gap-4" style={{ border: '1px solid rgba(59,130,246,0.2)' }}>
        <div style={{ width: 44, height: 44, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Printer size={20} className="text-blue-500" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-[var(--mase-heading)]">Rapport complet prêt à imprimer</p>
          <p className="text-slate-500 text-sm mt-0.5">Cliquez sur "Générer le rapport PDF" — utilisez Ctrl+P pour sauvegarder en PDF.</p>
        </div>
        <button onClick={genererRapport} disabled={generating} className="db-btn-primary shrink-0" style={{ background: 'linear-gradient(135deg,#4f63e7,#06b6d4)' }}><Printer size={14} /> Générer</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Créer `src/pages/DashboardRevuePage.tsx`**

```tsx
// src/pages/DashboardRevuePage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import RevueDirection from '../dashboard/RevueDirection';

interface Props { session: Session | null; }

function RevueContent({ session }: Props) {
  const { company } = useCompany(session);
  if (!company) return null;
  return <RevueDirection companyId={company.id} companyName={company.name} />;
}

export default function DashboardRevuePage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <RevueContent session={session} />
    </DashboardGuard>
  );
}
```

- [ ] **Step 3 : Build check + commit**

```powershell
npm run build 2>&1 | Select-String -Pattern "error TS" | Select-Object -First 10
git add src/dashboard/RevueDirection.tsx src/pages/DashboardRevuePage.tsx
git commit -m "feat(dashboard): add Revue de Direction module with HTML report generation"
```

---

### Task 10 : Routing complet + DashboardPage mise à jour

**Files:**
- Modify: `src/main.tsx` — Routes complètes
- Modify: `src/pages/DashboardPage.tsx` — Rediriger vers Vue Direction (Revue)

- [ ] **Step 1 : Remplacer intégralement `src/main.tsx`**

```tsx
// src/main.tsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { SessionContext } from './contexts/SessionContext';
import App from './App';
import HomePage from './pages/HomePage';
import MatricePage from './pages/MatricePage';
import DashboardPage from './pages/DashboardPage';
import DashboardOnboardingPage from './pages/DashboardOnboardingPage';
import DashboardJoinPage from './pages/DashboardJoinPage';
import DashboardTeamPage from './pages/DashboardTeamPage';
import DashboardPurchasePage from './pages/DashboardPurchasePage';
// Phase 2 modules
import DashboardDuerpPage from './pages/DashboardDuerpPage';
import DashboardActionsPage from './pages/DashboardActionsPage';
import DashboardAccidentsPage from './pages/DashboardAccidentsPage';
import DashboardHabilitationsPage from './pages/DashboardHabilitationsPage';
import DashboardKPIsPage from './pages/DashboardKPIsPage';
import DashboardRevuePage from './pages/DashboardRevuePage';
import './index.css';

function Root() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={session}>
      <BrowserRouter>
        <Routes>
          {/* Site public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/outil" element={<App />} />
          <Route path="/matrice-polyvalence" element={<MatricePage />} />
          {/* Dashboard — Phase 1 */}
          <Route path="/dashboard" element={<DashboardPage session={session} />} />
          <Route path="/dashboard/onboarding" element={<DashboardOnboardingPage session={session} />} />
          <Route path="/dashboard/rejoindre" element={<DashboardJoinPage session={session} />} />
          <Route path="/dashboard/equipe" element={<DashboardTeamPage session={session} />} />
          <Route path="/dashboard/acheter" element={<DashboardPurchasePage session={session} />} />
          {/* Dashboard — Phase 2 : 6 modules MASE */}
          <Route path="/dashboard/duerp" element={<DashboardDuerpPage session={session} />} />
          <Route path="/dashboard/actions" element={<DashboardActionsPage session={session} />} />
          <Route path="/dashboard/accidents" element={<DashboardAccidentsPage session={session} />} />
          <Route path="/dashboard/habilitations" element={<DashboardHabilitationsPage session={session} />} />
          <Route path="/dashboard/kpis" element={<DashboardKPIsPage session={session} />} />
          <Route path="/dashboard/revue" element={<DashboardRevuePage session={session} />} />
        </Routes>
      </BrowserRouter>
    </SessionContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
```

- [ ] **Step 2 : Mettre à jour `src/pages/DashboardPage.tsx`** (Vue Direction = liens vers les 6 modules)

```tsx
// src/pages/DashboardPage.tsx
import { Link } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';

interface Props { session: Session | null; }

function VueDirectionContent({ session }: Props) {
  const { company } = useCompany(session);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--mase-heading)]">Vue Direction</h1>
        <p className="text-[var(--mase-muted)] text-sm mt-1">Bienvenue dans le SMI Dashboard — {company?.name}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { path: '/dashboard/duerp',         icon: '📋', label: 'Registre DUERP',       desc: 'Évaluation des risques professionnels',       color: '#f59e0b' },
          { path: '/dashboard/actions',        icon: '✅', label: "Plan d'Actions PDCA",  desc: 'Actions correctives et préventives',           color: '#3b82f6' },
          { path: '/dashboard/accidents',      icon: '🚨', label: 'Accidents & Incidents', desc: 'Déclaration, analyse, calcul TF/TG',           color: '#ef4444' },
          { path: '/dashboard/habilitations',  icon: '🏅', label: 'Habilitations',         desc: 'Alertes d\'expiration en temps réel',          color: '#8b5cf6' },
          { path: '/dashboard/kpis',           icon: '📊', label: 'KPIs Sécurité',         desc: 'Tableaux de bord et indicateurs',              color: '#06b6d4' },
          { path: '/dashboard/revue',          icon: '📝', label: 'Revue de Direction',     desc: 'Synthèse annuelle + rapport PDF',              color: '#10b981' },
        ].map(m => (
          <Link key={m.path} to={m.path} className="block rounded-2xl bg-white p-6 shadow-sm border border-[var(--mase-border)] hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{m.icon}</span>
              <h3 className="font-bold text-[var(--mase-heading)]">{m.label}</h3>
            </div>
            <p className="text-sm text-[var(--mase-muted)]">{m.desc}</p>
            <div className="mt-3 h-1 rounded-full" style={{ background: `${m.color}30` }}>
              <div className="h-full w-1/3 rounded-full" style={{ background: m.color }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <VueDirectionContent session={session} />
    </DashboardGuard>
  );
}
```

- [ ] **Step 3 : Build final complet**

```powershell
npm run build
```

Résultat attendu : `✓ built in Xs` sans aucune erreur TypeScript.

- [ ] **Step 4 : Tests unitaires**

```powershell
npm test -- --run
```

Résultat attendu : tous les tests passent (dont kpi-utils).

- [ ] **Step 5 : Commit final**

```powershell
git add src/main.tsx src/pages/DashboardPage.tsx
git commit -m "feat(dashboard): wire all Phase 2 routes — 6 MASE modules complete"
```

- [ ] **Step 6 : Tag Phase 2**

```powershell
git tag phase2-modules
git push origin main --tags
```

---

## Récapitulatif Phase 2

| Module | Route | Table | Fichiers |
|---|---|---|---|
| DUERP | `/dashboard/duerp` | `risques` | RegistreDUERP.tsx + DashboardDuerpPage.tsx |
| PDCA | `/dashboard/actions` | `actions` | PlanActions.tsx + DashboardActionsPage.tsx |
| Accidents | `/dashboard/accidents` | `accidents` | SecuriteAccidents.tsx + DashboardAccidentsPage.tsx |
| Habilitations | `/dashboard/habilitations` | `habilitations` | Habilitations.tsx + DashboardHabilitationsPage.tsx |
| KPIs | `/dashboard/kpis` | `kpi_objectifs` | KPIsSecurite.tsx + DashboardKPIsPage.tsx |
| Revue | `/dashboard/revue` | (lecture seule) | RevueDirection.tsx + DashboardRevuePage.tsx |

**Invariants garantis :**
- Toutes les tables ont `company_id` avec RLS via `get_user_company_id()`
- Les INSERT passent `company_id: companyId` (prop du composant)
- Les SELECT sont filtrés automatiquement par RLS
- Navigation DUERP→PDCA et Accidents→PDCA via `useNavigate(..., { state: { prefill } })`
- Thème light-only, recharts pour graphiques, pas de dark mode
- `qhse-dashboard2` n'a jamais été modifié

**Fin Partie 5 — Phase 2 complète.**
