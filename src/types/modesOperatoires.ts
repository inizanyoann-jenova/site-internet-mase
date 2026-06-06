import type { Approver, Revision } from './procedures';

export type OperationType =
  | 'consignation' | 'hauteur' | 'confine' | 'permis-feu'
  | 'electrique-ht' | 'levage' | 'chimique' | 'vrd';

export interface PhaseStep {
  id: string;
  ordre: number;
  consigne: string;
  acteur?: string;
  outil?: string;
  pointControle: boolean;
  critique: boolean;
}

export interface EpiItem {
  id: string;
  designation: string;
  norme?: string;
  obligatoire: boolean;
}

export interface ConsigneSSE {
  risques: string[];
  reglesSecurite: string[];
  consignesEnv: string[];
  permisRequis: string[];
}

export interface ContactUrgence {
  id: string;
  role: string;
  nom?: string;
  telephone: string;
}

export interface SituationUrgence {
  id: string;
  scenario: string;
  conduite: string;
  contacts: ContactUrgence[];
}

export interface ModeOperatoire {
  id?: string;
  userId?: string;
  title: string;
  reference: string;
  version: string;
  documentDate: string;
  operationType: OperationType;
  habilitations: string[];
  consignesSSE: ConsigneSSE;
  epis: EpiItem[];
  phases: {
    preparation: PhaseStep[];
    execution: PhaseStep[];
    finTache: PhaseStep[];
  };
  urgences: SituationUrgence[];
  pointRassemblement?: string;
  approvers: Approver[];
  revisions: Revision[];
  revisionFrequency?: string;
  status: 'brouillon' | 'valide' | 'archive';
  createdAt?: string;
  updatedAt?: string;
}

export interface AiSuggestMoPayload {
  questionType: 'sse' | 'epi' | 'urgences';
  operationType: OperationType;
  title: string;
}

export interface AiSuggestMoResult {
  suggestion: string;
}

export const MO_PREFIXES: Record<OperationType, string> = {
  consignation: 'MO-CONS',
  hauteur: 'MO-HAUT',
  confine: 'MO-CONF',
  'permis-feu': 'MO-FEU',
  'electrique-ht': 'MO-ELEC',
  levage: 'MO-LEV',
  chimique: 'MO-CHIM',
  vrd: 'MO-VRD',
};

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  consignation: 'Consignation/Déconsignation',
  hauteur: 'Travaux en hauteur',
  confine: 'Espace confiné',
  'permis-feu': 'Permis de feu',
  'electrique-ht': 'Travaux électriques HT',
  levage: 'Levage/Manutention',
  chimique: 'Produits chimiques',
  vrd: 'Travaux VRD',
};

export const OPERATION_TYPE_ICONS: Record<OperationType, string> = {
  consignation: '🔒',
  hauteur: '🪜',
  confine: '🕳️',
  'permis-feu': '🔥',
  'electrique-ht': '⚡',
  levage: '🏗️',
  chimique: '⚗️',
  vrd: '⛏️',
};
