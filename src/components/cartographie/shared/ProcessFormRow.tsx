// src/components/cartographie/shared/ProcessFormRow.tsx
import type { ProcessDefinition } from '../../../types/cartographie';

interface Props {
  process: ProcessDefinition;
  onChange: (updated: ProcessDefinition) => void;
  onRemove: () => void;
  showInput?: boolean;
  showRole?: boolean;
  allProcesses?: ProcessDefinition[];
}

export default function ProcessFormRow({ process, onChange, onRemove, showInput, showRole, allProcesses }: Props) {
  const field = (key: keyof ProcessDefinition, value: string) =>
    onChange({ ...process, [key]: value });

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex items-start gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold text-gray-600">Nom du processus *</label>
          <input
            type="text"
            value={process.name}
            onChange={(e) => field('name', e.target.value)}
            placeholder="Ex: Gestion des chantiers"
            className="input-field"
          />
        </div>
        <button
          onClick={onRemove}
          className="mt-5 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
          title="Supprimer ce processus"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Pilote (prénom + nom)</label>
          <input
            type="text"
            value={process.pilotName}
            onChange={(e) => field('pilotName', e.target.value)}
            placeholder="Ex: Jean Dupont"
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Poste / Fonction</label>
          <input
            type="text"
            value={process.pilotRole}
            onChange={(e) => field('pilotRole', e.target.value)}
            placeholder="Ex: Chef de chantier"
            className="input-field"
          />
        </div>
      </div>

      {showRole && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Rôle en une phrase
            <span className="ml-1 font-normal text-gray-400">(optionnel)</span>
          </label>
          <input
            type="text"
            value={process.role ?? ''}
            onChange={(e) => field('role', e.target.value)}
            placeholder="Ex: Définir la stratégie et les objectifs SSE de l'entreprise"
            className="input-field"
          />
        </div>
      )}

      {showInput && (
        <>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Ce processus reçoit… <span className="font-normal text-gray-400">(élément entrant)</span>
            </label>
            <input
              type="text"
              value={process.inputElement ?? ''}
              onChange={(e) => field('inputElement', e.target.value)}
              placeholder="Ex: Devis accepté signé par le client"
              className="input-field"
            />
            <p className="mt-1 text-xs text-gray-400">
              💡 C'est le document ou l'info qui "déclenche" ce processus
            </p>
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Ce processus produit… <span className="font-normal text-gray-400">(élément sortant)</span>
            </label>
            <input
              type="text"
              value={process.outputElement ?? ''}
              onChange={(e) => field('outputElement', e.target.value)}
              placeholder="Ex: Plan de prévention + planning chantier"
              className="input-field"
            />
          </div>
          {allProcesses && allProcesses.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Ce processus vient après…
              </label>
              <select
                value={process.afterProcessId ?? ''}
                onChange={(e) => onChange({ ...process, afterProcessId: e.target.value || undefined })}
                className="input-field"
              >
                <option value="">— Premier processus (pas de prédécesseur) —</option>
                {allProcesses.filter((p) => p.id !== process.id).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
        </>
      )}
    </div>
  );
}
