import { describe, it, expect } from 'vitest';
import type {
  StepDefinition, ProcedureDoc, RiskItem, Approver, Revision,
} from './procedures';

describe('procedures types', () => {
  it('StepDefinition activité a les champs requis', () => {
    const step: StepDefinition = {
      id: 'step-1',
      type: 'activite',
      num: 1,
      activite: 'Identifier le besoin',
      acteur: 'Responsable QHSE',
      routeTypeAct: 'next',
      routeSideAct: 'auto',
    };
    expect(step.type).toBe('activite');
    expect(step.num).toBe(1);
  });

  it('StepDefinition décision a les champs OUI/NON', () => {
    const step: StepDefinition = {
      id: 'step-2',
      type: 'decision',
      num: 2,
      activite: 'Le seuil est-il dépassé ?',
      acteur: 'Responsable QHSE',
      ouiLabel: 'OUI',
      routeTypeOui: 'next',
      routeSideOui: 'auto',
      nonLabel: 'NON',
      nonAction: 'Classer le dossier',
      nonActor: 'Assistant',
      routeTypeNon: 'end',
      routeSideNon: 'right',
    };
    expect(step.type).toBe('decision');
    expect(step.ouiLabel).toBe('OUI');
    expect(step.nonAction).toBe('Classer le dossier');
  });

  it('ProcedureDoc a toutes les propriétés requises', () => {
    const doc: ProcedureDoc = {
      title: 'Plan de Prévention',
      reference: 'PR-QHSE-001',
      version: 'V1.0',
      documentDate: '2026-06-05',
      direction: 'QHSE',
      responsible: 'Marion HUBERT',
      status: 'brouillon',
      processParent: 'QHSE & Études',
      objective: 'Définir la procédure...',
      domain: 'Toutes interventions EE',
      docsIn: 'Contrat, DUER',
      docsOut: 'PP signé',
      kpi: '100% interventions couvertes',
      steps: [],
      risks: [],
      approvers: [],
      revisions: [],
      phaseCompleted: false,
    };
    expect(doc.status).toBe('brouillon');
    expect(doc.steps).toHaveLength(0);
  });

  it('RiskItem a niveau parmi low/med/high', () => {
    const risk: RiskItem = {
      id: 'r1',
      risque: 'Intervention sans PP',
      niveau: 'high',
      controle: 'Suspension immédiate',
    };
    expect(['low', 'med', 'high']).toContain(risk.niveau);
  });

  it('PROCEDURE_TEMPLATES contient au moins 5 modèles', () => {
    const { PROCEDURE_TEMPLATES } = require('./procedures.ts');
    expect(PROCEDURE_TEMPLATES.length).toBeGreaterThanOrEqual(5);
    expect(PROCEDURE_TEMPLATES[0]).toHaveProperty('label');
    expect(PROCEDURE_TEMPLATES[0]).toHaveProperty('doc');
  });
});
