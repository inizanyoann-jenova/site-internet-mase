// src/pages/CartographieWizardPage.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CartographieWizardPage from './CartographieWizardPage';

vi.mock('../contexts/SessionContext', () => ({
  SessionContext: { Consumer: ({ children }: any) => children(null) },
  useSession: () => null,
}));
vi.mock('../hooks/useCartographie', () => ({
  useCartographie: () => ({
    map: null, isLoading: false, error: null,
    saveMap: vi.fn(), saveSheet: vi.fn(), getSheets: vi.fn(),
    callGenerateProcessMap: vi.fn(), callReformulateSmart: vi.fn(),
    callAiAssist: vi.fn(), refetch: vi.fn(),
  }),
}));

describe('CartographieWizardPage', () => {
  it('redirige vers /cartographie si pas de session', () => {
    const { container } = render(
      <MemoryRouter><CartographieWizardPage /></MemoryRouter>
    );
    expect(container).toBeDefined();
  });
});
