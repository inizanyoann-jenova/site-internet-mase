// src/components/cartographie/phase1/Step1Company.tsx
import React from 'react';
import type { StepProps } from './Phase1Wizard';

export default function Step1Company({ state, update, onNext, isSaving }: StepProps) {
  const canNext = state.companyName.trim() && state.sector.trim() && state.sseManagerName.trim();

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-xl font-bold text-gray-900">Votre entreprise</h2>
      <p className="mb-6 text-sm text-gray-500">
        Ces informations apparaîtront sur vos documents MASE.
      </p>

      <div className="flex flex-col gap-5">
        <Field label="Nom de l'entreprise *" required>
          <input
            type="text"
            value={state.companyName}
            onChange={(e) => update({ companyName: e.target.value })}
            placeholder="Ex: Dupont TP SARL"
            className="input-field"
          />
        </Field>

        <Field label="Secteur d'activité principal *" required>
          <input
            type="text"
            value={state.sector}
            onChange={(e) => update({ sector: e.target.value })}
            placeholder="Ex: BTP — Terrassement et travaux publics"
            className="input-field"
          />
        </Field>

        <Field label="Ville / Région">
          <input
            type="text"
            value={state.city}
            onChange={(e) => update({ city: e.target.value })}
            placeholder="Ex: Lyon (69)"
            className="input-field"
          />
          <p className="mt-1 text-xs text-gray-400">
            Utilisée par l'IA pour rechercher votre entreprise en ligne.
          </p>
        </Field>

        <Field label="Effectif (nombre de salariés)">
          <input
            type="number"
            min={0}
            value={state.headcount || ''}
            onChange={(e) => update({ headcount: parseInt(e.target.value) || 0 })}
            placeholder="Ex: 25"
            className="input-field"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Nom du responsable SSE / Qualité *" required>
            <input
              type="text"
              value={state.sseManagerName}
              onChange={(e) => update({ sseManagerName: e.target.value })}
              placeholder="Ex: Marie Martin"
              className="input-field"
            />
          </Field>
          <Field label="Poste / Fonction *" required>
            <input
              type="text"
              value={state.sseManagerRole}
              onChange={(e) => update({ sseManagerRole: e.target.value })}
              placeholder="Ex: Responsable SSE"
              className="input-field"
            />
          </Field>
        </div>

        <Field label="Date du document">
          <input
            type="date"
            value={state.documentDate}
            onChange={(e) => update({ documentDate: e.target.value })}
            className="input-field"
          />
        </Field>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={() => onNext()}
          disabled={!canNext || isSaving}
          className="rounded-lg px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {isSaving ? 'Sauvegarde…' : 'Étape suivante →'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children, required }: {
  label: string; children: React.ReactNode; required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-700">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}
