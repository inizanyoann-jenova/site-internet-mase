# Déploiement Vercel — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger le build Vercel en committant tous les fichiers sources manquants, ajouter le rewrite SPA, et configurer les services tiers (Vercel env vars, Supabase APP_URL, Supabase Auth) pour un déploiement prod fonctionnel.

**Architecture:** GitHub integration Vercel — chaque push sur `main` déclenche un build `tsc && vite build`. Le `vercel.json` ajoute un rewrite `/* → /index.html` pour React Router BrowserRouter. Les Edge Functions Supabase restent indépendantes de Vercel.

**Tech Stack:** Vite 5, React Router v7, Supabase (Auth + Edge Functions), Stripe Checkout, Vercel (static hosting)

---

## Fichiers concernés

| Action | Fichier | Rôle |
|---|---|---|
| Créer | `.gitignore` | Exclure node_modules, dist, .env*, tsbuildinfo, output, supabase/.temp |
| Créer | `vercel.json` | Rewrite SPA `/* → /index.html` |
| Committer | `index.html` | Point d'entrée HTML |
| Committer | `tailwind.config.js` | Config Tailwind v4 |
| Committer | `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | Config TypeScript |
| Committer | `vitest.config.ts` | Config tests |
| Committer | `src/index.css` | Styles globaux |
| Committer | `src/components/AuthButton.tsx` | Bouton auth Google |
| Committer | `src/components/CompanyInfo.tsx` | Formulaire infos entreprise |
| Committer | `src/engine/types.ts` | Types partagés engine |
| Committer | `src/engine/blocks.ts` | Bibliothèque blocs SSE |
| Committer | `src/engine/questionnaire.ts` | Structure questionnaire |
| Committer | `src/engine/indicators.ts` | Calcul indicateurs SWOT/PESTEL |
| Committer | `src/engine/selectBlocks.ts` | Sélection blocs conditionnels |
| Committer | `src/engine/renderDocx.ts` | Génération DOCX |
| Committer | `src/engine/enhanceWithMistral.ts` | Enrichissement IA |
| Committer | `src/engine/__tests__/indicators.test.ts` | Tests indicateurs |
| Committer | `src/engine/__tests__/selectBlocks.test.ts` | Tests sélection blocs |
| Committer | `src/lib/supabase.ts` | Client Supabase |
| Committer | `src/lib/mistral.ts` | Client Mistral |
| Committer | `docs/superpowers/specs/2026-06-02-deploiement-vercel-design.md` | Spec approuvée |

---

## Task 1 : Créer `.gitignore`

**Fichiers :** Créer `.gitignore` à la racine

- [ ] **Écrire `.gitignore`**

Contenu exact :
```
node_modules/
dist/
.env*
*.tsbuildinfo
output/
supabase/.temp/
.superpowers/
.vscode/
clear_cache*.py
```

- [ ] **Vérifier que les fichiers sensibles sont exclus**

```bash
git check-ignore -v .env.local output/ supabase/.temp/cli-latest
```

Résultat attendu : chaque ligne affiche `.gitignore:N:.env*` (ou la règle correspondante) — confirme que git les ignorera.

- [ ] **Committer `.gitignore`**

```bash
git add .gitignore
git commit -m "chore: add .gitignore"
```

---

## Task 2 : Créer `vercel.json`

**Fichiers :** Créer `vercel.json` à la racine

- [ ] **Écrire `vercel.json`**

Contenu exact :
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Sans cette règle, un rechargement de page sur `/outil` retourne une 404 — Vercel cherche un fichier statique `outil/index.html` qui n'existe pas.

- [ ] **Committer `vercel.json`**

```bash
git add vercel.json
git commit -m "chore: add vercel.json SPA rewrite"
```

---

## Task 3 : Committer tous les fichiers sources manquants

**Fichiers :** Tous les untracked listés ci-dessus (hors exclusions `.gitignore`)

- [ ] **Vérifier l'état git avant d'ajouter**

```bash
git status
```

Résultat attendu : les fichiers `.env*`, `output/`, `supabase/.temp/`, `.superpowers/`, `.vscode/` doivent apparaître en rouge sous "Untracked" mais seront ignorés grâce au `.gitignore`. Si l'un d'eux apparaît, vérifier la Task 1.

- [ ] **Ajouter les fichiers sources**

```bash
git add index.html tailwind.config.js vitest.config.ts
git add tsconfig.json tsconfig.app.json tsconfig.node.json
git add src/index.css
git add src/components/AuthButton.tsx src/components/CompanyInfo.tsx
git add src/engine/types.ts src/engine/blocks.ts src/engine/questionnaire.ts
git add src/engine/indicators.ts src/engine/selectBlocks.ts
git add src/engine/renderDocx.ts src/engine/enhanceWithMistral.ts
git add "src/engine/__tests__/indicators.test.ts"
git add "src/engine/__tests__/selectBlocks.test.ts"
git add src/lib/supabase.ts src/lib/mistral.ts
git add docs/superpowers/specs/2026-06-02-deploiement-vercel-design.md
git add docs/superpowers/plans/2026-06-02-deploiement-vercel.md
```

- [ ] **Vérifier ce qui sera commité**

```bash
git diff --cached --stat
```

Résultat attendu : ~20 fichiers listés. Confirmer visuellement qu'aucun `.env*` ou `output/` ne figure dans la liste.

- [ ] **Committer**

```bash
git commit -m "feat: commit all source files for Vercel deployment"
```

- [ ] **Pusher sur main**

```bash
git push origin main
```

Résultat attendu : push accepté, Vercel déclenche automatiquement un nouveau build (visible dans le dashboard Vercel → Deployments, statut "Building").

---

## Task 4 : Vérifier le build Vercel

**Action :** Surveiller le dashboard Vercel jusqu'à résolution du build

- [ ] **Ouvrir Vercel → projet `site-internet-mase` → Deployments**

URL : https://vercel.com/inizanyoann-jenovas-projects/site-internet-mase

- [ ] **Attendre la fin du build** (environ 60-90 secondes)

Résultat attendu : statut vert **"Ready"**.

Si le build échoue encore : ouvrir les "Build Logs", copier le message d'erreur exact et identifier le fichier/ligne concerné avant de continuer.

- [ ] **Vérifier la page d'accueil**

Ouvrir dans le navigateur :
`https://site-internet-mase-git-main-inizanyoann-jenovas-projects.vercel.app`

Résultat attendu : la HomePage s'affiche (sections marketing).

- [ ] **Vérifier le rewrite SPA**

Ouvrir directement (ou recharger) :
`https://site-internet-mase-git-main-inizanyoann-jenovas-projects.vercel.app/outil`

Résultat attendu : le générateur s'affiche, pas de 404.

---

## Task 5 : Configurer les variables d'environnement Vercel

**Action manuelle dans le dashboard Vercel** — aucun fichier à modifier

- [ ] **Aller dans Vercel → projet → Settings → Environment Variables**

- [ ] **Ajouter les 3 variables** (cocher Production + Preview pour chacune)

| Nom | Valeur |
|---|---|
| `VITE_SUPABASE_URL` | `https://ulceeurwibmbtnqhkaao.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Copier depuis votre `.env.local` local |
| `VITE_MISTRAL_API_KEY` | Copier depuis votre `.env.local` local |

- [ ] **Redéployer pour appliquer les variables**

Dans Vercel → Deployments → dernier déploiement → bouton "..." → **Redeploy**.

Résultat attendu : nouveau build déclenché, statut "Ready" après ~60 s.

---

## Task 6 : Mettre à jour `APP_URL` dans Supabase

**Action manuelle dans Supabase Dashboard** — la Edge Function `create-checkout-session` utilise `APP_URL` pour construire `success_url` et `cancel_url` Stripe.

- [ ] **Aller dans Supabase Dashboard → Edge Functions → Secrets**

URL : https://supabase.com/dashboard/project/ulceeurwibmbtnqhkaao/functions

- [ ] **Modifier le secret `APP_URL`**

Ancienne valeur : `http://localhost:3000`  
Nouvelle valeur : `https://site-internet-mase-git-main-inizanyoann-jenovas-projects.vercel.app`

Cliquer Save. Les Edge Functions récupèrent les secrets dynamiquement — pas de redéploiement nécessaire.

---

## Task 7 : Configurer Supabase Auth Redirect URLs

**Action manuelle dans Supabase Dashboard** — permet au callback OAuth Google de rediriger vers le domaine de prod après login.

- [ ] **Aller dans Supabase → Authentication → URL Configuration**

URL : https://supabase.com/dashboard/project/ulceeurwibmbtnqhkaao/auth/url-configuration

- [ ] **Ajouter dans "Redirect URLs"**

```
https://site-internet-mase-git-main-inizanyoann-jenovas-projects.vercel.app
https://site-internet-mase-git-main-inizanyoann-jenovas-projects.vercel.app/**
```

Cliquer Save.

---

## Task 8 : Test E2E final

**Validation complète des 4 flux critiques**

- [ ] **Flux 1 — Navigation SPA**

  1. Ouvrir `https://site-internet-mase-git-main-inizanyoann-jenovas-projects.vercel.app`
  2. Cliquer sur le CTA vers `/outil`
  3. Recharger la page sur `/outil` (F5)
  
  Résultat attendu : aucune 404, le générateur s'affiche à chaque fois.

- [ ] **Flux 2 — Authentification Google**

  1. Sur `/outil`, cliquer "Se connecter avec Google"
  2. Sélectionner un compte Google
  3. Vérifier la redirection vers `/outil` après auth
  
  Résultat attendu : utilisateur connecté, AccessGate disparaît ou laisse passer.

- [ ] **Flux 3 — Paiement Stripe (test)**

  1. Connecté sur `/outil`, cliquer "Payer 29 €"
  2. Sur la page Stripe Checkout, utiliser la carte test : `4242 4242 4242 4242`, expiry `12/34`, CVC `123`
  3. Valider le paiement
  
  Résultat attendu : redirect vers `/outil?payment=success`, accès déverrouillé.

- [ ] **Flux 4 — Génération document**

  1. Remplir quelques questions du questionnaire
  2. Cliquer "Aperçu" puis "Télécharger DOCX"
  
  Résultat attendu : fichier `.docx` téléchargé sans erreur console.
