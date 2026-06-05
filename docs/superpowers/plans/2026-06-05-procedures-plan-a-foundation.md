# Procédures MASE — Plan A : Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser les fondations de l'outil Procédures : types TypeScript, table Supabase, hook CRUD, Edge Function IA, routes stub.

**Architecture:** Même pattern que la cartographie — types purs → migration Supabase → hook useXxx → Edge Function Deno/Mistral → pages stub. Le wizard (Plan B) et le PDF (Plan C) s'appuient sur cette fondation.

**Tech Stack:** TypeScript, Supabase (SQL + RLS + Edge Functions), Deno, @mistralai/mistralai, React Router v7, Vitest

---

## Fichiers créés / modifiés

| Fichier | Action | Rôle |
|---------|--------|------|
| `src/types/procedures.ts` | Créer | Types TypeScript pour StepDefinition, ProcedureDoc, etc. |
| `src/types/procedures.test.ts` | Créer | Tests de validation des types |
| `supabase/migrations/20260605_procedure_docs.sql` | Créer | Migration SQL table procedure_docs + RLS |
| `src/hooks/useProcedure.ts` | Créer | Hook CRUD Supabase + appels Edge Functions |
| `src/hooks/useProcedure.test.ts` | Créer | Tests hook (Supabase mocké) |
| `supabase/functions/generate-procedure-steps/index.ts` | Créer | Edge Function Mistral → steps JSON |
| `src/pages/ProceduresLandingPage.tsx` | Créer | Page /procedures (stub — sera étoffée Plan C) |
| `src/pages/ProceduresWizardPage.tsx` | Créer | Page /procedures/wizard (stub — sera étoffée Plan B) |
| `src/main.tsx` | Modifier | Ajouter routes /procedures et /procedures/wizard |

---

## Task 1 : Types TypeScript

**Fichiers :**
- Créer : `src/types/procedures.ts`
- Créer : `src/types/procedures.test.ts`

- [ ] **Écrire le test qui vérifie les types de base**

```typescript
// src/types/procedures.test.ts
import { describe, it, expect } from 'vitest';
import type {
  StepDefinition, ProcedureDoc, RiskItem, Approver, Revision,
  ProcedureStatus, StepType, RouteType,
} from './procedures';

describe('procedures types', () => {
  it('StepDefinition activité a les champs requis', () => {
    const step: StepDefinition = {
      id: 'step-1',
      type: 'activite',
      num: 1,
      activite: 'Identifier le besoin',
      acteur: 'Responsable QHSE',
      routeTypeAct: 'next',
      routeSideAct: 'auto',
    };
    expect(step.type).toBe('activite');
    expect(step.num).toBe(1);
  });

  it('StepDefinition décision a les champs OUI/NON', () => {
    const step: StepDefinition = {
      id: 'step-2',
      type: 'decision',
      num: 2,
      activite: 'Le seuil est-il dépassé ?',
      acteur: 'Responsable QHSE',
      ouiLabel: 'OUI',
      routeTypeOui: 'next',
      routeSideOui: 'auto',
      nonLabel: 'NON',
      nonAction: 'Classer le dossier',
      nonActor: 'Assistant',
      routeTypeNon: 'end',
      routeSideNon: 'right',
    };
    expect(step.type).toBe('decision');
    expect(step.ouiLabel).toBe('OUI');
    expect(step.nonAction).toBe('Classer le dossier');
  });

  it('ProcedureDoc a toutes les propriétés requises', () => {
    const doc: ProcedureDoc = {
      title: 'Plan de Prévention',
      reference: 'PR-QHSE-001',
      version: 'V1.0',
      documentDate: '2026-06-05',
      direction: 'QHSE',
      responsible: 'Marion HUBERT',
      status: 'brouillon',
      processParent: 'QHSE & Études',
      objective: 'Définir la procédure...',
      domain: 'Toutes interventions EE',
      docsIn: 'Contrat, DUER',
      docsOut: 'PP signé',
      kpi: '100% interventions couvertes',
      steps: [],
      risks: [],
      approvers: [],
      revisions: [],
      phaseCompleted: false,
    };
    expect(doc.status).toBe('brouillon');
    expect(doc.steps).toHaveLength(0);
  });

  it('RiskItem a niveau parmi low/med/high', () => {
    const risk: RiskItem = {
      id: 'r1',
      risque: 'Intervention sans PP',
      niveau: 'high',
      controle: 'Suspension immédiate',
    };
    expect(['low', 'med', 'high']).toContain(risk.niveau);
  });

  it('PROCEDURE_TEMPLATES contient au moins 5 modèles', () => {
    const { PROCEDURE_TEMPLATES } = require('./procedures');
    expect(PROCEDURE_TEMPLATES.length).toBeGreaterThanOrEqual(5);
    expect(PROCEDURE_TEMPLATES[0]).toHaveProperty('label');
    expect(PROCEDURE_TEMPLATES[0]).toHaveProperty('steps');
  });
});
```

- [ ] **Lancer le test pour vérifier qu'il échoue**

```bash
npx vitest run src/types/procedures.test.ts
```
Attendu : FAIL — `Cannot find module './procedures'`

- [ ] **Créer `src/types/procedures.ts`**

```typescript
// src/types/procedures.ts

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
  // Activité
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
  role: string;
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

export interface GenerateProcedureStepsPayload {
  description: string;
  sector: string;
  processType?: string;
  companyName?: string;
}

export interface GenerateProcedureStepsResult {
  steps: StepDefinition[];
}

export interface AiSuggestProcedurePayload {
  questionType: 'objective' | 'kpi' | 'risks';
  title: string;
  sector: string;
  processParent?: string;
}

export interface AiSuggestProcedureResult {
  suggestion: string;
}

// ─── Préfixes de référence par processus ──────────────────────────────────────

export const PROC_PREFIXES: Record<string, string> = {
  'QHSE & Études': 'PR-QHSE',
  'Maintenance': 'PR-MAINT',
  'Travaux & Réalisation': 'PR-TRAV',
  'Intégration': 'PR-INT',
  'Gestion de Contrats': 'PR-CTR',
  'Administration & Gestion': 'PR-ADM',
  'Direction': 'PR-DG',
};

// ─── 10 modèles prédéfinis MASE ───────────────────────────────────────────────

export interface ProcedureTemplate {
  icon: string;
  label: string;
  doc: Omit<ProcedureDoc, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
}

export const PROCEDURE_TEMPLATES: ProcedureTemplate[] = [
  {
    icon: '🦺',
    label: 'Plan de Prévention',
    doc: {
      title: 'Élaboration et suivi du Plan de Prévention',
      reference: 'PR-QHSE-001', version: 'V1.0',
      documentDate: new Date().toISOString().split('T')[0],
      direction: 'QHSE', responsible: 'Responsable QHSE',
      status: 'brouillon', processParent: 'QHSE & Études',
      objective: "Définir la procédure d'élaboration du plan de prévention pour toute intervention d'une entreprise extérieure, conformément au décret 92-158.",
      domain: "Toutes interventions d'entreprises extérieures sur sites clients.",
      docsIn: 'Contrat/commande, fiche de poste, DUER client',
      docsOut: 'Plan de Prévention signé, PV d\'inspection commune',
      kpi: '100% des interventions EE couvertes par un PP, 0 intervention sans PP validé',
      steps: [
        { id: crypto.randomUUID(), type: 'activite', num: 1, activite: "Identification de l'intervention et vérification du seuil (400h ou travaux dangereux)", acteur: 'Responsable QHSE', outil: 'Registre des EE', routeTypeAct: 'next', routeSideAct: 'auto' },
        { id: crypto.randomUUID(), type: 'activite', num: 2, activite: 'Inspection commune préalable avec l\'EE sur site', acteur: 'Responsable QHSE', outil: "Grille d'inspection commune", routeTypeAct: 'next', routeSideAct: 'auto' },
        { id: crypto.randomUUID(), type: 'decision', num: 3, activite: 'Chantier > 400h ou travaux dangereux ?', acteur: 'Responsable QHSE', ouiLabel: 'OUI — PP complet', routeTypeOui: 'next', routeSideOui: 'auto', nonLabel: 'NON', nonAction: 'Analyse simplifiée', nonActor: 'Chargé de réalisation', routeTypeNon: 'goto', routeNumNon: '5', routeSideNon: 'right' },
        { id: crypto.randomUUID(), type: 'activite', num: 4, activite: 'Rédaction du Plan de Prévention (risques croisés, consignes)', acteur: 'Responsable QHSE', outil: 'Formulaire PP', routeTypeAct: 'next', routeSideAct: 'auto' },
        { id: crypto.randomUUID(), type: 'activite', num: 5, activite: 'Validation et signature PP (entreprise + EE + client si requis)', acteur: 'Directeur', outil: 'Plan de Prévention', routeTypeAct: 'next', routeSideAct: 'auto' },
        { id: crypto.randomUUID(), type: 'activite', num: 6, activite: 'Accueil sécurité spécifique chantier (EPI, consignes, évacuation)', acteur: 'Responsable QHSE', outil: 'Support accueil sécurité', routeTypeAct: 'end', routeSideAct: 'auto' },
      ],
      risks: [
        { id: crypto.randomUUID(), risque: 'Intervention sans PP validé', niveau: 'high', controle: 'Suspension immédiate de l\'intervention' },
        { id: crypto.randomUUID(), risque: 'PP incomplet ou mal évalué', niveau: 'med', controle: 'Double contrôle QHSE avant signature' },
      ],
      approvers: [
        { id: crypto.randomUUID(), role: 'Rédigé par', nom: '', date: '' },
        { id: crypto.randomUUID(), role: 'Vérifié par', nom: '', date: '' },
        { id: crypto.randomUUID(), role: 'Approuvé par', nom: '', date: '' },
      ],
      revisions: [{ id: crypto.randomUUID(), version: 'V1.0', date: new Date().toISOString().split('T')[0], auteur: '', nature: 'Création initiale' }],
      revisionFrequency: 'Annuelle',
      phaseCompleted: false,
    },
  },
  {
    icon: '👷',
    label: 'Accueil Sécurité',
    doc: {
      title: 'Accueil sécurité nouveau arrivant / intérimaire',
      reference: 'PR-QHSE-002', version: 'V1.0',
      documentDate: new Date().toISOString().split('T')[0],
      direction: 'QHSE', responsible: 'Responsable QHSE',
      status: 'brouillon', processParent: 'QHSE & Études',
      objective: "S'assurer que tout nouveau salarié ou intérimaire reçoit les informations sécurité essentielles avant toute prise de poste.",
      domain: 'Tous nouveaux entrants (CDI, CDD, intérimaires, apprentis, stagiaires).',
      docsIn: 'Contrat de travail, fiche de poste, DUER',
      docsOut: 'Fiche d\'accueil sécurité signée, fiche remise EPI',
      kpi: "100% des entrants avec accueil sécurité avant J+1, 0 accident dans les 30 premiers jours",
      steps: [
        { id: crypto.randomUUID(), type: 'activite', num: 1, activite: "Notification de l'arrivée à QHSE (J-2 minimum)", acteur: 'RH', outil: 'Mail / SIRH', routeTypeAct: 'next', routeSideAct: 'auto' },
        { id: crypto.randomUUID(), type: 'activite', num: 2, activite: 'Préparation du dossier accueil : EPI, badges, règlement intérieur', acteur: 'Responsable QHSE', outil: 'Kit accueil', routeTypeAct: 'next', routeSideAct: 'auto' },
        { id: crypto.randomUUID(), type: 'activite', num: 3, activite: "Présentation des risques du poste, consignes d'urgence et évacuation", acteur: 'Responsable QHSE', outil: 'Support accueil sécurité', routeTypeAct: 'next', routeSideAct: 'auto' },
        { id: crypto.randomUUID(), type: 'activite', num: 4, activite: 'Remise des EPI adaptés au poste et vérification conformité', acteur: 'Magasinier', outil: 'Fiche remise EPI', routeTypeAct: 'next', routeSideAct: 'auto' },
        { id: crypto.randomUUID(), type: 'activite', num: 5, activite: "Signature de la fiche d'accueil sécurité et archivage", acteur: 'Responsable QHSE', outil: "Fiche d'accueil sécurité", routeTypeAct: 'end', routeSideAct: 'auto' },
      ],
      risks: [
        { id: crypto.randomUUID(), risque: 'Prise de poste sans accueil sécurité', niveau: 'high', controle: 'Blocage de la prise de poste sans fiche signée' },
      ],
      approvers: [
        { id: crypto.randomUUID(), role: 'Rédigé par', nom: '', date: '' },
        { id: crypto.randomUUID(), role: 'Approuvé par', nom: '', date: '' },
      ],
      revisions: [{ id: crypto.randomUUID(), version: 'V1.0', date: new Date().toISOString().split('T')[0], auteur: '', nature: 'Création initiale' }],
      revisionFrequency: 'Annuelle',
      phaseCompleted: false,
    },
  },
  {
    icon: '🔧',
    label: 'Maintenance Corrective',
    doc: {
      title: 'Intervention de maintenance corrective',
      reference: 'PR-MAINT-001', version: 'V1.0',
      documentDate: new Date().toISOString().split('T')[0],
      direction: 'Maintenance', responsible: 'Responsable Maintenance',
      status: 'brouillon', processParent: 'Maintenance',
      objective: "Définir le processus d'intervention en maintenance corrective, depuis la réception de l'appel jusqu'à la clôture du bon d'intervention.",
      domain: 'Toutes interventions de maintenance corrective sur site client.',
      docsIn: "Bon d'intervention client, contrat de maintenance, historique machine",
      docsOut: "Rapport d'intervention signé, bon de commande pièces",
      kpi: 'MTTR ≤ 4h, taux de satisfaction client ≥ 90%',
      steps: [
        { id: crypto.randomUUID(), type: 'activite', num: 1, activite: "Réception de l'appel client et enregistrement de l'intervention", acteur: 'Responsable Maintenance', outil: 'Planning / GMAO', routeTypeAct: 'next', routeSideAct: 'auto' },
        { id: crypto.randomUUID(), type: 'activite', num: 2, activite: 'Analyse de la panne et désignation du technicien disponible', acteur: 'Responsable Maintenance', outil: 'Planning équipe', routeTypeAct: 'next', routeSideAct: 'auto' },
        { id: crypto.randomUUID(), type: 'activite', num: 3, activite: "Préparation de l'intervention : outillage, pièces, EPI", acteur: 'Technicien', outil: 'Stock pièces, véhicule', routeTypeAct: 'next', routeSideAct: 'auto' },
        { id: crypto.randomUUID(), type: 'activite', num: 4, activite: 'Diagnostic et réalisation de la réparation', acteur: 'Technicien', outil: 'Outillage, pièces détachées', routeTypeAct: 'next', routeSideAct: 'auto' },
        { id: crypto.randomUUID(), type: 'decision', num: 5, activite: "La réparation est-elle complète et l'équipement fonctionnel ?", acteur: 'Technicien', outil: 'Tests de remise en service', ouiLabel: 'OUI', routeTypeOui: 'next', routeSideOui: 'auto', nonLabel: 'NON', nonAction: 'Commander pièces manquantes, informer client du délai', nonActor: 'Responsable Maintenance', routeTypeNon: 'goto', routeNumNon: '4', routeSideNon: 'left' },
        { id: crypto.randomUUID(), type: 'activite', num: 6, activite: "Rédaction du rapport d'intervention et signature contradictoire client", acteur: 'Technicien', outil: 'Rapport BI, GMAO', routeTypeAct: 'end', routeSideAct: 'auto' },
      ],
      risks: [
        { id: crypto.randomUUID(), risque: 'Intervention sans permis de travail', niveau: 'high', controle: 'Vérification systématique avant démarrage' },
        { id: crypto.randomUUID(), risque: 'Sous-estimation de la complexité de la panne', niveau: 'med', controle: 'Diagnostic approfondi avant commande de pièces' },
      ],
      approvers: [
        { id: crypto.randomUUID(), role: 'Rédigé par', nom: '', date: '' },
        { id: crypto.randomUUID(), role: 'Approuvé par', nom: '', date: '' },
      ],
      revisions: [{ id: crypto.randomUUID(), version: 'V1.0', date: new Date().toISOString().split('T')[0], auteur: '', nature: 'Création initiale' }],
      revisionFrequency: 'Annuelle',
      phaseCompleted: false,
    },
  },
  {
    icon: '🏗️',
    label: 'Travaux & Réalisation',
    doc: {
      title: "Réalisation d'un chantier travaux",
      reference: 'PR-TRAV-001', version: 'V1.0',
      documentDate: new Date().toISOString().split('T')[0],
      direction: 'Technique', responsible: 'Responsable Travaux',
      status: 'brouillon', processParent: 'Travaux & Réalisation',
      objective: "Décrire les étapes de préparation, réalisation et réception d'un chantier, dans le respect des normes et règles de sécurité.",
      domain: 'Tous chantiers travaux réalisés par l\'entreprise (tertiaire, industriel, habitat).',
      docsIn: 'Devis signé, DICT, plans d\'installation, PPSPS',
      docsOut: 'DOE, PV de réception, rapport de contrôle',
      kpi: 'Taux de réserves à la réception ≤ 5%, délai de livraison respecté',
      steps: [
        { id: crypto.randomUUID(), type: 'activite', num: 1, activite: 'Réception de la commande et analyse du dossier technique', acteur: 'Chargé d\'affaires', outil: 'Devis / Contrat / CCTP', routeTypeAct: 'next', routeSideAct: 'auto' },
        { id: crypto.randomUUID(), type: 'activite', num: 2, activite: 'Planification des ressources et désignation du chargé de réalisation', acteur: 'Responsable Travaux', outil: 'Planning chantier', routeTypeAct: 'next', routeSideAct: 'auto' },
        { id: crypto.randomUUID(), type: 'decision', num: 3, activite: 'Les habilitations et certifications sont-elles valides ?', acteur: 'Responsable QHSE', outil: 'Registre habilitations', ouiLabel: 'OUI', routeTypeOui: 'next', routeSideOui: 'auto', nonLabel: 'NON', nonAction: "Suspendre l'intervention et contacter QHSE", nonActor: 'Responsable QHSE', routeTypeNon: 'end', routeSideNon: 'right' },
        { id: crypto.randomUUID(), type: 'activite', num: 4, activite: "Réalisation des travaux selon le plan d'exécution", acteur: 'Technicien', outil: 'Plans, outillage agréé', routeTypeAct: 'next', routeSideAct: 'auto' },
        { id: crypto.randomUUID(), type: 'activite', num: 5, activite: 'Contrôle interne (tests, mesures, vérifications)', acteur: 'Chargé de réalisation', outil: 'Fiche de contrôle qualité', routeTypeAct: 'next', routeSideAct: 'auto' },
        { id: crypto.randomUUID(), type: 'activite', num: 6, activite: 'Réception contradictoire avec le client et remise du DOE', acteur: 'Responsable Travaux', outil: 'PV de réception, DOE', routeTypeAct: 'end', routeSideAct: 'auto' },
      ],
      risks: [
        { id: crypto.randomUUID(), risque: 'Travail sans habilitation valide', niveau: 'high', controle: 'Vérification registre avant toute intervention' },
        { id: crypto.randomUUID(), risque: 'Non-conformité à la réception', niveau: 'med', controle: 'Contrôle interne systématique avant réception client' },
      ],
      approvers: [
        { id: crypto.randomUUID(), role: 'Rédigé par', nom: '', date: '' },
        { id: crypto.randomUUID(), role: 'Approuvé par', nom: '', date: '' },
      ],
      revisions: [{ id: crypto.randomUUID(), version: 'V1.0', date: new Date().toISOString().split('T')[0], auteur: '', nature: 'Création initiale' }],
      revisionFrequency: 'Annuelle',
      phaseCompleted: false,
    },
  },
  {
    icon: '📋',
    label: 'Revue de Direction',
    doc: {
      title: 'Revue de Direction MASE',
      reference: 'PR-DG-001', version: 'V1.0',
      documentDate: new Date().toISOString().split('T')[0],
      direction: 'Direction Générale', responsible: 'Directeur Général',
      status: 'brouillon', processParent: 'Direction',
      objective: "Organiser et animer la revue annuelle du Système de Management SSE, conformément à l'axe 1 MASE V2024.",
      domain: "Revue annuelle obligatoire du SME — Direction générale et responsables de service.",
      docsIn: 'Indicateurs SSE, résultats audits, accidents/presqu\'accidents, plan d\'actions N-1',
      docsOut: "Compte-rendu de revue de direction signé, plan d'actions N+1",
      kpi: '1 revue de direction par an minimum, taux de réalisation plan d\'actions ≥ 80%',
      steps: [
        { id: crypto.randomUUID(), type: 'activite', num: 1, activite: "Préparation de l'ordre du jour et collecte des données SSE (J-15)", acteur: 'Responsable QHSE', outil: 'Tableau de bord SSE', routeTypeAct: 'next', routeSideAct: 'auto' },
        { id: crypto.randomUUID(), type: 'activite', num: 2, activite: 'Analyse des indicateurs : accidents, presqu\'accidents, audits, conformité', acteur: 'Responsable QHSE', outil: 'Rapport annuel SSE', routeTypeAct: 'next', routeSideAct: 'auto' },
        { id: crypto.randomUUID(), type: 'activite', num: 3, activite: "Revue du plan d'actions N-1 : avancement et clôture des actions", acteur: 'Directeur Général', outil: "Plan d'actions", routeTypeAct: 'next', routeSideAct: 'auto' },
        { id: crypto.randomUUID(), type: 'activite', num: 4, activite: "Définition des objectifs SSE et plan d'actions N+1", acteur: 'Directeur Général', outil: 'Objectifs SSE', routeTypeAct: 'next', routeSideAct: 'auto' },
        { id: crypto.randomUUID(), type: 'activite', num: 5, activite: 'Rédaction et signature du compte-rendu de revue de direction', acteur: 'Responsable QHSE', outil: 'CR revue de direction', routeTypeAct: 'end', routeSideAct: 'auto' },
      ],
      risks: [
        { id: crypto.randomUUID(), risque: 'Revue de direction non réalisée dans l\'année', niveau: 'high', controle: 'Planification en début d\'année, rappel J-30' },
      ],
      approvers: [
        { id: crypto.randomUUID(), role: 'Rédigé par', nom: '', date: '' },
        { id: crypto.randomUUID(), role: 'Approuvé par', nom: '', date: '' },
      ],
      revisions: [{ id: crypto.randomUUID(), version: 'V1.0', date: new Date().toISOString().split('T')[0], auteur: '', nature: 'Création initiale' }],
      revisionFrequency: 'Annuelle',
      phaseCompleted: false,
    },
  },
];
```

- [ ] **Lancer le test pour vérifier qu'il passe**

```bash
npx vitest run src/types/procedures.test.ts
```
Attendu : PASS — 5 tests passent

- [ ] **Committer**

```bash
git add src/types/procedures.ts src/types/procedures.test.ts
git commit -m "feat(procedures): types TypeScript + 5 modèles MASE prédéfinis"
```

---

## Task 2 : Migration Supabase

**Fichiers :**
- Créer : `supabase/migrations/20260605_procedure_docs.sql`

- [ ] **Créer le fichier SQL de migration**

```sql
-- supabase/migrations/20260605_procedure_docs.sql

create table if not exists procedure_docs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  reference text not null default '',
  version text not null default 'V1.0',
  document_date date,
  direction text not null default '',
  responsible text not null default '',
  status text not null default 'brouillon',
  process_parent text not null default '',
  map_id uuid references process_maps(id),
  objective text not null default '',
  domain text not null default '',
  docs_in text not null default '',
  docs_out text not null default '',
  kpi text not null default '',
  steps jsonb not null default '[]',
  risks jsonb not null default '[]',
  approvers jsonb not null default '[]',
  revisions jsonb not null default '[]',
  revision_frequency text,
  phase_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table procedure_docs enable row level security;

create policy "Users manage own procedure_docs"
  on procedure_docs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

- [ ] **Exécuter la migration dans Supabase Dashboard**

Aller dans Supabase Dashboard → SQL Editor → New query → coller le SQL → Run.

Attendu : `Success. No rows returned`

- [ ] **Vérifier que la table existe**

Dans Supabase Dashboard → Table Editor → vérifier que `procedure_docs` apparaît avec les bonnes colonnes.

- [ ] **Committer**

```bash
git add supabase/migrations/20260605_procedure_docs.sql
git commit -m "feat(procedures): migration Supabase table procedure_docs + RLS"
```

---

## Task 3 : Hook `useProcedure`

**Fichiers :**
- Créer : `src/hooks/useProcedure.ts`
- Créer : `src/hooks/useProcedure.test.ts`

- [ ] **Écrire les tests du hook**

```typescript
// src/hooks/useProcedure.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import { useProcedure } from './useProcedure';
import type { ProcedureDoc } from '../types/procedures';

const mockDoc: ProcedureDoc = {
  id: 'doc-1',
  userId: 'user-1',
  title: 'Plan de Prévention',
  reference: 'PR-QHSE-001',
  version: 'V1.0',
  documentDate: '2026-06-05',
  direction: 'QHSE',
  responsible: 'Marion HUBERT',
  status: 'brouillon',
  processParent: 'QHSE & Études',
  objective: 'Définir la procédure PP',
  domain: 'Toutes interventions EE',
  docsIn: 'Contrat',
  docsOut: 'PP signé',
  kpi: '100%',
  steps: [],
  risks: [],
  approvers: [],
  revisions: [],
  phaseCompleted: false,
  createdAt: '2026-06-05T00:00:00Z',
  updatedAt: '2026-06-05T00:00:00Z',
};

const mockSession = {
  user: { id: 'user-1', email: 'test@test.com' },
} as Session;

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      match: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockDoc, error: null }),
      then: vi.fn().mockResolvedValue({ data: [mockDoc], error: null }),
    })),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { steps: [] }, error: null }),
    },
  },
}));

describe('useProcedure', () => {
  it('expose les méthodes CRUD attendues', () => {
    const { result } = renderHook(() => useProcedure(null));
    expect(typeof result.current.saveProcedure).toBe('function');
    expect(typeof result.current.deleteProcedure).toBe('function');
    expect(typeof result.current.callGenerateSteps).toBe('function');
    expect(typeof result.current.callAiSuggest).toBe('function');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('docs est un tableau vide quand session est null', () => {
    const { result } = renderHook(() => useProcedure(null));
    expect(result.current.docs).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('callGenerateSteps appelle la bonne edge function', async () => {
    const { supabase } = await import('../lib/supabase');
    const { result } = renderHook(() => useProcedure(mockSession));
    await act(async () => {
      await result.current.callGenerateSteps({
        description: 'Vérifier les EPI avant chantier',
        sector: 'BTP',
      });
    });
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'generate-procedure-steps',
      expect.objectContaining({ body: expect.objectContaining({ description: 'Vérifier les EPI avant chantier' }) }),
    );
  });
});
```

- [ ] **Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run src/hooks/useProcedure.test.ts
```
Attendu : FAIL — `Cannot find module './useProcedure'`

- [ ] **Créer `src/hooks/useProcedure.ts`**

```typescript
// src/hooks/useProcedure.ts
import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type {
  ProcedureDoc,
  GenerateProcedureStepsPayload, GenerateProcedureStepsResult,
  AiSuggestProcedurePayload, AiSuggestProcedureResult,
} from '../types/procedures';

export interface UseProcedureReturn {
  docs: ProcedureDoc[];
  isLoading: boolean;
  error: string | null;
  saveProcedure: (doc: Partial<ProcedureDoc>) => Promise<ProcedureDoc>;
  deleteProcedure: (id: string) => Promise<void>;
  callGenerateSteps: (p: GenerateProcedureStepsPayload) => Promise<GenerateProcedureStepsResult>;
  callAiSuggest: (p: AiSuggestProcedurePayload) => Promise<AiSuggestProcedureResult>;
  refetch: () => void;
}

function rowToDoc(row: Record<string, unknown>): ProcedureDoc {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    reference: (row.reference as string) ?? '',
    version: (row.version as string) ?? 'V1.0',
    documentDate: (row.document_date as string) ?? '',
    direction: (row.direction as string) ?? '',
    responsible: (row.responsible as string) ?? '',
    status: (row.status as ProcedureDoc['status']) ?? 'brouillon',
    processParent: (row.process_parent as string) ?? '',
    mapId: row.map_id as string | undefined,
    objective: (row.objective as string) ?? '',
    domain: (row.domain as string) ?? '',
    docsIn: (row.docs_in as string) ?? '',
    docsOut: (row.docs_out as string) ?? '',
    kpi: (row.kpi as string) ?? '',
    steps: (row.steps as ProcedureDoc['steps']) ?? [],
    risks: (row.risks as ProcedureDoc['risks']) ?? [],
    approvers: (row.approvers as ProcedureDoc['approvers']) ?? [],
    revisions: (row.revisions as ProcedureDoc['revisions']) ?? [],
    revisionFrequency: row.revision_frequency as string | undefined,
    phaseCompleted: (row.phase_completed as boolean) ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function docToRow(doc: Partial<ProcedureDoc>, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  if (doc.id) row.id = doc.id;
  if (doc.title !== undefined) row.title = doc.title;
  if (doc.reference !== undefined) row.reference = doc.reference;
  if (doc.version !== undefined) row.version = doc.version;
  if (doc.documentDate !== undefined) row.document_date = doc.documentDate || null;
  if (doc.direction !== undefined) row.direction = doc.direction;
  if (doc.responsible !== undefined) row.responsible = doc.responsible;
  if (doc.status !== undefined) row.status = doc.status;
  if (doc.processParent !== undefined) row.process_parent = doc.processParent;
  if (doc.mapId !== undefined) row.map_id = doc.mapId || null;
  if (doc.objective !== undefined) row.objective = doc.objective;
  if (doc.domain !== undefined) row.domain = doc.domain;
  if (doc.docsIn !== undefined) row.docs_in = doc.docsIn;
  if (doc.docsOut !== undefined) row.docs_out = doc.docsOut;
  if (doc.kpi !== undefined) row.kpi = doc.kpi;
  if (doc.steps !== undefined) row.steps = doc.steps;
  if (doc.risks !== undefined) row.risks = doc.risks;
  if (doc.approvers !== undefined) row.approvers = doc.approvers;
  if (doc.revisions !== undefined) row.revisions = doc.revisions;
  if (doc.revisionFrequency !== undefined) row.revision_frequency = doc.revisionFrequency;
  if (doc.phaseCompleted !== undefined) row.phase_completed = doc.phaseCompleted;
  return row;
}

export function useProcedure(session: Session | null): UseProcedureReturn {
  const [docs, setDocs] = useState<ProcedureDoc[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    if (!session) { setDocs([]); return; }
    setIsLoading(true);
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('procedure_docs')
        .select('*')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false });
      if (err) throw err;
      setDocs((data ?? []).map((r) => rowToDoc(r as Record<string, unknown>)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const saveProcedure = useCallback(async (doc: Partial<ProcedureDoc>): Promise<ProcedureDoc> => {
    if (!session) throw new Error('Non connecté');
    const row = docToRow(doc, session.user.id);
    const { data, error: err } = await supabase
      .from('procedure_docs')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (err) throw err;
    const saved = rowToDoc(data as Record<string, unknown>);
    setDocs((prev) => {
      const idx = prev.findIndex((d) => d.id === saved.id);
      return idx >= 0 ? prev.map((d) => d.id === saved.id ? saved : d) : [saved, ...prev];
    });
    return saved;
  }, [session]);

  const deleteProcedure = useCallback(async (id: string): Promise<void> => {
    if (!session) throw new Error('Non connecté');
    const { error: err } = await supabase
      .from('procedure_docs')
      .delete()
      .match({ id, user_id: session.user.id });
    if (err) throw err;
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }, [session]);

  const callEdge = useCallback(async <T>(name: string, payload: unknown): Promise<T> => {
    const { data, error: err } = await supabase.functions.invoke(name, { body: payload });
    if (err) throw err;
    if (data?.error) throw new Error(data.error);
    return data as T;
  }, []);

  const callGenerateSteps = useCallback(
    (p: GenerateProcedureStepsPayload) => callEdge<GenerateProcedureStepsResult>('generate-procedure-steps', p),
    [callEdge],
  );

  const callAiSuggest = useCallback(
    (p: AiSuggestProcedurePayload) => callEdge<AiSuggestProcedureResult>('ai-suggest-procedure', p),
    [callEdge],
  );

  return { docs, isLoading, error, saveProcedure, deleteProcedure, callGenerateSteps, callAiSuggest, refetch: fetchDocs };
}
```

- [ ] **Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run src/hooks/useProcedure.test.ts
```
Attendu : PASS — 3 tests passent

- [ ] **Committer**

```bash
git add src/hooks/useProcedure.ts src/hooks/useProcedure.test.ts
git commit -m "feat(procedures): hook useProcedure (CRUD Supabase + Edge Functions)"
```

---

## Task 4 : Edge Function `generate-procedure-steps`

**Fichiers :**
- Créer : `supabase/functions/generate-procedure-steps/index.ts`

- [ ] **Créer l'Edge Function**

```typescript
// supabase/functions/generate-procedure-steps/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Mistral from 'npm:@mistralai/mistralai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { description, sector, processType, companyName } = await req.json();
    if (!description || !sector) {
      return new Response(JSON.stringify({ error: 'description et sector requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const client = new Mistral({ apiKey: Deno.env.get('MISTRAL_API_KEY') ?? '' });

    const prompt = `Tu es un expert QHSE et qualité spécialisé dans le référentiel MASE V2024.
Génère les étapes d'une procédure opérationnelle pour le processus suivant :
- Description : "${description}"
- Secteur d'activité : ${sector}
${processType ? `- Type de processus : ${processType}` : ''}
${companyName ? `- Entreprise : ${companyName}` : ''}

Retourne UNIQUEMENT un JSON valide avec ce format :
{
  "steps": [
    {
      "id": "step-1",
      "type": "activite",
      "num": 1,
      "activite": "Description de l'activité",
      "acteur": "Rôle responsable",
      "outil": "Outil ou document utilisé",
      "routeTypeAct": "next",
      "routeSideAct": "auto"
    },
    {
      "id": "step-2",
      "type": "decision",
      "num": 2,
      "activite": "Question de décision ?",
      "acteur": "Rôle",
      "ouiLabel": "OUI",
      "routeTypeOui": "next",
      "routeSideOui": "auto",
      "nonLabel": "NON",
      "nonAction": "Action si NON",
      "nonActor": "Rôle action NON",
      "routeTypeNon": "goto",
      "routeNumNon": "1",
      "routeSideNon": "right"
    }
  ]
}

Règles :
- 5 à 8 étapes maximum
- Minimum 1 décision (losange OUI/NON) si pertinente
- Les activités ont routeTypeAct = "next" sauf la dernière = "end"
- Les ids sont "step-1", "step-2", etc.
- Les acteurs sont des rôles génériques (ex: "Responsable QHSE", "Technicien", "Direction")
- La dernière étape a routeTypeAct = "end"
- Réponds UNIQUEMENT avec le JSON, sans texte ni markdown`;

    const response = await client.chat.complete({
      model: 'mistral-large-latest',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const content = response.choices?.[0]?.message?.content ?? '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Réponse IA invalide');

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.steps)) throw new Error('Format steps invalide');

    // Assigner des IDs crypto si l'IA a retourné des IDs séquentiels
    const steps = parsed.steps.map((s: Record<string, unknown>, i: number) => ({
      ...s,
      id: `step-${Date.now()}-${i}`,
      num: i + 1,
    }));

    return new Response(JSON.stringify({ steps }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('generate-procedure-steps error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Créer l'Edge Function `ai-suggest-procedure`**

```typescript
// supabase/functions/ai-suggest-procedure/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Mistral from 'npm:@mistralai/mistralai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { questionType, title, sector, processParent } = await req.json();

    const client = new Mistral({ apiKey: Deno.env.get('MISTRAL_API_KEY') ?? '' });

    const prompts: Record<string, string> = {
      objective: `En tant qu'expert MASE V2024, rédige l'objectif de la procédure suivante en 1-2 phrases professionnelles et précises.
Procédure : "${title}" | Secteur : ${sector} | Processus : ${processParent ?? 'non précisé'}
Réponds uniquement avec le texte de l'objectif, sans introduction.`,
      kpi: `En tant qu'expert MASE V2024, propose 2-3 indicateurs de performance (KPI) pour la procédure suivante.
Procédure : "${title}" | Secteur : ${sector}
Format : "KPI1 · KPI2 · KPI3" (séparés par ·, avec valeurs cibles chiffrées si possible).
Réponds uniquement avec les KPIs, sans introduction.`,
      risks: `En tant qu'expert MASE V2024, liste 2-3 risques principaux liés à la procédure suivante avec leur mesure de prévention.
Procédure : "${title}" | Secteur : ${sector}
Format JSON : [{"risque":"...","niveau":"high|med|low","controle":"..."}]
Réponds uniquement avec le JSON.`,
    };

    const response = await client.chat.complete({
      model: 'mistral-large-latest',
      messages: [{ role: 'user', content: prompts[questionType] ?? prompts.objective }],
      temperature: 0.4,
    });

    const suggestion = response.choices?.[0]?.message?.content ?? '';

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('ai-suggest-procedure error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Déployer les deux Edge Functions**

```bash
npx supabase functions deploy generate-procedure-steps --project-ref ulceeurwibmbtnqhkaao
npx supabase functions deploy ai-suggest-procedure --project-ref ulceeurwibmbtnqhkaao
```

Attendu : `Deployed generate-procedure-steps` et `Deployed ai-suggest-procedure`

- [ ] **Committer**

```bash
git add supabase/functions/generate-procedure-steps/index.ts supabase/functions/ai-suggest-procedure/index.ts
git commit -m "feat(procedures): Edge Functions Mistral generate-procedure-steps + ai-suggest-procedure"
```

---

## Task 5 : Routes + pages stub

**Fichiers :**
- Créer : `src/pages/ProceduresLandingPage.tsx`
- Créer : `src/pages/ProceduresWizardPage.tsx`
- Modifier : `src/main.tsx`

- [ ] **Créer `src/pages/ProceduresLandingPage.tsx` (stub)**

```typescript
// src/pages/ProceduresLandingPage.tsx
export default function ProceduresLandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Générateur de Procédures MASE</h1>
      <p className="text-gray-500">Landing page — à compléter en Plan C</p>
      <a
        href="/procedures/wizard"
        className="rounded-lg px-6 py-2 text-sm font-bold text-white"
        style={{ backgroundColor: 'var(--mase-primary)' }}
      >
        Accéder à l'outil →
      </a>
    </div>
  );
}
```

- [ ] **Créer `src/pages/ProceduresWizardPage.tsx` (stub)**

```typescript
// src/pages/ProceduresWizardPage.tsx
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { SessionContext } from '../contexts/SessionContext';
import { useProcedure } from '../hooks/useProcedure';

export default function ProceduresWizardPage() {
  const session = useContext(SessionContext) as Session | null;
  const navigate = useNavigate();
  const procedure = useProcedure(session);

  if (!session) {
    navigate('/procedures');
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Wizard Procédures</h1>
      <p className="text-gray-500">
        {procedure.isLoading ? 'Chargement…' : `${procedure.docs.length} procédure(s) sauvegardée(s)`}
      </p>
      <p className="text-sm text-gray-400">Wizard — à compléter en Plan B</p>
    </div>
  );
}
```

- [ ] **Modifier `src/main.tsx` : ajouter les imports et routes**

Ajouter après la ligne `import CartographieWizardPage from './pages/CartographieWizardPage';` :

```typescript
import ProceduresLandingPage from './pages/ProceduresLandingPage';
import ProceduresWizardPage from './pages/ProceduresWizardPage';
```

Ajouter après `<Route path="/cartographie/wizard" element={<CartographieWizardPage />} />` :

```typescript
<Route path="/procedures" element={<ProceduresLandingPage />} />
<Route path="/procedures/wizard" element={<ProceduresWizardPage />} />
```

- [ ] **Lancer le dev server et vérifier les routes**

```bash
npm run dev
```

Ouvrir `http://localhost:5173/procedures` → doit afficher le stub ProceduresLandingPage.
Ouvrir `http://localhost:5173/procedures/wizard` → doit afficher le stub ProceduresWizardPage.

- [ ] **Lancer tous les tests**

```bash
npx vitest run
```
Attendu : tous les tests existants + les nouveaux passent.

- [ ] **Committer**

```bash
git add src/pages/ProceduresLandingPage.tsx src/pages/ProceduresWizardPage.tsx src/main.tsx
git commit -m "feat(procedures): routes /procedures + /procedures/wizard + pages stub"
```
