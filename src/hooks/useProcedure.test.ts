import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import { useProcedure } from './useProcedure';
import type { ProcedureDoc } from '../types/procedures';

const mockDoc: ProcedureDoc = {
  id: 'doc-1',
  userId: 'user-1',
  title: 'Plan de Prévention',
  reference: 'PR-QHSE-001',
  version: 'V1.0',
  documentDate: '2026-06-05',
  direction: 'QHSE',
  responsible: 'Marion HUBERT',
  status: 'brouillon',
  processParent: 'QHSE & Études',
  objective: 'Définir la procédure PP',
  domain: 'Toutes interventions EE',
  docsIn: 'Contrat',
  docsOut: 'PP signé',
  kpi: '100%',
  steps: [],
  risks: [],
  approvers: [],
  revisions: [],
  phaseCompleted: false,
  createdAt: '2026-06-05T00:00:00Z',
  updatedAt: '2026-06-05T00:00:00Z',
};

const mockSession = { user: { id: 'user-1', email: 'test@test.com' } } as Session;

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      match: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockDoc, error: null }),
      then: vi.fn().mockResolvedValue({ data: [mockDoc], error: null }),
    })),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { steps: [] }, error: null }),
    },
  },
}));

describe('useProcedure', () => {
  it('expose les méthodes CRUD attendues', () => {
    const { result } = renderHook(() => useProcedure(null));
    expect(typeof result.current.saveProcedure).toBe('function');
    expect(typeof result.current.deleteProcedure).toBe('function');
    expect(typeof result.current.callGenerateSteps).toBe('function');
    expect(typeof result.current.callAiSuggest).toBe('function');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('docs est un tableau vide quand session est null', () => {
    const { result } = renderHook(() => useProcedure(null));
    expect(result.current.docs).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('callGenerateSteps appelle la bonne edge function', async () => {
    const { supabase } = await import('../lib/supabase');
    const { result } = renderHook(() => useProcedure(mockSession));
    await act(async () => {
      await result.current.callGenerateSteps({
        description: 'Vérifier les EPI avant chantier',
        sector: 'BTP',
      });
    });
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'generate-procedure-steps',
      expect.objectContaining({ body: expect.objectContaining({ description: 'Vérifier les EPI avant chantier' }) }),
    );
  });
});
