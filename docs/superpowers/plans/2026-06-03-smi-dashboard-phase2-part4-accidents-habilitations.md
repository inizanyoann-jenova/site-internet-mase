# SMI Dashboard Phase 2 — Partie 4 : Accidents + Habilitations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Porter les modules Accidents/Incidents et Habilitations en TypeScript multi-tenant.

**Architecture:**
- Accidents : navigation vers PDCA via `useNavigate('/dashboard/actions', { state: { prefill } })`
- Habilitations : vue liste + vue par employé, calcul expiration via `calcExpiration` de kpi-utils.ts
- Props : `companyId: string`, `canWrite: boolean`

---

### Task 6 : Module Accidents / Incidents

**Files:**
- Create: `src/dashboard/SecuriteAccidents.tsx`
- Create: `src/pages/DashboardAccidentsPage.tsx`

- [ ] **Step 1 : Créer `src/dashboard/SecuriteAccidents.tsx`**

```tsx
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
const STATUTS = ["À lancer", "En cours d'analyse", "Actions définies", "Clôturée"];
const LIEUX = ["Atelier", "Magasin", "Bureaux", "Chantier", "Parking", "Vestiaires", "Autre"];
const CAUSES = ["Chute de plain-pied", "Chute de hauteur", "Manutention manuelle", "Utilisation d'outillage", "Projection", "Contact avec machine", "Brûlure", "TMS", "Autre"];

const TYPE_STYLE: Record<string, { color: string; label: string }> = {
  "Presqu'accident":         { color: '#3b82f6', label: "Presqu'acc." },
  "Soins (sans arrêt)":     { color: '#f59e0b', label: 'Soins' },
  "Accident avec arrêt":    { color: '#ef4444', label: 'Avec arrêt' },
  "Maladie Professionnelle": { color: '#8b5cf6', label: 'MP' },
  "Incident matériel":      { color: '#06b6d4', label: 'Matériel' },
};

const STATUT_STYLE: Record<string, { color: string }> = {
  "À lancer":           { color: '#ef4444' },
  "En cours d'analyse": { color: '#f59e0b' },
  "Actions définies":   { color: '#3b82f6' },
  "Clôturée":           { color: '#10b981' },
};

function toAtPrefill(row: Accident) {
  const isPresqu = row.type_evenement === "Presqu'accident";
  return {
    origine: isPresqu ? "Presqu'accident / Incident" : 'Accident du travail',
    domaine: 'Sécurité',
    type_action: 'Corrective',
    reference_source: `${row.date_evenement} · ${row.type_evenement} · ${row.lieu}`.replace(/^[\s·]+|[\s·]+$/g, ''),
    commentaire: row.description || '',
    action: row.actions_correctives?.trim() || `Analyse et plan d'action : ${row.type_evenement}`,
    cause_racine: row.cause_immediate || '',
    priorite: row.type_evenement === 'Accident avec arrêt' ? '🔴 Urgente' : row.type_evenement === 'Soins (sans arrêt)' ? '🟠 Haute' : '🟡 Normale',
    statut: 'À lancer',
    avancement_pct: 0,
    resultat_efficacite: 'Non évalué',
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

  async function sauvegarderLigne(row: Accident) {
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

  async function declarerEvenement() {
    const payload = {
      ...form,
      company_id: companyId,
      cause_immediate: Array.isArray(form.cause_immediate) ? form.cause_immediate.join(' / ') : form.cause_immediate,
    };
    const { data, error } = await supabase.from('accidents').insert([payload]).select();
    if (error) { alert(`Erreur : ${error.message}`); return; }
    if (data) {
      setAccidents([data[0] as Accident, ...accidents]);
      setShowForm(false);
      setForm({ ...FORM_INIT });
    }
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
    const moisMap: Record<string, { mois: string; arret: number; soins: number; presqu: number }> = {};
    accidents.forEach(a => {
      const mois = a.date_evenement?.substring(0, 7);
      if (!mois) return;
      if (!moisMap[mois]) moisMap[mois] = { mois, arret: 0, soins: 0, presqu: 0 };
      if (a.type_evenement === 'Accident avec arrêt') moisMap[mois].arret++;
      if (a.type_evenement === 'Soins (sans arrêt)') moisMap[mois].soins++;
      if (a.type_evenement === "Presqu'accident") moisMap[mois].presqu++;
    });
    return Object.values(moisMap).sort((a, b) => a.mois.localeCompare(b.mois)).slice(-12);
  }, [accidents]);

  const inp = { padding: '7px 12px', fontSize: 13, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 7, color: '#0f172a', fontFamily: 'inherit', outline: 'none', width: '100%' };

  return (
    <div className="space-y-5 pb-10">
      {/* En-tête */}
      <div className="db-page-header">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--mase-heading)]">
            <HeartPulse size={22} className="text-red-500" /> Sécurité & Accidents
          </h2>
          <p className="text-sm text-[var(--mase-muted)] mt-1">Registre des événements — Déclaration, enquête et suivi</p>
          <div className="flex gap-2 mt-2">
            {[{ label: `Actifs (${accidents.filter(a => !a.archived_at).length})`, arch: false }, { label: `Historique (${accidents.filter(a => a.archived_at).length})`, arch: true }].map(b => (
              <button key={String(b.arch)} onClick={() => setShowArchive(b.arch)}
                style={{ fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 100, border: '1px solid', cursor: 'pointer', background: showArchive === b.arch ? 'rgba(239,68,68,0.15)' : 'transparent', borderColor: showArchive === b.arch ? 'rgba(239,68,68,0.4)' : '#e2e8f0', color: showArchive === b.arch ? '#dc2626' : '#64748b' }}>
                {b.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
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
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{k.label}</p>
            <p className="text-3xl font-black" style={{ color: k.color }}>{k.val}</p>
            <p className="text-xs text-slate-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Alertes */}
      {kpis.accArret > 0 && <div className="db-alert-red"><AlertTriangle size={16} className="shrink-0" /><div><p className="font-semibold">{kpis.accArret} accident(s) avec arrêt — Taux de Fréquence : {kpis.TF}</p><p className="text-xs mt-1 opacity-80">Vérifier la conformité de la déclaration CPAM et les mesures correctives</p></div></div>}
      {kpis.nonClotures > 0 && <div className="db-alert-amber"><Clock size={16} className="shrink-0" /><p className="font-semibold">{kpis.nonClotures} enquête(s) en attente de clôture</p></div>}
      {kpis.accArret === 0 && accidents.length > 0 && <div className="db-alert-green"><CheckCircle size={16} className="shrink-0" /><p className="font-semibold">Aucun accident avec arrêt enregistré — Objectif zéro AT atteint !</p></div>}

      {/* Formulaire déclaration */}
      {showForm && canWrite && (
        <div className="db-panel p-5" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-[var(--mase-heading)] flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> Déclarer un événement</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Date *</label><input type="date" value={form.date_evenement} onChange={e => setForm({ ...form, date_evenement: e.target.value })} style={inp} /></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Type d'événement *</label><select value={form.type_evenement} onChange={e => setForm({ ...form, type_evenement: e.target.value })} style={inp}>{TYPES_EVT.map(t => <option key={t}>{t}</option>)}</select></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Lieu</label><select value={form.lieu} onChange={e => setForm({ ...form, lieu: e.target.value })} style={inp}>{LIEUX.map(l => <option key={l}>{l}</option>)}</select></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Victime / Personne concernée</label><input type="text" value={form.victime} onChange={e => setForm({ ...form, victime: e.target.value })} placeholder="Nom, prénom, poste..." style={inp} /></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Témoin(s)</label><input type="text" value={form.temoin} onChange={e => setForm({ ...form, temoin: e.target.value })} style={inp} /></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Jours perdus</label><input type="number" min="0" value={form.jours_perdus} onChange={e => setForm({ ...form, jours_perdus: parseInt(e.target.value) || 0 })} style={inp} disabled={form.type_evenement !== 'Accident avec arrêt'} /></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Cause(s) immédiate(s)</label>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff', padding: '6px 8px', minHeight: 40, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(form.cause_immediate || []).map(c => (
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
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Statut enquête</label><select value={form.statut_enquete} onChange={e => setForm({ ...form, statut_enquete: e.target.value })} style={inp}>{STATUTS.map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="md:col-span-3"><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Description des faits *</label><textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Décrivez précisément les circonstances..." style={{ ...inp, resize: 'none' }} /></div>
            <div className="md:col-span-3"><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Mesures immédiates prises</label><textarea rows={2} value={form.mesures_immediates} onChange={e => setForm({ ...form, mesures_immediates: e.target.value })} style={{ ...inp, resize: 'none' }} /></div>
            <div className="md:col-span-3"><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Actions correctives prévues</label><textarea rows={2} value={form.actions_correctives} onChange={e => setForm({ ...form, actions_correctives: e.target.value })} style={{ ...inp, resize: 'none' }} /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="db-btn-secondary">Annuler</button>
            <button onClick={declarerEvenement} disabled={!form.description} className="db-btn-primary" style={{ background: '#ef4444' }}><Save size={14} /> Enregistrer la déclaration</button>
          </div>
        </div>
      )}

      {/* Graphique */}
      {chartData.length > 0 && (
        <div className="db-panel p-5">
          <h3 className="font-bold mb-3 text-[var(--mase-heading)] flex items-center gap-2"><Activity size={16} className="text-red-400" /> Accidentologie — 12 derniers mois</h3>
          <div style={{ height: 176 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mois" stroke="#e2e8f0" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis stroke="#e2e8f0" tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="arret" name="Acc. avec arrêt" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="soins" name="Soins sans arrêt" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="presqu" name="Presqu'accidents" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Registre */}
      <div className="db-panel overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-[var(--mase-border)]">
          <h3 className="font-bold text-[var(--mase-heading)] flex items-center gap-2"><Calendar size={16} className="text-red-400" /> Registre des événements</h3>
          <span className="text-sm text-slate-500">{accidents.filter(a => showArchive ? a.archived_at : !a.archived_at).length} événement(s)</span>
        </div>
        {accidents.filter(a => showArchive ? !!a.archived_at : !a.archived_at).length === 0 ? (
          <div className="p-10 text-center"><CheckCircle size={32} className="text-emerald-400 mx-auto mb-2" /><p className="font-bold text-[var(--mase-heading)]">Aucun événement enregistré</p><p className="text-slate-400 text-sm mt-1">Parfait ! Objectif zéro accident maintenu.</p></div>
        ) : (
          <div className="divide-y divide-[var(--mase-border)]">
            {accidents.filter(a => showArchive ? !!a.archived_at : !a.archived_at).map(row => {
              const typeStyle = TYPE_STYLE[row.type_evenement] || TYPE_STYLE["Presqu'accident"];
              const statutColor = STATUT_STYLE[row.statut_enquete]?.color || '#64748b';
              const isExpanded = expanded === row.id;
              return (
                <div key={row.id} style={{ borderLeft: `3px solid ${typeStyle.color}` }}>
                  <div className="flex items-center gap-3 p-4 hover:bg-slate-50">
                    <div className="text-slate-500 text-sm font-mono shrink-0 w-24">{row.date_evenement}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: `${typeStyle.color}15`, color: typeStyle.color, border: `1px solid ${typeStyle.color}40`, flexShrink: 0 }}>{typeStyle.label}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--mase-heading)] truncate">{row.description || '(sans description)'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{row.lieu}{row.victime ? ` · ${row.victime}` : ''}</p>
                    </div>
                    {row.jours_perdus > 0 && <div className="text-center shrink-0"><p className="text-sm font-bold text-red-500">{row.jours_perdus}j</p><p className="text-xs text-slate-400">perdus</p></div>}
                    <span style={{ fontSize: 11, fontWeight: 700, color: statutColor, background: `${statutColor}15`, border: `1px solid ${statutColor}40`, padding: '2px 8px', borderRadius: 100, flexShrink: 0 }}>{row.statut_enquete}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {!showArchive && <button onClick={() => navigate('/dashboard/actions', { state: { prefill: toAtPrefill(row) } })} style={{ color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700 }}><ListPlus size={13} /> Action</button>}
                      <button onClick={() => setExpanded(isExpanded ? null : row.id)} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
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
                    <div className="px-5 pb-5 pt-2 bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: 'Type événement', key: 'type_evenement' as keyof Accident, type: 'select', options: TYPES_EVT },
                        { label: 'Date', key: 'date_evenement' as keyof Accident, type: 'date' },
                        { label: 'Lieu', key: 'lieu' as keyof Accident, type: 'select', options: LIEUX },
                        { label: 'Jours perdus', key: 'jours_perdus' as keyof Accident, type: 'number' },
                        { label: 'Victime', key: 'victime' as keyof Accident, type: 'text', placeholder: 'Nom, poste...' },
                        { label: 'Témoin(s)', key: 'temoin' as keyof Accident, type: 'text', placeholder: 'Noms...' },
                        { label: 'Statut enquête', key: 'statut_enquete' as keyof Accident, type: 'select', options: STATUTS },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{f.label}</label>
                          {f.type === 'select' ? (
                            <select value={String(row[f.key] || '')} onChange={e => updateField(row.id, f.key, e.target.value)} style={inp}>
                              {f.options!.map(o => <option key={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input type={f.type} value={String(row[f.key] || '')} onChange={e => updateField(row.id, f.key, f.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)} placeholder={f.placeholder} style={inp} />
                          )}
                        </div>
                      ))}
                      <div className="md:col-span-2"><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Description</label><textarea rows={2} value={row.description || ''} onChange={e => updateField(row.id, 'description', e.target.value)} style={{ ...inp, resize: 'none' }} /></div>
                      <div className="md:col-span-2"><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Mesures immédiates</label><textarea rows={2} value={row.mesures_immediates || ''} onChange={e => updateField(row.id, 'mesures_immediates', e.target.value)} style={{ ...inp, resize: 'none' }} /></div>
                      <div className="md:col-span-2"><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Actions correctives</label><textarea rows={2} value={row.actions_correctives || ''} onChange={e => updateField(row.id, 'actions_correctives', e.target.value)} style={{ ...inp, resize: 'none' }} /></div>
                      {canWrite && <div className="md:col-span-2 flex justify-end"><button onClick={() => sauvegarderLigne(accidents.find(a => a.id === row.id)!)} disabled={saving === row.id} className="db-btn-primary" style={{ fontSize: 13 }}>{saving === row.id ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}{saving === row.id ? 'Sauvegarde...' : 'Sauvegarder'}</button></div>}
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
```

- [ ] **Step 2 : Créer `src/pages/DashboardAccidentsPage.tsx`**

```tsx
// src/pages/DashboardAccidentsPage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import SecuriteAccidents from '../dashboard/SecuriteAccidents';

interface Props { session: Session | null; }

function AccidentsContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return <SecuriteAccidents companyId={company.id} canWrite={canWrite} />;
}

export default function DashboardAccidentsPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <AccidentsContent session={session} />
    </DashboardGuard>
  );
}
```

- [ ] **Step 3 : Ajouter la route dans main.tsx**

```tsx
import DashboardAccidentsPage from './pages/DashboardAccidentsPage';
// ...
<Route path="/dashboard/accidents" element={<DashboardAccidentsPage session={session} />} />
```

- [ ] **Step 4 : Build check + commit**

```powershell
npm run build 2>&1 | Select-String -Pattern "error TS" | Select-Object -First 10
git add src/dashboard/SecuriteAccidents.tsx src/pages/DashboardAccidentsPage.tsx src/main.tsx
git commit -m "feat(dashboard): add Accidents/Incidents module with TF/TG calculation"
```

---

### Task 7 : Module Habilitations

**Files:**
- Create: `src/dashboard/Habilitations.tsx`
- Create: `src/pages/DashboardHabilitationsPage.tsx`

- [ ] **Step 1 : Créer `src/dashboard/Habilitations.tsx`**

```tsx
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

function getStatut(obtention: string | null, validiteAns: number): { label: string; color: string; j: number | null } {
  if (!obtention) return { label: 'À définir', color: '#64748b', j: null };
  const exp = calcExpiration(obtention, validiteAns);
  if (exp === null) return { label: 'À définir', color: '#64748b', j: null };
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

  const inp = { padding: '6px 10px', fontSize: 13, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 7, color: '#0f172a', fontFamily: 'inherit', outline: 'none', width: '100%' };

  return (
    <div className="space-y-5 pb-10">
      {/* En-tête */}
      <div className="db-page-header">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--mase-heading)]"><GraduationCap size={22} className="text-blue-500" /> Habilitations & Compétences</h2>
          <p className="text-sm text-[var(--mase-muted)] mt-1">Suivi des habilitations et alertes d'expiration</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setVE(!vueEmploye)} className="db-btn-secondary" style={vueEmploye ? { borderColor: 'rgba(59,130,246,0.4)', color: '#2563eb' } : {}}><Users size={15} /> {vueEmploye ? 'Vue liste' : 'Vue par employé'}</button>
          <button onClick={fetchHabs} className="db-btn-secondary"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualiser</button>
          {canWrite && <button onClick={() => setShowForm(true)} className="db-btn-primary"><Plus size={15} /> Délivrer une habilitation</button>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', val: kpis.total, color: '#3b82f6', sub: `${kpis.employes} employés` },
          { label: 'Valides', val: kpis.valides, color: '#10b981', sub: `Taux : ${kpis.taux}%` },
          { label: 'Périmées', val: kpis.perimees, color: kpis.perimees > 0 ? '#ef4444' : '#10b981', sub: 'Urgent' },
          { label: '< 30 jours', val: kpis.bientot30, color: kpis.bientot30 > 0 ? '#f59e0b' : '#10b981', sub: 'À planifier' },
          { label: '< 90 jours', val: kpis.bientot90, color: '#3b82f6', sub: 'À anticiper' },
        ].map((k, i) => (
          <div key={i} className="db-kpi">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{k.label}</p>
            <p className="text-3xl font-black" style={{ color: k.color }}>{k.val}</p>
            {i === 1 && <div style={{ height: 3, background: '#e2e8f0', borderRadius: 2, margin: '6px 0 2px' }}><div style={{ height: '100%', width: `${kpis.taux}%`, background: '#10b981', borderRadius: 2 }} /></div>}
            <p className="text-xs text-slate-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Alertes */}
      {kpis.perimees > 0 && <div className="db-alert-red"><AlertTriangle size={16} className="shrink-0" /><div><p className="font-semibold">{kpis.perimees} habilitation(s) périmée(s) — Renouvellement obligatoire</p><p className="text-xs mt-1 opacity-80">{habs.filter(h => getStatut(h.obtention, h.validite_ans).label === 'Périmée').map(h => `${h.employe} (${h.domaine?.substring(0, 20)})`).join(' · ')}</p></div></div>}
      {kpis.bientot30 > 0 && <div className="db-alert-amber"><Clock size={16} className="shrink-0" /><p className="font-semibold">{kpis.bientot30} habilitation(s) à renouveler dans moins de 30 jours</p></div>}

      {/* Formulaire */}
      {showForm && canWrite && (
        <div className="db-panel p-5" style={{ border: '1px solid rgba(59,130,246,0.2)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-[var(--mase-heading)]">Nouvelle habilitation</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Employé *</label><input type="text" value={form.employe} onChange={e => setForm({ ...form, employe: e.target.value })} placeholder="Nom Prénom..." style={inp} /></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Domaine *</label><select value={form.domaine} onChange={e => setForm({ ...form, domaine: e.target.value })} style={inp}>{LISTE_HABILITATIONS.map(h => <option key={h}>{h}</option>)}</select></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Date d'obtention</label><input type="date" value={form.obtention} onChange={e => setForm({ ...form, obtention: e.target.value })} style={inp} /></div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Validité</label>
              <div className="flex gap-2">
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
              <span className="text-slate-500">Expiration : </span>
              <strong style={{ color: st.color }}>{exp?.toLocaleDateString('fr-FR') || '—'}</strong>
              <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, color: st.color, background: `${st.color}15`, border: `1px solid ${st.color}40`, padding: '2px 8px', borderRadius: 100 }}>{st.label}</span>
            </div>;
          })()}
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="db-btn-secondary">Annuler</button>
            <button onClick={ajouterHab} disabled={!form.employe.trim()} className="db-btn-primary"><Save size={14} /> Enregistrer</button>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="db-panel p-3 flex flex-wrap gap-2 items-center">
        <Filter size={14} className="text-slate-400 shrink-0" />
        <select value={filtreEmploye} onChange={e => setFE(e.target.value)} style={{ padding: '5px 10px', fontSize: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, color: '#334155', outline: 'none' }}>
          {employes.map(e => <option key={e}>{e}</option>)}
        </select>
        <div className="w-px h-4 bg-slate-200" />
        {['Tous', 'Périmées', '< 30 jours', 'Valides'].map(s => {
          const c = s === 'Périmées' ? '#ef4444' : s === '< 30 jours' ? '#f59e0b' : s === 'Valides' ? '#10b981' : '#3b82f6';
          return <button key={s} onClick={() => setFS(s)} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, border: '1px solid', cursor: 'pointer', background: filtreStatut === s ? `${c}15` : '#f8fafc', borderColor: filtreStatut === s ? `${c}50` : '#e2e8f0', color: filtreStatut === s ? c : '#64748b' }}>{s}</button>;
        })}
        {(filtreEmploye !== 'Tous' || filtreStatut !== 'Tous') && <button onClick={() => { setFE('Tous'); setFS('Tous'); }} className="ml-auto text-xs text-slate-400 flex items-center gap-1 hover:text-slate-600" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={11} /> Reset</button>}
        <span className="text-xs text-slate-400 ml-auto">{habsFiltrees.length} ligne(s)</span>
      </div>

      {/* Vue par employé */}
      {vueEmploye ? (
        <div className="space-y-4">
          {Object.keys(habsParEmploye).sort().map(emp => {
            const liste = habsParEmploye[emp];
            const np = liste.filter(h => getStatut(h.obtention, h.validite_ans).label === 'Périmée').length;
            const n30 = liste.filter(h => getStatut(h.obtention, h.validite_ans).label === '< 30 jours').length;
            return (
              <div key={emp} className="db-panel overflow-hidden" style={{ borderLeft: `3px solid ${np > 0 ? '#ef4444' : n30 > 0 ? '#f59e0b' : '#10b981'}` }}>
                <div className="flex items-center justify-between p-4 border-b border-[var(--mase-border)]">
                  <div className="flex items-center gap-3">
                    <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'white' }}>{emp.charAt(0).toUpperCase()}</div>
                    <div><p className="font-bold text-[var(--mase-heading)]">{emp}</p><p className="text-slate-500 text-xs">{liste.length} habilitation(s)</p></div>
                  </div>
                  <div className="flex gap-2">
                    {np > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: 100 }}>{np} périmée(s)</span>}
                    {n30 > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: 100 }}>{n30} bientôt</span>}
                  </div>
                </div>
                {liste.map(h => {
                  const st = getStatut(h.obtention, h.validite_ans);
                  const exp = calcExpiration(h.obtention, h.validite_ans);
                  return (
                    <div key={h.id} className="flex items-center justify-between px-4 py-3 border-b border-[var(--mase-border)] last:border-0 hover:bg-slate-50">
                      <div>
                        <p className="text-sm font-medium text-[var(--mase-heading)]">{h.domaine}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Obtenu le {h.obtention || '—'} · {h.validite_ans}an{h.validite_ans > 1 ? 's' : ''} · Expire le {exp?.toLocaleDateString('fr-FR') || '—'}</p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: `${st.color}15`, border: `1px solid ${st.color}40`, padding: '2px 8px', borderRadius: 100 }}>{st.label}{st.j !== null && st.j >= 0 ? ` · ${st.j}j` : ''}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {Object.keys(habsParEmploye).length === 0 && <div className="db-panel p-10 text-center text-slate-400">Aucune habilitation pour ces filtres.</div>}
        </div>
      ) : (
        /* Vue liste */
        <div className="db-panel overflow-hidden">
          {loading ? (
            <div className="p-10 text-center"><RefreshCw size={24} className="animate-spin text-blue-400 mx-auto mb-2" /><p className="text-slate-400 text-sm">Chargement...</p></div>
          ) : habsFiltrees.length === 0 ? (
            <div className="p-10 text-center"><UserCheck size={32} className="text-emerald-400 mx-auto mb-2" /><p className="font-bold text-[var(--mase-heading)]">{habs.length === 0 ? 'Aucune habilitation. Cliquez sur "Délivrer une habilitation".' : 'Aucun résultat.'}</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="db-table">
                <thead><tr><th>Employé</th><th>Domaine</th><th style={{ width: 120, textAlign: 'center' }}>Obtention</th><th style={{ width: 160, textAlign: 'center' }}>Validité</th><th style={{ width: 120, textAlign: 'center' }}>Expiration</th><th style={{ width: 140, textAlign: 'center' }}>Statut</th><th style={{ width: 50 }} /></tr></thead>
                <tbody>
                  {habsFiltrees.map(row => {
                    const st = getStatut(row.obtention, row.validite_ans);
                    const exp = calcExpiration(row.obtention, row.validite_ans);
                    return (
                      <tr key={row.id} style={{ borderLeft: st.label === 'Périmée' ? '3px solid #ef4444' : st.label === '< 30 jours' ? '3px solid #f59e0b' : undefined }}>
                        <td><input value={row.employe || ''} onChange={e => updateLocal(row.id, 'employe', e.target.value)} onBlur={() => saveRow(habs.find(h => h.id === row.id)!)} style={{ ...inp, padding: '5px 8px', fontSize: 13 }} /></td>
                        <td><select value={row.domaine || ''} onChange={e => { updateLocal(row.id, 'domaine', e.target.value); }} onBlur={() => saveRow(habs.find(h => h.id === row.id)!)} style={{ ...inp, padding: '5px 8px', fontSize: 12 }}>{LISTE_HABILITATIONS.map(h => <option key={h}>{h}</option>)}</select></td>
                        <td><input type="date" value={row.obtention || ''} onChange={e => updateLocal(row.id, 'obtention', e.target.value)} onBlur={() => saveRow(habs.find(h => h.id === row.id)!)} style={{ ...inp, padding: '5px 8px', fontSize: 12 }} /></td>
                        <td>
                          <div className="flex justify-center gap-1">
                            {VALIDITES.map(v => (
                              <button key={v} onClick={() => { updateLocal(row.id, 'validite_ans', v); setTimeout(() => saveRow({ ...row, validite_ans: v }), 0); }}
                                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid', cursor: 'pointer', fontSize: 10, fontWeight: 700, background: Number(row.validite_ans) === v ? 'rgba(59,130,246,0.15)' : '#f8fafc', borderColor: Number(row.validite_ans) === v ? 'rgba(59,130,246,0.4)' : '#e2e8f0', color: Number(row.validite_ans) === v ? '#2563eb' : '#64748b' }}>
                                {v}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="text-center"><span style={{ fontSize: 12, fontWeight: 600, color: st.color }}>{exp?.toLocaleDateString('fr-FR') || '—'}</span></td>
                        <td className="text-center"><span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: `${st.color}15`, border: `1px solid ${st.color}40`, padding: '2px 8px', borderRadius: 100 }}>{st.label}{st.j !== null && st.j >= 0 ? ` · ${st.j}j` : ''}</span></td>
                        <td className="text-center">{saving === row.id ? <RefreshCw size={12} className="animate-spin text-blue-400" /> : canWrite && <button onClick={() => deleteRow(row.id)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 6 }} className="hover:text-red-400"><Trash2 size={14} /></button>}</td>
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
```

- [ ] **Step 2 : Créer `src/pages/DashboardHabilitationsPage.tsx`**

```tsx
// src/pages/DashboardHabilitationsPage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import Habilitations from '../dashboard/Habilitations';

interface Props { session: Session | null; }

function HabilitationsContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return <Habilitations companyId={company.id} canWrite={canWrite} />;
}

export default function DashboardHabilitationsPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <HabilitationsContent session={session} />
    </DashboardGuard>
  );
}
```

- [ ] **Step 3 : Ajouter la route dans main.tsx**

```tsx
import DashboardHabilitationsPage from './pages/DashboardHabilitationsPage';
// ...
<Route path="/dashboard/habilitations" element={<DashboardHabilitationsPage session={session} />} />
```

- [ ] **Step 4 : Build check + commit**

```powershell
npm run build 2>&1 | Select-String -Pattern "error TS" | Select-Object -First 10
git add src/dashboard/Habilitations.tsx src/pages/DashboardHabilitationsPage.tsx src/main.tsx
git commit -m "feat(dashboard): add Habilitations module with expiration alerts"
```

---

**Fin Partie 4.** Continuer avec la Partie 5 (KPIs + Revue de Direction + Routing final).
