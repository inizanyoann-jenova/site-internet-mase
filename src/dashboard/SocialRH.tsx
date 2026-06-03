// src/dashboard/SocialRH.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, RefreshCw, Users, X, Save } from 'lucide-react';
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

const POSTES   = ['Responsable QHSE', 'Opérateur', 'Technicien', 'Agent de maîtrise', 'Cadre', 'Administratif', "Chargé d'affaires", 'Manager', 'Direction'];
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

  const addEmploye = async () => {
    if (!empForm.nom.trim()) return;
    const { data } = await supabase.from('rh_employes').insert([{ ...empForm, company_id: companyId, date_entree: empForm.date_entree || null }]).select();
    if (data) setEmployes(p => [...p, data[0]].sort((a, b) => a.nom.localeCompare(b.nom)));
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
      <div className="db-page-header">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--mase-heading)]">
            <Users size={22} className="text-purple-500" /> Social &amp; RH
          </h2>
          <p className="text-sm text-[var(--mase-muted)] mt-1">Effectifs, formations et suivi RH</p>
        </div>
        <button onClick={loadAll} className="db-btn-secondary"><RefreshCw size={14} /> Actualiser</button>
      </div>

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
                  {!employes.length && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>{loading ? 'Chargement…' : canWrite ? 'Aucun employé — cliquez Ajouter' : 'Aucun employé enregistré'}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

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
                  {!formations.length && <tr><td colSpan={9} style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>{loading ? 'Chargement…' : canWrite ? 'Aucune formation — cliquez Ajouter' : 'Aucune formation enregistrée'}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
