import type { PhaseStep } from '../../types/modesOperatoires';

const SVG_W = 560;
const PHASE_H = 36;
const STEP_H = 56;
const PAD_X = 16;
const CHECKBOX_SIZE = 16;
const CHECKBOX_X = PAD_X;
const TEXT_X = PAD_X + CHECKBOX_SIZE + 10;

interface PhaseConfig {
  label: string;
  headerFill: string;
  headerText: string;
  rowFill: string;
  accentColor: string;
}

const PHASES: PhaseConfig[] = [
  { label: 'PRÉPARATION',  headerFill: '#dbeafe', headerText: '#1e3a8a', rowFill: '#eff6ff', accentColor: '#2563eb' },
  { label: 'EXÉCUTION',    headerFill: '#fef9c3', headerText: '#713f12', rowFill: '#fefce8', accentColor: '#ca8a04' },
  { label: 'FIN DE TÂCHE', headerFill: '#dcfce7', headerText: '#14532d', rowFill: '#f0fdf4', accentColor: '#16a34a' },
];

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function wrapText(text: string, maxChars = 52): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length <= maxChars) {
      current = (current + ' ' + w).trim();
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function renderStep(step: PhaseStep, y: number, cfg: PhaseConfig): { svg: string; height: number } {
  const lines = wrapText(step.consigne);
  const lineH = 14;
  const blockH = Math.max(STEP_H, 24 + lines.length * lineH + (step.acteur ? 16 : 0));
  const cy = y + blockH / 2 - 4;

  const borderColor = step.critique ? '#dc2626' : '#e5e7eb';
  const borderWidth = step.critique ? 2 : 1;
  const critiqueMark = step.critique ? ` critique` : '';

  let svg = `<rect x="1" y="${y}" width="${SVG_W - 2}" height="${blockH}" fill="${cfg.rowFill}" stroke="${borderColor}" stroke-width="${borderWidth}" class="step${critiqueMark}" rx="4"/>`;

  // Checkbox
  svg += `<rect x="${CHECKBOX_X}" y="${cy - CHECKBOX_SIZE / 2}" width="${CHECKBOX_SIZE}" height="${CHECKBOX_SIZE}" rx="3" fill="white" stroke="${cfg.accentColor}" stroke-width="1.5" class="checkbox"/>`;

  // Step number
  svg += `<text x="${TEXT_X}" y="${y + 18}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="10" fill="${cfg.accentColor}" font-weight="600">${step.ordre}.</text>`;

  // Consigne lines
  lines.forEach((line, i) => {
    svg += `<text x="${TEXT_X + 16}" y="${y + 18 + i * lineH}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" fill="#111827">${escapeXml(line)}</text>`;
  });

  // Acteur
  if (step.acteur) {
    const actY = y + 18 + lines.length * lineH + 2;
    svg += `<text x="${TEXT_X + 16}" y="${actY}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="9" fill="#6b7280" font-style="italic">${escapeXml(step.acteur)}</text>`;
  }

  // Tool
  if (step.outil) {
    const toolX = SVG_W - PAD_X;
    svg += `<text x="${toolX}" y="${y + 18}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="9" fill="#9ca3af" text-anchor="end">${escapeXml(step.outil)}</text>`;
  }

  // Critique badge
  if (step.critique) {
    svg += `<rect x="${SVG_W - 60}" y="${y + 4}" width="52" height="16" rx="8" fill="#fef2f2"/>`;
    svg += `<text x="${SVG_W - 34}" y="${y + 15}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="8" fill="#dc2626" text-anchor="middle" font-weight="700">CRITIQUE</text>`;
  }

  return { svg, height: blockH };
}

function renderPhase(steps: PhaseStep[], yStart: number, cfg: PhaseConfig): { svg: string; height: number } {
  if (steps.length === 0) return { svg: '', height: 0 };

  let svg = '';
  let y = yStart;

  svg += `<rect x="0" y="${y}" width="${SVG_W}" height="${PHASE_H}" fill="${cfg.headerFill}" rx="0"/>`;
  svg += `<text x="${SVG_W / 2}" y="${y + 23}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="12" font-weight="700" fill="${cfg.headerText}" text-anchor="middle" letter-spacing="1">${cfg.label}</text>`;
  y += PHASE_H;

  for (const step of steps) {
    const { svg: stepSvg, height } = renderStep(step, y, cfg);
    svg += stepSvg;
    y += height;
  }

  return { svg, height: y - yStart };
}

export function buildLogiTechnicienSVG(
  preparation: PhaseStep[],
  execution: PhaseStep[],
  finTache: PhaseStep[],
): string {
  const allPhases = [preparation, execution, finTache];
  let y = 0;
  let body = '';

  allPhases.forEach((steps, i) => {
    const { svg, height } = renderPhase(steps, y, PHASES[i]);
    body += svg;
    y += height;
  });

  const totalH = Math.max(y, 60);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_W}" height="${totalH}" viewBox="0 0 ${SVG_W} ${totalH}">${body}</svg>`;
}
