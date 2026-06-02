import { Link } from 'react-router-dom';

const MASE_SECTIONS = [
  'Préambule & engagement employeur',
  '6 principes essentiels SSE (§1.2.1)',
  'Engagements Sécurité, Santé, Environnement (§1.2.4/5/6)',
  'Axes prioritaires personnalisés',
  "Démarche d'amélioration continue",
  'Date + signature employeur (§1.2.2)',
];

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f3' }}>

      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-3"
        style={{ backgroundColor: 'var(--mase-primary)' }}
      >
        <span className="text-lg font-bold text-white">MASE Tools</span>
        <Link
          to="/outil"
          className="text-sm text-white/70 transition hover:text-white"
        >
          Accéder à l'outil →
        </Link>
      </nav>

      {/* Section 1 — Hero */}
      <section
        className="px-6 py-16 text-center"
        style={{ background: 'linear-gradient(135deg, var(--mase-primary), #2d5a8e)' }}
      >
        <span
          className="mb-4 inline-block rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
        >
          Conforme MASE V2024 — Exigence 1.2
        </span>
        <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
          Générez votre Politique SSE<br />en 10 minutes
        </h1>
        <p className="mt-4 text-base text-white/70">
          Questionnaire guidé · Document Word + PDF prêts à signer · Adapté à votre profil d'entreprise
        </p>
        <Link
          to="/outil"
          className="mt-8 inline-block rounded-full px-8 py-3 text-sm font-bold text-gray-900 transition hover:opacity-90"
          style={{ backgroundColor: '#f59e0b' }}
        >
          Démarrer le diagnostic →
        </Link>
      </section>

      {/* Section 2 — Comment ça marche */}
      <section
        className="px-6 py-12"
        style={{ backgroundColor: 'var(--mase-card-strong)' }}
      >
        <p className="mb-8 text-center text-xs font-bold uppercase tracking-widest text-[var(--mase-muted)]">
          Comment ça marche
        </p>
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: '📋', step: '1 — Diagnostic', desc: '~20 questions SWOT + PESTEL SSE' },
            { icon: '⚡', step: '2 — Génération', desc: 'Politique personnalisée à votre profil' },
            { icon: '📥', step: '3 — Téléchargement', desc: 'DOCX + PDF prêts à dater et signer' },
          ].map(({ icon, step, desc }) => (
            <div key={step} className="rounded-2xl bg-white p-5 text-center shadow-sm">
              <div className="mb-2 text-3xl">{icon}</div>
              <div className="text-sm font-semibold text-[var(--mase-heading)]">{step}</div>
              <div className="mt-1 text-xs text-[var(--mase-muted)]">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3 — Ce que contient le document */}
      <section className="bg-white px-6 py-12">
        <p className="mb-8 text-center text-xs font-bold uppercase tracking-widest text-[var(--mase-muted)]">
          Ce que contient le document
        </p>
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
          {MASE_SECTIONS.map((item) => (
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

      {/* Section 4 — Tarif */}
      <section
        className="px-6 py-12 text-center"
        style={{ backgroundColor: 'var(--mase-card-strong)' }}
      >
        <p className="mb-8 text-xs font-bold uppercase tracking-widest text-[var(--mase-muted)]">
          Tarif
        </p>
        <div className="mx-auto inline-block rounded-3xl bg-white px-10 py-8 shadow-lg">
          <div className="text-4xl font-extrabold text-[var(--mase-heading)]">29 €</div>
          <div className="mt-1 text-sm text-[var(--mase-muted)]">
            paiement unique — accès permanent
          </div>
          <div className="mt-4 inline-block rounded-lg bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            ✓ Conforme exigence 1.2 MASE V2024
          </div>
          <ul className="mt-4 space-y-1 text-sm text-[var(--mase-muted)]">
            <li>✓ Document Word éditable + PDF</li>
            <li>✓ Personnalisé à votre profil d'entreprise</li>
          </ul>
          <Link
            to="/outil"
            className="mt-6 inline-block rounded-full px-8 py-3 text-sm font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: 'var(--mase-primary)' }}
          >
            Démarrer →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-6 py-4 text-center"
        style={{ backgroundColor: 'var(--mase-primary)' }}
      >
        <span className="text-xs text-white/40">
          © 2026 MASE Tools — Outil d'aide à la conformité
        </span>
      </footer>

    </div>
  );
}
