// src/hooks/useCartographie.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

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
});
