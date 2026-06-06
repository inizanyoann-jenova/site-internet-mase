const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { questionType, operationType, title } = await req.json();

    const apiKey = Deno.env.get('MISTRAL_API_KEY');
    if (!apiKey) throw new Error('MISTRAL_API_KEY non configuré');

    const opLabel: Record<string, string> = {
      consignation: 'Consignation/Déconsignation',
      hauteur: 'Travaux en hauteur',
      confine: 'Espace confiné',
      'permis-feu': 'Permis de feu',
      'electrique-ht': 'Travaux électriques HT',
      levage: 'Levage/Manutention',
      chimique: 'Produits chimiques',
      vrd: 'Travaux VRD',
    };

    const opName = opLabel[operationType] ?? operationType;

    const prompts: Record<string, string> = {
      sse: `En tant qu'expert MASE V2024 spécialisé en sécurité des chantiers, génère les consignes SSE pour le mode opératoire suivant.
Type d'opération : ${opName} | Titre : "${title}"
Retourne UNIQUEMENT un JSON valide avec cette structure :
{"risques":["...","..."],"reglesSecurite":["...","..."],"consignesEnv":["..."],"permisRequis":[]}
Génère 3-4 risques réels, 3-4 règles de sécurité essentielles, 1-2 consignes environnementales.`,

      epi: `En tant qu'expert MASE V2024, génère la liste des EPI requis pour ce mode opératoire.
Type d'opération : ${opName} | Titre : "${title}"
Retourne UNIQUEMENT un JSON valide : [{"designation":"...","norme":"...","obligatoire":true},...]
Génère 5-8 EPI pertinents avec normes EN si connues.`,

      urgences: `En tant qu'expert MASE V2024, génère les scénarios d'urgence pour ce mode opératoire.
Type d'opération : ${opName} | Titre : "${title}"
Retourne UNIQUEMENT un JSON valide : [{"scenario":"...","conduite":"1. ...\n2. ..."},...]
Génère 2-3 scénarios réalistes avec conduite à tenir numérotée.`,
    };

    const selectedPrompt = prompts[questionType] ?? prompts.sse;

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: selectedPrompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    const suggestion = data.choices?.[0]?.message?.content ?? '';

    return new Response(
      JSON.stringify({ suggestion }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('ai-suggest-mo error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
