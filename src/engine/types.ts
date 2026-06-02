// Types du moteur de génération de Politique SSE.
// Le contenu (questionnaire.ts, blocks.ts) est séparé de la logique (indicators.ts, selectBlocks.ts).

/** Domaine SSE couvert par une question / un engagement. */
export type Domain = 'securite' | 'sante' | 'environnement';

/** Thème transversal, sert au ciblage des engagements prioritaires. */
export type Theme =
  | 'formation'
  | 'sous_traitance'
  | 'interim'
  | 'culture'
  | 'equipements'
  | 'reglementation'
  | 'penibilite'
  | 'impact_environnemental'
  | 'gouvernance';

/** Volet du diagnostic. */
export type Volet = 'swot' | 'pestel';

/** Quadrant SWOT que la question explore. */
export type Swot = 'force' | 'faiblesse' | 'opportunite' | 'menace';

/**
 * Un choix de réponse.
 * `score` : posture SSE traduite par ce choix, de 0 (situation à risque) à 3 (maîtrisé).
 */
export interface Choice {
  value: string;
  label: string;
  score: 0 | 1 | 2 | 3;
}

/** Une question fermée du diagnostic. */
export interface Question {
  id: string;
  volet: Volet;
  swot: Swot;
  theme: Theme;
  domain: Domain;
  label: string;
  choices: Choice[];
}

/** Réponse de l'utilisateur : la valeur du choix sélectionné pour une question. */
export interface Answer {
  questionId: string;
  choiceValue: string;
}

/** Signal d'axe prioritaire issu d'une faiblesse / menace mal notée. */
export interface PrioritySignal {
  theme: Theme;
  domain: Domain;
  /** Intensité du problème : (scoreMax - score), de 1 à 3. */
  strength: number;
}

/** Ton général de la politique, déduit de la maturité. */
export type Tone = 'mature' | 'structuration';

/** Sortie de computeIndicators : tout ce dont selectBlocks a besoin. */
export interface Indicators {
  /** Score moyen normalisé par domaine, 0..1. */
  domainScores: Record<Domain, number>;
  /** Score moyen normalisé par thème évalué, 0..1. */
  themeScores: Partial<Record<Theme, number>>;
  /** Maturité globale normalisée, 0..1. */
  maturity: number;
  /** Ton déduit de la maturité. */
  tone: Tone;
  /** Axes prioritaires, triés par intensité décroissante. */
  priorities: PrioritySignal[];
}

/** Informations entreprise injectées dans le document. */
export interface CompanyInfo {
  name: string;
  sector: string;
  headcount: string;
  activities: string;
  employerName: string;
}

/** Sections du document, dans l'ordre d'apparition. */
export type Section =
  | 'preambule'
  | 'principes'
  | 'engagement_securite'
  | 'engagement_sante'
  | 'engagement_environnement'
  | 'axes_prioritaires'
  | 'amelioration_continue'
  | 'diffusion';

/**
 * Bloc de texte de la bibliothèque.
 * `condition` : si présente, le bloc n'est retenu que si elle renvoie true.
 * `tone` : si présent, le bloc n'est retenu que si le ton courant correspond.
 * `text` : peut contenir des variables `{{name}}`, `{{sector}}`, etc.
 */
export interface Block {
  id: string;
  section: Section;
  text: string;
  tone?: Tone;
  condition?: (ind: Indicators) => boolean;
}

/** Bloc retenu, prêt à rendre. */
export interface SelectedBlock {
  section: Section;
  text: string;
}
