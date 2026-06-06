import type { EpiItem } from '../../../types/modesOperatoires';

interface Props {
  epi: EpiItem;
  onChange: (updated: EpiItem) => void;
  onDelete: () => void;
}

export default function EpiChecklistRow({ epi, onChange, onDelete }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <button
        onClick={() => onChange({ ...epi, obligatoire: !epi.obligatoire })}
        className={`flex-shrink-0 h-5 w-5 rounded border-2 transition ${epi.obligatoire ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}
        title="Obligatoire"
      >
        {epi.obligatoire && (
          <svg viewBox="0 0 12 12" className="w-full h-full text-white">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      <input
        value={epi.designation}
        onChange={(e) => onChange({ ...epi, designation: e.target.value })}
        placeholder="Désignation EPI"
        className="flex-1 bg-transparent text-sm font-medium text-gray-800 placeholder-gray-300 outline-none"
      />

      <input
        value={epi.norme ?? ''}
        onChange={(e) => onChange({ ...epi, norme: e.target.value || undefined })}
        placeholder="Norme (ex: EN 397)"
        className="w-32 bg-transparent text-xs text-gray-400 placeholder-gray-300 outline-none"
      />

      <span className="text-xs text-gray-400 flex-shrink-0">
        {epi.obligatoire ? 'Obligatoire' : 'Recommandé'}
      </span>

      <button
        onClick={onDelete}
        className="flex-shrink-0 text-gray-300 hover:text-red-400 transition"
        title="Supprimer"
      >
        ×
      </button>
    </div>
  );
}
