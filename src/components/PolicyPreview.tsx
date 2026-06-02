import type { CompanyInfo, SelectedBlock } from '../engine/types';

interface Props {
  companyInfo: CompanyInfo;
  selectedBlocks: SelectedBlock[];
  isEnhanced: boolean;
  isEnhancing: boolean;
  enhanceError: string | null;
  onEnhance: () => void;
  onBack: () => void;
  onRestart: () => void;
  onDownload: () => void;
  onDownloadPdf: () => void;
}

const SECTION_TITLES: Record<string, string> = {
  preambule: 'Préambule',
  principes: 'Nos principes essentiels en matière de SSE',
  engagement_securite: 'Nos engagements — Sécurité',
  engagement_sante: 'Nos engagements — Santé',
  engagement_environnement: 'Nos engagements — Environnement',
  axes_prioritaires: 'Nos axes prioritaires',
  amelioration_continue: "Notre démarche d'amélioration continue",
  diffusion: 'Diffusion de la politique',
};

const fillVariables = (text: string, company: CompanyInfo) => {
  const fields: Record<string, string> = {
    name: company.name,
    sector: company.sector,
    headcount: company.headcount,
    activities: company.activities,
    employerName: company.employerName,
  };

  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => fields[key] ?? `{{${key}}}`);
};

export function PolicyPreview({ companyInfo, selectedBlocks, isEnhanced, isEnhancing, enhanceError, onEnhance, onBack, onRestart, onDownload, onDownloadPdf }: Props) {
  const grouped = selectedBlocks.reduce<Record<string, string[]>>((acc, block) => {
    acc[block.section] = acc[block.section] ?? [];
    acc[block.section].push(block.text);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-[var(--mase-card-strong)] p-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--mase-heading)]">Aperçu de la Politique SSE</h2>
            <p className="mt-2 text-[var(--mase-muted)]">
              Voici le contenu qui sera généré dans le document Word. Vérifiez les informations et téléchargez le DOCX.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="rounded-full bg-[var(--mase-surface)] px-4 py-2 text-sm font-medium text-[var(--mase-primary)] shadow-sm">
              {selectedBlocks.length} bloc(s) sélectionné(s)
            </div>
            {isEnhanced && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                Personnalisé par IA
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {Object.keys(grouped).map((sectionKey) => (
            <section key={sectionKey} className="rounded-3xl border border-[var(--mase-border)] bg-[var(--mase-surface)] p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-[var(--mase-heading)]">{SECTION_TITLES[sectionKey] ?? sectionKey}</h3>
              <div className="space-y-4 text-[var(--mase-text)]">
                {grouped[sectionKey].map((text, index) => {
                  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
                  const hasBullets = lines.some((line) => line.startsWith('- '));
                  return (
                    <div key={`${sectionKey}-${index}`} className="space-y-3">
                      {hasBullets ? (
                        <ul className="ml-5 list-disc space-y-2 text-slate-700">
                          {lines.map((line, lineIndex) => {
                            const content = fillVariables(line.startsWith('- ') ? line.slice(2) : line, companyInfo);
                            return (
                              <li key={`${sectionKey}-${index}-${lineIndex}`} className={line.startsWith('- ') ? '' : 'font-semibold text-slate-900'}>
                                {content}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        lines.map((line, lineIndex) => (
                          <p key={`${sectionKey}-${index}-${lineIndex}`} className="leading-7">
                            {fillVariables(line, companyInfo)}
                          </p>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {enhanceError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          Erreur lors de la personnalisation : {enhanceError}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center rounded-full border border-[var(--mase-border)] bg-[var(--mase-surface)] px-5 py-3 text-sm font-semibold text-[var(--mase-primary)] transition hover:bg-[var(--mase-primary-light)]/20"
        >
          Modifier les informations entreprise
        </button>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center justify-center rounded-full border border-[var(--mase-border)] bg-[var(--mase-surface)] px-5 py-3 text-sm font-semibold text-[var(--mase-primary)] transition hover:bg-[var(--mase-primary-light)]/20"
          >
            Recommencer
          </button>

          {!isEnhanced && (
            <button
              type="button"
              onClick={onEnhance}
              disabled={isEnhancing}
              className="inline-flex items-center justify-center rounded-full border border-[var(--mase-primary)] bg-[var(--mase-surface)] px-5 py-3 text-sm font-semibold text-[var(--mase-primary)] transition hover:bg-[var(--mase-primary-light)]/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isEnhancing ? 'Personnalisation en cours…' : 'Personnaliser avec Mistral AI'}
            </button>
          )}

          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center justify-center rounded-full bg-[var(--mase-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--mase-primary-dark)]"
          >
            Télécharger le DOCX
          </button>

          <button
            type="button"
            onClick={onDownloadPdf}
            className="inline-flex items-center justify-center rounded-full border border-[var(--mase-primary)] bg-[var(--mase-surface)] px-5 py-3 text-sm font-semibold text-[var(--mase-primary)] transition hover:bg-[var(--mase-primary-light)]/20"
          >
            Télécharger le PDF
          </button>
        </div>
      </div>
    </div>
  );
}
