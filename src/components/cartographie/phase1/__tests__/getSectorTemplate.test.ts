import { describe, it, expect } from 'vitest';
import { getSectorTemplate, SECTOR_TEMPLATES } from '../Step2AIGeneration';

describe('getSectorTemplate — régression', () => {
  it('retourne btp pour "btp travaux"', () => {
    expect(getSectorTemplate('btp travaux')).toBe(SECTOR_TEMPLATES.btp);
  });

  it('retourne btp pour "construction"', () => {
    expect(getSectorTemplate('construction')).toBe(SECTOR_TEMPLATES.btp);
  });

  it('retourne btp pour "chantier"', () => {
    expect(getSectorTemplate('chantier bâtiment')).toBe(SECTOR_TEMPLATES.btp);
  });

  it('retourne maintenance pour "maintenance industrielle"', () => {
    expect(getSectorTemplate('maintenance industrielle')).toBe(SECTOR_TEMPLATES.maintenance);
  });

  it('retourne maintenance pour "entretien équipements"', () => {
    expect(getSectorTemplate('entretien équipements')).toBe(SECTOR_TEMPLATES.maintenance);
  });

  it('retourne generique pour un secteur inconnu', () => {
    expect(getSectorTemplate('logistique')).toBe(SECTOR_TEMPLATES.generique);
  });

  it('retourne generique pour une chaîne vide', () => {
    expect(getSectorTemplate('')).toBe(SECTOR_TEMPLATES.generique);
  });
});

describe('getSectorTemplate — électricité (doit échouer avant Task 3)', () => {
  it('retourne electricite pour "électricité CFO CFA"', () => {
    expect(getSectorTemplate('électricité CFO CFA')).toBe(SECTOR_TEMPLATES.electricite);
  });

  it('retourne electricite pour "courant fort"', () => {
    expect(getSectorTemplate('courant fort bâtiment')).toBe(SECTOR_TEMPLATES.electricite);
  });

  it('retourne electricite pour "génie électrique"', () => {
    expect(getSectorTemplate('génie électrique')).toBe(SECTOR_TEMPLATES.electricite);
  });
});
