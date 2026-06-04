# Cartographie des Processus — Plan A : Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser toutes les fondations de l'outil Cartographie des Processus — types TypeScript, tables Supabase, 3 Edge Functions IA, hook CRUD, landing page avec Stripe, et routage — sans encore toucher aux composants wizard.

**Architecture:** Plan A produit un squelette complet et déployable : on peut acheter l'accès, atterrir sur la page `/cartographie`, et les 3 Edge Functions IA sont prêtes à être appelées. Les Plans B et C construiront le wizard par-dessus ces fondations.

**Tech Stack:** React 19 + TypeScript + Supabase (Edge Functions Deno) + Mistral Agents API (web_search) + Stripe (pattern existant)

**Spec:** `docs/superpowers/specs/2026-06-04-cartographie-processus-design.md`

---

## File Structure

```text
src/
  types/
    cartographie.ts          ← NOUVEAU — tous les types TS de l'outil
  hooks/
    useCartographie.ts       ← NOUVEAU — CRUD Supabase pour process_maps + sheets
  pages/
    CartographieLandingPage.tsx  ← NOUVEAU — landing marketing + bouton Stripe
  main.tsx                   ← MODIFIÉ — ajouter route /cartographie

supabase/
  migrations/
    20260604_process_maps.sql  ← NOUVEAU — tables + RLS
  functions/
    generate-process-map/
      index.ts               ← NOUVEAU — Mistral Agents API + web_search
    reformulate-smart/
      index.ts               ← NOUVEAU — reformulation objectif SMART
    ai-assist-process/
      index.ts               ← NOUVEAU — aide IA à la demande

src/pages/HomePage.tsx       ← MODIFIÉ — ajouter carte "Cartographie"
```

---

## Task 1 : Types TypeScript

**Files:**
- Create: `src/types/cartographie.ts`
- Create: `src/types/cartographie.test.ts`

- [ ] **Étape 1 : Écrire le fichier de types**

```typescript
// src/types/cartographie.ts

export type ProcessType = 'pilotage' | 'realisation' | 'support';

export type ParallelGroup = string; // identifiant du groupe de parallélisme

export interface ProcessDefinition {
  id: string;                  // uuid local (crypto.randomUUID)
  type: ProcessType;
  name: string;
  pilotName: string;
  pilotRole: string;
  role?: string;               // pilotage only: rôle en une phrase
  // réalisation only:
  inputElement?: string;       // élément entrant
  outputElement?: string;      // élément sortant
  afterProcessId?: string;     // id du processus précédent (séquentiel)
  parallelGroupId?: string;    // si parallèle, identifiant du groupe
  // support only:
  linkedRealisationIds?: string[]; // processus réalisation alimentés
}

export interface SmartObjective {
  rawText: string;             // texte brut saisi par l'utilisateur
  objectiveText: string;       // objectif reformulé par l'IA
  indicator: string;           // indicateur de mesure
  target: string;              // valeur cible (ex: "95%")
  frequency: string;           // fréquence de mesure
  deadline: string;            // échéance (ISO date string)
}

export interface ProcessSheet {
  id?: string;
  mapId: string;
  process: ProcessDefinition;
  participants: string[];
  purpose: string;
  inputs: string[];
  activities: string[];
  outputs: string[];
  resources: string[];
  smartObjective: SmartObjective;
  kpiLagging: string;
  kpiLeading: string;
  risks: string[];
  documents: string[];
  revisionFrequency: string;
}

export interface CartographyData {
  processes: ProcessDefinition[];
}

export interface ProcessMap {
  id?: string;
  userId?: string;
  companyName: string;
  sector: string;
  headcount: number;
  sseManagerName: string;
  sseManagerRole: string;
  documentDate: string;        // ISO date string
  phase1Completed: boolean;
  phase2Completed: boolean;
  cartographyData: CartographyData;
  createdAt?: string;
  updatedAt?: string;
}

// Payloads Edge Functions
export interface GenerateProcessMapPayload {
  companyName: string;
  sector: string;
  city: string;
}

export interface GenerateProcessMapResult {
  processes: ProcessDefinition[];
  source: 'web_search' | 'sector_model'; // trouvé en ligne ou modèle type
  sourceSummary?: string;                 // résumé de ce qui a été trouvé
}

export interface ReformulateSmartPayload {
  rawObjective: string;
  processName: string;
  sector: string;
}

export interface ReformulateSmartResult {
  objectiveText: string;
  indicator: string;
  target: string;
  frequency: string;
  deadline: string;
}

export interface AiAssistPayload {
  questionType: 'purpose' | 'activities' | 'resources' | 'risks' | 'documents';
  processName: string;
  processType: ProcessType;
  sector: string;
  context: Record<string, unknown>; // réponses déjà données
}

export interface AiAssistResult {
  suggestion: string | string[]; // string pour purpose, string[] pour les listes
}
```

- [ ] **Étape 2 : Écrire le test de type (vérification de forme)**

```typescript
// src/types/cartographie.test.ts
import { describe, it, expect } from 'vitest';
import type {
  ProcessDefinition, ProcessMap, SmartObjective,
  ProcessSheet, CartographyData,
} from './cartographie';

describe('Cartographie types', () => {
  it('ProcessDefinition accepte un processus de réalisation complet', () => {
    const p: ProcessDefinition = {
      id: crypto.randomUUID(),
      type: 'realisation',
      name: 'Gestion des chantiers',
      pilotName: 'Jean Dupont',
      pilotRole: 'Chef de chantier',
      inputElement: 'Devis signé',
      outputElement: 'PV de réception',
    };
    expect(p.type).toBe('realisation');
    expect(p.inputElement).toBeDefined();
  });

  it('ProcessMap a phase1Completed false par défaut', () => {
    const map: ProcessMap = {
      companyName: 'Test SARL',
      sector: 'BTP',
      headcount: 15,
      sseManagerName: 'Marie Martin',
      sseManagerRole: 'Responsable SSE',
      documentDate: '2026-06-04',
      phase1Completed: false,
      phase2Completed: false,
      cartographyData: { processes: [] },
    };
    expect(map.phase1Completed).toBe(false);
    expect(map.cartographyData.processes).toHaveLength(0);
  });

  it('SmartObjective a tous les champs requis', () => {
    const smart: SmartObjective = {
      rawText: 'Livrer à temps',
      objectiveText: 'Atteindre 90% de chantiers livrés dans les délais',
      indicator: 'Taux de respect des délais',
      target: '90%',
      frequency: 'Mensuelle',
      deadline: '2026-12-31',
    };
    expect(smart.target).toBe('90%');
  });
});
```

- [ ] **Étape 3 : Lancer le test**

```bash
npx vitest run src/types/cartographie.test.ts
```

Résultat attendu : `3 passed`

- [ ] **Étape 4 : Commit**

```bash
git add src/types/cartographie.ts src/types/cartographie.test.ts
git commit -m "feat(cartographie): types TypeScript complets"
```

---

## Task 2 : Migration Supabase

**Files:**
- Create: `supabase/migrations/20260604000000_process_maps.sql`

- [ ] **Étape 1 : Créer le fichier de migration**

```sql
-- supabase/migrations/20260604000000_process_maps.sql

-- Table principale : une cartographie par utilisateur (modifiable chaque année)
CREATE TABLE IF NOT EXISTS public.process_maps (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name      text NOT NULL,
  sector            text NOT NULL DEFAULT '',
  headcount         integer NOT NULL DEFAULT 0,
  sse_manager_name  text NOT NULL DEFAULT '',
  sse_manager_role  text NOT NULL DEFAULT '',
  document_date     date NOT NULL DEFAULT CURRENT_DATE,
  phase_1_completed boolean NOT NULL DEFAULT false,
  phase_2_completed boolean NOT NULL DEFAULT false,
  cartography_data  jsonb NOT NULL DEFAULT '{"processes":[]}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Table des fiches de processus (une par processus de la cartographie)
CREATE TABLE IF NOT EXISTS public.process_sheets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id              uuid NOT NULL REFERENCES public.process_maps(id) ON DELETE CASCADE,
  process_type        text NOT NULL CHECK (process_type IN ('pilotage','realisation','support')),
  process_name        text NOT NULL,
  pilot_name          text NOT NULL DEFAULT '',
  pilot_role          text NOT NULL DEFAULT '',
  participants        text[] NOT NULL DEFAULT '{}',
  purpose             text NOT NULL DEFAULT '',
  inputs              jsonb NOT NULL DEFAULT '[]'::jsonb,
  activities          jsonb NOT NULL DEFAULT '[]'::jsonb,
  outputs             jsonb NOT NULL DEFAULT '[]'::jsonb,
  resources           jsonb NOT NULL DEFAULT '[]'::jsonb,
  smart_objective     jsonb NOT NULL DEFAULT '{}'::jsonb,
  kpi_lagging         text NOT NULL DEFAULT '',
  kpi_leading         text NOT NULL DEFAULT '',
  risks               jsonb NOT NULL DEFAULT '[]'::jsonb,
  documents           text[] NOT NULL DEFAULT '{}',
  revision_frequency  text NOT NULL DEFAULT 'Annuelle',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- RLS process_maps
ALTER TABLE public.process_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "process_maps: lecture utilisateur"
  ON public.process_maps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "process_maps: insertion utilisateur"
  ON public.process_maps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "process_maps: mise à jour utilisateur"
  ON public.process_maps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "process_maps: suppression utilisateur"
  ON public.process_maps FOR DELETE
  USING (auth.uid() = user_id);

-- RLS process_sheets (via JOIN sur process_maps)
ALTER TABLE public.process_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "process_sheets: lecture utilisateur"
  ON public.process_sheets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.process_maps
      WHERE process_maps.id = process_sheets.map_id
        AND process_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "process_sheets: insertion utilisateur"
  ON public.process_sheets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.process_maps
      WHERE process_maps.id = process_sheets.map_id
        AND process_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "process_sheets: mise à jour utilisateur"
  ON public.process_sheets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.process_maps
      WHERE process_maps.id = process_sheets.map_id
        AND process_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "process_sheets: suppression utilisateur"
  ON public.process_sheets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.process_maps
      WHERE process_maps.id = process_sheets.map_id
        AND process_maps.user_id = auth.uid()
    )
  );

-- Trigger updated_at automatique
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER process_maps_updated_at
  BEFORE UPDATE ON public.process_maps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER process_sheets_updated_at
  BEFORE UPDATE ON public.process_sheets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

- [ ] **Étape 2 : Appliquer la migration via Supabase Dashboard**

Aller sur https://supabase.com/dashboard → projet `ulceeurwibmbtnqhkaao` → SQL Editor → coller et exécuter le contenu du fichier.

Vérifier dans Table Editor que les tables `process_maps` et `process_sheets` apparaissent avec les bonnes colonnes.

- [ ] **Étape 3 : Commit**

```bash
git add supabase/migrations/20260604000000_process_maps.sql
git commit -m "feat(cartographie): migration Supabase tables process_maps + process_sheets"
```

---

## Task 3 : Edge Function — generate-process-map (Mistral web search)

**Files:**
- Create: `supabase/functions/generate-process-map/index.ts`

- [ ] **Étape 1 : Créer la Edge Function**

```typescript
// supabase/functions/generate-process-map/index.ts

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  companyName: string;
  sector: string;
  city: string;
}

interface ProcessDefinition {
  id: string;
  type: 'pilotage' | 'realisation' | 'support';
  name: string;
  pilotName: string;
  pilotRole: string;
  role?: string;
  inputElement?: string;
  outputElement?: string;
  afterProcessId?: string;
  parallelGroupId?: string;
  linkedRealisationIds?: string[];
}

interface MistralMessage {
  role: string;
  content: string | Array<{ type: string; text?: string }>;
}

async function callMistralWithWebSearch(
  apiKey: string,
  companyName: string,
  sector: string,
  city: string,
): Promise<{ processes: ProcessDefinition[]; source: string; sourceSummary?: string }> {
  // Créer un agent Mistral avec web_search
  const createAgentRes = await fetch('https://api.mistral.ai/v1/agents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      name: 'process-map-generator',
      instructions: `Tu es un expert en cartographie des processus selon la norme ISO 9001 et le référentiel MASE V2024.
Ta mission : générer une cartographie des processus MASE complète et réaliste.
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown.`,
      tools: [{ type: 'web_search' }],
    }),
  });

  if (!createAgentRes.ok) {
    throw new Error(`Mistral agent creation failed: ${createAgentRes.status}`);
  }

  const agent = await createAgentRes.json();
  const agentId = agent.id;

  // Démarrer une conversation avec recherche web
  const prompt = `Recherche des informations sur l'entreprise "${companyName}" située à ${city}, qui opère dans le secteur "${sector}".

Utilise web_search pour trouver : son activité principale, ses processus métier, sa taille approximative, ses spécificités.

Ensuite, génère une cartographie des processus MASE complète avec :
- 2 à 4 processus de PILOTAGE (direction, amélioration continue, etc.)
- 3 à 6 processus de RÉALISATION dans l'ordre séquentiel de l'activité (avec éléments entrants/sortants)
- 3 à 5 processus de SUPPORT (RH, matériel, SSE, etc.)

Réponds UNIQUEMENT avec ce JSON (pas de texte avant ou après) :
{
  "source": "web_search" ou "sector_model",
  "sourceSummary": "Résumé de ce que tu as trouvé sur l'entreprise (1 phrase)",
  "processes": [
    {
      "id": "p1",
      "type": "pilotage",
      "name": "Nom du processus",
      "pilotName": "Prénom Nom (à compléter)",
      "pilotRole": "Titre du poste",
      "role": "Rôle en une phrase"
    },
    {
      "id": "p4",
      "type": "realisation",
      "name": "Nom du processus",
      "pilotName": "Prénom Nom (à compléter)",
      "pilotRole": "Titre du poste",
      "inputElement": "Document ou info reçue pour démarrer",
      "outputElement": "Document ou résultat produit",
      "afterProcessId": "id du processus précédent ou null"
    },
    {
      "id": "p8",
      "type": "support",
      "name": "Ressources Humaines",
      "pilotName": "Prénom Nom (à compléter)",
      "pilotRole": "Responsable RH",
      "linkedRealisationIds": ["p4", "p5"]
    }
  ]
}`;

  const convRes = await fetch('https://api.mistral.ai/v1/conversations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent_id: agentId,
      inputs: prompt,
    }),
  });

  if (!convRes.ok) {
    throw new Error(`Mistral conversation failed: ${convRes.status}`);
  }

  const conv = await convRes.json();

  // Extraire le texte de la réponse
  let responseText = '';
  if (conv.outputs && Array.isArray(conv.outputs)) {
    for (const output of conv.outputs) {
      if (output.type === 'message' && output.role === 'assistant') {
        if (typeof output.content === 'string') {
          responseText = output.content;
        } else if (Array.isArray(output.content)) {
          for (const chunk of output.content) {
            if (chunk.type === 'text') responseText += chunk.text ?? '';
          }
        }
      }
    }
  }

  // Nettoyer et parser le JSON
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Réponse Mistral invalide — JSON non trouvé');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Supprimer l'agent temporaire (best effort)
  await fetch(`https://api.mistral.ai/v1/agents/${agentId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${apiKey}` },
  }).catch(() => {/* ignore */});

  return {
    processes: parsed.processes ?? [],
    source: parsed.source ?? 'sector_model',
    sourceSummary: parsed.sourceSummary,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { companyName, sector, city } = body;

    if (!companyName || !sector) {
      return new Response(
        JSON.stringify({ error: 'companyName et sector sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const apiKey = Deno.env.get('MISTRAL_API_KEY');
    if (!apiKey) throw new Error('MISTRAL_API_KEY non configuré');

    const result = await callMistralWithWebSearch(apiKey, companyName, sector, city ?? '');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';

    // Fallback : retourner un modèle vide plutôt qu'une erreur bloquante
    return new Response(
      JSON.stringify({
        processes: [],
        source: 'sector_model',
        sourceSummary: null,
        error: message,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
```

- [ ] **Étape 2 : Déployer la fonction**

```bash
$env:SUPABASE_ACCESS_TOKEN = "votre-token-autret.maiwenn"
npx supabase functions deploy generate-process-map --project-ref ulceeurwibmbtnqhkaao
```

- [ ] **Étape 3 : Tester manuellement via curl**

```bash
curl -X POST "https://ulceeurwibmbtnqhkaao.supabase.co/functions/v1/generate-process-map" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Dupont TP","sector":"BTP - Terrassement","city":"Lyon"}'
```

Résultat attendu : JSON avec `processes` non vide et `source` = `"web_search"` ou `"sector_model"`.

- [ ] **Étape 4 : Commit**

```bash
git add supabase/functions/generate-process-map/index.ts
git commit -m "feat(cartographie): Edge Function generate-process-map avec Mistral web_search"
```

---

## Task 4 : Edge Function — reformulate-smart

**Files:**
- Create: `supabase/functions/reformulate-smart/index.ts`

- [ ] **Étape 1 : Créer la fonction**

```typescript
// supabase/functions/reformulate-smart/index.ts

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  rawObjective: string;
  processName: string;
  sector: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rawObjective, processName, sector }: RequestBody = await req.json();

    if (!rawObjective || !processName) {
      return new Response(
        JSON.stringify({ error: 'rawObjective et processName requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const apiKey = Deno.env.get('MISTRAL_API_KEY')!;

    const prompt = `Tu es un expert MASE V2024. Reformule cet objectif en format SMART complet.

Processus : "${processName}"
Secteur : "${sector}"
Objectif brut : "${rawObjective}"

Réponds UNIQUEMENT avec ce JSON (pas de texte avant ou après) :
{
  "objectiveText": "Objectif reformulé précis et mesurable (1 phrase)",
  "indicator": "Nom de l'indicateur de mesure",
  "target": "Valeur cible chiffrée (ex: 95%, 0, <48h)",
  "frequency": "Mensuelle" ou "Trimestrielle" ou "Annuelle",
  "deadline": "2026-12-31"
}`;

    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!res.ok) throw new Error(`Mistral error: ${res.status}`);

    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON non trouvé dans la réponse');

    const result = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
```

- [ ] **Étape 2 : Déployer**

```bash
npx supabase functions deploy reformulate-smart --project-ref ulceeurwibmbtnqhkaao
```

- [ ] **Étape 3 : Tester**

```bash
curl -X POST "https://ulceeurwibmbtnqhkaao.supabase.co/functions/v1/reformulate-smart" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"rawObjective":"Livrer mes chantiers à temps","processName":"Gestion des chantiers","sector":"BTP"}'
```

Résultat attendu : JSON avec `objectiveText`, `indicator`, `target`, `frequency`, `deadline` renseignés.

- [ ] **Étape 4 : Commit**

```bash
git add supabase/functions/reformulate-smart/index.ts
git commit -m "feat(cartographie): Edge Function reformulate-smart (objectifs SMART via Mistral)"
```

---

## Task 5 : Edge Function — ai-assist-process

**Files:**
- Create: `supabase/functions/ai-assist-process/index.ts`

- [ ] **Étape 1 : Créer la fonction**

```typescript
// supabase/functions/ai-assist-process/index.ts

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type QuestionType = 'purpose' | 'activities' | 'resources' | 'risks' | 'documents';

interface RequestBody {
  questionType: QuestionType;
  processName: string;
  processType: 'pilotage' | 'realisation' | 'support';
  sector: string;
  context: Record<string, unknown>;
}

const PROMPTS: Record<QuestionType, (b: RequestBody) => string> = {
  purpose: (b) => `Écris en 1 phrase la finalité du processus "${b.processName}" pour une entreprise ${b.sector}.
Commence par "Ce processus a pour but de...".
Réponds avec du texte simple (pas de JSON).`,

  activities: (b) => `Liste les 4 à 6 grandes étapes internes du processus "${b.processName}" pour une entreprise ${b.sector}.
Réponds UNIQUEMENT avec un tableau JSON de strings :
["Étape 1", "Étape 2", "Étape 3", "Étape 4"]`,

  resources: (b) => `Liste les ressources nécessaires au processus "${b.processName}" (humaines, matérielles, logiciels) pour une entreprise ${b.sector}.
Réponds UNIQUEMENT avec un tableau JSON de strings :
["Ressource 1", "Ressource 2", "Ressource 3"]`,

  risks: (b) => `Liste les 2 à 3 risques principaux du processus "${b.processName}" pour une entreprise ${b.sector}.
Sois concis et précis (1 phrase par risque).
Réponds UNIQUEMENT avec un tableau JSON de strings :
["Risque 1", "Risque 2", "Risque 3"]`,

  documents: (b) => `Liste les 3 à 5 documents ou formulaires qui encadrent le processus "${b.processName}" pour une entreprise ${b.sector}.
Réponds UNIQUEMENT avec un tableau JSON de strings :
["Document 1", "Document 2", "Document 3"]`,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { questionType, processName, sector } = body;

    if (!questionType || !processName) {
      return new Response(
        JSON.stringify({ error: 'questionType et processName requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const apiKey = Deno.env.get('MISTRAL_API_KEY')!;
    const prompt = PROMPTS[questionType](body);

    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
      }),
    });

    if (!res.ok) throw new Error(`Mistral error: ${res.status}`);

    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content?.trim() ?? '';

    // Pour "purpose", retourner du texte brut. Pour les autres, parser le JSON array.
    let suggestion: string | string[];
    if (questionType === 'purpose') {
      suggestion = text;
    } else {
      const arrMatch = text.match(/\[[\s\S]*\]/);
      suggestion = arrMatch ? JSON.parse(arrMatch[0]) : [text];
    }

    return new Response(
      JSON.stringify({ suggestion }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
```

- [ ] **Étape 2 : Déployer**

```bash
npx supabase functions deploy ai-assist-process --project-ref ulceeurwibmbtnqhkaao
```

- [ ] **Étape 3 : Tester**

```bash
curl -X POST "https://ulceeurwibmbtnqhkaao.supabase.co/functions/v1/ai-assist-process" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"questionType":"risks","processName":"Gestion des chantiers","processType":"realisation","sector":"BTP","context":{}}'
```

Résultat attendu : `{"suggestion": ["Risque 1", "Risque 2", "Risque 3"]}`

- [ ] **Étape 4 : Commit**

```bash
git add supabase/functions/ai-assist-process/index.ts
git commit -m "feat(cartographie): Edge Function ai-assist-process (aide IA à la demande)"
```

---

## Task 6 : Hook useCartographie

**Files:**
- Create: `src/hooks/useCartographie.ts`
- Create: `src/hooks/useCartographie.test.ts`

- [ ] **Étape 1 : Écrire le test d'abord**

```typescript
// src/hooks/useCartographie.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null }),
    single: vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null }),
  },
}));

import { useCartographie } from './useCartographie';

describe('useCartographie', () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne isLoading=false et map=null si pas de session", () => {
    const { result } = renderHook(() => useCartographie(null));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.map).toBeNull();
  });

  it("expose saveMap comme fonction", () => {
    const { result } = renderHook(() => useCartographie(null));
    expect(typeof result.current.saveMap).toBe('function');
  });

  it("expose callGenerateProcessMap comme fonction", () => {
    const { result } = renderHook(() => useCartographie(null));
    expect(typeof result.current.callGenerateProcessMap).toBe('function');
  });
});
```

- [ ] **Étape 2 : Lancer le test — vérifier qu'il échoue**

```bash
npx vitest run src/hooks/useCartographie.test.ts
```

Résultat attendu : `FAIL — cannot find module './useCartographie'`

- [ ] **Étape 3 : Implémenter le hook**

```typescript
// src/hooks/useCartographie.ts
import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type {
  ProcessMap, ProcessSheet,
  GenerateProcessMapPayload, GenerateProcessMapResult,
  ReformulateSmartPayload, ReformulateSmartResult,
  AiAssistPayload, AiAssistResult,
} from '../types/cartographie';

interface UseCartographieReturn {
  map: ProcessMap | null;
  isLoading: boolean;
  error: string | null;
  saveMap: (data: Partial<ProcessMap>) => Promise<ProcessMap>;
  saveSheet: (sheet: Omit<ProcessSheet, 'id'>) => Promise<ProcessSheet>;
  getSheets: (mapId: string) => Promise<ProcessSheet[]>;
  callGenerateProcessMap: (payload: GenerateProcessMapPayload) => Promise<GenerateProcessMapResult>;
  callReformulateSmart: (payload: ReformulateSmartPayload) => Promise<ReformulateSmartResult>;
  callAiAssist: (payload: AiAssistPayload) => Promise<AiAssistResult>;
  refetch: () => void;
}

function dbRowToMap(row: Record<string, unknown>): ProcessMap {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    companyName: row.company_name as string,
    sector: row.sector as string,
    headcount: row.headcount as number,
    sseManagerName: row.sse_manager_name as string,
    sseManagerRole: row.sse_manager_role as string,
    documentDate: row.document_date as string,
    phase1Completed: row.phase_1_completed as boolean,
    phase2Completed: row.phase_2_completed as boolean,
    cartographyData: (row.cartography_data as ProcessMap['cartographyData']) ?? { processes: [] },
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapToDbRow(map: Partial<ProcessMap>, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  if (map.companyName !== undefined) row.company_name = map.companyName;
  if (map.sector !== undefined) row.sector = map.sector;
  if (map.headcount !== undefined) row.headcount = map.headcount;
  if (map.sseManagerName !== undefined) row.sse_manager_name = map.sseManagerName;
  if (map.sseManagerRole !== undefined) row.sse_manager_role = map.sseManagerRole;
  if (map.documentDate !== undefined) row.document_date = map.documentDate;
  if (map.phase1Completed !== undefined) row.phase_1_completed = map.phase1Completed;
  if (map.phase2Completed !== undefined) row.phase_2_completed = map.phase2Completed;
  if (map.cartographyData !== undefined) row.cartography_data = map.cartographyData;
  if (map.id !== undefined) row.id = map.id;
  return row;
}

export function useCartographie(session: Session | null): UseCartographieReturn {
  const [map, setMap] = useState<ProcessMap | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!session) { setMap(null); return; }
    setIsLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('process_maps')
        .select('*')
        .eq('user_id', session.user.id)
        .limit(1)
        .maybeSingle();
      if (err) throw err;
      setMap(data ? dbRowToMap(data as Record<string, unknown>) : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => { fetch(); }, [fetch]);

  const saveMap = useCallback(async (data: Partial<ProcessMap>): Promise<ProcessMap> => {
    if (!session) throw new Error('Non connecté');
    const row = mapToDbRow(data, session.user.id);
    const { data: saved, error: err } = await supabase
      .from('process_maps')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (err) throw err;
    const result = dbRowToMap(saved as Record<string, unknown>);
    setMap(result);
    return result;
  }, [session]);

  const saveSheet = useCallback(async (sheet: Omit<ProcessSheet, 'id'>): Promise<ProcessSheet> => {
    const row = {
      map_id: sheet.mapId,
      process_type: sheet.process.type,
      process_name: sheet.process.name,
      pilot_name: sheet.process.pilotName,
      pilot_role: sheet.process.pilotRole,
      participants: sheet.participants,
      purpose: sheet.purpose,
      inputs: sheet.inputs,
      activities: sheet.activities,
      outputs: sheet.outputs,
      resources: sheet.resources,
      smart_objective: sheet.smartObjective,
      kpi_lagging: sheet.kpiLagging,
      kpi_leading: sheet.kpiLeading,
      risks: sheet.risks,
      documents: sheet.documents,
      revision_frequency: sheet.revisionFrequency,
    };
    const { data, error: err } = await supabase
      .from('process_sheets')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (err) throw err;
    return { ...sheet, id: (data as Record<string, unknown>).id as string };
  }, []);

  const getSheets = useCallback(async (mapId: string): Promise<ProcessSheet[]> => {
    const { data, error: err } = await supabase
      .from('process_sheets')
      .select('*')
      .eq('map_id', mapId);
    if (err) throw err;
    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      mapId: row.map_id as string,
      process: {
        id: row.id as string,
        type: row.process_type as ProcessSheet['process']['type'],
        name: row.process_name as string,
        pilotName: row.pilot_name as string,
        pilotRole: row.pilot_role as string,
      },
      participants: (row.participants as string[]) ?? [],
      purpose: row.purpose as string,
      inputs: (row.inputs as string[]) ?? [],
      activities: (row.activities as string[]) ?? [],
      outputs: (row.outputs as string[]) ?? [],
      resources: (row.resources as string[]) ?? [],
      smartObjective: (row.smart_objective as ProcessSheet['smartObjective']) ?? {
        rawText: '', objectiveText: '', indicator: '', target: '', frequency: '', deadline: '',
      },
      kpiLagging: row.kpi_lagging as string,
      kpiLeading: row.kpi_leading as string,
      risks: (row.risks as string[]) ?? [],
      documents: (row.documents as string[]) ?? [],
      revisionFrequency: row.revision_frequency as string,
    }));
  }, []);

  const callEdgeFunction = useCallback(async <T>(
    name: string,
    payload: unknown,
  ): Promise<T> => {
    const { data, error: err } = await supabase.functions.invoke(name, { body: payload });
    if (err) throw err;
    if (data.error) throw new Error(data.error);
    return data as T;
  }, []);

  const callGenerateProcessMap = useCallback(
    (p: GenerateProcessMapPayload) => callEdgeFunction<GenerateProcessMapResult>('generate-process-map', p),
    [callEdgeFunction],
  );

  const callReformulateSmart = useCallback(
    (p: ReformulateSmartPayload) => callEdgeFunction<ReformulateSmartResult>('reformulate-smart', p),
    [callEdgeFunction],
  );

  const callAiAssist = useCallback(
    (p: AiAssistPayload) => callEdgeFunction<AiAssistResult>('ai-assist-process', p),
    [callEdgeFunction],
  );

  return {
    map, isLoading, error,
    saveMap, saveSheet, getSheets,
    callGenerateProcessMap, callReformulateSmart, callAiAssist,
    refetch: fetch,
  };
}
```

- [ ] **Étape 4 : Relancer le test**

```bash
npx vitest run src/hooks/useCartographie.test.ts
```

Résultat attendu : `3 passed`

- [ ] **Étape 5 : Commit**

```bash
git add src/hooks/useCartographie.ts src/hooks/useCartographie.test.ts
git commit -m "feat(cartographie): hook useCartographie (CRUD Supabase + appels Edge Functions)"
```

---

## Task 7 : Landing page CartographieLandingPage

**Files:**
- Create: `src/pages/CartographieLandingPage.tsx`

- [ ] **Étape 1 : Créer la page**

```tsx
// src/pages/CartographieLandingPage.tsx
import { useState, useEffect, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { SessionContext } from '../contexts/SessionContext';

const PRICE_CENTS = 4900; // 49 €

export default function CartographieLandingPage() {
  const session = useContext(SessionContext) as Session | null;
  const [hasPurchase, setHasPurchase] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    if (!session) { setCheckingAccess(false); return; }
    supabase
      .from('purchases')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('tool_slug', 'cartographie-processus')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setHasPurchase(!!data);
        setCheckingAccess(false);
      });
  }, [session]);

  const handleBuy = async () => {
    if (!session) {
      await supabase.auth.signInWithOAuth({ provider: 'google' });
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          user_id: session.user.id,
          email: session.user.email,
          tool_slug: 'cartographie-processus',
          tool_name: 'Cartographie des Processus MASE',
          mode: 'payment',
          unit_amount: PRICE_CENTS,
          success_path: '/cartographie?payment=success',
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = () => {
    window.location.href = '/cartographie/wizard';
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f3' }}>
      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-3"
        style={{ backgroundColor: 'var(--mase-primary)' }}
      >
        <a href="/" className="text-lg font-bold text-white">MASE</a>
        {session ? (
          <span className="text-sm text-white/70">{session.user.email}</span>
        ) : (
          <button
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
            className="text-sm text-white/70 hover:text-white"
          >
            Se connecter
          </button>
        )}
      </nav>

      {/* Hero */}
      <section
        className="px-6 py-20 text-center"
        style={{ background: 'linear-gradient(135deg, var(--mase-primary), #1e4d7b)' }}
      >
        <span className="mb-4 inline-block rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
          🗺️ Conforme MASE V2024
        </span>
        <h1 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">
          Cartographie des Processus
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
          Créez votre cartographie des processus et vos fiches de processus conformes MASE V2024,
          guidé étape par étape — même sans connaissance préalable.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          {!checkingAccess && (
            hasPurchase ? (
              <button
                onClick={handleStart}
                className="rounded-lg px-8 py-3 text-base font-bold text-white"
                style={{ backgroundColor: '#16a34a' }}
              >
                Accéder à mon outil →
              </button>
            ) : (
              <button
                onClick={handleBuy}
                disabled={isLoading}
                className="rounded-lg px-8 py-3 text-base font-bold text-white disabled:opacity-60"
                style={{ backgroundColor: '#16a34a' }}
              >
                {isLoading ? 'Redirection…' : `Acheter — 49 € (paiement unique)`}
              </button>
            )
          )}
          <p className="text-sm text-white/60">Accès à vie · Sauvegarde en ligne · 3 PDF générés</p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="mb-10 text-center text-2xl font-bold text-gray-800">Ce que vous obtenez</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: '🗺️', title: 'Cartographie visuelle PDF', desc: 'Format standard MASE (client gauche/droite, pilotage/réalisation/support) prête pour l\'auditeur.' },
            { icon: '📄', title: 'Fiches de processus', desc: 'Une fiche détaillée par processus : pilote, objectif SMART, KPIs, risques — conformes aux 5 axes MASE.' },
            { icon: '✨', title: 'IA intégrée', desc: 'L\'IA recherche votre entreprise en ligne et pré-remplit la cartographie. Objectifs SMART reformulés automatiquement.' },
          ].map((f) => (
            <div key={f.title} className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="mb-2 font-bold text-gray-800">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Étape 2 : Commit**

```bash
git add src/pages/CartographieLandingPage.tsx
git commit -m "feat(cartographie): landing page avec Stripe"
```

---

## Task 8 : Routage + mise à jour HomePage

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/pages/HomePage.tsx`

- [ ] **Étape 1 : Ajouter la route dans main.tsx**

Dans `src/main.tsx`, ajouter en haut :

```typescript
import CartographieLandingPage from './pages/CartographieLandingPage';
```

Dans le bloc `<Routes>`, après la ligne de `/matrice-polyvalence` :

```tsx
<Route path="/cartographie" element={<CartographieLandingPage />} />
```

- [ ] **Étape 2 : Vérifier que l'app compile**

```bash
npx vite build
```

Résultat attendu : build sans erreur TypeScript.

- [ ] **Étape 3 : Ajouter la card Cartographie dans HomePage**

Dans `src/pages/HomePage.tsx`, localiser la section des cards d'outils (section avec les 3 outils existants) et ajouter après les outils existants une card Cartographie :

```tsx
<div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col gap-3">
  <div className="text-3xl">🗺️</div>
  <h3 className="font-bold text-gray-800 text-lg">Cartographie des Processus</h3>
  <p className="text-sm text-gray-500 flex-1">
    Créez votre cartographie MASE V2024 et vos fiches de processus avec objectifs SMART,
    guidé étape par étape par l'IA.
  </p>
  <div className="flex items-center justify-between">
    <span className="text-sm font-semibold text-gray-700">49 € — accès à vie</span>
    <a
      href="/cartographie"
      className="rounded-lg px-4 py-2 text-sm font-bold text-white"
      style={{ backgroundColor: 'var(--mase-primary)' }}
    >
      Découvrir →
    </a>
  </div>
</div>
```

- [ ] **Étape 4 : Lancer le dev server et vérifier visuellement**

```bash
npx vite
```

Ouvrir http://localhost:5173/ → vérifier que la card Cartographie apparaît.
Ouvrir http://localhost:5173/cartographie → vérifier que la landing page s'affiche correctement.

- [ ] **Étape 5 : Commit final Plan A**

```bash
git add src/main.tsx src/pages/HomePage.tsx
git commit -m "feat(cartographie): routing + card HomePage — Plan A complet"
```

---

## Self-Review

**Couverture spec :**

| Exigence spec | Tâche |
|---|---|
| Tables `process_maps` + `process_sheets` + RLS | Task 2 |
| Edge Function génération + web search Mistral | Task 3 |
| Edge Function SMART | Task 4 |
| Edge Function aide IA | Task 5 |
| Hook CRUD + appels Edge Functions | Task 6 |
| Route `/cartographie` + landing Stripe | Task 7 + 8 |
| Card HomePage | Task 8 |
| Types TypeScript complets | Task 1 |

**Ce que ce plan ne couvre PAS (Plans B et C) :**
- Introduction pédagogique
- Phase 1 wizard (8 étapes)
- Phase 2 wizard (fiches de processus)
- Génération PDF (cartographie + fiches + bundle)
- Aperçu visuel interactif de la carte

**Placeholders :** aucun — tout le code est complet.

**Cohérence des types :** les types définis dans `cartographie.ts` (Task 1) sont utilisés directement dans le hook (Task 6). Les noms de méthodes sont cohérents entre tasks.
