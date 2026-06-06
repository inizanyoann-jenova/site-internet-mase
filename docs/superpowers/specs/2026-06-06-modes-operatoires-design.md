# Spec — Module Modes Opératoires MASE

**Date :** 2026-06-06  
**Statut :** Approuvé  
**Projet :** CertifMASE — site-internet-mase

---

## 1. Contexte & objectif

Le référentiel MASE (chapitre 3.3) exige que les entreprises rédigent des **modes opératoires** pour toutes les opérations critiques. Un mode opératoire est distinct d'une procédure : c'est une instruction de travail terrain destinée au technicien, couvrant une opération à risque spécifique (consignation, travaux en hauteur, espace confiné, etc.).

Le projet dispose déjà d'un module Procédures. Ce nouveau module **Modes Opératoires** est indépendant, avec ses propres types, wizard, templates et logigramme technicien.

---

## 2. Périmètre

### Inclus dans cette livraison
- Module indépendant avec landing page, wizard 7 étapes et liste
- 8 templates MASE pré-remplis
- Logigramme technicien SVG (mode impression A5 + mode suivi en direct)
- Boutons IA sur les étapes SSE, EPI et Urgences
- Export PDF A4 complet conforme MASE
- Table Supabase `modes_operatoires`
- Routing dédié `/modes-operatoires/*`

### Hors périmètre (V2)
- Liaison bidirectionnelle avec les procédures parentes
- Signature numérique des approbateurs
- Notifications de révision périodique

---

## 3. Architecture & structure des fichiers

```
src/
├── types/
│   └── modesOperatoires.ts
├── engine/
│   └── modesOperatoires/
│       ├── buildLogiTechnicienSVG.ts
│       ├── renderMoPdf.ts
│       └── moTemplates.ts
├── components/
│   └── modes-operatoires/
│       ├── shared/
│       │   ├── LogiTechnicienPreview.tsx
│       │   └── EpiChecklistRow.tsx
│       ├── wizard/
│       │   ├── MoWizard.tsx
│       │   ├── MoStep1General.tsx
│       │   ├── MoStep2SSE.tsx
│       │   ├── MoStep3EPI.tsx
│       │   ├── MoStep4Phases.tsx
│       │   ├── MoStep5Urgences.tsx
│       │   ├── MoStep6Approbation.tsx
│       │   └── MoStep7Export.tsx
│       └── list/
│           └── MoList.tsx
└── pages/
    ├── MoLandingPage.tsx
    └── MoWizardPage.tsx
```

---

## 4. Types de données

```typescript
export type OperationType =
  | 'consignation' | 'hauteur' | 'confine' | 'permis-feu'
  | 'electrique-ht' | 'levage' | 'chimique' | 'vrd';

export interface PhaseStep {
  id: string;
  ordre: number;
  consigne: string;
  acteur?: string;
  outil?: string;
  pointControle: boolean;   // case à cocher dans logigramme
  critique: boolean;         // encadré rouge dans impression terrain
}

export interface EpiItem {
  id: string;
  designation: string;
  norme?: string;
  obligatoire: boolean;
}

export interface ConsigneSSE {
  risques: string[];
  reglesSecurite: string[];
  consignesEnv: string[];
  permisRequis: string[];
}

export interface ContactUrgence {
  id: string;
  role: string;
  nom?: string;
  telephone: string;
}

export interface SituationUrgence {
  id: string;
  scenario: string;
  conduite: string;
  contacts: ContactUrgence[];
}

export interface ModeOperatoire {
  id?: string;
  userId?: string;
  title: string;
  reference: string;
  version: string;
  documentDate: string;
  operationType: OperationType;
  habilitations: string[];
  consignesSSE: ConsigneSSE;
  epis: EpiItem[];
  phases: {
    preparation: PhaseStep[];
    execution: PhaseStep[];
    finTache: PhaseStep[];
  };
  urgences: SituationUrgence[];
  pointRassemblement?: string;
  approvers: Approver[];         // réutilise le type de procedures.ts
  revisions: Revision[];         // réutilise le type de procedures.ts
  revisionFrequency?: string;
  status: 'brouillon' | 'valide' | 'archive';
  createdAt?: string;
  updatedAt?: string;
}
```

---

## 5. Table Supabase

```sql
CREATE TABLE modes_operatoires (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid REFERENCES auth.users NOT NULL,
  title                text NOT NULL,
  reference            text,
  version              text DEFAULT 'V1.0',
  document_date        date,
  operation_type       text NOT NULL,
  habilitations        text[] DEFAULT '{}',
  consignes_sse        jsonb DEFAULT '{}',
  epis                 jsonb DEFAULT '[]',
  phases               jsonb DEFAULT '{"preparation":[],"execution":[],"finTache":[]}',
  urgences             jsonb DEFAULT '[]',
  point_rassemblement  text,
  approvers            jsonb DEFAULT '[]',
  revisions            jsonb DEFAULT '[]',
  revision_frequency   text,
  status               text DEFAULT 'brouillon',
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE modes_operatoires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own their modes operatoires"
  ON modes_operatoires FOR ALL
  USING (auth.uid() = user_id);
```

---

## 6. Routing

| Route | Composant | Description |
|-------|-----------|-------------|
| `/modes-operatoires` | `MoLandingPage` | Accueil du module |
| `/modes-operatoires/nouveau` | `MoWizardPage` | Création |
| `/modes-operatoires/:id` | `MoWizardPage` | Édition |
| `/modes-operatoires/:id/terrain` | `LogiTechnicienPreview` | Mode suivi en direct technicien |

---

## 7. Wizard — 7 étapes détaillées

### Étape 1 — Informations générales
- Titre (requis)
- Type d'opération : 8 cartes cliquables avec icône (requis)
- Référence auto-générée selon le type (`MO-CONS-001`, `MO-HAUT-001`, etc.)
- Version, Date
- Habilitations requises : multi-valeur avec suggestions selon le type
- Direction / Responsable (requis)
- Statut : Brouillon / Validé / Archivé
- Bouton "Charger un template MASE" (8 disponibles)

### Étape 2 — Consignes SSE
4 listes éditables avec bouton IA sur chacune :
- Risques identifiés
- Règles de sécurité
- Consignes environnementales
- Permis de travail requis (cases à cocher : Permis de travail, Permis feu, Permis fouille, Permis pénétration)

### Étape 3 — EPI requis
- Tableau : Désignation / Norme / Obligatoire
- Bouton IA : génère la liste EPI standard selon `operationType`
- Icônes visuelles EPI (casque, harnais, gants, lunettes, chaussures…)

### Étape 4 — Phases de travail
3 onglets : Préparation / Exécution / Fin de tâche

Par étape dans chaque onglet :
- Ordre (drag-and-drop)
- Consigne (texte)
- Acteur (optionnel)
- Outil/EPI (optionnel)
- Toggle "Point de contrôle" → case cochable dans logigramme
- Toggle "Critique" → encadré rouge dans l'impression terrain

Panneau droit : aperçu live du logigramme technicien SVG (mis à jour en temps réel).

### Étape 5 — Situations d'urgence
- Contacts d'urgence : tableau (Rôle, Nom, Téléphone) — SAMU 15 et Pompiers 18 pré-remplis
- Point de rassemblement : champ texte
- Scénarios d'urgence : liste de fiches (Scénario + Conduite à tenir numérotée)
  - Bouton IA : génère les scénarios usuels selon `operationType`

### Étape 6 — Approbation & Révisions
- Tableau approbateurs : Rédigé par / Vérifié par / Approuvé par (+ nom, date)
- Historique révisions : version, date, auteur, nature de la modification
- Fréquence de révision recommandée

### Étape 7 — Aperçu & Export
- Onglet "Document PDF" : aperçu complet A4 (toutes sections MASE)
- Onglet "Logigramme terrain" : aperçu SVG + bouton télécharger SVG + bouton imprimer A5
- Bouton "Mode terrain" : lien vers `/modes-operatoires/:id/terrain`

---

## 8. Logigramme technicien

### Principe de rendu (`buildLogiTechnicienSVG`)
SVG vertical, 3 bandes colorées (Préparation bleu / Exécution jaune / Fin de tâche vert).

Chaque étape affiche :
- Numéro d'ordre
- Consigne
- Acteur (si renseigné) en petit gris
- Case à cocher (vide à l'impression, interactive en mode terrain)
- Encadré rouge si `critique: true`

### Mode impression (A5 paysage)
- Cases à cocher vides
- En-tête : référence, version, date, titre
- Pied de page : contacts urgence + point de rassemblement
- Bandeau EPI obligatoires en bas

### Mode suivi en direct (route `/terrain`)
- Cases interactives — le technicien coche chaque étape
- Compteur de progression : "5/12 étapes complétées"
- Les étapes critiques non cochées affichent un avertissement visuel
- Sauvegarde de l'état de progression en `localStorage` (pas en base, session terrain)
- Bouton "Réinitialiser" pour recommencer

---

## 9. Templates MASE (8 types)

| Type | Référence | Habilitations | Risques principaux |
|------|-----------|---------------|--------------------|
| Consignation/Déconsignation | MO-CONS-001 | B2, BC, BR | Électrique, mécanique |
| Travaux en hauteur | MO-HAUT-001 | Formation hauteur, harnais | Chute, chute d'objet |
| Espace confiné | MO-CONF-001 | CATEC, Surveillant | Asphyxie, atmosphère explosive |
| Permis de feu | MO-FEU-001 | Opérateur feu, SST | Incendie, explosion |
| Travaux électriques HT | MO-ELEC-001 | H1, H2, HC | Électrique HT, arc électrique |
| Levage/Manutention | MO-LEV-001 | CACES R484, Chef manœuvre | Chute de charge, écrasement |
| Produits chimiques | MO-CHIM-001 | Formation ATEX si applicable | Intoxication, explosion |
| Travaux VRD | MO-VRD-001 | AIPR, CACES R482 | Fouille, réseau enterré |

Chaque template pré-remplit : titre, référence, habilitations, consignes SSE typiques, liste EPI standard, 3 phases de travail conformes MASE, scénarios d'urgence usuels.

---

## 10. Boutons IA

Chaque bouton IA envoie une requête à une Edge Function Supabase `ai-suggest-mo` (à créer) avec :
```typescript
{
  questionType: 'sse' | 'epi' | 'urgences';
  operationType: OperationType;
  title: string;
}
```
La fonction retourne une suggestion JSON à appliquer en un clic. Même pattern que `ai-suggest-procedure` existant.

---

## 11. Intégration dans la navigation

- Carte dans `DashboardLanding.tsx` (section "Outils documentaires")
- Entrée dans `DashboardSidebar.tsx`
- Carte dans `HomePage.tsx` (section modules)

---

## 12. Décisions d'architecture

| Décision | Choix retenu | Raison |
|----------|-------------|--------|
| Module séparé vs extension Procédures | Séparé | Structure MASE différente, évite couplage |
| Logigramme technicien | SVG simplifié séquentiel | Lisibilité terrain, pas de branchements |
| Suivi de progression terrain | localStorage | Pas besoin de persistance serveur pour une session terrain |
| Templates | 8 types critiques MASE | Conformité référentiel, exhaustivité opérations à risque |
| IA | Edge Function pattern existant | Cohérence avec le reste de l'appli |
