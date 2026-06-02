import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCompany } from './useCompany';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '../lib/supabase';

const mockSession = {
  user: { id: 'user-123', email: 'test@test.com' },
} as any;

const mockCompany = {
  id: 'company-abc',
  name: 'ACME SAS',
  subscription_status: 'active',
  tool_slug: 'smi-dashboard',
};

const mockMembership = {
  id: 'member-1',
  company_id: 'company-abc',
  user_id: 'user-123',
  email: 'test@test.com',
  role: 'admin',
  accepted_at: '2026-06-02T10:00:00Z',
  company: mockCompany,
};

describe('useCompany', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne null quand pas de session', async () => {
    const { result } = renderHook(() => useCompany(null));
    expect(result.current.company).toBeNull();
    expect(result.current.membership).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('retourne la company et le membership pour un utilisateur membre', async () => {
    const mockSelect = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockMembership, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(mockSelect as any);

    const { result } = renderHook(() => useCompany(mockSession));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.membership?.role).toBe('admin');
    expect(result.current.company?.name).toBe('ACME SAS');
  });

  it('retourne null quand aucun membership trouvé', async () => {
    const mockSelect = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(mockSelect as any);

    const { result } = renderHook(() => useCompany(mockSession));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.company).toBeNull();
    expect(result.current.membership).toBeNull();
  });
});
