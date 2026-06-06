import { describe, it, expect } from 'vitest';
import { rowToMo, moToRow } from '../useModeOperatoire';
import type { ModeOperatoire } from '../../types/modesOperatoires';

const MOCK_ROW = {
  id: 'uuid-1',
  user_id: 'user-1',
  title: 'Test MO',
  reference: 'MO-CONS-001',
  version: 'V1.0',
  document_date: '2026-06-06',
  operation_type: 'consignation',
  habilitations: ['B2', 'BC'],
  consignes_sse: { risques: ['R1'], reglesSecurite: [], consignesEnv: [], permisRequis: [] },
  epis: [{ id: 'e1', designation: 'Casque', obligatoire: true }],
  phases: { preparation: [], execution: [], finTache: [] },
  urgences: [],
  point_rassemblement: 'Parking',
  approvers: [],
  revisions: [],
  revision_frequency: 'Annuelle',
  status: 'brouillon',
  created_at: '2026-06-06T00:00:00Z',
  updated_at: '2026-06-06T00:00:00Z',
};

describe('rowToMo', () => {
  it('maps snake_case DB row to camelCase ModeOperatoire', () => {
    const mo = rowToMo(MOCK_ROW as Record<string, unknown>);
    expect(mo.id).toBe('uuid-1');
    expect(mo.userId).toBe('user-1');
    expect(mo.operationType).toBe('consignation');
    expect(mo.documentDate).toBe('2026-06-06');
    expect(mo.consignesSSE.risques).toEqual(['R1']);
    expect(mo.habilitations).toEqual(['B2', 'BC']);
    expect(mo.pointRassemblement).toBe('Parking');
    expect(mo.revisionFrequency).toBe('Annuelle');
  });
});

describe('moToRow', () => {
  it('maps camelCase ModeOperatoire to snake_case DB row', () => {
    const mo: Partial<ModeOperatoire> = {
      title: 'Test MO',
      operationType: 'consignation',
      documentDate: '2026-06-06',
      consignesSSE: { risques: [], reglesSecurite: [], consignesEnv: [], permisRequis: [] },
      pointRassemblement: 'Parking',
      revisionFrequency: 'Annuelle',
    };
    const row = moToRow(mo, 'user-1');
    expect(row.title).toBe('Test MO');
    expect(row.operation_type).toBe('consignation');
    expect(row.document_date).toBe('2026-06-06');
    expect(row.point_rassemblement).toBe('Parking');
    expect(row.revision_frequency).toBe('Annuelle');
    expect(row.user_id).toBe('user-1');
  });

  it('includes id when provided', () => {
    const mo: Partial<ModeOperatoire> = { id: 'uuid-1', title: 'X', operationType: 'hauteur' };
    const row = moToRow(mo, 'user-1');
    expect(row.id).toBe('uuid-1');
  });
});
