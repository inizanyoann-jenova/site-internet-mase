# Phase 3 — Partie 3 : SocialRH + ReunionsQHSE

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter les modules SocialRH (effectifs + formations, 2 sous-onglets) et ReunionsQHSE (liste accordéon, PV PDF, envoi actions PDCA).

**Architecture:** Même pattern Phase 2/3 — `src/dashboard/`, `src/pages/`, route dans `src/main.tsx`. Props : `companyId: string, canWrite: boolean`. Le PV PDF utilise `window.open()` + `window.print()` sans dépendance externe. L'envoi PDCA insère dans la table `actions` existante.

**Tech Stack:** React 19, TypeScript, Supabase, CSS classes db-*

**Prérequis :** Phase 1 terminée (tables `rh_employes`, `rh_formations`, `reunions_qhse` créées).

---

### Task 0 : SocialRH.tsx

**Files:**
- Create: `src/dashboard/SocialRH.tsx`

- [ ] Créer `src/dashboard/SocialRH.tsx` :

```tsx
// src/dashboard/SocialRH.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, RefreshCw, Users, GraduationCap, X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props { companyId: string; canWrite: boolean; }

interface Employe {
  id: string;
  nom: string;
  prenom: string;
  poste: string;
  service: string;
  contrat: string;
  date_entree: string | null;
  actif: boolean;
}

interface Formation {
  id: string;
  titre: string;
  type_formation: string;
  organisme: string;
  date_debut: string | null;
  date_fin: string | null;
  participants: string;
  statut: string;
  duree_heures: number | null;
}

const POSTES   = ['Responsable QHSE', 'Opérateur', 'Technicien', 'Agent de maîtrise', 'Cadre', 'Administratif', 'Chargé d\'affaires', 'Manager', 'Direction'];
const SERVICES = ['QHSE', 'Production', 'Maintenance', 'Logistique', 'Commercial', 'RH', 'Direction', 'IT', 'Achats'];
const CONTRATS = ['CDI', 'CDD', 'Intérim', 'Apprentissage', 'Stage', 'Prestataire'];
const TYPES_FORM   = ['Sécurité', 'Qualité', 'Environnement', 'Management', 'Technique', 'Réglementaire', 'Soft skills', 'Informatique'];
const ORGANISMES   = ['INRS', 'AFNOR', 'APAVE', 'OPPBTP', 'Organisme interne', 'Autre'];
const STATUTS_FORM = ['Planifiée', 'En cours', 'Réalisée', 'Annulée'];

const CONTRAT_COLOR: Record<string, string> = { 'CDI': '#10B981', 'CDD': '#3B82F6', 'Intérim': '#F59E0B', 'Apprentissage': '#8B5CF6', 'Stage': '#06B6D4', 'Prestataire': '#94A3B8' };
const STATUT_FORM_COLOR: Record<string, string> = { 'Planifiée': '#3B82F6', 'En cours': '#F59E0B', 'Réalisée': '#10B981', 'Annulée': '#94A3B8' };

const EMP_INIT  = { nom: '', prenom: '', poste: POSTES[0], service: SERVICES[0], contrat: 'CDI', date_entree: '', actif: true };
const FORM_INIT = { titre: '', type_formation: TYPES_FORM[0], organisme: ORGANISMES[0], date_debut: '', date_fin: '', participants: '', statut: 'Planifiée', duree_heures: '' };

const inp = { padding: '5px 8px', fontSize: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, color: '#0f172a', fontFamily: 'inherit', outline: 'none' } as React.CSSProperties;

export default function SocialRH({ companyId, canWrite }: Props) {
  const [tab, setTab]             = useState<'effectifs' | 'formations'>('effectifs');
  const [employes, setEmployes]   = useState<Employe[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showEmpForm, setShowEmpForm]   = useState(false);
  const [showFormForm, setShowFormForm] = useState(false);
  const [empForm, setEmpForm]   = useState({ ...EMP_INIT });
  const [formForm, setFormForm] = useState({ ...FORM_INIT });

  async function loadAll() {
    setLoading(true);
    const [rE, rF] = await Promise.all([
      supabase.from('rh_employes').select('*').eq('actif', true).order('nom'),
      supabase.from('rh_formations').select('*').order('date_debut', { ascending: false }),
    ]);
    setEmployes(rE.data ?? []);
    setFormations(rF.data ?? []);
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, []);

  /* ── Employés CRUD ── */
  const addEmploye = async () => {
    if (!empForm.nom.trim()) return;
    const { data } = await supabase.from('rh_employes').insert([{ ...empForm, company_id: companyId, date_entree: empForm.date_entree || null, duree_heures: null }]).select();
    if (data) { setEmployes(p => [...p, data[0]].sort((a, b) => a.nom.localeCompare(b.nom))); }
    setShowEmpForm(false);
    setEmpForm({ ...EMP_INIT });
  };

  const saveEmploye = async (row: Employe) => {
    const { id, ...d } = row;
    await supabase.from('rh_employes').update(d).eq('id', id);
  };

  const archiveEmploye = async (id: string) => {
    if (!confirm('Archiver cet employé ?')) return;
    await supabase.from('rh_employes').update({ actif: false }).eq('id', id);
    setEmployes(p => p.filter(e => e.id !== id));
  };

  const upEmp = (id: string, k: keyof Employe, v: unknown) =>
    setEmployes(p => p.map(e => e.id === id ? { ...e, [k]: v } : e));

  /* ── Formations CRUD ── */
  const addFormation = async () => {
    if (!formForm.titre.trim()) return;
    const payload = { ...formForm, company_id: companyId, date_debut: formForm.date_debut || null, date_fin: formForm.date_fin || null, duree_heures: formForm.duree_heures ? Number(formForm.duree_heures) : null };
    const { data } = await supabase.from('rh_formations').insert([payload]).select();
    if (data) setFormations(p => [data[0], ...p]);
    setShowFormForm(false);
    setFormForm({ ...FORM_INIT });
  };

  const saveFormation = async (row: Formation) => {
    const { id, ...d } = row;
    await supabase.from('rh_formations').update(d).eq('id', id);
  };

  const delFormation = async (id: string) => {
    if (!confirm('Supprimer cette formation ?')) return;
    await supabase.from('rh_formations').delete().eq('id', id);
    setFormations(p => p.filter(f => f.id !== id));
  };

  const upForm = (id: string, k: keyof Formation, v: unknown) =>
    setFormations(p => p.map(f => f.id === id ? { ...f, [k]: v } : f));

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    const total = employes.length;
    const parContrat = CONTRATS.map(c => ({ label: c, count: employes.filter(e => e.contrat === c).length })).filter(c => c.count > 0);
    const formRealisees = formations.filter(f => f.statut === 'Réalisée');
    const participants = new Set<string>();
    formRealisees.forEach(f => f.participants.split(/[,;]+/).map(s => s.trim()).filter(Boolean).forEach(p => participants.add(p)));
    const tauxFormation = total > 0 ? Math.round(Math.min(participants.size / total * 100, 100)) : 0;
    const heuresTotal = formRealisees.reduce((s, f) => s + (f.duree_heures ?? 0), 0);
    return { total, parContrat, tauxFormation, formRealisees: formRealisees.length, totalFormations: formations.length, heuresTotal };
  }, [employes, formations]);

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="db-page-header">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--mase-heading)]">
            <Users size={22} className="text-purple-500" /> Social &amp; RH
          </h2>
          <p className="text-sm text-[var(--mase-muted)] mt-1">Effectifs, formations et suivi RH</p>
        </div>
        <button onClick={loadAll} className="db-btn-secondary"><RefreshCw size={14} /> Actualiser</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Effectif total',      val: kpis.total,           color: '#8b5cf6' },
          { label: 'Formations réalisées', val: `${kpis.formRealisees}/${kpis.totalFormations}`, color: '#3b82f6' },
          { label: 'Taux de formation',   val: `${kpis.tauxFormation}%`, color: kpis.tauxFormation >= 80 ? '#10b981' : '#f59e0b' },
          { label: 'Heures de formation', val: kpis.heuresTotal,     color: '#06b6d4' },
        ].map((k, i) => (
          <div key={i} className="db-panel p-4" style={{ borderLeft: `4px solid ${k.color}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a' }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 4, background: '#f8fafc', borderRadius: 10, padding: 4, border: '1px solid #e2e8f0' }}>
        {[
          { id: 'effectifs',  label: `👥 Effectifs (${kpis.total})` },
          { id: 'formations', label: `🎓 Formations (${kpis.totalFormations})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as 'effectifs' | 'formations')} style={{ flex: 1, padding: '9px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', background: tab === t.id ? '#166534' : 'transparent', color: tab === t.id ? 'white' : '#64748b', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Effectifs ── */}
      {tab === 'effectifs' && (
        <div className="space-y-4">
          {canWrite && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowEmpForm(true)} className="db-btn-primary"><Plus size={14} /> Ajouter un employé</button>
            </div>
          )}

          {showEmpForm && canWrite && (
            <div className="db-panel p-5" style={{ border: '1px solid rgba(59,130,246,0.2)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Nouvel employé</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {[
                  { label: 'Nom *',      key: 'nom',         type: 'text' },
                  { label: 'Prénom',     key: 'prenom',      type: 'text' },
                  { label: 'Date entrée', key: 'date_entree', type: 'date' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{f.label}</label>
                    <input type={f.type} value={(empForm as Record<string, string>)[f.key]} onChange={e => setEmpForm(p => ({ ...p, [f.key]: e.target.value }))} className="db-input" />
                  </div>
                ))}
                {[
                  { label: 'Poste',    key: 'poste',    opts: POSTES },
                  { label: 'Service',  key: 'service',  opts: SERVICES },
                  { label: 'Contrat',  key: 'contrat',  opts: CONTRATS },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{f.label}</label>
                    <select value={(empForm as Record<string, string>)[f.key]} onChange={e => setEmpForm(p => ({ ...p, [f.key]: e.target.value }))} className="db-input">
                      {f.opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowEmpForm(false)} className="db-btn-secondary"><X size={13} /> Annuler</button>
                <button onClick={addEmploye} className="db-btn-primary" disabled={!empForm.nom.trim()}><Save size={13} /> Enregistrer</button>
              </div>
            </div>
          )}

          <div className="db-panel" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="db-table">
                <thead><tr>{['Nom', 'Prénom', 'Poste', 'Service', 'Contrat', 'Date entrée', ''].map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {employes.map(row => (
                    <tr key={row.id}>
                      <td><input value={row.nom} onChange={e => upEmp(row.id, 'nom', e.target.value)} onBlur={() => saveEmploye(employes.find(e => e.id === row.id)!)} style={{ ...inp, width: 110 }} /></td>
                      <td><input value={row.prenom} onChange={e => upEmp(row.id, 'prenom', e.target.value)} onBlur={() => saveEmploye(employes.find(e => e.id === row.id)!)} style={{ ...inp, width: 100 }} /></td>
                      <td><select value={row.poste} onChange={e => { upEmp(row.id, 'poste', e.target.value); setTimeout(() => saveEmploye({ ...row, poste: e.target.value }), 0); }} style={inp}>{POSTES.map(p => <option key={p}>{p}</option>)}</select></td>
                      <td><select value={row.service} onChange={e => { upEmp(row.id, 'service', e.target.value); setTimeout(() => saveEmploye({ ...row, service: e.target.value }), 0); }} style={inp}>{SERVICES.map(s => <option key={s}>{s}</option>)}</select></td>
                      <td><span style={{ fontSize: 12, fontWeight: 700, color: CONTRAT_COLOR[row.contrat] ?? '#334155' }}>{row.contrat}</span></td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>{row.date_entree ? new Date(row.date_entree + 'T00:00:00').toLocaleDateString('fr-FR') : '—'}</td>
                      <td>{canWrite && <button onClick={() => archiveEmploye(row.id)} title="Archiver" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 12 }}>🗄</button>}</td>
                    </tr>
                  ))}
                  {!employes.length && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>{canWrite ? 'Aucun employé — cliquez Ajouter' : 'Aucun employé enregistré'}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Répartition contrats */}
          {kpis.parContrat.length > 0 && (
            <div className="db-panel p-5">
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Répartition par type de contrat</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {kpis.parContrat.map(c => (
                  <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: '#f8fafc', border: `1px solid ${CONTRAT_COLOR[c.label] ?? '#e2e8f0'}30`, borderRadius: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: CONTRAT_COLOR[c.label] ?? '#94a3b8' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{c.count}</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Formations ── */}
      {tab === 'formations' && (
        <div className="space-y-4">
          {canWrite && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowFormForm(true)} className="db-btn-primary"><Plus size={14} /> Ajouter une formation</button>
            </div>
          )}

          {showFormForm && canWrite && (
            <div className="db-panel p-5" style={{ border: '1px solid rgba(59,130,246,0.2)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Nouvelle formation</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Titre *</label>
                  <input value={formForm.titre} onChange={e => setFormForm(p => ({ ...p, titre: e.target.value }))} className="db-input" placeholder="ex: Habilitation électrique B1V" />
                </div>
                {[
                  { label: 'Type',       key: 'type_formation', opts: TYPES_FORM },
                  { label: 'Organisme',  key: 'organisme',      opts: ORGANISMES },
                  { label: 'Statut',     key: 'statut',         opts: STATUTS_FORM },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{f.label}</label>
                    <select value={(formForm as Record<string, string>)[f.key]} onChange={e => setFormForm(p => ({ ...p, [f.key]: e.target.value }))} className="db-input">
                      {f.opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Date début</label>
                  <input type="date" value={formForm.date_debut} onChange={e => setFormForm(p => ({ ...p, date_debut: e.target.value }))} className="db-input" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Date fin</label>
                  <input type="date" value={formForm.date_fin} onChange={e => setFormForm(p => ({ ...p, date_fin: e.target.value }))} className="db-input" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Durée (h)</label>
                  <input type="number" value={formForm.duree_heures} onChange={e => setFormForm(p => ({ ...p, duree_heures: e.target.value }))} className="db-input" placeholder="7" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Participants (séparés par virgule)</label>
                  <input value={formForm.participants} onChange={e => setFormForm(p => ({ ...p, participants: e.target.value }))} className="db-input" placeholder="Jean Dupont, Marie Martin" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowFormForm(false)} className="db-btn-secondary"><X size={13} /> Annuler</button>
                <button onClick={addFormation} className="db-btn-primary" disabled={!formForm.titre.trim()}><Save size={13} /> Enregistrer</button>
              </div>
            </div>
          )}

          <div className="db-panel" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="db-table">
                <thead><tr>{['Titre', 'Type', 'Organisme', 'Début', 'Fin', 'Participants', 'Durée', 'Statut', ''].map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {formations.map(row => (
                    <tr key={row.id}>
                      <td><input value={row.titre} onChange={e => upForm(row.id, 'titre', e.target.value)} onBlur={() => saveFormation(formations.find(f => f.id === row.id)!)} style={{ ...inp, width: 150 }} /></td>
                      <td><select value={row.type_formation} onChange={e => { upForm(row.id, 'type_formation', e.target.value); setTimeout(() => saveFormation({ ...row, type_formation: e.target.value }), 0); }} style={inp}>{TYPES_FORM.map(t => <option key={t}>{t}</option>)}</select></td>
                      <td><select value={row.organisme} onChange={e => { upForm(row.id, 'organisme', e.target.value); setTimeout(() => saveFormation({ ...row, organisme: e.target.value }), 0); }} style={inp}>{ORGANISMES.map(o => <option key={o}>{o}</option>)}</select></td>
                      <td><input type="date" value={row.date_debut ?? ''} onChange={e => { upForm(row.id, 'date_debut', e.target.value); setTimeout(() => saveFormation({ ...row, date_debut: e.target.value }), 0); }} style={inp} /></td>
                      <td><input type="date" value={row.date_fin ?? ''} onChange={e => { upForm(row.id, 'date_fin', e.target.value); setTimeout(() => saveFormation({ ...row, date_fin: e.target.value }), 0); }} style={inp} /></td>
                      <td><input value={row.participants} onChange={e => upForm(row.id, 'participants', e.target.value)} onBlur={() => saveFormation(formations.find(f => f.id === row.id)!)} style={{ ...inp, width: 140 }} placeholder="Noms..." /></td>
                      <td><input type="number" value={row.duree_heures ?? ''} onChange={e => upForm(row.id, 'duree_heures', e.target.value ? Number(e.target.value) : null)} onBlur={() => saveFormation(formations.find(f => f.id === row.id)!)} style={{ ...inp, width: 55 }} /></td>
                      <td><select value={row.statut} onChange={e => { upForm(row.id, 'statut', e.target.value); setTimeout(() => saveFormation({ ...row, statut: e.target.value }), 0); }} style={{ ...inp, color: STATUT_FORM_COLOR[row.statut] ?? '#334155', fontWeight: 700 }}>{STATUTS_FORM.map(s => <option key={s}>{s}</option>)}</select></td>
                      <td>{canWrite && <button onClick={() => delFormation(row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>🗑</button>}</td>
                    </tr>
                  ))}
                  {!formations.length && <tr><td colSpan={9} style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>{canWrite ? 'Aucune formation — cliquez Ajouter' : 'Aucune formation enregistrée'}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] Commit :
```bash
git add src/dashboard/SocialRH.tsx
git commit -m "feat(dashboard): SocialRH — effectifs + formations, 2 onglets"
```

---

### Task 1 : DashboardRHPage.tsx + route

**Files:**
- Create: `src/pages/DashboardRHPage.tsx`
- Modify: `src/main.tsx`

- [ ] Créer `src/pages/DashboardRHPage.tsx` :

```tsx
// src/pages/DashboardRHPage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import SocialRH from '../dashboard/SocialRH';

interface Props { session: Session | null; }

function RHContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return <SocialRH companyId={company.id} canWrite={canWrite} />;
}

export default function DashboardRHPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <RHContent session={session} />
    </DashboardGuard>
  );
}
```

- [ ] Dans `src/main.tsx`, ajouter l'import :

```tsx
import DashboardRHPage from './pages/DashboardRHPage';
```

- [ ] Dans `src/main.tsx`, ajouter la route :

```tsx
<Route path="/dashboard/rh" element={<DashboardRHPage session={session} />} />
```

- [ ] Commit :
```bash
git add src/pages/DashboardRHPage.tsx src/main.tsx
git commit -m "feat(dashboard): page + route SocialRH (/dashboard/rh)"
```

---

### Task 2 : ReunionsQHSE.tsx

**Files:**
- Create: `src/dashboard/ReunionsQHSE.tsx`

Notes d'implémentation :
- Les actions d'une réunion sont stockées en JSON dans la colonne `actions_json` (array d'objets `{ id, description, responsable, echeance, statut }`).
- "Envoyer au Plan d'Actions" insère dans la table `actions` (pas `plan_actions`).
- Le PV PDF est généré via `window.open()` + HTML inline + `window.print()`.

- [ ] Créer `src/dashboard/ReunionsQHSE.tsx` :

```tsx
// src/dashboard/ReunionsQHSE.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, RefreshCw, MessageSquare, ChevronDown, ChevronRight, Printer, Save, Send, X, MapPin, User, Users, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props { companyId: string; canWrite: boolean; }

interface ActionReu { id: number; description: string; responsable: string; echeance: string; statut: string; }

interface Reunion {
  id: string;
  date: string;
  type: string;
  lieu: string | null;
  animateur: string | null;
  participants: string | null;
  ordre_du_jour: string | null;
  decisions: string | null;
  statut: string;
  actions_json: string;
}

const TYPES = ['Réunion Sécurité', 'Comité QSE', 'Revue de Direction', 'CSSCT / CSE', 'Réunion Qualité', 'Réunion Mensuelle QHSE', 'Autre'];
const STATUTS = ['Planifiée', 'Terminée', 'Annulée'];
const STATUT_COLOR: Record<string, { color: string; bg: string; border: string }> = {
  'Planifiée': { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.3)'  },
  'Terminée':  { color: '#10B981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)'  },
  'Annulée':   { color: '#94A3B8', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)' },
};

const FORM_INIT = { date: new Date().toISOString().split('T')[0], type: TYPES[0], lieu: '', animateur: '', participants: '', ordre_du_jour: '', decisions: '', statut: 'Planifiée' };
const ACT_INIT: Omit<ActionReu, 'id'> = { description: '', responsable: '', echeance: '', statut: 'À lancer' };

const inp = { padding: '7px 10px', fontSize: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, color: '#0f172a', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' as const };
const lbl = { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', display: 'block', marginBottom: 4 };

export default function ReunionsQHSE({ companyId, canWrite }: Props) {
  const [reunions, setReunions]   = useState<Reunion[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ ...FORM_INIT });
  const [saving, setSaving]       = useState<string | null>(null);
  const [filtreStatut, setFS]     = useState('Tous');
  const [filtreType, setFT]       = useState('Tous');
  const [actionsMap, setActionsMap] = useState<Record<string, ActionReu[]>>({});
  const [newAct, setNewAct]       = useState<Record<string, typeof ACT_INIT>>({});

  async function fetch() {
    setLoading(true);
    const { data } = await supabase.from('reunions_qhse').select('*').order('date', { ascending: false });
    if (data) {
      setReunions(data);
      const m: Record<string, ActionReu[]> = {};
      data.forEach(r => { try { m[r.id] = JSON.parse(r.actions_json); } catch { m[r.id] = []; } });
      setActionsMap(m);
    }
    setLoading(false);
  }
  useEffect(() => { fetch(); }, []);

  /* ── Ajout réunion ── */
  const ajouter = async () => {
    if (!form.date) return;
    const { data } = await supabase.from('reunions_qhse').insert([{ ...form, company_id: companyId, actions_json: '[]' }]).select();
    if (data) {
      setReunions(p => [data[0], ...p]);
      setActionsMap(p => ({ ...p, [data[0].id]: [] }));
    }
    setShowForm(false);
    setForm({ ...FORM_INIT });
  };

  /* ── Sauvegarde inline ── */
  const saveRow = async (row: Reunion) => {
    setSaving(row.id);
    const { id, ...d } = row;
    await supabase.from('reunions_qhse').update(d).eq('id', id);
    setSaving(null);
  };

  const upRow = (id: string, k: keyof Reunion, v: unknown) =>
    setReunions(p => p.map(r => r.id === id ? { ...r, [k]: v } : r));

  /* ── Suppression ── */
  const delRow = async (id: string) => {
    if (!confirm('Supprimer cette réunion ?')) return;
    await supabase.from('reunions_qhse').delete().eq('id', id);
    setReunions(p => p.filter(r => r.id !== id));
  };

  /* ── Actions ── */
  const saveActions = async (reunionId: string, list: ActionReu[]) => {
    await supabase.from('reunions_qhse').update({ actions_json: JSON.stringify(list) }).eq('id', reunionId);
    setActionsMap(p => ({ ...p, [reunionId]: list }));
  };

  const addAction = async (reunionId: string) => {
    const a = newAct[reunionId] ?? { ...ACT_INIT };
    if (!a.description.trim()) return;
    const list = [...(actionsMap[reunionId] ?? []), { ...a, id: Date.now() }];
    await saveActions(reunionId, list);
    setNewAct(p => ({ ...p, [reunionId]: { ...ACT_INIT } }));
  };

  const removeAction = async (reunionId: string, actId: number) => {
    const list = (actionsMap[reunionId] ?? []).filter(a => a.id !== actId);
    await saveActions(reunionId, list);
  };

  /* ── Envoi PDCA ── */
  const envoyerPDCA = async (reunionId: string) => {
    const reunion = reunions.find(r => r.id === reunionId);
    const acts = (actionsMap[reunionId] ?? []).filter(a => a.description.trim());
    if (!acts.length) { alert('Aucune action à envoyer.'); return; }
    await supabase.from('actions').insert(
      acts.map(a => ({
        company_id: companyId,
        origine: 'Réunion QHSE',
        reference_source: `Réunion ${reunion?.type ?? ''} du ${reunion?.date ?? ''}`,
        domaine: 'Qualité',
        type_action: 'Corrective',
        action: a.description,
        pilote: a.responsable || '',
        echeance: a.echeance || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        statut: 'À lancer',
        avancement_pct: 0,
        priorite: '🟡 Normale',
        resultat_efficacite: 'Non évalué',
        commentaire: `Générée depuis réunion "${reunion?.type}" du ${reunion?.date}`,
      }))
    );
    alert(`✅ ${acts.length} action(s) envoyée(s) au Plan d'Actions`);
  };

  /* ── Impression PV ── */
  const imprimerPV = (r: Reunion) => {
    const acts = actionsMap[r.id] ?? [];
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>PV — ${r.type} — ${r.date}</title>
<style>body{font-family:Arial,sans-serif;margin:40px;color:#1e293b;line-height:1.5}h1{font-size:20px;border-bottom:3px solid #166534;padding-bottom:8px}h2{font-size:14px;color:#166534;margin-top:24px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0;padding:16px;background:#f8fafc;border-radius:8px}.meta div{font-size:12px}.meta strong{color:#64748b;display:block;font-size:10px;text-transform:uppercase}pre{white-space:pre-wrap;font-family:Arial;font-size:13px;margin:0}table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}th{background:#166534;color:white;padding:8px 10px;text-align:left;font-size:11px}td{padding:7px 10px;border-bottom:1px solid #e2e8f0}.footer{margin-top:40px;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between}.sig{margin-top:60px;font-size:12px}@media print{body{margin:20px}}</style>
</head><body>
<h1>Procès-Verbal de Réunion</h1>
<div class="meta">
  <div><strong>Type</strong>${r.type}</div>
  <div><strong>Date</strong>${new Date(r.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
  <div><strong>Lieu</strong>${r.lieu || '—'}</div>
  <div><strong>Animateur</strong>${r.animateur || '—'}</div>
  <div><strong>Statut</strong>${r.statut}</div>
  <div><strong>Participants</strong>${r.participants || '—'}</div>
</div>
<h2>Ordre du jour</h2><pre>${r.ordre_du_jour || 'Non renseigné'}</pre>
<h2>Décisions &amp; Compte-rendu</h2><pre>${r.decisions || 'Non renseigné'}</pre>
${acts.length > 0 ? `<h2>Actions générées (${acts.length})</h2><table><thead><tr><th>#</th><th>Description</th><th>Responsable</th><th>Échéance</th><th>Statut</th></tr></thead><tbody>${acts.map((a, i) => `<tr><td>${i + 1}</td><td>${a.description}</td><td>${a.responsable || '—'}</td><td>${a.echeance || '—'}</td><td>${a.statut}</td></tr>`).join('')}</tbody></table>` : ''}
<div class="footer"><span>Généré le ${new Date().toLocaleDateString('fr-FR')} — SMI Dashboard</span><span>${r.type} — ${r.date}</span></div>
<div class="sig"><p>Signature de l'animateur : ___________________________</p><p>Date de validation : ___________________________</p></div>
</body></html>`;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { alert('Popup bloquée. Autorisez les popups.'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  /* ── Filtrage ── */
  const filtrees = useMemo(() => reunions.filter(r => {
    if (filtreStatut !== 'Tous' && r.statut !== filtreStatut) return false;
    if (filtreType !== 'Tous' && r.type !== filtreType) return false;
    return true;
  }), [reunions, filtreStatut, filtreType]);

  const types = useMemo(() => ['Tous', ...[...new Set(reunions.map(r => r.type).filter(Boolean))].sort()], [reunions]);

  const kpis = useMemo(() => ({
    total:     reunions.length,
    terminees: reunions.filter(r => r.statut === 'Terminée').length,
    planifiees: reunions.filter(r => r.statut === 'Planifiée').length,
    actions:   Object.values(actionsMap).reduce((s, a) => s + a.length, 0),
  }), [reunions, actionsMap]);

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="db-page-header">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--mase-heading)]">
            <MessageSquare size={22} className="text-blue-500" /> Réunions QHSE
          </h2>
          <p className="text-sm text-[var(--mase-muted)] mt-1">Suivi, décisions, actions — Génération PV PDF</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetch} className="db-btn-secondary"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser</button>
          {canWrite && <button onClick={() => setShowForm(true)} className="db-btn-primary"><Plus size={14} /> Nouvelle réunion</button>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Réunions',     val: kpis.total,      color: '#3b82f6' },
          { label: 'Terminées',    val: kpis.terminees,  color: '#10b981' },
          { label: 'Planifiées',   val: kpis.planifiees, color: '#f59e0b' },
          { label: 'Actions PDCA', val: kpis.actions,    color: '#8b5cf6' },
        ].map((k, i) => (
          <div key={i} className="db-panel p-4" style={{ borderLeft: `4px solid ${k.color}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a' }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="db-panel p-3" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filtreStatut} onChange={e => setFS(e.target.value)} style={{ ...inp, width: 140 }}>
          {['Tous', ...STATUTS].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filtreType} onChange={e => setFT(e.target.value)} style={{ ...inp, width: 200 }}>
          {types.map(t => <option key={t}>{t}</option>)}
        </select>
        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>{filtrees.length} réunion{filtrees.length > 1 ? 's' : ''}</span>
      </div>

      {/* Liste accordéon */}
      {loading ? (
        <div className="db-panel p-10 text-center text-[var(--mase-muted)]"><RefreshCw size={24} className="animate-spin mx-auto mb-2" /></div>
      ) : filtrees.length === 0 ? (
        <div className="db-panel p-10 text-center" style={{ color: '#64748b' }}>
          <MessageSquare size={36} className="mx-auto mb-3 opacity-30" />
          <p>Aucune réunion enregistrée</p>
          {canWrite && <button onClick={() => setShowForm(true)} className="db-btn-primary mt-4"><Plus size={14} /> Créer la première</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtrees.map(r => {
            const st = STATUT_COLOR[r.statut] ?? STATUT_COLOR['Planifiée'];
            const isOpen = expanded === r.id;
            const aList = actionsMap[r.id] ?? [];
            const nAct = newAct[r.id] ?? { ...ACT_INIT };

            return (
              <div key={r.id} className="db-panel" style={{ overflow: 'hidden' }}>
                {/* Ligne principale */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : r.id)}>
                  {isOpen ? <ChevronDown size={16} style={{ color: '#94a3b8', flexShrink: 0 }} /> : <ChevronRight size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />}
                  {/* Mini calendrier */}
                  <div style={{ textAlign: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '5px 10px', flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                      {new Date(r.date + 'T00:00:00').getDate().toString().padStart(2, '0')}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                      {new Date(r.date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' })}
                    </div>
                  </div>
                  {/* Infos */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{r.type}</span>
                      <span style={{ fontSize: 11, color: st.color, background: st.bg, border: `1px solid ${st.border}`, borderRadius: 100, padding: '1px 8px', fontWeight: 700 }}>{r.statut}</span>
                      {aList.length > 0 && <span style={{ fontSize: 11, color: '#3b82f6', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 100, padding: '1px 8px', fontWeight: 700 }}>{aList.length} action{aList.length > 1 ? 's' : ''}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 3, flexWrap: 'wrap' }}>
                      {r.lieu && <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={10} />{r.lieu}</span>}
                      {r.animateur && <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}><User size={10} />{r.animateur}</span>}
                    </div>
                  </div>
                  {/* Actions rapides */}
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => imprimerPV(r)} title="PV PDF" style={{ padding: '5px 7px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', display: 'flex' }}><Printer size={13} /></button>
                    <button onClick={() => saveRow(r)} title="Sauvegarder" style={{ padding: '5px 7px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', color: '#3b82f6', display: 'flex' }}>
                      {saving === r.id ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                    </button>
                    {canWrite && <button onClick={() => delRow(r.id)} style={{ padding: '5px 7px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, cursor: 'pointer', color: '#ef4444', display: 'flex' }}><Trash2 size={13} /></button>}
                  </div>
                </div>

                {/* Détail */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                      <div><label style={lbl}>Date</label><input type="date" value={r.date} onChange={e => upRow(r.id, 'date', e.target.value)} onBlur={() => saveRow(r)} style={inp} /></div>
                      <div><label style={lbl}>Type</label><select value={r.type} onChange={e => upRow(r.id, 'type', e.target.value)} onBlur={() => saveRow(r)} style={inp}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                      <div><label style={lbl}>Statut</label>
                        <select value={r.statut} onChange={e => { upRow(r.id, 'statut', e.target.value); setTimeout(() => saveRow({ ...r, statut: e.target.value }), 100); }} style={{ ...inp, color: st.color, fontWeight: 700, background: st.bg, borderColor: st.border }}>
                          {STATUTS.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <div><label style={lbl}>Lieu</label><input value={r.lieu ?? ''} onChange={e => upRow(r.id, 'lieu', e.target.value)} onBlur={() => saveRow(r)} style={inp} placeholder="Salle de réunion" /></div>
                      <div><label style={lbl}>Animateur</label><input value={r.animateur ?? ''} onChange={e => upRow(r.id, 'animateur', e.target.value)} onBlur={() => saveRow(r)} style={inp} placeholder="Responsable" /></div>
                      <div><label style={lbl}>Participants</label><input value={r.participants ?? ''} onChange={e => upRow(r.id, 'participants', e.target.value)} onBlur={() => saveRow(r)} style={inp} placeholder="Noms, virgule" /></div>
                      <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Ordre du jour</label><textarea value={r.ordre_du_jour ?? ''} onChange={e => upRow(r.id, 'ordre_du_jour', e.target.value)} onBlur={() => saveRow(r)} style={{ ...inp, minHeight: 60, resize: 'vertical' }} placeholder="Points abordés..." /></div>
                      <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Décisions &amp; Compte-rendu</label><textarea value={r.decisions ?? ''} onChange={e => upRow(r.id, 'decisions', e.target.value)} onBlur={() => saveRow(r)} style={{ ...inp, minHeight: 80, resize: 'vertical' }} placeholder="Décisions prises..." /></div>
                    </div>

                    {/* Actions */}
                    <div style={{ padding: '0 18px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <CheckCircle size={13} className="text-blue-500" /> Actions ({aList.length})
                        </span>
                        {aList.length > 0 && canWrite && (
                          <button onClick={() => envoyerPDCA(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            <Send size={11} /> Envoyer au Plan d'Actions
                          </button>
                        )}
                      </div>
                      {aList.length > 0 && (
                        <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {aList.map(a => (
                            <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 110px auto', gap: 8, alignItems: 'center', padding: '6px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7 }}>
                              <span style={{ fontSize: 12, color: '#334155' }}>{a.description}</span>
                              <span style={{ fontSize: 11, color: '#64748b' }}>{a.responsable || '—'}</span>
                              <span style={{ fontSize: 11, color: '#64748b' }}>{a.echeance || '—'}</span>
                              {canWrite && <button onClick={() => removeAction(r.id, a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex' }}><X size={12} /></button>}
                            </div>
                          ))}
                        </div>
                      )}
                      {canWrite && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 120px auto', gap: 6, alignItems: 'end' }}>
                          <div>
                            <label style={lbl}>Nouvelle action</label>
                            <input value={nAct.description} onChange={e => setNewAct(p => ({ ...p, [r.id]: { ...(p[r.id] ?? ACT_INIT), description: e.target.value } }))} placeholder="Description..." style={inp} />
                          </div>
                          <div>
                            <label style={lbl}>Responsable</label>
                            <input value={nAct.responsable} onChange={e => setNewAct(p => ({ ...p, [r.id]: { ...(p[r.id] ?? ACT_INIT), responsable: e.target.value } }))} placeholder="Nom" style={inp} />
                          </div>
                          <div>
                            <label style={lbl}>Échéance</label>
                            <input type="date" value={nAct.echeance} onChange={e => setNewAct(p => ({ ...p, [r.id]: { ...(p[r.id] ?? ACT_INIT), echeance: e.target.value } }))} style={inp} />
                          </div>
                          <button onClick={() => addAction(r.id)} style={{ height: 34, padding: '0 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                            <Plus size={13} /> Ajouter
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal création */}
      {showForm && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, width: '100%', maxWidth: 600, boxShadow: '0 24px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Nouvelle réunion QHSE</span>
              <button onClick={() => setShowForm(false)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', padding: '4px 6px', display: 'flex' }}><X size={14} /></button>
            </div>
            <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><label style={lbl}>Date *</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inp} /></div>
              <div><label style={lbl}>Type</label><select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={inp}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label style={lbl}>Lieu</label><input value={form.lieu} onChange={e => setForm(f => ({ ...f, lieu: e.target.value }))} style={inp} placeholder="Salle de réunion" /></div>
              <div><label style={lbl}>Animateur</label><input value={form.animateur} onChange={e => setForm(f => ({ ...f, animateur: e.target.value }))} style={inp} placeholder="Responsable" /></div>
              <div><label style={lbl}>Statut</label><select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))} style={inp}>{STATUTS.map(s => <option key={s}>{s}</option>)}</select></div>
              <div><label style={lbl}>Participants</label><input value={form.participants} onChange={e => setForm(f => ({ ...f, participants: e.target.value }))} style={inp} placeholder="Noms, virgule" /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Ordre du jour</label><textarea value={form.ordre_du_jour} onChange={e => setForm(f => ({ ...f, ordre_du_jour: e.target.value }))} style={{ ...inp, minHeight: 55, resize: 'vertical' }} placeholder="Points à aborder..." /></div>
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button onClick={() => setShowForm(false)} className="db-btn-secondary">Annuler</button>
              <button onClick={ajouter} className="db-btn-primary"><Plus size={13} /> Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] Commit :
```bash
git add src/dashboard/ReunionsQHSE.tsx
git commit -m "feat(dashboard): ReunionsQHSE — accordéon, PV PDF, envoi PDCA"
```

---

### Task 3 : DashboardReunionsPage.tsx + route

**Files:**
- Create: `src/pages/DashboardReunionsPage.tsx`
- Modify: `src/main.tsx`

- [ ] Créer `src/pages/DashboardReunionsPage.tsx` :

```tsx
// src/pages/DashboardReunionsPage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import ReunionsQHSE from '../dashboard/ReunionsQHSE';

interface Props { session: Session | null; }

function ReunionsContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return <ReunionsQHSE companyId={company.id} canWrite={canWrite} />;
}

export default function DashboardReunionsPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <ReunionsContent session={session} />
    </DashboardGuard>
  );
}
```

- [ ] Dans `src/main.tsx`, ajouter l'import :

```tsx
import DashboardReunionsPage from './pages/DashboardReunionsPage';
```

- [ ] Dans `src/main.tsx`, ajouter la route :

```tsx
<Route path="/dashboard/reunions" element={<DashboardReunionsPage session={session} />} />
```

- [ ] Commit :
```bash
git add src/pages/DashboardReunionsPage.tsx src/main.tsx
git commit -m "feat(dashboard): page + route ReunionsQHSE (/dashboard/reunions)"
```
