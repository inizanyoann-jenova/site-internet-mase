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
