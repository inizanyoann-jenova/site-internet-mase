// src/components/matrice/MatriceHeader.tsx
import { useMatrice } from './MatriceContext';

const SAVE_LABELS = {
  idle: '',
  saving: 'Sauvegarde…',
  saved: 'Sauvegardé ✓',
  error: '⚠ Erreur de sauvegarde',
};

export function MatriceHeader() {
  const { data, saveStatus } = useMatrice();
  return (
    <header
      className="flex items-center gap-4 px-6 py-3 text-white"
      style={{ background: 'linear-gradient(135deg, #0d2137 0%, #1f4d7a 55%, #9b2226 100%)' }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-base font-extrabold leading-tight tracking-wide">
          {data.config.company || 'Mon Entreprise'}
        </span>
        <span className="text-xs opacity-60">
          {data.config.docTitle || 'Matrice de Polyvalence'}
        </span>
      </div>
      <div className="flex-1 text-center">
        <h1 className="text-lg font-bold">Matrice de Polyvalence</h1>
        <p className="text-xs opacity-60">Polyvalence & Redondance des compétences</p>
      </div>
      <div className="text-right text-xs opacity-60 whitespace-nowrap">
        {SAVE_LABELS[saveStatus]}
      </div>
    </header>
  );
}
