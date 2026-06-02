import { Link } from 'react-router-dom';

export default function HomePage() {
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
