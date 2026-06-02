import type {
  Answer,
  Domain,
  Indicators,
  PrioritySignal,
  Question,
  Theme,
} from './types';

const MAX_SCORE = 3;
const MATURITY_THRESHOLD = 0.6;
const DOMAINS: Domain[] = ['securite', 'sante', 'environnement'];

/** Moyenne normalisée (0..1) d'une liste de scores bruts (0..3). */
function normalizedAverage(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((a, b) => a + b, 0);
  return sum / scores.length / MAX_SCORE;
}

/**
 * Transforme les réponses en indicateurs internes.
 * Fonction pure : reçoit le questionnaire en argument (injection).
 */
export function computeIndicators(
  answers: Answer[],
  questions: Question[],
): Indicators {
  const byId = new Map(questions.map((q) => [q.id, q]));

  // Score brut (0..3) par question répondue.
  const scored = answers.flatMap((a) => {
    const q = byId.get(a.questionId);
    if (!q) return [];
    const choice = q.choices.find((c) => c.value === a.choiceValue);
    if (!choice) return [];
    return [{ question: q, score: choice.score as 0 | 1 | 2 | 3 }];
  });

  const allScores = scored.map((s) => s.score);
  const maturity = normalizedAverage(allScores);

  const domainScores = Object.fromEntries(
    DOMAINS.map((d) => [
      d,
      normalizedAverage(
        scored.filter((s) => s.question.domain === d).map((s) => s.score),
      ),
    ]),
  ) as Record<Domain, number>;

  const themeScores: Partial<Record<Theme, number>> = {};
  const themes = new Set(scored.map((s) => s.question.theme));
  for (const t of themes) {
    themeScores[t] = normalizedAverage(
      scored.filter((s) => s.question.theme === t).map((s) => s.score),
    );
  }

  // Axes prioritaires : faiblesses/menaces non maîtrisées. Dédupliqués par
  // thème+domaine en gardant l'intensité la plus forte.
  const priorityMap = new Map<string, PrioritySignal>();
  for (const { question, score } of scored) {
    if (question.swot !== 'faiblesse' && question.swot !== 'menace') continue;
    const strength = MAX_SCORE - score;
    if (strength <= 0) continue;
    const key = `${question.theme}:${question.domain}`;
    const existing = priorityMap.get(key);
    if (!existing || strength > existing.strength) {
      priorityMap.set(key, { theme: question.theme, domain: question.domain, strength });
    }
  }
  const priorities = [...priorityMap.values()].sort((a, b) => b.strength - a.strength);

  return {
    domainScores,
    themeScores,
    maturity,
    tone: maturity >= MATURITY_THRESHOLD ? 'mature' : 'structuration',
    priorities,
  };
}
