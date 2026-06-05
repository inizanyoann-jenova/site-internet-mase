// src/hooks/useCartographie.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null }),
    single: vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { processes: [] }, error: null }),
    },
  },
}));

import { useCartographie } from './useCartographie';

describe('useCartographie', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retourne isLoading=false et map=null si pas de session', () => {
    const { result } = renderHook(() => useCartographie(null));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.map).toBeNull();
  });

  it('expose saveMap comme fonction', () => {
    const { result } = renderHook(() => useCartographie(null));
    expect(typeof result.current.saveMap).toBe('function');
  });

  it('expose callGenerateProcessMap comme fonction', () => {
    const { result } = renderHook(() => useCartographie(null));
    expect(typeof result.current.callGenerateProcessMap).toBe('function');
  });

  it('expose callReformulateSmart comme fonction', () => {
    const { result } = renderHook(() => useCartographie(null));
    expect(typeof result.current.callReformulateSmart).toBe('function');
  });

  it('expose callAiAssist comme fonction', () => {
    const { result } = renderHook(() => useCartographie(null));
    expect(typeof result.current.callAiAssist).toBe('function');
  });

  it('expose getSheets comme fonction', () => {
    const { result } = renderHook(() => useCartographie(null));
    expect(typeof result.current.getSheets).toBe('function');
  });

  it('callGenerateProcessMap lance une erreur si data.error est défini', async () => {
    const { supabase } = await import('../lib/supabase');
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: { error: 'Mistral error' },
      error: null,
    });
    const mockSession = { user: { id: 'user-1', email: 'test@test.com' } } as Session;
    const { result } = renderHook(() => useCartographie(mockSession));
    await expect(
      result.current.callGenerateProcessMap({ companyName: 'Test', sector: 'BTP', city: 'Lyon' })
    ).rejects.toThrow('Mistral error');
  });

  it('getSheets retourne un tableau vide si pas de données', async () => {
    const { supabase } = await import('../lib/supabase');
    const selectMock = { data: [], error: null };
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue(selectMock),
      }),
    } as any);
    const { result } = renderHook(() => useCartographie(null));
    const sheets = await result.current.getSheets('map-123');
    expect(sheets).toEqual([]);
  });

  it('saveMap lance une erreur si pas de session', async () => {
    const { result } = renderHook(() => useCartographie(null));
    await expect(
      result.current.saveMap({ companyName: 'Test SARL' })
    ).rejects.toThrow('Non connecté');
  });
});
