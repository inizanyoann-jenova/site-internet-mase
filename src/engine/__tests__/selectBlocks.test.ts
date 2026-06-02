import { describe, it, expect } from 'vitest';
import { selectBlocks } from '../selectBlocks';
import type { Block, Indicators } from '../types';

function makeIndicators(over: Partial<Indicators> = {}): Indicators {
  return {
    domainScores: { securite: 0.5, sante: 0.5, environnement: 0.5 },
    themeScores: {},
    maturity: 0.5,
    tone: 'structuration',
    priorities: [],
    ...over,
  };
}

const blocks: Block[] = [
  { id: 'diff', section: 'diffusion', text: 'Diffusée à tous.' },
  { id: 'preamb-struct', section: 'preambule', tone: 'structuration', text: 'En structuration.' },
  { id: 'preamb-mature', section: 'preambule', tone: 'mature', text: 'Démarche mature.' },
  { id: 'principes', section: 'principes', text: 'Les six principes.' },
  {
    id: 'secu-faible',
    section: 'engagement_securite',
    text: 'Renforcer la sécurité.',
    condition: (ind) => ind.domainScores.securite < 0.4,
  },
];

describe('selectBlocks', () => {
  it('ordonne les blocs selon l\'ordre des sections, pas l\'ordre d\'entrée', () => {
    const out = selectBlocks(makeIndicators(), blocks, {});
    const sections = out.map((b) => b.section);
    expect(sections.indexOf('preambule')).toBeLessThan(sections.indexOf('principes'));
    expect(sections.indexOf('principes')).toBeLessThan(sections.indexOf('diffusion'));
  });

  it('inclut un bloc sans condition ni ton', () => {
    const out = selectBlocks(makeIndicators(), blocks, {});
    expect(out.some((b) => b.text === 'Les six principes.')).toBe(true);
  });

  it('ne retient que la variante de ton correspondante', () => {
    const struct = selectBlocks(makeIndicators({ tone: 'structuration' }), blocks, {});
    expect(struct.some((b) => b.text === 'En structuration.')).toBe(true);
    expect(struct.some((b) => b.text === 'Démarche mature.')).toBe(false);

    const mature = selectBlocks(makeIndicators({ tone: 'mature' }), blocks, {});
    expect(mature.some((b) => b.text === 'Démarche mature.')).toBe(true);
    expect(mature.some((b) => b.text === 'En structuration.')).toBe(false);
  });

  it('exclut un bloc dont la condition est fausse', () => {
    const out = selectBlocks(
      makeIndicators({ domainScores: { securite: 0.8, sante: 0.5, environnement: 0.5 } }),
      blocks,
      {},
    );
    expect(out.some((b) => b.text === 'Renforcer la sécurité.')).toBe(false);
  });

  it('inclut un bloc dont la condition est vraie', () => {
    const out = selectBlocks(
      makeIndicators({ domainScores: { securite: 0.2, sante: 0.5, environnement: 0.5 } }),
      blocks,
      {},
    );
    expect(out.some((b) => b.text === 'Renforcer la sécurité.')).toBe(true);
  });

  it('génère les axes prioritaires dans l\'ordre des priorités', () => {
    const ind = makeIndicators({
      priorities: [
        { theme: 'impact_environnemental', domain: 'environnement', strength: 3 },
        { theme: 'formation', domain: 'securite', strength: 2 },
      ],
    });
    const axisTexts = {
      formation: 'Déployer un plan de formation.',
      impact_environnemental: 'Maîtriser les impacts environnementaux.',
    };
    const out = selectBlocks(ind, blocks, axisTexts);
    const axes = out.filter((b) => b.section === 'axes_prioritaires').map((b) => b.text);
    expect(axes).toEqual([
      'Maîtriser les impacts environnementaux.',
      'Déployer un plan de formation.',
    ]);
  });

  it('ignore une priorité sans texte d\'axe associé', () => {
    const ind = makeIndicators({
      priorities: [{ theme: 'gouvernance', domain: 'securite', strength: 2 }],
    });
    const out = selectBlocks(ind, blocks, { formation: 'X' });
    expect(out.filter((b) => b.section === 'axes_prioritaires')).toEqual([]);
  });
});
