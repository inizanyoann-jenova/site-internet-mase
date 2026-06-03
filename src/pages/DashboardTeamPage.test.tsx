import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DashboardTeamPage from './DashboardTeamPage';

// Mock supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [] }),
    })),
  },
}));

// Mock useCompany
vi.mock('../hooks/useCompany', () => ({
  useCompany: () => ({
    company: { id: 'company-1', name: 'ACME' },
    membership: { role: 'admin' },
    isLoading: false,
    error: null,
  }),
}));

// Mock DashboardGuard to avoid auth redirects
vi.mock('../components/dashboard/DashboardGuard', () => ({
  DashboardGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const fakeSession = {
  user: { id: 'user-1', email: 'admin@test.fr' },
  access_token: 'test-token',
} as any;

describe('DashboardTeamPage — message succès invitation', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, invite_url: 'https://app.fr/dashboard/rejoindre?token=abc123' }),
    });
  });

  it("affiche 'Invitation envoyée par email' sans l'URL brute", async () => {
    render(<DashboardTeamPage session={fakeSession} />);

    fireEvent.change(screen.getByPlaceholderText('email@entreprise.fr'), {
      target: { value: 'nouveau@test.fr' },
    });
    fireEvent.click(screen.getByText('+ Inviter'));

    await waitFor(() => {
      expect(screen.getByText(/Invitation envoyée par email à nouveau@test\.fr/)).toBeInTheDocument();
    });

    expect(screen.queryByText(/dashboard\/rejoindre/)).not.toBeInTheDocument();
  });
});
