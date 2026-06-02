# Spec — Auth Google, Stripe & Sauvegarde questionnaire

Date : 2026-06-02  
Statut : validé  
Projet : `site-internet-mase` — Outil Politique SSE  
Itération : 2 (auth + paiement + persistance)

## 1. Objectif

Trois fonctionnalités livrées ensemble car elles partagent la même infrastructure Supabase :

1. **Vérifier le flow OAuth Google** — s'assurer que la redirection Google → Supabase → app fonctionne de bout en bout.
2. **Stripe + gating** — bloquer l'accès à l'outil derrière un paiement unique de 29 €.
3. **Sauvegarde des réponses** — permettre à un utilisateur connecté et payant de reprendre son questionnaire.

## 2. Flux utilisateur

```text
Clic "Démarrer le diagnostic"
│
├─ Non connecté → modal "Connexion requise" (bouton Google OAuth)
│   └─ Après callback OAuth →
│
├─ Connecté, pas d'achat → modal "Accès payant" → redirect Stripe Checkout (29 €)
│   └─ Paiement réussi → webhook → Supabase purchases → retour /?payment=success
│
└─ Connecté + achat confirmé → accès questionnaire
    └─ Si réponses sauvegardées → bouton "Reprendre" sur l'écran d'accueil
```

Au retour de Stripe (`/?payment=success`), l'app relit la table `purchases` et lève le gating sans action utilisateur supplémentaire.

## 3. Vérification OAuth Google (feature 1)

Points de contrôle à valider avant tout développement :

- **Supabase dashboard** → Authentication → Providers → Google : provider activé avec le Client ID et Client Secret du projet GCP `DEF-OI-FREE`.
- **Google Cloud Console** → OAuth 2.0 Client → Authorized redirect URIs : contient `https://ulceeurwibmbtnqhkaao.supabase.co/auth/v1/callback`.
- **Code `AuthButton.tsx`** : `redirectTo: window.location.origin` est correct pour le développement local (`http://localhost:5173`) et la production.

Aucune modification de code pour cette feature — c'est une vérification de configuration.

## 4. Base de données Supabase (feature 2 & 3)

### Table `purchases`

```sql
create table purchases (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users not null,
  stripe_session_id text unique not null,
  amount_cents      int not null,
  created_at        timestamptz default now()
);

alter table purchases enable row level security;

create policy "Lecture par propriétaire"
  on purchases for select
  using (auth.uid() = user_id);
```

Seul le webhook (service role) peut écrire dans cette table. Les clients ne peuvent que lire leur propre ligne.

### Table `questionnaire_progress`

```sql
create table questionnaire_progress (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users unique not null,
  answers    jsonb not null,
  updated_at timestamptz default now()
);

alter table questionnaire_progress enable row level security;

create policy "CRUD par propriétaire"
  on questionnaire_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## 5. Edge Functions Supabase

### `create-checkout-session`

- **Déclencheur** : appelée depuis le frontend quand l'utilisateur clique "Accéder pour 29 €".
- **Entrée** : `{ user_id: string, email: string }`
- **Logique** : crée une Stripe Checkout Session (mode `payment`, prix 2900 centimes) avec `success_url = APP_URL/?payment=success&session_id={CHECKOUT_SESSION_ID}`, `cancel_url = APP_URL/`, et `metadata: { user_id }` — ce champ est indispensable pour que le webhook sache quel utilisateur créditer.
- **Sortie** : `{ url: string }` — l'URL de la page Stripe hébergée.
- **Variables d'env** : `STRIPE_SECRET_KEY`, `APP_URL`.

### `stripe-webhook`

- **Déclencheur** : webhook Stripe sur l'event `checkout.session.completed`.
- **Logique** : vérifie la signature Stripe (`STRIPE_WEBHOOK_SECRET`), extrait `user_id` depuis les metadata de la session, insère dans `purchases` avec le service role Supabase.
- **Variables d'env** : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## 6. Frontend

### Nouveaux fichiers

| Fichier | Rôle |
| --- | --- |
| `src/lib/stripe.ts` | Appelle `create-checkout-session` et redirige (`window.location.href = url`) |
| `src/hooks/useAccess.ts` | Lit `purchases` + `questionnaire_progress` en parallèle, retourne `{ hasPurchase, isLoading, savedAnswers }` |
| `src/components/AccessGate.tsx` | Overlay affiché si l'accès est bloqué ; deux états : "non connecté" ou "connecté sans achat" |

### Modifications des fichiers existants

**`App.tsx`**

- Appelle `useAccess(session)`.
- Sur clic "Démarrer" : si `!hasPurchase` → affiche `<AccessGate>`, sinon passe à l'étape questionnaire.
- Détecte `?payment=success` au montage : si présent, relit les purchases (polling léger ou re-fetch) et retire le paramètre de l'URL.
- Passe `savedAnswers` à `<Welcome>`.
- Passe un callback `onSaveAnswers` à `<Questionnaire>`.

**`Welcome.tsx`**

- Reçoit `savedAnswers: Record<string, string> | null`.
- Si non null → affiche un second bouton "Reprendre mon diagnostic" qui charge les réponses et saute directement à l'étape infos entreprise.

**`Questionnaire.tsx`**

- Reçoit `onSaveAnswers: (answers: Record<string, string>) => void`.
- Au clic "Continuer" (fin du questionnaire) : appelle `onSaveAnswers` avant de changer d'étape. L'appel est best-effort (erreur silencieuse, ne bloque pas la navigation).

### `useAccess` — comportement détaillé

```text
useAccess(session):
  si session == null → { hasPurchase: false, isLoading: false, savedAnswers: null }
  sinon → requêtes parallèles :
    - supabase.from('purchases').select().eq('user_id', session.user.id).maybeSingle()
    - supabase.from('questionnaire_progress').select().eq('user_id', session.user.id).maybeSingle()
  retourne { hasPurchase: !!purchase, isLoading, savedAnswers: progress?.answers ?? null }
```

Re-fetch déclenché quand `session` change (après OAuth callback ou retour de Stripe).

## 7. Gestion du retour Stripe (`?payment=success`)

Au retour de Stripe, le webhook a déjà écrit dans `purchases` (asynchrone). Pour absorber le délai :

1. L'app détecte `?payment=success` dans l'URL au montage.
2. Elle force un re-fetch de `useAccess` toutes les 2 secondes, jusqu'à 10 secondes max.
3. Dès que `hasPurchase` devient `true`, elle retire le param de l'URL et déverrouille l'accès.
4. Si après 10 secondes toujours rien : afficher un message "Paiement reçu, vérification en cours… rechargez la page dans quelques instants."

## 8. Sécurité

- La clé secrète Stripe (`STRIPE_SECRET_KEY`) n'est jamais exposée côté client.
- La table `purchases` n'est accessible en lecture que par l'utilisateur propriétaire (RLS).
- Le webhook vérifie la signature Stripe avant toute écriture.
- La table `questionnaire_progress` est protégée par RLS : un utilisateur ne peut lire/écrire que ses propres données.

## 9. Ce qui est hors périmètre

- Gestion des remboursements Stripe.
- Email de confirmation post-achat (géré par Stripe nativement).
- Dashboard admin pour voir les achats.
- Multi-outils (le gating est spécifique à l'outil Politique SSE pour l'instant).

## 10. Critères de succès

- Un utilisateur non connecté cliquant "Démarrer" voit la modal de connexion.
- Après connexion Google, s'il n'a pas acheté, il est redirigé vers Stripe.
- Après paiement, il accède au questionnaire sans action supplémentaire.
- Un utilisateur connecté et payant qui a déjà rempli le questionnaire voit le bouton "Reprendre".
- La clé secrète Stripe n'apparaît nulle part dans le code source frontend.
