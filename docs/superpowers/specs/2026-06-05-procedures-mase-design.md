# Design — Outil Générateur de Procédures MASE

**Date :** 2026-06-05  
**Statut :** Approuvé  
**Auteur :** Yoann Inizan  
**Plateforme :** site-internet-mase (React 19 + Vite + Tailwind v4 + Supabase + Mistral AI)

---

## 1. Objectif du produit

Ajouter un nouvel outil payant à la plateforme MASE : un **générateur guidé de Procédures** conforme au référentiel MASE V2024. L'outil guide l'utilisateur étape par étape pour créer des procédures opérationnelles documentées, chacune incluant un **logigramme SVG** (organigramme de flux avec activités et décisions Oui/Non).

**Valeur délivrée :**
- Des procédures au format ISO standard avec en-tête, objectif, risques, approbation
- Un logigramme SVG généré automatiquement (organigramme + mode couloirs/swim lanes)
- Un PDF 2 pages prêt pour l'auditeur MASE (page 1 : document ISO, page 2 : logigramme)
- Une IA qui génère les étapes du logigramme à partir d'une description en langage naturel
- Une bibliothèque de procédures sauvegardées dans Supabase, révisables chaque année

**Référence HTML :** `ProcedureV8_DEF_OI_v2.html` (racine du projet) — le moteur SVG logigramme de ce fichier est extrait et porté en React.

---

## 2. Positionnement dans la plateforme

- Nouvel outil sur la `HomePage` (grille des outils)
- Route : `/procedures`
- Modèle économique : paiement unique Stripe (prix cohérent avec les autres outils — environ 39–49 €)
- Auth Google OAuth déjà en place, réutilisée
- Données sauvegardées dans Supabase sous `user_id` (RLS)
- Lien optionnel avec la cartographie des processus (`/cartographie`) : l'utilisateur peut importer les processus déjà définis comme point de départ

---

## 3. Architecture générale — Wizard 7 étapes

```text
Landing /procedures (page marketing + Stripe)
    ↓ [Achat + Connexion Google]
Écran liste des procédures (tableau de bord)
    ↓ [Créer une procédure]
WIZARD 7 ÉTAPES
    Étape 1 : Informations générales
    Étape 2 : Contexte & Objectif
    Étape 3 : Étapes & Logigramme  ← CŒUR (builder SVG temps réel)
    Étape 4 : Risques & Prévention
    Étape 5 : Approbation & Révisions
    Étape 6 : Aperçu (document ISO + logigramme)
    Étape 7 : Export PDF ← LIVRABLE
    ↓ [Sauvegarde Supabase — révisable chaque année]
```

Chaque procédure est sauvegardée dans Supabase après chaque étape (autosave). L'utilisateur peut quitter et reprendre à tout moment.

---

## 4. Écran liste des procédures (tableau de bord)

Avant de lancer le wizard, l'utilisateur accède à un écran listant toutes ses procédures :
- Titre · Référence · Processus parent · Statut (Brouillon / Validé / Archivé)
- Filtres : par statut, par processus parent
- Actions : Créer / Modifier / Dupliquer / Supprimer / Télécharger PDF
- Import/export JSON (compatibilité avec `ProcedureV8_DEF_OI_v2.html`)
- Bouton "Importer depuis ma cartographie" si l'utilisateur a déjà une cartographie

---

## 5. Wizard — Détail des 7 étapes

### Étape 1 — Informations générales

- Titre de la procédure *
- Référence (auto-générée selon le processus parent : `PR-QHSE-001`, `PR-MAINT-001`, etc.)
- Version (`V1.0` par défaut)
- Date de création
- Direction / Service
- Responsable (nom + fonction)
- Statut (Brouillon / Validé / Archivé)

**Fonctionnalités premium :**
- Choix parmi **10 modèles MASE prédéfinis** (Plan de Prévention, Accueil sécurité, Maintenance corrective, Travaux & Réalisation, Gestion cyclone, Intégration systèmes, Gestion contrats, Approvisionnement, Recrutement, Revue de direction) — portés depuis le HTML de référence
- Option "Importer depuis la cartographie" : sélection d'un processus existant, les champs responsable et processus parent sont pré-remplis

### Étape 2 — Contexte & Objectif

- Processus parent (sélection depuis la cartographie ou saisie libre)
- Objectif de la procédure (textarea)
- Domaine d'application (textarea)
- Documents entrants
- Documents sortants
- KPI / Indicateurs de performance

**IA Niveau 2 :** bouton "✨ Suggérer objectif & KPI" — l'IA propose un objectif et des KPIs selon le titre de la procédure et le secteur.

### Étape 3 — Étapes & Logigramme *(cœur de l'outil)*

Layout **split screen** : builder d'étapes à gauche, logigramme SVG en temps réel à droite.

**Builder d'étapes (gauche) :**

Chaque étape est soit une **Activité** soit une **Décision** :

*Activité :*
- Description *
- Acteur responsable
- Outil / Document associé
- Routage : Étape suivante / Aller à l'étape N° / Fin
- Côté de sortie : Auto / Bas / Droite / Gauche

*Décision (losange Oui/Non) :*
- Question de décision *
- Acteur
- Outil / Document
- Branche OUI : libellé + routage
- Branche NON : libellé + action optionnelle + acteur de l'action + routage
- Côté de sortie par branche

**Interactions :**
- Drag-to-reorder les étapes
- Numérotation automatique
- Suppression individuelle

**Logigramme SVG (droite) :**
- Rendu temps réel à chaque modification (même moteur que `ProcedureV8_DEF_OI_v2.html`, porté en React)
- Rectangles arrondis pour les activités (couleur par acteur)
- Losanges pour les décisions (fond jaune, bordure dorée)
- Flèches grises (activité), vertes (OUI), rouges pointillées (NON)
- Ovales DÉBUT (navy) et FIN (teal)
- Mode **Organigramme** (colonne centrale) ou **Couloirs** (swim lanes par acteur)
- Contrôles de taille des formes (largeur/hauteur boîtes et losanges)
- Bouton export SVG

**IA Niveau 1 — Génération automatique des étapes :**

Bouton "✨ IA génère les étapes" en en-tête. L'utilisateur décrit le processus en 1 phrase. La Supabase Edge Function appelle Mistral pour générer les 5-8 étapes avec :
- Description de chaque activité
- Acteurs (issus du secteur / des données entreprise)
- Décisions clés avec branches Oui/Non
- Routage cohérent

L'utilisateur accepte, modifie, ou repart de zéro.

### Étape 4 — Risques & Prévention

Liste de 1 à 5 risques, chacun avec :
- Description du risque *
- Niveau : Faible / Moyen / Élevé
- Mesure de prévention / contrôle

**IA Niveau 2 :** bouton "✨ Suggérer les risques" — l'IA propose des risques typiques selon le type de procédure et le secteur.

### Étape 5 — Approbation & Révisions

**Approbateurs :**
- Rédigé par (nom + fonction + date + case signature vide pour PDF)
- Vérifié par (nom + fonction + date + case signature vide)
- Approuvé par (nom + fonction + date + case signature vide)

**Historique des révisions :**
- Tableau : Version / Date / Auteur / Nature de la modification
- Fréquence de révision (annuelle recommandée)

### Étape 6 — Aperçu

Affichage du document complet avant export :
- **Vue Document ISO** : rendu fidèle au PDF final (en-tête + toutes les sections)
- **Vue Logigramme** : logigramme SVG pleine largeur avec légende, mode couloirs disponible

L'utilisateur peut revenir à n'importe quelle étape précédente pour modifier.

### Étape 7 — Export PDF

**PDF 2 pages A4 portrait** généré avec `@react-pdf/renderer` :

*Page 1 — Document ISO :*
- En-tête ISO (tableau 3 colonnes : logo | titre + processus | référence + version + date + statut)
- Objectif
- Domaine d'application + Responsable + Documents entrants/sortants (grille 2×2)
- KPI
- Risques (avec niveaux colorés)
- Tableau d'approbation (avec cases signatures vides pour impression)
- Historique des révisions

*Page 2 — Logigramme :*
- En-tête ISO répété
- Logigramme SVG rendu via primitives SVG de `@react-pdf/renderer`
- Légende des acteurs + symboles

**Options d'export :**
- PDF complet (2 pages)
- SVG logigramme seul (téléchargement direct)

---

## 6. IA — 3 niveaux d'intégration

| Niveau | Où | Ce que fait l'IA |
|--------|-----|-----------------|
| **1 — Génération** | Étape 3 | Génère toutes les étapes du logigramme depuis une description en 1 phrase |
| **2 — Suggestion** | Étapes 2 & 4 | Propose objectif+KPI (étape 2) et risques typiques (étape 4) selon le contexte |
| **3 — Aide à la demande** | Partout | Assistant contextuel disponible en permanence (panneau latéral) |

**Implémentation :** Supabase Edge Function (Deno) appelant `mistral-large-latest`. La génération de logigramme (niveau 1) utilise un prompt structuré retournant un JSON de steps directement consommable par le composant builder.

---

## 7. Données Supabase

### Table `procedure_docs`

```sql
id uuid primary key default gen_random_uuid()
user_id uuid references auth.users not null
title text not null
reference text
version text default 'V1.0'
document_date date
direction text
responsible text
status text default 'brouillon'  -- 'brouillon' | 'valide' | 'archive'
process_parent text
map_id uuid references process_maps(id) -- lien optionnel cartographie
objective text
domain text
docs_in text
docs_out text
kpi text
steps jsonb default '[]'  -- tableau d'étapes (activités + décisions + routage)
risks jsonb default '[]'  -- [{risque, niveau, controle}]
approvers jsonb default '[]'  -- [{role, nom, date}]
revisions jsonb default '[]'  -- [{version, date, auteur, nature}]
revision_frequency text
phase_completed boolean default false
created_at timestamptz default now()
updated_at timestamptz default now()
```

**RLS :** `user_id = auth.uid()`

### Edge Function `generate-procedure-steps`

Input :
```typescript
{ description: string; sector: string; processType?: string; companyName?: string }
```

Output :
```typescript
{ steps: StepDefinition[] }
```

---

## 8. Types TypeScript

```typescript
export type StepType = 'activite' | 'decision';
export type RouteType = 'next' | 'goto' | 'end';
export type RouteSide = 'auto' | 'bottom' | 'right' | 'left';
export type RiskLevel = 'low' | 'med' | 'high';
export type ProcedureStatus = 'brouillon' | 'valide' | 'archive';

export interface StepDefinition {
  id: string;
  type: StepType;
  num: number;
  activite: string;
  acteur: string;
  outil?: string;
  // Activité routing
  routeTypeAct?: RouteType;
  routeNumAct?: string;
  routeSideAct?: RouteSide;
  // Décision OUI
  ouiLabel?: string;
  routeTypeOui?: RouteType;
  routeNumOui?: string;
  routeSideOui?: RouteSide;
  // Décision NON
  nonLabel?: string;
  nonAction?: string;
  nonActor?: string;
  routeTypeNon?: RouteType;
  routeNumNon?: string;
  routeSideNon?: RouteSide;
}

export interface RiskItem {
  id: string;
  risque: string;
  niveau: RiskLevel;
  controle: string;
}

export interface Approver {
  id: string;
  role: string;  // 'Rédigé par' | 'Vérifié par' | 'Approuvé par'
  nom: string;
  date?: string;
}

export interface Revision {
  id: string;
  version: string;
  date: string;
  auteur: string;
  nature: string;
}

export interface ProcedureDoc {
  id?: string;
  userId?: string;
  title: string;
  reference: string;
  version: string;
  documentDate: string;
  direction: string;
  responsible: string;
  status: ProcedureStatus;
  processParent: string;
  mapId?: string;
  objective: string;
  domain: string;
  docsIn: string;
  docsOut: string;
  kpi: string;
  steps: StepDefinition[];
  risks: RiskItem[];
  approvers: Approver[];
  revisions: Revision[];
  revisionFrequency?: string;
  phaseCompleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}
```

---

## 9. Moteur SVG logigramme — Architecture React

Le moteur SVG est extrait de `ProcedureV8_DEF_OI_v2.html` (fonction `buildLogiSVG`) et converti en composant React et en fonction de rendu pure :

```text
src/
  engine/
    procedures/
      buildLogiSVG.ts          — fonction pure : StepDefinition[] → SVG string
      renderProcedurePdf.tsx   — composant @react-pdf/renderer (2 pages)
  components/
    procedures/
      shared/
        LogigrammePreview.tsx  — composant React affichant le SVG live
        StepFormRow.tsx        — ligne de formulaire pour une étape
      wizard/
        ProcedureWizard.tsx    — orchestrateur wizard (7 étapes)
        Step1General.tsx
        Step2Context.tsx
        Step3Steps.tsx         — split screen builder + preview
        Step4Risks.tsx
        Step5Approval.tsx
        Step6Preview.tsx
        Step7Export.tsx
      list/
        ProcedureList.tsx      — tableau de bord / liste
  hooks/
    useProcedure.ts            — CRUD Supabase pour procedure_docs
  types/
    procedures.ts              — types TypeScript
  pages/
    ProceduresPage.tsx         — route /procedures (guard accès + routing)
  supabase/
    functions/
      generate-procedure-steps/
        index.ts               — Edge Function Mistral
```

---

## 10. Conformité MASE V2024

| Exigence MASE | Couverture par l'outil |
|--------------|----------------------|
| Documentation des processus | Chaque procédure documente un processus opérationnel |
| Identification des risques (Axe 3) | Étape 4 : risques avec niveaux + mesures de prévention |
| Responsabilités définies (Axe 2) | Acteur par étape + tableau d'approbation |
| Maîtrise documentaire (Axe 5) | Référence, version, date, statut, historique révisions |
| Amélioration continue (Axe 5) | Fréquence de révision, sauvegarde Supabase révisable |
| Engagement Direction (Axe 1) | Approbation Directeur Général formalisée |

---

## 11. Hors périmètre (V1)

- Collaboration multi-utilisateurs sur la même procédure
- Import depuis Word/Excel
- Notifications email de révision annuelle
- Comparaison entre versions
- Éditeur drag-and-drop visuel du logigramme (les étapes sont saisies en liste, pas en drag visuel)
- Export Word (.docx)
- QR code sur la procédure PDF

---

## 12. Livrables

| Livrable | Format | Quand |
|----------|--------|-------|
| Liste des procédures | Écran web | Après accès |
| Document procédure + logigramme | PDF A4 portrait 2 pages | Étape 7 |
| Logigramme seul | SVG | Étape 6 & 7 |
| Export base procédures | JSON | Depuis la liste |
