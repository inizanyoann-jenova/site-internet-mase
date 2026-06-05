import { describe, it, expect } from 'vitest';
import { buildLogiSVG } from './buildLogiSVG';
import type { StepDefinition } from '../../types/procedures';

const baseStep = (overrides: Partial<StepDefinition> = {}): StepDefinition => ({
  id: 'step-1', type: 'activite', num: 1,
  activite: 'Identifier le besoin', acteur: 'Responsable QHSE',
  routeTypeAct: 'next', routeSideAct: 'auto', ...overrides,
});

describe('buildLogiSVG', () => {
  it('retourne svgStr et legendHtml', () => {
    const { svgStr, legendHtml } = buildLogiSVG([baseStep()], false);
    expect(typeof svgStr).toBe('string');
    expect(typeof legendHtml).toBe('string');
  });

  it('SVG contient DÉBUT et FIN', () => {
    const { svgStr } = buildLogiSVG([baseStep()], false);
    expect(svgStr).toContain('DÉBUT');
    expect(svgStr).toContain('FIN');
  });

  it('activité génère un rect dans le SVG', () => {
    const { svgStr } = buildLogiSVG([baseStep()], false);
    expect(svgStr).toContain('<rect');
    expect(svgStr).toContain('Identifier le besoin');
  });

  it('décision génère un polygon (losange)', () => {
    const step = baseStep({ type: 'decision', activite: 'Seuil dépassé ?', ouiLabel: 'OUI', nonLabel: 'NON', routeTypeOui: 'next', routeTypeNon: 'end' });
    const { svgStr } = buildLogiSVG([step], false);
    expect(svgStr).toContain('<polygon');
    expect(svgStr).toContain('Seuil dépassé ?');
  });

  it('légende contient le nom de l\'acteur', () => {
    const { legendHtml } = buildLogiSVG([baseStep()], false);
    expect(legendHtml).toContain('Responsable QHSE');
  });

  it('ne plante pas avec tableau vide', () => {
    const { svgStr } = buildLogiSVG([], false);
    expect(svgStr).toBe('');
  });

  it('mode couloirs génère des swim lanes', () => {
    const steps = [
      baseStep({ id: 's1', acteur: 'Acteur A' }),
      baseStep({ id: 's2', num: 2, acteur: 'Acteur B', activite: 'Deuxième étape' }),
    ];
    const { svgStr } = buildLogiSVG(steps, true);
    expect(svgStr).toContain('Acteur A');
    expect(svgStr).toContain('Acteur B');
  });
});
