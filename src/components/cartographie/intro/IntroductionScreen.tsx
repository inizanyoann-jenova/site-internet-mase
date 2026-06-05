// src/components/cartographie/intro/IntroductionScreen.tsx
interface Props {
  onStart: () => void;
}

const CONCEPTS = [
  {
    emoji: '🗺️',
    title: 'La cartographie',
    desc: "C'est la carte de votre entreprise. Elle montre toutes vos activités et comment elles s'enchaînent entre elles.",
  },
  {
    emoji: '⚙️',
    title: 'Un processus',
    desc: "C'est une activité qui transforme quelque chose en entrée (une demande, un document) en quelque chose en sortie (un résultat, un livrable).",
  },
  {
    emoji: '🏢',
    title: 'Les processus métier',
    desc: "Ce sont vos activités principales — celles pour lesquelles vos clients vous paient. C'est votre \"cœur de métier\".",
  },
];

const EXAMPLE = "Exemple BTP : Votre client envoie un appel d'offre → vous faites un devis → vous réalisez le chantier → vous livrez les travaux. Chacune de ces étapes est un processus !";

export default function IntroductionScreen({ onStart }: Props) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f3' }}>
      <nav
        className="flex items-center px-6 py-3"
        style={{ backgroundColor: 'var(--mase-primary)' }}
      >
        <a href="/" className="text-lg font-bold text-white">MASE</a>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-10 text-center">
          <div className="mb-4 text-5xl">🗺️</div>
          <h1 className="mb-3 text-2xl font-extrabold text-gray-900">
            Bienvenue dans le générateur de Cartographie des Processus
          </h1>
          <p className="text-gray-500">
            Pas de panique — on vous guide étape par étape.<br />
            Comptez environ <strong>45 à 60 minutes</strong> pour tout compléter.
          </p>
        </div>

        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">
            Avant de commencer, 3 notions clés à connaître
          </h2>
          <div className="flex flex-col gap-4">
            {CONCEPTS.map((c) => (
              <div key={c.title} className="flex gap-4">
                <span className="text-2xl">{c.emoji}</span>
                <div>
                  <div className="font-bold text-gray-800">{c.title}</div>
                  <div className="text-sm text-gray-500">{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="mb-8 rounded-xl p-5"
          style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}
        >
          <div className="mb-1 text-xs font-bold uppercase tracking-wider text-blue-600">
            💡 Exemple concret
          </div>
          <p className="text-sm text-blue-900">{EXAMPLE}</p>
        </div>

        <div className="mb-10 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">
            Les 2 phases de l'outil
          </h2>
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--mase-primary)' }}
              >1</div>
              <div>
                <div className="font-semibold text-gray-800">Construire votre carte (~20 min)</div>
                <div className="text-sm text-gray-500">
                  Vous identifiez tous vos processus et comment ils s'enchaînent. Résultat : une cartographie PDF au format MASE.
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: '#16a34a' }}
              >2</div>
              <div>
                <div className="font-semibold text-gray-800">Détailler chaque processus (~30 min)</div>
                <div className="text-sm text-gray-500">
                  Pour chaque processus, vous renseignez les détails (pilote, objectif SMART, risques…). Résultat : des fiches de processus PDF conformes MASE.
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onStart}
          className="w-full rounded-xl py-4 text-base font-bold text-white shadow-md transition hover:opacity-90"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          Je comprends, on commence la Phase 1 →
        </button>
      </div>
    </div>
  );
}
