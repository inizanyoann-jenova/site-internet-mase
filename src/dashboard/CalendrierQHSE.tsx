// src/dashboard/CalendrierQHSE.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface Evenement {
  id: string;
  titre: string;
  type_evenement: string;
  date_debut: string;
  date_fin: string | null;
  heure: string | null;
  lieu: string | null;
  responsable: string | null;
  description: string | null;
  statut: 'planifié' | 'réalisé' | 'annulé' | 'reporté';
}

const TYPES = ['Audit', 'Formation', 'Réunion', 'Échéance', 'Visite', 'Exercice', 'Autre'];
const STATUTS = ['planifié', 'réalisé', 'annulé', 'reporté'] as const;

const TYPE_COLORS: Record<string, string> = {
  Audit:      'bg-purple-100 text-purple-700',
  Formation:  'bg-blue-100 text-blue-700',
  Réunion:    'bg-yellow-100 text-yellow-700',
  Échéance:   'bg-red-100 text-red-700',
  Visite:     'bg-green-100 text-green-700',
  Exercice:   'bg-orange-100 text-orange-700',
  Autre:      'bg-gray-100 text-gray-600',
};

const STATUT_COLORS: Record<string, string> = {
  planifié: 'bg-blue-100 text-blue-700',
  réalisé:  'bg-green-100 text-green-700',
  annulé:   'bg-red-100 text-red-600',
  reporté:  'bg-yellow-100 text-yellow-700',
};

const MOIS_LABELS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const EMPTY: Omit<Evenement, 'id'> = {
  titre: '', type_evenement: 'Réunion', date_debut: '', date_fin: null,
  heure: null, lieu: null, responsable: null, description: null, statut: 'planifié',
};

interface Props { companyId: string; canWrite: boolean }

export default function CalendrierQHSE({ companyId, canWrite }: Props) {
  const now = new Date();
  const [annee, setAnnee] = useState(now.getFullYear());
  const [moisFilter, setMoisFilter] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('calendrier_qhse')
      .select('*')
      .eq('company_id', companyId)
      .gte('date_debut', `${annee}-01-01`)
      .lte('date_debut', `${annee}-12-31`)
      .order('date_debut');
    setEvenements((data ?? []) as Evenement[]);
  }, [companyId, annee]);

  useEffect(() => { load(); }, [load]);

  function startNew() {
    setForm({ ...EMPTY, date_debut: new Date().toISOString().slice(0, 10) });
    setEditId(null);
    setShowForm(true);
  }

  function startEdit(e: Evenement) {
    const { id, ...rest } = e;
    setForm(rest);
    setEditId(id);
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    if (editId) {
      await supabase.from('calendrier_qhse').update(form).eq('id', editId);
    } else {
      await supabase.from('calendrier_qhse').insert({ ...form, company_id: companyId });
    }
    await load();
    setShowForm(false);
    setSaving(false);
  }

  async function changeStatut(id: string, statut: Evenement['statut']) {
    await supabase.from('calendrier_qhse').update({ statut }).eq('id', id);
    await load();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cet événement ?')) return;
    await supabase.from('calendrier_qhse').delete().eq('id', id);
    await load();
  }

  let filtered = evenements;
  if (moisFilter !== null) filtered = filtered.filter(e => new Date(e.date_debut).getMonth() === moisFilter);
  if (typeFilter) filtered = filtered.filter(e => e.type_evenement === typeFilter);

  const upcoming = evenements.filter(e => e.statut === 'planifié' && new Date(e.date_debut) >= now).length;
  const overdue = evenements.filter(e => e.statut === 'planifié' && new Date(e.date_debut) < now).length;

  if (showForm) return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <button className="text-sm text-gray-500 hover:underline" onClick={() => setShowForm(false)}>← Retour</button>
      <h2 className="text-lg font-bold text-gray-900">{editId ? "Modifier l'événement" : 'Nouvel événement'}</h2>
      <div className="db-panel space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Titre *</label>
          <input className="db-input" value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} placeholder="Ex : Audit interne sécurité" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
            <select className="db-input" value={form.type_evenement} onChange={e => setForm(f => ({ ...f, type_evenement: e.target.value }))}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Statut</label>
            <select className="db-input" value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value as Evenement['statut'] }))}>
              {STATUTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date *</label>
            <input type="date" className="db-input" value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date de fin</label>
            <input type="date" className="db-input" value={form.date_fin ?? ''} onChange={e => setForm(f => ({ ...f, date_fin: e.target.value || null }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Heure</label>
            <input type="time" className="db-input" value={form.heure ?? ''} onChange={e => setForm(f => ({ ...f, heure: e.target.value || null }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Lieu</label>
            <input className="db-input" value={form.lieu ?? ''} onChange={e => setForm(f => ({ ...f, lieu: e.target.value || null }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Responsable</label>
            <input className="db-input" value={form.responsable ?? ''} onChange={e => setForm(f => ({ ...f, responsable: e.target.value || null }))} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea className="db-input" rows={3} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value || null }))} />
        </div>
        <button className="db-btn-primary" onClick={save} disabled={saving || !form.titre || !form.date_debut}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 p-6">
      <div className="db-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Calendrier QHSE</h1>
          <p className="text-sm text-gray-500">Planning des audits, formations, réunions et échéances</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="db-input w-auto" value={annee} onChange={e => setAnnee(Number(e.target.value))}>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {canWrite && <button className="db-btn-primary" onClick={startNew}>+ Événement</button>}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="db-kpi"><div className="text-2xl font-bold text-blue-600">{upcoming}</div><div className="text-xs text-gray-500">À venir</div></div>
        {overdue > 0 && <div className="db-kpi"><div className="text-2xl font-bold text-red-600">{overdue}</div><div className="text-xs text-gray-500">En retard</div></div>}
        <div className="db-kpi"><div className="text-2xl font-bold text-green-600">{evenements.filter(e => e.statut === 'réalisé').length}</div><div className="text-xs text-gray-500">Réalisés</div></div>
      </div>

      <div className="flex flex-wrap gap-1">
        <button onClick={() => setMoisFilter(null)} className={`rounded px-2 py-1 text-xs font-medium ${moisFilter === null ? 'bg-mase-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Tous</button>
        {MOIS_LABELS.map((m, i) => (
          <button key={i} onClick={() => setMoisFilter(moisFilter === i ? null : i)} className={`rounded px-2 py-1 text-xs font-medium ${moisFilter === i ? 'bg-mase-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{m.slice(0, 3)}</button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        <button onClick={() => setTypeFilter('')} className={`rounded px-2 py-1 text-xs font-medium ${!typeFilter ? 'bg-mase-green text-white' : 'bg-gray-100 text-gray-600'}`}>Tous types</button>
        {TYPES.map(t => <button key={t} onClick={() => setTypeFilter(typeFilter === t ? '' : t)} className={`rounded px-2 py-1 text-xs font-medium ${typeFilter === t ? 'bg-mase-green text-white' : `${TYPE_COLORS[t]} hover:opacity-80`}`}>{t}</button>)}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="db-panel p-8 text-center text-gray-400">Aucun événement pour cette période.</div>
        ) : (
          filtered.map(e => {
            const isPast = e.statut === 'planifié' && new Date(e.date_debut) < now;
            return (
              <div key={e.id} className={`db-panel flex items-start justify-between gap-4 ${isPast ? 'border-l-4 border-red-400' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="min-w-[80px] text-right">
                    <div className="text-sm font-bold text-gray-800">{new Date(e.date_debut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</div>
                    {e.heure && <div className="text-xs text-gray-500">{e.heure}</div>}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[e.type_evenement]}`}>{e.type_evenement}</span>
                      <span className="font-medium text-gray-900">{e.titre}</span>
                    </div>
                    {(e.lieu || e.responsable) && (
                      <div className="mt-0.5 text-xs text-gray-500">
                        {e.lieu && <span>📍 {e.lieu}</span>}
                        {e.lieu && e.responsable && <span className="mx-1">·</span>}
                        {e.responsable && <span>👤 {e.responsable}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUT_COLORS[e.statut]}`}>{e.statut}</span>
                  {canWrite && (
                    <div className="flex gap-1">
                      {e.statut === 'planifié' && (
                        <button className="text-xs text-green-600 hover:underline" onClick={() => changeStatut(e.id, 'réalisé')}>✓ Réalisé</button>
                      )}
                      <button className="text-xs text-blue-600 hover:underline" onClick={() => startEdit(e)}>Modifier</button>
                      <button className="text-xs text-red-500 hover:underline" onClick={() => remove(e.id)}>Suppr.</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
