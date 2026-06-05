import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LogigrammePreview from './LogigrammePreview';
import type { StepDefinition } from '../../../types/procedures';

const step: StepDefinition = {
  id: 's1', type: 'activite', num: 1,
  activite: 'Identifier le besoin', acteur: 'QHSE',
  routeTypeAct: 'end', routeSideAct: 'auto',
};

describe('LogigrammePreview', () => {
  it('affiche le conteneur SVG avec les étapes', () => {
    const { container } = render(<LogigrammePreview steps={[step]} isSwim={false} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('affiche un message vide si aucune étape', () => {
    render(<LogigrammePreview steps={[]} isSwim={false} />);
    expect(screen.getByText(/ajoutez des étapes/i)).toBeTruthy();
  });

  it('affiche la légende', () => {
    render(<LogigrammePreview steps={[step]} isSwim={false} />);
    expect(screen.getAllByText('QHSE').length).toBeGreaterThan(0);
  });
});
