// src/components/cartographie/phase1/Step2AIGeneration.tsx
import { useState } from 'react';
import type { StepProps } from './Phase1Wizard';
import type { ProcessDefinition } from '../../../types/cartographie';

export const SECTOR_TEMPLATES: Record<string, ProcessDefinition[]> = {
  generique: [
    { id: 'p1', type: 'pilotage', name: 'Direction générale', pilotName: '(à compléter)', pilotRole: 'Dirigeant', role: 'Définir la stratégie et les objectifs' },
    { id: 'p2', type: 'pilotage', name: 'Amélioration continue', pilotName: '(à compléter)', pilotRole: 'Responsable qualité', role: 'Gérer les non-conformités et actions correctives' },
    { id: 'p3', type: 'realisation', name: 'Prise en charge de la demande', pilotName: '(à compléter)', pilotRole: 'Responsable commercial', inputElement: 'Demande client', outputElement: 'Commande confirmée' },
    { id: 'p4', type: 'realisation', name: 'Réalisation de la prestation', pilotName: '(à compléter)', pilotRole: 'Responsable opérationnel', inputElement: 'Commande confirmée', outputElement: 'Prestation réalisée', afterProcessId: 'p3' },
    { id: 'p5', type: 'realisation', name: 'Livraison et clôture', pilotName: '(à compléter)', pilotRole: 'Responsable opérationnel', inputElement: 'Prestation réalisée', outputElement: 'Livrable validé client', afterProcessId: 'p4' },
    { id: 'p6', type: 'support', name: 'Ressources Humaines', pilotName: '(à compléter)', pilotRole: 'RRH', linkedRealisationIds: ['p4'] },
    { id: 'p7', type: 'support', name: 'Moyens et équipements', pilotName: '(à compléter)', pilotRole: 'Responsable matériel', linkedRealisationIds: ['p4'] },
    { id: 'p8', type: 'support', name: 'SSE et prévention', pilotName: '(à compléter)', pilotRole: 'Responsable SSE', linkedRealisationIds: ['p3', 'p4', 'p5'] },
  ],
  btp: [
    { id: 'p1', type: 'pilotage', name: 'Direction générale', pilotName: '(à compléter)', pilotRole: 'Dirigeant', role: "Définir la stratégie et les objectifs de l'entreprise" },
    { id: 'p2', type: 'pilotage', name: 'Amélioration continue', pilotName: '(à compléter)', pilotRole: 'Responsable SSE', role: 'Piloter les actions correctives et préventives' },
    { id: 'p3', type: 'realisation', name: "Réponse aux appels d'offre", pilotName: '(à compléter)', pilotRole: 'Chef de projet', inputElement: "Appel d'offre client", outputElement: 'Devis / offre de prix' },
    { id: 'p4', type: 'realisation', name: 'Préparation chantier', pilotName: '(à compléter)', pilotRole: 'Chef de chantier', inputElement: 'Devis accepté', outputElement: 'Plan de prévention + planning', afterProcessId: 'p3' },
    { id: 'p5', type: 'realisation', name: 'Exécution des travaux', pilotName: '(à compléter)', pilotRole: 'Chef de chantier', inputElement: 'Plan de prévention', outputElement: 'Travaux réalisés + PV', afterProcessId: 'p4' },
    { id: 'p6', type: 'realisation', name: 'Réception et clôture', pilotName: '(à compléter)', pilotRole: 'Chef de projet', inputElement: 'Travaux réalisés', outputElement: 'PV de réception signé', afterProcessId: 'p5' },
    { id: 'p7', type: 'support', name: 'Ressources Humaines', pilotName: '(à compléter)', pilotRole: 'RRH', linkedRealisationIds: ['p4', 'p5'] },
    { id: 'p8', type: 'support', name: 'Matériel et équipements', pilotName: '(à compléter)', pilotRole: 'Responsable matériel', linkedRealisationIds: ['p5'] },
    { id: 'p9', type: 'support', name: 'SSE et prévention', pilotName: '(à compléter)', pilotRole: 'Responsable SSE', linkedRealisationIds: ['p3', 'p4', 'p5'] },
    { id: 'p10', type: 'support', name: 'Achats et fournisseurs', pilotName: '(à compléter)', pilotRole: 'Acheteur', linkedRealisationIds: ['p4', 'p5'] },
  ],
  maintenance: [
    { id: 'p1', type: 'pilotage', name: 'Direction générale', pilotName: '(à compléter)', pilotRole: 'Dirigeant', role: 'Définir la stratégie et les objectifs' },
    { id: 'p2', type: 'pilotage', name: 'Amélioration continue', pilotName: '(à compléter)', pilotRole: 'Responsable qualité', role: 'Gérer les non-conformités et actions correctives' },
    { id: 'p3', type: 'realisation', name: 'Prise en charge demande', pilotName: '(à compléter)', pilotRole: 'Responsable planning', inputElement: "Demande d'intervention", outputElement: "Bon d'intervention créé" },
    { id: 'p4', type: 'realisation', name: 'Diagnostic et préparation', pilotName: '(à compléter)', pilotRole: 'Technicien senior', inputElement: "Bon d'intervention", outputElement: 'Diagnostic + matériel préparé', afterProcessId: 'p3' },
    { id: 'p5', type: 'realisation', name: 'Réalisation de la maintenance', pilotName: '(à compléter)', pilotRole: 'Technicien', inputElement: 'Diagnostic validé', outputElement: 'Intervention terminée', afterProcessId: 'p4' },
    { id: 'p6', type: 'realisation', name: 'Contrôle et validation', pilotName: '(à compléter)', pilotRole: "Chef d'équipe", inputElement: 'Intervention réalisée', outputElement: "Rapport d'intervention signé", afterProcessId: 'p5' },
    { id: 'p7', type: 'support', name: 'Ressources Humaines', pilotName: '(à compléter)', pilotRole: 'RRH', linkedRealisationIds: ['p4', 'p5'] },
    { id: 'p8', type: 'support', name: 'Outillage et pièces', pilotName: '(à compléter)', pilotRole: 'Magasinier', linkedRealisationIds: ['p4', 'p5'] },
    { id: 'p9', type: 'support', name: 'SSE et habilitations', pilotName: '(à compléter)', pilotRole: 'Responsable SSE', linkedRealisationIds: ['p3', 'p4', 'p5'] },
  ],
  electricite: [
    { id: 'p1', type: 'pilotage', name: 'Direction générale', pilotName: '(à compléter)', pilotRole: 'Dirigeant', role: 'Définir la stratégie et les objectifs de l\'entreprise' },
    { id: 'p2', type: 'pilotage', name: 'Amélioration continue', pilotName: '(à compléter)', pilotRole: 'Responsable QSE', role: 'Piloter les actions correctives et la démarche MASE' },
    { id: 'p3', type: 'realisation', name: 'Étude et chiffrage', pilotName: '(à compléter)', pilotRole: 'Chargé d\'affaires', inputElement: 'Appel d\'offre / Demande client', outputElement: 'Devis accepté' },
    { id: 'p4', type: 'realisation', name: 'Préparation chantier électrique', pilotName: '(à compléter)', pilotRole: 'Chef de chantier', inputElement: 'Devis accepté', outputElement: 'Plan d\'installation + DICT + PDP', afterProcessId: 'p3' },
    { id: 'p5', type: 'realisation', name: 'Exécution des travaux CFO/CFA', pilotName: '(à compléter)', pilotRole: 'Chef de chantier', inputElement: 'Plan validé + habilitations', outputElement: 'Installation réalisée', afterProcessId: 'p4' },
    { id: 'p6', type: 'realisation', name: 'Mise en service et réception', pilotName: '(à compléter)', pilotRole: 'Chargé d\'affaires', inputElement: 'Installation réalisée', outputElement: 'PV de réception signé', afterProcessId: 'p5' },
    { id: 'p7', type: 'support', name: 'Ressources Humaines', pilotName: '(à compléter)', pilotRole: 'RRH', linkedRealisationIds: ['p4', 'p5'] },
    { id: 'p8', type: 'support', name: 'Matériel et outillage', pilotName: '(à compléter)', pilotRole: 'Responsable matériel', linkedRealisationIds: ['p5'] },
    { id: 'p9', type: 'support', name: 'SSE et habilitations électriques', pilotName: '(à compléter)', pilotRole: 'Responsable SSE', linkedRealisationIds: ['p3', 'p4', 'p5'] },
    { id: 'p10', type: 'support', name: 'Achats et fournisseurs', pilotName: '(à compléter)', pilotRole: 'Acheteur', linkedRealisationIds: ['p4', 'p5'] },
  ],
};

export function getSectorTemplate(sector: string): ProcessDefinition[] {
  const lower = sector.toLowerCase();
  if (
    lower.includes('électricité') || lower.includes('electricit') ||
    lower.includes('courant fort') || lower.includes('courant faible') ||
    lower.includes('génie électrique') || lower.includes('genie electrique') ||
    lower.includes('cfo') || lower.includes('cfa')
  ) {
    return SECTOR_TEMPLATES.electricite;
  }
  if (lower.includes('btp') || lower.includes('chantier') || lower.includes('construction') || lower.includes('travaux')) {
    return SECTOR_TEMPLATES.btp;
  }
  if (lower.includes('maintenance') || lower.includes('entretien')) {
    return SECTOR_TEMPLATES.maintenance;
  }
  return SECTOR_TEMPLATES.generique;
}

export default function Step2AIGeneration({ state, update, onNext, onBack, isSaving, cartographie }: StepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    setAiError(null);
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 75_000),
      );
      const result = await Promise.race([
        cartographie.callGenerateProcessMap({
          companyName: state.companyName,
          sector: state.sector,
          city: state.city,
        }),
        timeout,
      ]);
      update({
        processes: result.processes.length > 0 ? result.processes : getSectorTemplate(state.sector),
        aiSource: result.source,
        aiSourceSummary: result.sourceSummary,
      });
      setGenerated(true);
    } catch {
      setAiError('La génération IA a échoué ou a expiré. Utilisation du modèle secteur.');
      update({ processes: getSectorTemplate(state.sector), aiSource: 'sector_model' });
      setGenerated(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseSectorModel = () => {
    update({ processes: getSectorTemplate(state.sector), aiSource: 'sector_model' });
    setGenerated(true);
  };

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-xl font-bold text-gray-900">
        Génération de votre cartographie
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        L'IA va chercher des infos sur <strong>{state.companyName}</strong> et créer
        un premier jet de cartographie que vous pourrez modifier ensuite.
      </p>

      {!generated && (
        <div className="flex flex-col gap-4">
          <button
            onClick={handleGenerateAI}
            disabled={isGenerating}
            className="flex items-center justify-center gap-3 rounded-xl border-2 p-5 text-left transition hover:shadow-md disabled:opacity-60"
            style={{ borderColor: 'var(--mase-primary)' }}
          >
            {isGenerating ? (
              <>
                <span className="text-2xl">⏳</span>
                <div>
                  <div className="font-bold" style={{ color: 'var(--mase-primary)' }}>
                    Recherche en cours…
                  </div>
                  <div className="text-sm text-gray-500">
                    L'IA cherche des infos sur {state.companyName} et génère votre cartographie (30–60 sec)
                  </div>
                </div>
              </>
            ) : (
              <>
                <span className="text-2xl">✨</span>
                <div>
                  <div className="font-bold" style={{ color: 'var(--mase-primary)' }}>
                    Rechercher {state.companyName} et générer avec l'IA
                  </div>
                  <div className="text-sm text-gray-500">
                    L'IA recherche votre entreprise en ligne et crée un premier jet personnalisé
                  </div>
                </div>
              </>
            )}
          </button>

          {!isGenerating && (
            <button
              onClick={handleUseSectorModel}
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-5 text-left transition hover:bg-gray-50"
            >
              <span className="text-2xl">📋</span>
              <div>
                <div className="font-bold text-gray-700">Utiliser un modèle type {state.sector}</div>
                <div className="text-sm text-gray-500">
                  Partir d'une cartographie pré-remplie pour votre secteur, sans recherche internet
                </div>
              </div>
            </button>
          )}
        </div>
      )}

      {generated && (
        <div>
          {state.aiSource === 'web_search' && state.aiSourceSummary && (
            <div className="mb-4 rounded-lg p-4" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <div className="mb-1 text-xs font-bold text-green-700">✓ Entreprise trouvée en ligne</div>
              <div className="text-sm text-green-900">{state.aiSourceSummary}</div>
            </div>
          )}
          {aiError && (
            <div className="mb-4 rounded-lg bg-yellow-50 p-4" style={{ border: '1px solid #fde68a' }}>
              <div className="text-sm text-yellow-800">{aiError}</div>
            </div>
          )}
          <div className="rounded-lg bg-gray-50 p-4" style={{ border: '1px solid #e5e7eb' }}>
            <div className="mb-3 text-sm font-semibold text-gray-700">
              {state.processes.length} processus générés :
            </div>
            <div className="flex flex-col gap-1">
              {state.processes.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <span className={
                    p.type === 'pilotage' ? 'text-blue-600' :
                    p.type === 'realisation' ? 'text-green-600' : 'text-yellow-600'
                  }>
                    {p.type === 'pilotage' ? '🔵' : p.type === 'realisation' ? '🟢' : '🟡'}
                  </span>
                  <span className="text-gray-700">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Vous pourrez modifier chaque processus dans les étapes suivantes.
          </p>
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">
          ← Retour
        </button>
        <button
          onClick={() => onNext()}
          disabled={!generated || isSaving}
          className="rounded-lg px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {isSaving ? 'Sauvegarde…' : 'Continuer →'}
        </button>
      </div>
    </div>
  );
}
