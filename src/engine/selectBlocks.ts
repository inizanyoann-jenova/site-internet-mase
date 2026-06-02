import type { Block, Indicators, Section, SelectedBlock, Theme } from './types';

/** Ordre canonique des sections dans le document. */
export const SECTION_ORDER: Section[] = [
  'preambule',
  'principes',
  'engagement_securite',
  'engagement_sante',
  'engagement_environnement',
  'axes_prioritaires',
  'amelioration_continue',
  'diffusion',
];

/**
 * Sélectionne et ordonne les blocs à rendre.
 * Fonction pure.
 *
 * - Blocs statiques : retenus si `tone` correspond (ou absent) et `condition`
 *   passe (ou absente), puis ordonnés par section.
 * - Section `axes_prioritaires` : génère un bloc par axe prioritaire (dans
 *   l'ordre des priorités) pour les thèmes disposant d'un texte dans `axisTexts`.
 */
export function selectBlocks(
  ind: Indicators,
  blocks: Block[],
  axisTexts: Partial<Record<Theme, string>>,
): SelectedBlock[] {
  const result: SelectedBlock[] = [];

  for (const section of SECTION_ORDER) {
    // Blocs statiques de la section qui matchent.
    for (const block of blocks) {
      if (block.section !== section) continue;
      if (block.tone && block.tone !== ind.tone) continue;
      if (block.condition && !block.condition(ind)) continue;
      result.push({ section, text: block.text });
    }

    // Génération des axes prioritaires.
    if (section === 'axes_prioritaires') {
      for (const p of ind.priorities) {
        const text = axisTexts[p.theme];
        if (text) result.push({ section, text });
      }
    }
  }

  return result;
}
