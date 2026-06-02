import type { Question } from './types';

/**
 * Diagnostic SSE — 20 questions fermées (SWOT 8 + PESTEL 12).
 *
 * Contenu (≠ logique). Chaque question est scorée 0 (situation à risque)
 * à 3 (maîtrisé). Le quadrant `swot` détermine l'exploitation :
 * - `faiblesse` / `menace` mal notées → axes prioritaires explicites.
 * - `force` / `opportunite` → orientent le ton (mature vs structuration).
 *
 * Toutes les questions ont 4 choix réguliers (0/1/2/3) pour un mapping lisible.
 */
export const QUESTIONS: Question[] = [
  // ─────────────────────────── SWOT (8) ───────────────────────────
  {
    id: 'swot_direction',
    volet: 'swot',
    swot: 'force',
    theme: 'gouvernance',
    domain: 'securite',
    label:
      "Implication de la direction dans la santé-sécurité-environnement (SSE)",
    choices: [
      { value: '0', label: "La SSE n'est pas portée par la direction", score: 0 },
      { value: '1', label: 'La direction soutient ponctuellement les actions SSE', score: 1 },
      { value: '2', label: 'La direction fixe des objectifs SSE et les suit', score: 2 },
      { value: '3', label: 'La SSE est un axe stratégique piloté par la direction', score: 3 },
    ],
  },
  {
    id: 'swot_equipements',
    volet: 'swot',
    swot: 'force',
    theme: 'equipements',
    domain: 'securite',
    label: "État et conformité des équipements et moyens de travail",
    choices: [
      { value: '0', label: 'Équipements vieillissants, conformité non vérifiée', score: 0 },
      { value: '1', label: 'Vérifications faites de façon irrégulière', score: 1 },
      { value: '2', label: 'Vérifications périodiques planifiées et tracées', score: 2 },
      { value: '3', label: 'Parc maîtrisé, conforme et renouvelé régulièrement', score: 3 },
    ],
  },
  {
    id: 'swot_formation',
    volet: 'swot',
    swot: 'faiblesse',
    theme: 'formation',
    domain: 'securite',
    label: "Formation et habilitation du personnel aux risques de leur poste",
    choices: [
      { value: '0', label: 'Pas de formation SSE structurée', score: 0 },
      { value: '1', label: 'Formations réalisées au cas par cas', score: 1 },
      { value: '2', label: 'Plan de formation SSE suivi pour les postes à risque', score: 2 },
      { value: '3', label: 'Formations et habilitations gérées et tenues à jour pour tous', score: 3 },
    ],
  },
  {
    id: 'swot_sante',
    volet: 'swot',
    swot: 'faiblesse',
    theme: 'penibilite',
    domain: 'sante',
    label: "Prévention des risques pour la santé (pénibilité, TMS, expositions)",
    choices: [
      { value: '0', label: 'Risques santé non évalués', score: 0 },
      { value: '1', label: 'Quelques mesures isolées sans suivi', score: 1 },
      { value: '2', label: 'Risques santé évalués et mesures de prévention en place', score: 2 },
      { value: '3', label: 'Démarche santé au travail structurée et suivie dans le temps', score: 3 },
    ],
  },
  {
    id: 'swot_demarche',
    volet: 'swot',
    swot: 'opportunite',
    theme: 'gouvernance',
    domain: 'securite',
    label: "Dynamique d'amélioration et démarche de certification en cours",
    choices: [
      { value: '0', label: "Aucune démarche d'amélioration engagée", score: 0 },
      { value: '1', label: "Volonté affichée mais pas encore d'actions", score: 1 },
      { value: '2', label: "Démarche d'amélioration continue amorcée", score: 2 },
      { value: '3', label: 'Démarche structurée (MASE / ISO 45001) activement pilotée', score: 3 },
    ],
  },
  {
    id: 'swot_environnement',
    volet: 'swot',
    swot: 'opportunite',
    theme: 'impact_environnemental',
    domain: 'environnement',
    label: "Maîtrise et réduction des impacts environnementaux de l'activité",
    choices: [
      { value: '0', label: 'Impacts environnementaux non identifiés', score: 0 },
      { value: '1', label: 'Quelques actions ponctuelles (tri, économies)', score: 1 },
      { value: '2', label: 'Impacts identifiés avec un plan de réduction', score: 2 },
      { value: '3', label: 'Performance environnementale suivie et améliorée', score: 3 },
    ],
  },
  {
    id: 'swot_soustraitance',
    volet: 'swot',
    swot: 'menace',
    theme: 'sous_traitance',
    domain: 'securite',
    label: "Maîtrise de la coactivité et des sous-traitants sur site",
    choices: [
      { value: '0', label: "Aucun cadre SSE pour les intervenants extérieurs", score: 0 },
      { value: '1', label: 'Exigences SSE informelles, non vérifiées', score: 1 },
      { value: '2', label: 'Plan de prévention et accueil sécurité systématiques', score: 2 },
      { value: '3', label: 'Sélection, suivi et évaluation SSE des sous-traitants', score: 3 },
    ],
  },
  {
    id: 'swot_interim',
    volet: 'swot',
    swot: 'menace',
    theme: 'interim',
    domain: 'securite',
    label: "Recours à l'intérim et accueil sécurité des personnels temporaires",
    choices: [
      { value: '0', label: 'Intérimaires affectés sans accueil sécurité dédié', score: 0 },
      { value: '1', label: 'Accueil minimal, variable selon les situations', score: 1 },
      { value: '2', label: 'Accueil sécurité et suivi systématiques des intérimaires', score: 2 },
      { value: '3', label: "Recours à l'intérim limité et strictement encadré en SSE", score: 3 },
    ],
  },

  // ─────────────────────────── PESTEL (12) ───────────────────────────
  // P — Politique / réglementaire
  {
    id: 'pestel_veille',
    volet: 'pestel',
    swot: 'faiblesse',
    theme: 'reglementation',
    domain: 'securite',
    label: "Veille réglementaire SSE et mise à jour des obligations",
    choices: [
      { value: '0', label: 'Pas de veille réglementaire organisée', score: 0 },
      { value: '1', label: 'Veille informelle, sans traçabilité', score: 1 },
      { value: '2', label: 'Veille réglementaire formalisée et périodique', score: 2 },
      { value: '3', label: 'Veille structurée avec évaluation de conformité tracée', score: 3 },
    ],
  },
  {
    id: 'pestel_politique',
    volet: 'pestel',
    swot: 'force',
    theme: 'gouvernance',
    domain: 'securite',
    label: "Existence d'une politique SSE formalisée et diffusée",
    choices: [
      { value: '0', label: 'Aucune politique SSE écrite', score: 0 },
      { value: '1', label: 'Intentions SSE évoquées mais non formalisées', score: 1 },
      { value: '2', label: 'Politique SSE écrite mais peu diffusée', score: 2 },
      { value: '3', label: 'Politique SSE écrite, signée et diffusée à tous', score: 3 },
    ],
  },
  // E — Économique
  {
    id: 'pestel_budget',
    volet: 'pestel',
    swot: 'menace',
    theme: 'equipements',
    domain: 'securite',
    label: "Moyens budgétaires alloués à la prévention SSE",
    choices: [
      { value: '0', label: 'Aucun budget dédié à la prévention', score: 0 },
      { value: '1', label: 'Dépenses SSE uniquement subies (réparation, sanction)', score: 1 },
      { value: '2', label: 'Budget prévention identifié chaque année', score: 2 },
      { value: '3', label: 'Investissement prévention planifié et priorisé', score: 3 },
    ],
  },
  {
    id: 'pestel_investissement',
    volet: 'pestel',
    swot: 'opportunite',
    theme: 'formation',
    domain: 'sante',
    label: "Capacité à investir dans la prévention et le développement des compétences",
    choices: [
      { value: '0', label: 'Aucune marge pour investir en prévention', score: 0 },
      { value: '1', label: "Investissement prévention difficile à mobiliser", score: 1 },
      { value: '2', label: 'Capacité à financer des actions de prévention ciblées', score: 2 },
      { value: '3', label: 'Investissement régulier en prévention et compétences', score: 3 },
    ],
  },
  // S — Socioculturel
  {
    id: 'pestel_culture',
    volet: 'pestel',
    swot: 'faiblesse',
    theme: 'culture',
    domain: 'securite',
    label: "Culture sécurité partagée et remontée des situations à risque",
    choices: [
      { value: '0', label: 'La sécurité est perçue comme une contrainte', score: 0 },
      { value: '1', label: 'Sensibilité variable selon les équipes', score: 1 },
      { value: '2', label: 'Remontées de situations dangereuses encouragées', score: 2 },
      { value: '3', label: 'Culture sécurité partagée, ancrée dans les pratiques', score: 3 },
    ],
  },
  {
    id: 'pestel_qvt',
    volet: 'pestel',
    swot: 'faiblesse',
    theme: 'penibilite',
    domain: 'sante',
    label: "Prise en compte des conditions de travail et du dialogue social SSE",
    choices: [
      { value: '0', label: 'Conditions de travail non discutées', score: 0 },
      { value: '1', label: 'Sujets abordés uniquement en cas de problème', score: 1 },
      { value: '2', label: 'Conditions de travail suivies avec les représentants', score: 2 },
      { value: '3', label: 'Démarche active sur les conditions de travail et la QVT', score: 3 },
    ],
  },
  // T — Technologique
  {
    id: 'pestel_outils',
    volet: 'pestel',
    swot: 'opportunite',
    theme: 'equipements',
    domain: 'securite',
    label: "Modernité des équipements et des moyens de prévention",
    choices: [
      { value: '0', label: 'Équipements et protections obsolètes', score: 0 },
      { value: '1', label: 'Renouvellement subi, au coup par coup', score: 1 },
      { value: '2', label: 'Équipements de prévention adaptés et entretenus', score: 2 },
      { value: '3', label: 'Recours à des solutions techniques modernes de prévention', score: 3 },
    ],
  },
  {
    id: 'pestel_techenv',
    volet: 'pestel',
    swot: 'opportunite',
    theme: 'impact_environnemental',
    domain: 'environnement',
    label: "Solutions techniques de réduction des consommations et des rejets",
    choices: [
      { value: '0', label: 'Aucune solution de réduction en place', score: 0 },
      { value: '1', label: 'Réflexion engagée mais pas de mise en œuvre', score: 1 },
      { value: '2', label: 'Premières solutions techniques déployées', score: 2 },
      { value: '3', label: 'Optimisation continue des consommations et rejets', score: 3 },
    ],
  },
  // En — Environnemental
  {
    id: 'pestel_dechets',
    volet: 'pestel',
    swot: 'faiblesse',
    theme: 'impact_environnemental',
    domain: 'environnement',
    label: "Gestion des déchets, effluents et nuisances",
    choices: [
      { value: '0', label: 'Déchets et rejets non maîtrisés', score: 0 },
      { value: '1', label: 'Tri partiel, sans traçabilité', score: 1 },
      { value: '2', label: 'Filières de tri et de traitement en place', score: 2 },
      { value: '3', label: 'Gestion tracée des déchets, effluents et nuisances', score: 3 },
    ],
  },
  {
    id: 'pestel_conformite_env',
    volet: 'pestel',
    swot: 'menace',
    theme: 'reglementation',
    domain: 'environnement',
    label: "Conformité environnementale réglementaire (ICPE, déchets, rejets)",
    choices: [
      { value: '0', label: 'Obligations environnementales non identifiées', score: 0 },
      { value: '1', label: 'Conformité incertaine, non vérifiée', score: 1 },
      { value: '2', label: 'Obligations identifiées et globalement respectées', score: 2 },
      { value: '3', label: 'Conformité environnementale suivie et tracée', score: 3 },
    ],
  },
  // L — Légal
  {
    id: 'pestel_duer',
    volet: 'pestel',
    swot: 'faiblesse',
    theme: 'reglementation',
    domain: 'securite',
    label:
      "Évaluation des risques professionnels (document unique / DUERP) à jour",
    choices: [
      { value: '0', label: 'Pas de document unique', score: 0 },
      { value: '1', label: 'Document unique ancien ou incomplet', score: 1 },
      { value: '2', label: 'Document unique présent et globalement à jour', score: 2 },
      { value: '3', label: 'DUERP à jour, exploité et révisé régulièrement', score: 3 },
    ],
  },
  {
    id: 'pestel_contrats_st',
    volet: 'pestel',
    swot: 'menace',
    theme: 'sous_traitance',
    domain: 'securite',
    label: "Cadre contractuel des obligations SSE vis-à-vis des sous-traitants",
    choices: [
      { value: '0', label: "Aucune exigence SSE dans les contrats", score: 0 },
      { value: '1', label: 'Exigences SSE générales, non vérifiées', score: 1 },
      { value: '2', label: 'Clauses SSE contractuelles et documents demandés', score: 2 },
      { value: '3', label: 'Exigences SSE contractuelles vérifiées et évaluées', score: 3 },
    ],
  },
];
