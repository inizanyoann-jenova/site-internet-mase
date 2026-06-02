# Design — HomePage Plateforme MASE

**Date :** 2026-06-02
**Scope :** Refonte de `src/pages/HomePage.tsx` pour refléter la vision multi-outils MASE + création table Supabase `tool_notifications` + mise à jour SEO `index.html`
**Approche retenue :** Structure plateforme-first avec grille d'outils centrale, style Soft & Élevé

---

## Contexte

La HomePage actuelle est centrée sur un seul produit (Politique SSE). Le site évolue vers une plateforme multi-outils MASE ("toute la documentation certifiante"). La Politique SSE reste le premier outil disponible (29 €), mais la page doit positionner clairement la vision plateforme et annoncer les outils à venir.

**Outils connus :**
- Politique SSE — disponible, 29 €, `/outil`
- Document Unique (évaluation des risques) — à venir
- Plan de Prévention (co-activité) — à venir

---

## Stack concernée

- `src/pages/HomePage.tsx` — React 19 + Tailwind v4
- `index.html` — balises SEO statiques
- Supabase — nouvelle table `tool_notifications`
- CSS variables existantes dans `src/index.css` (inchangées)

---

## Style visuel — Direction "Soft & Élevé"

Palette et variables inchangées. Effets ajoutés :

| Élément | Traitement |
|---|---|
| Badge héros | `background: rgba(255,255,255,0.15)`, `backdrop-filter: blur(4px)`, `border: 1px solid rgba(255,255,255,0.2)` |
| CTA héros | Bouton blanc, `color: #166534`, `box-shadow: 0 4px 12px rgba(0,0,0,0.15)` |
| Card SSE disponible | Fond `linear-gradient(145deg, #dcfce7, #bbf7d0)`, `border: 1.5px solid #86efac`, `box-shadow: 0 2px 8px rgba(22,101,52,0.12)` |
| Cards bientôt | Fond `#f8fafc`, `border: 1.5px solid #e2e8f0`, opacité 0.85 |
| Hover card SSE | `transform: translateY(-4px)`, `box-shadow: 0 8px 20px rgba(22,101,52,0.18)`, `transition: all 0.2s` |
| Hover cards bientôt | `transform: translateY(-4px)`, `box-shadow: 0 4px 12px rgba(0,0,0,0.08)`, `transition: all 0.2s` |
| Bouton "Me notifier" | Fond blanc, `border: 1.5px solid #166534`, `color: #166534` |

---

## Architecture de la page

### 1. Navigation
```
[MASE]                                [Se connecter]
fond: --mase-primary (#166534)
```
- Logo "MASE" — bold, blanc
- Lien "Se connecter" → `/outil` — texte blanc/70, hover blanc

### 2. Hero
```
fond: linear-gradient(135deg, #166534, #1e4d7b)
overlay: radial-gradient(circle at 70% 30%, rgba(255,255,255,0.06), transparent 60%)
```
- Badge glassmorphism : "🌿 Plateforme MASE · Conforme V2024"
- `<h1>` : "Toute la documentation MASE, facile"
- Sous-titre : "Les outils pour obtenir et renouveler votre certification MASE"
- CTA : `<a href="#outils">` bouton blanc "Découvrir les outils ↓"

### 3. Grille d'outils `id="outils"`
```
fond: white
label: "NOS OUTILS" — uppercase, tracking-widest, --mase-muted
grid: 1 col (mobile) → 3 col (sm+), gap-6, max-w-4xl centré
```

**Card Politique SSE (disponible)**
- Fond dégradé vert + bordure + ombre verte (voir tableau style)
- Icône : 📋
- Titre : "Politique SSE"
- Sous-titre : "Conforme Exig. 1.2 MASE V2024 · 10 min"
- Badge vert : "✓ Disponible"
- Prix : "29 €" (font-extrabold) + "paiement unique" (muted)
- Bouton : "Démarrer →" → `/outil` (fond `--mase-primary`, blanc)

**Card Document Unique (bientôt)**
- Fond `#f8fafc`, bordure `#e2e8f0`, opacité 0.85
- Icône : 📂
- Titre : "Document Unique"
- Sous-titre : "Évaluation des risques professionnels"
- Badge gris : "Bientôt"
- Bouton : "🔔 Me notifier" → ouvre modal (`tool_slug: "document-unique"`)

**Card Plan de Prévention (bientôt)**
- Identique Document Unique
- Icône : 🛡️
- Titre : "Plan de Prévention"
- Sous-titre : "Co-activité et sous-traitance"
- Bouton → modal (`tool_slug: "plan-prevention"`)

### 4. Modal "Me notifier"
Déclenché par les boutons "🔔 Me notifier". Overlay sombre + card centrée.

```
Titre : "Être notifié pour [Nom de l'outil]"
Champ : input email (requis, placeholder "votre@email.com")
Bouton : "M'inscrire" → appel Supabase INSERT
États : idle / loading / success ("✓ Inscrit ! Vous serez notifié à la sortie.") / error ("Une erreur est survenue. Réessayez.")
Fermeture : croix ou clic overlay
Doublons : acceptés (pas de vérification côté client ni serveur — KISS)
```

Le modal est un composant React autonome : `<NotifyModal toolName={string} toolSlug={string} onClose={() => void} />`

### 5. Comment ça marche *(Politique SSE)*
```
fond: --mase-card-strong (#dcfce7)
label: "COMMENT FONCTIONNE LA POLITIQUE SSE"
```
3 cards blanches avec ombre (identiques à l'actuel) :
- 📋 1 — Diagnostic · "~20 questions SWOT + PESTEL SSE"
- ⚡ 2 — Génération · "Politique personnalisée à votre profil"
- 📥 3 — Téléchargement · "DOCX + PDF prêts à dater et signer"

### 6. Ce que contient le document *(Politique SSE)*
```
fond: white
label: "CE QUE CONTIENT LE DOCUMENT"
grid: 1 col → 2 col (sm+), max-w-2xl centré
```
Checklist des 6 sections (inchangée) avec fond `#f0f7ff` et icône ✓ verte.

### 7. Footer
```
fond: --mase-primary
texte: "© 2026 MASE Tools — Toute la documentation certifiante."
```

---

## Supabase — Table `tool_notifications`

```sql
create table public.tool_notifications (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  tool_slug   text not null,
  created_at  timestamptz not null default now()
);
```

**RLS :** insert public activé (pas d'auth requise pour s'inscrire).

```sql
alter table public.tool_notifications enable row level security;

create policy "allow public insert"
  on public.tool_notifications
  for insert
  with check (true);
```

Le `tool_slug` prend les valeurs `"document-unique"` ou `"plan-prevention"` (extensible).

---

## Mise à jour SEO (`index.html`)

Le title et la meta description actuels parlent uniquement de la Politique SSE. Ils doivent refléter la vision plateforme :

```html
<title>MASE Tools — Toute la documentation certifiante MASE</title>
<meta name="description" content="La plateforme des outils MASE : Politique SSE, Document Unique, Plan de Prévention. Documents conformes V2024 générés en 10 minutes. Pour PME du BTP et de l'industrie." />
```

Les balises Open Graph (`og:title`, `og:description`, `twitter:title`, `twitter:description`) sont mises à jour de la même façon. `og:image` reste inchangée.

---

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/pages/HomePage.tsx` | Réécriture complète |
| `src/components/NotifyModal.tsx` | Nouveau composant |
| `index.html` | Mise à jour title + meta description + OG |
| Supabase | Migration `tool_notifications` |

---

## Ce qui n'est PAS dans ce scope

- Refonte de l'outil `/outil` (App.tsx) — inchangé
- Authentification pour le modal (inscription anonyme suffisante)
- Page dédiée par outil (`/outils/politique-sse`, etc.)
- Animations CSS complexes au scroll (Intersection Observer) — hors scope, hover suffisant
- Tests automatisés
