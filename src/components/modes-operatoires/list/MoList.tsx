import type { Session } from '@supabase/supabase-js';
import type { ModeOperatoire } from '../../../types/modesOperatoires';
import { OPERATION_TYPE_LABELS, OPERATION_TYPE_ICONS } from '../../../types/modesOperatoires';

interface Props {
  docs: ModeOperatoire[];
  isLoading: boolean;
  session: Session;
  onNew: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}

function statusBadge(status: ModeOperatoire['status']) {
  const map = {
    brouillon: { label: 'Brouillon', bg: 'bg-yellow-100', text: 'text-yellow-700' },
    valide: { label: 'Validé', bg: 'bg-green-100', text: 'text-green-700' },
    archive: { label: 'Archivé', bg: 'bg-gray-100', text: 'text-gray-500' },
  };
  const s = map[status] ?? map.brouillon;
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>{s.label}</span>;
}

export default function MoList({ docs, isLoading, session: _session, onNew, onEdit, onDelete }: Props) {
  const handleDelete = async (mo: ModeOperatoire) => {
    if (!mo.id) return;
    if (!confirm(`Supprimer "${mo.title}" ?`)) return;
    await onDelete(mo.id);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <a href="/" className="text-sm text-gray-400 hover:text-gray-600">← Accueil</a>
            <h1 className="mt-1 text-2xl font-black text-gray-900">Mes Modes Opératoires</h1>
          </div>
          <button
            onClick={onNew}
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow"
            style={{ backgroundColor: 'var(--mase-primary)' }}
          >
            + Nouveau mode opératoire
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-gray-400">Chargement…</div>
        )}

        {!isLoading && docs.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
            <div className="mb-3 text-4xl">📋</div>
            <div className="mb-1 font-semibold text-gray-700">Aucun mode opératoire</div>
            <p className="text-sm text-gray-400 mb-6">Créez votre premier mode opératoire ou chargez un template MASE.</p>
            <button
              onClick={onNew}
              className="rounded-xl px-6 py-2.5 text-sm font-bold text-white"
              style={{ backgroundColor: 'var(--mase-primary)' }}
            >
              Créer mon premier mode opératoire
            </button>
          </div>
        )}

        {!isLoading && docs.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">Titre / Référence</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">Version</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">Statut</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">Modifié</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((mo) => (
                  <tr key={mo.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <span className="text-2xl">{OPERATION_TYPE_ICONS[mo.operationType] ?? '📋'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{mo.title}</div>
                      <div className="text-xs text-gray-400">{mo.reference} · {OPERATION_TYPE_LABELS[mo.operationType]}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{mo.version}</td>
                    <td className="px-4 py-3">{statusBadge(mo.status)}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {mo.updatedAt ? new Date(mo.updatedAt).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => mo.id && onEdit(mo.id)}
                        className="mr-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: 'var(--mase-primary)' }}
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(mo)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-100 hover:bg-red-50"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
