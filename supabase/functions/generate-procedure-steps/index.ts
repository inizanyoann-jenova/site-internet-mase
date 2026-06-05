const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StepDefinition {
  id: string;
  type: 'activite' | 'decision';
  num: number;
  activite: string;
  acteur: string;
  outil?: string;
  routeTypeAct?: string;
  routeSideAct?: string;
  ouiLabel?: string;
  routeTypeOui?: string;
  routeSideOui?: string;
  nonLabel?: string;
  nonAction?: string;
  nonActor?: string;
  routeTypeNon?: string;
  routeNumNon?: string;
  routeSideNon?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { description, sector, processType, companyName } = await req.json();

    if (!description || !sector) {
      return new Response(
        JSON.stringify({ error: 'description et sector requis' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const apiKey = Deno.env.get('MISTRAL_API_KEY');
    if (!apiKey) throw new Error('MISTRAL_API_KEY non configuré');

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

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
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

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    const jsonMatch = typeof content === 'string' ? content.match(/\{[\s\S]*\}/) : null;
    if (!jsonMatch) throw new Error('Réponse IA invalide — JSON non trouvé');

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.steps)) throw new Error('Format steps invalide');

    const steps = parsed.steps.map((s: Record<string, unknown>, i: number) => ({
      ...s,
      id: `step-${Date.now()}-${i}`,
      num: i + 1,
    }));

    return new Response(
      JSON.stringify({ steps }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('generate-procedure-steps error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
