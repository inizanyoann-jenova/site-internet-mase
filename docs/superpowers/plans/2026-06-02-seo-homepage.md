# SEO HomePage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter title, meta description, Open Graph et Twitter Card dans `index.html` pour que la page `/` soit correctement indexée par Google et prévisualisée sur les réseaux sociaux.

**Architecture:** Toutes les balises sont statiques dans `index.html` (pas de dépendance React). L'image OG est un fichier PNG placé dans `public/` et servie directement par Vite/Vercel. Aucune modification des composants React.

**Tech Stack:** HTML statique, Vite 5, Vercel

---

### Task 1 : Mettre à jour `index.html` avec toutes les balises SEO

**Files:**
- Modify: `index.html`

- [ ] **Step 1 : Vérifier l'état actuel**

Ouvrir [index.html](../../index.html) et confirmer que le `<head>` contient uniquement :
```html
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Générateur de Politique SSE — MASE</title>
```

- [ ] **Step 2 : Remplacer le contenu de `<head>`**

Remplacer l'intégralité du `<head>` par :
```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- SEO -->
  <title>Politique SSE MASE en 10 min — Conforme Exigence 1.2 | MASE Tools</title>
  <meta name="description" content="Générez une Politique SSE conforme MASE V2024 en 10 minutes. Document Word + PDF prêt à signer. Pour PME du BTP et de l'industrie. 29 € paiement unique." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://site-internet-mase.vercel.app/" />

  <!-- Open Graph -->
  <meta property="og:type"         content="website" />
  <meta property="og:url"          content="https://site-internet-mase.vercel.app/" />
  <meta property="og:locale"       content="fr_FR" />
  <meta property="og:site_name"    content="MASE Tools" />
  <meta property="og:title"        content="Politique SSE MASE en 10 min — Conforme Exigence 1.2" />
  <meta property="og:description"  content="Générez une Politique SSE conforme MASE V2024 en 10 minutes. Document Word + PDF prêt à signer. Pour PME du BTP et de l'industrie. 29 € paiement unique." />
  <meta property="og:image"        content="https://site-internet-mase.vercel.app/og-image.png" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="Politique SSE MASE en 10 min — Conforme Exigence 1.2" />
  <meta name="twitter:description" content="Générez une Politique SSE conforme MASE V2024 en 10 minutes. Document Word + PDF prêt à signer. Pour PME du BTP et de l'industrie. 29 € paiement unique." />
  <meta name="twitter:image"       content="https://site-internet-mase.vercel.app/og-image.png" />
</head>
```

- [ ] **Step 3 : Vérifier visuellement dans le navigateur**

Lancer le serveur de dev :
```bash
npm run dev
```
Ouvrir `http://localhost:5173` dans le navigateur.  
Vérifier dans les DevTools (onglet **Elements** > `<head>`) que toutes les balises sont présentes.  
Vérifier que l'application fonctionne toujours normalement (page d'accueil et outil).

- [ ] **Step 4 : Committer**

```bash
git add index.html
git commit -m "feat: add SEO meta tags, Open Graph and Twitter Card to index.html"
```

---

### Task 2 : Ajouter l'image OG dans `public/`

**Files:**
- Create: `public/og-image.png`

> **⚠️ Cette tâche est réalisée par l'utilisateur**, pas par Claude.

- [ ] **Step 1 : Créer l'image sur Canva**

Aller sur [canva.com](https://www.canva.com), cliquer sur **"Créer un design" → "Dimensions personnalisées"**, saisir **1200 × 630 px**.  
Contenu :
- Fond bleu `#1e3a5f`
- Titre : **"MASE toute la documentation facile"** (texte blanc, grande taille)
- Sous-titre : **"Politique SSE conforme Exigence 1.2 · Word + PDF · 29 €"** (texte blanc, plus petit)
- Badge ou mention : **"En 10 minutes"**
- Nom **"MASE Tools"** discret (coin haut ou bas)

- [ ] **Step 2 : Exporter l'image**

Dans Canva : **Partager → Télécharger → PNG**.  
Renommer le fichier téléchargé en `og-image.png`.

- [ ] **Step 3 : Placer l'image dans le projet**

Copier `og-image.png` dans le dossier `public/` du projet :
```
site-internet-mase/
└── public/
    └── og-image.png   ← placer ici
```

- [ ] **Step 4 : Vérifier que l'image est accessible en local**

Avec le serveur de dev lancé (`npm run dev`), ouvrir dans le navigateur :  
`http://localhost:5173/og-image.png`  
L'image doit s'afficher directement.

- [ ] **Step 5 : Committer**

```bash
git add public/og-image.png
git commit -m "feat: add og-image for Open Graph social preview"
```

---

### Task 3 : Déployer et vérifier

**Files:** aucun — étape de déploiement et validation

- [ ] **Step 1 : Pousser sur GitHub (déploiement Vercel automatique)**

```bash
git push
```
Vercel détecte le push et lance un build automatiquement.  
Attendre ~1-2 minutes que le déploiement soit terminé (vérifiable sur le dashboard Vercel).

- [ ] **Step 2 : Vérifier les balises en production**

Ouvrir `https://site-internet-mase.vercel.app` dans le navigateur.  
DevTools → onglet **Elements** → `<head>` : confirmer que toutes les balises sont présentes.

- [ ] **Step 3 : Tester l'aperçu Open Graph**

Aller sur **https://www.opengraph.xyz/** et coller l'URL `https://site-internet-mase.vercel.app`.  
Résultat attendu : aperçu avec titre, description et image OG.

- [ ] **Step 4 : Tester l'indexation Google**

Aller sur **https://search.google.com/test/rich-results** et coller l'URL.  
Résultat attendu : pas d'erreur critique, page lisible par Google.

- [ ] **Step 5 : Committer le plan et la spec (si pas déjà fait)**

```bash
git add docs/
git commit -m "docs: add SEO design spec and implementation plan"
```
