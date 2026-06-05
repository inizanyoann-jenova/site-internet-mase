export type StepType = 'activite' | 'decision';
export type RouteType = 'next' | 'goto' | 'end';
export type RouteSide = 'auto' | 'bottom' | 'right' | 'left';
export type RiskLevel = 'low' | 'med' | 'high';
export type ProcedureStatus = 'brouillon' | 'valide' | 'archive';

export interface StepDefinition {
  id: string;
  type: StepType;
  num: number;
  activite: string;
  acteur: string;
  outil?: string;
  // Activité routing
  routeTypeAct?: RouteType;
  routeNumAct?: string;
  routeSideAct?: RouteSide;
  // Décision OUI
  ouiLabel?: string;
  routeTypeOui?: RouteType;
  routeNumOui?: string;
  routeSideOui?: RouteSide;
  // Décision NON
  nonLabel?: string;
  nonAction?: string;
  nonActor?: string;
  routeTypeNon?: RouteType;
  routeNumNon?: string;
  routeSideNon?: RouteSide;
}

export interface RiskItem {
  id: string;
  risque: string;
  niveau: RiskLevel;
  controle: string;
}

export interface Approver {
  id: string;
  role: string;
  nom: string;
  date?: string;
}

export interface Revision {
  id: string;
  version: string;
  date: string;
  auteur: string;
  nature: string;
}

export interface ProcedureDoc {
  id?: string;
  userId?: string;
  title: string;
  reference: string;
  version: string;
  documentDate: string;
  direction: string;
  responsible: string;
  status: ProcedureStatus;
  processParent: string;
  mapId?: string;
  objective: string;
  domain: string;
  docsIn: string;
  docsOut: string;
  kpi: string;
  steps: StepDefinition[];
  risks: RiskItem[];
  approvers: Approver[];
  revisions: Revision[];
  revisionFrequency?: string;
  phaseCompleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GenerateProcedureStepsPayload {
  description: string;
  sector: string;
  processType?: string;
  companyName?: string;
}

export interface GenerateProcedureStepsResult {
  steps: StepDefinition[];
}

export interface AiSuggestProcedurePayload {
  questionType: 'objective' | 'kpi' | 'risks';
  title: string;
  sector: string;
  processParent?: string;
}

export interface AiSuggestProcedureResult {
  suggestion: string;
}

export const PROC_PREFIXES: Record<string, string> = {
  'QHSE & Études': 'PR-QHSE',
  'Maintenance': 'PR-MAINT',
  'Travaux & Réalisation': 'PR-TRAV',
  'Intégration': 'PR-INT',
  'Gestion de Contrats': 'PR-CTR',
  'Administration & Gestion': 'PR-ADM',
  'Direction': 'PR-DG',
};

export interface ProcedureTemplate {
  icon: string;
  label: string;
  doc: Omit<ProcedureDoc, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
}

// Default approvers used in all templates
function makeApprovers(): Approver[] {
  return [
    { id: crypto.randomUUID(), role: 'Rédigé par', nom: '' },
    { id: crypto.randomUUID(), role: 'Vérifié par', nom: '' },
    { id: crypto.randomUUID(), role: 'Approuvé par', nom: '' },
  ];
}

// Default initial revision used in all templates
function makeRevision(version = 'V1.0', nature = 'Création du document'): Revision[] {
  return [
    {
      id: crypto.randomUUID(),
      version,
      date: new Date().toISOString().split('T')[0],
      auteur: '',
      nature,
    },
  ];
}

export const PROCEDURE_TEMPLATES: ProcedureTemplate[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // 1. Plan de Prévention
  // ─────────────────────────────────────────────────────────────────────────
  {
    icon: '🛡️',
    label: 'Plan de Prévention',
    doc: {
      title: 'Plan de Prévention',
      reference: 'PR-QHSE-001',
      version: 'V1.0',
      documentDate: new Date().toISOString().split('T')[0],
      direction: 'QHSE',
      responsible: 'Responsable QHSE',
      status: 'brouillon',
      processParent: 'QHSE & Études',
      objective:
        "Définir les modalités d'établissement et de suivi du Plan de Prévention pour toute intervention d'entreprise extérieure (EE) sur le site.",
      domain: 'Toutes interventions EE sur le site',
      docsIn: 'Contrat, DUER, Notice de poste',
      docsOut: 'Plan de Prévention signé, Permis de travail',
      kpi: '100 % des interventions EE couvertes par un PP signé',
      revisionFrequency: 'Annuelle',
      phaseCompleted: false,
      steps: [
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 1,
          activite: 'Identifier le besoin d\'intervention EE',
          acteur: 'Donneur d\'ordre',
          outil: 'Bon de commande / Contrat',
          routeTypeAct: 'next',
          routeSideAct: 'auto',
        },
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 2,
          activite: 'Planifier la réunion de coordination préalable',
          acteur: 'Responsable QHSE',
          outil: 'Agenda',
          routeTypeAct: 'next',
          routeSideAct: 'auto',
        },
        {
          id: crypto.randomUUID(),
          type: 'decision',
          num: 3,
          activite: 'L\'intervention présente-t-elle des risques particuliers ?',
          acteur: 'Responsable QHSE',
          ouiLabel: 'OUI',
          routeTypeOui: 'next',
          routeSideOui: 'auto',
          nonLabel: 'NON',
          nonAction: 'Établir une fiche de sécurité simplifiée',
          nonActor: 'Responsable QHSE',
          routeTypeNon: 'goto',
          routeNumNon: '5',
          routeSideNon: 'right',
        },
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 4,
          activite: 'Rédiger le Plan de Prévention complet avec l\'EE',
          acteur: 'Responsable QHSE',
          outil: 'Formulaire PP',
          routeTypeAct: 'next',
          routeSideAct: 'auto',
        },
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 5,
          activite: 'Faire signer le PP par toutes les parties',
          acteur: 'Donneur d\'ordre + EE',
          outil: 'Plan de Prévention',
          routeTypeAct: 'next',
          routeSideAct: 'auto',
        },
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 6,
          activite: 'Archiver le PP et assurer le suivi de l\'intervention',
          acteur: 'Responsable QHSE',
          outil: 'GED',
          routeTypeAct: 'end',
          routeSideAct: 'auto',
        },
      ],
      risks: [
        {
          id: crypto.randomUUID(),
          risque: 'Intervention EE sans Plan de Prévention établi',
          niveau: 'high',
          controle: 'Suspension immédiate de l\'intervention, remontée au responsable de site',
        },
        {
          id: crypto.randomUUID(),
          risque: 'PP non mis à jour suite à modification des conditions d\'intervention',
          niveau: 'med',
          controle: 'Revue systématique du PP à chaque changement de conditions',
        },
      ],
      approvers: makeApprovers(),
      revisions: makeRevision(),
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Accueil Sécurité
  // ─────────────────────────────────────────────────────────────────────────
  {
    icon: '👷',
    label: 'Accueil Sécurité',
    doc: {
      title: 'Accueil Sécurité Nouveau Arrivant',
      reference: 'PR-QHSE-002',
      version: 'V1.0',
      documentDate: new Date().toISOString().split('T')[0],
      direction: 'QHSE',
      responsible: 'Responsable QHSE',
      status: 'brouillon',
      processParent: 'QHSE & Études',
      objective:
        "Assurer que tout nouveau salarié, intérimaire ou intervenant extérieur reçoive les informations SSE indispensables avant toute prise de poste.",
      domain: 'Tout nouveau entrant sur le site (CDI, CDD, intérim, EE)',
      docsIn: 'Contrat de travail, Fiche de poste',
      docsOut: 'Fiche d\'accueil signée, Livret accueil remis',
      kpi: '100 % des nouveaux arrivants avec fiche d\'accueil signée',
      revisionFrequency: 'Annuelle',
      phaseCompleted: false,
      steps: [
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 1,
          activite: 'Préparer le dossier d\'accueil (livret, EPI, badge)',
          acteur: 'RH / QHSE',
          outil: 'Livret d\'accueil',
          routeTypeAct: 'next',
          routeSideAct: 'auto',
        },
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 2,
          activite: 'Présenter les règles générales SSE du site',
          acteur: 'Responsable QHSE',
          outil: 'Support de présentation',
          routeTypeAct: 'next',
          routeSideAct: 'auto',
        },
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 3,
          activite: 'Visite des installations et des zones à risques',
          acteur: 'Responsable QHSE',
          outil: 'Plan de site',
          routeTypeAct: 'next',
          routeSideAct: 'auto',
        },
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 4,
          activite: 'Remettre et expliquer les EPI obligatoires',
          acteur: 'Responsable QHSE / Magasin',
          outil: 'Fiche EPI',
          routeTypeAct: 'next',
          routeSideAct: 'auto',
        },
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 5,
          activite: 'Faire signer la fiche d\'accueil et archiver',
          acteur: 'RH',
          outil: 'Fiche d\'accueil',
          routeTypeAct: 'end',
          routeSideAct: 'auto',
        },
      ],
      risks: [
        {
          id: crypto.randomUUID(),
          risque: 'Prise de poste sans accueil sécurité réalisé',
          niveau: 'high',
          controle: 'Blocage de la prise de poste jusqu\'à signature de la fiche d\'accueil',
        },
      ],
      approvers: makeApprovers(),
      revisions: makeRevision(),
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Maintenance Corrective
  // ─────────────────────────────────────────────────────────────────────────
  {
    icon: '🔧',
    label: 'Maintenance Corrective',
    doc: {
      title: 'Maintenance Corrective',
      reference: 'PR-MAINT-001',
      version: 'V1.0',
      documentDate: new Date().toISOString().split('T')[0],
      direction: 'Maintenance',
      responsible: 'Responsable Maintenance',
      status: 'brouillon',
      processParent: 'Maintenance',
      objective:
        "Définir le processus de traitement des pannes et défaillances équipements afin de rétablir la disponibilité opérationnelle dans les délais impartis.",
      domain: 'Tous équipements et installations du site',
      docsIn: 'Bon de travaux, Historique équipement, Gamme de maintenance',
      docsOut: 'Rapport d\'intervention, GMAO mise à jour',
      kpi: 'MTTR < 4h pour pannes critiques',
      revisionFrequency: 'Annuelle',
      phaseCompleted: false,
      steps: [
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 1,
          activite: 'Réceptionner et qualifier le signalement de panne',
          acteur: 'Technicien Maintenance',
          outil: 'GMAO',
          routeTypeAct: 'next',
          routeSideAct: 'auto',
        },
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 2,
          activite: 'Diagnostiquer la défaillance sur site',
          acteur: 'Technicien Maintenance',
          outil: 'Outillage diagnostic',
          routeTypeAct: 'next',
          routeSideAct: 'auto',
        },
        {
          id: crypto.randomUUID(),
          type: 'decision',
          num: 3,
          activite: 'Les pièces de rechange sont-elles disponibles en stock ?',
          acteur: 'Technicien Maintenance',
          ouiLabel: 'OUI',
          routeTypeOui: 'next',
          routeSideOui: 'auto',
          nonLabel: 'NON',
          nonAction: 'Lancer une commande urgente de pièces',
          nonActor: 'Responsable Maintenance',
          routeTypeNon: 'goto',
          routeNumNon: '4',
          routeSideNon: 'right',
        },
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 4,
          activite: 'Réaliser l\'intervention corrective (consignation, réparation, déconsignation)',
          acteur: 'Technicien Maintenance',
          outil: 'Gamme de maintenance, EPI',
          routeTypeAct: 'next',
          routeSideAct: 'auto',
        },
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 5,
          activite: 'Tester et valider le bon fonctionnement',
          acteur: 'Technicien Maintenance + Exploitant',
          outil: 'Fiche de réception',
          routeTypeAct: 'next',
          routeSideAct: 'auto',
        },
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 6,
          activite: 'Clôturer l\'OT et renseigner la GMAO',
          acteur: 'Technicien Maintenance',
          outil: 'GMAO',
          routeTypeAct: 'end',
          routeSideAct: 'auto',
        },
      ],
      risks: [
        {
          id: crypto.randomUUID(),
          risque: 'Intervention sans consignation électrique / mécanique préalable',
          niveau: 'high',
          controle: 'Vérification obligatoire du cadenassage avant toute intervention',
        },
        {
          id: crypto.randomUUID(),
          risque: 'Mauvaise identification de la panne entraînant une récidive',
          niveau: 'med',
          controle: 'Analyse des causes racines systématique pour pannes répétitives',
        },
      ],
      approvers: makeApprovers(),
      revisions: makeRevision(),
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Travaux & Réalisation
  // ─────────────────────────────────────────────────────────────────────────
  {
    icon: '🏗️',
    label: 'Travaux & Réalisation',
    doc: {
      title: 'Préparation et Réalisation des Travaux',
      reference: 'PR-TRAV-001',
      version: 'V1.0',
      documentDate: new Date().toISOString().split('T')[0],
      direction: 'Travaux & Réalisation',
      responsible: 'Chargé d\'Affaires',
      status: 'brouillon',
      processParent: 'Travaux & Réalisation',
      objective:
        "Définir les étapes de préparation, d'exécution et de réception des travaux afin de garantir la conformité technique, les délais et la sécurité des équipes.",
      domain: 'Tous chantiers et travaux réalisés par l\'entreprise',
      docsIn: 'Cahier des charges, Plans, CCTP',
      docsOut: 'Procès-verbal de réception, DOE',
      kpi: '95 % des chantiers réceptionnés sans réserve majeure',
      revisionFrequency: 'Annuelle',
      phaseCompleted: false,
      steps: [
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 1,
          activite: 'Analyser le dossier technique et préparer le chantier',
          acteur: 'Chargé d\'Affaires',
          outil: 'Plans, CCTP',
          routeTypeAct: 'next',
          routeSideAct: 'auto',
        },
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 2,
          activite: 'Établir le PPSPS et les autorisations nécessaires',
          acteur: 'Responsable QHSE',
          outil: 'PPSPS, DICT',
          routeTypeAct: 'next',
          routeSideAct: 'auto',
        },
        {
          id: crypto.randomUUID(),
          type: 'decision',
          num: 3,
          activite: 'Le chantier nécessite-t-il des travaux en hauteur ou espaces confinés ?',
          acteur: 'Chef de chantier',
          ouiLabel: 'OUI',
          routeTypeOui: 'next',
          routeSideOui: 'auto',
          nonLabel: 'NON',
          nonAction: 'Passer directement à l\'exécution standard',
          nonActor: 'Chef de chantier',
          routeTypeNon: 'goto',
          routeNumNon: '5',
          routeSideNon: 'right',
        },
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 4,
          activite: 'Mettre en place les protections collectives spécifiques',
          acteur: 'Chef de chantier',
          outil: 'Matériel de protection',
          routeTypeAct: 'next',
          routeSideAct: 'auto',
        },
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 5,
          activite: 'Réaliser les travaux et contrôles qualité en cours d\'avancement',
          acteur: 'Équipe chantier',
          outil: 'Plans, fiche autocontrôle',
          routeTypeAct: 'next',
          routeSideAct: 'auto',
        },
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 6,
          activite: 'Réceptionner les travaux avec le client et établir le PV',
          acteur: 'Chargé d\'Affaires + Client',
          outil: 'PV de réception',
          routeTypeAct: 'end',
          routeSideAct: 'auto',
        },
      ],
      risks: [
        {
          id: crypto.randomUUID(),
          risque: 'Démarrage de chantier sans PPSPS validé',
          niveau: 'high',
          controle: 'Blocage du démarrage jusqu\'à validation du PPSPS par le coordonnateur SPS',
        },
        {
          id: crypto.randomUUID(),
          risque: 'Non-conformité découverte lors de la réception',
          niveau: 'med',
          controle: 'Contrôles qualité intermédiaires et fiche d\'autocontrôle renseignée',
        },
      ],
      approvers: makeApprovers(),
      revisions: makeRevision(),
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Revue de Direction
  // ─────────────────────────────────────────────────────────────────────────
  {
    icon: '📊',
    label: 'Revue de Direction',
    doc: {
      title: 'Revue de Direction Annuelle',
      reference: 'PR-DG-001',
      version: 'V1.0',
      documentDate: new Date().toISOString().split('T')[0],
      direction: 'Direction',
      responsible: 'Directeur Général',
      status: 'brouillon',
      processParent: 'Direction',
      objective:
        "Évaluer périodiquement l'efficacité du Système de Management Intégré (SMI) et définir les orientations stratégiques SSE pour la période suivante.",
      domain: 'Ensemble du Système de Management Intégré de l\'entreprise',
      docsIn: 'Tableau de bord SSE, Résultats audits, NC et actions correctives, Bilan AT/MP',
      docsOut: 'Compte-rendu de revue de direction, Plan d\'actions révisé',
      kpi: '100 % des indicateurs SSE analysés, taux de réalisation des actions > 80 %',
      revisionFrequency: 'Annuelle',
      phaseCompleted: false,
      steps: [
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 1,
          activite: 'Collecter et synthétiser les données SSE de la période',
          acteur: 'Responsable QHSE',
          outil: 'Tableau de bord SSE',
          routeTypeAct: 'next',
          routeSideAct: 'auto',
        },
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 2,
          activite: 'Préparer le dossier de revue et convoquer les participants',
          acteur: 'Responsable QHSE',
          outil: 'Convocation, ordre du jour',
          routeTypeAct: 'next',
          routeSideAct: 'auto',
        },
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 3,
          activite: 'Animer la revue : analyse des résultats, revue des risques, objectifs',
          acteur: 'Directeur Général',
          outil: 'Support de présentation',
          routeTypeAct: 'next',
          routeSideAct: 'auto',
        },
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 4,
          activite: 'Définir et valider le plan d\'actions pour la période à venir',
          acteur: 'Direction + Responsable QHSE',
          outil: 'Plan d\'actions',
          routeTypeAct: 'next',
          routeSideAct: 'auto',
        },
        {
          id: crypto.randomUUID(),
          type: 'activite',
          num: 5,
          activite: 'Diffuser le compte-rendu signé et archiver',
          acteur: 'Responsable QHSE',
          outil: 'GED',
          routeTypeAct: 'end',
          routeSideAct: 'auto',
        },
      ],
      risks: [
        {
          id: crypto.randomUUID(),
          risque: 'Revue de direction non réalisée dans l\'année (non-conformité audit)',
          niveau: 'high',
          controle: 'Planification en début d\'année avec rappel automatique 30 jours avant',
        },
      ],
      approvers: makeApprovers(),
      revisions: makeRevision(),
    },
  },
];
