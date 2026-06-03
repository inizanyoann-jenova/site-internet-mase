// src/dashboard/KPIsSecurite.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, TrendingDown, Target, Shield, Activity, AlertTriangle, CheckCircle, Settings, Save, BarChart2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { diffJours, calcExpiration } from './kpi-utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, ReferenceLine, Cell } from 'recharts';

interface Props { companyId: string; canWrite: boolean; }

interface KpiObj { effectif: number; h_an: number; tf: number; tg: number; taux_cloture: number; taux_habs: number; taux_maitrise: number; acc_arret: number; actions_retard: number; }
const DEFAULTS: KpiObj = { effectif: 50, h_an: 1607, tf: 10, tg: 1, taux_cloture: 70, taux_habs: 90, taux_maitrise: 70, acc_arret: 0, actions_retard: 0 };

export default function KPIsSecurite({ companyId, canWrite }: Props) {
  const [data, setData] = useState<{ accidents: Array<{ type_evenement: string; jours_perdus: number; date_evenement: string }>; actions: Array<{ statut: string; echeance: string | null; domaine: string }>; habs: Array<{ obtention: string | null; validite_ans: number }>; risques: Array<{ criticite: number }> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [obj, setObj] = useState<KpiObj>(DEFAULTS);
  const [showObj, setShowObj] = useState(false);
  const [objEdit, setObjEdit] = useState<KpiObj>(DEFAULTS);

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
      const o: KpiObj = { effectif: r5.data.effectif ?? DEFAULTS.effectif, h_an: r5.data.h_an ?? DEFAULTS.h_an, tf: r5.data.tf ?? DEFAULTS.tf, tg: r5.data.tg ?? DEFAULTS.tg, taux_cloture: r5.data.taux_cloture ?? DEFAULTS.taux_cloture, taux_habs: r5.data.taux_habs ?? DEFAULTS.taux_habs, taux_maitrise: r5.data.taux_maitrise ?? DEFAULTS.taux_maitrise, acc_arret: r5.data.acc_arret ?? DEFAULTS.acc_arret, actions_retard: r5.data.actions_retard ?? DEFAULTS.actions_retard };
      setObj(o); setObjEdit(o);
    } else {
      await supabase.from('kpi_objectifs').insert([{ company_id: companyId, ...DEFAULTS }]);
    }
    setLoading(false);
  }

  async function sauvegarderObj() {
    setObj(objEdit);
    await supabase.from('kpi_objectifs').update({ ...objEdit, updated_at: new Date().toISOString() }).eq('company_id', companyId);
    setShowObj(false);
  }

  const c = useMemo(() => {
    if (!data) return null;
    const { accidents, actions, habs, risques } = data;
    const heures = obj.effectif * obj.h_an;
    const now = new Date();
    const accArret = accidents.filter(a => a.type_evenement === 'Accident avec arrêt');
    const jours = accidents.reduce((s, a) => s + (a.jours_perdus || 0), 0);
    const TF = heures > 0 ? +((accArret.length * 1000000) / heures).toFixed(2) : 0;
    const TG = heures > 0 ? +((jours * 1000) / heures).toFixed(2) : 0;
    const actTerminees = actions.filter(a => a.statut?.includes('Terminé'));
    const actRetard = actions.filter(a => { if (!a.echeance || a.statut?.includes('Terminé') || a.statut?.includes('Annulé')) return false; const dj = diffJours(a.echeance, now); return dj !== null && dj < 0; });
    const tauxCloture = actions.length > 0 ? Math.round((actTerminees.length / actions.length) * 100) : null;
    const parDomaine = ['Qualité', 'Sécurité', 'Environnement', 'Énergie', 'RH / Social'].map(d => { const total = actions.filter(a => a.domaine === d).length; const done = actions.filter(a => a.domaine === d && a.statut?.includes('Terminé')).length; return { domaine: d.split(' /')[0], total, done, taux: total > 0 ? Math.round((done / total) * 100) : 0 }; }).filter(d => d.total > 0);
    const habValides = habs.filter(h => { const exp = calcExpiration(h.obtention, h.validite_ans); return exp !== null && exp > now; });
    const tauxHabs = habs.length > 0 ? Math.round((habValides.length / habs.length) * 100) : null;
    const risqAcc = risques.filter(r => (r.criticite || 1) < 4);
    const risqCrit = risques.filter(r => (r.criticite || 1) >= 9);
    const tauxMaitrise = risques.length > 0 ? Math.round((risqAcc.length / risques.length) * 100) : null;
    const scoreSecurite = Math.max(0, 100 - TF * 5 - accidents.filter(a => a.type_evenement === 'Soins (sans arrêt)').length * 2);
    const composantes = [scoreSecurite, tauxCloture, tauxHabs, tauxMaitrise].filter(v => v !== null) as number[];
    const scoreGlobal = composantes.length > 0 ? Math.round(composantes.reduce((s, v) => s + v, 0) / composantes.length) : null;
    const accMap: Record<string, { mois: string; TF: number }> = {};
    accidents.forEach(a => { const m = a.date_evenement?.substring(0, 7); if (!m) return; if (!accMap[m]) accMap[m] = { mois: m, TF: 0 }; if (a.type_evenement === 'Accident avec arrêt') accMap[m].TF++; });
    const accChart = Object.values(accMap).sort((a, b) => a.mois.localeCompare(b.mois)).slice(-12).map(m => ({ mois: m.mois, TF: heures > 0 ? +((m.TF * 1000000) / heures).toFixed(2) : 0 }));
    return { heures: Math.round(heures), TF, TG, accArret: accArret.length, accSansArret: accidents.filter(a => a.type_evenement === 'Soins (sans arrêt)').length, presquAcc: accidents.filter(a => a.type_evenement === "Presqu'accident").length, jours, tauxCloture, actRetard: actRetard.length, actTerminees: actTerminees.length, totalActions: actions.length, parDomaine, tauxHabs, habValides: habValides.length, totalHabs: habs.length, risqCrit: risqCrit.length, risqAcc: risqAcc.length, tauxMaitrise, scoreGlobal, accChart };
  }, [data, obj]);

  if (loading || !c) return <div className="flex items-center justify-center h-64"><div className="text-center"><RefreshCw size={28} className="animate-spin text-blue-400 mx-auto mb-2" /><p className="text-slate-500 text-sm">Calcul des KPIs...</p></div></div>;

  const scoreColor = c.scoreGlobal === null ? '#64748b' : c.scoreGlobal >= 80 ? '#10b981' : c.scoreGlobal >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-5 pb-10">
      <div className="db-page-header">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--mase-heading)]"><BarChart2 size={22} className="text-blue-500" /> KPIs &amp; Indicateurs</h2>
          <p className="text-sm text-[var(--mase-muted)] mt-1">Taux de Fréquence, Taux de Gravité — calculés en temps réel</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 12px' }}>
            <label style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>Effectif :</label>
            <input type="number" min="1" value={obj.effectif} onChange={e => setObj(p => ({ ...p, effectif: Number(e.target.value) }))} style={{ width: 52, background: 'transparent', color: '#0f172a', fontSize: 14, fontWeight: 800, outline: 'none', textAlign: 'center', border: 'none' }} />
            <span style={{ fontSize: 11, color: '#94a3b8' }}>pers.</span>
          </div>
          {canWrite && <button onClick={() => { setObjEdit(obj); setShowObj(true); }} className="db-btn-secondary"><Settings size={14} /> Objectifs</button>}
          <button onClick={charger} className="db-btn-primary"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Recalculer</button>
        </div>
      </div>

      {showObj && canWrite && (
        <div className="db-panel p-5" style={{ border: '1px solid rgba(59,130,246,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}><h3 style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}><Target size={15} className="text-blue-500" /> Objectifs annuels</h3><button onClick={() => setShowObj(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: 16 }}>
            {[{ label: 'Effectif', key: 'effectif' as keyof KpiObj, step: 1 }, { label: 'H/an', key: 'h_an' as keyof KpiObj, step: 1 }, { label: 'TF objectif (≤)', key: 'tf' as keyof KpiObj, step: 0.1 }, { label: 'TG objectif (≤)', key: 'tg' as keyof KpiObj, step: 0.1 }, { label: 'Clôture PDCA (≥%)', key: 'taux_cloture' as keyof KpiObj, step: 1 }, { label: 'Habilitations (≥%)', key: 'taux_habs' as keyof KpiObj, step: 1 }, { label: 'Maîtrise risques (≥%)', key: 'taux_maitrise' as keyof KpiObj, step: 1 }, { label: 'AT arrêt (≤)', key: 'acc_arret' as keyof KpiObj, step: 1 }].map(f => (
              <div key={f.key}><label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>{f.label}</label><input type="number" step={f.step} value={objEdit[f.key] as number} onChange={e => setObjEdit(p => ({ ...p, [f.key]: Number(e.target.value) }))} style={{ padding: '7px 10px', fontSize: 14, fontWeight: 700, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 7, outline: 'none', width: '100%' }} /></div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}><button onClick={() => setShowObj(false)} className="db-btn-secondary">Annuler</button><button onClick={sauvegarderObj} className="db-btn-primary"><Save size={13} /> Sauvegarder</button></div>
        </div>
      )}

      {/* Score global */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="db-panel p-6" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 96, height: 96, borderRadius: '50%', border: `4px solid ${scoreColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 24px ${scoreColor}25`, marginBottom: 10 }}>
            <span style={{ fontSize: c.scoreGlobal === null ? 18 : 30, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{c.scoreGlobal === null ? 'N/A' : c.scoreGlobal}</span>
            {c.scoreGlobal !== null && <span style={{ fontSize: 10, color: '#64748b' }}>/100</span>}
          </div>
          <p style={{ fontSize: 14, fontWeight: 800, color: scoreColor }}>{c.scoreGlobal === null ? 'Données insuffisantes' : c.scoreGlobal >= 80 ? 'Excellent' : c.scoreGlobal >= 60 ? 'Satisfaisant' : 'À améliorer'}</p>
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Score global SMI</p>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>Base : {c.heures.toLocaleString('fr-FR')} h</p>
        </div>
        <div className="db-panel p-5 lg:col-span-2">
          <h3 style={{ fontWeight: 700, marginBottom: 12, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}><Target size={15} className="text-blue-500" /> Atteinte des objectifs</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Taux de Fréquence', val: c.TF, ok: c.TF <= obj.tf, inverse: true, objStr: `≤${obj.tf}` },
              { label: 'Taux de Gravité', val: c.TG, ok: c.TG <= obj.tg, inverse: true, objStr: `≤${obj.tg}` },
              { label: 'Clôture PDCA', val: c.tauxCloture !== null ? `${c.tauxCloture}%` : 'N/A', ok: c.tauxCloture !== null && c.tauxCloture >= obj.taux_cloture, hasData: c.tauxCloture !== null, objStr: `≥${obj.taux_cloture}%` },
              { label: 'Habilitations valides', val: c.tauxHabs !== null ? `${c.tauxHabs}%` : 'N/A', ok: c.tauxHabs !== null && c.tauxHabs >= obj.taux_habs, hasData: c.tauxHabs !== null, objStr: `≥${obj.taux_habs}%` },
              { label: 'Maîtrise risques', val: c.tauxMaitrise !== null ? `${c.tauxMaitrise}%` : 'N/A', ok: c.tauxMaitrise !== null && c.tauxMaitrise >= obj.taux_maitrise, hasData: c.tauxMaitrise !== null, objStr: `≥${obj.taux_maitrise}%` },
              { label: 'AT avec arrêt', val: c.accArret, ok: c.accArret <= obj.acc_arret, inverse: true, objStr: `≤${obj.acc_arret}` },
              { label: 'Actions en retard', val: c.actRetard, ok: c.actRetard <= obj.actions_retard, inverse: true, objStr: `≤${obj.actions_retard}` },
            ].map((o, i) => {
              const hasData = 'hasData' in o ? o.hasData : true;
              const color = !hasData ? '#64748b' : o.ok ? '#10b981' : '#f59e0b';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#f8fafc', borderRadius: 8, border: `1px solid ${!hasData ? '#e2e8f0' : o.ok ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: '#334155' }}>{o.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color }}>{o.val}</span>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>obj:{o.objStr}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* KPIs Sécurité */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={13} className="text-red-400" /> Indicateurs Sécurité</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { titre: 'Taux de Fréquence (TF)', val: c.TF, sous: 'Acc.×10⁶ / h travaillées', icon: <Activity size={20} />, color: c.TF === 0 ? '#10b981' : c.TF <= obj.tf ? '#f59e0b' : '#ef4444' },
            { titre: 'Taux de Gravité (TG)', val: c.TG, sous: `${c.jours} jours perdus`, icon: <TrendingDown size={20} />, color: c.TG === 0 ? '#10b981' : c.TG <= obj.tg ? '#f59e0b' : '#ef4444' },
            { titre: 'Accidents avec arrêt', val: c.accArret, sous: `+ ${c.accSansArret} soins`, icon: <AlertTriangle size={20} />, color: c.accArret === 0 ? '#10b981' : '#ef4444' },
            { titre: "Presqu'accidents", val: c.presquAcc, sous: 'Événements précurseurs', icon: <Shield size={20} />, color: '#3b82f6' },
          ].map((k, i) => (
            <div key={i} className="db-panel p-5" style={{ borderLeft: `4px solid ${k.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', flex: 1, lineHeight: 1.3 }}>{k.titre}</p>
                <div style={{ padding: 8, borderRadius: 10, background: `${k.color}15`, color: k.color, flexShrink: 0, marginLeft: 8 }}>{k.icon}</div>
              </div>
              <p style={{ fontSize: 36, fontWeight: 900, color: '#0f172a' }}>{k.val}</p>
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{k.sous}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs Conformité */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Target size={13} className="text-blue-400" /> Taux de Conformité</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { titre: "Clôture Plan d'Actions", val: c.tauxCloture, sous: `${c.actTerminees}/${c.totalActions} terminées`, icon: <CheckCircle size={20} />, color: c.tauxCloture === null ? '#3b82f6' : c.tauxCloture >= obj.taux_cloture ? '#10b981' : '#f59e0b' },
            { titre: 'Actions en retard', val: c.actRetard, sous: 'Échéances dépassées', icon: <AlertTriangle size={20} />, color: c.actRetard === 0 ? '#10b981' : '#ef4444' },
            { titre: 'Habilitations valides', val: c.tauxHabs, sous: `${c.habValides}/${c.totalHabs}`, icon: <CheckCircle size={20} />, color: c.tauxHabs === null ? '#3b82f6' : c.tauxHabs >= obj.taux_habs ? '#10b981' : '#f59e0b' },
            { titre: 'Maîtrise des risques', val: c.tauxMaitrise, sous: `${c.risqAcc} acc. / ${c.risqCrit} critiques`, icon: <Shield size={20} />, color: c.tauxMaitrise === null ? '#3b82f6' : c.tauxMaitrise >= obj.taux_maitrise ? '#10b981' : '#f59e0b' },
          ].map((k, i) => (
            <div key={i} className="db-panel p-5" style={{ borderLeft: `4px solid ${k.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', flex: 1, lineHeight: 1.3 }}>{k.titre}</p>
                <div style={{ padding: 8, borderRadius: 10, background: `${k.color}15`, color: k.color, flexShrink: 0, marginLeft: 8 }}>{k.icon}</div>
              </div>
              <p style={{ fontSize: 36, fontWeight: 900, color: '#0f172a' }}>{k.val !== null ? `${k.val}${i === 0 || i === 2 || i === 3 ? '%' : ''}` : 'N/A'}</p>
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{k.sous}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="db-panel p-5">
          <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={14} className="text-red-400" /> Évolution TF — 12 mois</h3>
          {c.accChart.length === 0 ? (
            <div style={{ height: 176, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}><CheckCircle size={24} className="text-emerald-400" /><p style={{ color: '#047857', fontWeight: 700, fontSize: 14 }}>TF = 0 sur toute la période</p></div>
          ) : (
            <div style={{ height: 176 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={c.accChart}>
                  <defs><linearGradient id="tfGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="mois" stroke="#e2e8f0" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis stroke="#e2e8f0" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 11 }} />
                  <ReferenceLine y={obj.tf} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `Obj.${obj.tf}`, fill: '#f59e0b', fontSize: 10 }} />
                  <Area type="monotone" dataKey="TF" name="TF" stroke="#ef4444" fill="url(#tfGrad)" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        {c.parDomaine.length > 0 && (
          <div className="db-panel p-5">
            <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}><Target size={14} className="text-blue-400" /> Clôture actions par domaine</h3>
            <div style={{ height: 176 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={c.parDomaine} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="#e2e8f0" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
                  <YAxis type="category" dataKey="domaine" stroke="#e2e8f0" tick={{ fill: '#64748b', fontSize: 11 }} width={70} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 11 }} formatter={(v: number) => [`${v}%`, 'Taux']} />
                  <ReferenceLine x={obj.taux_cloture} stroke="#f59e0b" strokeDasharray="4 4" />
                  <Bar dataKey="taux" name="Taux clôture" radius={[0, 6, 6, 0]}>
                    {c.parDomaine.map((d, i) => <Cell key={i} fill={d.taux >= obj.taux_cloture ? '#10b981' : d.taux >= 50 ? '#f59e0b' : '#ef4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Formules */}
      <div className="db-panel p-5" style={{ border: '1px solid rgba(59,130,246,0.15)' }}>
        <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: 12 }}>Formules réglementaires</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { titre: 'Taux de Fréquence (TF)', formule: 'TF = (Acc. avec arrêt × 1 000 000) / H travaillées', detail: `${obj.effectif} pers. × ${obj.h_an}h/an = ${c.heures.toLocaleString('fr-FR')}h` },
            { titre: 'Taux de Gravité (TG)', formule: 'TG = (Jours perdus × 1 000) / H travaillées', detail: `Jours perdus cumulés : ${c.jours} jour(s)` },
          ].map((f, i) => (
            <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 4 }}>{f.titre}</p>
              <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#2563eb' }}>{f.formule}</p>
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{f.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
