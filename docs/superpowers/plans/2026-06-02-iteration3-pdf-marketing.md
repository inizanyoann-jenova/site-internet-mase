# Itération 3 — Export PDF + Pages marketing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un export PDF client-side identique au DOCX, et restructurer l'app avec React Router pour introduire une page marketing sur `/` (l'outil se déplace sur `/outil`).

**Architecture:**
- Feature A (indépendante) : `src/engine/renderPdf.tsx` mirror de `renderDocx.ts`, utilisant `@react-pdf/renderer`. `PolicyPreview` reçoit un prop `onDownloadPdf` et affiche un second bouton.
- Feature B (indépendante) : `react-router-dom` ajouté, `main.tsx` devient le point d'entrée du routeur (`/` → `HomePage`, `/outil` → `App`). `App.tsx` n'est pas modifié fonctionnellement.

**Tech Stack:** React 19 + Vite 5 + TypeScript + Tailwind v4 + @react-pdf/renderer + react-router-dom

---

## File Map

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/engine/renderPdf.tsx` | Créer | Génération PDF (mirror de renderDocx.ts) |
| `src/pages/HomePage.tsx` | Créer | Page marketing 4 sections |
| `src/components/PolicyPreview.tsx` | Modifier | Prop onDownloadPdf + bouton PDF |
| `src/App.tsx` | Modifier | Import downloadPolicyPdf + prop |
| `src/main.tsx` | Modifier | BrowserRouter + Routes |
| `vite.config.ts` | Modifier | historyApiFallback pour SPA routing |
| `package.json` | Modifier | 2 nouvelles dépendances |

---

## FEATURE A — Export PDF

### Task 1 : Installer @react-pdf/renderer

**Files:**
- Modify: `package.json`

- [ ] **Step 1 : Installer la lib**

```bash
npm install @react-pdf/renderer
```

Expected output : `added N packages` sans erreur de peer deps.

- [ ] **Step 2 : Vérifier que Vite peut résoudre le module**

```bash
node -e "import('@react-pdf/renderer').then(() => console.log('ok'))"
```

Expected : `ok`

Si erreur bundling dans Vite plus tard, ajouter dans `vite.config.ts` :
```ts
optimizeDeps: { include: ['@react-pdf/renderer'] }
```

- [ ] **Step 3 : Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install @react-pdf/renderer"
```

---

### Task 2 : Créer src/engine/renderPdf.tsx

**Files:**
- Create: `src/engine/renderPdf.tsx`

Mirror de `renderDocx.ts` : mêmes fonctions publiques, même structure de document (titre centré, sections avec titres, bullets, pied de page). La fonction `fillVariables` est dupliquée (triviale, pas de dépendance croisée entre modules engine).

- [ ] **Step 1 : Créer le fichier**

Créer `src/engine/renderPdf.tsx` avec ce contenu exact :

```tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { CompanyInfo, Section, SelectedBlock } from './types';

const SECTION_TITLES: Record<Section, string> = {
  preambule: 'Préambule',
  principes: 'Nos principes essentiels en matière de SSE',
  engagement_securite: 'Nos engagements — Sécurité',
  engagement_sante: 'Nos engagements — Santé',
  engagement_environnement: 'Nos engagements — Environnement',
  axes_prioritaires: 'Nos axes prioritaires',
  amelioration_continue: "Notre démarche d'amélioration continue",
  diffusion: 'Diffusion de la politique',
};

const styles = StyleSheet.create({
  page: { paddingTop: 50, paddingBottom: 50, paddingHorizontal: 50 },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerCompany: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerLogo: {
    fontSize: 10,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginTop: 20,
    marginBottom: 6,
  },
  paragraph: { fontSize: 10, marginBottom: 5, lineHeight: 1.5 },
  bulletRow: { flexDirection: 'row', marginBottom: 4 },
  bulletDot: { fontSize: 10, marginRight: 6 },
  bulletText: { fontSize: 10, flex: 1, lineHeight: 1.5 },
  footer: { marginTop: 40 },
  footerLine: { fontSize: 10, marginBottom: 6 },
  footerName: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  footerItalic: { fontSize: 10, color: '#555555' },
});

function fillVariables(text: string, company: CompanyInfo): string {
  const map: Record<string, string> = {
    name: company.name,
    sector: company.sector,
    headcount: company.headcount,
    activities: company.activities,
    employerName: company.employerName,
  };
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    key in map ? map[key] : `{{${key}}}`,
  );
}

function BlockContent({ text, company }: { text: string; company: CompanyInfo }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <>
      {lines.map((line, i) => {
        if (line.startsWith('- ')) {
          return (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{fillVariables(line.slice(2), company)}</Text>
            </View>
          );
        }
        return (
          <Text key={i} style={styles.paragraph}>
            {fillVariables(line, company)}
          </Text>
        );
      })}
    </>
  );
}

export function buildPdfDocument(blocks: SelectedBlock[], company: CompanyInfo) {
  const grouped = blocks.reduce<Record<string, string[]>>((acc, block) => {
    acc[block.section] = acc[block.section] ?? [];
    acc[block.section].push(block.text);
    return acc;
  }, {});

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.headerTitle}>
          POLITIQUE SANTÉ, SÉCURITÉ ET ENVIRONNEMENT
        </Text>
        <Text style={styles.headerCompany}>{company.name}</Text>
        <Text style={styles.headerLogo}>
          [Emplacement réservé au logo de l'entreprise]
        </Text>

        {Object.entries(grouped).map(([sectionKey, texts]) => (
          <View key={sectionKey}>
            <Text style={styles.sectionTitle}>
              {SECTION_TITLES[sectionKey as Section] ?? sectionKey}
            </Text>
            {texts.map((text, i) => (
              <BlockContent key={i} text={text} company={company} />
            ))}
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerLine}>
            Fait à ……………………………, le ……………………………
          </Text>
          <Text style={styles.footerName}>{company.employerName}</Text>
          <Text style={styles.footerItalic}>
            Pour la direction de l'entreprise — (signature)
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function downloadPolicyPdf(
  blocks: SelectedBlock[],
  company: CompanyInfo,
  filename = 'Politique-SSE.pdf',
): Promise<void> {
  const doc = buildPdfDocument(blocks, company);
  const blob = await pdf(doc).toBlob();
  const { saveAs } = await import('file-saver');
  saveAs(blob, filename);
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected : une erreur sur `src/App.tsx` (prop `onDownloadPdf` manquante sur `PolicyPreview`) — normal, corrigée aux Tasks 3 et 4. Aucune autre erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/engine/renderPdf.tsx
git commit -m "feat: create renderPdf — PDF generation with @react-pdf/renderer"
```

---

### Task 3 : Mettre à jour PolicyPreview.tsx

**Files:**
- Modify: `src/components/PolicyPreview.tsx`

- [ ] **Step 1 : Ajouter `onDownloadPdf` à l'interface Props (lignes 3-13)**

Remplacer l'interface Props existante par :

```ts
interface Props {
  companyInfo: CompanyInfo;
  selectedBlocks: SelectedBlock[];
  isEnhanced: boolean;
  isEnhancing: boolean;
  enhanceError: string | null;
  onEnhance: () => void;
  onBack: () => void;
  onRestart: () => void;
  onDownload: () => void;
  onDownloadPdf: () => void;
}
```

- [ ] **Step 2 : Ajouter `onDownloadPdf` à la destructuration (ligne 38)**

Remplacer la ligne de signature de fonction par :

```ts
export function PolicyPreview({ companyInfo, selectedBlocks, isEnhanced, isEnhancing, enhanceError, onEnhance, onBack, onRestart, onDownload, onDownloadPdf }: Props) {
```

- [ ] **Step 3 : Remplacer le bouton DOCX seul par deux boutons côte à côte (lignes 139-145)**

Remplacer :
```tsx
<button
  type="button"
  onClick={onDownload}
  className="inline-flex items-center justify-center rounded-full bg-[var(--mase-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--mase-primary-dark)]"
>
  Télécharger le DOCX
</button>
```

Par :
```tsx
<button
  type="button"
  onClick={onDownload}
  className="inline-flex items-center justify-center rounded-full bg-[var(--mase-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--mase-primary-dark)]"
>
  Télécharger le DOCX
</button>

<button
  type="button"
  onClick={onDownloadPdf}
  className="inline-flex items-center justify-center rounded-full border border-[var(--mase-primary)] bg-[var(--mase-surface)] px-5 py-3 text-sm font-semibold text-[var(--mase-primary)] transition hover:bg-[var(--mase-primary-light)]/20"
>
  Télécharger le PDF
</button>
```

- [ ] **Step 4 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected : erreur persistante sur `App.tsx` (prop non fournie) — normal. Aucune autre erreur dans PolicyPreview.

- [ ] **Step 5 : Commit**

```bash
git add src/components/PolicyPreview.tsx
git commit -m "feat: add PDF download button to PolicyPreview"
```

---

### Task 4 : Mettre à jour App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1 : Ajouter l'import de `downloadPolicyPdf` après la ligne 14**

Après la ligne :
```ts
import { downloadPolicyDocx } from './engine/renderDocx';
```

Ajouter :
```ts
import { downloadPolicyPdf } from './engine/renderPdf';
```

- [ ] **Step 2 : Passer `onDownloadPdf` à `<PolicyPreview>` (autour de la ligne 231)**

Remplacer le bloc `{step === 'preview' && ...}` par :

```tsx
{step === 'preview' && (
  <PolicyPreview
    companyInfo={companyInfo}
    selectedBlocks={selectedBlocks}
    isEnhanced={isEnhanced}
    isEnhancing={isEnhancing}
    enhanceError={enhanceError}
    onEnhance={handleEnhance}
    onBack={() => setStep('company')}
    onRestart={handleRestart}
    onDownload={() => downloadPolicyDocx(selectedBlocks, companyInfo)}
    onDownloadPdf={() => downloadPolicyPdf(selectedBlocks, companyInfo)}
  />
)}
```

- [ ] **Step 3 : Vérifier TypeScript — aucune erreur attendue**

```bash
npx tsc --noEmit
```

Expected : aucune erreur.

- [ ] **Step 4 : Tester manuellement**

```bash
npm run dev
```

1. Aller jusqu'à l'étape « Aperçu » (remplir le questionnaire et les infos entreprise).
2. Vérifier que les deux boutons « Télécharger le DOCX » et « Télécharger le PDF » sont affichés côte à côte.
3. Cliquer « Télécharger le PDF » → fichier `Politique-SSE.pdf` téléchargé.
4. Ouvrir le PDF : titre centré « POLITIQUE SANTÉ, SÉCURITÉ ET ENVIRONNEMENT », nom d'entreprise, sections avec titres en gras, bullets avec « • », pied de page avec nom de l'employeur.
5. Cliquer « Télécharger le DOCX » → toujours fonctionnel (non régressé).

- [ ] **Step 5 : Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire onDownloadPdf in App — Feature A complete"
```

---

## FEATURE B — Pages marketing + Routing

### Task 5 : Installer react-router-dom

**Files:**
- Modify: `package.json`

- [ ] **Step 1 : Installer la lib**

```bash
npm install react-router-dom
```

Expected : `added N packages`, aucune erreur de peer deps. Les types TypeScript sont inclus dans `react-router-dom` (pas de `@types/` séparé).

- [ ] **Step 2 : Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install react-router-dom"
```

---

### Task 6 : Mettre à jour vite.config.ts

**Files:**
- Modify: `vite.config.ts`

Sans `historyApiFallback`, accéder directement à `http://localhost:3000/outil` retourne une 404 du serveur Vite. Le fichier actuel a `server: { port: 3000 }` — on ajoute `historyApiFallback: true` dans ce bloc.

- [ ] **Step 1 : Remplacer le contenu de vite.config.ts**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 3000,
    historyApiFallback: true,
  },
});
```

- [ ] **Step 2 : Commit**

```bash
git add vite.config.ts
git commit -m "feat: add historyApiFallback for SPA routing in dev"
```

---

### Task 7 : Créer src/pages/HomePage.tsx

**Files:**
- Create: `src/pages/HomePage.tsx`

Page statique, 4 sections (structure C validée). Utilise les variables CSS MASE définies dans `src/index.css` (`--mase-primary`, `--mase-heading`, `--mase-muted`, `--mase-card-strong`, `--mase-surface`) — pas de nouvelle feuille de style.

- [ ] **Step 1 : Créer le dossier `src/pages/`**

```bash
mkdir -p src/pages
```

- [ ] **Step 2 : Créer src/pages/HomePage.tsx**

```tsx
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
```

- [ ] **Step 3 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected : erreur sur `src/main.tsx` (Link hors BrowserRouter) — normal, corrigée en Task 8. Aucune autre erreur dans HomePage.

- [ ] **Step 4 : Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: create HomePage — 4-section marketing landing page"
```

---

### Task 8 : Mettre à jour src/main.tsx

**Files:**
- Modify: `src/main.tsx`

Le fichier actuel monte `<App />` directement. On le remplace par un `<BrowserRouter>` avec deux routes.

- [ ] **Step 1 : Remplacer le contenu de src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import HomePage from './pages/HomePage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/outil" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
```

- [ ] **Step 2 : Vérifier TypeScript — aucune erreur attendue**

```bash
npx tsc --noEmit
```

Expected : aucune erreur.

- [ ] **Step 3 : Tester manuellement**

```bash
npm run dev
```

Vérifier les scénarios suivants :

| Scénario | URL | Résultat attendu |
|---|---|---|
| Page d'accueil | `http://localhost:3000/` | Page marketing avec 4 sections |
| Navigation vers l'outil | Clic « Démarrer le diagnostic → » | Redirection vers `/outil`, outil affiché |
| Accès direct à l'outil | `http://localhost:3000/outil` | Outil affiché (pas de 404) |
| Retour navigateur | Depuis `/outil`, clic « ← » | Retour sur `/`, page marketing |
| Lien nav | Clic « Accéder à l'outil → » dans la nav | Navigation vers `/outil` |

- [ ] **Step 4 : Commit**

```bash
git add src/main.tsx
git commit -m "feat: add React Router — / → HomePage, /outil → App — Feature B complete"
```

---

## Vérification finale

- [ ] **Build production sans erreur**

```bash
npm run build
```

Expected : `✓ built in Xs` sans erreur TypeScript ni Vite. Si erreur sur `@react-pdf/renderer` au build, ajouter dans `vite.config.ts` :
```ts
optimizeDeps: { include: ['@react-pdf/renderer'] }
```

- [ ] **Checklist fonctionnelle**

| Item | Vérifié |
|---|---|
| Deux boutons DOCX + PDF visibles sur l'étape « Aperçu » | |
| PDF téléchargé : titre centré, sections formelles, bullets, pied signé | |
| DOCX non régressé | |
| Page `/` : hero, 3 étapes, sections MASE, tarif 29 € | |
| Navigation `/` ↔ `/outil` via boutons et via bouton navigateur | |
| Accès direct `http://localhost:3000/outil` fonctionnel | |
