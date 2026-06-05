import { describe, it, expect } from 'vitest';
import type {
  ProcessDefinition, ProcessMap, SmartObjective,
} from './cartographie';

describe('Cartographie types', () => {
  it('ProcessDefinition accepte un processus de réalisation complet', () => {
    const p: ProcessDefinition = {
      id: crypto.randomUUID(),
      type: 'realisation',
      name: 'Gestion des chantiers',
      pilotName: 'Jean Dupont',
      pilotRole: 'Chef de chantier',
      inputElement: 'Devis signé',
      outputElement: 'PV de réception',
    };
    expect(p.type).toBe('realisation');
    expect(p.inputElement).toBeDefined();
  });

  it('ProcessMap a phase1Completed false par défaut', () => {
    const map: ProcessMap = {
      companyName: 'Test SARL',
      sector: 'BTP',
      headcount: 15,
      sseManagerName: 'Marie Martin',
      sseManagerRole: 'Responsable SSE',
      documentDate: '2026-06-05',
      phase1Completed: false,
      phase2Completed: false,
      cartographyData: { processes: [] },
    };
    expect(map.phase1Completed).toBe(false);
    expect(map.cartographyData.processes).toHaveLength(0);
  });

  it('SmartObjective a tous les champs requis', () => {
    const smart: SmartObjective = {
      rawText: 'Livrer à temps',
      objectiveText: 'Atteindre 90% de chantiers livrés dans les délais',
      indicator: 'Taux de respect des délais',
      target: '90%',
      frequency: 'Mensuelle',
      deadline: '2026-12-31',
    };
    expect(smart.target).toBe('90%');
  });
});
