import { describe, it, expect } from 'vitest';
import { computeIndicators } from '../indicators';
import type { Question, Answer } from '../types';

// Fixtures minimales : on ne dépend pas du vrai questionnaire.
const questions: Question[] = [
  {
    id: 'q_form',
    volet: 'swot',
    swot: 'faiblesse',
    theme: 'formation',
    domain: 'securite',
    label: 'Formation sécurité',
    choices: [
      { value: 'a', label: 'Aucune', score: 0 },
      { value: 'b', label: 'Partielle', score: 1 },
      { value: 'c', label: 'Structurée', score: 3 },
    ],
  },
  {
    id: 'q_env',
    volet: 'pestel',
    swot: 'menace',
    theme: 'impact_environnemental',
    domain: 'environnement',
    label: 'Gestion des déchets',
    choices: [
      { value: 'a', label: 'Non gérée', score: 0 },
      { value: 'b', label: 'En cours', score: 2 },
      { value: 'c', label: 'Maîtrisée', score: 3 },
    ],
  },
  {
    id: 'q_force',
    volet: 'swot',
    swot: 'force',
    theme: 'culture',
    domain: 'sante',
    label: 'Culture sécurité',
    choices: [
      { value: 'a', label: 'Faible', score: 0 },
      { value: 'c', label: 'Forte', score: 3 },
    ],
  },
];

describe('computeIndicators', () => {
  it('calcule la maturité comme moyenne normalisée des scores', () => {
    const answers: Answer[] = [
      { questionId: 'q_form', choiceValue: 'c' }, // 3
      { questionId: 'q_env', choiceValue: 'b' }, // 2
      { questionId: 'q_force', choiceValue: 'a' }, // 0
    ];
    const ind = computeIndicators(answers, questions);
    // (3 + 2 + 0) / 3 = 1.6667 ; normalisé /3 = 0.5556
    expect(ind.maturity).toBeCloseTo((3 + 2 + 0) / 3 / 3, 4);
  });

  it('calcule les scores par domaine normalisés', () => {
    const answers: Answer[] = [
      { questionId: 'q_form', choiceValue: 'b' }, // securite: 1
      { questionId: 'q_env', choiceValue: 'c' }, // environnement: 3
    ];
    const ind = computeIndicators(answers, questions);
    expect(ind.domainScores.securite).toBeCloseTo(1 / 3, 4);
    expect(ind.domainScores.environnement).toBeCloseTo(1, 4);
    expect(ind.domainScores.sante).toBe(0); // pas répondu
  });

  it('génère un axe prioritaire pour une faiblesse mal notée', () => {
    const answers: Answer[] = [{ questionId: 'q_form', choiceValue: 'a' }]; // score 0
    const ind = computeIndicators(answers, questions);
    expect(ind.priorities).toEqual([
      { theme: 'formation', domain: 'securite', strength: 3 },
    ]);
  });

  it('ne génère pas d\'axe quand la faiblesse est maîtrisée (score max)', () => {
    const answers: Answer[] = [{ questionId: 'q_form', choiceValue: 'c' }]; // score 3
    const ind = computeIndicators(answers, questions);
    expect(ind.priorities).toEqual([]);
  });

  it('ne génère pas d\'axe pour une question force/opportunité même mal notée', () => {
    const answers: Answer[] = [{ questionId: 'q_force', choiceValue: 'a' }]; // force, score 0
    const ind = computeIndicators(answers, questions);
    expect(ind.priorities).toEqual([]);
  });

  it('trie les axes prioritaires par intensité décroissante', () => {
    const answers: Answer[] = [
      { questionId: 'q_form', choiceValue: 'b' }, // faiblesse, score 1 -> strength 2
      { questionId: 'q_env', choiceValue: 'a' }, // menace, score 0 -> strength 3
    ];
    const ind = computeIndicators(answers, questions);
    expect(ind.priorities.map((p) => p.strength)).toEqual([3, 2]);
    expect(ind.priorities[0].theme).toBe('impact_environnemental');
  });

  it('déduit le ton selon le seuil de maturité', () => {
    const mature = computeIndicators(
      [{ questionId: 'q_force', choiceValue: 'c' }], // 3 -> maturité 1
      questions,
    );
    expect(mature.tone).toBe('mature');

    const structuration = computeIndicators(
      [{ questionId: 'q_form', choiceValue: 'a' }], // 0 -> maturité 0
      questions,
    );
    expect(structuration.tone).toBe('structuration');
  });
});
