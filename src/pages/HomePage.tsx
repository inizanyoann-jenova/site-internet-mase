import { useState } from 'react';
import { Link } from 'react-router-dom';
import { NotifyModal } from '../components/NotifyModal';

type ModalState = { toolName: string; toolSlug: string } | null;

export default function HomePage() {
  const [modal, setModal] = useState<ModalState>(null);
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f3' }}>

      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-3"
        style={{ backgroundColor: 'var(--mase-primary)' }}
      >
        <span className="text-lg font-bold text-white">MASE</span>
        <Link
          to="/outil"
          className="text-sm text-white/70 transition hover:text-white"
        >
          Se connecter
        </Link>
      </nav>

      {/* Hero */}
      <section
        className="relative overflow-hidden px-6 py-20 text-center"
        style={{
          background: 'linear-gradient(135deg, var(--mase-primary), #1e4d7b)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.06), transparent 60%)',
          }}
        />
        <span
          className="relative mb-4 inline-block rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white"
          style={{
            backgroundColor: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          🌿 Plateforme MASE · Conforme V2024
        </span>
        <h1 className="relative mt-4 text-3xl font-extrabold text-white sm:text-4xl">
          Toute la documentation MASE,<br />facile
        </h1>
        <p className="relative mt-4 text-base text-white/70">
          Les outils pour obtenir et renouveler votre certification MASE
        </p>
        <a
          href="#outils"
          className="relative mt-8 inline-block rounded-full px-8 py-3 text-sm font-bold text-[var(--mase-primary)] transition hover:opacity-90"
          style={{
            backgroundColor: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          Découvrir les outils ↓
        </a>
      </section>

      {/* Grille d'outils */}
      <section id="outils" className="bg-white px-6 py-14">
        <p className="mb-10 text-center text-xs font-bold uppercase tracking-widest text-[var(--mase-muted)]">
          Nos outils
        </p>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">

          {/* Politique SSE — disponible */}
          <div
            className="flex flex-col items-center rounded-2xl p-7 text-center transition-all duration-200 hover:-translate-y-1"
            style={{
              background: 'linear-gradient(145deg, #dcfce7, #bbf7d0)',
              border: '1.5px solid #86efac',
              boxShadow: '0 2px 8px rgba(22,101,52,0.12)',
            }}
            onMouseEnter={e =>
              ((e.currentTarget as HTMLDivElement).style.boxShadow =
                '0 8px 20px rgba(22,101,52,0.18)')
            }
            onMouseLeave={e =>
              ((e.currentTarget as HTMLDivElement).style.boxShadow =
                '0 2px 8px rgba(22,101,52,0.12)')
            }
          >
            <span className="mb-3 text-4xl">📋</span>
            <span className="mb-1 inline-block rounded-full bg-[var(--mase-primary)] px-3 py-0.5 text-xs font-bold text-white">
              ✓ Disponible
            </span>
            <h2 className="mt-3 text-base font-extrabold text-[var(--mase-heading)]">
              Politique SSE
            </h2>
            <p className="mt-1 text-xs text-[var(--mase-muted)]">
              Conforme Exig. 1.2 MASE V2024 · 10 min
            </p>
            <div className="mt-4">
              <span className="text-2xl font-extrabold text-[var(--mase-heading)]">
                29 €
              </span>
              <span className="ml-1 text-xs text-[var(--mase-muted)]">
                paiement unique
              </span>
            </div>
            <Link
              to="/outil"
              className="mt-5 inline-block rounded-full px-7 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: 'var(--mase-primary)' }}
            >
              Démarrer →
            </Link>
          </div>

          {/* Document Unique — bientôt */}
          <div
            className="flex flex-col items-center rounded-2xl p-7 text-center transition-all duration-200 hover:-translate-y-1"
            style={{
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              opacity: 0.85,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
              (e.currentTarget as HTMLDivElement).style.opacity = '1';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              (e.currentTarget as HTMLDivElement).style.opacity = '0.85';
            }}
          >
            <span className="mb-3 text-4xl">📂</span>
            <span className="mb-1 inline-block rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-400">
              Bientôt
            </span>
            <h2 className="mt-3 text-base font-extrabold text-[var(--mase-heading)]">
              Document Unique
            </h2>
            <p className="mt-1 text-xs text-[var(--mase-muted)]">
              Évaluation des risques professionnels
            </p>
            <button
              onClick={() =>
                setModal({ toolName: 'Document Unique', toolSlug: 'document-unique' })
              }
              className="mt-6 rounded-full px-7 py-2.5 text-sm font-bold transition hover:bg-[var(--mase-primary)] hover:text-white"
              style={{
                background: 'white',
                border: '1.5px solid var(--mase-primary)',
                color: 'var(--mase-primary)',
              }}
            >
              🔔 Me notifier
            </button>
          </div>

          {/* Plan de Prévention — bientôt */}
          <div
            className="flex flex-col items-center rounded-2xl p-7 text-center transition-all duration-200 hover:-translate-y-1"
            style={{
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              opacity: 0.85,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
              (e.currentTarget as HTMLDivElement).style.opacity = '1';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              (e.currentTarget as HTMLDivElement).style.opacity = '0.85';
            }}
          >
            <span className="mb-3 text-4xl">🛡️</span>
            <span className="mb-1 inline-block rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-400">
              Bientôt
            </span>
            <h2 className="mt-3 text-base font-extrabold text-[var(--mase-heading)]">
              Plan de Prévention
            </h2>
            <p className="mt-1 text-xs text-[var(--mase-muted)]">
              Co-activité et sous-traitance
            </p>
            <button
              onClick={() =>
                setModal({ toolName: 'Plan de Prévention', toolSlug: 'plan-prevention' })
              }
              className="mt-6 rounded-full px-7 py-2.5 text-sm font-bold transition hover:bg-[var(--mase-primary)] hover:text-white"
              style={{
                background: 'white',
                border: '1.5px solid var(--mase-primary)',
                color: 'var(--mase-primary)',
              }}
            >
              🔔 Me notifier
            </button>
          </div>

        </div>
      </section>

      {/* Modal */}
      {modal && (
        <NotifyModal
          toolName={modal.toolName}
          toolSlug={modal.toolSlug}
          onClose={() => setModal(null)}
        />
      )}

      {/* Comment ça marche — Politique SSE */}
      <section
        className="px-6 py-14"
        style={{ backgroundColor: 'var(--mase-card-strong)' }}
      >
        <p className="mb-10 text-center text-xs font-bold uppercase tracking-widest text-[var(--mase-muted)]">
          Comment fonctionne la Politique SSE
        </p>
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: '📋', step: '1 — Diagnostic', desc: '~20 questions SWOT + PESTEL SSE' },
            { icon: '⚡', step: '2 — Génération', desc: 'Politique personnalisée à votre profil' },
            { icon: '📥', step: '3 — Téléchargement', desc: 'DOCX + PDF prêts à dater et signer' },
          ].map(({ icon, step, desc }) => (
            <div
              key={step}
              className="rounded-2xl bg-white p-5 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-2 text-3xl">{icon}</div>
              <div className="text-sm font-semibold text-[var(--mase-heading)]">{step}</div>
              <div className="mt-1 text-xs text-[var(--mase-muted)]">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Ce que contient le document */}
      <section className="bg-white px-6 py-14">
        <p className="mb-10 text-center text-xs font-bold uppercase tracking-widest text-[var(--mase-muted)]">
          Ce que contient le document
        </p>
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            'Préambule & engagement employeur',
            '6 principes essentiels SSE (§1.2.1)',
            'Engagements Sécurité, Santé, Environnement (§1.2.4/5/6)',
            'Axes prioritaires personnalisés',
            "Démarche d'amélioration continue",
            'Date + signature employeur (§1.2.2)',
          ].map(item => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ backgroundColor: '#f0f7ff' }}
            >
              <span className="text-base font-bold text-[var(--mase-primary)]">✓</span>
              <span className="text-sm text-slate-700">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer provisoire */}
      <footer
        className="px-6 py-4 text-center"
        style={{ backgroundColor: 'var(--mase-primary)' }}
      >
        <span className="text-xs text-white/40">
          © 2026 MASE Tools — Toute la documentation certifiante.
        </span>
      </footer>

    </div>
  );
}
