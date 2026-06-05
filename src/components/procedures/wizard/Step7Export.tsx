// src/components/procedures/wizard/Step7Export.tsx
import { useState } from 'react';
import type { WizardStepProps } from './ProcedureWizard';
import { generateAndDownloadProcedurePdf } from '../../../engine/procedures/renderProcedurePdf';
import { buildLogiSVG } from '../../../engine/procedures/buildLogiSVG';

export default function Step7Export({ state, onBack, onNext, isSaving }: WizardStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      await generateAndDownloadProcedurePdf({
        ...state,
        id: state.savedDocId,
        phaseCompleted: true,
      });
      setDownloaded(true);
    } catch (e) {
      console.error('Erreur génération PDF:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadSVG = () => {
    const { svgStr } = buildLogiSVG(state.steps, false);
    if (!svgStr) return;
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${state.reference || 'logigramme'}_logigramme.svg`;
    a.click();
  };

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm text-center">
      <div className="mb-4 text-5xl">🎉</div>
      <h2 className="mb-3 text-2xl font-bold text-gray-900">Procédure terminée !</h2>
      <p className="mb-8 text-gray-500 max-w-lg mx-auto">
        Votre procédure <strong>{state.title}</strong> est prête. Téléchargez le PDF 2 pages
        (document ISO + tableau des étapes) à remettre à l'auditeur MASE.
      </p>

      <div className="mb-8 flex flex-col gap-3 max-w-md mx-auto">
        <button
          onClick={handleDownloadPDF}
          disabled={isGenerating}
          className="flex items-center justify-center gap-3 rounded-xl py-4 text-base font-bold text-white disabled:opacity-60"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {isGenerating ? (
            <><span>⏳</span> Génération du PDF…</>
          ) : (
            <><span>📄</span> Télécharger la procédure PDF (2 pages)</>
          )}
        </button>

        <button
          onClick={handleDownloadSVG}
          disabled={state.steps.length === 0}
          className="flex items-center justify-center gap-3 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 hover:border-blue-300 hover:text-blue-600 disabled:opacity-40 transition"
        >
          <span>🔀</span> Télécharger le logigramme SVG seul
        </button>

        {downloaded && (
          <div className="rounded-xl bg-green-50 py-3 text-sm font-semibold text-green-700 border border-green-200">
            ✓ PDF téléchargé avec succès !
          </div>
        )}
      </div>

      <div className="rounded-2xl p-6 max-w-md mx-auto" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
        <div className="mb-2 text-base font-bold text-green-800">Et maintenant ?</div>
        <p className="text-sm text-green-700 mb-4">
          Cette procédure est sauvegardée dans votre espace. Vous pouvez la modifier et la réviser chaque année.
        </p>
        <button
          onClick={() => onNext()}
          disabled={isSaving}
          className="inline-block rounded-xl px-6 py-2.5 text-sm font-bold text-white"
          style={{ backgroundColor: '#16a34a' }}
        >
          Retour à mes procédures →
        </button>
      </div>

      <button onClick={onBack} className="mt-6 text-sm text-gray-400 underline hover:text-gray-600">
        ← Revenir à l'aperçu
      </button>
    </div>
  );
}
