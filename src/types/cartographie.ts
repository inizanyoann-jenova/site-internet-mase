export type ProcessType = 'pilotage' | 'realisation' | 'support';

export type ParallelGroup = string; // identifiant du groupe de parallélisme

export interface ProcessDefinition {
  id: string;                  // uuid local (crypto.randomUUID)
  type: ProcessType;
  name: string;
  pilotName: string;
  pilotRole: string;
  role?: string;               // pilotage only: rôle en une phrase
  // réalisation only:
  inputElement?: string;       // élément entrant
  outputElement?: string;      // élément sortant
  afterProcessId?: string;     // id du processus précédent (séquentiel)
  parallelGroupId?: string;    // si parallèle, identifiant du groupe
  // support only:
  linkedRealisationIds?: string[];
}

export interface SmartObjective {
  rawText: string;
  objectiveText: string;
  indicator: string;
  target: string;
  frequency: string;
  deadline: string;
}

export interface ProcessSheet {
  id?: string;
  mapId: string;
  process: ProcessDefinition;
  participants: string[];
  purpose: string;
  inputs: string[];
  activities: string[];
  outputs: string[];
  resources: string[];
  smartObjective: SmartObjective;
  kpiLagging: string;
  kpiLeading: string;
  risks: string[];
  documents: string[];
  revisionFrequency: string;
}

export interface CartographyData {
  processes: ProcessDefinition[];
}

export interface ProcessMap {
  id?: string;
  userId?: string;
  companyName: string;
  sector: string;
  headcount: number;
  sseManagerName: string;
  sseManagerRole: string;
  documentDate: string;
  phase1Completed: boolean;
  phase2Completed: boolean;
  cartographyData: CartographyData;
  createdAt?: string;
  updatedAt?: string;
}

export interface GenerateProcessMapPayload {
  companyName: string;
  sector: string;
  city: string;
}

export interface GenerateProcessMapResult {
  processes: ProcessDefinition[];
  source: 'web_search' | 'sector_model';
  sourceSummary?: string;
}

export interface ReformulateSmartPayload {
  rawObjective: string;
  processName: string;
  sector: string;
}

export interface ReformulateSmartResult {
  objectiveText: string;
  indicator: string;
  target: string;
  frequency: string;
  deadline: string;
}

export interface AiAssistPayload {
  questionType: 'purpose' | 'activities' | 'resources' | 'risks' | 'documents';
  processName: string;
  processType: ProcessType;
  sector: string;
  context: Record<string, unknown>;
}

export interface AiAssistResult {
  suggestion: string | string[];
}
