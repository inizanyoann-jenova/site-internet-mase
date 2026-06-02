import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import type { CompanyInfo, Section, SelectedBlock } from './types';

/** Titre affiché dans le document pour chaque section. */
const SECTION_TITLES: Record<Section, string> = {
  preambule: 'Préambule',
  principes: 'Nos principes essentiels en matière de SSE',
  engagement_securite: 'Nos engagements — Sécurité',
  engagement_sante: 'Nos engagements — Santé',
  engagement_environnement: 'Nos engagements — Environnement',
  axes_prioritaires: 'Nos axes prioritaires',
  amelioration_continue: "Notre démarche d'amélioration continue",
  diffusion: 'Diffusion de la politique',
};

/** Remplace les variables {{champ}} par les informations entreprise. */
function fillVariables(text: string, company: CompanyInfo): string {
  const map: Record<string, string> = {
    name: company.name,
    sector: company.sector,
    headcount: company.headcount,
    activities: company.activities,
    employerName: company.employerName,
  };
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    key in map ? map[key] : `{{${key}}}`,
  );
}

/**
 * Convertit le texte d'un bloc en paragraphes Word.
 * Chaque ligne est un paragraphe ; une ligne « - … » devient une puce.
 */
function blockToParagraphs(text: string, company: CompanyInfo): Paragraph[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const isBullet = line.startsWith('- ');
      const content = isBullet ? line.slice(2) : line;
      return new Paragraph({
        children: [new TextRun(fillVariables(content, company))],
        bullet: isBullet ? { level: 0 } : undefined,
        spacing: { after: 120 },
      });
    });
}

/** Assemble les blocs sélectionnés et les infos entreprise en un document Word. */
export function buildPolicyDocument(
  blocks: SelectedBlock[],
  company: CompanyInfo,
): Document {
  const body: Paragraph[] = [];

  // En-tête : titre, entreprise, emplacement logo.
  body.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'POLITIQUE SANTÉ, SÉCURITÉ ET ENVIRONNEMENT',
          bold: true,
          size: 32,
        }),
      ],
      spacing: { after: 160 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: company.name, bold: true, size: 26 })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "[Emplacement réservé au logo de l'entreprise]",
          italics: true,
          color: '888888',
        }),
      ],
      spacing: { after: 320 },
    }),
  );

  // Corps : un titre par section, suivi de ses blocs.
  let currentSection: Section | null = null;
  for (const block of blocks) {
    if (block.section !== currentSection) {
      currentSection = block.section;
      body.push(
        new Paragraph({
          text: SECTION_TITLES[block.section],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        }),
      );
    }
    body.push(...blockToParagraphs(block.text, company));
  }

  // Pied : date et signature de l'employeur [1.2.2].
  body.push(
    new Paragraph({
      children: [
        new TextRun('Fait à ……………………………, le ……………………………'),
      ],
      spacing: { before: 480, after: 240 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${company.employerName}`,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Pour la direction de l'entreprise — (signature)",
          italics: true,
        }),
      ],
    }),
  );

  return new Document({
    sections: [{ children: body }],
  });
}

/** Génère le DOCX et déclenche son téléchargement dans le navigateur. */
export async function downloadPolicyDocx(
  blocks: SelectedBlock[],
  company: CompanyInfo,
  filename = 'Politique-SSE.docx',
): Promise<void> {
  const doc = buildPolicyDocument(blocks, company);
  const blob = await Packer.toBlob(doc);
  const { saveAs } = await import('file-saver');
  saveAs(blob, filename);
}
