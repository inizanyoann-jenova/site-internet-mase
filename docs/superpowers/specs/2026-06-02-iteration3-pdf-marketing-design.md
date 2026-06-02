# Spec — Itération 3 : Export PDF + Pages marketing

Date : 2026-06-02
Statut : design validé
Projet : `site-internet-mase`
Fonctionnalités : export PDF client-side + page d'accueil marketing + routage React Router

---

## 1. Contexte

L'itération 2 a livré l'auth Google (Supabase), le paiement Stripe 29 €, et la sauvegarde/reprise du questionnaire. L'outil occupe actuellement la racine `/`.

L'itération 3 ajoute deux fonctionnalités indépendantes :
1. **Export PDF** — second format de téléchargement, côté client uniquement, identique au DOCX en termes de mise en page.
2. **Pages marketing + routage** — page d'accueil du site, introduction d'un routeur React Router v6, déplacement de l'outil sur `/outil`.

---

## 2. Feature A — Export PDF

### 2.1 Contraintes

- 100 % côté client (pas de backend, pas de Supabase Function).
- Le PDF doit ressembler au document Word : titre centré, sections formelles avec titres, bullets, pied de page daté/signé.
- Deux boutons séparés dans l'interface : « Télécharger le DOCX » (existant) + « Télécharger le PDF » (nouveau).

### 2.2 Bibliothèque choisie

**`@react-pdf/renderer`** — composants React (`<Document>`, `<Page>`, `<Text>`, `<View>`) rendus en PDF dans le navigateur via son moteur web. Taille ajoutée au bundle : ~800 KB (acceptable pour une app Vite).

Alternatives écartées :
- `jsPDF` : API procédurale x/y, difficile à maintenir en miroir du DOCX.
- `pdfmake` : bundle ~1 MB, moins naturel dans un stack React.

### 2.3 Nouveau fichier : `src/engine/renderPdf.tsx`

Mirror de `renderDocx.ts`. Même responsabilités, même interface publique :

```ts
buildPdfDocument(blocks: SelectedBlock[], company: CompanyInfo): ReactElement
downloadPolicyPdf(blocks: SelectedBlock[], company: CompanyInfo, filename?: string): Promise<void>
```

Structure du document PDF généré :

| Zone | Contenu |
|---|---|
| En-tête | Titre centré « POLITIQUE SANTÉ, SÉCURITÉ ET ENVIRONNEMENT », nom entreprise, emplacement logo (texte italique) |
| Corps | Un titre de section par groupe de blocs, blocs en paragraphes ou bullets |
| Pied de page | « Fait à ………, le ……… », nom employeur, mention signature |

La fonction `fillVariables` est dupliquée dans `renderPdf.tsx` (triviale, évite une dépendance croisée entre modules engine).

### 2.4 Modifications des fichiers existants

**`src/components/PolicyPreview.tsx`**
- Nouvelle prop : `onDownloadPdf: () => void`
- Le bouton « Télécharger le DOCX » reste inchangé.
- Nouveau bouton « Télécharger le PDF » ajouté immédiatement après, dans la même rangée (`flex gap`).
- Style identique au bouton DOCX (même classe Tailwind) pour cohérence visuelle.

**`src/App.tsx`**
- Import de `downloadPolicyPdf` depuis `./engine/renderPdf`.
- Prop `onDownloadPdf={() => downloadPolicyPdf(selectedBlocks, companyInfo)}` passée à `<PolicyPreview>`.

### 2.5 Installation

```
npm install @react-pdf/renderer
```

---

## 3. Feature B — Pages marketing + Routage

### 3.1 Bibliothèque choisie

**React Router v6** (`react-router-dom`) — standard du marché, ~50 KB, URLs propres avec bouton retour fonctionnel, prépare l'arrivée du 2e outil sans refactoring futur.

Alternatives écartées :
- TanStack Router : overkill pour 2 pages actuellement.
- Routing maison (`useState`) : pas d'URL réelle, bouton retour cassé.

### 3.2 Structure des routes

```
/        →  <HomePage>   src/pages/HomePage.tsx  (nouvelle)
/outil   →  <App>        src/App.tsx             (existant, inchangé fonctionnellement)
```

### 3.3 Modifications `src/main.tsx`

Ajout du `<BrowserRouter>` et des `<Route>` :

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/outil" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
```

### 3.4 `vite.config.ts`

Ajout de `historyApiFallback: true` dans le serveur de développement pour que les URLs directes (ex. `/outil`) fonctionnent sans rechargement 404 :

```ts
server: {
  historyApiFallback: true,
}
```

### 3.5 Nouveau fichier : `src/pages/HomePage.tsx`

Page statique. Style : variables CSS MASE existantes (`--mase-primary`, `--mase-heading`, `--mase-card-strong`, etc.) — pas de nouvelle feuille de style.

**4 sections** (structure C — orientée confiance) :

#### Section 1 — Hero
- Fond : bleu marine MASE (`--mase-primary`)
- Badge : « CONFORME MASE V2024 — EXIGENCE 1.2 »
- Titre : « Générez votre Politique SSE en 10 minutes »
- Sous-titre : « Questionnaire guidé · Document Word + PDF prêts à signer · Adapté à votre profil d'entreprise »
- CTA : `<Link to="/outil">` — bouton ambre (contraste sur fond bleu)

#### Section 2 — Comment ça marche
- Fond : `--mase-card-strong`
- 3 étapes en cards horizontales : 📋 Diagnostic (questions SWOT+PESTEL) · ⚡ Génération (politique personnalisée) · 📥 Téléchargement (DOCX + PDF)

#### Section 3 — Ce que contient le document
- Fond : blanc
- Grille 2 colonnes, 6 items avec checkmarks, chaque item référence la section MASE couverte :
  - Préambule & engagement employeur
  - 6 principes essentiels SSE (§1.2.1)
  - Engagements Sécurité, Santé, Environnement (§1.2.4/5/6)
  - Axes prioritaires personnalisés
  - Amélioration continue
  - Date + signature employeur (§1.2.2)

#### Section 4 — Tarif
- Fond : `--mase-card-strong`
- Card centrale : 29 € — paiement unique — accès permanent
- Badge vert : « ✓ Conforme exigence 1.2 MASE V2024 »
- Liste : ✓ Document Word éditable + PDF · ✓ Personnalisé à votre profil
- CTA secondaire : `<Link to="/outil">` — même style que le CTA Hero

#### Navigation & footer
- Nav minimale : logo « MASE Tools » (gauche) + lien « Connexion » (droite, optionnel dans un premier temps)
- Footer : copyright minimaliste

### 3.6 Installation

```
npm install react-router-dom
```

---

## 4. Ordre d'implémentation recommandé

1. **Feature A — PDF** : ajouter la lib, créer `renderPdf.tsx`, mettre à jour `PolicyPreview` + `App`. Autonome, pas de dépendance à la feature B.
2. **Feature B — Routing** : installer React Router, refactorer `main.tsx`, créer `HomePage.tsx`, ajuster `vite.config.ts`.

Les deux features sont indépendantes et peuvent être développées dans n'importe quel ordre.

---

## 5. Fichiers impactés

| Fichier | Action |
|---|---|
| `src/engine/renderPdf.tsx` | Créer |
| `src/pages/HomePage.tsx` | Créer |
| `src/components/PolicyPreview.tsx` | Modifier (prop + bouton PDF) |
| `src/App.tsx` | Modifier (import + prop onDownloadPdf) |
| `src/main.tsx` | Modifier (BrowserRouter + Routes) |
| `vite.config.ts` | Modifier (historyApiFallback) |
| `package.json` | Modifier (2 nouvelles dépendances) |

---

## 6. Hors périmètre

- Déploiement Vercel (rewrite rule `/* → /index.html`) — à traiter lors du déploiement, pas dans ce sprint.
- Pages marketing pour les futurs outils MASE — la structure de routage les accueillera naturellement.
- Animations ou transitions entre pages.
- SEO / meta tags — itération suivante si besoin.
