// src/components/matrice/MatriceTabs.tsx
import { PDFDownloadLink } from '@react-pdf/renderer';
import { useMatrice } from './MatriceContext';
import { MatricePDF } from './MatricePDF';

const TABS = [
  { id: 'matrice',        label: '📊 Matrice' },
  { id: 'collaborateurs', label: '👥 Collaborateurs' },
  { id: 'absences',       label: '🏖 Absences' },
  { id: 'competences',    label: '⚡ Compétences' },
  { id: 'categories',     label: '🗂 Catégories' },
  { id: 'parametres',     label: '⚙️ Paramètres' },
];

export function MatriceTabs() {
  const { activeTab, setActiveTab, data } = useMatrice();
  const fileName = `matrice-${data.config.company.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;

  return (
    <nav
      className="sticky top-0 z-50 flex items-center gap-1 bg-white px-5 shadow-sm"
      style={{ borderBottom: '2px solid #dee2e6' }}
    >
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className="whitespace-nowrap border-b-[3px] px-4 py-3 text-sm font-semibold transition-colors"
          style={{
            borderColor: activeTab === tab.id ? '#2563a8' : 'transparent',
            color: activeTab === tab.id ? '#1a3a5c' : '#6c757d',
            marginBottom: '-2px',
          }}
        >
          {tab.label}
        </button>
      ))}
      <div className="flex-1" />
      <div className="flex items-center gap-2 py-2">
        <button
          onClick={() => window.print()}
          className="rounded px-3 py-1.5 text-xs font-semibold"
          style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}
        >
          🖨 Imprimer
        </button>
        <PDFDownloadLink
          document={<MatricePDF data={data} />}
          fileName={fileName}
          className="rounded px-3 py-1.5 text-xs font-semibold"
          style={{ background: '#fdf4ff', color: '#7e22ce', border: '1px solid #e9d5ff', textDecoration: 'none' }}
        >
          {({ loading }) => loading ? 'Génération…' : '📄 Exporter PDF'}
        </PDFDownloadLink>
      </div>
    </nav>
  );
}
