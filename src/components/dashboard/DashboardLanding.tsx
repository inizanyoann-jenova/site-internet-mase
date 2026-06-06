import { Link } from 'react-router-dom';
import { AuthButton } from '../AuthButton';

const MODULES = [
  { icon: '📊', name: 'Cockpit COMEX', desc: 'Score global' },
  { icon: '📋', name: 'DUERP', desc: 'Registre des risques' },
  { icon: '✅', name: "Plan d'actions", desc: 'PDCA' },
  { icon: '🚨', name: 'Accidents', desc: 'Déclaration & suivi' },
  { icon: '🎓', name: 'Habilitations', desc: "Alertes d'expiration" },
  { icon: '📈', name: 'KPIs Sécurité', desc: 'TF, TG, heures' },
  { icon: '🏛️', name: 'Revue Direction', desc: 'Comptes-rendus' },
  { icon: '🎯', name: 'Objectifs QHSE', desc: 'Suivi annuel' },
  { icon: '🔍', name: 'Audits Qualité', desc: 'Résultats & écarts' },
  { icon: '👥', name: 'Social RH', desc: 'AT, formations' },
  { icon: '📅', name: 'Réunions QHSE', desc: 'CSE, SST…' },
  { icon: '📦', name: 'Export / Archives', desc: 'Excel + PDF' },
];

export function DashboardLanding() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f3' }}>

      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-3"
        style={{ backgroundColor: 'var(--mase-primary)' }}
      >
        <span className="text-lg font-bold text-white">MASE</span>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm text-white/70 transition hover:text-white">
            ← Accueil
          </Link>
          <AuthButton session={null} />
        </div>
      </nav>

      {/* Hero */}
      <section
        className="px-6 py-20 text-center"
        style={{ background: 'linear-gradient(135deg, #6d28d9, #4c1d95)' }}
      >
        <span
          className="mb-4 inline-block rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white"
          style={{
            backgroundColor: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          🏭 SMI Dashboard QHSE
        </span>
        <h1 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">
          Pilotez votre SMI<br />en un seul endroit
        </h1>
        <p className="mt-4 text-base text-white/70">
          12 modules QHSE intégrés · Conforme MASE V2024 · Multi-utilisateurs
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/dashboard/acheter"
            className="rounded-full px-8 py-3 text-sm font-bold transition hover:opacity-90"
            style={{ backgroundColor: 'white', color: '#7c3aed' }}
          >
            Démarrer à 15 €/mois →
          </Link>
          <Link
            to="/dashboard/acheter?plan=smi-lifetime"
            className="rounded-full px-8 py-3 text-sm font-bold text-white transition hover:opacity-90"
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            299 € accès à vie
          </Link>
        </div>
      </section>

      {/* 12 modules */}
      <section className="px-6 py-14" style={{ backgroundColor: 'var(--mase-card-strong)' }}>
        <p className="mb-10 text-center text-xs font-bold uppercase tracking-widest text-[var(--mase-muted)]">
          12 modules inclus
        </p>
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {MODULES.map(({ icon, name, desc }) => (
            <div
              key={name}
              className="rounded-2xl bg-white p-4 text-center shadow-sm"
            >
              <div className="text-2xl">{icon}</div>
              <div className="mt-2 text-sm font-bold text-[var(--mase-heading)]">{name}</div>
              <div className="mt-0.5 text-xs text-[var(--mase-muted)]">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white px-6 py-14">
        <p className="mb-10 text-center text-xs font-bold uppercase tracking-widest text-[var(--mase-muted)]">
          Tarifs
        </p>
        <div className="mx-auto grid max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
          <div
            className="rounded-2xl p-6 text-center"
            style={{ border: '1.5px solid #a78bfa' }}
          >
            <div className="text-2xl font-extrabold text-[var(--mase-heading)]">15 €</div>
            <div className="text-xs text-[var(--mase-muted)]">/mois · résiliable</div>
            <Link
              to="/dashboard/acheter"
              className="mt-4 inline-block w-full rounded-full py-2.5 text-sm font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: '#7c3aed' }}
            >
              Choisir →
            </Link>
          </div>
          <div
            className="relative rounded-2xl p-6 text-center"
            style={{ border: '2px solid #f59e0b' }}
          >
            <span
              className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-bold text-white"
              style={{ backgroundColor: '#f59e0b', whiteSpace: 'nowrap' }}
            >
              ⭐ BEST VALUE
            </span>
            <div className="text-2xl font-extrabold text-[var(--mase-heading)]">299 €</div>
            <div className="text-xs text-[var(--mase-muted)]">accès à vie</div>
            <Link
              to="/dashboard/acheter?plan=smi-lifetime"
              className="mt-4 inline-block w-full rounded-full py-2.5 text-sm font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: '#f59e0b' }}
            >
              Choisir →
            </Link>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          Paiement sécurisé Stripe · Multi-utilisateurs inclus
        </p>
      </section>

      {/* Footer */}
      <footer
        className="px-6 py-4 text-center"
        style={{ backgroundColor: 'var(--mase-primary)' }}
      >
        <span className="text-xs text-white/40">
          © 2026 CertifMASE — Toute la documentation certifiante.
        </span>
      </footer>

    </div>
  );
}
