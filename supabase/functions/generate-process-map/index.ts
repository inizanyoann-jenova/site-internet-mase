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

  if (!text || text.toLowerCase().includes('non trouvée') || text.toLowerCase().includes('not found')) return '';
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
  const safeContext = context.slice(0, 500);
  const contextBlock = hasContext
    ? `Contexte trouvé sur cette entreprise :\n"${safeContext}"\n\nAdapte les processus à l'activité réelle décrite ci-dessus.\n\n`
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
    const generateTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout génération IA')), 45_000)
    );
    const result = await Promise.race([
      generateProcessMap(apiKey, companyName, sector, city ?? '', context),
      generateTimeout,
    ]);

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
