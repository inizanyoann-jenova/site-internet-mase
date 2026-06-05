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
