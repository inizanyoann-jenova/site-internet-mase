# Design — Outil Cartographie des Processus MASE

**Date :** 2026-06-04  
**Statut :** Approuvé  
**Auteur :** Yoann Inizan  
**Plateforme :** site-internet-mase (React 19 + Vite + Tailwind v4 + Supabase + Mistral AI)

---

## 1. Objectif du produit

Ajouter un nouvel outil payant à la plateforme MASE : un **générateur guidé de Cartographie des Processus** conforme au référentiel MASE V2024. L'outil est conçu pour être utilisé par une personne sans connaissance préalable en gestion des processus.

**Valeur délivrée :**
- Une cartographie visuelle au format standard ISO 9001 / MASE (client gauche/droite, pilotage haut, réalisation milieu, support bas)
- Des fiches de processus détaillées avec objectifs SMART, KPIs, risques — conformes aux 5 axes MASE V2024
- Un document PDF bundle complet remis à l'auditeur MASE

---

## 2. Positionnement dans la plateforme

- Nouvel outil sur la `HomePage` (grille des outils)
- Route : `/cartographie`
- Modèle économique : paiement unique Stripe (prix à définir, cohérent avec les autres outils — environ 39-49 €)
- Données sauvegardées dans Supabase sous `user_id` (RLS) pour permettre de reprendre et mettre à jour chaque année
- Auth Google OAuth déjà en place, réutilisée

---

## 3. Architecture générale — Approche deux phases

L'outil suit une logique en **deux phases distinctes**, avec l'IA intégrée à trois niveaux :

```
[Introduction pédagogique]
        ↓
[PHASE 1 : Cartographie] → PDF cartographie visuelle
        ↓
[PHASE 2 : Fiches de processus] → PDF fiches + PDF bundle complet
```

L'utilisateur peut sauvegarder et reprendre entre les deux phases. La Phase 2 peut être complétée en plusieurs sessions.

---

## 4. Écran d'introduction pédagogique

Avant toute saisie, l'outil affiche une page d'accueil qui explique en langage zéro-jargon :

- **Ce qu'est une cartographie des processus** : "C'est la carte de votre entreprise — elle montre toutes vos activités et comment elles s'enchaînent."
- **Ce qu'est un processus** : "C'est une activité qui transforme quelque chose en entrée (une demande) en quelque chose en sortie (un résultat)."
- **Ce que sont les processus métier** : "Ce sont vos activités qui génèrent de la valeur pour votre client — votre cœur de métier."
- **Un exemple concret adapté au secteur** (BTP, maintenance, industrie…) avec la phrase du type : *"Votre client envoie un appel d'offre → vous faites un devis → vous réalisez le chantier → vous livrez. Chacune de ces étapes est un processus."*
- Durée estimée : 45 à 60 minutes
- Bouton "Je comprends, on commence →"

---

## 5. Intégration IA — 3 niveaux

### Niveau 1 — Génération du premier jet au démarrage

L'utilisateur saisit : nom de l'entreprise + secteur d'activité + ville.

L'IA (Mistral Large via `@mistralai/mistralai`) génère un premier jet de cartographie complète basé sur :

1. Le **secteur d'activité** saisi (principal signal de génération)
2. Le **nom et la ville** de l'entreprise — Mistral génère à partir de sa connaissance générale du secteur et peut mentionner des éléments typiques d'entreprises similaires. **Attention : Mistral Large n'a pas d'accès web natif**, il ne fait donc pas une vraie recherche en ligne sur l'entreprise. La génération est basée sur le secteur, pas sur des données publiques de l'entreprise spécifique.
3. Les 8 modèles sectoriels codés en dur dans l'application servent de base de prompting pour guider la génération.

L'utilisateur voit le premier jet et choisit : "✓ Utiliser comme base" ou "Modifier". Il ne part jamais d'une page blanche.

**Fallback :** si l'appel Mistral échoue (réseau, quota), l'utilisateur choisit directement parmi 8 modèles sectoriels pré-remplis ou "page blanche guidée".

### Niveau 2 — Reformulation SMART automatique

Quand l'utilisateur saisit un objectif en langage naturel (ex : *"livrer mes chantiers à temps"*), l'IA reformule automatiquement en objectif SMART complet :

- Objectif précis et mesurable
- Indicateur de mesure
- Valeur cible chiffrée
- Fréquence de mesure
- Échéance (date)

L'utilisateur peut accepter ou modifier chaque champ.

### Niveau 3 — Bouton "✨ Aide IA" à la demande

Présent sur les questions difficiles uniquement (risques, activités internes, ressources, documents associés). L'IA génère une suggestion contextuelle basée sur le secteur et les réponses précédentes. L'utilisateur n'est jamais forcé de l'utiliser.

**Coût estimé :** < 0,05 € par cartographie complète générée (Mistral Large).

---

## 6. Phase 1 — Construire la cartographie (8 étapes)

### Étape 1 — Votre entreprise
1. Nom de l'entreprise
2. Secteur d'activité principal (liste + saisie libre)
3. Effectif (nombre de salariés)
4. Nom et poste du responsable SSE / Qualité *(MASE Axe 1)*
5. Date de création du document

### Étape 2 — Point de départ *(IA Niveau 1 ici)*
- Si l'IA a généré un premier jet : affichage pour validation/modification
- Sinon : choix parmi 8 secteurs types (BTP, maintenance industrielle, nettoyage, électricité/installation, bureau d'études, transport/logistique, industrie/fabrication, prestation de service) ou "page blanche"
- Chaque secteur affiche un exemple miniature de cartographie pour repère visuel

### Étape 3 — Processus de Pilotage
Explication pédagogique : *"Le pilotage regroupe les activités de décision stratégique — celles qui donnent le cap à toute l'entreprise (direction, revue de direction, amélioration continue…)."*

Pour chaque processus de pilotage (2 à 4 en général) :
1. Nom du processus
2. Pilote (prénom + poste)
3. Rôle en une phrase

### Étape 4 — Processus de Réalisation
Explication pédagogique : *"Ce sont vos activités principales — celles pour lesquelles vos clients vous paient. Elles transforment une demande en un résultat concret."*

Pour chaque processus de réalisation (3 à 7 en général) :
1. Nom du processus
2. Position dans la séquence : après quel processus ? ou en parallèle avec quel autre ?
3. Élément entrant : qu'est-ce que ce processus reçoit pour démarrer ? *(MASE Axe 3)*
4. Élément sortant : qu'est-ce qu'il produit à la fin ?
5. Responsable (prénom + poste)

**Architecture supportée :**
- Séquentielle (A → B → C → D)
- Parallèle partielle (A → [B // C] → D)
- Multi-parallèle (A → [B // C // D] → E)
- Itérative (avec boucle de validation)

### Étape 5 — Processus Support
Explication pédagogique : *"Les processus support ne délivrent pas directement au client, mais ils fournissent tout ce dont vos équipes ont besoin pour travailler : les personnes, le matériel, les outils…"*

Pour chaque processus support (3 à 6 en général) :
1. Nom du processus
2. Pilote (prénom + poste)
3. Quels processus de réalisation ce support alimente-t-il ? (sélection multiple)

### Étape 6 — Validation automatique des flux

L'outil vérifie automatiquement (vérifications structurelles, pas sémantiques) :

- Tous les champs "élément entrant" et "élément sortant" des processus de réalisation sont renseignés (non vides)
- Tous les processus ont un pilote identifié
- Les processus support sont liés à au moins un processus de réalisation
- Alerte visuelle si des champs obligatoires sont manquants, avec indication de l'étape à compléter

**Note :** l'outil ne peut pas vérifier automatiquement que l'élément sortant du processus A correspond sémantiquement à l'élément entrant du processus B (vérification humaine nécessaire). L'aperçu interactif de l'étape 7 permet à l'utilisateur de faire cette vérification visuellement.

### Étape 7 — Aperçu interactif
Affichage de la cartographie complète au format standard :
- CLIENT (besoins) à gauche → RÉALISATION au centre → CLIENT (satisfaction) à droite
- PILOTAGE au-dessus
- SUPPORT en dessous
- Flèches avec éléments entrants/sortants entre processus de réalisation
- Processus parallèles affichés côte à côte verticalement
- L'utilisateur peut cliquer sur un processus pour le modifier avant export

### Étape 8 — Export Phase 1
- **PDF cartographie** au format A3 paysage (ou A4 paysage) — standard MASE
- Données sauvegardées en Supabase
- Invitation à démarrer la Phase 2

---

## 7. Phase 2 — Fiches de processus détaillées

Pour **chaque processus** identifié en Phase 1 (pilotage + réalisation + support), l'outil guide la complétion d'une fiche. Les données de la Phase 1 sont pré-remplies.

**Ordre de traitement :** réalisation en premier (cœur du métier), puis pilotage, puis support.

### Bloc A — Identité et finalité *(~4 questions)*
1. Nom du processus *(pré-rempli)*
2. Pilote du processus *(pré-rempli)*
3. Participants / acteurs du processus *(MASE Axe 2)* — liste des personnes ou fonctions impliquées
4. Finalité : en une phrase simple, à quoi sert ce processus ? *(bouton "✨ Aide IA" disponible)*

### Bloc B — Flux et activités *(~4 questions)*
5. Données / documents d'entrée *(pré-rempli depuis Phase 1)* — possibilité d'enrichir *(MASE Axe 3)*
6. Activités principales : les 3 à 6 grandes étapes internes du processus *(bouton "✨ Aide IA" disponible)*
7. Données / documents de sortie *(pré-rempli depuis Phase 1)* — possibilité d'enrichir
8. Ressources nécessaires : humaines, matérielles, logiciels *(bouton "✨ Aide IA" disponible)*

### Bloc C — Objectif SMART *(~5 questions — IA Niveau 2)* *(MASE Axes 1 & 4)*
9a. Objectif en langage naturel → reformulé automatiquement par l'IA en objectif SMART
9b. Indicateur de mesure (comment mesure-t-on ?) — pré-rempli par l'IA, modifiable
9c. Valeur cible chiffrée (ex : 95%, 0 accident, < 48h…)
9d. Fréquence de mesure (mensuelle, trimestrielle, annuelle)
9e. Échéance pour atteindre cet objectif (date)

**Indicateurs complémentaires (KPIs de suivi) :**
- Indicateur de résultat (lagging) : mesure après coup (ex : taux de livraison dans les délais)
- Indicateur de suivi/proactif (leading) : mesure en cours d'action (ex : nb de réunions de suivi chantier) *(MASE V2024 : les deux types sont exigés)*

### Bloc D — Risques et documentation *(~3 questions)*
10. Risques principaux : 1 à 3 risques pouvant affecter ce processus *(bouton "✨ Aide IA" disponible)* *(MASE Axe 3)*
11. Documents associés : procédures, instructions de travail, formulaires liés à ce processus
12. Fréquence de révision de la fiche (annuelle recommandée) *(MASE Axe 5)*

**Total : 12 questions par processus** (dont plusieurs pré-remplies depuis Phase 1)

---

## 8. Format visuel de la cartographie (PDF généré)

### Standard respecté
Format ISO 9001 / MASE standard :
- CLIENT (besoins/exigences) à **gauche** — flèche entrante
- CLIENT (satisfaction/livrables) à **droite** — flèche sortante
- PROCESSUS DE PILOTAGE en **haut** — flèches vers le bas (oriente)
- PROCESSUS DE RÉALISATION au **centre** — flux horizontal avec éléments entrants/sortants
- PROCESSUS SUPPORT en **bas** — flèches vers le haut (alimente)

### Processus parallèles
Les processus en parallèle sont affichés côte à côte verticalement dans le bloc de réalisation, réunis par une accolade ou un connecteur visuel avant/après.

### Éléments entrants/sortants
Chaque flèche entre deux processus de réalisation porte un libellé indiquant l'élément qui transite (document, produit, décision).

### Format de sortie
- Cartographie : PDF A3 paysage (ou A4 paysage selon préférence)
- Fiches processus : PDF A4 portrait, une fiche par page
- Bundle : PDF multi-pages (cartographie + toutes les fiches)

**Technologie :** `@react-pdf/renderer` (déjà dans le projet)

---

## 9. Conformité MASE V2024

| Axe MASE | Couverture par l'outil |
|----------|----------------------|
| Axe 1 — Engagement Direction | Pilotes identifiés, objectifs chiffrés et datés, responsable SSE/Qualité nommé |
| Axe 2 — Compétences | Acteurs et responsabilités par processus |
| Axe 3 — Préparation/Réalisation | Données entrée/sortie, risques, ressources, activités détaillées |
| Axe 4 — Contrôle et efficacité | Indicateurs de résultat (lagging) + de suivi (leading), valeurs cibles, fréquences |
| Axe 5 — Amélioration continue | Fréquence de révision, base de comparaison annuelle via sauvegarde Supabase |

---

## 10. Livrables PDF

| Livrable | Format | Quand |
|----------|--------|-------|
| Cartographie visuelle | PDF A3/A4 paysage | Fin Phase 1 |
| Fiches de processus | PDF A4 portrait (une par processus) | Fin Phase 2 |
| Document bundle complet | PDF multi-pages (cartographie + fiches) | Fin Phase 2 |

---

## 11. Données Supabase

### Nouvelle table : `process_maps`
```sql
id uuid primary key
user_id uuid references auth.users
company_name text
sector text
headcount int
sse_manager_name text
sse_manager_role text
document_date date
phase_1_completed boolean default false
phase_2_completed boolean default false
cartography_data jsonb  -- processus pilotage, réalisation, support, flux
created_at timestamptz
updated_at timestamptz
```

### Nouvelle table : `process_sheets`
```sql
id uuid primary key
map_id uuid references process_maps
process_type text  -- 'pilotage' | 'realisation' | 'support'
process_name text
pilot_name text
pilot_role text
participants text[]
purpose text
inputs jsonb
activities jsonb
outputs jsonb
resources jsonb
smart_objective jsonb  -- {text, indicator, target, frequency, deadline}
kpi_lagging text
kpi_leading text
risks jsonb
documents text[]
revision_frequency text
created_at timestamptz
updated_at timestamptz
```

RLS activé sur les deux tables :

- `process_maps` : politique directe `user_id = auth.uid()`
- `process_sheets` : politique indirecte via JOIN — `EXISTS (SELECT 1 FROM process_maps WHERE process_maps.id = process_sheets.map_id AND process_maps.user_id = auth.uid())`

---

## 12. Stack et intégrations

- **Frontend :** React 19 + Vite 5 + Tailwind v4 + TypeScript (existant)
- **Routing :** `/cartographie` → nouvelle page, `react-router-dom v7` (existant)
- **Auth :** Google OAuth Supabase (existant)
- **Paiement :** Stripe Checkout paiement unique (existant, même pattern que Politique SSE)
- **PDF :** `@react-pdf/renderer` (existant)
- **IA :** `@mistralai/mistralai` avec modèle `mistral-large-latest` (existant)
- **Base de données :** Supabase — 2 nouvelles tables (`process_maps`, `process_sheets`)

---

## 13. Hors périmètre (V1)

- Collaboration multi-utilisateurs sur la même cartographie
- Import depuis un fichier existant (Word, Excel)
- Éditeur visuel drag-and-drop de la carte (cartographie générée automatiquement depuis les réponses)
- Notifications par email de révision annuelle
- Export Word (.docx)
- Comparaison entre deux versions de la cartographie

---

## 14. Parcours utilisateur résumé

```
Landing /cartographie (page marketing)
    ↓ [Acheter — Stripe]
    ↓ [Connexion Google si pas connecté]
Introduction pédagogique (concepts + exemple)
    ↓
PHASE 1 — 8 étapes
    Étape 1 : Infos entreprise
    Étape 2 : IA recherche + modèle de départ
    Étape 3 : Processus de pilotage
    Étape 4 : Processus de réalisation (flux + parallèles)
    Étape 5 : Processus support
    Étape 6 : Validation automatique des flux
    Étape 7 : Aperçu interactif de la carte
    Étape 8 : Export PDF cartographie ← LIVRABLE 1
    ↓ [Sauvegarde Supabase]
PHASE 2 — Boucle sur chaque processus
    Pour chaque processus :
        Bloc A : Identité + finalité
        Bloc B : Flux + activités
        Bloc C : Objectif SMART (IA reformulation automatique) + KPIs
        Bloc D : Risques + documents + révision
    ↓ [Tous les processus complétés]
Export PDF fiches + bundle complet ← LIVRABLES 2 & 3
    ↓ [Sauvegarde Supabase — révisable chaque année]
```
