import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { SessionContext } from '../contexts/SessionContext';
import { supabase } from '../lib/supabase';

const FEATURES = [
  { icon: '📋', title: 'Logigramme technicien', desc: 'Logigramme SVG séquentiel par phases (Préparation / Exécution / Fin de tâche), imprimable A5.' },
  { icon: '✨', title: 'IA génère les consignes', desc: "Décrivez l'opération, l'IA génère les consignes SSE, les EPI et les scénarios d'urgence adaptés." },
  { icon: '🛡️', title: '8 templates MASE critiques', desc: 'Consignation, hauteur, espace confiné, feu, HT, levage, chimique, VRD — pré-remplis conformes MASE.' },
  { icon: '📱', title: 'Mode terrain interactif', desc: "Cases à cocher en direct pour le technicien, compteur de progression, alertes sur étapes critiques." },
  { icon: '📄', title: 'Export PDF A4 complet', desc: "Document complet avec en-tête, EPI, phases, urgences, tableau d'approbation conforme MASE V2024." },
  { icon: '🔒', title: 'Conforme MASE V2024', desc: 'Chapitre 3.3 : instructions de travail terrain pour toutes les opérations à risque.' },
];

export default function MoLandingPage() {
  const session = useContext(SessionContext) as Session | null;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleAccess = async () => {
    if (!session) {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/modes-operatoires/nouveau` },
      });
      return;
    }
    setLoading(true);
    setLoading(false);
    navigate('/modes-operatoires/nouveau');
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
        <a href="/" className="text-xl font-bold" style={{ color: 'var(--mase-primary)' }}>CertifMASE</a>
        {session && (
          <button
            onClick={() => navigate('/modes-operatoires/nouveau')}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--mase-primary)' }}
          >
            Mon espace →
          </button>
        )}
      </nav>

      <div className="mx-auto max-w-4xl px-8 py-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-4 py-1.5 text-xs font-bold text-orange-700">
          ✦ MASE V2024 — Chapitre 3.3
        </div>
        <h1 className="mb-6 text-4xl font-black text-gray-900 leading-tight">
          Générez vos Modes Opératoires MASE<br />
          <span style={{ color: 'var(--mase-primary)' }}>avec logigramme technicien intégré</span>
        </h1>
        <p className="mb-8 text-lg text-gray-500 max-w-2xl mx-auto">
          Wizard guidé 7 étapes · 8 templates opérations critiques · Logigramme SVG terrain · Mode suivi interactif · PDF A4 conforme auditeur
        </p>
        <button
          onClick={handleAccess}
          disabled={loading}
          className="rounded-2xl px-10 py-4 text-lg font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {loading ? 'Chargement…' : session ? 'Accéder à mes modes opératoires →' : 'Commencer — Connexion Google →'}
        </button>
      </div>

      <div className="mx-auto max-w-5xl px-8 pb-16">
        <div className="grid grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
              <div className="mb-3 text-3xl">{f.icon}</div>
              <div className="mb-2 font-bold text-gray-900">{f.title}</div>
              <div className="text-sm text-gray-500 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
