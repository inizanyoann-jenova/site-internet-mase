import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from './DashboardPage';

vi.mock('../components/dashboard/DashboardGuard', () => ({
  DashboardGuard: () => <div>Cockpit COMEX</div>,
}));

vi.mock('../components/dashboard/DashboardLanding', () => ({
  DashboardLanding: () => <div>Page marketing landing</div>,
}));

describe('DashboardPage', () => {
  it('affiche la landing quand session est null', () => {
    render(
      <MemoryRouter>
        <DashboardPage session={null} />
      </MemoryRouter>
    );
    expect(screen.getByText('Page marketing landing')).toBeInTheDocument();
    expect(screen.queryByText('Cockpit COMEX')).not.toBeInTheDocument();
  });

  it('passe par DashboardGuard quand session existe', () => {
    const fakeSession = { user: { id: 'u1', email: 'x@y.com' } } as any;
    render(
      <MemoryRouter>
        <DashboardPage session={fakeSession} />
      </MemoryRouter>
    );
    expect(screen.getByText('Cockpit COMEX')).toBeInTheDocument();
    expect(screen.queryByText('Page marketing landing')).not.toBeInTheDocument();
  });
});
