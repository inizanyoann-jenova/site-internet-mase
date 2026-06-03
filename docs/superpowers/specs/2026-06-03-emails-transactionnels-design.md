# Spec : Emails transactionnels — invitations équipe + confirmation paiement

**Date :** 2026-06-03  
**Scope :** Intégration Resend dans les Edge Functions Supabase pour envoyer deux types d'emails transactionnels.

---

## Contexte

Deux flux ne déclenchent actuellement aucun email :

1. **Invitation d'équipe** : `invite-company-member` génère un `invite_url` mais l'admin doit le copier-coller manuellement. Le destinataire ne reçoit rien.
2. **Confirmation post-paiement** : `stripe-webhook` crée la company en DB après un achat Stripe mais ne notifie pas l'acheteur.

Aucun service email n'est configuré dans le projet.

---

## Architecture

### Approche retenue : module partagé `_shared/resend.ts`

```
supabase/functions/
  _shared/
    cors.ts            (existant)
    resend.ts          (NOUVEAU)
  invite-company-member/index.ts   (modifié)
  stripe-webhook/index.ts          (modifié)
```

### Secrets Supabase à ajouter

| Clé | Valeur |
|-----|--------|
| `RESEND_API_KEY` | Clé API Resend (re_xxxxx) |
| `RESEND_FROM` | `"MASE Dashboard <noreply@mase-outil.fr>"` |

À configurer via : Supabase Dashboard → Project Settings → Edge Functions → Secrets.

> **Prérequis Resend :** le domaine expéditeur (`mase-outil.fr` ou autre) doit être vérifié dans le dashboard Resend (DNS → TXT + DKIM). En attendant la vérification, utiliser `onboarding@resend.dev` comme `RESEND_FROM` pour les tests.

---

## Module `_shared/resend.ts`

```typescript
export async function sendEmail(to: string, subject: string, html: string): Promise<void>
```

- Appelle `https://api.resend.com/emails` via `fetch`
- Headers : `Authorization: Bearer ${RESEND_API_KEY}`, `Content-Type: application/json`
- Body : `{ from: RESEND_FROM, to, subject, html }`
- Si `RESEND_API_KEY` absent : `console.warn` + return silencieux
- En cas d'erreur HTTP Resend : `console.error` + throw (attrapé par l'appelant)

**Principe clé :** les appelants wrappent `sendEmail()` dans un `try/catch` et ignorent l'erreur — l'email n'est jamais bloquant pour l'opération principale.

---

## Email d'invitation (`invite-company-member`)

### Déclenchement
Après insertion réussie en DB ET pour le cas "invitation existante" (re-send).

### Contenu

**Objet :** `Vous avez été invité à rejoindre [company.name] sur MASE Dashboard`

**Corps HTML :**
- En-tête MASE avec couleur primaire (`#1B4F8A`)
- Message : "Bonjour, vous avez été invité à rejoindre l'équipe **[company.name]** en tant que **[rôle]**."
- Bouton CTA "Rejoindre l'équipe" → `invite_url`
- Note de bas de page : "Ce lien est à usage unique. S'il ne fonctionne pas, demandez une nouvelle invitation à votre administrateur."

### Données disponibles dans la fonction
- `body.email` — destinataire
- `body.role` — rôle attribué
- `body.company_id` — pour récupérer `company.name` (requête Supabase avant envoi)
- `inviteUrl` — lien d'acceptation

### Changement UI `DashboardTeamPage`
Remplacer :
```
`Invitation envoyée à ${inviteEmail}. Lien : ${result.invite_url}`
```
Par :
```
`Invitation envoyée par email à ${inviteEmail}.`
```

---

## Email de confirmation post-paiement (`stripe-webhook`)

### Déclenchement
Dans le handler `checkout.session.completed`, après création réussie en DB.  
Deux cas selon `toolSlug` :

### Cas 1 : Dashboard (abonnement/lifetime)
`DASHBOARD_SLUGS = ['smi-dashboard', 'pack-mase-complet']`

**Objet :** `Bienvenue sur MASE Dashboard — votre accès est activé`

**Corps HTML :**
- En-tête MASE
- "Merci pour votre achat !"
- Récapitulatif : produit (`tool_slug` humanisé), montant (ex: `15,00 €`), type (`Abonnement mensuel` ou `Accès à vie`)
- Bouton CTA "Configurer mon dashboard" → `/dashboard/onboarding`
- Section "Étapes suivantes" :
  1. Nommez votre entreprise
  2. Invitez votre équipe
  3. Commencez à remplir vos données QHSE
- Contact support : `inizan.yoann@gmail.com`

### Cas 2 : Outils one-shot (politique-sse, matrice-polyvalence)
**Objet :** `Votre accès à [nom de l'outil] est confirmé`

**Corps HTML :**
- En-tête MASE
- "Merci pour votre achat !"
- Récapitulatif : outil acheté, montant
- Bouton CTA "Accéder à l'outil" → lien direct vers l'outil (`/outil` ou `/matrice-polyvalence`)

### Données disponibles dans le webhook
- `userData?.user?.email` — destinataire (déjà récupéré dans le code existant)
- `session.amount_total` — montant en centimes (diviser par 100 pour €)
- `session.mode` — `subscription` ou `payment`
- `toolSlug` — pour humaniser le nom du produit

---

## Gestion des erreurs

- Envoi email toujours dans un `try/catch` — jamais bloquant
- Erreur email → `console.error` uniquement, pas de rollback DB
- Si `RESEND_API_KEY` manquant → warn + skip (permet de développer sans clé)
- La réponse HTTP de la Edge Function n'est pas affectée par un échec email

---

## Ce qui n'est PAS dans ce scope

- Templates email stockés en DB ou CMS — les templates sont inline dans le code
- Email de bienvenue à l'inscription (hors achat) — géré par Supabase Auth
- Emails marketing ou newsletters
- Unsubscribe / gestion des préférences email
