import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface NotifyModalProps {
  toolName: string;
  toolSlug: string;
  onClose: () => void;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export function NotifyModal({ toolName, toolSlug, onClose }: NotifyModalProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    const { error } = await supabase
      .from('tool_notifications')
      .insert({ email, tool_slug: toolSlug });
    setStatus(error ? 'error' : 'success');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="×"
          className="absolute right-4 top-4 text-xl text-slate-400 hover:text-slate-700"
        >
          ×
        </button>

        <h2 className="mb-1 text-lg font-bold text-[var(--mase-heading)]">
          Être notifié pour {toolName}
        </h2>
        <p className="mb-6 text-sm text-[var(--mase-muted)]">
          On vous prévient dès que l'outil est disponible.
        </p>

        {status === 'success' ? (
          <p className="text-center font-semibold text-emerald-600">
            ✓ Inscrit ! Vous serez notifié à la sortie.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="rounded-xl border border-[var(--mase-border)] px-4 py-3 text-sm outline-none focus:border-[var(--mase-primary)] focus:ring-2 focus:ring-[var(--mase-primary)]/20"
            />
            {status === 'error' && (
              <p className="text-xs text-red-500">
                Une erreur est survenue. Réessayez.
              </p>
            )}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="rounded-full py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: 'var(--mase-primary)' }}
            >
              {status === 'loading' ? 'Envoi…' : "M'inscrire"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
