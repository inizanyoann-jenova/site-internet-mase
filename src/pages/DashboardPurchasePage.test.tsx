import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DashboardPurchasePage from './DashboardPurchasePage';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

function renderWithRoute(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/dashboard/acheter${search}`]}>
      <Routes>
        <Route
          path="/dashboard/acheter"
          element={<DashboardPurchasePage session={null} />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('DashboardPurchasePage — sélection initiale du plan', () => {
  it('pré-sélectionne smi-monthly par défaut', () => {
    renderWithRoute('');
    const button = screen.getByText('SMI Dashboard — Mensuel').closest('button');
    expect(button?.className).toMatch(/ring-2/);
  });

  it('pré-sélectionne pack-monthly avec ?pack=complet', () => {
    renderWithRoute('?pack=complet');
    const button = screen.getByText('Pack MASE Complet — Mensuel').closest('button');
    expect(button?.className).toMatch(/ring-2/);
  });

  it('pré-sélectionne smi-lifetime avec ?plan=smi-lifetime', () => {
    renderWithRoute('?plan=smi-lifetime');
    const button = screen.getByText('SMI Dashboard — À vie').closest('button');
    expect(button?.className).toMatch(/ring-2/);
  });

  it('ignore un ?plan invalide et pré-sélectionne smi-monthly par défaut', () => {
    renderWithRoute('?plan=invalid');
    const button = screen.getByText('SMI Dashboard — Mensuel').closest('button');
    expect(button?.className).toMatch(/ring-2/);
  });
});
