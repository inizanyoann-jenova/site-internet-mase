# Design — Déploiement Vercel

**Date :** 2026-06-02  
**Statut :** Approuvé  
**Approche retenue :** Commit complet + config en une passe (Approche A)

---

## Contexte et problème

Le projet est déjà importé sur Vercel (GitHub integration, branche `main`). Le build échoue avec le code 1 car les fichiers sources (`src/`, `index.html`, `tsconfig.json`, etc.) sont untracked dans git — Vercel clone un repo quasi-vide.

Le build fonctionne localement (`tsc && vite build` réussit en 6,5 s). Aucune erreur TypeScript.

Avertissement non bloquant : bundle principal 2,88 MB (chunk splitting différé à une itération suivante).

---

## Architecture cible

```
GitHub (main)
  └─ push → Vercel build (npm run build)
               └─ dist/ servi statiquement
                    └─ vercel.json rewrites /* → /index.html  (SPA routing)

Variables d'env Vercel (build-time, préfixe VITE_)
  VITE_SUPABASE_URL
  VITE_SUPABASE_ANON_KEY
  VITE_MISTRAL_API_KEY

Supabase Edge Functions (inchangées, déjà déployées)
  APP_URL → URL Vercel de prod (à mettre à jour)

Stripe webhook → Supabase Edge Function (URL inchangée)
```

---

## Étapes d'implémentation

### 1. `.gitignore`

Créer à la racine du projet :

```
node_modules/
dist/
.env*
*.tsbuildinfo
output/
supabase/.temp/
.superpowers/
.vscode/
```

### 2. `vercel.json`

Créer à la racine du projet :

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Sans cette règle, tout rechargement sur `/outil` retourne une 404 (Vercel cherche un fichier statique `outil/index.html` qui n'existe pas).

### 3. Commit git sélectif

Ajouter et committer tous les fichiers sources en excluant :
- `.env*` (secrets)
- `output/` (fichiers générés)
- `clear_cache*.py`, `scripts/` (utilitaires locaux)
- `.superpowers/`, `.vscode/` (config IDE/outils)

Fichiers à inclure :
- `src/` (tout)
- `supabase/functions/` (Edge Functions)
- `index.html`
- `vite.config.ts`
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- `tailwind.config.js`
- `vitest.config.ts`
- `package.json`, `package-lock.json` (si présent)
- `.gitignore`
- `vercel.json`

### 4. Push → build Vercel automatique

Après le push sur `main`, Vercel déclenche un nouveau build. URL de prod résultante :
`https://site-internet-mase-git-main-inizanyoann-jenovas-projects.vercel.app`

### 5. Variables d'environnement Vercel

Dans **Vercel → projet → Settings → Environment Variables**, ajouter pour Production + Preview :

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | `https://ulceeurwibmbtnqhkaao.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Clé anon publique Supabase |
| `VITE_MISTRAL_API_KEY` | Clé API Mistral |

Après ajout → redéployer (Vercel → Deployments → Redeploy).

### 6. Mise à jour `APP_URL` dans Supabase

Dans **Supabase Dashboard → Edge Functions → Manage secrets** :
- Mettre à jour `APP_URL` : `https://site-internet-mase-git-main-inizanyoann-jenovas-projects.vercel.app`

Cela corrige les URLs `success_url` et `cancel_url` générées par `create-checkout-session`.

### 7. Supabase Auth — Redirect URLs

Dans **Supabase → Authentication → URL Configuration → Redirect URLs**, ajouter :
- `https://site-internet-mase-git-main-inizanyoann-jenovas-projects.vercel.app`

Permet au callback OAuth Google de rediriger vers le domaine de prod.

---

## Ce qui ne change pas

- **Stripe webhook** : pointe vers `https://ulceeurwibmbtnqhkaao.supabase.co/functions/v1/stripe-webhook` — URL Supabase indépendante de Vercel, rien à modifier.
- **Google OAuth Client ID** : le callback OAuth passe par Supabase (`*.supabase.co/auth/v1/callback`), pas par Vercel — déjà configuré.
- **Edge Functions** : déjà déployées sur Supabase, non concernées par Vercel.

---

## Critères de succès

- [ ] Build Vercel vert (statut vert dans dashboard)
- [ ] `https://<url-vercel>/` affiche la HomePage
- [ ] `https://<url-vercel>/outil` affiche le générateur (pas de 404 au rechargement)
- [ ] Login Google fonctionne → redirect vers `/outil`
- [ ] Paiement Stripe test (`4242 4242 4242 4242`) → redirect vers `/outil?payment=success`
