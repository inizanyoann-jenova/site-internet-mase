// src/dashboard/SecuriteAccidents.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, HeartPulse, RefreshCw, AlertTriangle, CheckCircle, Clock, X, Save, ChevronDown, ChevronUp, Activity, Calendar, Archive, RotateCcw, ListPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Props {
  companyId: string;
  canWrite: boolean;
  effectif?: number;
  hAn?: number;
}

interface Accident {
  id: string;
  company_id: string;
  date_evenement: string;
  type_evenement: string;
  lieu: string;
  description: string;
  cause_immediate: string | null;
  victime: string | null;
  temoin: string | null;
  jours_perdus: number;
  statut_enquete: string;
  mesures_immediates: string | null;
  actions_correctives: string | null;
  archived_at: string | null;
}

const TYPES_EVT = ["Presqu'accident", "Soins (sans arrêt)", "Accident avec arrêt", "Maladie Professionnelle", "Incident matériel"];
const STATUTS_ENQ = ["À lancer", "En cours d'analyse", "Actions définies", "Clôturée"];
const LIEUX = ["Atelier", "Magasin", "Bureaux", "Chantier", "Parking", "Vestiaires", "Autre"];
const CAUSES = ["Chute de plain-pied", "Chute de hauteur", "Manutention manuelle", "Utilisation d'outillage", "Projection", "Contact avec machine", "Brûlure", "TMS", "Autre"];

const TYPE_STYLE: Record<string, { color: string; label: string }> = {
  "Presqu'accident":         { color: '#3b82f6', label: "Presqu'acc." },
  "Soins (sans arrêt)":     { color: '#f59e0b', label: 'Soins' },
  "Accident avec arrêt":    { color: '#ef4444', label: 'Avec arrêt' },
  "Maladie Professionnelle": { color: '#8b5cf6', label: 'MP' },
  "Incident matériel":      { color: '#06b6d4', label: 'Matériel' },
};

const STATUT_COLOR: Record<string, string> = {
  "À lancer":           '#ef4444',
  "En cours d'analyse": '#f59e0b',
  "Actions définies":   '#3b82f6',
  "Clôturée":           '#10b981',
};

function toAtPrefill(row: Accident) {
  return {
    origine: row.type_evenement === "Presqu'accident" ? "Presqu'accident / Incident" : 'Accident du travail',
    domaine: 'Sécurité',
    type_action: 'Corrective',
    reference_source: `${row.date_evenement} · ${row.type_evenement} · ${row.lieu}`,
    commentaire: row.description || '',
    action: row.actions_correctives?.trim() || `Analyse et plan d'action : ${row.type_evenement}`,
    cause_racine: row.cause_immediate || '',
    priorite: row.type_evenement === 'Accident avec arrêt' ? '🔴 Urgente' : row.type_evenement === 'Soins (sans arrêt)' ? '🟠 Haute' : '🟡 Normale',
    statut: 'À lancer',
    avancement_pct: 0,
  };
}

const FORM_INIT = {
  date_evenement: new Date().toISOString().split('T')[0],
  type_evenement: "Presqu'accident",
  lieu: 'Atelier',
  description: '',
  cause_immediate: [] as string[],
  victime: '',
  temoin: '',
  jours_perdus: 0,
  statut_enquete: 'À lancer',
  mesures_immediates: '',
  actions_correctives: '',
};

export default function SecuriteAccidents({ companyId, canWrite, effectif = 50, hAn = 1607 }: Props) {
  const navigate = useNavigate();
  const [accidents, setAccidents] = useState<Accident[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [form, setForm] = useState({ ...FORM_INIT });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase.from('accidents').select('*').order('date_evenement', { ascending: false });
    if (data) setAccidents(data as Accident[]);
    setLoading(false);
  }

  function updateField(id: string, field: keyof Accident, value: unknown) {
    setAccidents(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  }

  async function sauvegarder(row: Accident) {
    setSaving(row.id);
    await supabase.from('accidents').update({
      date_evenement: row.date_evenement, type_evenement: row.type_evenement,
      lieu: row.lieu, description: row.description, cause_immediate: row.cause_immediate,
      victime: row.victime, temoin: row.temoin, jours_perdus: row.jours_perdus,
      statut_enquete: row.statut_enquete, mesures_immediates: row.mesures_immediates,
      actions_correctives: row.actions_correctives,
    }).eq('id', row.id);
    setSaving(null);
  }

  async function declarer() {
    const payload = {
      ...form,
      company_id: companyId,
      cause_immediate: Array.isArray(form.cause_immediate) ? form.cause_immediate.join(' / ') : form.cause_immediate,
    };
    const { data, error } = await supabase.from('accidents').insert([payload]).select();
    if (error) { alert(`Erreur : ${error.message}`); return; }
    if (data) { setAccidents([data[0] as Accident, ...accidents]); setShowForm(false); setForm({ ...FORM_INIT }); }
  }

  async function archiveRow(id: string) {
    const now = new Date().toISOString();
    await supabase.from('accidents').update({ archived_at: now }).eq('id', id);
    setAccidents(prev => prev.map(a => a.id === id ? { ...a, archived_at: now } : a));
  }

  async function restoreRow(id: string) {
    await supabase.from('accidents').update({ archived_at: null }).eq('id', id);
    setAccidents(prev => prev.map(a => a.id === id ? { ...a, archived_at: null } : a));
  }

  async function deleteRow(id: string) {
    await supabase.from('accidents').delete().eq('id', id);
    setAccidents(prev => prev.filter(a => a.id !== id));
  }

  const kpis = useMemo(() => {
    const actifs = accidents.filter(a => !a.archived_at);
    const accArret = actifs.filter(a => a.type_evenement === 'Accident avec arrêt');
    const jours = actifs.reduce((s, a) => s + (a.jours_perdus || 0), 0);
    const heures = effectif * hAn;
    const TF = accArret.length > 0 ? ((accArret.length * 1000000) / heures).toFixed(2) : '0.00';
    const TG = jours > 0 ? ((jours * 1000) / heures).toFixed(2) : '0.00';
    const nonClotures = actifs.filter(a => a.statut_enquete !== 'Clôturée' && a.type_evenement !== "Presqu'accident").length;
    return { total: actifs.length, accArret: accArret.length, jours, TF, TG, nonClotures };
  }, [accidents, effectif, hAn]);

  const chartData = useMemo(() => {
    const m: Record<string, { mois: string; arret: number; soins: number; presqu: number }> = {};
    accidents.forEach(a => {
      const mois = a.date_evenement?.substring(0, 7); if (!mois) return;
      if (!m[mois]) m[mois] = { mois, arret: 0, soins: 0, presqu: 0 };
      if (a.type_evenement === 'Accident avec arrêt') m[mois].arret++;
      if (a.type_evenement === 'Soins (sans arrêt)') m[mois].soins++;
      if (a.type_evenement === "Presqu'accident") m[mois].presqu++;
    });
    return Object.values(m).sort((a, b) => a.mois.localeCompare(b.mois)).slice(-12);
  }, [accidents]);

  const inp: React.CSSProperties = { padding: '7px 12px', fontSize: 13, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 7, color: '#0f172a', fontFamily: 'inherit', outline: 'none', width: '100%' };

  const displayed = accidents.filter(a => showArchive ? !!a.archived_at : !a.archived_at);

  return (
    <div className="space-y-5 pb-10">
      <div className="db-page-header">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--mase-heading)]">
            <HeartPulse size={22} className="text-red-500" /> Sécurité &amp; Accidents
          </h2>
          <p className="text-sm text-[var(--mase-muted)] mt-1">Déclaration, enquête et suivi des événements</p>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {[{ label: `Actifs (${accidents.filter(a => !a.archived_at).length})`, arch: false }, { label: `Historique (${accidents.filter(a => a.archived_at).length})`, arch: true }].map(b => (
              <button key={String(b.arch)} onClick={() => setShowArchive(b.arch)}
                style={{ fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 100, border: '1px solid', cursor: 'pointer', background: showArchive === b.arch ? 'rgba(239,68,68,0.15)' : 'transparent', borderColor: showArchive === b.arch ? 'rgba(239,68,68,0.4)' : '#e2e8f0', color: showArchive === b.arch ? '#dc2626' : '#64748b' }}>
                {b.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadData} className="db-btn-secondary"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualiser</button>
          {canWrite && <button onClick={() => setShowForm(true)} className="db-btn-primary" style={{ background: '#ef4444' }}><Plus size={15} /> Déclarer un événement</button>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Événements total', val: kpis.total, color: '#3b82f6', sub: 'Tous types' },
          { label: 'Acc. avec arrêt', val: kpis.accArret, color: kpis.accArret > 0 ? '#ef4444' : '#10b981', sub: `TF : ${kpis.TF}` },
          { label: 'Jours perdus', val: kpis.jours, color: kpis.jours > 0 ? '#f59e0b' : '#10b981', sub: `TG : ${kpis.TG}` },
          { label: 'Enquêtes ouvertes', val: kpis.nonClotures, color: kpis.nonClotures > 0 ? '#f59e0b' : '#10b981', sub: 'À clôturer' },
        ].map((k, i) => (
          <div key={i} className="db-kpi">
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 4 }}>{k.label}</p>
            <p style={{ fontSize: 32, fontWeight: 900, color: k.color }}>{k.val}</p>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{k.sub}</p>
          </div>
        ))}
      </div>
      {kpis.accArret > 0 && <div className="db-alert-red"><AlertTriangle size={16} className="shrink-0" /><div><p style={{ fontWeight: 600 }}>{kpis.accArret} accident(s) avec arrêt — TF : {kpis.TF}</p><p style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>Vérifier la déclaration CPAM et les mesures correctives</p></div></div>}
      {kpis.nonClotures > 0 && <div className="db-alert-amber"><Clock size={16} className="shrink-0" /><p style={{ fontWeight: 600 }}>{kpis.nonClotures} enquête(s) en attente de clôture</p></div>}
      {kpis.accArret === 0 && accidents.length > 0 && <div className="db-alert-green"><CheckCircle size={16} className="shrink-0" /><p style={{ fontWeight: 600 }}>Aucun accident avec arrêt — Objectif zéro AT atteint !</p></div>}

      {/* Formulaire */}
      {showForm && canWrite && (
        <div className="db-panel p-5" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={16} className="text-red-500" /> Déclarer un événement</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Date *</label><input type="date" value={form.date_evenement} onChange={e => setForm({ ...form, date_evenement: e.target.value })} style={inp} /></div>
            <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Type d'événement *</label><select value={form.type_evenement} onChange={e => setForm({ ...form, type_evenement: e.target.value })} style={inp}>{TYPES_EVT.map(t => <option key={t}>{t}</option>)}</select></div>
            <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Lieu</label><select value={form.lieu} onChange={e => setForm({ ...form, lieu: e.target.value })} style={inp}>{LIEUX.map(l => <option key={l}>{l}</option>)}</select></div>
            <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Victime / Personne concernée</label><input type="text" value={form.victime} onChange={e => setForm({ ...form, victime: e.target.value })} placeholder="Nom, prénom, poste..." style={inp} /></div>
            <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Témoin(s)</label><input type="text" value={form.temoin} onChange={e => setForm({ ...form, temoin: e.target.value })} style={inp} /></div>
            <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Jours perdus</label><input type="number" min="0" value={form.jours_perdus} onChange={e => setForm({ ...form, jours_perdus: parseInt(e.target.value) || 0 })} style={inp} disabled={form.type_evenement !== 'Accident avec arrêt'} /></div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Cause(s) immédiate(s)</label>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff', padding: '6px 8px', minHeight: 40, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {form.cause_immediate.map(c => (
                  <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 5, padding: '2px 7px', fontSize: 12, fontWeight: 600 }}>
                    {c} <button onClick={() => setForm({ ...form, cause_immediate: form.cause_immediate.filter(x => x !== c) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', lineHeight: 1, fontSize: 13 }}>×</button>
                  </span>
                ))}
                <select value="" onChange={e => { const v = e.target.value; if (v && !form.cause_immediate.includes(v)) setForm({ ...form, cause_immediate: [...form.cause_immediate, v] }); }} style={{ border: 'none', background: 'transparent', color: '#64748b', fontSize: 13, cursor: 'pointer', outline: 'none' }}>
                  <option value="">+ Ajouter...</option>
                  {CAUSES.filter(c => !form.cause_immediate.includes(c)).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div><label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Statut enquête</label><select value={form.statut_enquete} onChange={e => setForm({ ...form, statut_enquete: e.target.value })} style={inp}>{STATUTS_ENQ.map(s => <option key={s}>{s}</option>)}</select></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Description des faits *</label><textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Décrivez précisément les circonstances..." style={{ ...inp, resize: 'none' }} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Mesures immédiates prises</label><textarea rows={2} value={form.mesures_immediates} onChange={e => setForm({ ...form, mesures_immediates: e.target.value })} style={{ ...inp, resize: 'none' }} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Actions correctives prévues</label><textarea rows={2} value={form.actions_correctives} onChange={e => setForm({ ...form, actions_correctives: e.target.value })} style={{ ...inp, resize: 'none' }} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setShowForm(false)} className="db-btn-secondary">Annuler</button>
            <button onClick={declarer} disabled={!form.description} className="db-btn-primary" style={{ background: '#ef4444' }}><Save size={14} /> Enregistrer la déclaration</button>
          </div>
        </div>
      )}

      {/* Graphique */}
      {chartData.length > 0 && (
        <div className="db-panel p-5">
          <h3 style={{ fontWeight: 700, marginBottom: 12, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={16} className="text-red-400" /> Accidentologie — 12 derniers mois</h3>
          <div style={{ height: 176 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mois" stroke="#e2e8f0" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis stroke="#e2e8f0" tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="arret" name="Avec arrêt" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="soins" name="Soins" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="presqu" name="Presqu'accidents" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Registre */}
      <div className="db-panel" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={16} className="text-red-400" /> Registre des événements</h3>
          <span style={{ fontSize: 13, color: '#64748b' }}>{displayed.length} événement(s)</span>
        </div>
        {displayed.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}><CheckCircle size={32} className="text-emerald-400" style={{ margin: '0 auto 8px' }} /><p style={{ fontWeight: 700, color: '#0f172a' }}>Aucun événement enregistré</p><p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Parfait ! Objectif zéro accident maintenu.</p></div>
        ) : (
          <div>
            {displayed.map(row => {
              const typeStyle = TYPE_STYLE[row.type_evenement] || TYPE_STYLE["Presqu'accident"];
              const statutColor = STATUT_COLOR[row.statut_enquete] || '#64748b';
              const isExpanded = expanded === row.id;
              return (
                <div key={row.id} style={{ borderLeft: `3px solid ${typeStyle.color}`, borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                    <div style={{ fontSize: 13, color: '#64748b', fontFamily: 'monospace', flexShrink: 0, width: 96 }}>{row.date_evenement}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: `${typeStyle.color}15`, color: typeStyle.color, border: `1px solid ${typeStyle.color}40`, flexShrink: 0 }}>{typeStyle.label}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description || '(sans description)'}</p>
                      <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{row.lieu}{row.victime ? ` · ${row.victime}` : ''}</p>
                    </div>
                    {row.jours_perdus > 0 && <div style={{ textAlign: 'center', flexShrink: 0 }}><p style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>{row.jours_perdus}j</p><p style={{ fontSize: 10, color: '#94a3b8' }}>perdus</p></div>}
                    <span style={{ fontSize: 11, fontWeight: 700, color: statutColor, background: `${statutColor}15`, border: `1px solid ${statutColor}40`, padding: '2px 8px', borderRadius: 100, flexShrink: 0 }}>{row.statut_enquete}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      {!showArchive && (
                        <button onClick={() => navigate('/dashboard/actions', { state: { prefill: toAtPrefill(row) } })}
                          style={{ color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700 }}>
                          <ListPlus size={13} /> Action
                        </button>
                      )}
                      <button onClick={() => setExpanded(isExpanded ? null : row.id)} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      {showArchive ? (
                        <>
                          <button onClick={() => restoreRow(row.id)} style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', padding: 5 }}><RotateCcw size={14} /></button>
                          {canWrite && <button onClick={() => deleteRow(row.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 5 }}><Trash2 size={14} /></button>}
                        </>
                      ) : (
                        canWrite && <button onClick={() => archiveRow(row.id)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 5 }}><Archive size={14} /></button>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ padding: '12px 20px 20px', background: '#fafafa', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {[
                        { label: 'Type événement', key: 'type_evenement' as keyof Accident, type: 'select', options: TYPES_EVT },
                        { label: 'Date', key: 'date_evenement' as keyof Accident, type: 'date' },
                        { label: 'Lieu', key: 'lieu' as keyof Accident, type: 'select', options: LIEUX },
                        { label: 'Jours perdus', key: 'jours_perdus' as keyof Accident, type: 'number' },
                        { label: 'Victime', key: 'victime' as keyof Accident, type: 'text', placeholder: 'Nom, poste...' },
                        { label: 'Témoin(s)', key: 'temoin' as keyof Accident, type: 'text' },
                        { label: 'Statut enquête', key: 'statut_enquete' as keyof Accident, type: 'select', options: STATUTS_ENQ },
                      ].map(f => (
                        <div key={f.key}>
                          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>{f.label}</label>
                          {f.type === 'select'
                            ? <select value={String(row[f.key] || '')} onChange={e => updateField(row.id, f.key, e.target.value)} style={inp}>{f.options!.map(o => <option key={o}>{o}</option>)}</select>
                            : <input type={f.type} value={String(row[f.key] || '')} onChange={e => updateField(row.id, f.key, f.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)} placeholder={f.placeholder} style={inp} />}
                        </div>
                      ))}
                      <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Description</label><textarea rows={2} value={row.description || ''} onChange={e => updateField(row.id, 'description', e.target.value)} style={{ ...inp, resize: 'none' }} /></div>
                      <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Mesures immédiates</label><textarea rows={2} value={row.mesures_immediates || ''} onChange={e => updateField(row.id, 'mesures_immediates', e.target.value)} style={{ ...inp, resize: 'none' }} /></div>
                      <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Actions correctives</label><textarea rows={2} value={row.actions_correctives || ''} onChange={e => updateField(row.id, 'actions_correctives', e.target.value)} style={{ ...inp, resize: 'none' }} /></div>
                      {canWrite && <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => sauvegarder(accidents.find(a => a.id === row.id)!)} disabled={saving === row.id} className="db-btn-primary" style={{ fontSize: 13 }}>
                          {saving === row.id ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />} {saving === row.id ? 'Sauvegarde...' : 'Sauvegarder'}
                        </button>
                      </div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
