# SMI Dashboard Phase 2 — Partie 3 : DUERP + Plan d'Actions PDCA

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Porter les modules DUERP et Plan d'Actions PDCA en TypeScript multi-tenant.

**Architecture:**
- Source DUERP : `qhse-dashboard2/src/RegistreDUERP.jsx` — table source `registre_duerp` → nouvelle table `risques`
- Source PDCA : `qhse-dashboard2/src/PlanActions.jsx` — table source `plan_actions` → nouvelle table `actions`
- Navigation DUERP → PDCA via `useNavigate('/dashboard/actions', { state: { prefill } })`
- Thème light-only : constante `T` inline, pas de `useTheme()`
- Pas de GestionListes (listes statiques), pas de WriteOnly (prop `canWrite`)
- Props : `companyId: string`, `canWrite: boolean`

---

### Task 4 : Module DUERP

**Files:**
- Create: `src/dashboard/RegistreDUERP.tsx`
- Create: `src/pages/DashboardDuerpPage.tsx`

- [ ] **Step 1 : Créer `src/dashboard/RegistreDUERP.tsx`**

```tsx
// src/dashboard/RegistreDUERP.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, AlertOctagon, RefreshCw, Shield, Filter, X, Save, Archive, RotateCcw, Eye, ListPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { diffJours } from './kpi-utils';

interface Props {
  companyId: string;
  canWrite: boolean;
}

interface Risque {
  id: string;
  company_id: string;
  date_maj: string | null;
  unite_travail: string;
  famille_risque: string | null;
  danger: string;
  evenement_declencheur: string | null;
  dommage_potentiel: string | null;
  personnes_exposees: string | null;
  gravite: number;
  probabilite: number;
  criticite: number;
  a_mesure_epc: boolean;
  mesures_epc: string | null;
  a_mesure_orga: boolean;
  mesures_orga: string | null;
  a_mesure_epi: boolean;
  mesures_epi: string | null;
  criticite_resid: number;
  coefficient_reducteur: number;
  action_preventive: string | null;
  pilote: string | null;
  echeance: string | null;
  archived_at: string | null;
}

const LISTE_UT = ['Atelier Production', 'Magasin / Logistique', 'Bureaux Administratifs', 'Maintenance', 'Chantier / Déplacement', 'Accueil / Réception', 'Direction'];
const FAMILLES = ['Chutes de plain-pied', 'Chutes de hauteur', 'Manutention manuelle', 'Risques mécaniques', 'Risques électriques', 'Risques chimiques', 'Risques biologiques', 'Ambiances physiques', 'Incendie / ATEX', 'Risques ergonomiques', 'Risques psychosociaux', 'Circulation / Déplacements', 'Co-activité', 'Autre'];
const PERSONNES = ['Tous les salariés', 'Opérateurs production', 'Techniciens maintenance', 'Personnel administratif', 'Personnel logistique', 'Encadrement', 'Intervenants extérieurs'];

function getCoeff(epc: boolean, orga: boolean, epi: boolean): number {
  if (epc && orga && epi) return 0.30;
  if (epc && orga) return 0.40;
  if (epc && epi) return 0.45;
  if (orga && epi) return 0.60;
  if (epc) return 0.50;
  if (orga) return 0.70;
  if (epi) return 0.80;
  return 1.00;
}

function calcCR(g: number, p: number, epc: boolean, orga: boolean, epi: boolean): number {
  return Math.max(1, Math.round(g * p * getCoeff(epc, orga, epi)));
}

function getCInfo(score: number): { label: string; color: string; bg: string; border: string } {
  if (score >= 13) return { label: 'Inacceptable',   color: '#991b1b', bg: '#fef2f2', border: '#fecaca' };
  if (score >= 9)  return { label: 'Action requise', color: '#9a3412', bg: '#ffedd5', border: '#fb923c' };
  if (score >= 5)  return { label: 'À surveiller',   color: '#92400e', bg: '#fefce8', border: '#fde047' };
  return              { label: 'Acceptable',         color: '#166534', bg: '#f0fdf4', border: '#86efac' };
}

function toPdcaPrefill(row: Risque) {
  const cr = row.criticite_resid ?? row.criticite ?? 1;
  return {
    origine: 'DUERP',
    domaine: 'Sécurité',
    type_action: 'Préventive',
    action: row.action_preventive?.trim() || `Maîtrise du risque : ${row.danger}`,
    cause_racine: [row.famille_risque, row.evenement_declencheur].filter(Boolean).join(' — '),
    reference_source: `DUERP · ${row.unite_travail}`,
    pilote: row.pilote || '',
    echeance: row.echeance || '',
    priorite: cr >= 13 ? '🔴 Urgente' : cr >= 9 ? '🟠 Haute' : '🟡 Normale',
    commentaire: `Risque : ${row.danger}. Dommage : ${row.dommage_potentiel || '—'}. CR = ${cr}.`,
    statut: 'À lancer',
    avancement_pct: 0,
    resultat_efficacite: 'Non évalué',
  };
}

const FORM_INIT = {
  date_maj: new Date().toISOString().split('T')[0],
  unite_travail: LISTE_UT[0],
  famille_risque: '',
  danger: '',
  evenement_declencheur: '',
  dommage_potentiel: '',
  personnes_exposees: [] as string[],
  gravite: 2,
  probabilite: 2,
  a_mesure_epc: false, mesures_epc: '',
  a_mesure_orga: false, mesures_orga: '',
  a_mesure_epi: false, mesures_epi: '',
  action_preventive: '',
  pilote: '',
  echeance: '',
};

export default function RegistreDUERP({ companyId, canWrite }: Props) {
  const navigate = useNavigate();
  const [risques, setRisques] = useState<Risque[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'registre' | 'matrice' | 'historique'>('registre');
  const [detailRow, setDetailRow] = useState<Risque | null>(null);
  const [filtreUT, setFiltreUT] = useState('Tous');
  const [filtreNiveau, setFiltreNiveau] = useState('Tous');
  const [form, setForm] = useState({ ...FORM_INIT });
  const [saveError, setSaveError] = useState('');
  const risquesRef = useRef(risques);
  useEffect(() => { risquesRef.current = risques; }, [risques]);
  useEffect(() => { fetchRisques(); }, []);

  async function fetchRisques() {
    setLoading(true);
    const { data } = await supabase.from('risques').select('*').order('criticite', { ascending: false });
    if (data) setRisques(data as Risque[]);
    setLoading(false);
  }

  async function archiveRow(id: string) {
    const now = new Date().toISOString();
    await supabase.from('risques').update({ archived_at: now }).eq('id', id);
    setRisques(prev => prev.map(r => r.id === id ? { ...r, archived_at: now } : r));
  }

  async function restoreRow(id: string) {
    await supabase.from('risques').update({ archived_at: null }).eq('id', id);
    setRisques(prev => prev.map(r => r.id === id ? { ...r, archived_at: null } : r));
  }

  function updateLocal(id: string, updates: Partial<Risque>) {
    setRisques(prev => prev.map(row => {
      if (row.id !== id) return row;
      const u = { ...row, ...updates };
      u.criticite = Number(u.gravite) * Number(u.probabilite);
      u.criticite_resid = calcCR(u.gravite, u.probabilite, u.a_mesure_epc, u.a_mesure_orga, u.a_mesure_epi);
      u.coefficient_reducteur = getCoeff(u.a_mesure_epc, u.a_mesure_orga, u.a_mesure_epi);
      return u;
    }));
  }

  async function saveRow(row: Risque) {
    if (!row) return;
    setSaving(row.id);
    await supabase.from('risques').update({
      unite_travail: row.unite_travail, famille_risque: row.famille_risque,
      danger: row.danger, evenement_declencheur: row.evenement_declencheur,
      dommage_potentiel: row.dommage_potentiel, personnes_exposees: row.personnes_exposees,
      gravite: row.gravite, probabilite: row.probabilite, criticite: row.criticite,
      a_mesure_epc: row.a_mesure_epc, mesures_epc: row.mesures_epc,
      a_mesure_orga: row.a_mesure_orga, mesures_orga: row.mesures_orga,
      a_mesure_epi: row.a_mesure_epi, mesures_epi: row.mesures_epi,
      criticite_resid: row.criticite_resid, coefficient_reducteur: row.coefficient_reducteur,
      action_preventive: row.action_preventive, pilote: row.pilote,
      echeance: row.echeance || null, date_maj: row.date_maj,
    }).eq('id', row.id);
    setSaving(null);
  }

  function saveById(id: string) {
    const row = risquesRef.current.find(r => r.id === id);
    if (row) saveRow(row);
  }

  async function ajouterRisque() {
    if (!form.danger.trim()) return;
    setSaveError('');
    const ci = form.gravite * form.probabilite;
    const cr = calcCR(form.gravite, form.probabilite, form.a_mesure_epc, form.a_mesure_orga, form.a_mesure_epi);
    const coeff = getCoeff(form.a_mesure_epc, form.a_mesure_orga, form.a_mesure_epi);
    const { data, error } = await supabase.from('risques').insert([{
      company_id: companyId,
      unite_travail: form.unite_travail, famille_risque: form.famille_risque || null,
      danger: form.danger, evenement_declencheur: form.evenement_declencheur || null,
      dommage_potentiel: form.dommage_potentiel || null,
      personnes_exposees: Array.isArray(form.personnes_exposees) ? form.personnes_exposees.join(' / ') || null : null,
      gravite: form.gravite, probabilite: form.probabilite, criticite: ci,
      a_mesure_epc: form.a_mesure_epc, mesures_epc: form.mesures_epc || null,
      a_mesure_orga: form.a_mesure_orga, mesures_orga: form.mesures_orga || null,
      a_mesure_epi: form.a_mesure_epi, mesures_epi: form.mesures_epi || null,
      criticite_resid: cr, coefficient_reducteur: coeff,
      action_preventive: form.action_preventive || null, pilote: form.pilote || null,
      echeance: form.echeance || null, date_maj: form.date_maj || null,
    }]).select();
    if (error) { setSaveError(`Erreur : ${error.message}`); return; }
    if (data?.[0]) {
      setRisques(prev => [...prev, data[0] as Risque].sort((a, b) => (b.criticite_resid || 1) - (a.criticite_resid || 1)));
      setShowForm(false);
      setForm({ ...FORM_INIT });
    }
  }

  async function deleteRow(id: string) {
    if (!window.confirm('Supprimer ce risque définitivement ?')) return;
    await supabase.from('risques').delete().eq('id', id);
    setRisques(prev => prev.filter(r => r.id !== id));
  }

  const kpis = useMemo(() => {
    const actifs = risques.filter(r => !r.archived_at);
    const score = (r: Risque) => r.criticite_resid || r.criticite || 1;
    return {
      total: actifs.length,
      inacceptable: actifs.filter(r => score(r) >= 13).length,
      actionRequise: actifs.filter(r => score(r) >= 9 && score(r) < 13).length,
      surveillance: actifs.filter(r => score(r) >= 5 && score(r) < 9).length,
      acceptables: actifs.filter(r => score(r) < 5).length,
    };
  }, [risques]);

  const showArchive = activeTab === 'historique';
  const risquesFiltres = useMemo(() => risques.filter(r => {
    if (showArchive ? !r.archived_at : r.archived_at) return false;
    const s = r.criticite_resid || r.criticite || 1;
    if (filtreUT !== 'Tous' && r.unite_travail !== filtreUT) return false;
    if (filtreNiveau === 'Inacceptable' && s < 13) return false;
    if (filtreNiveau === 'Action requise' && (s < 9 || s >= 13)) return false;
    if (filtreNiveau === 'À surveiller' && (s < 5 || s >= 9)) return false;
    if (filtreNiveau === 'Acceptable' && s >= 5) return false;
    return true;
  }), [risques, filtreUT, filtreNiveau, showArchive]);

  const inp = { padding: '5px 8px', fontSize: 12, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, color: '#0f172a', fontFamily: 'inherit', outline: 'none', width: '100%' };

  return (
    <div className="space-y-5 pb-10">
      {/* En-tête */}
      <div className="db-page-header">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--mase-heading)]">
            <Shield size={22} className="text-amber-500" /> Registre DUERP
          </h2>
          <p className="text-sm text-[var(--mase-muted)] mt-1">Évaluation et maîtrise des risques — Pondération EPC / ORG / EPI</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchRisques} className="db-btn-secondary">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
          {canWrite && activeTab === 'registre' && (
            <button onClick={() => setShowForm(true)} className="db-btn-primary" style={{ background: '#f59e0b' }}>
              <Plus size={15} /> Identifier un risque
            </button>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-[var(--mase-border)]">
        {(['registre', 'matrice', 'historique'] as const).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setShowForm(false); }}
            className="px-4 py-2 text-sm font-semibold capitalize transition-colors"
            style={{ borderBottom: `2px solid ${activeTab === tab ? '#f59e0b' : 'transparent'}`, background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab ? '#f59e0b' : 'transparent'}`, color: activeTab === tab ? '#f59e0b' : '#64748b', cursor: 'pointer', marginBottom: -1 }}>
            {tab}
            {tab === 'registre' && ` (${risques.filter(r => !r.archived_at).length})`}
            {tab === 'historique' && ` (${risques.filter(r => r.archived_at).length})`}
          </button>
        ))}
      </div>

      {/* Matrice */}
      {activeTab === 'matrice' && (
        <div className="db-panel p-5">
          <h3 className="font-bold mb-4 text-[var(--mase-heading)]">Matrice de criticité 4×4</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '36px repeat(4, 54px)', gap: 4 }}>
            <div />
            {[1, 2, 3, 4].map(f => <div key={f} className="text-center text-xs text-slate-500 font-bold pb-1">F={f}</div>)}
            {[4, 3, 2, 1].map(g => (
              <React.Fragment key={g}>
                <div className="flex items-center justify-center text-xs text-slate-500 font-bold">G={g}</div>
                {[1, 2, 3, 4].map(f => {
                  const sc = g * f;
                  const info = getCInfo(sc);
                  const cnt = risques.filter(r => Number(r.gravite) === g && Number(r.probabilite) === f && !r.archived_at).length;
                  return (
                    <div key={f} style={{ width: 54, height: 54, background: info.bg, border: `1.5px solid ${info.border}`, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: info.color, fontSize: 17, fontWeight: 900 }}>{sc}</span>
                      {cnt > 0 && <span style={{ background: info.color, color: 'white', borderRadius: 100, padding: '0 5px', fontSize: 9, marginTop: 2, fontWeight: 700 }}>{cnt}</span>}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      {activeTab === 'registre' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total', val: kpis.total, color: '#3b82f6', sub: 'Risques actifs' },
              { label: 'Inacceptables ≥13', val: kpis.inacceptable, color: kpis.inacceptable > 0 ? '#ef4444' : '#10b981', sub: 'Urgent' },
              { label: 'Action requise 9-12', val: kpis.actionRequise, color: kpis.actionRequise > 0 ? '#f97316' : '#10b981', sub: 'Plan requis' },
              { label: 'À surveiller 5-8', val: kpis.surveillance, color: '#f59e0b', sub: 'Contrôle' },
              { label: 'Acceptables <5', val: kpis.acceptables, color: '#10b981', sub: 'Maîtrisés' },
            ].map((k, i) => (
              <div key={i} className="db-kpi">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{k.label}</p>
                <p className="text-3xl font-black" style={{ color: k.color }}>{k.val}</p>
                <p className="text-xs text-slate-400 mt-1">{k.sub}</p>
              </div>
            ))}
          </div>
          {(kpis.inacceptable > 0 || kpis.actionRequise > 0) && (
            <div className="db-alert-red">
              <AlertOctagon size={16} className="shrink-0 mt-0.5" />
              <p className="font-semibold">{kpis.inacceptable + kpis.actionRequise} risque(s) nécessitant une action immédiate</p>
            </div>
          )}
        </>
      )}

      {/* Formulaire ajout */}
      {showForm && canWrite && activeTab === 'registre' && (
        <div className="db-panel p-5" style={{ border: '1px solid rgba(245,158,11,0.3)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-[var(--mase-heading)]">Identifier un risque</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Unité de travail *</label>
              <select value={form.unite_travail} onChange={e => setForm({ ...form, unite_travail: e.target.value })} className="db-input">
                {LISTE_UT.map(ut => <option key={ut}>{ut}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Famille de risque</label>
              <select value={form.famille_risque} onChange={e => setForm({ ...form, famille_risque: e.target.value })} className="db-input">
                <option value="">— Sélectionner —</option>
                {FAMILLES.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Danger précis *</label>
              <input type="text" value={form.danger} onChange={e => setForm({ ...form, danger: e.target.value })} placeholder="Ex: Sol glissant en zone humide..." className="db-input" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Événement déclencheur</label>
              <input type="text" value={form.evenement_declencheur} onChange={e => setForm({ ...form, evenement_declencheur: e.target.value })} className="db-input" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Dommage potentiel</label>
              <input type="text" value={form.dommage_potentiel} onChange={e => setForm({ ...form, dommage_potentiel: e.target.value })} className="db-input" />
            </div>
          </div>
          {/* Cotation G × F */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-end">
            {(['gravite', 'probabilite'] as const).map(key => {
              const labels = key === 'gravite'
                ? ['Premiers soins', 'Arrêt <10j', 'Arrêt >10j', 'Décès']
                : ['< 1×/an', 'Quelques fois/an', 'Hebdomadaire', 'Quotidien'];
              return (
                <div key={key}>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    {key === 'gravite' ? 'Gravité (1→4)' : 'Fréquence (1→4)'}
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(v => {
                      const sel = form[key] === v;
                      const color = v >= 4 ? '#ef4444' : v >= 3 ? '#f97316' : v >= 2 ? '#f59e0b' : '#10b981';
                      return (
                        <button key={v} title={labels[v - 1]} onClick={() => setForm({ ...form, [key]: v })}
                          style={{ flex: 1, height: 40, borderRadius: 7, border: `2px solid ${sel ? color : '#e2e8f0'}`, background: sel ? `${color}15` : '#f8fafc', color: sel ? color : '#64748b', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
                          {v}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Criticité initiale</label>
              {(() => { const ci = form.gravite * form.probabilite; const info = getCInfo(ci);
                return <div style={{ background: info.bg, border: `1.5px solid ${info.border}`, borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: info.color }}>{ci}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: info.color }}>{info.label}</div>
                </div>; })()}
            </div>
          </div>
          {/* Mesures EPC/ORG/EPI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {[
              { key: 'a_mesure_epc' as const, descKey: 'mesures_epc' as const, label: 'EPC — Collective', color: '#3b82f6', coeff: '×0.50' },
              { key: 'a_mesure_orga' as const, descKey: 'mesures_orga' as const, label: 'ORG — Organisation', color: '#8b5cf6', coeff: '×0.70' },
              { key: 'a_mesure_epi' as const, descKey: 'mesures_epi' as const, label: 'EPI — Individuelle', color: '#f59e0b', coeff: '×0.80' },
            ].map(m => (
              <div key={m.key}>
                <div className="flex items-center gap-2 mb-1">
                  <button onClick={() => setForm({ ...form, [m.key]: !form[m.key] })}
                    style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${form[m.key] ? m.color : '#e2e8f0'}`, background: form[m.key] ? m.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    {form[m.key] && <span style={{ color: 'white', fontSize: 12 }}>✓</span>}
                  </button>
                  <span style={{ fontSize: 11, fontWeight: 700, color: form[m.key] ? m.color : '#94a3b8', textTransform: 'uppercase' }}>{m.label} <span style={{ opacity: 0.6 }}>({m.coeff})</span></span>
                </div>
                <input type="text" disabled={!form[m.key]} value={form[m.descKey]} onChange={e => setForm({ ...form, [m.descKey]: e.target.value })} className="db-input" style={{ fontSize: 11, opacity: form[m.key] ? 1 : 0.4 }} />
              </div>
            ))}
          </div>
          {/* Action planifiée */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Action planifiée</label>
              <input type="text" value={form.action_preventive} onChange={e => setForm({ ...form, action_preventive: e.target.value })} className="db-input" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Pilote</label>
              <input type="text" value={form.pilote} onChange={e => setForm({ ...form, pilote: e.target.value })} className="db-input" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Échéance</label>
              <input type="date" value={form.echeance} onChange={e => setForm({ ...form, echeance: e.target.value })} className="db-input" />
            </div>
          </div>
          {saveError && <div className="db-alert-red mb-3"><AlertOctagon size={14} /><p>{saveError}</p></div>}
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="db-btn-secondary">Annuler</button>
            <button onClick={ajouterRisque} disabled={!form.danger.trim()} className="db-btn-primary" style={{ background: '#f59e0b' }}>
              <Save size={14} /> Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* Filtres */}
      {(activeTab === 'registre' || activeTab === 'historique') && (
        <div className="db-panel p-3 flex flex-wrap gap-2 items-center">
          <Filter size={14} className="text-slate-400 shrink-0" />
          {['Tous', ...LISTE_UT].map(ut => (
            <button key={ut} onClick={() => setFiltreUT(ut)}
              style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, border: '1px solid', cursor: 'pointer', background: filtreUT === ut ? 'rgba(245,158,11,0.15)' : '#f8fafc', borderColor: filtreUT === ut ? 'rgba(245,158,11,0.5)' : '#e2e8f0', color: filtreUT === ut ? '#92400e' : '#64748b' }}>
              {ut}
            </button>
          ))}
          <div className="w-px h-4 bg-slate-200" />
          {['Tous', 'Inacceptable', 'Action requise', 'À surveiller', 'Acceptable'].map(n => {
            const c = n === 'Inacceptable' ? '#ef4444' : n === 'Action requise' ? '#f97316' : n === 'À surveiller' ? '#f59e0b' : n === 'Acceptable' ? '#10b981' : '#3b82f6';
            return <button key={n} onClick={() => setFiltreNiveau(n)}
              style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, border: '1px solid', cursor: 'pointer', background: filtreNiveau === n ? `${c}15` : '#f8fafc', borderColor: filtreNiveau === n ? `${c}50` : '#e2e8f0', color: filtreNiveau === n ? c : '#64748b' }}>
              {n}
            </button>;
          })}
          {(filtreUT !== 'Tous' || filtreNiveau !== 'Tous') && (
            <button onClick={() => { setFiltreUT('Tous'); setFiltreNiveau('Tous'); }} className="ml-auto text-slate-400 text-xs flex items-center gap-1 hover:text-slate-600" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={11} /> Reset
            </button>
          )}
          <span className="text-slate-400 text-xs ml-auto">{risquesFiltres.length} risque(s)</span>
        </div>
      )}

      {/* Tableau */}
      {(activeTab === 'registre' || activeTab === 'historique') && (
        <div className="db-panel overflow-hidden">
          {loading ? (
            <div className="p-10 text-center"><RefreshCw size={24} className="animate-spin text-blue-400 mx-auto mb-2" /><p className="text-slate-400 text-sm">Chargement...</p></div>
          ) : risquesFiltres.length === 0 ? (
            <div className="p-10 text-center"><Shield size={32} className="text-emerald-400 mx-auto mb-2" /><p className="font-bold text-[var(--mase-heading)]">{risques.length === 0 ? 'Aucun risque identifié.' : 'Aucun risque pour ces filtres.'}</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="db-table" style={{ minWidth: 900 }}>
                <thead>
                  <tr>
                    <th>Unité de travail</th>
                    <th>Danger</th>
                    <th style={{ width: 50, textAlign: 'center' }}>G</th>
                    <th style={{ width: 50, textAlign: 'center' }}>F</th>
                    <th style={{ width: 64, textAlign: 'center' }}>CI</th>
                    <th style={{ width: 80, textAlign: 'center' }}>EPC·ORG·EPI</th>
                    <th style={{ width: 80, textAlign: 'center' }}>CR</th>
                    <th style={{ width: 100 }}>Pilote</th>
                    <th style={{ width: 80, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {risquesFiltres.map(row => {
                    const ci = Number(row.gravite) * Number(row.probabilite);
                    const cr = row.criticite_resid ?? calcCR(row.gravite, row.probabilite, row.a_mesure_epc, row.a_mesure_orga, row.a_mesure_epi);
                    const crInfo = getCInfo(cr);
                    const borderColor = cr >= 13 ? '#ef4444' : cr >= 9 ? '#f97316' : cr >= 5 ? '#f59e0b' : '#10b981';
                    return (
                      <tr key={row.id} style={{ borderLeft: `3px solid ${borderColor}` }}>
                        <td><select value={row.unite_travail} onChange={e => { updateLocal(row.id, { unite_travail: e.target.value }); saveById(row.id); }} style={{ ...inp, cursor: 'pointer' }}>{LISTE_UT.map(ut => <option key={ut}>{ut}</option>)}</select></td>
                        <td>
                          {row.famille_risque && <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700, marginBottom: 2 }}>{row.famille_risque}</div>}
                          <input type="text" value={row.danger} onChange={e => updateLocal(row.id, { danger: e.target.value })} onBlur={() => saveById(row.id)} style={{ ...inp, fontWeight: 600 }} />
                        </td>
                        <td className="text-center">
                          <select value={row.gravite} onChange={e => { const g = Number(e.target.value); updateLocal(row.id, { gravite: g }); saveById(row.id); }} style={{ ...inp, color: row.gravite >= 3 ? '#ef4444' : '#f59e0b', fontWeight: 800, fontSize: 14, appearance: 'none', textAlign: 'center' }}>
                            {[1, 2, 3, 4].map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </td>
                        <td className="text-center">
                          <select value={row.probabilite} onChange={e => { const p = Number(e.target.value); updateLocal(row.id, { probabilite: p }); saveById(row.id); }} style={{ ...inp, color: row.probabilite >= 3 ? '#ef4444' : '#f59e0b', fontWeight: 800, fontSize: 14, appearance: 'none', textAlign: 'center' }}>
                            {[1, 2, 3, 4].map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </td>
                        <td className="text-center"><div style={{ background: getCInfo(ci).bg, border: `1px solid ${getCInfo(ci).border}`, borderRadius: 6, padding: '4px 2px', fontWeight: 900, fontSize: 15, color: getCInfo(ci).color }}>{ci}</div></td>
                        <td className="text-center">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                            {[{ key: 'a_mesure_epc' as const, label: 'EPC', color: '#3b82f6' }, { key: 'a_mesure_orga' as const, label: 'ORG', color: '#8b5cf6' }, { key: 'a_mesure_epi' as const, label: 'EPI', color: '#f59e0b' }].map(m => (
                              canWrite ? <button key={m.key} onClick={() => { updateLocal(row.id, { [m.key]: !row[m.key] } as Partial<Risque>); saveById(row.id); }}
                                style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, border: `1px solid ${row[m.key] ? m.color + '60' : '#e2e8f0'}`, background: row[m.key] ? `${m.color}15` : '#f8fafc', color: row[m.key] ? m.color : '#94a3b8', cursor: 'pointer', width: 32 }}>
                                {m.label}
                              </button> : <span key={m.key} style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: row[m.key] ? `${m.color}15` : '#f8fafc', color: row[m.key] ? m.color : '#94a3b8' }}>{m.label}</span>
                            ))}
                          </div>
                        </td>
                        <td className="text-center">
                          <div style={{ background: crInfo.bg, border: `1.5px solid ${crInfo.border}`, borderRadius: 8, padding: '5px 4px', fontWeight: 900, fontSize: 18, color: crInfo.color }}>{cr}</div>
                          <div style={{ fontSize: 9, color: crInfo.color, fontWeight: 700 }}>{crInfo.label}</div>
                        </td>
                        <td><input type="text" value={row.pilote || ''} onChange={e => updateLocal(row.id, { pilote: e.target.value })} onBlur={() => saveById(row.id)} placeholder="Pilote..." style={{ ...inp, fontSize: 11 }} /></td>
                        <td className="text-center">
                          <div className="flex gap-1 justify-center">
                            {saving === row.id ? <RefreshCw size={12} className="animate-spin text-blue-400" /> : <>
                              <button onClick={() => setDetailRow(row)} title="Détail" style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Eye size={14} /></button>
                              {!showArchive && (
                                <button onClick={() => navigate('/dashboard/actions', { state: { prefill: toPdcaPrefill(row) } })} title="Créer une action PDCA" style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><ListPlus size={14} /></button>
                              )}
                              {canWrite && (showArchive
                                ? <><button onClick={() => restoreRow(row.id)} style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><RotateCcw size={13} /></button>
                                   <button onClick={() => deleteRow(row.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Trash2 size={13} /></button></>
                                : <button onClick={() => archiveRow(row.id)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Archive size={14} /></button>
                              )}
                            </>}
                          </div>
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

      {/* Modal détail simplifié */}
      {detailRow && (
        <div onClick={e => e.target === e.currentTarget && setDetailRow(null)} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="db-panel" style={{ width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-[var(--mase-heading)]">{detailRow.danger}</h3>
              <button onClick={() => setDetailRow(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <p><strong>Unité :</strong> {detailRow.unite_travail}</p>
              <p><strong>Famille :</strong> {detailRow.famille_risque || '—'}</p>
              <p><strong>Dommage potentiel :</strong> {detailRow.dommage_potentiel || '—'}</p>
              <p><strong>Personnes exposées :</strong> {detailRow.personnes_exposees || '—'}</p>
              <p><strong>Gravité × Fréquence :</strong> {detailRow.gravite} × {detailRow.probabilite} = CI {detailRow.criticite}</p>
              <p><strong>Criticité résiduelle :</strong> {detailRow.criticite_resid} ({getCInfo(detailRow.criticite_resid).label})</p>
              <p><strong>EPC :</strong> {detailRow.mesures_epc || '—'}</p>
              <p><strong>ORG :</strong> {detailRow.mesures_orga || '—'}</p>
              <p><strong>EPI :</strong> {detailRow.mesures_epi || '—'}</p>
              <p><strong>Action :</strong> {detailRow.action_preventive || '—'}</p>
              <p><strong>Pilote :</strong> {detailRow.pilote || '—'} — Échéance : {detailRow.echeance || '—'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2 : Créer `src/pages/DashboardDuerpPage.tsx`**

```tsx
// src/pages/DashboardDuerpPage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import RegistreDUERP from '../dashboard/RegistreDUERP';

interface Props { session: Session | null; }

function DuerpContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return <RegistreDUERP companyId={company.id} canWrite={canWrite} />;
}

export default function DashboardDuerpPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <DuerpContent session={session} />
    </DashboardGuard>
  );
}
```

- [ ] **Step 3 : Ajouter la route dans `src/main.tsx`** (juste après la route `/dashboard`)

```tsx
// Ajouter l'import en haut :
import DashboardDuerpPage from './pages/DashboardDuerpPage';

// Ajouter la Route :
<Route path="/dashboard/duerp" element={<DashboardDuerpPage session={session} />} />
```

- [ ] **Step 4 : Build check**

```powershell
npm run build 2>&1 | Select-String -Pattern "error TS" | Select-Object -First 10
```

Résultat attendu : aucune erreur TypeScript.

- [ ] **Step 5 : Commit**

```powershell
git add src/dashboard/RegistreDUERP.tsx src/pages/DashboardDuerpPage.tsx src/main.tsx
git commit -m "feat(dashboard): add DUERP module with company_id isolation"
```

---

### Task 5 : Module Plan d'Actions PDCA

**Files:**
- Create: `src/dashboard/PlanActions.tsx`
- Create: `src/pages/DashboardActionsPage.tsx`

- [ ] **Step 1 : Créer `src/dashboard/PlanActions.tsx`**

```tsx
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
  date_cible_revisee: string | null;
  priorite: string;
  statut: string;
  avancement_pct: number;
  cout_estime: number | null;
  cout_reel: number | null;
  resultat_efficacite: string | null;
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
  priorite: PRIORITES[2], statut: 'À lancer', avancement_pct: 0,
  cout_estime: '', cout_reel: '', resultat_efficacite: 'Non évalué', commentaire: '',
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

  // Pré-remplissage depuis DUERP via react-router state
  useEffect(() => {
    if (!prefill) return;
    const filled = Object.fromEntries(
      Object.entries(prefill).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );
    setForm(prev => ({ ...prev, ...filled } as typeof prev));
    setShowForm(true);
    setShowArchive(false);
    // Nettoyer le state pour éviter re-trigger
    window.history.replaceState({}, '');
  }, []);

  async function fetchActions() {
    setLoading(true);
    const { data } = await supabase.from('actions').select('*').order('created_at', { ascending: true });
    if (data) setActions(data as Action[]);
    setLoading(false);
  }

  async function archiveRow(id: string) {
    const now = new Date().toISOString();
    await supabase.from('actions').update({ archived_at: now }).eq('id', id);
    setActions(prev => prev.map(a => a.id === id ? { ...a, archived_at: now } : a));
  }

  async function restoreRow(id: string) {
    await supabase.from('actions').update({ archived_at: null }).eq('id', id);
    setActions(prev => prev.map(a => a.id === id ? { ...a, archived_at: null } : a));
  }

  function updateLocal(id: string, field: keyof Action, value: unknown) {
    setActions(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  async function saveRow(row: Action) {
    if (!row) return;
    setSaving(row.id);
    await supabase.from('actions').update({
      origine: row.origine, reference_source: row.reference_source,
      domaine: row.domaine, type_action: row.type_action,
      action: row.action, cause_racine: row.cause_racine,
      pilote: row.pilote, echeance: row.echeance || null,
      priorite: row.priorite, statut: row.statut,
      avancement_pct: Number(row.avancement_pct || 0),
      commentaire: row.commentaire, resultat_efficacite: row.resultat_efficacite,
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
      commentaire: form.commentaire || null, resultat_efficacite: form.resultat_efficacite,
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

  const inp = { padding: '5px 8px', fontSize: 12, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, color: '#0f172a', fontFamily: 'inherit', outline: 'none', width: '100%' };

  return (
    <div className="space-y-5 pb-10">
      <div className="db-page-header">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--mase-heading)]">
            <Target size={22} className="text-blue-500" /> Plan d'Actions Global
          </h2>
          <p className="text-sm text-[var(--mase-muted)] mt-1">Actions correctives, préventives et d'amélioration — PDCA</p>
          <div className="flex gap-2 mt-2">
            {[{ label: `Actives (${actions.filter(a => !a.archived_at).length})`, arch: false }, { label: `Historique (${actions.filter(a => a.archived_at).length})`, arch: true }].map(b => (
              <button key={String(b.arch)} onClick={() => setShowArchive(b.arch)}
                style={{ fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 100, border: '1px solid', cursor: 'pointer', background: showArchive === b.arch ? 'rgba(59,130,246,0.15)' : 'transparent', borderColor: showArchive === b.arch ? 'rgba(59,130,246,0.4)' : '#e2e8f0', color: showArchive === b.arch ? '#2563eb' : '#64748b' }}>
                {b.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
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
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{k.label}</p>
            <p className="text-3xl font-black" style={{ color: k.color }}>{k.val}</p>
            {i === 1 && <div style={{ height: 3, background: '#e2e8f0', borderRadius: 2, margin: '6px 0 4px' }}><div style={{ height: '100%', width: `${kpis.taux}%`, background: '#10b981', borderRadius: 2 }} /></div>}
            <p className="text-xs text-slate-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>
      {kpis.retard > 0 && <div className="db-alert-red"><AlertTriangle size={16} className="shrink-0" /><p className="font-semibold">{kpis.retard} action(s) en retard — Traitement prioritaire requis</p></div>}
      {kpis.urgentes > 0 && <div className="db-alert-amber"><Clock size={16} className="shrink-0" /><p className="font-semibold">{kpis.urgentes} action(s) urgente(s) en cours</p></div>}

      {/* Formulaire */}
      {showForm && canWrite && (
        <div className="db-panel p-5" style={{ border: '1px solid rgba(59,130,246,0.3)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-[var(--mase-heading)]">Nouvelle action</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
          </div>
          {form.reference_source && (
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '8px 14px', marginBottom: 14, fontSize: 12, color: '#047857' }}>
              Pré-rempli depuis {form.origine} — {form.reference_source}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Source / Origine</label>
              <select value={form.origine} onChange={e => setForm({ ...form, origine: e.target.value })} className="db-input">{ORIGINES.map(o => <option key={o}>{o}</option>)}</select></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Référence source</label>
              <input type="text" value={form.reference_source} onChange={e => setForm({ ...form, reference_source: e.target.value })} placeholder="DUERP-2025-PROD-001..." className="db-input" /></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Domaine QHSE</label>
              <select value={form.domaine} onChange={e => setForm({ ...form, domaine: e.target.value })} className="db-input">{DOMAINES.map(d => <option key={d}>{d}</option>)}</select></div>
            <div className="md:col-span-3"><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Action à mettre en place *</label>
              <input type="text" value={form.action} onChange={e => setForm({ ...form, action: e.target.value })} placeholder="Décrivez l'action corrective ou préventive..." className="db-input" /></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Type d'action</label>
              <select value={form.type_action} onChange={e => setForm({ ...form, type_action: e.target.value })} className="db-input">{TYPES_ACTION.map(t => <option key={t}>{t}</option>)}</select></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Pilote</label>
              <input type="text" value={form.pilote} onChange={e => setForm({ ...form, pilote: e.target.value })} className="db-input" /></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Échéance</label>
              <input type="date" value={form.echeance} onChange={e => setForm({ ...form, echeance: e.target.value })} className="db-input" /></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Priorité</label>
              <select value={form.priorite} onChange={e => setForm({ ...form, priorite: e.target.value })} className="db-input">{PRIORITES.map(pr => <option key={pr}>{pr}</option>)}</select></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Statut initial</label>
              <select value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })} className="db-input">{STATUTS.map(s => <option key={s}>{s}</option>)}</select></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Avancement (%)</label>
              <div className="flex items-center gap-2">
                <input type="range" min="0" max="100" step="5" value={form.avancement_pct} onChange={e => setForm({ ...form, avancement_pct: Number(e.target.value) })} className="flex-1" />
                <span className="text-sm font-bold text-[var(--mase-heading)] w-9">{form.avancement_pct}%</span>
              </div>
            </div>
          </div>
          {saveError && <div className="db-alert-red mb-3"><AlertTriangle size={14} /><p>{saveError}</p></div>}
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="db-btn-secondary">Annuler</button>
            <button onClick={ajouterAction} disabled={!form.action.trim()} className="db-btn-primary"><Save size={14} /> Enregistrer</button>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="db-panel p-3 flex flex-wrap gap-2 items-center">
        <Filter size={14} className="text-slate-400 shrink-0" />
        {['Tous', ...DOMAINES].map(d => {
          const col = DOMAINE_COLOR[d] || '#3b82f6';
          return <button key={d} onClick={() => setFD(d)} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, border: '1px solid', cursor: 'pointer', background: filtreDomaine === d ? `${col}15` : '#f8fafc', borderColor: filtreDomaine === d ? `${col}50` : '#e2e8f0', color: filtreDomaine === d ? col : '#64748b' }}>{d}</button>;
        })}
        <div className="w-px h-4 bg-slate-200" />
        {['Tous', ...STATUTS].map(s => {
          const st = getStatutStyle(s);
          return <button key={s} onClick={() => setFS(s)} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, border: '1px solid', cursor: 'pointer', background: filtreStatut === s ? st.bg : '#f8fafc', borderColor: filtreStatut === s ? st.border : '#e2e8f0', color: filtreStatut === s ? st.color : '#64748b' }}>{s === 'Tous' ? 'Tous statuts' : s}</button>;
        })}
        <button onClick={() => setFR(!filtreRetard)} style={{ fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 100, border: '1px solid', cursor: 'pointer', background: filtreRetard ? 'rgba(239,68,68,0.1)' : '#f8fafc', borderColor: filtreRetard ? 'rgba(239,68,68,0.4)' : '#e2e8f0', color: filtreRetard ? '#ef4444' : '#64748b' }}>⏰ En retard</button>
        <span className="text-slate-400 text-xs ml-auto">{actionsFiltrees.length} action(s)</span>
      </div>

      {/* Tableau */}
      <div className="db-panel overflow-hidden">
        {loading ? (
          <div className="p-10 text-center"><RefreshCw size={24} className="animate-spin text-blue-400 mx-auto mb-2" /><p className="text-slate-400 text-sm">Chargement...</p></div>
        ) : actionsFiltrees.length === 0 ? (
          <div className="p-10 text-center"><CheckCircle size={32} className="text-emerald-400 mx-auto mb-2" /><p className="font-bold text-[var(--mase-heading)]">{actions.length === 0 ? 'Aucune action. Cliquez sur "Nouvelle action".' : 'Aucune action pour ces filtres.'}</p></div>
        ) : (
          <div className="overflow-x-auto">
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
                        {row.cause_racine && <p style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>Cause : {row.cause_racine}</p>}
                      </td>
                      <td><input type="text" value={row.pilote || ''} onChange={e => updateLocal(row.id, 'pilote', e.target.value)} onBlur={() => saveById(row.id)} placeholder="Pilote..." style={inp} /></td>
                      <td>
                        <input type="date" value={row.echeance || ''} onChange={e => updateLocal(row.id, 'echeance', e.target.value)} onBlur={() => saveById(row.id)} style={{ ...inp, fontSize: 11 }} />
                        {j !== null && j < 0 && row.statut !== 'Terminé' && <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', display: 'block', marginTop: 2 }}>{Math.abs(j)}j retard</span>}
                        {j !== null && j >= 0 && j <= 7 && <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', display: 'block', marginTop: 2 }}>{j}j restants</span>}
                      </td>
                      <td>
                        <div className="flex items-center gap-1 mb-1">
                          <input type="number" min="0" max="100" value={pct} onChange={e => updateLocal(row.id, 'avancement_pct', Math.min(100, Math.max(0, Number(e.target.value))))} onBlur={() => saveById(row.id)} style={{ ...inp, width: 44, padding: '3px 4px', fontSize: 11, textAlign: 'center' }} />
                          <span className="text-xs text-slate-400">%</span>
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
                      <td className="text-center">
                        {saving === row.id ? <RefreshCw size={12} className="animate-spin text-blue-400" /> :
                          canWrite && (showArchive
                            ? <div className="flex gap-1 justify-center">
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
```

- [ ] **Step 2 : Créer `src/pages/DashboardActionsPage.tsx`**

```tsx
// src/pages/DashboardActionsPage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import PlanActions from '../dashboard/PlanActions';

interface Props { session: Session | null; }

function ActionsContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return <PlanActions companyId={company.id} canWrite={canWrite} />;
}

export default function DashboardActionsPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <ActionsContent session={session} />
    </DashboardGuard>
  );
}
```

- [ ] **Step 3 : Ajouter la route `/dashboard/actions` dans `src/main.tsx`**

```tsx
// Import en haut :
import DashboardActionsPage from './pages/DashboardActionsPage';

// Route à ajouter :
<Route path="/dashboard/actions" element={<DashboardActionsPage session={session} />} />
```

- [ ] **Step 4 : Build check**

```powershell
npm run build 2>&1 | Select-String -Pattern "error TS" | Select-Object -First 10
```

Résultat attendu : aucune erreur TypeScript.

- [ ] **Step 5 : Commit**

```powershell
git add src/dashboard/PlanActions.tsx src/pages/DashboardActionsPage.tsx src/main.tsx
git commit -m "feat(dashboard): add PDCA Plan d'Actions module with DUERP prefill"
```

---

**Fin Partie 3.** Continuer avec la Partie 4 (Accidents + Habilitations).
