# Generate Process Map — Amélioration pipeline IA

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre la génération IA de cartographie MASE fiable pour toute entreprise en remplaçant l'appel Mistral Agents monolithique par un pipeline deux phases indépendantes (recherche 20s + génération JSON garanti).

**Architecture:** Phase 1 `searchCompanyContext` — agent Mistral small + web_search, prompt ciblé, timeout 20s, retourne du texte brut. Phase 2 `generateProcessMap` — chat completions mistral-large avec `response_format: json_object`, injecte le contexte de Phase 1. Les deux phases sont indépendantes : si Phase 1 échoue, Phase 2 tourne avec le secteur déclaré.

**Tech Stack:** Deno (Edge Function Supabase), Mistral API (`mistral-small-latest` + `mistral-large-latest`), React + Vitest

---

### Task 1 : Exporter `getSectorTemplate` et `SECTOR_TEMPLATES` pour les tests

**Files:**
- Modify: `src/components/cartographie/phase1/Step2AIGeneration.tsx`

- [ ] **Step 1 : Ajouter `export` devant `SECTOR_TEMPLATES` et `getSectorTemplate`**

Dans [Step2AIGeneration.tsx](src/components/cartographie/phase1/Step2AIGeneration.tsx), ligne 6, changer :
```typescript
const SECTOR_TEMPLATES: Record<string, ProcessDefinition[]> = {
```
en :
```typescript
export const SECTOR_TEMPLATES: Record<string, ProcessDefinition[]> = {
```

Et ligne 42, changer :
```typescript
function getSectorTemplate(sector: string): ProcessDefinition[] {
```
en :
```typescript
export function getSectorTemplate(sector: string): ProcessDefinition[] {
```

- [ ] **Step 2 : Vérifier que le build compile**

```bash
npx tsc --noEmit
```
Expected : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/cartographie/phase1/Step2AIGeneration.tsx
git commit -m "refactor(cartographie): exporter getSectorTemplate et SECTOR_TEMPLATES pour tests"
```

---

### Task 2 : Tests de régression pour `getSectorTemplate`

**Files:**
- Create: `src/components/cartographie/phase1/__tests__/getSectorTemplate.test.ts`

- [ ] **Step 1 : Créer le fichier de test**

```typescript
// src/components/cartographie/phase1/__tests__/getSectorTemplate.test.ts
import { describe, it, expect } from 'vitest';
import { getSectorTemplate, SECTOR_TEMPLATES } from '../Step2AIGeneration';

describe('getSectorTemplate — régression', () => {
  it('retourne btp pour "btp travaux"', () => {
    expect(getSectorTemplate('btp travaux')).toBe(SECTOR_TEMPLATES.btp);
  });

  it('retourne btp pour "construction"', () => {
    expect(getSectorTemplate('construction')).toBe(SECTOR_TEMPLATES.btp);
  });

  it('retourne btp pour "chantier"', () => {
    expect(getSectorTemplate('chantier bâtiment')).toBe(SECTOR_TEMPLATES.btp);
  });

  it('retourne maintenance pour "maintenance industrielle"', () => {
    expect(getSectorTemplate('maintenance industrielle')).toBe(SECTOR_TEMPLATES.maintenance);
  });

  it('retourne maintenance pour "entretien équipements"', () => {
    expect(getSectorTemplate('entretien équipements')).toBe(SECTOR_TEMPLATES.maintenance);
  });

  it('retourne generique pour un secteur inconnu', () => {
    expect(getSectorTemplate('logistique')).toBe(SECTOR_TEMPLATES.generique);
  });

  it('retourne generique pour une chaîne vide', () => {
    expect(getSectorTemplate('')).toBe(SECTOR_TEMPLATES.generique);
  });
});

describe('getSectorTemplate — électricité (doit échouer avant Task 3)', () => {
  it('retourne electricite pour "électricité CFO CFA"', () => {
    expect(getSectorTemplate('électricité CFO CFA')).toBe(SECTOR_TEMPLATES.electricite);
  });

  it('retourne electricite pour "courant fort"', () => {
    expect(getSectorTemplate('courant fort bâtiment')).toBe(SECTOR_TEMPLATES.electricite);
  });

  it('retourne electricite pour "génie électrique"', () => {
    expect(getSectorTemplate('génie électrique')).toBe(SECTOR_TEMPLATES.electricite);
  });
});
```

- [ ] **Step 2 : Lancer les tests — les tests de régression doivent passer, les tests électricité doivent échouer**

```bash
npm run test -- getSectorTemplate --run
```

Expected : 7 tests passent (régression), 3 tests échouent (électricité — `SECTOR_TEMPLATES.electricite is undefined`).

- [ ] **Step 3 : Commit**

```bash
git add src/components/cartographie/phase1/__tests__/getSectorTemplate.test.ts
git commit -m "test(cartographie): tests getSectorTemplate régression + électricité (TDD)"
```

---

### Task 3 : Template sectoriel `electricite` + détection améliorée

**Files:**
- Modify: `src/components/cartographie/phase1/Step2AIGeneration.tsx`

- [ ] **Step 1 : Ajouter le template `electricite` dans `SECTOR_TEMPLATES`**

Dans [Step2AIGeneration.tsx](src/components/cartographie/phase1/Step2AIGeneration.tsx), après le bloc `maintenance: [...]` (avant le `};` de fermeture de `SECTOR_TEMPLATES`), ajouter :

```typescript
  electricite: [
    { id: 'p1', type: 'pilotage', name: 'Direction générale', pilotName: '(à compléter)', pilotRole: 'Dirigeant', role: 'Définir la stratégie et les objectifs de l\'entreprise' },
    { id: 'p2', type: 'pilotage', name: 'Amélioration continue', pilotName: '(à compléter)', pilotRole: 'Responsable QSE', role: 'Piloter les actions correctives et la démarche MASE' },
    { id: 'p3', type: 'realisation', name: 'Étude et chiffrage', pilotName: '(à compléter)', pilotRole: 'Chargé d\'affaires', inputElement: 'Appel d\'offre / Demande client', outputElement: 'Devis accepté' },
    { id: 'p4', type: 'realisation', name: 'Préparation chantier électrique', pilotName: '(à compléter)', pilotRole: 'Chef de chantier', inputElement: 'Devis accepté', outputElement: 'Plan d\'installation + DICT + PDP', afterProcessId: 'p3' },
    { id: 'p5', type: 'realisation', name: 'Exécution des travaux CFO/CFA', pilotName: '(à compléter)', pilotRole: 'Chef de chantier', inputElement: 'Plan validé + habilitations', outputElement: 'Installation réalisée', afterProcessId: 'p4' },
    { id: 'p6', type: 'realisation', name: 'Mise en service et réception', pilotName: '(à compléter)', pilotRole: 'Chargé d\'affaires', inputElement: 'Installation réalisée', outputElement: 'PV de réception signé', afterProcessId: 'p5' },
    { id: 'p7', type: 'support', name: 'Ressources Humaines', pilotName: '(à compléter)', pilotRole: 'RRH', linkedRealisationIds: ['p4', 'p5'] },
    { id: 'p8', type: 'support', name: 'Matériel et outillage', pilotName: '(à compléter)', pilotRole: 'Responsable matériel', linkedRealisationIds: ['p5'] },
    { id: 'p9', type: 'support', name: 'SSE et habilitations électriques', pilotName: '(à compléter)', pilotRole: 'Responsable SSE', linkedRealisationIds: ['p3', 'p4', 'p5'] },
    { id: 'p10', type: 'support', name: 'Achats et fournisseurs', pilotName: '(à compléter)', pilotRole: 'Acheteur', linkedRealisationIds: ['p4', 'p5'] },
  ],
```

- [ ] **Step 2 : Remplacer `getSectorTemplate` pour inclure la détection électricité**

Remplacer la fonction entière (lignes 42-51 actuelles) par :

```typescript
export function getSectorTemplate(sector: string): ProcessDefinition[] {
  const lower = sector.toLowerCase();
  if (
    lower.includes('électricité') || lower.includes('electricit') ||
    lower.includes('courant fort') || lower.includes('courant faible') ||
    lower.includes('génie électrique') || lower.includes('genie electrique') ||
    lower.includes('cfo') || lower.includes('cfa')
  ) {
    return SECTOR_TEMPLATES.electricite;
  }
  if (lower.includes('btp') || lower.includes('chantier') || lower.includes('construction') || lower.includes('travaux')) {
    return SECTOR_TEMPLATES.btp;
  }
  if (lower.includes('maintenance') || lower.includes('entretien')) {
    return SECTOR_TEMPLATES.maintenance;
  }
  return SECTOR_TEMPLATES.generique;
}
```

- [ ] **Step 3 : Lancer les tests — tous doivent passer**

```bash
npm run test -- getSectorTemplate --run
```

Expected : 10 tests passent.

- [ ] **Step 4 : Commit**

```bash
git add src/components/cartographie/phase1/Step2AIGeneration.tsx
git commit -m "feat(cartographie): template sectoriel électricité CFO/CFA + détection getSectorTemplate"
```

---

### Task 4 : Message d'erreur réel à la place du message générique

**Files:**
- Modify: `src/components/cartographie/phase1/Step2AIGeneration.tsx`

- [ ] **Step 1 : Modifier le bloc `catch` de `handleGenerateAI`**

Localiser le bloc catch actuel (autour de la ligne 79) :
```typescript
    } catch {
      setAiError('La génération IA a échoué ou a expiré. Utilisation du modèle secteur.');
      update({ processes: getSectorTemplate(state.sector), aiSource: 'sector_model' });
      setGenerated(true);
    }
```

Le remplacer par :
```typescript
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'La génération IA a échoué. Utilisation du modèle secteur.';
      setAiError(msg);
      update({ processes: getSectorTemplate(state.sector), aiSource: 'sector_model' });
      setGenerated(true);
    }
```

- [ ] **Step 2 : Lancer tous les tests du projet**

```bash
npm run test -- --run
```

Expected : tous les tests passent (aucune régression).

- [ ] **Step 3 : Commit**

```bash
git add src/components/cartographie/phase1/Step2AIGeneration.tsx
git commit -m "fix(cartographie): afficher le vrai message d'erreur Mistral au lieu du message générique"
```

---

### Task 5 : Réécrire la Edge Function — Phase 1 `searchCompanyContext`

**Files:**
- Modify: `supabase/functions/generate-process-map/index.ts`

- [ ] **Step 1 : Remplacer le contenu complet de l'Edge Function par la version ci-dessous**

La version finale intègre les deux phases. Écrire ce fichier intégralement :

```typescript
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

async function searchCompanyContext(
  apiKey: string,
  companyName: string,
  sector: string,
  city: string,
): Promise<string> {
  const createAgentRes = await fetch('https://api.mistral.ai/v1/agents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      name: 'company-searcher',
      instructions: 'Tu es un assistant de recherche d\'entreprises. Réponds toujours en français en 3 phrases maximum.',
      tools: [{ type: 'web_search' }],
    }),
  });

  if (!createAgentRes.ok) {
    throw new Error(`Agent creation failed: ${createAgentRes.status}`);
  }

  const agent = await createAgentRes.json();
  const agentId: string = agent.id;

  const convRes = await fetch('https://api.mistral.ai/v1/conversations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent_id: agentId,
      inputs: `Cherche l'ENTREPRISE (société commerciale, PME, groupe industriel) nommée "${companyName}"${city ? ` basée à ${city}` : ''}, secteur "${sector}".

IMPORTANT : si tu trouves un terme médical, une maladie ou de la biologie, ignore-le complètement et cherche uniquement une société commerciale.

Retourne en 3 phrases maximum :
- Son activité principale
- Sa taille approximative (effectif, chiffre d'affaires si disponible)
- Ses spécificités métier (filiale de X, spécialisée en Y, certifiée Z, etc.)

Si tu ne trouves aucune entreprise commerciale correspondante, réponds uniquement : "entreprise non trouvée".`,
    }),
  });

  // Supprimer l'agent en arrière-plan — ne pas attendre
  fetch(`https://api.mistral.ai/v1/agents/${agentId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${apiKey}` },
  }).catch(() => {/* ignore */});

  if (!convRes.ok) {
    throw new Error(`Conversation failed: ${convRes.status}`);
  }

  const conv = await convRes.json();
  let text = '';
  if (conv.outputs && Array.isArray(conv.outputs)) {
    for (const output of conv.outputs) {
      if (output.type === 'message' && output.role === 'assistant') {
        if (typeof output.content === 'string') {
          text = output.content;
        } else if (Array.isArray(output.content)) {
          for (const chunk of output.content) {
            if (chunk.type === 'text') text += chunk.text ?? '';
          }
        }
      }
    }
  }

  if (!text || text.toLowerCase().includes('non trouvée')) return '';
  return text.trim();
}

async function generateProcessMap(
  apiKey: string,
  companyName: string,
  sector: string,
  city: string,
  context: string,
): Promise<{ processes: ProcessDefinition[]; source: string; sourceSummary?: string }> {
  const hasContext = context.length > 0;
  const contextBlock = hasContext
    ? `Contexte trouvé sur cette entreprise :\n"${context}"\n\nAdapte les processus à l'activité réelle décrite ci-dessus.\n\n`
    : '';

  const prompt = `${contextBlock}Génère une cartographie des processus MASE complète pour l'ENTREPRISE "${companyName}"${city ? ` (${city})` : ''}, secteur "${sector}".

Règles :
- 2 à 3 processus de type "pilotage" (direction, amélioration continue, management SSE...)
- 3 à 5 processus de type "realisation" dans l'ordre séquentiel de l'activité, avec inputElement, outputElement, afterProcessId (id du précédent, ou null pour le premier)
- 3 à 4 processus de type "support" (RH, SSE et prévention, matériel, achats...) avec linkedRealisationIds

Réponds avec ce JSON et rien d'autre :
{
  "source": "${hasContext ? 'web_search' : 'sector_model'}",
  "sourceSummary": "Une phrase décrivant l'entreprise ou le modèle utilisé",
  "processes": [
    {"id": "p1", "type": "pilotage", "name": "Nom", "pilotName": "(à compléter)", "pilotRole": "Titre", "role": "Rôle en une phrase"},
    {"id": "p3", "type": "realisation", "name": "Nom", "pilotName": "(à compléter)", "pilotRole": "Titre", "inputElement": "Document reçu", "outputElement": "Document produit", "afterProcessId": null},
    {"id": "p7", "type": "support", "name": "Nom", "pilotName": "(à compléter)", "pilotRole": "Titre", "linkedRealisationIds": ["p3"]}
  ]
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
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) throw new Error(`Mistral chat completions failed: ${res.status}`);

  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content ?? '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON non trouvé dans la réponse Mistral');

  const parsed = JSON.parse(jsonMatch[0]);
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

    // Phase 1 : recherche web avec timeout 20s (indépendante de la Phase 2)
    const searchTimeout = new Promise<string>((resolve) =>
      setTimeout(() => resolve(''), 20_000)
    );
    const context = await Promise.race([
      searchCompanyContext(apiKey, companyName, sector, city ?? '').catch(() => ''),
      searchTimeout,
    ]);

    // Phase 2 : génération JSON avec le contexte trouvé (ou vide si Phase 1 a échoué)
    const result = await generateProcessMap(apiKey, companyName, sector, city ?? '', context);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
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

- [ ] **Step 2 : Vérifier la syntaxe TypeScript (Deno)**

```bash
npx tsc --noEmit
```

Expected : aucune erreur (Deno est ignoré par le tsconfig principal — c'est normal).

- [ ] **Step 3 : Commit**

```bash
git add supabase/functions/generate-process-map/index.ts
git commit -m "feat(edge-fn): pipeline deux phases search+generate pour generate-process-map"
```

---

### Task 6 : Déploiement et test manuel

**Files:** aucun

- [ ] **Step 1 : Déployer la Edge Function**

```bash
npx supabase functions deploy generate-process-map
```

Expected :
```
Deploying function generate-process-map...
Done: generate-process-map deployed successfully.
```

- [ ] **Step 2 : Tester avec une entreprise connue — "Atexia Projets", La Possession**

Dans l'app (npm run dev), naviguer vers la cartographie, saisir :
- Nom : `Atexia Projets`
- Secteur : `électricité courant fort`
- Ville : `La Possession`

Cliquer "Rechercher et générer avec l'IA".

Expected :
- La bannière verte "Entreprise trouvée en ligne" apparaît avec un résumé de l'activité
- Les processus listés incluent des termes électricité (CFO/CFA, chantier électrique, habilitations)
- Le chargement dure moins de 30 secondes

- [ ] **Step 3 : Tester le fallback — secteur inconnu**

Saisir :
- Nom : `ZzTestEntrepriseInexistante`
- Secteur : `nettoyage industriel`
- Ville : `Paris`

Expected :
- Pas de bannière verte (Phase 1 retourne vide)
- Des processus génériques sont générés quand même (Phase 2 tourne avec secteur seul)
- Pas de timeout ni d'erreur bloquante

- [ ] **Step 4 : Vérifier les logs Supabase si un test échoue**

```bash
npx supabase functions logs generate-process-map --tail
```

Ce log affiche le vrai message d'erreur Mistral si Phase 1 ou Phase 2 ont un problème.

- [ ] **Step 5 : Lancer la suite de tests complète**

```bash
npm run test -- --run
```

Expected : tous les tests passent.

- [ ] **Step 6 : Commit final**

```bash
git add .
git commit -m "feat: amélioration pipeline génération IA cartographie — deux phases + template électricité"
```
