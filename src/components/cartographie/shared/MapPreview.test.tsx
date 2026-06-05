import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MapPreview from './MapPreview';
import type { ProcessDefinition } from '../../../types/cartographie';

const PROCESSES: ProcessDefinition[] = [
  { id: 'p1', type: 'pilotage', name: 'Direction', pilotName: 'Jean', pilotRole: 'Dirigeant' },
  { id: 'p2', type: 'realisation', name: 'Chantiers', pilotName: 'Marie', pilotRole: 'Chef', inputElement: 'Devis', outputElement: 'PV' },
  { id: 'p3', type: 'support', name: 'RH', pilotName: 'Paul', pilotRole: 'DRH', linkedRealisationIds: ['p2'] },
];

describe('MapPreview', () => {
  it('affiche les 3 zones pilotage/réalisation/support', () => {
    render(<MapPreview processes={PROCESSES} companyName="Test SARL" />);
    expect(screen.getByText('PROCESSUS DE PILOTAGE')).toBeDefined();
    expect(screen.getByText('PROCESSUS DE RÉALISATION')).toBeDefined();
    expect(screen.getByText('PROCESSUS SUPPORT')).toBeDefined();
  });

  it('affiche les noms des processus', () => {
    render(<MapPreview processes={PROCESSES} companyName="Test SARL" />);
    expect(screen.getByText('Direction')).toBeDefined();
    expect(screen.getByText('Chantiers')).toBeDefined();
    expect(screen.getByText('RH')).toBeDefined();
  });

  it('affiche CLIENT à gauche et à droite', () => {
    render(<MapPreview processes={PROCESSES} companyName="Test SARL" />);
    const clientEls = screen.getAllByText('CLIENT');
    expect(clientEls.length).toBe(2);
  });

  it('affiche les éléments entrants/sortants', () => {
    render(<MapPreview processes={PROCESSES} companyName="Test SARL" />);
    expect(screen.getByText('Devis')).toBeDefined();
    expect(screen.getByText('PV')).toBeDefined();
  });
});
