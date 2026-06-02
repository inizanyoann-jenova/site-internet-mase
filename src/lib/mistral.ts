import { Mistral } from '@mistralai/mistralai';

// Modèle utilisé par défaut — changer ici pour switcher facilement
export const MISTRAL_MODEL = 'mistral-small-latest';

// Les modèles disponibles pour référence :
// 'mistral-small-latest'   → rapide, économique  (questions, petits fichiers)
// 'mistral-medium-latest'  → équilibre qualité/coût
// 'mistral-large-latest'   → meilleure qualité

function getClient(): Mistral {
  const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_MISTRAL_API_KEY manquante dans .env.local');
  }
  return new Mistral({ apiKey });
}

/**
 * Appel générique au chat Mistral.
 * @param prompt  Le prompt utilisateur
 * @param system  Prompt système optionnel
 * @param model   Modèle à utiliser (défaut : MISTRAL_MODEL)
 */
export async function generate(
  prompt: string,
  system?: string,
  model: string = MISTRAL_MODEL
): Promise<string> {
  const client = getClient();

  const messages: { role: 'system' | 'user'; content: string }[] = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const response = await client.chat.complete({ model, messages });

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error('Réponse Mistral vide');
  return typeof content === 'string' ? content : JSON.stringify(content);
}
