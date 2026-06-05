// src/pages/ProceduresLandingPage.tsx
export default function ProceduresLandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Générateur de Procédures MASE</h1>
      <p className="text-gray-500">Landing page — à compléter en Plan C</p>
      <a
        href="/procedures/wizard"
        className="rounded-lg px-6 py-2 text-sm font-bold text-white"
        style={{ backgroundColor: 'var(--mase-primary)' }}
      >
        Accéder à l'outil →
      </a>
    </div>
  );
}
