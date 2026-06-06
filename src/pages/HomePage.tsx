import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  LayoutGrid,
  Map,
  ClipboardList,
  BarChart3,
  Package,
  FileQuestion,
  CheckCircle2,
  ArrowRight,
  Shield,
  Award,
  Zap,
  Bell,
  ChevronRight,
  Users,
  Star,
} from 'lucide-react';
import { NotifyModal } from '../components/NotifyModal';

type ModalState = { toolName: string; toolSlug: string } | null;

/* ── Données outils ─────────────────────────────────────────────────── */
const TOOLS_AVAILABLE = [
  {
    id: 'sse',
    icon: FileText,
    label: 'Politique SSE',
    badge: 'Disponible',
    badgeColor: '#166534',
    desc: 'Conforme Exig. 1.2 MASE V2024 · Générée en 10 min',
    price: '19 €',
    priceSub: 'paiement unique',
    to: '/outil',
    accentBg: '#f0fdf4',
    accentBorder: '#bbf7d0',
    accentIcon: '#16a34a',
  },
  {
    id: 'matrice',
    icon: LayoutGrid,
    label: 'Matrice de Polyvalence',
    badge: 'Disponible',
    badgeColor: '#166534',
    desc: 'Polyvalence & redondance des compétences · MASE',
    price: '19 €',
    priceSub: 'paiement unique',
    to: '/matrice-polyvalence',
    accentBg: '#eff6ff',
    accentBorder: '#bfdbfe',
    accentIcon: '#2563eb',
  },
  {
    id: 'carto',
    icon: Map,
    label: 'Cartographie des Processus',
    badge: 'Disponible',
    badgeColor: '#166534',
    desc: 'Logigramme + fiches de processus avec objectifs SMART, assisté par IA',
    price: '49 €',
    priceSub: 'accès à vie',
    to: '/cartographie',
    accentBg: '#fdf4ff',
    accentBorder: '#e9d5ff',
    accentIcon: '#9333ea',
  },
  {
    id: 'procedures',
    icon: ClipboardList,
    label: 'Procédures MASE',
    badge: 'Disponible',
    badgeColor: '#166534',
    desc: 'Logigramme SVG + procédures opérationnelles conformes MASE V2024',
    price: 'Inclus',
    priceSub: 'avec un compte',
    to: '/procedures',
    accentBg: '#fff7ed',
    accentBorder: '#fed7aa',
    accentIcon: '#ea580c',
  },
  {
    id: 'dashboard',
    icon: BarChart3,
    label: 'SMI Dashboard',
    badge: 'Nouveau',
    badgeColor: '#7c3aed',
    desc: 'Pilotage QHSE complet — KPIs, audits, accidents, habilitations',
    price: '15 €',
    priceSub: '/mois · ou 299 € à vie',
    to: '/dashboard/acheter',
    accentBg: '#faf5ff',
    accentBorder: '#ddd6fe',
    accentIcon: '#7c3aed',
  },
  {
    id: 'pack',
    icon: Package,
    label: 'Pack MASE Complet',
    badge: '⭐ Best value',
    badgeColor: '#d97706',
    desc: 'SSE + Matrice + Cartographie + Procédures + SMI Dashboard',
    price: '25 €',
    priceSub: '/mois · ou 399 € à vie',
    to: '/dashboard/acheter?pack=complet',
    accentBg: '#fffbeb',
    accentBorder: '#fde68a',
    accentIcon: '#d97706',
  },
];

const STEPS = [
  {
    icon: FileText,
    step: '01',
    title: 'Choisissez votre outil',
    desc: 'Sélectionnez le document MASE dont vous avez besoin parmi notre catalogue.',
  },
  {
    icon: Zap,
    step: '02',
    title: 'Renseignez votre profil',
    desc: 'Quelques questions guidées suffisent — l\'IA adapte le contenu à votre entreprise.',
  },
  {
    icon: Award,
    step: '03',
    title: 'Téléchargez et signez',
    desc: 'Document DOCX + PDF prêt à dater, signer et remettre à votre auditeur MASE.',
  },
];

const FEATURES = [
  'Conforme MASE V2024 à jour',
  'Export DOCX + PDF professionnels',
  'Génération assistée par IA Mistral',
  'Données sécurisées (Supabase)',
  'Accès multi-outils avec un seul compte',
  'Mis à jour selon les évolutions du référentiel',
];

/* ── Composant ──────────────────────────────────────────────────────── */
export default function HomePage() {
  const [modal, setModal] = useState<ModalState>(null);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav
        style={{
          backgroundColor: '#fff',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          className="mx-auto flex items-center justify-between px-6"
          style={{ maxWidth: 1100, height: 60 }}
        >
          <div className="flex items-center gap-2">
            <Shield size={22} color="#166534" strokeWidth={2.5} />
            <span style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', letterSpacing: '-0.4px' }}>
              MASE<span style={{ color: '#166534' }}>Tools</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="#outils"
              style={{ fontSize: 14, color: '#475569', fontWeight: 500, textDecoration: 'none' }}
              className="hidden sm:block"
            >
              Nos outils
            </a>
            <Link
              to="/outil"
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#fff',
                backgroundColor: '#166534',
                padding: '8px 18px',
                borderRadius: 8,
                textDecoration: 'none',
              }}
            >
              Se connecter
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0f2d1a 0%, #166534 60%, #1e7a3e 100%)',
          padding: '80px 24px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* décor géométrique */}
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.06) 0%, transparent 55%)',
          }}
        />
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 10% 80%, rgba(255,255,255,0.04) 0%, transparent 50%)',
          }}
        />

        <div className="mx-auto" style={{ maxWidth: 680, position: 'relative' }}>
          <span
            style={{
              display: 'inline-block',
              backgroundColor: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#86efac',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '5px 14px',
              borderRadius: 999,
              marginBottom: 20,
            }}
          >
            Plateforme MASE · Référentiel V2024
          </span>

          <h1
            style={{
              color: '#fff',
              fontSize: 'clamp(28px, 5vw, 48px)',
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              margin: '0 0 16px',
            }}
          >
            Toute la documentation MASE,<br />
            <span style={{ color: '#86efac' }}>générée en quelques minutes</span>
          </h1>

          <p
            style={{
              color: 'rgba(255,255,255,0.72)',
              fontSize: 17,
              lineHeight: 1.6,
              margin: '0 0 36px',
            }}
          >
            Politique SSE, cartographie des processus, procédures, dashboard QHSE —<br className="hidden sm:block" />
            tous les outils pour obtenir et renouveler votre certification MASE.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="#outils"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                backgroundColor: '#fff',
                color: '#166534',
                fontWeight: 800,
                fontSize: 15,
                padding: '13px 28px',
                borderRadius: 10,
                textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              }}
            >
              Voir les outils <ArrowRight size={16} />
            </a>
            <Link
              to="/outil"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                backgroundColor: 'transparent',
                color: '#fff',
                fontWeight: 600,
                fontSize: 15,
                padding: '13px 24px',
                borderRadius: 10,
                textDecoration: 'none',
                border: '1.5px solid rgba(255,255,255,0.35)',
              }}
            >
              Démarrer gratuitement <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Bandeau confiance ───────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: '#fff',
          borderBottom: '1px solid #e2e8f0',
          padding: '18px 24px',
          textAlign: 'center',
        }}
      >
        <div
          className="mx-auto flex flex-wrap items-center justify-center gap-8"
          style={{ maxWidth: 900 }}
        >
          {[
            { icon: Users, text: '+200 entreprises accompagnées' },
            { icon: Award, text: 'Conforme MASE V2024' },
            { icon: Star, text: 'Note 4.9/5 par nos clients' },
            { icon: Shield, text: 'Données hébergées en Europe' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon size={16} color="#166534" strokeWidth={2} />
              <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Grille d'outils ─────────────────────────────────────────── */}
      <section id="outils" style={{ padding: '72px 24px', backgroundColor: '#f8fafc' }}>
        <div className="mx-auto" style={{ maxWidth: 1100 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 10 }}>
              Catalogue
            </p>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
              Les outils de la plateforme MASE
            </h2>
          </div>

          <div
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 20,
              display: 'grid',
            }}
          >
            {TOOLS_AVAILABLE.map((tool) => {
              const Icon = tool.icon;
              return (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  Icon={Icon}
                />
              );
            })}

            {/* Document Unique — bientôt */}
            <div
              style={{
                backgroundColor: '#fff',
                border: '1.5px solid #e2e8f0',
                borderRadius: 16,
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                opacity: 0.75,
              }}
            >
              <div
                style={{
                  width: 44, height: 44, borderRadius: 12,
                  backgroundColor: '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <FileQuestion size={22} color="#94a3b8" strokeWidth={1.8} />
              </div>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#f1f5f9',
                    color: '#94a3b8',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 999,
                    marginBottom: 8,
                  }}
                >
                  Bientôt disponible
                </span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#334155', margin: 0 }}>
                  Document Unique
                </h3>
                <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 }}>
                  Évaluation des risques professionnels (DUERP)
                </p>
              </div>
              <button
                onClick={() => setModal({ toolName: 'Document Unique', toolSlug: 'document-unique' })}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  marginTop: 'auto',
                  fontSize: 13, fontWeight: 700,
                  color: '#166534',
                  backgroundColor: 'transparent',
                  border: '1.5px solid #166534',
                  borderRadius: 8,
                  padding: '9px 16px',
                  cursor: 'pointer',
                  width: 'fit-content',
                }}
              >
                <Bell size={14} /> Me notifier
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comment ça marche ───────────────────────────────────────── */}
      <section style={{ padding: '72px 24px', backgroundColor: '#fff' }}>
        <div className="mx-auto" style={{ maxWidth: 900 }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 10 }}>
              Processus
            </p>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
              Prêt en 3 étapes
            </h2>
          </div>

          <div
            className="grid"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, display: 'grid' }}
          >
            {STEPS.map(({ icon: StepIcon, step, title, desc }) => (
              <div
                key={step}
                style={{
                  padding: 28,
                  borderRadius: 16,
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
                    color: '#166534', textTransform: 'uppercase',
                    display: 'block', marginBottom: 14,
                  }}
                >
                  {step}
                </span>
                <div
                  style={{
                    width: 44, height: 44, borderRadius: 12,
                    backgroundColor: '#dcfce7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <StepIcon size={22} color="#166534" strokeWidth={1.8} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
                  {title}
                </h3>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ce que vous obtenez ─────────────────────────────────────── */}
      <section
        style={{
          padding: '72px 24px',
          background: 'linear-gradient(135deg, #0f2d1a 0%, #166534 100%)',
        }}
      >
        <div
          className="mx-auto grid"
          style={{
            maxWidth: 900,
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 48,
            display: 'grid',
            alignItems: 'center',
          }}
        >
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#86efac', marginBottom: 12 }}>
              Inclus dans chaque outil
            </p>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: '0 0 16px' }}>
              Des documents prêts à remettre à l'auditeur
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, margin: 0 }}>
              Chaque outil génère des documents strictement conformes au référentiel MASE V2024,
              personnalisés pour votre entreprise et exportables en un clic.
            </p>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {FEATURES.map((f) => (
              <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <CheckCircle2 size={18} color="#86efac" strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 1.5 }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────────────────── */}
      <section style={{ padding: '72px 24px', backgroundColor: '#fff', textAlign: 'center' }}>
        <div className="mx-auto" style={{ maxWidth: 560 }}>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: '0 0 16px' }}>
            Commencez votre certification MASE dès aujourd'hui
          </h2>
          <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.6, margin: '0 0 32px' }}>
            Premier accès gratuit · Aucune carte requise · Document disponible en 10 minutes
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/outil"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                backgroundColor: '#166534',
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                padding: '14px 28px',
                borderRadius: 10,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(22,101,52,0.3)',
              }}
            >
              Démarrer la Politique SSE <ArrowRight size={16} />
            </Link>
            <a
              href="#outils"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                backgroundColor: '#f8fafc',
                color: '#166534',
                fontWeight: 600,
                fontSize: 15,
                padding: '14px 24px',
                borderRadius: 10,
                textDecoration: 'none',
                border: '1.5px solid #dcfce7',
              }}
            >
              Voir tous les outils
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer style={{ backgroundColor: '#0f172a', padding: '40px 24px 28px' }}>
        <div
          className="mx-auto grid"
          style={{
            maxWidth: 1100,
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 32,
            display: 'grid',
            marginBottom: 32,
          }}
        >
          <div>
            <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
              <Shield size={18} color="#4ade80" strokeWidth={2.5} />
              <span style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>MASETools</span>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              La plateforme de référence pour la documentation MASE V2024.
            </p>
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#475569', marginBottom: 14 }}>
              Outils
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { to: '/outil', label: 'Politique SSE' },
                { to: '/matrice-polyvalence', label: 'Matrice de Polyvalence' },
                { to: '/cartographie', label: 'Cartographie des Processus' },
                { to: '/procedures', label: 'Procédures MASE' },
                { to: '/dashboard/acheter', label: 'SMI Dashboard' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'none' }}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#475569', marginBottom: 14 }}>
              Conformité
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Référentiel MASE V2024', 'Exigence 1.2 SSE', 'Exigence 2.3 Processus', 'DUERP & Risques'].map((t) => (
                <li key={t} style={{ fontSize: 13, color: '#64748b' }}>{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#475569', marginBottom: 14 }}>
              Contact
            </p>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              Une question sur votre certification ?<br />
              <a href="mailto:inizan.yoann@gmail.com" style={{ color: '#4ade80', textDecoration: 'none' }}>
                inizan.yoann@gmail.com
              </a>
            </p>
          </div>
        </div>
        <div
          style={{
            borderTop: '1px solid #1e293b',
            paddingTop: 20,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 12, color: '#475569' }}>
            © 2026 MASETools — Tous droits réservés
          </span>
          <div className="flex gap-4">
            {['Mentions légales', 'CGU', 'Confidentialité'].map((t) => (
              <span key={t} style={{ fontSize: 12, color: '#475569', cursor: 'pointer' }}>{t}</span>
            ))}
          </div>
        </div>
      </footer>

      {/* ── Modal notification ──────────────────────────────────────── */}
      {modal && (
        <NotifyModal
          toolName={modal.toolName}
          toolSlug={modal.toolSlug}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

/* ── Composant ToolCard ─────────────────────────────────────────────── */
function ToolCard({
  tool,
  Icon,
}: {
  tool: (typeof TOOLS_AVAILABLE)[0];
  Icon: React.ElementType;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: '#fff',
        border: `1.5px solid ${hovered ? tool.accentBorder : '#e2e8f0'}`,
        borderRadius: 16,
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
        boxShadow: hovered ? `0 8px 24px rgba(0,0,0,0.09)` : '0 1px 4px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        cursor: 'default',
      }}
    >
      {/* Icône */}
      <div
        style={{
          width: 44, height: 44, borderRadius: 12,
          backgroundColor: tool.accentBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={22} color={tool.accentIcon} strokeWidth={1.8} />
      </div>

      {/* Badge */}
      <span
        style={{
          display: 'inline-block',
          backgroundColor: tool.badgeColor,
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 10px',
          borderRadius: 999,
          width: 'fit-content',
        }}
      >
        {tool.badge}
      </span>

      {/* Titre + description */}
      <div style={{ flexGrow: 1 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
          {tool.label}
        </h3>
        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.55, margin: 0 }}>
          {tool.desc}
        </p>
      </div>

      {/* Prix */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{tool.price}</span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{tool.priceSub}</span>
      </div>

      {/* CTA */}
      <Link
        to={tool.to}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          backgroundColor: tool.accentIcon,
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          padding: '10px 18px',
          borderRadius: 8,
          textDecoration: 'none',
          transition: 'opacity 0.15s',
          marginTop: 4,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        Découvrir <ChevronRight size={14} />
      </Link>
    </div>
  );
}
