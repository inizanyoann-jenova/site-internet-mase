const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { questionType, title, sector, processParent } = await req.json();

    const apiKey = Deno.env.get('MISTRAL_API_KEY');
    if (!apiKey) throw new Error('MISTRAL_API_KEY non configuré');

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

    const selectedPrompt = prompts[questionType] ?? prompts.objective;

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: selectedPrompt }],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    const suggestion = data.choices?.[0]?.message?.content ?? '';

    return new Response(
      JSON.stringify({ suggestion }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('ai-suggest-procedure error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
