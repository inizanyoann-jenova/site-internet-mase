// src/components/matrice/__tests__/matrice.utils.test.ts
import { describe, it, expect } from 'vitest';
import { computeRedundancy, getCoverageAlerts, matriceReducer } from '../matrice.utils';
import type { Comp, Employee, MatriceData } from '../types';
import { DEMO_DATA } from '../demoData';

const comp1: Comp = { id: 'c1', name: 'Soudure', categoryId: 'cat1', isKey: true, minBackups: 2 };
const comp2: Comp = { id: 'c2', name: 'Électrique', categoryId: 'cat1', isKey: false, minBackups: 1 };

const employees: Employee[] = [
  { id: 'e1', name: 'Alice', role: 'Op', isAbsent: false, absenceReason: '', skills: { c1: 3, c2: 2 } },
  { id: 'e2', name: 'Bob', role: 'Op', isAbsent: true, absenceReason: 'Maladie', skills: { c1: 2, c2: 1 } },
  { id: 'e3', name: 'Carla', role: 'Op', isAbsent: false, absenceReason: '', skills: { c1: 0, c2: 3 } },
];

describe('computeRedundancy', () => {
  it('compte les personnes niveau >= 2 (absents inclus)', () => {
    const result = computeRedundancy([comp1, comp2], employees);
    expect(result['c1']).toBe(2); // Alice(3) + Bob(2), Carla(0) exclue
    expect(result['c2']).toBe(2); // Alice(2) + Carla(3), Bob(1) exclu
  });
});

describe('getCoverageAlerts', () => {
  it('signale critique si 0 disponible sur poste clé', () => {
    const emps = employees.map(e => ({ ...e, isAbsent: true }));
    const alerts = getCoverageAlerts([comp1], emps);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].status).toBe('critical');
  });

  it('signale warning si sous le minBackups', () => {
    // Alice disponible (1 personne), minBackups = 2
    const emps = [employees[0], { ...employees[1], isAbsent: true }, { ...employees[2], skills: { c1: 0, c2: 3 } }];
    const alerts = getCoverageAlerts([comp1], emps);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].status).toBe('warning');
    expect(alerts[0].availableEmployees).toHaveLength(1);
  });

  it('ne signale rien si compétence non clé', () => {
    const emps = employees.map(e => ({ ...e, isAbsent: true }));
    const alerts = getCoverageAlerts([comp2], emps);
    expect(alerts).toHaveLength(0);
  });

  it('signale warning si 1 disponible sur poste clé avec minBackups=2', () => {
    const alerts = getCoverageAlerts([comp1], employees);
    // Alice dispo niveau 3 seulement (1 dispo), Bob absent, Carla niveau 0 → warning
    expect(alerts[0].status).toBe('warning');
  });
});

describe('matriceReducer — SET_SKILL', () => {
  it('met à jour le niveau d\'une compétence', () => {
    const state = DEMO_DATA;
    const next = matriceReducer(state, { type: 'SET_SKILL', employeeId: 'e1', compId: 'c1', level: 1 });
    expect(next.employees.find(e => e.id === 'e1')!.skills['c1']).toBe(1);
  });
});

describe('matriceReducer — ADD_COMP', () => {
  it('ajoute la compétence avec skills=0 pour tous les employés', () => {
    const state = DEMO_DATA;
    const next = matriceReducer(state, {
      type: 'ADD_COMP',
      comp: { name: 'Nouveau', categoryId: 'cat1', isKey: false, minBackups: 1 },
    });
    expect(next.comps).toHaveLength(state.comps.length + 1);
    const newId = next.comps[next.comps.length - 1].id;
    next.employees.forEach(e => expect(e.skills[newId]).toBe(0));
  });
});

describe('matriceReducer — DELETE_CATEGORY', () => {
  it('supprime la catégorie et ses compétences associées', () => {
    const state = DEMO_DATA;
    const next = matriceReducer(state, { type: 'DELETE_CATEGORY', id: 'cat1' });
    expect(next.config.categories.find(c => c.id === 'cat1')).toBeUndefined();
    expect(next.comps.every(c => c.categoryId !== 'cat1')).toBe(true);
  });
});
