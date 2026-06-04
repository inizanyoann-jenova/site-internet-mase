// Script de démonstration : génère deux politiques DOCX pour valider le contenu.
// Lancement : npx vite-node scripts/genSample.ts
import { writeFileSync } from 'node:fs';
import { Packer } from 'docx';
import { QUESTIONS } from '../src/engine/questionnaire';
import { computeIndicators } from '../src/engine/indicators';
import { BLOCKS, AXIS_TEXTS } from '../src/engine/blocks';
import { selectBlocks } from '../src/engine/selectBlocks';
import { buildPolicyDocument } from '../src/engine/renderDocx';
import type { Answer, CompanyInfo } from '../src/engine/types';

function answersFrom(scores: Record<string, string>): Answer[] {
  return QUESTIONS.map((q) => ({
    questionId: q.id,
    choiceValue: scores[q.id] ?? '1',
  }));
}

async function generate(
  label: string,
  scores: Record<string, string>,
  company: CompanyInfo,
  outPath: string,
) {
  const answers = answersFrom(scores);
  const ind = computeIndicators(answers, QUESTIONS);
  const selected = selectBlocks(ind, BLOCKS, AXIS_TEXTS);
  const doc = buildPolicyDocument(selected, company);
  const buf = await Packer.toBuffer(doc);
  writeFileSync(outPath, buf);
  console.log(
    `${label}: maturité=${ind.maturity.toFixed(2)} ton=${ind.tone} ` +
      `axes=${ind.priorities.length} → ${outPath}`,
  );
}

// Profil A — PME en structuration (beaucoup de faiblesses).
const profilA: Record<string, string> = {
  swot_direction: '1',
  swot_equipements: '1',
  swot_formation: '0',
  swot_sante: '1',
  swot_demarche: '1',
  swot_environnement: '1',
  swot_soustraitance: '1',
  swot_interim: '0',
  pestel_veille: '0',
  pestel_politique: '0',
  pestel_budget: '1',
  pestel_investissement: '1',
  pestel_culture: '1',
  pestel_qvt: '1',
  pestel_outils: '1',
  pestel_techenv: '1',
  pestel_dechets: '0',
  pestel_conformite_env: '1',
  pestel_duer: '0',
  pestel_contrats_st: '1',
};

// Profil B — entreprise mature (tout maîtrisé).
const profilB: Record<string, string> = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, '3']),
);

await generate('Profil A (structuration)', profilA, {
  name: 'Constructo BTP',
  sector: 'travaux publics',
  headcount: '38 salariés',
  activities: 'terrassement, voirie et réseaux divers',
  employerName: 'M. Jean Martin, Gérant',
}, 'C:/tmp/Politique-SSE-profilA-structuration.docx');

await generate('Profil B (mature)', profilB, {
  name: 'IndusTech Industries',
  sector: 'maintenance industrielle',
  headcount: '210 salariés',
  activities: 'maintenance et arrêts de sites industriels',
  employerName: 'Mme Claire Dubois, Directrice Générale',
}, 'C:/tmp/Politique-SSE-profilB-mature.docx');
