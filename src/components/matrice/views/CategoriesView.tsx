// src/components/matrice/views/CategoriesView.tsx
import { useState } from 'react';
import { useMatrice } from '../MatriceContext';
import type { Category } from '../types';

type FormData = { name: string; color: string };
const COLORS = ['#c0392b','#1f4d7a','#7c3aed','#0891b2','#16a34a','#ea580c','#db2777','#0f766e'];

export function CategoriesView() {
  const { data, dispatch } = useMatrice();
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; category?: Category } | null>(null);
  const [form, setForm] = useState<FormData>({ name: '', color: COLORS[0] });

  function openAdd() {
    const used = data.config.categories.map(c => c.color);
    const free = COLORS.find(c => !used.includes(c)) ?? COLORS[0];
    setForm({ name: '', color: free });
    setModal({ mode: 'add' });
  }

  function openEdit(cat: Category) {
    setForm({ name: cat.name, color: cat.color });
    setModal({ mode: 'edit', category: cat });
  }

  function handleSave() {
    if (!form.name.trim()) return;
    if (modal?.mode === 'add') {
      dispatch({ type: 'ADD_CATEGORY', category: { name: form.name.trim(), color: form.color } });
    } else if (modal?.category) {
      dispatch({ type: 'UPDATE_CATEGORY', category: { ...modal.category, name: form.name.trim(), color: form.color } });
    }
    setModal(null);
  }

  function handleDelete(cat: Category) {
    const count = data.comps.filter(c => c.categoryId === cat.id).length;
    const msg = count > 0
      ? `Supprimer "${cat.name}" ? Les ${count} compétences de cette catégorie seront également supprimées.`
      : `Supprimer la catégorie "${cat.name}" ?`;
    if (!confirm(msg)) return;
    dispatch({ type: 'DELETE_CATEGORY', id: cat.id });
  }

  return (
    <div className="rounded-lg bg-white shadow overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="font-bold text-slate-800">🗂 Catégories de compétences</h2>
        <button onClick={openAdd} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: '#2563a8' }}>
          + Ajouter
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <th className="px-5 py-3 text-left text-xs font-bold text-slate-600">#</th>
            <th className="px-5 py-3 text-left text-xs font-bold text-slate-600">Nom</th>
            <th className="px-5 py-3 text-center text-xs font-bold text-slate-600">Couleur</th>
            <th className="px-5 py-3 text-center text-xs font-bold text-slate-600">Compétences</th>
            <th className="px-5 py-3 text-right text-xs font-bold text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.config.categories.map((cat, i) => {
            const count = data.comps.filter(c => c.categoryId === cat.id).length;
            return (
              <tr key={cat.id} style={{ borderBottom: '1px solid #f1f3f4' }}>
                <td className="px-5 py-3 text-slate-400 text-xs">{i + 1}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded" style={{ background: cat.color }} />
                    <span className="font-semibold text-slate-800">{cat.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-center">
                  <input
                    type="color"
                    value={cat.color}
                    onChange={e => dispatch({ type: 'UPDATE_CATEGORY', category: { ...cat, color: e.target.value } })}
                    className="h-7 w-9 cursor-pointer rounded border"
                    title="Changer la couleur"
                  />
                </td>
                <td className="px-5 py-3 text-center">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">{count}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(cat)} className="rounded px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 border">✏️ Renommer</button>
                    <button onClick={() => handleDelete(cat)} className="rounded px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200">🗑</button>
                  </div>
                </td>
              </tr>
            );
          })}
          {data.config.categories.length === 0 && (
            <tr><td colSpan={5} className="py-10 text-center text-slate-400 text-sm">Aucune catégorie.</td></tr>
          )}
        </tbody>
      </table>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 font-bold text-slate-800">
              {modal.mode === 'add' ? 'Ajouter une catégorie' : 'Modifier la catégorie'}
            </h3>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Nom *</label>
            <input
              className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="ex: Habilitations & Sécurité"
            />
            <label className="mb-2 block text-xs font-semibold text-slate-600">Couleur</label>
            <div className="mb-4 flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setForm(p => ({ ...p, color: c }))}
                  className="h-8 w-8 rounded-lg border-2 transition-transform hover:scale-110"
                  style={{ background: c, borderColor: form.color === c ? '#fff' : c, boxShadow: form.color === c ? `0 0 0 3px ${c}` : 'none' }}
                />
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-sm text-slate-500 hover:bg-slate-50">Annuler</button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim()}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: form.color }}
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
