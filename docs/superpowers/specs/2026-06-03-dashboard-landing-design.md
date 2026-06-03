# Spec — Page marketing /dashboard (pré-login)

**Date :** 2026-06-03
**Périmètre :** Visibilité & acquisition — Priorité 2

---

## Contexte

La route `/dashboard` redirige actuellement les visiteurs non connectés vers `/` via `DashboardGuard`. Il n'existe aucune page de présentation du produit SMI Dashboard accessible sans authentification. Un visiteur qui clique sur la card homepage ou tape l'URL n'a nulle part où atterrir.

La card SMI Dashboard sur la homepage existe déjà (card violette, badge "NOUVEAU", liens vers `/dashboard/acheter`). Ce point n'est pas à traiter.

---

## Objectif

Créer une page marketing à `/dashboard` visible par les visiteurs non connectés, présentant le produit et incitant à l'achat.

---

## Architecture & routing

Logique de décision au chargement de `/dashboard` :

```text
session === null
  → afficher DashboardLanding (page marketing)

session !== null + pas de company/membership
  → redirect /dashboard/onboarding  (comportement actuel via DashboardGuard)

session !== null + subscription canceled
  → redirect /dashboard/acheter  (comportement actuel via DashboardGuard)

session !== null + subscription active
  → afficher cockpit  (comportement actuel via DashboardGuard)
```

Changement minimal : `DashboardPage.tsx` reçoit une condition `if (!session) return <DashboardLanding />` avant de déléguer à `DashboardGuard`. Le guard lui-même n'est pas modifié.

---

## Composant DashboardLanding

**Fichier :** `src/components/dashboard/DashboardLanding.tsx`

### Section Nav

- Logo "MASE" (blanc sur fond bleu primaire `var(--mase-primary)`)
- `<Link to="/">← Accueil</Link>` (texte blanc/transparent)
- `<AuthButton session={null} />` (composant existant `src/components/AuthButton.tsx`)

### Section Hero (fond dégradé violet #6d28d9 → #4c1d95)

- Badge : "🏭 SMI Dashboard QHSE"
- Titre : "Pilotez votre SMI en un seul endroit"
- Sous-titre : "12 modules QHSE intégrés · Conforme MASE V2024 · Multi-utilisateurs"
- CTA primaire : "Démarrer à 15 €/mois →" → `/dashboard/acheter`
- CTA secondaire : "299 € accès à vie" → `/dashboard/acheter?plan=smi-lifetime`

### Section 12 modules (fond gris clair)

- Titre section : "12 modules inclus"
- Grille 4×3 (responsive : 2 colonnes mobile) — chaque module : icône + nom + sous-titre court

| Module | Icône | Sous-titre |
|---|---|---|
| Cockpit COMEX | 📊 | Score global |
| DUERP | 📋 | Registre des risques |
| Plan d'actions | ✅ | PDCA |
| Accidents | 🚨 | Déclaration & suivi |
| Habilitations | 🎓 | Alertes d'expiration |
| KPIs Sécurité | 📈 | TF, TG, heures |
| Revue Direction | 🏛️ | Comptes-rendus |
| Objectifs QHSE | 🎯 | Suivi annuel |
| Audits Qualité | 🔍 | Résultats & écarts |
| Social RH | 👥 | AT, formations |
| Réunions QHSE | 📅 | CSE, SST… |
| Export / Archives | 📦 | Excel + PDF |

### Section Pricing (fond blanc)

- Titre section : "Tarifs"
- 2 cartes côte à côte (1 colonne mobile) :
  - **Mensuel** : 15 €/mois · résiliable — bordure violette — CTA → `/dashboard/acheter`
  - **À vie** : 299 € · badge "⭐ BEST VALUE" — bordure ambre — CTA → `/dashboard/acheter?plan=smi-lifetime`
- Mention : "Paiement sécurisé Stripe · Multi-utilisateurs inclus"

### Footer

Reprise du footer existant (fond bleu primaire, copyright).

---

## Mise à jour DashboardPurchasePage

`DashboardPurchasePage.tsx` ne supporte actuellement que `?pack=complet` pour pré-sélectionner un plan. Il faut ajouter le support de `?plan=smi-lifetime` pour que le CTA "299 € à vie" de la landing pré-sélectionne le bon plan.

Changement : lire `searchParams.get('plan')` en plus de `searchParams.get('pack')` pour initialiser `selectedPlan`.

---

## Styles

Cohérence avec la card homepage :

- Couleur violette : `#7c3aed` / `#6d28d9` (existant dans `HomePage.tsx`)
- Tokens CSS existants : `var(--mase-primary)`, `var(--mase-heading)`, `var(--mase-muted)`
- Tailwind uniquement, pas de CSS custom

---

## Ce qui n'est PAS dans le périmètre

- Démo interactive ou capture d'écran du cockpit
- `DashboardGuard` : pas de modification
- Authentification inline sur la landing (AuthButton gère le flow OAuth existant)
