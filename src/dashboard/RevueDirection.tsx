// src/dashboard/RevueDirection.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { calcExpiration } from './kpi-utils';
import { FileText, RefreshCw, CheckCircle, AlertTriangle, Shield, Users, Activity, Target, TrendingUp, TrendingDown, Printer } from 'lucide-react';

interface Props { companyId: string; companyName: string; effectif?: number; hAn?: number; }

export default function RevueDirection({ companyId, companyName, effectif = 50, hAn = 1607 }: Props) {
  const [data, setData] = useState<{ accidents: Array<{ type_evenement: string; jours_perdus: number; statut_enquete: string }>; actions: Array<{ statut: string; echeance: string | null }>; habilitations: Array<{ obtention: string | null; validite_ans: number }>; risques: Array<{ criticite: number }> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);

  useEffect(() => { charger(); }, []);

  async function charger() {
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
    const TG = joursPerdus > 0 ? ((joursPerdus * 1000) / heures).toFixed(2) : '0.00';
    const actTerminees = actions.filter(a => a.statut?.includes('Terminé'));
    const actRetard = actions.filter(a => { if (!a.echeance || a.statut?.includes('Terminé') || a.statut?.includes('Annulé')) return false; return new Date(a.echeance) < now; });
    const tauxCloture = actions.length > 0 ? Math.round((actTerminees.length / actions.length) * 100) : 0;
    const habsValides = habilitations.filter(h => { const exp = calcExpiration(h.obtention, h.validite_ans); return exp !== null && exp > now; });
    const habsPerimees = habilitations.filter(h => { const exp = calcExpiration(h.obtention, h.validite_ans); return exp !== null && exp <= now; });
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
    const sc = stats.scoreGlobal >= 70 ? '#10b981' : '#f59e0b';
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Revue de Direction ${annee} — ${companyName}</title><style>@page{margin:2cm;size:A4}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;font-size:12px;line-height:1.6}.cover{height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;background:linear-gradient(135deg,#0f172a,#1e3a5f);color:white;text-align:center;page-break-after:always}.cover h1{font-size:32px;font-weight:900;margin-bottom:12px}.cover h2{font-size:18px;font-weight:400;opacity:.7}.score-badge{margin:30px auto;width:120px;height:120px;border-radius:50%;border:4px solid ${sc};display:flex;flex-direction:column;align-items:center;justify-content:center}.score-val{font-size:36px;font-weight:900;color:${sc}}h2.s{font-size:16px;font-weight:800;color:#1e3a5f;border-left:4px solid #3b82f6;padding-left:12px;margin:24px 0 14px}.kpi-g{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}.kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;text-align:center}.kpi-v{font-size:26px;font-weight:900}.kpi-l{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-top:4px}.al{display:flex;gap:8px;padding:10px 14px;border-radius:8px;margin-bottom:8px;font-size:12px}.al-r{background:#fef2f2;border:1px solid #fecaca;color:#991b1b}.al-g{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px}.card h4{font-size:12px;font-weight:700;color:#334155;margin-bottom:10px}ul.l{padding-left:16px}ul.l li{font-size:12px;color:#475569;margin-bottom:4px}.pb{page-break-before:always}.footer{margin-top:40px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;color:#94a3b8;font-size:10px}</style></head><body>
<div class="cover"><div style="font-size:13px;opacity:.5;text-transform:uppercase;letter-spacing:.1em;margin-bottom:16px">${companyName} — SMI Dashboard</div><h1>Revue de Direction</h1><h2>Rapport annuel ${annee}</h2><div class="score-badge"><div class="score-val">${stats.scoreGlobal}</div><div style="font-size:11px;color:#94a3b8">Score SMI</div></div><div style="font-size:16px;font-weight:600;color:${sc}">${stats.scoreGlobal >= 80 ? 'Excellent' : stats.scoreGlobal >= 60 ? 'Satisfaisant' : 'À améliorer'}</div><div style="font-size:12px;color:#64748b;margin-top:20px">Généré le ${date}</div></div>
<h2 class="s">1. Bilan Sécurité &amp; Accidentologie</h2><div class="kpi-g"><div class="kpi"><div class="kpi-v" style="color:${stats.accArret.length === 0 ? '#10b981' : '#ef4444'}">${stats.accArret.length}</div><div class="kpi-l">Accidents avec arrêt</div></div><div class="kpi"><div class="kpi-v" style="color:${stats.joursPerdus === 0 ? '#10b981' : '#ef4444'}">${stats.joursPerdus}</div><div class="kpi-l">Jours perdus</div></div><div class="kpi"><div class="kpi-v" style="color:${Number(stats.TF) === 0 ? '#10b981' : '#ef4444'}">${stats.TF}</div><div class="kpi-l">Taux de Fréquence</div></div><div class="kpi"><div class="kpi-v" style="color:${Number(stats.TG) === 0 ? '#10b981' : '#f59e0b'}">${stats.TG}</div><div class="kpi-l">Taux de Gravité</div></div></div>${stats.accArret.length === 0 ? '<div class="al al-g">✓ Aucun accident avec arrêt — Objectif zéro AT atteint.</div>' : `<div class="al al-r">⚠ ${stats.accArret.length} accident(s) avec arrêt — Actions correctives requises.</div>`}
<h2 class="s">2. Plan d'Actions (PDCA)</h2><div class="kpi-g"><div class="kpi"><div class="kpi-v" style="color:#3b82f6">${stats.totalActions}</div><div class="kpi-l">Total actions</div></div><div class="kpi"><div class="kpi-v" style="color:#10b981">${stats.actTerminees.length}</div><div class="kpi-l">Terminées</div></div><div class="kpi"><div class="kpi-v" style="color:${stats.actRetard.length === 0 ? '#10b981' : '#ef4444'}">${stats.actRetard.length}</div><div class="kpi-l">En retard</div></div><div class="kpi"><div class="kpi-v" style="color:${stats.tauxCloture >= 70 ? '#10b981' : '#f59e0b'}">${stats.tauxCloture}%</div><div class="kpi-l">Taux de clôture</div></div></div>
<h2 class="s">3. Habilitations</h2><div class="kpi-g"><div class="kpi"><div class="kpi-v" style="color:#3b82f6">${stats.totalHabs}</div><div class="kpi-l">Total</div></div><div class="kpi"><div class="kpi-v" style="color:#10b981">${stats.habsValides.length}</div><div class="kpi-l">Valides</div></div><div class="kpi"><div class="kpi-v" style="color:${stats.habsPerimees.length === 0 ? '#10b981' : '#ef4444'}">${stats.habsPerimees.length}</div><div class="kpi-l">Périmées</div></div><div class="kpi"><div class="kpi-v" style="color:${stats.tauxHabs >= 90 ? '#10b981' : '#f59e0b'}">${stats.tauxHabs}%</div><div class="kpi-l">Taux validité</div></div></div>
<div class="pb"></div><h2 class="s">4. Évaluation des Risques (DUERP)</h2><div class="kpi-g"><div class="kpi"><div class="kpi-v" style="color:#3b82f6">${stats.totalRisques}</div><div class="kpi-l">Évalués</div></div><div class="kpi"><div class="kpi-v" style="color:${stats.risquesCritiques.length === 0 ? '#10b981' : '#ef4444'}">${stats.risquesCritiques.length}</div><div class="kpi-l">Critiques ≥9</div></div><div class="kpi"><div class="kpi-v" style="color:${stats.tauxMaitrise >= 70 ? '#10b981' : '#f59e0b'}">${stats.tauxMaitrise}%</div><div class="kpi-l">Taux maîtrise</div></div></div>
<h2 class="s">5. Points forts &amp; Axes d'amélioration</h2><div class="two-col"><div class="card" style="border-left:4px solid #10b981"><h4 style="color:#166534">✓ Points forts ${annee}</h4><ul class="l">${stats.pointsForts.map(p => `<li>${p}</li>`).join('') || '<li style="color:#94a3b8">À compléter lors de la revue</li>'}</ul></div><div class="card" style="border-left:4px solid #ef4444"><h4 style="color:#991b1b">⚠ Axes d'amélioration</h4><ul class="l">${stats.axesAmelioration.map(a => `<li>${a}</li>`).join('') || '<li style="color:#94a3b8">Aucun axe majeur identifié</li>'}</ul></div></div>
<div class="footer"><span>${companyName} — SMI Dashboard — Revue de Direction ${annee}</span><span>Généré le ${date} — CONFIDENTIEL</span></div></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => { w.print(); setGenerating(false); }, 800); }
    else setGenerating(false);
  }

  if (loading || !stats) return <div className="flex items-center justify-center h-64"><div className="text-center"><RefreshCw size={28} className="animate-spin text-blue-400 mx-auto mb-2" /><p className="text-slate-500 text-sm">Chargement...</p></div></div>;

  const scoreColor = stats.scoreGlobal >= 80 ? '#10b981' : stats.scoreGlobal >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-6 pb-10">
      <div className="db-page-header">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--mase-heading)]"><FileText size={22} className="text-blue-500" /> Revue de Direction</h2>
          <p className="text-sm text-[var(--mase-muted)] mt-1">Synthèse automatique de la performance SMI — prête à présenter</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="db-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Année :</span>
            <input type="number" value={annee} onChange={e => setAnnee(Number(e.target.value))} style={{ background: 'transparent', color: '#0f172a', fontWeight: 700, fontSize: 14, outline: 'none', width: 64, textAlign: 'center', border: 'none' }} />
          </div>
          <button onClick={charger} className="db-btn-secondary"><RefreshCw size={15} /> Actualiser</button>
          <button onClick={genererRapport} disabled={generating} className="db-btn-primary" style={{ background: 'linear-gradient(135deg,#4f63e7,#06b6d4)' }}><Printer size={15} /> {generating ? 'Génération...' : 'Générer le rapport PDF'}</button>
        </div>
      </div>

      {/* Score global */}
      <div className="db-panel p-6" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', border: `4px solid ${scoreColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 24px ${scoreColor}30` }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: scoreColor }}>{stats.scoreGlobal}</span>
            <span style={{ fontSize: 10, color: '#64748b' }}>/ 100</span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: scoreColor, marginTop: 8 }}>{stats.scoreGlobal >= 80 ? 'Excellent' : stats.scoreGlobal >= 60 ? 'Satisfaisant' : 'À améliorer'}</p>
          <p style={{ fontSize: 11, color: '#64748b' }}>Score SMI global</p>
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {[
            { label: 'Sécurité', val: `TF ${stats.TF}`, ok: Number(stats.TF) === 0, icon: <Shield size={15} /> },
            { label: 'Actions PDCA', val: `${stats.tauxCloture}%`, ok: stats.tauxCloture >= 70, icon: <Target size={15} /> },
            { label: 'Habilitations', val: `${stats.tauxHabs}%`, ok: stats.tauxHabs >= 90, icon: <Users size={15} /> },
            { label: 'Risques critiques', val: stats.risquesCritiques.length, ok: stats.risquesCritiques.length === 0, icon: <AlertTriangle size={15} /> },
            { label: 'AT arrêt', val: stats.accArret.length, ok: stats.accArret.length === 0, icon: <Activity size={15} /> },
            { label: 'Actions retard', val: stats.actRetard.length, ok: stats.actRetard.length === 0, icon: <Activity size={15} /> },
          ].map((item, i) => (
            <div key={i} className="db-panel p-3" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ color: item.ok ? '#10b981' : '#ef4444' }}>{item.icon}</div>
              <div><p style={{ fontSize: 11, color: '#64748b' }}>{item.label}</p><p style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{item.val}</p></div>
              {item.ok ? <CheckCircle size={13} className="text-emerald-400 ml-auto shrink-0" /> : <AlertTriangle size={13} className="text-red-400 ml-auto shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="db-panel p-5" style={{ borderLeft: '3px solid #10b981' }}>
          <h3 style={{ fontWeight: 700, marginBottom: 12, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUp size={16} className="text-emerald-500" /> Points forts {annee}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.pointsForts.length === 0 ? <p style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>À compléter lors de la revue</p> : stats.pointsForts.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}><CheckCircle size={13} className="text-emerald-400 shrink-0 mt-0.5" /><span style={{ fontSize: 13, color: '#475569' }}>{p}</span></div>
            ))}
          </div>
        </div>
        <div className="db-panel p-5" style={{ borderLeft: '3px solid #ef4444' }}>
          <h3 style={{ fontWeight: 700, marginBottom: 12, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}><TrendingDown size={16} className="text-red-400" /> Axes d'amélioration</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.axesAmelioration.length === 0 ? <p style={{ color: '#047857', fontSize: 13 }}>✓ Aucun axe majeur identifié — Excellent !</p> : stats.axesAmelioration.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}><AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" /><span style={{ fontSize: 13, color: '#475569' }}>{a}</span></div>
            ))}
          </div>
        </div>
      </div>

      <div className="db-panel p-5" style={{ display: 'flex', alignItems: 'center', gap: 16, border: '1px solid rgba(59,130,246,0.2)' }}>
        <div style={{ width: 44, height: 44, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Printer size={20} className="text-blue-500" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 600, color: '#0f172a' }}>Rapport complet prêt à imprimer</p>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Cliquez sur "Générer le rapport PDF" — utilisez Ctrl+P pour sauvegarder en PDF.</p>
        </div>
        <button onClick={genererRapport} disabled={generating} className="db-btn-primary" style={{ background: 'linear-gradient(135deg,#4f63e7,#06b6d4)', flexShrink: 0 }}><Printer size={14} /> Générer</button>
      </div>
    </div>
  );
}
