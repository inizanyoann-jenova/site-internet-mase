// src/components/matrice/views/CollaborateursView.tsx
import { useState } from 'react';
import { useMatrice } from '../MatriceContext';
import type { Employee } from '../types';

type FormData = { name: string; role: string };
const EMPTY_FORM: FormData = { name: '', role: '' };

export function CollaborateursView() {
  const { data, dispatch } = useMatrice();
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; employee?: Employee } | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  function openAdd() {
    setForm(EMPTY_FORM);
    setModal({ mode: 'add' });
  }

  function openEdit(emp: Employee) {
    setForm({ name: emp.name, role: emp.role });
    setModal({ mode: 'edit', employee: emp });
  }

  function handleSave() {
    if (!form.name.trim() || !form.role.trim()) return;
    if (modal?.mode === 'add') {
      dispatch({ type: 'ADD_EMPLOYEE', employee: { name: form.name.trim(), role: form.role.trim(), isAbsent: false, absenceReason: '' } });
    } else if (modal?.employee) {
      dispatch({ type: 'UPDATE_EMPLOYEE', employee: { ...modal.employee, name: form.name.trim(), role: form.role.trim() } });
    }
    setModal(null);
  }

  function handleDelete(id: string) {
    if (!confirm('Supprimer ce collaborateur ? Cette action est irréversible.')) return;
    dispatch({ type: 'DELETE_EMPLOYEE', id });
  }

  return (
    <div className="rounded-lg bg-white shadow">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="font-bold text-slate-800">👥 Collaborateurs ({data.employees.length})</h2>
        <button
          onClick={openAdd}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: '#2563a8' }}
        >
          + Ajouter
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Nom</th>
            <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Rôle / Poste</th>
            <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Statut</th>
            <th className="px-5 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.employees.map(emp => (
            <tr key={emp.id} style={{ borderBottom: '1px solid #f1f3f4' }}>
              <td className="px-5 py-3 font-semibold text-slate-800">{emp.name}</td>
              <td className="px-5 py-3 text-slate-500 italic">{emp.role}</td>
              <td className="px-5 py-3">
                {emp.isAbsent
                  ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">Absent — {emp.absenceReason}</span>
                  : <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">Présent</span>}
              </td>
              <td className="px-5 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button onClick={() => openEdit(emp)} className="rounded px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 border">✏️ Modifier</button>
                  <button onClick={() => handleDelete(emp.id)} className="rounded px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200">🗑</button>
                </div>
              </td>
            </tr>
          ))}
          {data.employees.length === 0 && (
            <tr><td colSpan={4} className="py-10 text-center text-slate-400 text-sm">Aucun collaborateur. Cliquez sur "+ Ajouter".</td></tr>
          )}
        </tbody>
      </table>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 font-bold text-slate-800">
              {modal.mode === 'add' ? 'Ajouter un collaborateur' : 'Modifier le collaborateur'}
            </h3>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Nom complet *</label>
            <input
              className="mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Prénom Nom"
            />
            <label className="mb-1 block text-xs font-semibold text-slate-600">Rôle / Poste *</label>
            <input
              className="mb-5 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={form.role}
              onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              placeholder="ex: Chef de chantier"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-sm text-slate-500 hover:bg-slate-50">Annuler</button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || !form.role.trim()}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
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
