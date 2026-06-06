import { describe, it, expect } from 'vitest';
import { buildLogiTechnicienSVG } from '../buildLogiTechnicienSVG';
import type { PhaseStep } from '../../../types/modesOperatoires';

function makeStep(ordre: number, consigne: string, acteur?: string, critique = false): PhaseStep {
  return { id: `s${ordre}`, ordre, consigne, acteur, pointControle: false, critique };
}

describe('buildLogiTechnicienSVG', () => {
  it('returns a non-empty SVG string', () => {
    const svg = buildLogiTechnicienSVG(
      [makeStep(1, 'Vérifier équipement')],
      [makeStep(1, 'Réaliser la tâche')],
      [],
    );
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('renders 3 phase headers (Préparation, Exécution, Fin de tâche) when steps are present', () => {
    const svg = buildLogiTechnicienSVG(
      [makeStep(1, 'Préparer')],
      [makeStep(1, 'Exécuter')],
      [makeStep(1, 'Nettoyer')],
    );
    expect(svg).toContain('PRÉPARATION');
    expect(svg).toContain('EXÉCUTION');
    expect(svg).toContain('FIN DE TÂCHE');
  });

  it('skips a phase header when its steps array is empty', () => {
    const svg = buildLogiTechnicienSVG(
      [makeStep(1, 'Préparer')],
      [],
      [],
    );
    expect(svg).toContain('PRÉPARATION');
    expect(svg).not.toContain('EXÉCUTION');
  });

  it('adds red border class marker for critique steps', () => {
    const svg = buildLogiTechnicienSVG(
      [makeStep(1, 'Critique', undefined, true)],
      [],
      [],
    );
    expect(svg).toContain('critique');
  });
});
