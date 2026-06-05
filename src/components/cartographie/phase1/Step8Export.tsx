// src/components/cartographie/phase1/Step8Export.tsx
import { useState } from 'react';
import type { StepProps } from './Phase1Wizard';
import { generateAndDownloadCartographyPdf } from '../../../engine/cartographie/renderCartographyPdf';

export default function Step8Export({ state, onBack }: StepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await generateAndDownloadCartographyPdf({
        processes: state.processes,
        companyName: state.companyName,
        sector: state.sector,
        headcount: state.headcount,
        sseManagerName: state.sseManagerName,
        sseManagerRole: state.sseManagerRole,
        documentDate: state.documentDate,
      });
      setDownloaded(true);
    } catch (e) {
      console.error('Erreur génération PDF:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm text-center">
      <div className="mb-4 text-5xl">🎉</div>
      <h2 className="mb-3 text-2xl font-bold text-gray-900">Phase 1 terminée !</h2>
      <p className="mb-8 text-gray-500">
        Votre cartographie des processus est prête. Téléchargez-la au format PDF,
        puis passez à la Phase 2 pour détailler chaque processus.
      </p>

      <div className="mb-8 flex flex-col gap-3">
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className="flex items-center justify-center gap-3 rounded-xl py-4 text-base font-bold text-white disabled:opacity-60"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {isGenerating ? (
            <><span>⏳</span> Génération du PDF…</>
          ) : (
            <><span>📄</span> Télécharger la cartographie PDF</>
          )}
        </button>

        {downloaded && (
          <div className="rounded-lg bg-green-50 py-3 text-sm font-semibold text-green-700">
            ✓ PDF téléchargé !
          </div>
        )}
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
        <div className="mb-3 text-lg font-bold text-green-800">Et maintenant ?</div>
        <p className="mb-4 text-sm text-green-700">
          La <strong>Phase 2</strong> vous permet de détailler chaque processus : pilote confirmé,
          objectif SMART, KPIs, risques, documents associés. Elle produit les <strong>fiches de processus</strong>
          qui complètent votre dossier MASE.
        </p>
        <a
          href="/cartographie/wizard"
          className="inline-block rounded-lg px-6 py-3 text-sm font-bold text-white"
          style={{ backgroundColor: '#16a34a' }}
        >
          Démarrer la Phase 2 →
        </a>
      </div>

      <button
        onClick={onBack}
        className="mt-6 text-sm text-gray-400 underline hover:text-gray-600"
      >
        ← Revenir à l'aperçu
      </button>
    </div>
  );
}
