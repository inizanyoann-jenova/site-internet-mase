// src/dashboard/RegistreRGPD.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface Traitement {
  id: string;
  nom_traitement: string;
  finalite: string;
  responsable_nom: string | null;
  sous_traitants: string | null;
  categories_personnes: string;
  categories_donnees: string;
  destinataires: string | null;
  transfert_hors_ue: boolean;
  pays_transfert: string | null;
  duree_conservation: string;
  base_legale: string;
  mesures_securite: string | null;
  statut_conformite: 'conforme' | 'en_cours' | 'non_conforme';
  notes: string | null;
  created_at: string;
}

const BASES_LEGALES = [
  'Consentement (art. 6.1.a)',
  'Contrat (art. 6.1.b)',
  'Obligation légale (art. 6.1.c)',
  'Intérêts vitaux (art. 6.1.d)',
  "Mission d'intérêt public (art. 6.1.e)",
  'Intérêt légitime (art. 6.1.f)',
];

const CATEGORIES_PERSONNES = ['Employés', 'Clients', 'Prospects', 'Fournisseurs', 'Visiteurs', 'Candidats', 'Mineurs'];

const STATUT_CONFIG = {
  conforme: { label: 'Conforme', cls: 'bg-green-100 text-green-700' },
  en_cours: { label: 'En cours', cls: 'bg-yellow-100 text-yellow-700' },
  non_conforme: { label: 'Non conforme', cls: 'bg-red-100 text-red-700' },
};

const EMPTY: Omit<Traitement, 'id' | 'created_at'> = {
  nom_traitement: '',
  finalite: '',
  responsable_nom: null,
  sous_traitants: null,
  categories_personnes: 'Employés',
  categories_donnees: '',
  destinataires: null,
  transfert_hors_ue: false,
  pays_transfert: null,
  duree_conservation: '',
  base_legale: 'Intérêt légitime (art. 6.1.f)',
  mesures_securite: null,
  statut_conformite: 'en_cours',
  notes: null,
};

interface Props { companyId: string; canWrite: boolean }

export default function RegistreRGPD({ companyId, canWrite }: Props) {
  const [traitements, setTraitements] = useState<Traitement[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'conforme' | 'en_cours' | 'non_conforme'>('all');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('registre_traitements')
      .select('*')
      .eq('company_id', companyId)
      .order('nom_traitement');
    setTraitements((data ?? []) as Traitement[]);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  function startEdit(t: Traitement) {
    const { id, created_at, ...rest } = t;
    setForm(rest);
    setEditId(id);
    setShowForm(true);
  }

  function startNew() {
    setForm({ ...EMPTY });
    setEditId(null);
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    if (editId) {
      await supabase.from('registre_traitements').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editId);
    } else {
      await supabase.from('registre_traitements').insert({ ...form, company_id: companyId });
    }
    await load();
    setShowForm(false);
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce traitement ?')) return;
    await supabase.from('registre_traitements').delete().eq('id', id);
    await load();
  }

  const filtered = filter === 'all' ? traitements : traitements.filter(t => t.statut_conformite === filter);

  const counts = {
    conforme: traitements.filter(t => t.statut_conformite === 'conforme').length,
    en_cours: traitements.filter(t => t.statut_conformite === 'en_cours').length,
    non_conforme: traitements.filter(t => t.statut_conformite === 'non_conforme').length,
  };

  if (showForm) return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <button className="text-sm text-gray-500 hover:underline" onClick={() => setShowForm(false)}>← Retour</button>
      <h2 className="text-lg font-bold text-gray-900">{editId ? 'Modifier le traitement' : 'Nouveau traitement'}</h2>
      <div className="db-panel space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Nom du traitement *</label>
            <input className="db-input" value={form.nom_traitement} onChange={e => setForm(f => ({ ...f, nom_traitement: e.target.value }))} placeholder="Ex : Gestion de la paie" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Finalité *</label>
            <textarea className="db-input" rows={2} value={form.finalite} onChange={e => setForm(f => ({ ...f, finalite: e.target.value }))} placeholder="Pourquoi ces données sont collectées" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Responsable de traitement</label>
            <input className="db-input" value={form.responsable_nom ?? ''} onChange={e => setForm(f => ({ ...f, responsable_nom: e.target.value || null }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Sous-traitants</label>
            <input className="db-input" value={form.sous_traitants ?? ''} onChange={e => setForm(f => ({ ...f, sous_traitants: e.target.value || null }))} placeholder="Logiciel paie, hébergeur..." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Catégories de personnes *</label>
            <select className="db-input" value={form.categories_personnes} onChange={e => setForm(f => ({ ...f, categories_personnes: e.target.value }))}>
              {CATEGORIES_PERSONNES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Catégories de données *</label>
            <input className="db-input" value={form.categories_donnees} onChange={e => setForm(f => ({ ...f, categories_donnees: e.target.value }))} placeholder="Identité, coordonnées, salaire..." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Base légale *</label>
            <select className="db-input" value={form.base_legale} onChange={e => setForm(f => ({ ...f, base_legale: e.target.value }))}>
              {BASES_LEGALES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Durée de conservation *</label>
            <input className="db-input" value={form.duree_conservation} onChange={e => setForm(f => ({ ...f, duree_conservation: e.target.value }))} placeholder="Ex : 5 ans après fin du contrat" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Destinataires</label>
            <input className="db-input" value={form.destinataires ?? ''} onChange={e => setForm(f => ({ ...f, destinataires: e.target.value || null }))} placeholder="DRH, expert-comptable..." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Statut de conformité</label>
            <select className="db-input" value={form.statut_conformite} onChange={e => setForm(f => ({ ...f, statut_conformite: e.target.value as Traitement['statut_conformite'] }))}>
              <option value="conforme">Conforme</option>
              <option value="en_cours">En cours de mise en conformité</option>
              <option value="non_conforme">Non conforme</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="hors_ue" checked={form.transfert_hors_ue} onChange={e => setForm(f => ({ ...f, transfert_hors_ue: e.target.checked }))} />
            <label htmlFor="hors_ue" className="text-sm font-medium text-gray-700">Transfert hors UE</label>
          </div>
          {form.transfert_hors_ue && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Pays de transfert</label>
              <input className="db-input" value={form.pays_transfert ?? ''} onChange={e => setForm(f => ({ ...f, pays_transfert: e.target.value || null }))} />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Mesures de sécurité</label>
            <textarea className="db-input" rows={2} value={form.mesures_securite ?? ''} onChange={e => setForm(f => ({ ...f, mesures_securite: e.target.value || null }))} placeholder="Chiffrement, accès restreint, pseudonymisation..." />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
            <textarea className="db-input" rows={2} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value || null }))} />
          </div>
        </div>
        <button className="db-btn-primary" onClick={save} disabled={saving || !form.nom_traitement || !form.finalite}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 p-6">
      <div className="db-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Registre des traitements RGPD</h1>
          <p className="text-sm text-gray-500">Conforme à l'article 30 du RGPD</p>
        </div>
        {canWrite && <button className="db-btn-primary" onClick={startNew}>+ Traitement</button>}
      </div>

      <div className="flex gap-4">
        <div className="db-kpi"><div className="text-2xl font-bold text-green-600">{counts.conforme}</div><div className="text-xs text-gray-500">Conformes</div></div>
        <div className="db-kpi"><div className="text-2xl font-bold text-yellow-600">{counts.en_cours}</div><div className="text-xs text-gray-500">En cours</div></div>
        <div className="db-kpi"><div className="text-2xl font-bold text-red-600">{counts.non_conforme}</div><div className="text-xs text-gray-500">Non conformes</div></div>
      </div>

      <div className="flex gap-2">
        {(['all', 'conforme', 'en_cours', 'non_conforme'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded px-3 py-1 text-xs font-medium ${filter === s ? 'bg-mase-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s === 'all' ? 'Tous' : STATUT_CONFIG[s].label}
          </button>
        ))}
      </div>

      <div className="db-panel overflow-x-auto p-0">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Aucun traitement enregistré.</div>
        ) : (
          <table className="db-table">
            <thead>
              <tr>
                <th>Traitement</th>
                <th>Finalité</th>
                <th>Base légale</th>
                <th>Conservation</th>
                <th>Statut</th>
                {canWrite && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td className="font-medium text-gray-900">{t.nom_traitement}</td>
                  <td className="max-w-xs truncate text-sm text-gray-600">{t.finalite}</td>
                  <td className="text-sm text-gray-600">{t.base_legale}</td>
                  <td className="text-sm text-gray-600">{t.duree_conservation}</td>
                  <td><span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUT_CONFIG[t.statut_conformite].cls}`}>{STATUT_CONFIG[t.statut_conformite].label}</span></td>
                  {canWrite && (
                    <td className="flex gap-2">
                      <button className="text-xs text-blue-600 hover:underline" onClick={() => startEdit(t)}>Modifier</button>
                      <button className="text-xs text-red-500 hover:underline" onClick={() => remove(t.id)}>Suppr.</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
