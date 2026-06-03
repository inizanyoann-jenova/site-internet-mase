// src/dashboard/Habilitations.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, GraduationCap, AlertTriangle, UserCheck, RefreshCw, Filter, X, Save, Users, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { calcExpiration, diffJours } from './kpi-utils';

interface Props {
  companyId: string;
  canWrite: boolean;
}

interface Habilitation {
  id: string;
  company_id: string;
  employe: string;
  domaine: string;
  obtention: string | null;
  validite_ans: number;
}

const LISTE_HABILITATIONS = [
  'SST (Sauveteur Secouriste du Travail)', 'ATEX - NV0', 'ATEX - NV1', 'ATEX - NV2',
  'CACES R486 (PEMP / Nacelles)', 'CACES R489 (Chariots de manutention)',
  'CACES R482 (Engins de chantier)', 'Électrique - B0/H0',
  'Électrique - BS/BE/Manœuvre', 'Électrique - B1V/B2V/BR/BC (BT)',
  'Travail en hauteur / Harnais', 'Espaces Confinés (CATEC)',
  'AIPR (Proximité réseaux)', 'Incendie - EPI / ESI',
  'Risque Chimique N1', 'Risque Chimique N2', 'Risque Amiante SS4',
  'Gestes et Postures / PRAP', 'Habilitation routière (permis B)', 'Autre',
];

const VALIDITES = [1, 2, 3, 4, 5, 10];

function getStatut(obtention: string | null, validite_ans: number): { label: string; color: string; j: number | null } {
  if (!obtention) return { label: 'À définir', color: '#64748b', j: null };
  const exp = calcExpiration(obtention, validite_ans);
  if (!exp) return { label: 'À définir', color: '#64748b', j: null };
  const j = diffJours(exp);
  if (j === null) return { label: 'À définir', color: '#64748b', j: null };
  if (j < 0)   return { label: 'Périmée',    color: '#ef4444', j };
  if (j <= 30) return { label: '< 30 jours', color: '#f59e0b', j };
  if (j <= 90) return { label: '< 90 jours', color: '#3b82f6', j };
  return          { label: 'Valide',         color: '#10b981', j };
}

export default function Habilitations({ companyId, canWrite }: Props) {
  const [habs, setHabs] = useState<Habilitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filtreStatut, setFS] = useState('Tous');
  const [filtreEmploye, setFE] = useState('Tous');
  const [vueEmploye, setVE] = useState(false);
  const [form, setForm] = useState({ employe: '', domaine: LISTE_HABILITATIONS[0], obtention: new Date().toISOString().split('T')[0], validite_ans: 2 });

  useEffect(() => { fetchHabs(); }, []);

  async function fetchHabs() {
    setLoading(true);
    const { data } = await supabase.from('habilitations').select('*').order('employe');
    if (data) setHabs(data as Habilitation[]);
    setLoading(false);
  }

  function updateLocal(id: string, field: keyof Habilitation, value: unknown) {
    setHabs(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  async function saveRow(row: Habilitation) {
    setSaving(row.id);
    await supabase.from('habilitations').update({ employe: row.employe, domaine: row.domaine, obtention: row.obtention, validite_ans: row.validite_ans }).eq('id', row.id);
    setSaving(null);
  }

  async function ajouterHab() {
    if (!form.employe.trim()) return;
    const { data } = await supabase.from('habilitations').insert([{ ...form, company_id: companyId }]).select();
    if (data) {
      setHabs(prev => [...prev, data[0] as Habilitation].sort((a, b) => a.employe.localeCompare(b.employe)));
      setShowForm(false);
      setForm({ employe: '', domaine: LISTE_HABILITATIONS[0], obtention: new Date().toISOString().split('T')[0], validite_ans: 2 });
    }
  }

  async function deleteRow(id: string) {
    await supabase.from('habilitations').delete().eq('id', id);
    setHabs(prev => prev.filter(r => r.id !== id));
  }

  const kpis = useMemo(() => {
    const perimees  = habs.filter(h => getStatut(h.obtention, h.validite_ans).label === 'Périmée').length;
    const bientot30 = habs.filter(h => getStatut(h.obtention, h.validite_ans).label === '< 30 jours').length;
    const bientot90 = habs.filter(h => getStatut(h.obtention, h.validite_ans).label === '< 90 jours').length;
    const valides   = habs.filter(h => getStatut(h.obtention, h.validite_ans).label === 'Valide').length;
    const employes  = [...new Set(habs.map(h => h.employe).filter(Boolean))].length;
    const taux = habs.length > 0 ? Math.round((valides / habs.length) * 100) : 100;
    return { total: habs.length, perimees, bientot30, bientot90, valides, employes, taux };
  }, [habs]);

  const employes = useMemo(() => ['Tous', ...[...new Set(habs.map(h => h.employe).filter(Boolean))].sort()], [habs]);

  const habsFiltrees = useMemo(() => habs.filter(h => {
    if (filtreEmploye !== 'Tous' && h.employe !== filtreEmploye) return false;
    if (filtreStatut !== 'Tous') {
      const st = getStatut(h.obtention, h.validite_ans);
      if (filtreStatut === 'Périmées'   && st.label !== 'Périmée')    return false;
      if (filtreStatut === '< 30 jours' && st.label !== '< 30 jours') return false;
      if (filtreStatut === 'Valides'    && !['Valide', '< 90 jours'].includes(st.label)) return false;
    }
    return true;
  }), [habs, filtreEmploye, filtreStatut]);

  const habsParEmploye = useMemo(() => {
    const map: Record<string, Habilitation[]> = {};
    habsFiltrees.forEach(h => { if (!map[h.employe]) map[h.employe] = []; map[h.employe].push(h); });
    return map;
  }, [habsFiltrees]);

  const inp: React.CSSProperties = { padding: '6px 10px', fontSize: 13, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 7, color: '#0f172a', fontFamily: 'inherit', outline: 'none', width: '100%' };

  return (
    <div className="space-y-5 pb-10">
      <div className="db-page-header">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--mase-heading)]"><GraduationCap size={22} className="text-blue-500" /> Habilitations &amp; Compétences</h2>
          <p className="text-sm text-[var(--mase-muted)] mt-1">Suivi des habilitations et alertes d'expiration</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setVE(!vueEmploye)} className="db-btn-secondary" style={vueEmploye ? { borderColor: 'rgba(59,130,246,0.4)', color: '#2563eb' } : {}}>
            <Users size={15} /> {vueEmploye ? 'Vue liste' : 'Vue par employé'}
          </button>
          <button onClick={fetchHabs} className="db-btn-secondary"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualiser</button>
          {canWrite && <button onClick={() => setShowForm(true)} className="db-btn-primary"><Plus size={15} /> Délivrer une habilitation</button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', val: kpis.total, color: '#3b82f6', sub: `${kpis.employes} employés` },
          { label: 'Valides', val: kpis.valides, color: '#10b981', sub: `Taux : ${kpis.taux}%` },
          { label: 'Périmées', val: kpis.perimees, color: kpis.perimees > 0 ? '#ef4444' : '#10b981', sub: 'Urgent' },
          { label: '< 30 jours', val: kpis.bientot30, color: kpis.bientot30 > 0 ? '#f59e0b' : '#10b981', sub: 'À planifier' },
          { label: '< 90 jours', val: kpis.bientot90, color: '#3b82f6', sub: 'À anticiper' },
        ].map((k, i) => (
          <div key={i} className="db-kpi">
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 4 }}>{k.label}</p>
            <p style={{ fontSize: 32, fontWeight: 900, color: k.color }}>{k.val}</p>
            {i === 1 && <div style={{ height: 3, background: '#e2e8f0', borderRadius: 2, margin: '6px 0 2px' }}><div style={{ height: '100%', width: `${kpis.taux}%`, background: '#10b981', borderRadius: 2 }} /></div>}
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {kpis.perimees > 0 && <div className="db-alert-red"><AlertTriangle size={16} className="shrink-0" /><div><p style={{ fontWeight: 600 }}>{kpis.perimees} habilitation(s) périmée(s) — Renouvellement obligatoire</p><p style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>{habs.filter(h => getStatut(h.obtention, h.validite_ans).label === 'Périmée').map(h => `${h.employe} (${h.domaine?.substring(0, 20)})`).join(' · ')}</p></div></div>}
      {kpis.bientot30 > 0 && <div className="db-alert-amber"><Clock size={16} className="shrink-0" /><p style={{ fontWeight: 600 }}>{kpis.bientot30} habilitation(s) à renouveler dans moins de 30 jours</p></div>}

      {showForm && canWrite && (
        <div className="db-panel p-5" style={{ border: '1px solid rgba(59,130,246,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, color: '#0f172a' }}>Nouvelle habilitation</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginBottom: 14 }}>
            <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Employé *</label><input type="text" value={form.employe} onChange={e => setForm({ ...form, employe: e.target.value })} placeholder="Nom Prénom..." style={inp} /></div>
            <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Domaine *</label><select value={form.domaine} onChange={e => setForm({ ...form, domaine: e.target.value })} style={inp}>{LISTE_HABILITATIONS.map(h => <option key={h}>{h}</option>)}</select></div>
            <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Date d'obtention</label><input type="date" value={form.obtention} onChange={e => setForm({ ...form, obtention: e.target.value })} style={inp} /></div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Validité</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {VALIDITES.map(v => (
                  <button key={v} onClick={() => setForm({ ...form, validite_ans: v })}
                    style={{ flex: 1, padding: '7px 4px', borderRadius: 7, border: '1px solid', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: form.validite_ans === v ? 'rgba(59,130,246,0.15)' : '#f8fafc', borderColor: form.validite_ans === v ? 'rgba(59,130,246,0.4)' : '#e2e8f0', color: form.validite_ans === v ? '#2563eb' : '#64748b' }}>
                    {v}an{v > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {form.obtention && (() => {
            const st = getStatut(form.obtention, form.validite_ans);
            const exp = calcExpiration(form.obtention, form.validite_ans);
            return <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
              <span style={{ color: '#64748b' }}>Expiration : </span>
              <strong style={{ color: st.color }}>{exp?.toLocaleDateString('fr-FR') || '—'}</strong>
              <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, color: st.color, background: `${st.color}15`, border: `1px solid ${st.color}40`, padding: '2px 8px', borderRadius: 100 }}>{st.label}</span>
            </div>;
          })()}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(false)} className="db-btn-secondary">Annuler</button>
            <button onClick={ajouterHab} disabled={!form.employe.trim()} className="db-btn-primary"><Save size={14} /> Enregistrer</button>
          </div>
        </div>
      )}

      <div className="db-panel p-3" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Filter size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
        <select value={filtreEmploye} onChange={e => setFE(e.target.value)} style={{ padding: '5px 10px', fontSize: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, color: '#334155', outline: 'none' }}>
          {employes.map(e => <option key={e}>{e}</option>)}
        </select>
        <div style={{ width: 1, height: 16, background: '#e2e8f0' }} />
        {['Tous', 'Périmées', '< 30 jours', 'Valides'].map(s => {
          const c = s === 'Périmées' ? '#ef4444' : s === '< 30 jours' ? '#f59e0b' : s === 'Valides' ? '#10b981' : '#3b82f6';
          return <button key={s} onClick={() => setFS(s)} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, border: '1px solid', cursor: 'pointer', background: filtreStatut === s ? `${c}15` : '#f8fafc', borderColor: filtreStatut === s ? `${c}50` : '#e2e8f0', color: filtreStatut === s ? c : '#64748b' }}>{s}</button>;
        })}
        {(filtreEmploye !== 'Tous' || filtreStatut !== 'Tous') && (
          <button onClick={() => { setFE('Tous'); setFS('Tous'); }} style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
            <X size={11} /> Reset
          </button>
        )}
        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>{habsFiltrees.length} ligne(s)</span>
      </div>

      {vueEmploye ? (
        <div className="space-y-4">
          {Object.keys(habsParEmploye).sort().map(emp => {
            const liste = habsParEmploye[emp];
            const np = liste.filter(h => getStatut(h.obtention, h.validite_ans).label === 'Périmée').length;
            const n30 = liste.filter(h => getStatut(h.obtention, h.validite_ans).label === '< 30 jours').length;
            return (
              <div key={emp} className="db-panel" style={{ overflow: 'hidden', borderLeft: `3px solid ${np > 0 ? '#ef4444' : n30 > 0 ? '#f59e0b' : '#10b981'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'white' }}>{emp.charAt(0).toUpperCase()}</div>
                    <div><p style={{ fontWeight: 700, color: '#0f172a' }}>{emp}</p><p style={{ fontSize: 12, color: '#64748b' }}>{liste.length} habilitation(s)</p></div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {np > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: 100 }}>{np} périmée(s)</span>}
                    {n30 > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: 100 }}>{n30} bientôt</span>}
                  </div>
                </div>
                {liste.map(h => {
                  const st = getStatut(h.obtention, h.validite_ans);
                  const exp = calcExpiration(h.obtention, h.validite_ans);
                  return (
                    <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #f8fafc' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{h.domaine}</p>
                        <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Obtenu le {h.obtention || '—'} · {h.validite_ans}an{h.validite_ans > 1 ? 's' : ''} · Expire le {exp?.toLocaleDateString('fr-FR') || '—'}</p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: `${st.color}15`, border: `1px solid ${st.color}40`, padding: '2px 8px', borderRadius: 100, flexShrink: 0 }}>{st.label}{st.j !== null && st.j >= 0 ? ` · ${st.j}j` : ''}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {Object.keys(habsParEmploye).length === 0 && <div className="db-panel" style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Aucune habilitation pour ces filtres.</div>}
        </div>
      ) : (
        <div className="db-panel" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><RefreshCw size={24} className="animate-spin text-blue-400" style={{ margin: '0 auto 8px' }} /><p style={{ color: '#64748b', fontSize: 14 }}>Chargement...</p></div>
          ) : habsFiltrees.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}><UserCheck size={32} className="text-emerald-400" style={{ margin: '0 auto 8px' }} /><p style={{ fontWeight: 700, color: '#0f172a' }}>{habs.length === 0 ? 'Aucune habilitation. Cliquez sur "Délivrer une habilitation".' : 'Aucun résultat.'}</p></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="db-table">
                <thead>
                  <tr>
                    <th>Employé</th>
                    <th>Domaine</th>
                    <th style={{ width: 120, textAlign: 'center' }}>Obtention</th>
                    <th style={{ width: 160, textAlign: 'center' }}>Validité</th>
                    <th style={{ width: 120, textAlign: 'center' }}>Expiration</th>
                    <th style={{ width: 140, textAlign: 'center' }}>Statut</th>
                    <th style={{ width: 50 }} />
                  </tr>
                </thead>
                <tbody>
                  {habsFiltrees.map(row => {
                    const st = getStatut(row.obtention, row.validite_ans);
                    const exp = calcExpiration(row.obtention, row.validite_ans);
                    return (
                      <tr key={row.id} style={{ borderLeft: st.label === 'Périmée' ? '3px solid #ef4444' : st.label === '< 30 jours' ? '3px solid #f59e0b' : undefined }}>
                        <td><input value={row.employe || ''} onChange={e => updateLocal(row.id, 'employe', e.target.value)} onBlur={() => saveRow(habs.find(h => h.id === row.id)!)} style={{ ...inp, padding: '5px 8px', fontSize: 13 }} /></td>
                        <td><select value={row.domaine || ''} onChange={e => updateLocal(row.id, 'domaine', e.target.value)} onBlur={() => saveRow(habs.find(h => h.id === row.id)!)} style={{ ...inp, padding: '5px 8px', fontSize: 12 }}>{LISTE_HABILITATIONS.map(h => <option key={h}>{h}</option>)}</select></td>
                        <td><input type="date" value={row.obtention || ''} onChange={e => updateLocal(row.id, 'obtention', e.target.value)} onBlur={() => saveRow(habs.find(h => h.id === row.id)!)} style={{ ...inp, padding: '5px 8px', fontSize: 12 }} /></td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: 3 }}>
                            {VALIDITES.map(v => (
                              <button key={v} onClick={() => { updateLocal(row.id, 'validite_ans', v); setTimeout(() => saveRow({ ...row, validite_ans: v }), 0); }}
                                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid', cursor: 'pointer', fontSize: 10, fontWeight: 700, background: Number(row.validite_ans) === v ? 'rgba(59,130,246,0.15)' : '#f8fafc', borderColor: Number(row.validite_ans) === v ? 'rgba(59,130,246,0.4)' : '#e2e8f0', color: Number(row.validite_ans) === v ? '#2563eb' : '#64748b' }}>
                                {v}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}><span style={{ fontSize: 12, fontWeight: 600, color: st.color }}>{exp?.toLocaleDateString('fr-FR') || '—'}</span></td>
                        <td style={{ textAlign: 'center' }}><span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: `${st.color}15`, border: `1px solid ${st.color}40`, padding: '2px 8px', borderRadius: 100 }}>{st.label}{st.j !== null && st.j >= 0 ? ` · ${st.j}j` : ''}</span></td>
                        <td style={{ textAlign: 'center' }}>
                          {saving === row.id ? <RefreshCw size={12} className="animate-spin text-blue-400" /> : canWrite && <button onClick={() => deleteRow(row.id)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}><Trash2 size={14} /></button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
