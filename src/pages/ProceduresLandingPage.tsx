// src/pages/ProceduresLandingPage.tsx
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { SessionContext } from '../contexts/SessionContext';
import { supabase } from '../lib/supabase';

export default function ProceduresLandingPage() {
  const session = useContext(SessionContext) as Session | null;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleAccess = async () => {
    if (!session) {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/procedures/wizard` },
      });
      return;
    }
    setLoading(true);
    // In development: direct access (production: verify purchase)
    setLoading(false);
    navigate('/procedures/wizard');
  };

  const features = [
    { icon: '🔀', title: 'Logigramme SVG Live', desc: "Activités et décisions Oui/Non qui se dessinent en temps réel pendant que vous remplissez le formulaire." },
    { icon: '✨', title: 'IA génère les étapes', desc: "Décrivez votre processus en une phrase. L'IA génère toutes les étapes avec les décisions clés pré-remplies." },
    { icon: '📄', title: 'PDF 2 pages ISO', desc: "Page 1 : document ISO avec en-tête, objectif, risques, approbation. Page 2 : tableau des étapes." },
    { icon: '✦', title: '5 modèles MASE', desc: "Plan de Prévention, Accueil sécurité, Maintenance corrective, Travaux, Revue de direction…" },
    { icon: '💾', title: 'Sauvegarde Supabase', desc: "Toutes vos procédures sauvegardées dans votre espace, révisables chaque année." },
    { icon: '🔒', title: 'Conforme MASE V2024', desc: "Format ISO standard avec Réf/Version/Statut, historique révisions, tableau d'approbation." },
  ];

  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
        <a href="/" className="text-xl font-bold" style={{ color: 'var(--mase-primary)' }}>MASE</a>
        {session && (
          <button onClick={() => navigate('/procedures/wizard')}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--mase-primary)' }}>
            Mon espace →
          </button>
        )}
      </nav>

      <div className="mx-auto max-w-4xl px-8 py-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-bold text-blue-700">
          ✦ MASE V2024 Conforme
        </div>
        <h1 className="mb-6 text-4xl font-black text-gray-900 leading-tight">
          Générez vos Procédures MASE<br />
          <span style={{ color: 'var(--mase-primary)' }}>avec logigramme intégré</span>
        </h1>
        <p className="mb-8 text-lg text-gray-500 max-w-2xl mx-auto">
          Wizard guidé en 7 étapes · Logigramme SVG généré en temps réel · IA qui crée les étapes pour vous · PDF 2 pages ISO prêt pour l'auditeur
        </p>
        <button
          onClick={handleAccess}
          disabled={loading}
          className="rounded-2xl px-10 py-4 text-lg font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {loading ? 'Chargement…' : session ? 'Accéder à mes procédures →' : 'Commencer — Connexion Google →'}
        </button>
      </div>

      <div className="mx-auto max-w-5xl px-8 pb-16">
        <div className="grid grid-cols-3 gap-6">
          {features.map((f) => (
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
