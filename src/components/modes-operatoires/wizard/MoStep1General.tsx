import type { MoWizardStepProps } from './MoWizard';
import { MO_PREFIXES, OPERATION_TYPE_LABELS, OPERATION_TYPE_ICONS } from '../../../types/modesOperatoires';
import type { OperationType } from '../../../types/modesOperatoires';
import { MO_TEMPLATES } from '../../../engine/modesOperatoires/moTemplates';

const OPERATION_TYPES: OperationType[] = ['consignation', 'hauteur', 'confine', 'permis-feu', 'electrique-ht', 'levage', 'chimique', 'vrd'];

const HABILITATIONS_BY_TYPE: Record<OperationType, string[]> = {
  consignation: ['B2', 'BC', 'BR', 'B0', 'Habilitation mécanique niveau 2'],
  hauteur: ['Formation Travaux en hauteur', 'Harnais certifié', 'SST'],
  confine: ['CATEC', 'Surveillant de sécurité', 'SST'],
  'permis-feu': ['Opérateur points chauds', 'SST', 'Agent extincteur'],
  'electrique-ht': ['H1', 'H2', 'HC', 'HTB'],
  levage: ['CACES R484', 'CACES R490', 'Chef de manœuvre', 'Élingueur habilité'],
  chimique: ['Formation risque chimique', 'Formation ATEX', 'SST'],
  vrd: ['AIPR', 'CACES R482', 'Habilitation électrique B0/H0'],
};

export default function MoStep1General({ state, update, onNext, isSaving }: MoWizardStepProps) {
  const handleTypeSelect = (type: OperationType) => {
    const prefix = MO_PREFIXES[type];
    const ref = `${prefix}-001`;
    update({ operationType: type, reference: ref });
  };

  const handleLoadTemplate = (idx: number) => {
    const t = MO_TEMPLATES[idx];
    if (!t) return;
    update(t.mo);
  };

  const toggleHabilitation = (h: string) => {
    const current = state.habilitations ?? [];
    update({
      habilitations: current.includes(h)
        ? current.filter((x) => x !== h)
        : [...current, h],
    });
  };

  const valid = state.title.trim().length > 0 && state.operationType;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8">
      <h2 className="mb-6 text-xl font-black text-gray-900">Étape 1 — Informations générales</h2>

      {/* Templates rapides */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-semibold text-gray-600">Charger un template MASE</label>
        <div className="flex flex-wrap gap-2">
          {MO_TEMPLATES.map((t, i) => (
            <button
              key={t.operationType}
              onClick={() => handleLoadTemplate(i)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-orange-200 hover:bg-orange-50 transition"
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Titre */}
      <div className="mb-5">
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Titre du mode opératoire *</label>
        <input
          value={state.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Ex : Consignation électrique armoire HT bâtiment A"
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-300"
        />
      </div>

      {/* Type d'opération */}
      <div className="mb-5">
        <label className="mb-2 block text-sm font-semibold text-gray-700">Type d'opération *</label>
        <div className="grid grid-cols-4 gap-3">
          {OPERATION_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => handleTypeSelect(type)}
              className={`flex flex-col items-center rounded-xl border-2 p-3 text-center transition ${
                state.operationType === type
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-gray-100 bg-gray-50 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl mb-1">{OPERATION_TYPE_ICONS[type]}</span>
              <span className="text-xs font-medium text-gray-700 leading-tight">{OPERATION_TYPE_LABELS[type]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Référence + Version + Date */}
      <div className="mb-5 grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Référence</label>
          <input
            value={state.reference}
            onChange={(e) => update({ reference: e.target.value })}
            placeholder="MO-CONS-001"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-300"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Version</label>
          <input
            value={state.version}
            onChange={(e) => update({ version: e.target.value })}
            placeholder="V1.0"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-300"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Date</label>
          <input
            type="date"
            value={state.documentDate}
            onChange={(e) => update({ documentDate: e.target.value })}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-300"
          />
        </div>
      </div>

      {/* Habilitations */}
      {state.operationType && (
        <div className="mb-5">
          <label className="mb-2 block text-sm font-semibold text-gray-700">Habilitations requises</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {HABILITATIONS_BY_TYPE[state.operationType].map((h) => (
              <button
                key={h}
                onClick={() => toggleHabilitation(h)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  state.habilitations.includes(h)
                    ? 'bg-orange-100 border-orange-300 text-orange-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
          {state.habilitations.length > 0 && (
            <div className="text-xs text-gray-400">Sélectionnées : {state.habilitations.join(', ')}</div>
          )}
        </div>
      )}

      {/* Statut */}
      <div className="mb-8">
        <label className="mb-2 block text-sm font-semibold text-gray-700">Statut</label>
        <div className="flex gap-3">
          {(['brouillon', 'valide', 'archive'] as const).map((s) => (
            <button
              key={s}
              onClick={() => update({ status: s })}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition capitalize ${
                state.status === s
                  ? 'border-orange-400 bg-orange-50 text-orange-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {s === 'brouillon' ? 'Brouillon' : s === 'valide' ? 'Validé' : 'Archivé'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => onNext()}
          disabled={!valid || isSaving}
          className="rounded-2xl px-8 py-3 font-bold text-white shadow transition hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {isSaving ? 'Sauvegarde…' : 'Suivant →'}
        </button>
      </div>
    </div>
  );
}
