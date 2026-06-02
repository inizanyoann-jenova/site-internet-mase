import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotifyModal } from './NotifyModal';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

describe('NotifyModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    onClose.mockClear();
    vi.clearAllMocks();
  });

  it("affiche le nom de l'outil dans le titre", () => {
    render(
      <NotifyModal toolName="Document Unique" toolSlug="document-unique" onClose={onClose} />
    );
    expect(screen.getByText(/Document Unique/)).toBeInTheDocument();
  });

  it("n'appelle pas supabase si l'email est vide", async () => {
    const { supabase } = await import('../lib/supabase');
    render(
      <NotifyModal toolName="Document Unique" toolSlug="document-unique" onClose={onClose} />
    );
    fireEvent.click(screen.getByRole('button', { name: /M'inscrire/ }));
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('affiche "Inscrit !" après un insert réussi', async () => {
    render(
      <NotifyModal toolName="Document Unique" toolSlug="document-unique" onClose={onClose} />
    );
    fireEvent.change(screen.getByPlaceholderText(/votre@email.com/), {
      target: { value: 'user@test.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /M'inscrire/ }));
    await waitFor(() => expect(screen.getByText(/Inscrit/)).toBeInTheDocument());
  });

  it('ferme le modal au clic sur la croix', () => {
    render(
      <NotifyModal toolName="Document Unique" toolSlug="document-unique" onClose={onClose} />
    );
    fireEvent.click(screen.getByRole('button', { name: /×/ }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
