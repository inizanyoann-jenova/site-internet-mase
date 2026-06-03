// src/dashboard/PlanActions.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Trash2, RefreshCw, Filter, CheckCircle, AlertTriangle, Clock, Target, Save, X, Archive, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { diffJours } from './kpi-utils';

interface Props {
  companyId: string;
  canWrite: boolean;
}

interface Action {
  id: string;
  company_id: string;
  origine: string;
  reference_source: string | null;
  domaine: string;
  type_action: string | null;
  action: string;
  cause_racine: string | null;
  pilote: string | null;
  echeance: string | null;
  priorite: string;
  statut: string;
  avancement_pct: number;
  commentaire: string | null;
  archived_at: string | null;
}

const ORIGINES = ['DUERP', 'Audit interne', 'Accident du travail', "Presqu'accident / Incident", 'Non-conformité', 'Revue de Direction', 'Veille réglementaire', 'Indicateur hors objectif', 'Suggestion terrain', 'Autre'];
const DOMAINES = ['Qualité', 'Sécurité', 'Environnement', 'Énergie', 'RH / Social', 'RSE / Transverse'];
const TYPES_ACTION = ['Corrective', 'Préventive', 'Amélioration', 'Réglementaire'];
const PRIORITES = ['🔴 Urgente', '🟠 Haute', '🟡 Normale', '🟢 Basse'];
const STATUTS = ['À lancer', 'En cours', 'En attente', 'Terminé', 'Annulé'];

const DOMAINE_COLOR: Record<string, string> = {
  'Qualité': '#3b82f6', 'Sécurité': '#ef4444', 'Environnement': '#10b981',
  'Énergie': '#f59e0b', 'RH / Social': '#8b5cf6', 'RSE / Transverse': '#06b6d4',
};

function getStatutStyle(statut: string): { color: string; bg: string; border: string } {
  const map: Record<string, { color: string; bg: string; border: string }> = {
    'À lancer':   { color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
    'En cours':   { color: '#9a3412', bg: '#ffedd5', border: '#fb923c' },
    'En attente': { color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
    'Terminé':    { color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
    'Annulé':     { color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
  };
  return map[statut] || map['À lancer'];
}

function getPrioriteColor(priorite: string): string {
  if (priorite?.includes('Urgente')) return '#ef4444';
  if (priorite?.includes('Haute')) return '#f97316';
  if (priorite?.includes('Normale')) return '#f59e0b';
  return '#10b981';
}

const mkForm = () => ({
  origine: ORIGINES[0], reference_source: '', domaine: DOMAINES[1],
  type_action: 'Corrective', action: '', cause_racine: '', pilote: '',
  echeance: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  priorite: PRIORITES[2], statut: 'À lancer', avancement_pct: 0, commentaire: '',
});

export default function PlanActions({ companyId, canWrite }: Props) {
  const location = useLocation();
  const prefill = (location.state as { prefill?: Record<string, unknown> } | null)?.prefill;

  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [filtreDomaine, setFD] = useState('Tous');
  const [filtreStatut, setFS] = useState('Tous');
  const [filtreRetard, setFR] = useState(false);
  const [form, setForm] = useState(mkForm());
  const [saveError, setSaveError] = useState('');
  const actionsRef = useRef(actions);
  useEffect(() => { actionsRef.current = actions; }, [actions]);
  useEffect(() => { fetchActions(); }, []);

  useEffect(() => {
    if (!prefill) return;
    const filled = Object.fromEntries(
      Object.entries(prefill).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );
    setForm(prev => ({ ...prev, ...filled } as typeof prev));
    setShowForm(true);
    setShowArchive(false);
    window.history.replaceState({}, '');
  }, []);

  async function fetchActions() {
    setLoading(true);
    const { data } = await supabase.from('actions').select('*').order('created_at', { ascending: true });
    if (data) setActions(data as Action[]);
    setLoading(false);
  }

  async function archiveRow(id: string) {
    await supabase.from('actions').update({ archived_at: new Date().toISOString() }).eq('id', id);
    setActions(prev => prev.map(a => a.id === id ? { ...a, archived_at: new Date().toISOString() } : a));
  }

  async function restoreRow(id: string) {
    await supabase.from('actions').update({ archived_at: null }).eq('id', id);
    setActions(prev => prev.map(a => a.id === id ? { ...a, archived_at: null } : a));
  }

  function updateLocal(id: string, field: keyof Action, value: unknown) {
    setActions(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  async function saveRow(row: Action) {
    setSaving(row.id);
    await supabase.from('actions').update({
      origine: row.origine, reference_source: row.reference_source,
      domaine: row.domaine, type_action: row.type_action,
      action: row.action, cause_racine: row.cause_racine,
      pilote: row.pilote, echeance: row.echeance || null,
      priorite: row.priorite, statut: row.statut,
      avancement_pct: Number(row.avancement_pct || 0),
      commentaire: row.commentaire,
    }).eq('id', row.id);
    setSaving(null);
  }

  function saveById(id: string) {
    const row = actionsRef.current.find(r => r.id === id);
    if (row) saveRow(row);
  }

  async function ajouterAction() {
    if (!form.action.trim()) return;
    setSaveError('');
    const { data, error } = await supabase.from('actions').insert([{
      company_id: companyId,
      origine: form.origine, reference_source: form.reference_source || null,
      domaine: form.domaine, type_action: form.type_action || null,
      action: form.action, cause_racine: form.cause_racine || null,
      pilote: form.pilote || null, echeance: form.echeance || null,
      priorite: form.priorite, statut: form.statut,
      avancement_pct: Number(form.avancement_pct || 0),
      commentaire: form.commentaire || null,
    }]).select();
    if (error) { setSaveError(`Erreur : ${error.message}`); return; }
    if (data?.[0]) {
      setActions(prev => [...prev, data[0] as Action]);
      setShowForm(false);
      setForm(mkForm());
    }
  }

  async function deleteRow(id: string) {
    if (!window.confirm('Supprimer cette action ?')) return;
    await supabase.from('actions').delete().eq('id', id);
    setActions(prev => prev.filter(r => r.id !== id));
  }

  const kpis = useMemo(() => {
    const nonArch = actions.filter(a => !a.archived_at);
    const actives = nonArch.filter(a => a.statut !== 'Annulé');
    const terminees = nonArch.filter(a => a.statut === 'Terminé');
    const retard = actives.filter(a => a.statut !== 'Terminé' && (diffJours(a.echeance) ?? 0) < 0);
    const urgentes = actives.filter(a => a.priorite?.includes('Urgente') && a.statut !== 'Terminé');
    const taux = actives.length > 0 ? Math.round((terminees.length / actives.length) * 100) : 0;
    return { total: nonArch.length, terminees: terminees.length, retard: retard.length, urgentes: urgentes.length, taux };
  }, [actions]);

  const actionsFiltrees = useMemo(() => actions.filter(a => {
    if (showArchive ? !a.archived_at : a.archived_at) return false;
    if (filtreDomaine !== 'Tous' && a.domaine !== filtreDomaine) return false;
    if (filtreStatut !== 'Tous' && a.statut !== filtreStatut) return false;
    if (filtreRetard && !((diffJours(a.echeance) ?? 0) < 0 && a.statut !== 'Terminé' && a.statut !== 'Annulé')) return false;
    return true;
  }), [actions, filtreDomaine, filtreStatut, filtreRetard, showArchive]);

  const inp: React.CSSProperties = { padding: '5px 8px', fontSize: 12, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, color: '#0f172a', fontFamily: 'inherit', outline: 'none', width: '100%' };

  return (
    <div className="space-y-5 pb-10">
      <div className="db-page-header">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--mase-heading)]">
            <Target size={22} className="text-blue-500" /> Plan d'Actions Global
          </h2>
          <p className="text-sm text-[var(--mase-muted)] mt-1">Actions correctives, préventives et d'amélioration — PDCA</p>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {[{ label: `Actives (${actions.filter(a => !a.archived_at).length})`, arch: false }, { label: `Historique (${actions.filter(a => a.archived_at).length})`, arch: true }].map(b => (
              <button key={String(b.arch)} onClick={() => setShowArchive(b.arch)}
                style={{ fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 100, border: '1px solid', cursor: 'pointer', background: showArchive === b.arch ? 'rgba(59,130,246,0.15)' : 'transparent', borderColor: showArchive === b.arch ? 'rgba(59,130,246,0.4)' : '#e2e8f0', color: showArchive === b.arch ? '#2563eb' : '#64748b' }}>
                {b.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchActions} className="db-btn-secondary"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualiser</button>
          {canWrite && !showArchive && <button onClick={() => setShowForm(true)} className="db-btn-primary"><Plus size={15} /> Nouvelle action</button>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total actions', val: kpis.total, color: '#3b82f6', sub: 'Plan complet' },
          { label: 'Terminées', val: kpis.terminees, color: '#10b981', sub: `Taux : ${kpis.taux}%` },
          { label: 'En retard', val: kpis.retard, color: kpis.retard > 0 ? '#ef4444' : '#10b981', sub: 'Échéances dépassées' },
          { label: 'Urgentes ouvertes', val: kpis.urgentes, color: kpis.urgentes > 0 ? '#f59e0b' : '#10b981', sub: 'Priorité 1' },
        ].map((k, i) => (
          <div key={i} className="db-kpi">
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 4 }}>{k.label}</p>
            <p style={{ fontSize: 32, fontWeight: 900, color: k.color }}>{k.val}</p>
            {i === 1 && <div style={{ height: 3, background: '#e2e8f0', borderRadius: 2, margin: '6px 0 2px' }}><div style={{ height: '100%', width: `${kpis.taux}%`, background: '#10b981', borderRadius: 2 }} /></div>}
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{k.sub}</p>
          </div>
        ))}
      </div>
      {kpis.retard > 0 && <div className="db-alert-red"><AlertTriangle size={16} className="shrink-0" /><p style={{ fontWeight: 600 }}>{kpis.retard} action(s) en retard — Traitement prioritaire requis</p></div>}
      {kpis.urgentes > 0 && <div className="db-alert-amber"><Clock size={16} className="shrink-0" /><p style={{ fontWeight: 600 }}>{kpis.urgentes} action(s) urgente(s) sans clôture</p></div>}

      {/* Formulaire */}
      {showForm && canWrite && (
        <div className="db-panel p-5" style={{ border: '1px solid rgba(59,130,246,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, color: '#0f172a' }}>Nouvelle action</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
          </div>
          {form.reference_source && (
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '8px 14px', marginBottom: 14, fontSize: 12, color: '#047857' }}>
              Pré-rempli depuis {form.origine} — {form.reference_source}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Source / Origine</label>
              <select value={form.origine} onChange={e => setForm({ ...form, origine: e.target.value })} className="db-input">{ORIGINES.map(o => <option key={o}>{o}</option>)}</select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Référence source</label>
              <input type="text" value={form.reference_source} onChange={e => setForm({ ...form, reference_source: e.target.value })} className="db-input" placeholder="DUERP-2025-PROD-001..." />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Domaine QHSE</label>
              <select value={form.domaine} onChange={e => setForm({ ...form, domaine: e.target.value })} className="db-input">{DOMAINES.map(d => <option key={d}>{d}</option>)}</select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Action à mettre en place *</label>
              <input type="text" value={form.action} onChange={e => setForm({ ...form, action: e.target.value })} className="db-input" placeholder="Décrivez l'action corrective ou préventive..." />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Type d'action</label>
              <select value={form.type_action} onChange={e => setForm({ ...form, type_action: e.target.value })} className="db-input">{TYPES_ACTION.map(t => <option key={t}>{t}</option>)}</select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Pilote</label>
              <input type="text" value={form.pilote} onChange={e => setForm({ ...form, pilote: e.target.value })} className="db-input" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Échéance</label>
              <input type="date" value={form.echeance} onChange={e => setForm({ ...form, echeance: e.target.value })} className="db-input" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Priorité</label>
              <select value={form.priorite} onChange={e => setForm({ ...form, priorite: e.target.value })} className="db-input">{PRIORITES.map(pr => <option key={pr}>{pr}</option>)}</select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Statut initial</label>
              <select value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })} className="db-input">{STATUTS.map(s => <option key={s}>{s}</option>)}</select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Avancement (%)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="range" min="0" max="100" step="5" value={form.avancement_pct} onChange={e => setForm({ ...form, avancement_pct: Number(e.target.value) })} style={{ flex: 1 }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', minWidth: 36 }}>{form.avancement_pct}%</span>
              </div>
            </div>
          </div>
          {saveError && <div className="db-alert-red" style={{ marginBottom: 12 }}><AlertTriangle size={14} /><p>{saveError}</p></div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(false)} className="db-btn-secondary">Annuler</button>
            <button onClick={ajouterAction} disabled={!form.action.trim()} className="db-btn-primary"><Save size={14} /> Enregistrer</button>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="db-panel p-3" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Filter size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
        {['Tous', ...DOMAINES].map(d => {
          const col = DOMAINE_COLOR[d] || '#3b82f6';
          return <button key={d} onClick={() => setFD(d)} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, border: '1px solid', cursor: 'pointer', background: filtreDomaine === d ? `${col}15` : '#f8fafc', borderColor: filtreDomaine === d ? `${col}50` : '#e2e8f0', color: filtreDomaine === d ? col : '#64748b' }}>{d}</button>;
        })}
        <div style={{ width: 1, height: 16, background: '#e2e8f0' }} />
        {['Tous', ...STATUTS].map(s => {
          const st = getStatutStyle(s);
          return <button key={s} onClick={() => setFS(s)} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, border: '1px solid', cursor: 'pointer', background: filtreStatut === s ? st.bg : '#f8fafc', borderColor: filtreStatut === s ? st.border : '#e2e8f0', color: filtreStatut === s ? st.color : '#64748b' }}>{s === 'Tous' ? 'Tous statuts' : s}</button>;
        })}
        <button onClick={() => setFR(!filtreRetard)} style={{ fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 100, border: '1px solid', cursor: 'pointer', background: filtreRetard ? 'rgba(239,68,68,0.1)' : '#f8fafc', borderColor: filtreRetard ? 'rgba(239,68,68,0.4)' : '#e2e8f0', color: filtreRetard ? '#ef4444' : '#64748b' }}>⏰ En retard</button>
        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>{actionsFiltrees.length} action(s)</span>
      </div>

      {/* Tableau */}
      <div className="db-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><RefreshCw size={24} className="animate-spin text-blue-400" style={{ margin: '0 auto 8px' }} /><p style={{ color: '#64748b', fontSize: 14 }}>Chargement...</p></div>
        ) : actionsFiltrees.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}><CheckCircle size={32} className="text-emerald-400" style={{ margin: '0 auto 8px' }} /><p style={{ fontWeight: 700, color: '#0f172a' }}>{actions.length === 0 ? 'Aucune action. Cliquez sur "Nouvelle action".' : 'Aucune action pour ces filtres.'}</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="db-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Domaine / Type</th>
                  <th style={{ minWidth: 200 }}>Description</th>
                  <th style={{ width: 110 }}>Pilote</th>
                  <th style={{ width: 110 }}>Échéance</th>
                  <th style={{ width: 100 }}>Avancement</th>
                  <th style={{ width: 120 }}>Priorité</th>
                  <th style={{ width: 130 }}>Statut</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {actionsFiltrees.map(row => {
                  const st = getStatutStyle(row.statut);
                  const dColor = DOMAINE_COLOR[row.domaine] || '#3b82f6';
                  const j = diffJours(row.echeance);
                  const isRet = j !== null && j < 0 && row.statut !== 'Terminé' && row.statut !== 'Annulé';
                  const pColor = getPrioriteColor(row.priorite);
                  const pct = Number(row.avancement_pct || 0);
                  const pctColor = row.statut === 'Terminé' ? '#10b981' : pct >= 75 ? '#10b981' : pct >= 40 ? '#3b82f6' : '#f59e0b';
                  return (
                    <tr key={row.id} style={{ borderLeft: `3px solid ${isRet ? '#ef4444' : st.color}` }}>
                      <td>
                        <select value={row.domaine} onChange={e => { updateLocal(row.id, 'domaine', e.target.value); saveById(row.id); }} style={{ background: `${dColor}15`, color: dColor, border: `1px solid ${dColor}40`, borderRadius: 6, padding: '4px 6px', fontSize: 11, fontWeight: 700, outline: 'none', cursor: 'pointer', width: '100%', marginBottom: 3 }}>
                          {DOMAINES.map(d => <option key={d}>{d}</option>)}
                        </select>
                        {row.type_action && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}>{row.type_action}</span>}
                      </td>
                      <td>
                        <input type="text" value={row.action || ''} onChange={e => updateLocal(row.id, 'action', e.target.value)} onBlur={() => saveById(row.id)} style={{ ...inp, fontSize: 13, fontWeight: 500, marginBottom: 2 }} />
                        {row.cause_racine && <p style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>Cause : {row.cause_racine}</p>}
                        {row.reference_source && <p style={{ fontSize: 9, color: '#3b82f6', fontWeight: 600 }}>{row.reference_source}</p>}
                      </td>
                      <td><input type="text" value={row.pilote || ''} onChange={e => updateLocal(row.id, 'pilote', e.target.value)} onBlur={() => saveById(row.id)} placeholder="Pilote..." style={inp} /></td>
                      <td>
                        <input type="date" value={row.echeance || ''} onChange={e => updateLocal(row.id, 'echeance', e.target.value)} onBlur={() => saveById(row.id)} style={{ ...inp, fontSize: 11 }} />
                        {j !== null && j < 0 && row.statut !== 'Terminé' && <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', display: 'block', marginTop: 2 }}>{Math.abs(j)}j retard</span>}
                        {j !== null && j >= 0 && j <= 7 && <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', display: 'block', marginTop: 2 }}>{j}j restants</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                          <input type="number" min="0" max="100" value={pct} onChange={e => updateLocal(row.id, 'avancement_pct', Math.min(100, Math.max(0, Number(e.target.value))))} onBlur={() => saveById(row.id)} style={{ ...inp, width: 44, padding: '3px 4px', fontSize: 11, textAlign: 'center' }} />
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>%</span>
                        </div>
                        <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2 }}><div style={{ height: '100%', width: `${pct}%`, background: pctColor, borderRadius: 2 }} /></div>
                      </td>
                      <td>
                        <select value={row.priorite || PRIORITES[2]} onChange={e => { updateLocal(row.id, 'priorite', e.target.value); saveById(row.id); }} style={{ background: `${pColor}15`, color: pColor, border: `1px solid ${pColor}40`, borderRadius: 8, padding: '5px 6px', fontSize: 11, fontWeight: 700, outline: 'none', cursor: 'pointer', width: '100%' }}>
                          {PRIORITES.map(pr => <option key={pr}>{pr}</option>)}
                        </select>
                      </td>
                      <td>
                        <select value={row.statut || 'À lancer'} onChange={e => { const v = e.target.value; updateLocal(row.id, 'statut', v); if (v === 'Terminé') updateLocal(row.id, 'avancement_pct', 100); saveById(row.id); }} style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}`, borderRadius: 8, padding: '5px 6px', fontSize: 11, fontWeight: 600, outline: 'none', cursor: 'pointer', width: '100%' }}>
                          {STATUTS.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {saving === row.id ? <RefreshCw size={12} className="animate-spin text-blue-400" /> :
                          canWrite && (showArchive
                            ? <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                                <button onClick={() => restoreRow(row.id)} style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><RotateCcw size={13} /></button>
                                <button onClick={() => deleteRow(row.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Trash2 size={13} /></button>
                              </div>
                            : <button onClick={() => archiveRow(row.id)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Archive size={14} /></button>
                          )
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
