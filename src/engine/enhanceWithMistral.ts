import { generate } from '../lib/mistral';
import type { CompanyInfo, Indicators, Section, SelectedBlock } from './types';

/**
 * Enrichit les blocs sélectionnés avec Mistral :
 * personnalise le texte en intégrant le contexte réel de l'entreprise.
 * Retourne les blocs dans le même ordre, avec le texte réécrit.
 */
export async function enhanceWithMistral(
  blocks: SelectedBlock[],
  company: CompanyInfo,
  indicators: Indicators,
): Promise<SelectedBlock[]> {
  const sectionsText = blocks
    .map((b, i) => `[${i}|${b.section}]\n${b.text}`)
    .join('\n\n---\n\n');

  const prompt = `Tu es un expert en systèmes de management SSE (Santé, Sécurité, Environnement).

Contexte de l'entreprise :
- Nom : ${company.name}
- Secteur : ${company.sector}
- Effectif : ${company.headcount} personnes
- Activités : ${company.activities}
- Dirigeant : ${company.employerName}
- Maturité SSE (0=faible → 1=excellente) : ${indicators.maturity.toFixed(2)}

Voici les blocs de la politique SSE à personnaliser. Chaque bloc est préfixé par [index|section].

${sectionsText}

Consignes :
- Intègre naturellement le nom de l'entreprise, le secteur et les activités là où c'est pertinent.
- Garde le même ton professionnel et la même structure (listes à tirets si présentes).
- Ne modifie pas les thèmes ni les engagements, améliore seulement la formulation pour qu'elle colle à l'entreprise.
- Réponds UNIQUEMENT avec un tableau JSON valide, un objet par bloc, dans le même ordre :
[
  { "index": 0, "section": "nom_section", "text": "texte personnalisé" },
  ...
]`;

  const raw = await generate(prompt);

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Réponse Mistral invalide — JSON non trouvé');

  const parsed: { index: number; section: string; text: string }[] = JSON.parse(jsonMatch[0]);

  // Recompose dans l'ordre d'origine, avec fallback sur le bloc original si absent
  return blocks.map((original, i) => {
    const enhanced = parsed.find((p) => p.index === i);
    if (!enhanced) return original;
    return { section: enhanced.section as Section, text: enhanced.text };
  });
}
