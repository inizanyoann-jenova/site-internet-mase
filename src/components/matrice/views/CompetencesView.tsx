// src/components/matrice/views/CompetencesView.tsx
import { useState } from 'react';
import { useMatrice } from '../MatriceContext';
import type { Comp } from '../types';

type FormData = { name: string; categoryId: string; isKey: boolean; minBackups: number };
const EMPTY_FORM: FormData = { name: '', categoryId: '', isKey: false, minBackups: 1 };

export function CompetencesView() {
  const { data, dispatch } = useMatrice();
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; comp?: Comp } | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  function openAdd() {
    setForm({ ...EMPTY_FORM, categoryId: data.config.categories[0]?.id ?? '' });
    setModal({ mode: 'add' });
  }

  function openEdit(comp: Comp) {
    setForm({ name: comp.name, categoryId: comp.categoryId, isKey: comp.isKey, minBackups: comp.minBackups });
    setModal({ mode: 'edit', comp });
  }

  function handleSave() {
    if (!form.name.trim() || !form.categoryId) return;
    if (modal?.mode === 'add') {
      dispatch({ type: 'ADD_COMP', comp: { name: form.name.trim(), categoryId: form.categoryId, isKey: form.isKey, minBackups: form.minBackups } });
    } else if (modal?.comp) {
      dispatch({ type: 'UPDATE_COMP', comp: { ...modal.comp, name: form.name.trim(), categoryId: form.categoryId, isKey: form.isKey, minBackups: form.minBackups } });
    }
    setModal(null);
  }

  function handleDelete(id: string) {
    if (!confirm('Supprimer cette compétence ? Les niveaux associés seront perdus.')) return;
    dispatch({ type: 'DELETE_COMP', id });
  }

  const grouped = data.config.categories.map(cat => ({
    cat,
    comps: data.comps.filter(c => c.categoryId === cat.id),
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openAdd} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: '#2563a8' }}>
          + Ajouter une compétence
        </button>
      </div>
      {grouped.map(({ cat, comps }) => comps.length === 0 ? null : (
        <div key={cat.id} className="rounded-lg bg-white shadow overflow-hidden">
          <div className="px-5 py-3 font-bold text-white text-sm" style={{ background: cat.color }}>
            {cat.name} ({comps.length})
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                <th className="px-5 py-2 text-left text-xs font-bold text-slate-600">Compétence</th>
                <th className="px-5 py-2 text-center text-xs font-bold text-slate-600">Poste clé</th>
                <th className="px-5 py-2 text-center text-xs font-bold text-slate-600">Min. remplaçants</th>
                <th className="px-5 py-2 text-right text-xs font-bold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {comps.map(comp => (
                <tr key={comp.id} style={{ borderBottom: '1px solid #f1f3f4' }}>
                  <td className="px-5 py-3 font-semibold text-slate-800">{comp.name}</td>
                  <td className="px-5 py-3 text-center">
                    {comp.isKey ? <span className="text-red-600 font-bold">★ Oui</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-center text-slate-600">{comp.isKey ? comp.minBackups : '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(comp)} className="rounded px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 border">✏️</button>
                      <button onClick={() => handleDelete(comp.id)} className="rounded px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {data.comps.length === 0 && (
        <div className="rounded-lg bg-white p-10 text-center text-slate-400 text-sm shadow">
          Aucune compétence. Cliquez sur "+ Ajouter une compétence".
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 font-bold text-slate-800">
              {modal.mode === 'add' ? 'Ajouter une compétence' : 'Modifier la compétence'}
            </h3>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Nom *</label>
            <input
              className="mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="ex: Habilitation électrique"
            />
            <label className="mb-1 block text-xs font-semibold text-slate-600">Catégorie *</label>
            <select
              className="mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={form.categoryId}
              onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}
            >
              <option value="">— Sélectionner —</option>
              {data.config.categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            <label className="mb-3 flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={form.isKey}
                onChange={e => setForm(p => ({ ...p, isKey: e.target.checked }))}
              />
              <span className="font-semibold text-slate-700">Poste clé (nécessite redondance)</span>
            </label>
            {form.isKey && (
              <>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Nombre minimum de remplaçants (niveau ≥ 2)</label>
                <input
                  type="number" min={1} max={20}
                  className="mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={form.minBackups}
                  onChange={e => setForm(p => ({ ...p, minBackups: Math.max(1, parseInt(e.target.value) || 1) }))}
                />
              </>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-sm text-slate-500 hover:bg-slate-50">Annuler</button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || !form.categoryId}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#2563a8' }}
              >
                {modal.mode === 'add' ? 'Ajouter' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
