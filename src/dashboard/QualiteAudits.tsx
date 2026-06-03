// src/dashboard/QualiteAudits.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, RefreshCw, ClipboardCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { safeMean } from './kpi-utils';

interface Props { companyId: string; canWrite: boolean; }

interface Audit { id: string; titre: string; type_audit: string; processus: string; auditeur: string | null; date: string | null; statut: string; score: number; }
interface NC    { id: string; date_nc: string | null; processus: string; origine: string; type_nc: string; description: string; action_corrective: string; statut_nc: string; archived_at: string | null; }
interface Sat   { id: string; date_enquete: string | null; client: string; projet: string; note_globale: number; commentaire: string; }
interface QVT   { id: string; date_campagne: string | null; nom_campagne: string; effectif_total: number; reponses: number; note_moyenne: number; }

const TYPES_AUDIT  = ['Audit interne', 'Audit externe', 'Audit fournisseur', 'Audit certification', 'Audit à blanc'];
const PROCESSUS    = ['Direction', 'RH', 'QHSE', 'Achats', 'Commercial', 'Production', 'Maintenance', 'IT', 'Logistique'];
const STATUTS_AUD  = ['Planifié', 'En cours', 'Réalisé', 'Reporté'];
const TYPES_NC     = ['Mineure', 'Majeure', 'Critique'];
const ORIGINES_NC  = ['Interne', 'Client', 'Fournisseur', 'Audit', 'Réglementation'];
const STATUTS_NC   = ['Ouverte', "En cours d'analyse", 'Action définie', 'Clôturée'];

const AUD_COLOR: Record<string, string> = { 'Planifié': '#3B82F6', 'En cours': '#F59E0B', 'Réalisé': '#10B981', 'Reporté': '#EF4444' };
const NC_COLOR:  Record<string, string> = { 'Ouverte': '#EF4444', "En cours d'analyse": '#F59E0B', 'Action définie': '#3B82F6', 'Clôturée': '#10B981' };

const inp = { padding: '5px 8px', fontSize: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, color: '#0f172a', fontFamily: 'inherit', outline: 'none' } as React.CSSProperties;

export default function QualiteAudits({ companyId, canWrite }: Props) {
  const [tab, setTab]             = useState<'audits' | 'nc' | 'sat' | 'qvt'>('audits');
  const [audits, setAudits]       = useState<Audit[]>([]);
  const [ncs, setNcs]             = useState<NC[]>([]);
  const [sats, setSats]           = useState<Sat[]>([]);
  const [qvts, setQvts]           = useState<QVT[]>([]);
  const [loading, setLoading]     = useState(true);

  async function loadAll() {
    setLoading(true);
    const [rA, rN, rS, rQ] = await Promise.all([
      supabase.from('qualite_audits').select('*').order('created_at'),
      supabase.from('qualite_nc').select('*').is('archived_at', null).order('created_at'),
      supabase.from('qualite_satisfaction').select('*').order('created_at'),
      supabase.from('qualite_qvt').select('*').order('created_at'),
    ]);
    setAudits(rA.data ?? []);
    setNcs(rN.data ?? []);
    setSats(rS.data ?? []);
    setQvts(rQ.data ?? []);
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, []);

  const saveAudit = async (row: Audit) => { const { id, ...d } = row; await supabase.from('qualite_audits').update(d).eq('id', id); };
  const saveNC  = async (row: NC)  => { const { id, ...d } = row; await supabase.from('qualite_nc').update(d).eq('id', id); };
  const saveSat = async (row: Sat) => { const { id, ...d } = row; await supabase.from('qualite_satisfaction').update(d).eq('id', id); };
  const saveQvt = async (row: QVT) => { const { id, ...d } = row; await supabase.from('qualite_qvt').update(d).eq('id', id); };

  const upAudit = (id: string, k: keyof Audit, v: unknown) => setAudits(p => p.map(a => a.id === id ? { ...a, [k]: v } : a));
  const upNC    = (id: string, k: keyof NC,    v: unknown) => setNcs(p => p.map(a => a.id === id ? { ...a, [k]: v } : a));
  const upSat   = (id: string, k: keyof Sat,   v: unknown) => setSats(p => p.map(a => a.id === id ? { ...a, [k]: v } : a));
  const upQvt   = (id: string, k: keyof QVT,   v: unknown) => setQvts(p => p.map(a => a.id === id ? { ...a, [k]: v } : a));

  const addAudit = async () => {
    const { data } = await supabase.from('qualite_audits').insert([{ company_id: companyId, titre: 'Nouvel audit', type_audit: TYPES_AUDIT[0], processus: PROCESSUS[0], statut: 'Planifié', score: 0 }]).select();
    if (data) setAudits(p => [...p, data[0]]);
  };
  const addNC = async () => {
    const { data } = await supabase.from('qualite_nc').insert([{ company_id: companyId, date_nc: new Date().toISOString().slice(0, 10), processus: PROCESSUS[0], origine: ORIGINES_NC[0], type_nc: TYPES_NC[0], description: '', action_corrective: '', statut_nc: 'Ouverte' }]).select();
    if (data) setNcs(p => [...p, data[0]]);
  };
  const addSat = async () => {
    const { data } = await supabase.from('qualite_satisfaction').insert([{ company_id: companyId, date_enquete: new Date().toISOString().slice(0, 10), client: '', projet: '', note_globale: 8, commentaire: '' }]).select();
    if (data) setSats(p => [...p, data[0]]);
  };
  const addQvt = async () => {
    const { data } = await supabase.from('qualite_qvt').insert([{ company_id: companyId, date_campagne: new Date().toISOString().slice(0, 10), nom_campagne: 'Sondage QVT', effectif_total: 10, reponses: 0, note_moyenne: 5 }]).select();
    if (data) setQvts(p => [...p, data[0]]);
  };

  const del = async (table: string, id: string) => {
    if (!confirm('Supprimer ?')) return;
    await supabase.from(table).delete().eq('id', id);
    loadAll();
  };

  const kpiA = useMemo(() => ({
    total:    audits.length,
    realises: audits.filter(a => a.statut === 'Réalisé').length,
    score:    (() => { const r = safeMean(audits.filter(a => a.score > 0), a => (a as Audit).score); return r.hasData ? Math.round(r.value!) : 0; })(),
  }), [audits]);
  const kpiN = useMemo(() => ({
    total:     ncs.length,
    ouvertes:  ncs.filter(n => n.statut_nc === 'Ouverte').length,
    cloturees: ncs.filter(n => n.statut_nc === 'Clôturée').length,
    critiques: ncs.filter(n => n.type_nc === 'Critique').length,
  }), [ncs]);
  const moyenneSat = sats.length
    ? (sats.reduce((s, x) => s + Number(x.note_globale), 0) / sats.length).toFixed(1)
    : null;
  const tauxCloture = kpiN.total > 0 ? Math.round((kpiN.cloturees / kpiN.total) * 100) : 100;

  const TABS = [
    { id: 'audits', label: '📋 Audits',           count: kpiA.total },
    { id: 'nc',     label: '⚠️ Non-Conformités', count: kpiN.ouvertes },
    { id: 'sat',    label: '⭐ Satisfaction',     count: sats.length },
    { id: 'qvt',    label: '😊 QVT',              count: qvts.length },
  ] as const;

  return (
    <div className="space-y-5 pb-10">
      <div className="db-page-header">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--mase-heading)]">
            <ClipboardCheck size={22} className="text-blue-500" /> Qualité &amp; Audits
          </h2>
          <p className="text-sm text-[var(--mase-muted)] mt-1">Audits, non-conformités, satisfaction client et QVT</p>
        </div>
        <button onClick={loadAll} className="db-btn-secondary"><RefreshCw size={14} /> Actualiser</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Audits réalisés',  val: `${kpiA.realises}/${kpiA.total}`, color: '#10b981' },
          { label: 'Score audit moy.', val: `${kpiA.score}%`,                 color: kpiA.score >= 80 ? '#10b981' : '#f59e0b' },
          { label: 'NC ouvertes',      val: kpiN.ouvertes,                    color: kpiN.ouvertes > 0 ? '#f59e0b' : '#10b981' },
          { label: 'Taux clôture NC',  val: `${tauxCloture}%`,                color: tauxCloture >= 80 ? '#10b981' : '#f59e0b' },
          { label: 'Satisfaction',     val: moyenneSat ? `${moyenneSat}/10` : '—', color: '#8b5cf6' },
        ].map((k, i) => (
          <div key={i} className="db-panel p-4" style={{ borderLeft: `4px solid ${k.color}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a' }}>{k.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4, background: '#f8fafc', borderRadius: 10, padding: 4, border: '1px solid #e2e8f0' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', background: tab === t.id ? '#166534' : 'transparent', color: tab === t.id ? 'white' : '#64748b', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            {t.label}
            {t.count > 0 && <span style={{ background: tab === t.id ? 'rgba(255,255,255,0.25)' : '#e2e8f0', borderRadius: 100, padding: '1px 6px', fontSize: 10 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'audits' && (
        <div className="db-panel" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>📋 Liste des audits</span>
            {canWrite && <button onClick={addAudit} className="db-btn-primary"><Plus size={13} /> Ajouter</button>}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="db-table">
              <thead><tr>{['Titre', 'Type', 'Processus', 'Auditeur', 'Date', 'Statut', 'Score', ''].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {audits.map(row => (
                  <tr key={row.id}>
                    <td><input value={row.titre} onChange={e => upAudit(row.id, 'titre', e.target.value)} onBlur={() => saveAudit(audits.find(a => a.id === row.id)!)} style={{ ...inp, width: 140 }} /></td>
                    <td><select value={row.type_audit} onChange={e => { upAudit(row.id, 'type_audit', e.target.value); setTimeout(() => saveAudit({ ...row, type_audit: e.target.value }), 0); }} style={inp}>{TYPES_AUDIT.map(t => <option key={t}>{t}</option>)}</select></td>
                    <td><select value={row.processus} onChange={e => { upAudit(row.id, 'processus', e.target.value); setTimeout(() => saveAudit({ ...row, processus: e.target.value }), 0); }} style={inp}>{PROCESSUS.map(p => <option key={p}>{p}</option>)}</select></td>
                    <td><input value={row.auditeur ?? ''} onChange={e => upAudit(row.id, 'auditeur', e.target.value)} onBlur={() => saveAudit(audits.find(a => a.id === row.id)!)} style={{ ...inp, width: 110 }} placeholder="Auditeur" /></td>
                    <td><input type="date" value={row.date ?? ''} onChange={e => { upAudit(row.id, 'date', e.target.value); setTimeout(() => saveAudit({ ...row, date: e.target.value }), 0); }} style={inp} /></td>
                    <td><select value={row.statut} onChange={e => { upAudit(row.id, 'statut', e.target.value); setTimeout(() => saveAudit({ ...row, statut: e.target.value }), 0); }} style={{ ...inp, color: AUD_COLOR[row.statut] ?? '#334155', fontWeight: 700 }}>{STATUTS_AUD.map(s => <option key={s}>{s}</option>)}</select></td>
                    <td><input type="number" min="0" max="100" value={row.score} onChange={e => upAudit(row.id, 'score', Number(e.target.value))} onBlur={() => saveAudit(audits.find(a => a.id === row.id)!)} style={{ ...inp, width: 55 }} /></td>
                    <td>{canWrite && <button onClick={() => del('qualite_audits', row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>🗑</button>}</td>
                  </tr>
                ))}
                {!audits.length && <tr><td colSpan={8} style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>{canWrite ? 'Aucun audit — cliquez Ajouter' : 'Aucun audit enregistré'}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'nc' && (
        <div className="db-panel" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>⚠️ Non-Conformités</span>
            {canWrite && <button onClick={addNC} className="db-btn-primary"><Plus size={13} /> Ajouter</button>}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="db-table">
              <thead><tr>{['Date', 'Processus', 'Origine', 'Type', 'Description', 'Action corrective', 'Statut', ''].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {ncs.map(row => (
                  <tr key={row.id}>
                    <td><input type="date" value={row.date_nc ?? ''} onChange={e => { upNC(row.id, 'date_nc', e.target.value); setTimeout(() => saveNC({ ...row, date_nc: e.target.value }), 0); }} style={inp} /></td>
                    <td><select value={row.processus} onChange={e => { upNC(row.id, 'processus', e.target.value); setTimeout(() => saveNC({ ...row, processus: e.target.value }), 0); }} style={inp}>{PROCESSUS.map(p => <option key={p}>{p}</option>)}</select></td>
                    <td><select value={row.origine} onChange={e => { upNC(row.id, 'origine', e.target.value); setTimeout(() => saveNC({ ...row, origine: e.target.value }), 0); }} style={inp}>{ORIGINES_NC.map(o => <option key={o}>{o}</option>)}</select></td>
                    <td><select value={row.type_nc} onChange={e => { upNC(row.id, 'type_nc', e.target.value); setTimeout(() => saveNC({ ...row, type_nc: e.target.value }), 0); }} style={{ ...inp, color: row.type_nc === 'Critique' ? '#ef4444' : row.type_nc === 'Majeure' ? '#f59e0b' : '#10b981', fontWeight: 700 }}>{TYPES_NC.map(t => <option key={t}>{t}</option>)}</select></td>
                    <td><input value={row.description} onChange={e => upNC(row.id, 'description', e.target.value)} onBlur={() => saveNC(ncs.find(n => n.id === row.id)!)} style={{ ...inp, width: 150 }} placeholder="Description" /></td>
                    <td><input value={row.action_corrective} onChange={e => upNC(row.id, 'action_corrective', e.target.value)} onBlur={() => saveNC(ncs.find(n => n.id === row.id)!)} style={{ ...inp, width: 150 }} placeholder="Action" /></td>
                    <td><select value={row.statut_nc} onChange={e => { upNC(row.id, 'statut_nc', e.target.value); setTimeout(() => saveNC({ ...row, statut_nc: e.target.value }), 0); }} style={{ ...inp, color: NC_COLOR[row.statut_nc] ?? '#334155', fontWeight: 700 }}>{STATUTS_NC.map(s => <option key={s}>{s}</option>)}</select></td>
                    <td>{canWrite && <button onClick={() => del('qualite_nc', row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>🗑</button>}</td>
                  </tr>
                ))}
                {!ncs.length && <tr><td colSpan={8} style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>{canWrite ? 'Aucune NC — cliquez Ajouter' : 'Aucune NC enregistrée'}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'sat' && (
        <div className="db-panel" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>⭐ Satisfaction client</span>
            {canWrite && <button onClick={addSat} className="db-btn-primary"><Plus size={13} /> Ajouter</button>}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="db-table">
              <thead><tr>{['Date', 'Client', 'Projet', 'Note /10', 'Commentaire', ''].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {sats.map(row => (
                  <tr key={row.id}>
                    <td><input type="date" value={row.date_enquete ?? ''} onChange={e => { upSat(row.id, 'date_enquete', e.target.value); setTimeout(() => saveSat({ ...row, date_enquete: e.target.value }), 0); }} style={inp} /></td>
                    <td><input value={row.client} onChange={e => upSat(row.id, 'client', e.target.value)} onBlur={() => saveSat(sats.find(s => s.id === row.id)!)} style={{ ...inp, width: 110 }} placeholder="Client" /></td>
                    <td><input value={row.projet} onChange={e => upSat(row.id, 'projet', e.target.value)} onBlur={() => saveSat(sats.find(s => s.id === row.id)!)} style={{ ...inp, width: 110 }} placeholder="Projet" /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="number" min="0" max="10" step="0.5" value={row.note_globale} onChange={e => upSat(row.id, 'note_globale', Number(e.target.value))} onBlur={() => saveSat(sats.find(s => s.id === row.id)!)} style={{ ...inp, width: 55 }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: Number(row.note_globale) >= 7 ? '#10b981' : Number(row.note_globale) >= 5 ? '#f59e0b' : '#ef4444' }}>{row.note_globale}/10</span>
                      </div>
                    </td>
                    <td><input value={row.commentaire} onChange={e => upSat(row.id, 'commentaire', e.target.value)} onBlur={() => saveSat(sats.find(s => s.id === row.id)!)} style={{ ...inp, width: 180 }} placeholder="Commentaire" /></td>
                    <td>{canWrite && <button onClick={() => del('qualite_satisfaction', row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>🗑</button>}</td>
                  </tr>
                ))}
                {!sats.length && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>Aucune enquête</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'qvt' && (
        <div className="db-panel" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>😊 Qualité de Vie au Travail</span>
            {canWrite && <button onClick={addQvt} className="db-btn-primary"><Plus size={13} /> Ajouter</button>}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="db-table">
              <thead><tr>{['Date', 'Campagne', 'Effectif', 'Réponses', 'Taux part.', 'Note moy.', ''].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {qvts.map(row => {
                  const taux = row.effectif_total > 0 ? Math.round((row.reponses / row.effectif_total) * 100) : 0;
                  return (
                    <tr key={row.id}>
                      <td><input type="date" value={row.date_campagne ?? ''} onChange={e => { upQvt(row.id, 'date_campagne', e.target.value); setTimeout(() => saveQvt({ ...row, date_campagne: e.target.value }), 0); }} style={inp} /></td>
                      <td><input value={row.nom_campagne} onChange={e => upQvt(row.id, 'nom_campagne', e.target.value)} onBlur={() => saveQvt(qvts.find(q => q.id === row.id)!)} style={{ ...inp, width: 130 }} /></td>
                      <td><input type="number" value={row.effectif_total} onChange={e => upQvt(row.id, 'effectif_total', Number(e.target.value))} onBlur={() => saveQvt(qvts.find(q => q.id === row.id)!)} style={{ ...inp, width: 65 }} /></td>
                      <td><input type="number" value={row.reponses} onChange={e => upQvt(row.id, 'reponses', Number(e.target.value))} onBlur={() => saveQvt(qvts.find(q => q.id === row.id)!)} style={{ ...inp, width: 65 }} /></td>
                      <td><span style={{ fontSize: 13, fontWeight: 700, color: taux >= 70 ? '#10b981' : taux >= 40 ? '#f59e0b' : '#ef4444' }}>{taux}%</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input type="number" min="0" max="10" step="0.1" value={row.note_moyenne} onChange={e => upQvt(row.id, 'note_moyenne', Number(e.target.value))} onBlur={() => saveQvt(qvts.find(q => q.id === row.id)!)} style={{ ...inp, width: 55 }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: Number(row.note_moyenne) >= 7 ? '#10b981' : '#f59e0b' }}>{row.note_moyenne}/10</span>
                        </div>
                      </td>
                      <td>{canWrite && <button onClick={() => del('qualite_qvt', row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>🗑</button>}</td>
                    </tr>
                  );
                })}
                {!qvts.length && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>Aucune campagne QVT</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
