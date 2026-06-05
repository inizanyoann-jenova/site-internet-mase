// src/components/procedures/list/ProcedureList.tsx
import type { ProcedureDoc } from '../../../types/procedures';

interface Props {
  docs: ProcedureDoc[];
  isLoading: boolean;
  onNew: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onExportJSON: () => void;
  session: { user: { email: string } };
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  brouillon: { label: '🟡 Brouillon', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  valide:    { label: '🟢 Validé',    cls: 'bg-green-50 text-green-800 border-green-200' },
  archive:   { label: '🔘 Archivé',   cls: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export default function ProcedureList({ docs, isLoading, onNew, onEdit, onDelete, onExportJSON, session }: Props) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f3' }}>
      <nav className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: 'var(--mase-primary)' }}>
        <a href="/" className="text-lg font-bold text-white">MASE</a>
        <span className="text-sm text-white/70">{session.user.email}</span>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes Procédures</h1>
            <p className="mt-1 text-sm text-gray-500">{docs.length} procédure{docs.length > 1 ? 's' : ''} sauvegardée{docs.length > 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onExportJSON} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:border-gray-300 transition">
              ⬇ Export JSON
            </button>
            <button onClick={onNew} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-90 transition" style={{ backgroundColor: 'var(--mase-primary)' }}>
              + Nouvelle procédure
            </button>
          </div>
        </div>

        {isLoading && <div className="flex justify-center py-12 text-gray-400">Chargement…</div>}

        {!isLoading && docs.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
            <div className="mb-4 text-5xl">📋</div>
            <h3 className="mb-2 text-lg font-bold text-gray-700">Aucune procédure</h3>
            <p className="mb-6 text-sm text-gray-400">Créez votre première procédure MASE en quelques minutes.</p>
            <button onClick={onNew} className="rounded-xl px-6 py-3 text-sm font-bold text-white" style={{ backgroundColor: 'var(--mase-primary)' }}>
              Créer ma première procédure →
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {docs.map((doc) => {
            const st = statusConfig[doc.status] ?? statusConfig.brouillon;
            return (
              <div key={doc.id} className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm hover:shadow-md transition cursor-pointer" onClick={() => onEdit(doc.id!)}>
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="truncate text-sm font-bold text-gray-900">{doc.title}</span>
                    <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="font-mono font-semibold text-gray-500">{doc.reference}</span>
                    {doc.processParent && <span>· {doc.processParent}</span>}
                    {doc.version && <span>· {doc.version}</span>}
                    {doc.updatedAt && <span>· {new Date(doc.updatedAt).toLocaleDateString('fr-FR')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={(e) => { e.stopPropagation(); onEdit(doc.id!); }}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-blue-300 hover:text-blue-600">
                    ✏️ Modifier
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Supprimer cette procédure ?')) onDelete(doc.id!); }}
                    className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-400 hover:border-red-300 hover:text-red-600">
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
