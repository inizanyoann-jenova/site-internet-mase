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
