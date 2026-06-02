import type { ChangeEvent } from 'react';
import type { CompanyInfo } from '../engine/types';

interface Props {
  companyInfo: CompanyInfo;
  setCompanyInfo: (companyInfo: CompanyInfo) => void;
  onBack: () => void;
  onNext: () => void;
}

export function CompanyInfoForm({ companyInfo, setCompanyInfo, onBack, onNext }: Props) {
  const handleChange = (field: keyof CompanyInfo, value: string) => {
    setCompanyInfo({ ...companyInfo, [field]: value });
  };

  const isComplete = Object.values(companyInfo).every((value) => value.trim().length > 0);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-[var(--mase-card-strong)] p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-[var(--mase-heading)]">Informations de l'entreprise</h2>
        <p className="mt-3 text-[var(--mase-muted)]">
          Ces informations seront injectées dans votre document Politique SSE.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-700">
            <span>Nom de l'entreprise</span>
            <input
              placeholder="Ex : MASE Entreprise"
              value={companyInfo.name}
              onChange={(event: ChangeEvent<HTMLInputElement>) => handleChange('name', event.target.value)}
              className="w-full rounded-2xl border border-[var(--mase-border)] bg-[var(--mase-surface)] px-4 py-3 text-[var(--mase-text)] outline-none transition focus:border-[var(--mase-primary)]"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>Secteur d'activité</span>
            <input
              placeholder="Ex : Construction industrielle"
              value={companyInfo.sector}
              onChange={(event: ChangeEvent<HTMLInputElement>) => handleChange('sector', event.target.value)}
              className="w-full rounded-2xl border border-[var(--mase-border)] bg-[var(--mase-surface)] px-4 py-3 text-[var(--mase-text)] outline-none transition focus:border-[var(--mase-primary)]"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>Effectif</span>
            <input
              placeholder="Ex : 120"
              value={companyInfo.headcount}
              onChange={(event: ChangeEvent<HTMLInputElement>) => handleChange('headcount', event.target.value)}
              className="w-full rounded-2xl border border-[var(--mase-border)] bg-[var(--mase-surface)] px-4 py-3 text-[var(--mase-text)] outline-none transition focus:border-[var(--mase-primary)]"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>Principales activités</span>
            <input
              placeholder="Ex : Travaux de maintenance et logistique"
              value={companyInfo.activities}
              onChange={(event: ChangeEvent<HTMLInputElement>) => handleChange('activities', event.target.value)}
              className="w-full rounded-2xl border border-[var(--mase-border)] bg-[var(--mase-surface)] px-4 py-3 text-[var(--mase-text)] outline-none transition focus:border-[var(--mase-primary)]"
            />
          </label>
          <label className="sm:col-span-2 space-y-2 text-sm text-slate-700">
            <span>Nom de l'employeur / signataire</span>
            <input
              placeholder="Ex : Jean Dupont"
              value={companyInfo.employerName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => handleChange('employerName', event.target.value)}
              className="w-full rounded-2xl border border-[var(--mase-border)] bg-[var(--mase-surface)] px-4 py-3 text-[var(--mase-text)] outline-none transition focus:border-[var(--mase-primary)]"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center rounded-full border border-[var(--mase-border)] bg-[var(--mase-surface)] px-5 py-3 text-sm font-semibold text-[var(--mase-primary)] transition hover:bg-[var(--mase-primary-light)]/20"
        >
          Retour au questionnaire
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!isComplete}
          className="inline-flex items-center justify-center rounded-full bg-[var(--mase-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--mase-primary-dark)] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Voir l'aperçu
        </button>
      </div>
    </div>
  );
}
