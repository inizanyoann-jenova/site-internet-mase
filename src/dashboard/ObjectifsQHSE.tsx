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
