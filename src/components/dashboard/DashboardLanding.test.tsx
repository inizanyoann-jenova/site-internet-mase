import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardLanding } from './DashboardLanding';

vi.mock('../AuthButton', () => ({
  AuthButton: () => <button>Se connecter</button>,
}));

function renderLanding() {
  return render(
    <MemoryRouter>
      <DashboardLanding />
    </MemoryRouter>
  );
}

describe('DashboardLanding', () => {
  it('affiche le titre principal', () => {
    renderLanding();
    expect(screen.getByText(/Pilotez votre SMI/)).toBeInTheDocument();
  });

  it('affiche les 12 modules', () => {
    renderLanding();
    expect(screen.getByText('DUERP')).toBeInTheDocument();
    expect(screen.getByText('Habilitations')).toBeInTheDocument();
    expect(screen.getByText('Cockpit COMEX')).toBeInTheDocument();
  });

  it('CTA mensuel pointe vers /dashboard/acheter', () => {
    renderLanding();
    const link = screen.getByRole('link', { name: /15 €\/mois/ });
    expect(link).toHaveAttribute('href', '/dashboard/acheter');
  });

  it('CTA à vie pointe vers /dashboard/acheter?plan=smi-lifetime', () => {
    renderLanding();
    const links = screen.getAllByRole('link', { name: /299 €/ });
    expect(links[0]).toHaveAttribute('href', '/dashboard/acheter?plan=smi-lifetime');
  });

  it('lien retour accueil pointe vers /', () => {
    renderLanding();
    const link = screen.getByRole('link', { name: /Accueil/ });
    expect(link).toHaveAttribute('href', '/');
  });
});
