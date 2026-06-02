# Spec — SMI Dashboard SaaS intégré dans site-internet-mase

**Date :** 2026-06-02  
**Statut :** Approuvé  
**Premier client test :** autret.maiwenn@hotmail.fr

---

## 1. Contexte et objectif

Intégrer le SMI Dashboard QHSE (actuellement dans `qhse-dashboard2` sur le bureau) dans `site-internet-mase` comme nouveau produit SaaS multi-tenant, vendu en abonnement aux entreprises souhaitant piloter leur système de management MASE.

**Contrainte critique :** `qhse-dashboard2` (compte inizan.yoann@gmail.com) est une application en production pour une entreprise réelle. Elle ne doit **jamais** être modifiée. Elle sert uniquement de référence de code source.

---

## 2. Architecture — Intégration progressive (Option C)

- **Repo unique :** tout dans `site-internet-mase` (pas de nouveau repo)
- **Supabase unique :** même projet Supabase `ulceeurwibmbtnqhkaao`
- **Déploiement :** Vercel existant, pas de nouveau déploiement
- **Auth :** Google OAuth déjà en place, réutilisée sans modification
- **Nouvelle route :** `/dashboard` — accessible uniquement après achat et onboarding entreprise

Les outils existants (Politique SSE, Matrice de Polyvalence) ne sont pas modifiés dans leur fonctionnement, seulement dans leur prix.

---

## 3. Modèle multi-tenant

Chaque entreprise cliente obtient un espace de données **totalement isolé**. L'isolation est assurée par :

### Nouvelles tables Supabase

**`companies`**
```
id            uuid PK
name          text NOT NULL          -- nom de l'entreprise
siret         text                   -- optionnel
admin_user_id uuid FK → auth.users   -- l'acheteur devient admin
stripe_customer_id text
subscription_status text            -- 'active' | 'lifetime' | 'canceled'
tool_slug     text                   -- 'smi-dashboard' | 'pack-mase-complet'
created_at    timestamptz
```

**`company_members`**
```
id                uuid PK
company_id        uuid FK → companies
user_id           uuid FK → auth.users   -- null si invitation en attente
email             text NOT NULL           -- email invité
role              text NOT NULL           -- 'admin' | 'responsable_qhse' | 'direction' | 'lecteur' | 'operateur'
invitation_token  uuid UNIQUE            -- token à usage unique, null une fois accepté
invited_at        timestamptz
accepted_at       timestamptz            -- null = invitation en attente
```

### Tables dashboard (portées depuis qhse-dashboard2)

Toutes les tables métier reçoivent un champ `company_id uuid NOT NULL FK → companies`. Les politiques RLS garantissent qu'un utilisateur ne voit que les données de son entreprise via la fonction SQL `get_user_company_id()` (retourne l'`id` de la `company` dont `auth.uid()` est membre actif).

Les 12 tables correspondant aux modules V1 :
`risques` (DUERP), `actions` (PDCA), `accidents`, `habilitations`, `employes`, `audits`, `non_conformites`, `reunions_qhse`, `objectifs_qhse`, `revue_direction`, `formations`, et les tables de listes de référence.

---

## 4. Tarification et produits Stripe

### Prix mis à jour (tous les outils)

| Outil | Prix | Type |
|---|---|---|
| Politique SSE | **19€** | Paiement unique |
| Matrice de Polyvalence | **19€** | Paiement unique |
| SMI Dashboard | **15€/mois** | Abonnement récurrent Stripe |
| SMI Dashboard | **299€** | Paiement unique (accès à vie) |
| Pack MASE Complet | **25€/mois** | Abonnement récurrent Stripe |
| Pack MASE Complet | **399€** | Paiement unique (accès à vie) |

### 4 nouveaux produits Stripe à créer

1. `smi-dashboard-monthly` — 15€/mois récurrent, metadata `tool_slug: smi-dashboard`
2. `smi-dashboard-lifetime` — 299€ one-time, metadata `tool_slug: smi-dashboard`
3. `pack-mase-monthly` — 25€/mois récurrent, metadata `tool_slug: pack-mase-complet`
4. `pack-mase-lifetime` — 399€ one-time, metadata `tool_slug: pack-mase-complet`

Le **Pack MASE Complet** donne accès à : Politique SSE + Matrice de Polyvalence + SMI Dashboard (12 modules).

### Vérification d'accès au dashboard

Un utilisateur peut accéder au dashboard si et seulement si il a un enregistrement dans `company_members` (`accepted_at IS NOT NULL`) pour une `company` dont `subscription_status IN ('active', 'lifetime')`. Le webhook Stripe est la seule source de vérité pour maintenir ce statut à jour.

---

## 5. Flux d'achat et onboarding

```
Homepage → clique "SMI Dashboard" ou "Pack Complet"
  → Page de choix : Mensuel (15€/mois) | À vie (299€)
  → Stripe Checkout Session (crée ou réutilise stripe_customer_id)
  → Stripe webhook reçoit checkout.session.completed
      → si abonnement : écoute aussi customer.subscription.updated/deleted
      → crée company (subscription_status = 'active' ou 'lifetime')
      → crée company_members (role = 'admin', user_id = acheteur)
  → Redirect vers /dashboard/onboarding
      → Formulaire : Nom de l'entreprise (obligatoire) + SIRET (optionnel)
      → Soumission → mise à jour companies.name/siret
  → Redirect vers /dashboard
```

### Gestion des abonnements récurrents

- Stripe webhook `customer.subscription.deleted` → `subscription_status = 'canceled'` → accès bloqué
- Stripe webhook `customer.subscription.updated` → mise à jour du statut
- Interface Stripe Customer Portal accessible depuis les paramètres du dashboard (gérer/annuler l'abonnement)

---

## 6. Gestion des utilisateurs par entreprise (page "Mon équipe")

Accessible uniquement au rôle `admin` :

- **Inviter un collègue** : saisir un email + choisir un rôle → crée un enregistrement `company_members` (avec `invitation_token` UUID généré) → Edge Function `invite-company-member` envoie l'email avec le lien `/dashboard/rejoindre?token=<uuid>`
- **Accepter l'invitation** : le collègue clique le lien → se connecte avec Google → le token est validé → `user_id` et `accepted_at` renseignés → `invitation_token` mis à null → accès au dashboard de l'entreprise
- **Changer le rôle** d'un membre
- **Révoquer l'accès** d'un membre

### Rôles et permissions

| Rôle | Lecture | Écriture | Admin équipe |
|---|---|---|---|
| admin | ✅ | ✅ | ✅ |
| responsable_qhse | ✅ | ✅ | ❌ |
| direction | ✅ | ❌ | ❌ |
| lecteur | ✅ | ❌ | ❌ |
| operateur | Partiel | Partiel | ❌ |

---

## 7. Modules V1 — périmètre et phases

### Phase 1 — Infrastructure (≈ 2 semaines)
Infrastructure multi-tenant complète avant le moindre module métier :
- Migration SQL : tables `companies`, `company_members`, RLS
- Stripe : 4 nouveaux produits, mise à jour Edge Functions `create-checkout-session` et `stripe-webhook`
- Route `/dashboard` avec garde d'accès (vérifie `company_members`)
- Page `/dashboard/onboarding`
- Page `/dashboard/equipe` (gestion membres)
- Mise à jour homepage (5 cartes, nouveaux prix SSE/Matrice)

### Phase 2 — 6 modules critiques MASE (≈ 4 semaines)
Portés depuis `qhse-dashboard2` en TypeScript, adaptés multi-tenant :

1. **DUERP** — registre des risques professionnels
2. **Plan d'actions PDCA** — actions correctives et préventives
3. **Accidents / Incidents** — déclaration, analyse, TF/TG
4. **Habilitations** — suivi des habilitations et alertes d'expiration
5. **KPIs Sécurité** — tableaux de bord TF, TG, taux de formation
6. **Revue de Direction** — comptes-rendus et décisions

### Phase 3 — 6 modules importants (≈ 4 semaines)

7. **Audits & Non-conformités** — audits qualité, suivi NC
8. **Social RH** — effectifs, formations, compétences
9. **Objectifs QHSE** — suivi des objectifs annuels
10. **Réunions QHSE** — planification et PV
11. **Vue Direction (Comex)** — dashboard résumé pour la direction
12. **Export Excel / PDF** — archives et rapports

### Modules V2 (hors périmètre de cette spec)
Environnement, Veille Réglementaire, RGPD, Notifications Email, Fournisseurs, Calendrier QHSE, Recherche globale, Journal d'audit, Paramètres avancés, Analyse Risque Chantier.

---

## 8. Navigation et UX dashboard

La sidebar du dashboard est organisée ainsi :

```
SMI Dashboard
├── Pilotage
│   ├── Vue Direction
│   ├── KPIs Sécurité
│   └── Objectifs QHSE
├── Sécurité
│   ├── DUERP
│   ├── Accidents / Incidents
│   ├── Habilitations
│   └── Plan d'actions
├── Qualité / RH
│   ├── Audits & NC
│   ├── Social RH
│   └── Réunions QHSE
├── Direction
│   ├── Revue de Direction
│   └── Export Excel / PDF
└── ──────────────────
    ├── Mon équipe (admin seulement)
    └── ← Retour au site
```

---

## 9. Homepage mise à jour

5 cartes dans la grille :

| Carte | Prix | Couleur |
|---|---|---|
| Politique SSE | 19€ | Vert (inchangé) |
| Matrice de Polyvalence | 19€ | Bleu (inchangé) |
| SMI Dashboard | 15€/mois · 299€ à vie | Violet/Indigo — badge "NOUVEAU" |
| Pack MASE Complet | 25€/mois · 399€ à vie | Or/Amber — badge "⭐ BEST VALUE" |
| Document Unique (DUERP) | Bientôt | Grisé (inchangé) |

---

## 10. Contraintes techniques

- **TypeScript** : tout nouveau code dans `site-internet-mase` est en `.tsx` / `.ts` (le dashboard source `qhse-dashboard2` est en JSX — on reporte en TypeScript lors du portage)
- **Tailwind v4** : même version que le site existant
- **React 19** : même version
- **Supabase** : même projet, pas de nouveau projet
- **Pas de migration de données** : `qhse-dashboard2` reste sur son propre Supabase, les clients du nouveau SaaS repartent de zéro
- **Edge Functions Deno** : les nouvelles Edge Functions s'ajoutent au dossier `supabase/functions/` existant. Nouvelles fonctions : `invite-company-member` (envoi email invitation), mise à jour de `create-checkout-session` et `stripe-webhook` pour gérer les abonnements et la création de `company`.
- **Nouvelle dépendance npm** : `recharts` (graphiques dans KPIs Sécurité, Vue Direction) — déjà utilisé dans `qhse-dashboard2`.

---

## 11. Ce qui est hors périmètre

- Modifier `qhse-dashboard2` de quelque façon que ce soit
- Import de données depuis une instance existante de qhse-dashboard2
- Mode hors-ligne
- Application mobile
- Intégration avec des logiciels RH ou ERP tiers
