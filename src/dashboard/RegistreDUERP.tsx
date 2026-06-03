// src/dashboard/RegistreDUERP.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, AlertOctagon, RefreshCw, Shield, Filter, X, Save, Archive, RotateCcw, Eye, ListPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  };
}

const FORM_INIT = {
  date_maj: new Date().toISOString().split('T')[0],
  unite_travail: LISTE_UT[0],
  famille_risque: '',
  danger: '',
  evenement_declencheur: '',
  dommage_potentiel: '',
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

  const inp: React.CSSProperties = { padding: '5px 8px', fontSize: 12, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, color: '#0f172a', fontFamily: 'inherit', outline: 'none', width: '100%' };

  return (
    <div className="space-y-5 pb-10">
      <div className="db-page-header">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--mase-heading)]">
            <Shield size={22} className="text-amber-500" /> Registre DUERP
          </h2>
          <p className="text-sm text-[var(--mase-muted)] mt-1">Évaluation et maîtrise des risques — EPC / ORG / EPI</p>
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
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #e2e8f0' }}>
        {(['registre', 'matrice', 'historique'] as const).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setShowForm(false); }}
            style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', borderBottom: `2px solid ${activeTab === tab ? '#f59e0b' : 'transparent'}`, background: 'transparent', color: activeTab === tab ? '#f59e0b' : '#64748b', marginBottom: -1 }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
            {[1, 2, 3, 4].map(f => <div key={f} style={{ textAlign: 'center', fontSize: 11, color: '#64748b', fontWeight: 700 }}>F={f}</div>)}
            {[4, 3, 2, 1].map(g => (
              <React.Fragment key={g}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#64748b', fontWeight: 700 }}>G={g}</div>
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
              { label: 'Total risques', val: kpis.total, color: '#3b82f6', sub: 'Actifs' },
              { label: 'Inacceptables ≥13', val: kpis.inacceptable, color: kpis.inacceptable > 0 ? '#ef4444' : '#10b981', sub: 'Urgent' },
              { label: 'Action requise 9-12', val: kpis.actionRequise, color: kpis.actionRequise > 0 ? '#f97316' : '#10b981', sub: 'Plan requis' },
              { label: 'À surveiller 5-8', val: kpis.surveillance, color: '#f59e0b', sub: 'Contrôle' },
              { label: 'Acceptables <5', val: kpis.acceptables, color: '#10b981', sub: 'Maîtrisés' },
            ].map((k, i) => (
              <div key={i} className="db-kpi">
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 4 }}>{k.label}</p>
                <p style={{ fontSize: 32, fontWeight: 900, color: k.color }}>{k.val}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{k.sub}</p>
              </div>
            ))}
          </div>
          {(kpis.inacceptable > 0 || kpis.actionRequise > 0) && (
            <div className="db-alert-red">
              <AlertOctagon size={16} className="shrink-0 mt-0.5" />
              <p style={{ fontWeight: 600 }}>{kpis.inacceptable + kpis.actionRequise} risque(s) nécessitant une action immédiate</p>
            </div>
          )}
        </>
      )}

      {/* Formulaire */}
      {showForm && canWrite && activeTab === 'registre' && (
        <div className="db-panel p-5" style={{ border: '1px solid rgba(245,158,11,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, color: '#0f172a' }}>Identifier un risque</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Unité de travail *</label>
              <select value={form.unite_travail} onChange={e => setForm({ ...form, unite_travail: e.target.value })} className="db-input">
                {LISTE_UT.map(ut => <option key={ut}>{ut}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Famille de risque</label>
              <select value={form.famille_risque} onChange={e => setForm({ ...form, famille_risque: e.target.value })} className="db-input">
                <option value="">— Sélectionner —</option>
                {FAMILLES.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Danger précis *</label>
              <input type="text" value={form.danger} onChange={e => setForm({ ...form, danger: e.target.value })} placeholder="Ex: Sol glissant en zone humide..." className="db-input" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Événement déclencheur</label>
              <input type="text" value={form.evenement_declencheur} onChange={e => setForm({ ...form, evenement_declencheur: e.target.value })} className="db-input" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Dommage potentiel</label>
              <input type="text" value={form.dommage_potentiel} onChange={e => setForm({ ...form, dommage_potentiel: e.target.value })} className="db-input" />
            </div>
          </div>

          {/* Cotation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginBottom: 14 }}>
            {(['gravite', 'probabilite'] as const).map(key => {
              const isG = key === 'gravite';
              const tips = isG ? ['Premiers soins', 'Arrêt <10j', 'Arrêt >10j', 'Décès'] : ['< 1×/an', 'Qqes fois/an', 'Hebdo', 'Quotidien'];
              return (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>{isG ? 'Gravité (1→4)' : 'Fréquence (1→4)'}</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3, 4].map(v => {
                      const sel = form[key] === v;
                      const color = v >= 4 ? '#ef4444' : v >= 3 ? '#f97316' : v >= 2 ? '#f59e0b' : '#10b981';
                      return <button key={v} title={tips[v - 1]} onClick={() => setForm({ ...form, [key]: v })}
                        style={{ flex: 1, height: 40, borderRadius: 7, border: `2px solid ${sel ? color : '#e2e8f0'}`, background: sel ? `${color}15` : '#f8fafc', color: sel ? color : '#64748b', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>{v}</button>;
                    })}
                  </div>
                </div>
              );
            })}
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Criticité initiale</label>
              {(() => { const ci = form.gravite * form.probabilite; const info = getCInfo(ci);
                return <div style={{ background: info.bg, border: `1.5px solid ${info.border}`, borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: info.color }}>{ci}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: info.color }}>{info.label}</div>
                </div>; })()}
            </div>
          </div>

          {/* Mesures */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginBottom: 14 }}>
            {[
              { key: 'a_mesure_epc' as const, descKey: 'mesures_epc' as const, label: 'EPC — Collective', color: '#3b82f6', coeff: '×0.50' },
              { key: 'a_mesure_orga' as const, descKey: 'mesures_orga' as const, label: 'ORG — Organisation', color: '#8b5cf6', coeff: '×0.70' },
              { key: 'a_mesure_epi' as const, descKey: 'mesures_epi' as const, label: 'EPI — Individuelle', color: '#f59e0b', coeff: '×0.80' },
            ].map(m => (
              <div key={m.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <button onClick={() => setForm({ ...form, [m.key]: !form[m.key] })}
                    style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${form[m.key] ? m.color : '#e2e8f0'}`, background: form[m.key] ? m.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    {form[m.key] && <span style={{ color: 'white', fontSize: 12 }}>✓</span>}
                  </button>
                  <span style={{ fontSize: 10, fontWeight: 700, color: form[m.key] ? m.color : '#94a3b8', textTransform: 'uppercase' }}>{m.label} ({m.coeff})</span>
                </div>
                <input type="text" disabled={!form[m.key]} value={form[m.descKey]} onChange={e => setForm({ ...form, [m.descKey]: e.target.value })} className="db-input" style={{ fontSize: 11, opacity: form[m.key] ? 1 : 0.4 }} />
              </div>
            ))}
          </div>

          {/* Action planifiée */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginBottom: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Action planifiée</label>
              <input type="text" value={form.action_preventive} onChange={e => setForm({ ...form, action_preventive: e.target.value })} className="db-input" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Pilote</label>
              <input type="text" value={form.pilote} onChange={e => setForm({ ...form, pilote: e.target.value })} className="db-input" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 4 }}>Échéance</label>
              <input type="date" value={form.echeance} onChange={e => setForm({ ...form, echeance: e.target.value })} className="db-input" />
            </div>
          </div>

          {saveError && <div className="db-alert-red" style={{ marginBottom: 12 }}><AlertOctagon size={14} /><p>{saveError}</p></div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(false)} className="db-btn-secondary">Annuler</button>
            <button onClick={ajouterRisque} disabled={!form.danger.trim()} className="db-btn-primary" style={{ background: '#f59e0b' }}>
              <Save size={14} /> Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* Filtres */}
      {(activeTab === 'registre' || activeTab === 'historique') && (
        <div className="db-panel p-3" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Filter size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
          {['Tous', ...LISTE_UT].map(ut => (
            <button key={ut} onClick={() => setFiltreUT(ut)}
              style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, border: '1px solid', cursor: 'pointer', background: filtreUT === ut ? 'rgba(245,158,11,0.15)' : '#f8fafc', borderColor: filtreUT === ut ? 'rgba(245,158,11,0.5)' : '#e2e8f0', color: filtreUT === ut ? '#92400e' : '#64748b' }}>
              {ut}
            </button>
          ))}
          <div style={{ width: 1, height: 16, background: '#e2e8f0' }} />
          {['Tous', 'Inacceptable', 'Action requise', 'À surveiller', 'Acceptable'].map(n => {
            const c = n === 'Inacceptable' ? '#ef4444' : n === 'Action requise' ? '#f97316' : n === 'À surveiller' ? '#f59e0b' : n === 'Acceptable' ? '#10b981' : '#3b82f6';
            return <button key={n} onClick={() => setFiltreNiveau(n)}
              style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, border: '1px solid', cursor: 'pointer', background: filtreNiveau === n ? `${c}15` : '#f8fafc', borderColor: filtreNiveau === n ? `${c}50` : '#e2e8f0', color: filtreNiveau === n ? c : '#64748b' }}>
              {n}
            </button>;
          })}
          {(filtreUT !== 'Tous' || filtreNiveau !== 'Tous') && (
            <button onClick={() => { setFiltreUT('Tous'); setFiltreNiveau('Tous'); }}
              style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              <X size={11} /> Reset
            </button>
          )}
          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>{risquesFiltres.length} risque(s)</span>
        </div>
      )}

      {/* Tableau */}
      {(activeTab === 'registre' || activeTab === 'historique') && (
        <div className="db-panel" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><RefreshCw size={24} className="animate-spin text-blue-400" style={{ margin: '0 auto 8px' }} /><p style={{ color: '#64748b', fontSize: 14 }}>Chargement...</p></div>
          ) : risquesFiltres.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}><Shield size={32} className="text-emerald-400" style={{ margin: '0 auto 8px' }} /><p style={{ fontWeight: 700, color: '#0f172a' }}>{risques.length === 0 ? 'Aucun risque identifié.' : 'Aucun risque pour ces filtres.'}</p></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="db-table" style={{ minWidth: 900 }}>
                <thead>
                  <tr>
                    <th>Unité de travail</th>
                    <th>Danger</th>
                    <th style={{ width: 50, textAlign: 'center' }}>G</th>
                    <th style={{ width: 50, textAlign: 'center' }}>F</th>
                    <th style={{ width: 64, textAlign: 'center' }}>CI</th>
                    <th style={{ width: 88, textAlign: 'center' }}>EPC·ORG·EPI</th>
                    <th style={{ width: 80, textAlign: 'center' }}>CR</th>
                    <th style={{ width: 100 }}>Pilote</th>
                    <th style={{ width: 90, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {risquesFiltres.map(row => {
                    const ci = Number(row.gravite) * Number(row.probabilite);
                    const cr = row.criticite_resid ?? calcCR(row.gravite, row.probabilite, row.a_mesure_epc, row.a_mesure_orga, row.a_mesure_epi);
                    const crInfo = getCInfo(cr);
                    const ciInfo = getCInfo(ci);
                    const borderColor = cr >= 13 ? '#ef4444' : cr >= 9 ? '#f97316' : cr >= 5 ? '#f59e0b' : '#10b981';
                    return (
                      <tr key={row.id} style={{ borderLeft: `3px solid ${borderColor}` }}>
                        <td>
                          <select value={row.unite_travail} onChange={e => { updateLocal(row.id, { unite_travail: e.target.value }); saveById(row.id); }} style={{ ...inp, cursor: 'pointer' }}>
                            {LISTE_UT.map(ut => <option key={ut}>{ut}</option>)}
                          </select>
                        </td>
                        <td>
                          {row.famille_risque && <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700, marginBottom: 2 }}>{row.famille_risque}</div>}
                          <input type="text" value={row.danger} onChange={e => updateLocal(row.id, { danger: e.target.value })} onBlur={() => saveById(row.id)} style={{ ...inp, fontWeight: 600 }} />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <select value={row.gravite} onChange={e => { updateLocal(row.id, { gravite: Number(e.target.value) }); saveById(row.id); }}
                            style={{ ...inp, color: row.gravite >= 3 ? '#ef4444' : '#f59e0b', fontWeight: 800, fontSize: 14, appearance: 'none', textAlign: 'center' }}>
                            {[1, 2, 3, 4].map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <select value={row.probabilite} onChange={e => { updateLocal(row.id, { probabilite: Number(e.target.value) }); saveById(row.id); }}
                            style={{ ...inp, color: row.probabilite >= 3 ? '#ef4444' : '#f59e0b', fontWeight: 800, fontSize: 14, appearance: 'none', textAlign: 'center' }}>
                            {[1, 2, 3, 4].map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ background: ciInfo.bg, border: `1px solid ${ciInfo.border}`, borderRadius: 6, padding: '4px 2px', fontWeight: 900, fontSize: 15, color: ciInfo.color }}>{ci}</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                            {[{ key: 'a_mesure_epc' as keyof Risque, label: 'EPC', color: '#3b82f6' }, { key: 'a_mesure_orga' as keyof Risque, label: 'ORG', color: '#8b5cf6' }, { key: 'a_mesure_epi' as keyof Risque, label: 'EPI', color: '#f59e0b' }].map(m => (
                              canWrite ? (
                                <button key={m.label} onClick={() => { updateLocal(row.id, { [m.key]: !row[m.key] } as Partial<Risque>); saveById(row.id); }}
                                  style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, border: `1px solid ${row[m.key] ? m.color + '60' : '#e2e8f0'}`, background: row[m.key] ? `${m.color}15` : '#f8fafc', color: row[m.key] ? m.color : '#94a3b8', cursor: 'pointer', width: 32 }}>
                                  {m.label}
                                </button>
                              ) : (
                                <span key={m.label} style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: row[m.key] ? `${m.color}15` : '#f8fafc', color: row[m.key] ? m.color : '#94a3b8' }}>{m.label}</span>
                              )
                            ))}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ background: crInfo.bg, border: `1.5px solid ${crInfo.border}`, borderRadius: 8, padding: '5px 4px', fontWeight: 900, fontSize: 18, color: crInfo.color }}>{cr}</div>
                          <div style={{ fontSize: 9, color: crInfo.color, fontWeight: 700, marginTop: 2 }}>{crInfo.label}</div>
                        </td>
                        <td>
                          <input type="text" value={row.pilote || ''} onChange={e => updateLocal(row.id, { pilote: e.target.value })} onBlur={() => saveById(row.id)} placeholder="Pilote..." style={{ ...inp, fontSize: 11 }} />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 2, justifyContent: 'center', alignItems: 'center' }}>
                            {saving === row.id ? <RefreshCw size={12} className="animate-spin text-blue-400" /> : (
                              <>
                                <button onClick={() => setDetailRow(row)} title="Détail" style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Eye size={14} /></button>
                                {!showArchive && (
                                  <button onClick={() => navigate('/dashboard/actions', { state: { prefill: toPdcaPrefill(row) } })} title="Créer une action PDCA" style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><ListPlus size={14} /></button>
                                )}
                                {canWrite && (showArchive
                                  ? <>
                                      <button onClick={() => restoreRow(row.id)} style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><RotateCcw size={13} /></button>
                                      <button onClick={() => deleteRow(row.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Trash2 size={13} /></button>
                                    </>
                                  : <button onClick={() => archiveRow(row.id)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Archive size={14} /></button>
                                )}
                              </>
                            )}
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

      {/* Modal détail */}
      {detailRow && (
        <div onClick={e => e.target === e.currentTarget && setDetailRow(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="db-panel" style={{ width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, color: '#0f172a' }}>{detailRow.danger}</h3>
              <button onClick={() => setDetailRow(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#475569' }}>
              <p><strong>Unité :</strong> {detailRow.unite_travail}</p>
              <p><strong>Famille :</strong> {detailRow.famille_risque || '—'}</p>
              <p><strong>Dommage potentiel :</strong> {detailRow.dommage_potentiel || '—'}</p>
              <p><strong>Gravité × Fréquence :</strong> {detailRow.gravite} × {detailRow.probabilite} = CI {detailRow.criticite}</p>
              <p><strong>Criticité résiduelle :</strong> {detailRow.criticite_resid} ({getCInfo(detailRow.criticite_resid).label})</p>
              <p><strong>EPC :</strong> {detailRow.mesures_epc || '—'} | <strong>ORG :</strong> {detailRow.mesures_orga || '—'} | <strong>EPI :</strong> {detailRow.mesures_epi || '—'}</p>
              <p><strong>Action :</strong> {detailRow.action_preventive || '—'}</p>
              <p><strong>Pilote :</strong> {detailRow.pilote || '—'} — Échéance : {detailRow.echeance || '—'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
