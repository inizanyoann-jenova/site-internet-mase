interface Props {
  onNext: () => void;
  savedAnswers: Record<string, string> | null;
  onResume: () => void;
}

export default function Welcome({ onNext, savedAnswers, onResume }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--mase-heading)]">
          Bienvenue dans l'outil Politique SSE
        </h2>
        <p className="mt-2 text-[var(--mase-muted)]">
          Ce générateur guide l'entreprise à travers un diagnostic SSE, puis crée une politique
          personnalisée prête à télécharger en DOCX.
        </p>
      </div>

      <ul className="space-y-2 text-[var(--mase-text)]">
        <li>• Diagnostic SWOT + PESTEL SSE (~20 questions)</li>
        <li>• Calcul de la maturité et sélection de blocs conditionnels</li>
        <li>• Aperçu du document et export Word</li>
      </ul>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {savedAnswers && (
          <button
            type="button"
            onClick={onResume}
            className="rounded-full border border-[var(--mase-primary)] px-6 py-3 text-sm font-semibold text-[var(--mase-primary)] transition hover:bg-[var(--mase-primary-light)]/20"
          >
            Reprendre mon diagnostic
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          className="rounded-full bg-[var(--mase-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--mase-primary-dark)]"
        >
          Démarrer le diagnostic
        </button>
      </div>
    </div>
  );
}
