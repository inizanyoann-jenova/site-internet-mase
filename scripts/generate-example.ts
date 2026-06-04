/**
 * Script de génération d'exemples DOCX.
 * Produit deux fichiers dans output/ : profil "structuration" et profil "mature".
 *
 * Usage : npm run generate
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { Packer } from 'docx';
import { BLOCKS, AXIS_TEXTS } from '../src/engine/blocks';
import { computeIndicators } from '../src/engine/indicators';
import { QUESTIONS } from '../src/engine/questionnaire';
import { buildPolicyDocument } from '../src/engine/renderDocx';
import { selectBlocks } from '../src/engine/selectBlocks';
import type { Answer, CompanyInfo } from '../src/engine/types';

// ─── Scénarios ────────────────────────────────────────────────────────────────

const scenarios: Array<{
  label: string;
  scoreIndex: number; // index du choix dans choices[] (0..3)
  company: CompanyInfo;
}> = [
  {
    label: 'structuration',
    scoreIndex: 1, // score=1 partout — entreprise qui démarre
    company: {
      name: 'BTP Dupont & Fils',
      sector: 'BTP — Travaux publics',
      headcount: '45 salariés',
      activities: 'travaux de terrassement, de voirie et de réseaux divers',
      employerName: 'Jean Dupont',
    },
  },
  {
    label: 'mature',
    scoreIndex: 3, // score=3 partout — entreprise avancée
    company: {
      name: 'Industrie Modèle SA',
      sector: 'Industrie chimique',
      headcount: '320 salariés',
      activities: 'fabrication et conditionnement de produits chimiques industriels',
      employerName: 'Marie Martin',
    },
  },
];

// ─── Génération ───────────────────────────────────────────────────────────────

mkdirSync('output', { recursive: true });

for (const { label, scoreIndex, company } of scenarios) {
  const answers: Answer[] = QUESTIONS.map((q) => ({
    questionId: q.id,
    choiceValue: q.choices[scoreIndex].value,
  }));

  const indicators = computeIndicators(answers, QUESTIONS);
  const blocks = selectBlocks(indicators, BLOCKS, AXIS_TEXTS);
  const doc = buildPolicyDocument(blocks, company);
  const buffer = await Packer.toBuffer(doc);

  const path = `output/politique-sse-${label}.docx`;
  writeFileSync(path, buffer);

  console.log(
    `✓ ${path}` +
    ` | maturité: ${(indicators.maturity * 100).toFixed(0)}%` +
    ` | ton: ${indicators.tone}` +
    ` | blocs: ${blocks.length}` +
    ` | axes prioritaires: ${indicators.priorities.length}`,
  );
}
