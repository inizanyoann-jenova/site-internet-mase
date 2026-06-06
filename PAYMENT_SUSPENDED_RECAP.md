# Suspension des paiements — Récapitulatif

## Ce qui a été fait

### 1. Flag central (`src/lib/paymentConfig.ts`)
Un seul fichier contrôle tout : `PAYMENT_SUSPENDED = true`  
**Pour réactiver les paiements → mettre `false`**

### 2. Fichiers code modifiés

| Fichier | Modification |
|---|---|
| `src/lib/paymentConfig.ts` | Nouveau fichier — flag central |
| `src/pages/HomePage.tsx` | Prix remplacés par "Inclus — avec un compte" |
| `src/hooks/useAccess.ts` | Bypass vérification achat Politique SSE |
| `src/components/AccessGate.tsx` | Fermeture auto de la gate si connecté |
| `src/pages/MatricePage.tsx` | Bypass vérification achat Matrice |
| `src/pages/CartographieLandingPage.tsx` | Bypass vérification achat Cartographie |
| `src/pages/CartographieWizardPage.tsx` | Bypass vérification achat Wizard |
| `src/pages/DashboardPurchasePage.tsx` | Redirection automatique vers onboarding |
| `src/components/dashboard/DashboardGuard.tsx` | Bypass check abonnement annulé |
| `src/hooks/useCompany.ts` | Appel RPC setup_dev_company avant fetch |
| `src/pages/DashboardOnboardingPage.tsx` | Auto-création company via RPC |

### 3. SQL appliqué sur Supabase (`ulceeurwibmbtnqhkaao`)

**Tables créées :**
- `companies` — entreprises clientes
- `company_members` — membres des entreprises

**Policies RLS ajoutées :**
- `"Créer sa propre company"` sur `companies` (INSERT)
- `"Premier membre admin"` sur `company_members` (INSERT)

**Fonction RPC créée :**
```sql
setup_dev_company()
-- Crée company + membre admin pour l'utilisateur courant
-- security definer → contourne RLS
-- Idempotente : retourne l'ID existant si déjà créé
```

---

## Pour annuler (manip inverse)

### Étape 1 — Code
Dans `src/lib/paymentConfig.ts` : mettre `PAYMENT_SUSPENDED = false`

Puis remettre les prix dans `src/pages/HomePage.tsx` :
- Politique SSE : `19 €` / `paiement unique`
- Matrice : `19 €` / `paiement unique`
- Cartographie : `49 €` / `accès à vie`
- SMI Dashboard : `15 €` / `/mois · ou 299 € à vie`
- Pack Complet : `25 €` / `/mois · ou 399 € à vie`

### Étape 2 — Supabase (optionnel, si on veut nettoyer)
```sql
-- Supprimer la fonction dev
drop function if exists setup_dev_company();

-- Supprimer les policies dev
drop policy if exists "Créer sa propre company" on companies;
drop policy if exists "Premier membre admin" on company_members;
```

---

## Projet Supabase utilisé par l'app
- URL : `https://ulceeurwibmbtnqhkaao.supabase.co`
- Fichier : `.env.local` → `VITE_SUPABASE_URL`
- (Ne pas confondre avec `cwreletuirtrnviqlila` = "SMI-dashboard" séparé)
