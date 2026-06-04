# Phase 3 — Partie 2 : ObjectifsQHSE + QualiteAudits

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter les modules ObjectifsQHSE (jauges circulaires, objectifs par catégorie, auto-calcul) et QualiteAudits (4 sous-onglets : Audits, NC, Satisfaction, QVT).

**Architecture:** Même pattern que les modules Phase 2 — composant dans `src/dashboard/`, page dans `src/pages/`, route dans `src/main.tsx`. RLS gère le filtrage `company_id` automatiquement. Props : `companyId: string, canWrite: boolean`.

**Tech Stack:** React 19, TypeScript, Supabase, Tailwind, CSS classes `db-panel/db-input/db-btn-*`

**Prérequis :** Phase 1 terminée (tables créées, kpi-utils.ts mis à jour).

---

### Task 0 : ObjectifsQHSE.tsx

**Files:**
- Create: `src/dashboard/ObjectifsQHSE.tsx`

- [ ] Créer `src/dashboard/ObjectifsQHSE.tsx` :

```tsx
// src/dashboard/ObjectifsQHSE.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Save, Trash2, RefreshCw, ChevronDown, ChevronUp, Target, HeartPulse, ShieldAlert, Leaf, Users, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { tauxAtteinteObjectif } from './kpi-utils';

interface Props { companyId: string; canWrite: boolean; }

interface Objectif {
  id: string;
  annee: number;
  categorie: string;
  titre: string;
  description: string | null;
  valeur_cible: number;
  valeur_reelle: number | null;
  unite: string;
  sens: 'max' | 'min';
  actif: boolean;
}

const ANNEE = new Date().getFullYear();

const CATEGORIES = [
  { id: 'securite',      label: 'Sécurité',      color: '#EF4444', bgL: '#FEF2F2', colorL: '#991B1B', Icon: HeartPulse },
  { id: 'qualite',       label: 'Qualité',        color: '#4F63E7', bgL: '#EEF2FF', colorL: '#3730A3', Icon: ShieldAlert },
  { id: 'environnement', label: 'Environnement',  color: '#10B981', bgL: '#ECFDF5', colorL: '#065F46', Icon: Leaf },
  { id: 'rh',            label: 'Social & RH',    color: '#8B5CF6', bgL: '#F5F3FF', colorL: '#5B21B6', Icon: Users },
];

const OBJECTIFS_DEFAUT = [
  { categorie: 'securite',      titre: 'Accidents avec arrêt',   description: "Nombre d'AT avec arrêt de travail",             valeur_cible: 0,  unite: 'AT', sens: 'min' as const },
  { categorie: 'securite',      titre: 'Habilitations à jour',   description: '% habilitations non expirées',                  valeur_cible: 95, unite: '%',  sens: 'max' as const },
  { categorie: 'qualite',       titre: 'NC clôturées',           description: '% de non-conformités clôturées',                valeur_cible: 90, unite: '%',  sens: 'max' as const },
  { categorie: 'qualite',       titre: 'Score audit moyen',      description: 'Score moyen des audits internes',                valeur_cible: 80, unite: '%',  sens: 'max' as const },
  { categorie: 'qualite',       titre: 'Actions PDCA terminées', description: "% d'actions du plan clôturées",                  valeur_cible: 85, unite: '%',  sens: 'max' as const },
  { categorie: 'environnement', titre: 'Réduction déchets',      description: 'Objectif de réduction vs année précédente',     valeur_cible: 10, unite: '%',  sens: 'max' as const },
  { categorie: 'rh',            titre: 'Taux de formation',      description: "% d'employés ayant suivi au moins 1 formation", valeur_cible: 80, unite: '%',  sens: 'max' as const },
  { categorie: 'rh',            titre: 'Absentéisme',            description: "Taux d'absentéisme annuel",                     valeur_cible: 3,  unite: '%',  sens: 'min' as const },
];

function JaugeCirculaire({ pct, color, size = 90 }: { pct: number; color: string; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={8} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }} />
    </svg>
  );
}

function BadgeStatut({ statut }: { statut: string }) {
  const cfg: Record<string, { label: string; bg: string; color: string }> = {
    'atteint':     { label: '✅ Atteint',    bg: 'rgba(16,185,129,0.12)',  color: '#10B981' },
    'en-cours':    { label: '🔵 En cours',   bg: 'rgba(59,130,246,0.12)',  color: '#3B82F6' },
    'danger':      { label: '⚠️ En danger', bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B' },
    'non-demarre': { label: '⏸ Non démarré', bg: 'rgba(100,116,139,0.12)', color: '#64748B' },
  };
  const s = cfg[statut] ?? cfg['non-demarre'];
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

function getStatut(pct: number, hasData: boolean): string {
  if (!hasData) return 'non-demarre';
  if (pct >= 100) return 'atteint';
  if (pct >= 70)  return 'en-cours';
  return 'danger';
}

const FORM_INIT = { categorie: 'securite', titre: '', description: '', valeur_cible: '', unite: '%', sens: 'max' as 'max' | 'min', annee: ANNEE };

export default function ObjectifsQHSE({ companyId, canWrite }: Props) {
  const [objectifs, setObjectifs] = useState<Objectif[]>([]);
  const [loading, setLoading]     = useState(true);
  const [annee, setAnnee]         = useState(ANNEE);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<Objectif | null>(null);
  const [form, setForm]           = useState({ ...FORM_INIT });
  const [expanded, setExpanded]   = useState(new Set(['securite', 'qualite', 'environnement', 'rh']));
  const [catFilter, setCatFilter] = useState('tous');

  async function charger() {
    setLoading(true);
    const { data, error } = await supabase
      .from('objectifs_qhse')
      .select('*')
      .eq('actif', true)
      .eq('annee', annee)
      .order('categorie');
    if (!error && data !== null) {
      if (data.length === 0) {
        // Insérer les objectifs par défaut
        const { data: inserted } = await supabase
          .from('objectifs_qhse')
          .insert(OBJECTIFS_DEFAUT.map(o => ({ ...o, annee, company_id: companyId })))
          .select();
        setObjectifs(inserted ?? []);
      } else {
        setObjectifs(data);
      }
    }
    setLoading(false);
  }

  useEffect(() => { charger(); }, [annee]);

  async function sauvegarder() {
    if (!form.titre || form.valeur_cible === '') return;
    const payload = { ...form, valeur_cible: Number(form.valeur_cible), annee, company_id: companyId };
    if (editing) {
      await supabase.from('objectifs_qhse').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('objectifs_qhse').insert(payload);
    }
    setShowForm(false);
    setEditing(null);
    setForm({ ...FORM_INIT });
    charger();
  }

  async function supprimer(id: string) {
    if (!confirm('Supprimer cet objectif ?')) return;
    await supabase.from('objectifs_qhse').update({ actif: false }).eq('id', id);
    charger();
  }

  async function saveValeur(id: string, val: string) {
    await supabase.from('objectifs_qhse').update({ valeur_reelle: Number(val) }).eq('id', id);
    charger();
  }

  const toggleCat = (id: string) => setExpanded(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  const stats = useMemo(() => {
    const all = objectifs.map(o => {
      const pct = tauxAtteinteObjectif(o.valeur_reelle ?? 0, o.valeur_cible, o.sens);
      return getStatut(pct, o.valeur_reelle !== null);
    });
    return {
      atteint:    all.filter(s => s === 'atteint').length,
      enCours:    all.filter(s => s === 'en-cours').length,
      danger:     all.filter(s => s === 'danger').length,
      nonDemarre: all.filter(s => s === 'non-demarre').length,
      total:      all.length,
      score:      all.length
        ? Math.round(objectifs.reduce((s, o) => s + tauxAtteinteObjectif(o.valeur_reelle ?? 0, o.valeur_cible, o.sens), 0) / all.length)
        : 0,
    };
  }, [objectifs]);

  const affichees = catFilter === 'tous' ? objectifs : objectifs.filter(o => o.categorie === catFilter);

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="db-page-header">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--mase-heading)]">
            <Target size={22} className="text-blue-500" /> Objectifs annuels QHSE
          </h2>
          <p className="text-sm text-[var(--mase-muted)] mt-1">
            Suivez vos engagements {annee} — progression calculée en temps réel
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={annee} onChange={e => setAnnee(Number(e.target.value))} className="db-input" style={{ width: 100 }}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={charger} className="db-btn-secondary"><RefreshCw size={14} /> Actualiser</button>
          {canWrite && (
            <button onClick={() => { setEditing(null); setForm({ ...FORM_INIT, annee }); setShowForm(true); }} className="db-btn-primary">
              <Plus size={14} /> Nouvel objectif
            </button>
          )}
        </div>
      </div>

      {/* Formulaire */}
      {(showForm || editing) && canWrite && (
        <div className="db-panel p-5" style={{ border: '1px solid rgba(59,130,246,0.2)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
            {editing ? "Modifier l'objectif" : 'Nouvel objectif'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Catégorie</label>
              <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))} className="db-input">
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Titre *</label>
              <input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} className="db-input" placeholder="ex: Zéro accident avec arrêt" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="db-input" placeholder="Explication" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Cible *</label>
                <input type="number" value={form.valeur_cible} onChange={e => setForm(f => ({ ...f, valeur_cible: e.target.value }))} className="db-input" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Unité</label>
                <input value={form.unite} onChange={e => setForm(f => ({ ...f, unite: e.target.value }))} className="db-input" placeholder="%" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Sens</label>
                <select value={form.sens} onChange={e => setForm(f => ({ ...f, sens: e.target.value as 'max' | 'min' }))} className="db-input">
                  <option value="max">↑ Max</option>
                  <option value="min">↓ Min</option>
                </select>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="db-btn-secondary"><X size={14} /> Annuler</button>
            <button onClick={sauvegarder} className="db-btn-primary" disabled={!form.titre || form.valeur_cible === ''}>
              <Save size={14} /> Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* KPIs synthèse */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Score global', val: `${stats.score}%`, color: '#3b82f6' },
          { label: 'Atteints',     val: stats.atteint,    color: '#10b981' },
          { label: 'En cours',     val: stats.enCours,    color: '#3b82f6' },
          { label: 'En danger',    val: stats.danger,     color: '#f59e0b' },
          { label: 'Non démarrés', val: stats.nonDemarre, color: '#64748b' },
        ].map((k, i) => (
          <div key={i} className="db-panel p-4" style={{ borderLeft: `4px solid ${k.color}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a' }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="db-panel p-3" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => setCatFilter('tous')} style={{ padding: '5px 14px', borderRadius: 100, border: `1.5px solid ${catFilter === 'tous' ? '#3b82f6' : '#e2e8f0'}`, background: catFilter === 'tous' ? 'rgba(59,130,246,0.08)' : 'transparent', color: catFilter === 'tous' ? '#3b82f6' : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          Tous ({objectifs.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = objectifs.filter(o => o.categorie === cat.id).length;
          const active = catFilter === cat.id;
          return (
            <button key={cat.id} onClick={() => setCatFilter(cat.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 100, border: `1.5px solid ${active ? cat.colorL : '#e2e8f0'}`, background: active ? cat.bgL : 'transparent', color: active ? cat.colorL : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              <cat.Icon size={12} /> {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Objectifs par catégorie */}
      {loading ? (
        <div className="db-panel p-10 text-center text-[var(--mase-muted)]">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2" /> Chargement…
        </div>
      ) : CATEGORIES.filter(c => catFilter === 'tous' || catFilter === c.id).map(cat => {
        const items = affichees.filter(o => o.categorie === cat.id);
        if (!items.length) return null;
        const isExp = expanded.has(cat.id);
        const catScore = Math.round(items.reduce((s, o) => s + tauxAtteinteObjectif(o.valeur_reelle ?? 0, o.valeur_cible, o.sens), 0) / items.length);

        return (
          <div key={cat.id} className="db-panel" style={{ overflow: 'hidden' }}>
            <div onClick={() => toggleCat(cat.id)} style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderBottom: isExp ? '1px solid #e2e8f0' : 'none' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: cat.bgL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <cat.Icon size={16} style={{ color: cat.colorL }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{cat.label}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{items.length} objectif{items.length > 1 ? 's' : ''} · Score : {catScore}%</div>
              </div>
              <div style={{ width: 120 }}>
                <div style={{ height: 6, borderRadius: 3, background: '#e2e8f0' }}>
                  <div style={{ height: '100%', width: `${catScore}%`, background: cat.colorL, borderRadius: 3, transition: 'width 0.6s' }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: cat.colorL, marginTop: 3 }}>{catScore}%</div>
              </div>
              {isExp ? <ChevronUp size={16} style={{ color: '#64748b' }} /> : <ChevronDown size={16} style={{ color: '#64748b' }} />}
            </div>

            {isExp && (
              <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {items.map(obj => {
                  const pct = tauxAtteinteObjectif(obj.valeur_reelle ?? 0, obj.valeur_cible, obj.sens);
                  const statut = getStatut(pct, obj.valeur_reelle !== null);
                  return (
                    <div key={obj.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                          <JaugeCirculaire pct={pct} color={cat.colorL} size={80} />
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>{pct}%</span>
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{obj.titre}</div>
                              {obj.description && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{obj.description}</div>}
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <BadgeStatut statut={statut} />
                              {canWrite && (
                                <>
                                  <button onClick={() => { setEditing(obj); setForm({ categorie: obj.categorie, titre: obj.titre, description: obj.description ?? '', valeur_cible: String(obj.valeur_cible), unite: obj.unite, sens: obj.sens, annee: obj.annee }); setShowForm(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 3 }}>✏️</button>
                                  <button onClick={() => supprimer(obj.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 3 }}><Trash2 size={13} /></button>
                                </>
                              )}
                            </div>
                          </div>
                          <div style={{ height: 5, borderRadius: 3, background: '#e2e8f0', marginBottom: 8 }}>
                            <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: cat.colorL, borderRadius: 3 }} />
                          </div>
                          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, color: '#64748b' }}>Cible : <strong style={{ color: '#0f172a' }}>{obj.valeur_cible} {obj.unite}</strong> {obj.sens === 'min' ? '↓' : '↑'}</span>
                            <span style={{ fontSize: 12, color: '#64748b' }}>
                              Réel :&nbsp;
                              {canWrite ? (
                                <input
                                  type="number"
                                  defaultValue={obj.valeur_reelle ?? ''}
                                  onBlur={e => saveValeur(obj.id, e.target.value)}
                                  style={{ width: 60, padding: '2px 6px', fontSize: 12, fontWeight: 700, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 5, outline: 'none', color: cat.colorL }}
                                  placeholder="—"
                                />
                              ) : (
                                <strong style={{ color: cat.colorL }}>{obj.valeur_reelle !== null ? `${obj.valeur_reelle} ${obj.unite}` : '—'}</strong>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] Commit :
```bash
git add src/dashboard/ObjectifsQHSE.tsx
git commit -m "feat(dashboard): ObjectifsQHSE — jauges circulaires, CRUD, 8 défauts"
```

---

### Task 1 : DashboardObjectifsPage.tsx + route

**Files:**
- Create: `src/pages/DashboardObjectifsPage.tsx`
- Modify: `src/main.tsx`

- [ ] Créer `src/pages/DashboardObjectifsPage.tsx` :

```tsx
// src/pages/DashboardObjectifsPage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import ObjectifsQHSE from '../dashboard/ObjectifsQHSE';

interface Props { session: Session | null; }

function ObjectifsContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return <ObjectifsQHSE companyId={company.id} canWrite={canWrite} />;
}

export default function DashboardObjectifsPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <ObjectifsContent session={session} />
    </DashboardGuard>
  );
}
```

- [ ] Dans `src/main.tsx`, ajouter l'import en haut (après les imports existants) :

```tsx
import DashboardObjectifsPage from './pages/DashboardObjectifsPage';
```

- [ ] Dans `src/main.tsx`, ajouter la route dans le bloc `<Routes>` après la dernière route dashboard :

```tsx
<Route path="/dashboard/objectifs" element={<DashboardObjectifsPage session={session} />} />
```

- [ ] Commit :
```bash
git add src/pages/DashboardObjectifsPage.tsx src/main.tsx
git commit -m "feat(dashboard): page + route ObjectifsQHSE (/dashboard/objectifs)"
```

---

### Task 2 : QualiteAudits.tsx

**Files:**
- Create: `src/dashboard/QualiteAudits.tsx`

- [ ] Créer `src/dashboard/QualiteAudits.tsx` :

```tsx
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

  /* ── Saves ── */
  const saveAudit = async (row: Audit) => {
    const { id, ...d } = row;
    await supabase.from('qualite_audits').update(d).eq('id', id);
  };
  const saveNC  = async (row: NC)  => { const { id, ...d } = row; await supabase.from('qualite_nc').update(d).eq('id', id); };
  const saveSat = async (row: Sat) => { const { id, ...d } = row; await supabase.from('qualite_satisfaction').update(d).eq('id', id); };
  const saveQvt = async (row: QVT) => { const { id, ...d } = row; await supabase.from('qualite_qvt').update(d).eq('id', id); };

  const upAudit = (id: string, k: keyof Audit, v: unknown) => setAudits(p => p.map(a => a.id === id ? { ...a, [k]: v } : a));
  const upNC    = (id: string, k: keyof NC,    v: unknown) => setNcs(p => p.map(a => a.id === id ? { ...a, [k]: v } : a));
  const upSat   = (id: string, k: keyof Sat,   v: unknown) => setSats(p => p.map(a => a.id === id ? { ...a, [k]: v } : a));
  const upQvt   = (id: string, k: keyof QVT,   v: unknown) => setQvts(p => p.map(a => a.id === id ? { ...a, [k]: v } : a));

  /* ── Adds ── */
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

  /* ── KPIs ── */
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
      {/* Header */}
      <div className="db-page-header">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--mase-heading)]">
            <ClipboardCheck size={22} className="text-blue-500" /> Qualité &amp; Audits
          </h2>
          <p className="text-sm text-[var(--mase-muted)] mt-1">Audits, non-conformités, satisfaction client et QVT</p>
        </div>
        <button onClick={loadAll} className="db-btn-secondary"><RefreshCw size={14} /> Actualiser</button>
      </div>

      {/* KPIs */}
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

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 4, background: '#f8fafc', borderRadius: 10, padding: 4, border: '1px solid #e2e8f0' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', background: tab === t.id ? '#166534' : 'transparent', color: tab === t.id ? 'white' : '#64748b', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            {t.label}
            {t.count > 0 && <span style={{ background: tab === t.id ? 'rgba(255,255,255,0.25)' : '#e2e8f0', borderRadius: 100, padding: '1px 6px', fontSize: 10 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ── Audits ── */}
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

      {/* ── NC ── */}
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

      {/* ── Satisfaction ── */}
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

      {/* ── QVT ── */}
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
```

- [ ] Commit :
```bash
git add src/dashboard/QualiteAudits.tsx
git commit -m "feat(dashboard): QualiteAudits — 4 onglets Audits/NC/Satisfaction/QVT"
```

---

### Task 3 : DashboardQualitePage.tsx + route

**Files:**
- Create: `src/pages/DashboardQualitePage.tsx`
- Modify: `src/main.tsx`

- [ ] Créer `src/pages/DashboardQualitePage.tsx` :

```tsx
// src/pages/DashboardQualitePage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import QualiteAudits from '../dashboard/QualiteAudits';

interface Props { session: Session | null; }

function QualiteContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return <QualiteAudits companyId={company.id} canWrite={canWrite} />;
}

export default function DashboardQualitePage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <QualiteContent session={session} />
    </DashboardGuard>
  );
}
```

- [ ] Dans `src/main.tsx`, ajouter l'import :

```tsx
import DashboardQualitePage from './pages/DashboardQualitePage';
```

- [ ] Dans `src/main.tsx`, ajouter la route :

```tsx
<Route path="/dashboard/audits" element={<DashboardQualitePage session={session} />} />
```

- [ ] Commit :
```bash
git add src/pages/DashboardQualitePage.tsx src/main.tsx
git commit -m "feat(dashboard): page + route QualiteAudits (/dashboard/audits)"
```
