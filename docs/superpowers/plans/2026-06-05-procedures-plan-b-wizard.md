# Procédures MASE — Plan B : Wizard & Logigramme

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prérequis :** Plan A terminé (types, migration, hook, Edge Functions, routes stub).

**Goal:** Implémenter le wizard 7 étapes complet avec le moteur SVG logigramme temps réel, le builder d'étapes, l'écran liste, et l'intégration IA.

**Architecture:** Moteur SVG pur (`buildLogiSVG.ts`) → composant preview React → builder `StepFormRow` → 7 composants wizard → orchestrateur `ProcedureWizard` → liste `ProcedureList` → page `ProceduresWizardPage` mise à jour.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Vitest, @testing-library/react

---

## Fichiers créés / modifiés

| Fichier | Action | Rôle |
|---------|--------|------|
| `src/engine/procedures/buildLogiSVG.ts` | Créer | Fonction pure SVG : StepDefinition[] → SVG string |
| `src/engine/procedures/buildLogiSVG.test.ts` | Créer | Tests moteur SVG |
| `src/components/procedures/shared/LogigrammePreview.tsx` | Créer | Preview SVG temps réel |
| `src/components/procedures/shared/StepFormRow.tsx` | Créer | Ligne de formulaire pour une étape |
| `src/components/procedures/wizard/ProcedureWizard.tsx` | Créer | Orchestrateur wizard + state global |
| `src/components/procedures/wizard/Step1General.tsx` | Créer | Infos générales + modèles |
| `src/components/procedures/wizard/Step2Context.tsx` | Créer | Contexte, objectif, docs, KPI |
| `src/components/procedures/wizard/Step3Steps.tsx` | Créer | Builder + preview split screen |
| `src/components/procedures/wizard/Step4Risks.tsx` | Créer | Risques avec niveaux |
| `src/components/procedures/wizard/Step5Approval.tsx` | Créer | Approbateurs + révisions |
| `src/components/procedures/wizard/Step6Preview.tsx` | Créer | Aperçu document ISO + logigramme |
| `src/components/procedures/list/ProcedureList.tsx` | Créer | Tableau de bord des procédures |
| `src/pages/ProceduresWizardPage.tsx` | Modifier | Remplacer stub par la vraie page |

---

## Task 1 : Moteur SVG `buildLogiSVG`

Port direct de la fonction `buildLogiSVG` de `ProcedureV8_DEF_OI_v2.html`.

**Fichiers :**
- Créer : `src/engine/procedures/buildLogiSVG.ts`
- Créer : `src/engine/procedures/buildLogiSVG.test.ts`

- [ ] **Écrire les tests du moteur SVG**

```typescript
// src/engine/procedures/buildLogiSVG.test.ts
import { describe, it, expect } from 'vitest';
import { buildLogiSVG } from './buildLogiSVG';
import type { StepDefinition } from '../../types/procedures';

const baseStep = (overrides: Partial<StepDefinition> = {}): StepDefinition => ({
  id: 'step-1', type: 'activite', num: 1,
  activite: 'Identifier le besoin', acteur: 'Responsable QHSE',
  routeTypeAct: 'next', routeSideAct: 'auto', ...overrides,
});

describe('buildLogiSVG', () => {
  it('retourne svgStr et legendHtml', () => {
    const { svgStr, legendHtml } = buildLogiSVG([baseStep()], false);
    expect(typeof svgStr).toBe('string');
    expect(typeof legendHtml).toBe('string');
  });

  it('SVG contient DÉBUT et FIN', () => {
    const { svgStr } = buildLogiSVG([baseStep()], false);
    expect(svgStr).toContain('DÉBUT');
    expect(svgStr).toContain('FIN');
  });

  it('activité génère un rect dans le SVG', () => {
    const { svgStr } = buildLogiSVG([baseStep()], false);
    expect(svgStr).toContain('<rect');
    expect(svgStr).toContain('Identifier le besoin');
  });

  it('décision génère un polygon (losange)', () => {
    const step = baseStep({ type: 'decision', activite: 'Seuil dépassé ?', ouiLabel: 'OUI', nonLabel: 'NON', routeTypeOui: 'next', routeTypeNon: 'end' });
    const { svgStr } = buildLogiSVG([step], false);
    expect(svgStr).toContain('<polygon');
    expect(svgStr).toContain('Seuil dépassé ?');
  });

  it('légende contient le nom de l\'acteur', () => {
    const { legendHtml } = buildLogiSVG([baseStep()], false);
    expect(legendHtml).toContain('Responsable QHSE');
  });

  it('ne plante pas avec tableau vide', () => {
    const { svgStr } = buildLogiSVG([], false);
    expect(svgStr).toBe('');
  });

  it('mode couloirs génère des swim lanes', () => {
    const steps = [
      baseStep({ id: 's1', acteur: 'Acteur A' }),
      baseStep({ id: 's2', num: 2, acteur: 'Acteur B', activite: 'Deuxième étape' }),
    ];
    const { svgStr } = buildLogiSVG(steps, true);
    expect(svgStr).toContain('Acteur A');
    expect(svgStr).toContain('Acteur B');
  });
});
```

- [ ] **Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run src/engine/procedures/buildLogiSVG.test.ts
```
Attendu : FAIL — `Cannot find module './buildLogiSVG'`

- [ ] **Créer `src/engine/procedures/buildLogiSVG.ts`**

```typescript
// src/engine/procedures/buildLogiSVG.ts
import type { StepDefinition, RouteSide } from '../../types/procedures';

export interface LogiSizes {
  boxW: number;
  boxH: number;
  dHW: number;
  dHH: number;
}

export const DEFAULT_LOGI_SIZES: LogiSizes = { boxW: 380, boxH: 76, dHW: 165, dHH: 44 };

const ACTOR_COLORS = [
  { fill: '#dbeafe', stroke: '#2563eb', text: '#1e3a8a' },
  { fill: '#d1fae5', stroke: '#059669', text: '#064e3b' },
  { fill: '#fce7f3', stroke: '#db2777', text: '#831843' },
  { fill: '#ede9fe', stroke: '#7c3aed', text: '#4c1d95' },
  { fill: '#ffedd5', stroke: '#ea580c', text: '#7c2d12' },
  { fill: '#cffafe', stroke: '#0891b2', text: '#164e63' },
  { fill: '#fef9c3', stroke: '#ca8a04', text: '#713f12' },
  { fill: '#f0fdf4', stroke: '#16a34a', text: '#14532d' },
];

const LINE_COLORS = { gray: '#475569', green: '#059669', red: '#dc2626' };

interface ComputedStep extends StepDefinition {
  _cx: number; _h: number;
  _y_top: number; _y_center: number; _y_bottom: number;
  _non_cx?: number;
  _non_y_top?: number; _non_y_center?: number; _non_y_bottom?: number;
}

function wrapText(text: string, maxChars: number): string[] {
  if (!text) return [''];
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  words.forEach((w) => {
    if ((cur + ' ' + w).trim().length <= maxChars) cur = (cur + ' ' + w).trim();
    else { if (cur) lines.push(cur); cur = w; }
  });
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

function esc(str: string | undefined): string {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildLogiSVG(
  steps: StepDefinition[],
  isSwim: boolean,
  sizes: LogiSizes = DEFAULT_LOGI_SIZES,
): { svgStr: string; legendHtml: string } {
  if (!steps || steps.length === 0) return { svgStr: '', legendHtml: '' };

  const { boxW, boxH, dHW, dHH } = sizes;
  const actors = [...new Set(steps.map((s) => s.acteur))].filter(Boolean);
  steps.forEach((s) => {
    if (s.type === 'decision' && s.nonAction && s.nonActor && !actors.includes(s.nonActor)) actors.push(s.nonActor);
  });
  if (actors.length === 0) actors.push('Général');

  const colorMap: Record<string, typeof ACTOR_COLORS[0]> = {};
  actors.forEach((a, i) => { colorMap[a] = ACTOR_COLORS[i % ACTOR_COLORS.length]; });

  const padTop = 80, padLeft = 40, LANE_W = 280, GAP = 55;
  const BOX_H = boxH, D_HH = dHH;
  const BOX_W = isSwim ? Math.round(boxW * 0.6) : boxW;
  const D_HW = isSwim ? Math.round(dHW * 0.7) : dHW;
  const W = isSwim ? Math.max(820, padLeft + actors.length * LANE_W + 60) : 860;
  const RAIL_R = W - 40, RAIL_L = 40;

  let y = padTop + 40 + GAP;
  const computed: ComputedStep[] = steps.map((s) => ({ ...s } as ComputedStep));

  computed.forEach((s) => {
    let aIdx = actors.indexOf(s.acteur); if (aIdx < 0) aIdx = 0;
    s._cx = isSwim ? padLeft + aIdx * LANE_W + LANE_W / 2 : W / 2;
    s._h = s.type === 'decision' ? D_HH * 2 : BOX_H;
    s._y_top = y; s._y_center = y + s._h / 2; s._y_bottom = y + s._h;
    y += s._h + GAP;

    if (s.type === 'decision' && s.nonAction) {
      let sideNon: RouteSide = s.routeSideNon ?? 'auto'; if (sideNon === 'auto') sideNon = 'right';
      let nonAIdx = actors.indexOf(s.nonActor ?? ''); if (nonAIdx < 0) nonAIdx = 0;
      const nBw = isSwim ? BOX_W : 200;
      if (isSwim) { s._non_cx = padLeft + nonAIdx * LANE_W + LANE_W / 2; }
      else {
        if (sideNon === 'left') s._non_cx = RAIL_L + nBw / 2 + 20;
        else if (sideNon === 'bottom') s._non_cx = s._cx;
        else s._non_cx = RAIL_R - nBw / 2 - 20;
      }
      s._non_y_top = y; s._non_y_center = y + BOX_H / 2; s._non_y_bottom = y + BOX_H;
      y += BOX_H + GAP;
    }
  });

  const endCy = y, endCx = W / 2, totalH = endCy + 80;

  const getTarget = (routeType: string | undefined, routeNum: string | undefined, currentIndex: number) => {
    if (routeType === 'end') return { isEnd: true, y_top: endCy - 20, y_center: endCy, x_right: endCx + 60, x_left: endCx - 60, cx: endCx };
    let tIdx = routeType === 'goto' ? parseInt(routeNum ?? '0') - 1 : currentIndex + 1;
    if (tIdx >= 0 && tIdx < computed.length) {
      const ts = computed[tIdx];
      const hw = ts.type === 'decision' ? D_HW : BOX_W / 2;
      return { isEnd: false, idx: tIdx, y_top: ts._y_top, y_center: ts._y_center, x_right: ts._cx + hw, x_left: ts._cx - hw, cx: ts._cx };
    }
    return { isEnd: true, y_top: endCy - 20, y_center: endCy, x_right: endCx + 60, x_left: endCx - 60, cx: endCx };
  };

  type Target = ReturnType<typeof getTarget>;

  const getLinkSVG = (fromNode: ComputedStep, routeType: string | undefined, routeNum: string | undefined, currentIndex: number, colorKey: 'gray' | 'green' | 'red', label: string, isNonBranch: boolean): string => {
    const t = getTarget(routeType, routeNum, currentIndex);
    const color = LINE_COLORS[colorKey];
    let path = '';

    let prefSide: RouteSide = 'auto';
    if (isNonBranch) prefSide = fromNode.routeSideNon ?? 'auto';
    else if (fromNode.type === 'decision') prefSide = fromNode.routeSideOui ?? 'auto';
    else prefSide = fromNode.routeSideAct ?? 'auto';

    let side: RouteSide = prefSide;
    if (!side || side === 'auto') {
      if (isNonBranch) side = ((t as { idx?: number }).idx !== undefined && (t as { idx: number }).idx < currentIndex) ? 'left' : 'right';
      else {
        const tWithIdx = t as { idx?: number; isEnd: boolean };
        const isStraight = tWithIdx.idx === currentIndex + 1 || (tWithIdx.isEnd && currentIndex === computed.length - 1);
        side = isStraight ? 'bottom' : 'right';
      }
    }

    const hw = fromNode.type === 'decision' ? D_HW : BOX_W / 2;
    let startX: number, startY: number;
    if (side === 'left') { startX = fromNode._cx - hw; startY = fromNode._y_center; }
    else if (side === 'right') { startX = fromNode._cx + hw; startY = fromNode._y_center; }
    else { startX = fromNode._cx; startY = fromNode._y_bottom; }

    if (isNonBranch && fromNode.nonAction && fromNode._non_cx !== undefined && fromNode._non_y_top !== undefined) {
      const boxTopX = fromNode._non_cx, boxTopY = fromNode._non_y_top;
      if (side === 'left') {
        path += `<polyline points="${startX},${startY} ${boxTopX},${startY} ${boxTopX},${boxTopY - 6}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="5,3" marker-end="url(#arr-${colorKey})"/>`;
        if (label) path += `<text x="${startX - 10}" y="${startY - 5}" text-anchor="end" fill="${color}" font-size="10.5" font-weight="700">${esc(label)}</text>`;
      } else {
        path += `<polyline points="${startX},${startY} ${boxTopX},${startY} ${boxTopX},${boxTopY - 6}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="5,3" marker-end="url(#arr-${colorKey})"/>`;
        if (label) path += `<text x="${startX + 6}" y="${startY - 5}" fill="${color}" font-size="10.5" font-weight="700">${esc(label)}</text>`;
      }
      if (fromNode._non_y_bottom !== undefined && fromNode._non_cx !== undefined) {
        const outX = fromNode._non_cx, outY = fromNode._non_y_bottom;
        const targetEnterX = outX < t.cx ? t.x_left - 6 : (outX > t.cx ? t.x_right + 6 : t.cx);
        if (outX === t.cx) {
          path += `<line x1="${outX}" y1="${outY}" x2="${t.cx}" y2="${t.y_top - 6}" stroke="${color}" stroke-width="2" stroke-dasharray="5,3" marker-end="url(#arr-${colorKey})"/>`;
        } else {
          path += `<polyline points="${outX},${outY} ${outX},${t.y_center} ${targetEnterX},${t.y_center}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="5,3" marker-end="url(#arr-${colorKey})"/>`;
        }
      }
      return path;
    }

    if (side === 'bottom') {
      const toX = t.cx, toY = t.y_top - 6;
      if (startX === toX) {
        path += `<line x1="${startX}" y1="${startY}" x2="${toX}" y2="${toY}" stroke="${color}" stroke-width="2" marker-end="url(#arr-${colorKey})"/>`;
        if (label) path += `<text x="${startX + 8}" y="${startY + (toY - startY) / 2}" fill="${color}" font-size="10.5" font-weight="700">${esc(label)}</text>`;
      } else {
        const midY = startY + (toY - startY) / 2;
        path += `<polyline points="${startX},${startY} ${startX},${midY} ${toX},${midY} ${toX},${toY}" fill="none" stroke="${color}" stroke-width="2" marker-end="url(#arr-${colorKey})"/>`;
        if (label) path += `<text x="${startX + 8}" y="${startY + 15}" fill="${color}" font-size="10.5" font-weight="700">${esc(label)}</text>`;
      }
    } else if (side === 'right') {
      const rx = RAIL_R - (currentIndex % 4) * 6;
      path += `<polyline points="${startX},${startY} ${rx},${startY} ${rx},${t.y_center} ${t.x_right + 6},${t.y_center}" fill="none" stroke="${color}" stroke-width="2" marker-end="url(#arr-${colorKey})"/>`;
      if (label) path += `<text x="${startX + 6}" y="${startY - 5}" fill="${color}" font-size="10.5" font-weight="700">${esc(label)}</text>`;
    } else if (side === 'left') {
      const lx = RAIL_L + (currentIndex % 4) * 6;
      path += `<polyline points="${startX},${startY} ${lx},${startY} ${lx},${t.y_center} ${t.x_left - 6},${t.y_center}" fill="none" stroke="${color}" stroke-width="2" marker-end="url(#arr-${colorKey})"/>`;
      if (label) path += `<text x="${startX - 10}" y="${startY - 5}" text-anchor="end" fill="${color}" font-size="10.5" font-weight="700">${esc(label)}</text>`;
    }
    return path;
  };

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${totalH}" style="font-family:'DM Sans',system-ui,sans-serif;background:white;border-radius:8px;">
  <defs>
    <filter id="sh"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.1"/></filter>
    <marker id="arr-gray" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,1 L0,7 L8,4 z" fill="${LINE_COLORS.gray}"/></marker>
    <marker id="arr-green" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,1 L0,7 L8,4 z" fill="${LINE_COLORS.green}"/></marker>
    <marker id="arr-red" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,1 L0,7 L8,4 z" fill="${LINE_COLORS.red}"/></marker>
  </defs>`;

  if (isSwim) {
    actors.forEach((act, i) => {
      const c = colorMap[act], lx = padLeft + i * LANE_W;
      svg += `<rect x="${lx}" y="${padTop}" width="${LANE_W}" height="${totalH - padTop - 20}" fill="${i % 2 === 0 ? '#f8fafc' : '#f1f5f9'}" stroke="${c?.stroke ?? '#ccc'}" stroke-width="0.5" opacity="0.6"/>`;
      svg += `<rect x="${lx + 15}" y="${padTop - 30}" width="${LANE_W - 30}" height="40" rx="8" fill="${c?.fill ?? '#fff'}" stroke="${c?.stroke ?? '#ccc'}" stroke-width="1.5"/>`;
      svg += `<text x="${lx + LANE_W / 2}" y="${padTop - 5}" text-anchor="middle" font-size="12" font-weight="700" fill="${c?.text ?? '#000'}">${esc(act)}</text>`;
    });
  }

  svg += `<ellipse cx="${endCx}" cy="${padTop / 2}" rx="56" ry="20" fill="#0d2240" filter="url(#sh)"/><text x="${endCx}" y="${padTop / 2 + 5}" text-anchor="middle" font-size="12" font-weight="700" fill="white" letter-spacing="1">DÉBUT</text>`;
  svg += `<ellipse cx="${endCx}" cy="${endCy}" rx="56" ry="20" fill="#0e8a7a" filter="url(#sh)"/><text x="${endCx}" y="${endCy + 5}" text-anchor="middle" font-size="12" font-weight="700" fill="white" letter-spacing="1">FIN</text>`;
  svg += `<line x1="${endCx}" y1="${padTop / 2 + 20}" x2="${computed[0]._cx}" y2="${computed[0]._y_top - 6}" stroke="${LINE_COLORS.gray}" stroke-width="2" marker-end="url(#arr-gray)"/>`;

  computed.forEach((step, i) => {
    if (step.type === 'activite') svg += getLinkSVG(step, step.routeTypeAct, step.routeNumAct, i, 'gray', '', false);
    else {
      svg += getLinkSVG(step, step.routeTypeOui, step.routeNumOui, i, 'green', step.ouiLabel ?? 'OUI', false);
      svg += getLinkSVG(step, step.routeTypeNon, step.routeNumNon, i, 'red', step.nonLabel ?? 'NON', true);
    }
  });

  computed.forEach((step) => {
    const c = colorMap[step.acteur] ?? { fill: '#f8fafc', stroke: '#94a3b8', text: '#1e293b' };
    const maxChars = isSwim ? 22 : 44;

    if (step.type === 'decision') {
      const pts = `${step._cx},${step._y_top} ${step._cx + D_HW},${step._y_center} ${step._cx},${step._y_bottom} ${step._cx - D_HW},${step._y_center}`;
      svg += `<polygon points="${pts}" fill="#fef3c7" stroke="#d97706" stroke-width="2" filter="url(#sh)"/>`;
      wrapText(step.activite, isSwim ? 20 : 34).slice(0, 3).forEach((line, li, arr) => {
        const ty = step._y_center - ((arr.length - 1) * 14) / 2 + li * 14;
        svg += `<text x="${step._cx}" y="${ty + 4}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#78350f">${esc(line)}</text>`;
      });

      if (step.nonAction && step._non_cx !== undefined && step._non_y_top !== undefined) {
        const nC = colorMap[step.nonActor ?? ''] ?? { fill: '#fef2f2', stroke: '#dc2626', text: '#b91c1c' };
        const nBw = isSwim ? BOX_W : 200;
        const nBx = step._non_cx - nBw / 2;
        svg += `<rect x="${nBx}" y="${step._non_y_top}" width="${nBw}" height="${BOX_H}" rx="8" fill="${nC.fill}" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4,2" filter="url(#sh)"/>`;
        wrapText(step.nonAction, isSwim ? 22 : 24).slice(0, 3).forEach((line, li, arr) => {
          const ty = (step._non_y_center ?? 0) - ((arr.length - 1) * 15) / 2 - 5 + li * 15;
          svg += `<text x="${step._non_cx}" y="${ty + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="${nC.text}">${esc(line)}</text>`;
        });
        svg += `<text x="${step._non_cx}" y="${(step._non_y_bottom ?? 0) - 8}" text-anchor="middle" font-size="9.5" fill="#dc2626" font-weight="700">⚠️ ${esc(step.nonActor ?? step.acteur)}</text>`;
      }
    } else {
      const bx = step._cx - BOX_W / 2;
      svg += `<rect x="${bx}" y="${step._y_top}" width="${BOX_W}" height="${BOX_H}" rx="8" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.5" filter="url(#sh)"/>`;
      svg += `<circle cx="${bx + 24}" cy="${step._y_center}" r="14" fill="${c.stroke}"/><text x="${bx + 24}" y="${step._y_center + 4}" text-anchor="middle" font-size="11.5" font-weight="700" fill="white">${step.num}</text>`;
      wrapText(step.activite, maxChars).slice(0, 3).forEach((line, li, arr) => {
        const ty = step._y_center - ((arr.length - 1) * 15) / 2 - 5 + li * 15;
        svg += `<text x="${bx + 48}" y="${ty + 4}" font-size="12" font-weight="600" fill="${c.text}">${esc(line)}</text>`;
      });
      if (!isSwim) svg += `<text x="${bx + BOX_W - 10}" y="${step._y_bottom - 8}" text-anchor="end" font-size="9.5" fill="${c.stroke}" font-weight="700">${esc(step.acteur)}</text>`;
      if (step.outil) svg += `<text x="${bx + 48}" y="${step._y_bottom - 8}" font-size="9" fill="#64748b">⚙ ${esc(step.outil.slice(0, 30))}</text>`;
    }
  });

  svg += `</svg>`;

  let legendHtml = actors
    .map((a) => `<div style="display:flex;align-items:center;gap:6px;font-size:11px;"><div style="width:11px;height:11px;border-radius:50%;background:${colorMap[a]?.fill ?? '#ccc'};border:2px solid ${colorMap[a]?.stroke ?? '#999'};flex-shrink:0;"></div>${esc(a)}</div>`)
    .join('');
  if (computed.some((s) => s.type === 'decision')) {
    legendHtml += `<div style="display:flex;align-items:center;gap:6px;font-size:11px;"><div style="width:12px;height:12px;background:#fef3c7;border:2px solid #d97706;transform:rotate(45deg);flex-shrink:0;"></div>Décision (OUI/NON)</div>`;
  }

  return { svgStr: svg, legendHtml };
}
```

- [ ] **Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run src/engine/procedures/buildLogiSVG.test.ts
```
Attendu : PASS — 7 tests passent

- [ ] **Committer**

```bash
git add src/engine/procedures/buildLogiSVG.ts src/engine/procedures/buildLogiSVG.test.ts
git commit -m "feat(procedures): moteur SVG buildLogiSVG (port ProcedureV8 → TypeScript pur)"
```

---

## Task 2 : Composant `LogigrammePreview`

**Fichiers :**
- Créer : `src/components/procedures/shared/LogigrammePreview.tsx`
- Créer : `src/components/procedures/shared/LogigrammePreview.test.tsx`

- [ ] **Écrire le test**

```typescript
// src/components/procedures/shared/LogigrammePreview.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LogigrammePreview from './LogigrammePreview';
import type { StepDefinition } from '../../../types/procedures';

const step: StepDefinition = {
  id: 's1', type: 'activite', num: 1,
  activite: 'Identifier le besoin', acteur: 'QHSE',
  routeTypeAct: 'end', routeSideAct: 'auto',
};

describe('LogigrammePreview', () => {
  it('affiche le conteneur SVG avec les étapes', () => {
    const { container } = render(<LogigrammePreview steps={[step]} isSwim={false} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('affiche un message vide si aucune étape', () => {
    render(<LogigrammePreview steps={[]} isSwim={false} />);
    expect(screen.getByText(/ajoutez des étapes/i)).toBeTruthy();
  });

  it('affiche la légende', () => {
    render(<LogigrammePreview steps={[step]} isSwim={false} />);
    expect(screen.getByText('QHSE')).toBeTruthy();
  });
});
```

- [ ] **Lancer le test pour vérifier qu'il échoue**

```bash
npx vitest run src/components/procedures/shared/LogigrammePreview.test.tsx
```

- [ ] **Créer `src/components/procedures/shared/LogigrammePreview.tsx`**

```typescript
// src/components/procedures/shared/LogigrammePreview.tsx
import { useMemo, useState } from 'react';
import type { StepDefinition } from '../../../types/procedures';
import { buildLogiSVG, DEFAULT_LOGI_SIZES, type LogiSizes } from '../../../engine/procedures/buildLogiSVG';

interface Props {
  steps: StepDefinition[];
  isSwim: boolean;
  sizes?: LogiSizes;
  showSizeControls?: boolean;
}

export default function LogigrammePreview({ steps, isSwim, sizes: externalSizes, showSizeControls = false }: Props) {
  const [sizes, setSizes] = useState<LogiSizes>(externalSizes ?? DEFAULT_LOGI_SIZES);

  const { svgStr, legendHtml } = useMemo(
    () => buildLogiSVG(steps, isSwim, sizes),
    [steps, isSwim, sizes],
  );

  const handleDownloadSVG = () => {
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'logigramme.svg';
    a.click();
  };

  if (!svgStr) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 text-sm">
        Ajoutez des étapes pour voir le logigramme
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {showSizeControls && (
        <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
          <span className="font-bold">📐 Formes :</span>
          {([['boxW', 'L▭'], ['boxH', 'H▭'], ['dHW', 'L◇'], ['dHH', 'H◇']] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-1">
              {label} <input type="number" value={sizes[key as keyof LogiSizes]}
                onChange={(e) => setSizes((s) => ({ ...s, [key]: parseInt(e.target.value) || s[key as keyof LogiSizes] }))}
                className="w-14 rounded border border-gray-300 px-1 py-0.5 text-xs" min={20} max={600} step={4}
              />
            </label>
          ))}
          <button onClick={() => setSizes(DEFAULT_LOGI_SIZES)} className="text-gray-400 hover:text-gray-600">↺</button>
          <button onClick={handleDownloadSVG} className="ml-auto rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium hover:border-blue-300 hover:text-blue-600">⬇ SVG</button>
        </div>
      )}
      <div
        dangerouslySetInnerHTML={{ __html: svgStr }}
        className="w-full overflow-x-auto"
      />
      {legendHtml && (
        <div
          className="flex flex-wrap justify-center gap-3"
          dangerouslySetInnerHTML={{ __html: legendHtml }}
        />
      )}
    </div>
  );
}
```

- [ ] **Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run src/components/procedures/shared/LogigrammePreview.test.tsx
```

- [ ] **Committer**

```bash
git add src/components/procedures/shared/LogigrammePreview.tsx src/components/procedures/shared/LogigrammePreview.test.tsx
git commit -m "feat(procedures): LogigrammePreview — SVG live avec contrôles taille"
```

---

## Task 3 : Composant `StepFormRow`

**Fichiers :**
- Créer : `src/components/procedures/shared/StepFormRow.tsx`

- [ ] **Créer `src/components/procedures/shared/StepFormRow.tsx`**

```typescript
// src/components/procedures/shared/StepFormRow.tsx
import type { StepDefinition, RouteType, RouteSide } from '../../../types/procedures';

interface Props {
  step: StepDefinition;
  onChange: (updated: StepDefinition) => void;
  onRemove: () => void;
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-800 outline-none focus:border-blue-400';
const selectCls = inputCls;

export default function StepFormRow({ step, onChange, onRemove }: Props) {
  const up = (patch: Partial<StepDefinition>) => onChange({ ...step, ...patch });
  const isD = step.type === 'decision';

  return (
    <div className={`rounded-xl border-[1.5px] p-3 ${isD ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white'}`}>
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${isD ? 'bg-amber-500' : 'bg-blue-600'}`}>
          {step.num}
        </div>
        <select
          value={step.type}
          onChange={(e) => up({ type: e.target.value as StepDefinition['type'] })}
          className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[10px] font-bold text-gray-700"
        >
          <option value="activite">📦 Activité</option>
          <option value="decision">🔷 Décision (Oui/Non)</option>
        </select>
        <span className="ml-auto cursor-grab text-gray-300">⠿</span>
        <button onClick={onRemove} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500">✕</button>
      </div>

      {/* Champs communs */}
      <div className="flex flex-col gap-2">
        <Field label={isD ? 'Question de décision *' : "Description de l'activité *"}>
          <input className={inputCls} value={step.activite} onChange={(e) => up({ activite: e.target.value })} placeholder={isD ? 'ex: Le contrôle est-il conforme ?' : 'ex: Vérifier les EPI avant départ'} />
        </Field>
        <FieldRow>
          <Field label="Acteur responsable">
            <input className={inputCls} value={step.acteur} onChange={(e) => up({ acteur: e.target.value })} placeholder="ex: Responsable QHSE" />
          </Field>
          <Field label="Outil / Document">
            <input className={inputCls} value={step.outil ?? ''} onChange={(e) => up({ outil: e.target.value })} placeholder="ex: Registre EE" />
          </Field>
        </FieldRow>

        {/* Routing activité */}
        {!isD && (
          <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-blue-600">↳ Après cette activité</div>
            <div className="flex gap-2">
              <select className={selectCls} value={step.routeTypeAct ?? 'next'}
                onChange={(e) => up({ routeTypeAct: e.target.value as RouteType })}>
                <option value="next">⬇ Étape suivante</option>
                <option value="goto">➡ Aller à l'étape N°...</option>
                <option value="end">🛑 Fin</option>
              </select>
              {step.routeTypeAct === 'goto' && (
                <input type="number" className={`${inputCls} w-16`} placeholder="N°" value={step.routeNumAct ?? ''} onChange={(e) => up({ routeNumAct: e.target.value })} min={1} />
              )}
              <select className={selectCls} value={step.routeSideAct ?? 'auto'}
                onChange={(e) => up({ routeSideAct: e.target.value as RouteSide })}>
                <option value="auto">Sortie Auto</option>
                <option value="bottom">⬇ Bas</option>
                <option value="right">➡ Droite</option>
                <option value="left">⬅ Gauche</option>
              </select>
            </div>
          </div>
        )}

        {/* Routing décision */}
        {isD && (
          <div className="grid grid-cols-2 gap-2">
            {/* OUI */}
            <div className="rounded-md border border-green-200 bg-green-50 p-2">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-green-700">🟢 Branche OUI</div>
              <input className={`${inputCls} mb-1.5 border-green-200`} placeholder="Libellé (ex: OUI)" value={step.ouiLabel ?? 'OUI'} onChange={(e) => up({ ouiLabel: e.target.value })} />
              <select className={`${selectCls} border-green-200`} value={step.routeTypeOui ?? 'next'}
                onChange={(e) => up({ routeTypeOui: e.target.value as RouteType })}>
                <option value="next">⬇ Étape suivante</option>
                <option value="goto">➡ Étape N°...</option>
                <option value="end">🛑 Fin</option>
              </select>
              {step.routeTypeOui === 'goto' && (
                <input type="number" className={`${inputCls} mt-1 border-green-200`} placeholder="N°" value={step.routeNumOui ?? ''} onChange={(e) => up({ routeNumOui: e.target.value })} min={1} />
              )}
            </div>
            {/* NON */}
            <div className="rounded-md border border-red-200 bg-red-50 p-2">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-red-700">🔴 Branche NON</div>
              <input className={`${inputCls} mb-1 border-red-200`} placeholder="Libellé (ex: NON)" value={step.nonLabel ?? 'NON'} onChange={(e) => up({ nonLabel: e.target.value })} />
              <input className={`${inputCls} mb-1 border-red-200`} placeholder="Action si NON (optionnel)" value={step.nonAction ?? ''} onChange={(e) => up({ nonAction: e.target.value })} />
              {step.nonAction && (
                <input className={`${inputCls} mb-1 border-red-200`} placeholder="Acteur action NON" value={step.nonActor ?? ''} onChange={(e) => up({ nonActor: e.target.value })} />
              )}
              <select className={`${selectCls} border-red-200`} value={step.routeTypeNon ?? 'end'}
                onChange={(e) => up({ routeTypeNon: e.target.value as RouteType })}>
                <option value="next">⬇ Étape suivante</option>
                <option value="goto">➡ Étape N°...</option>
                <option value="end">🛑 Fin</option>
              </select>
              {step.routeTypeNon === 'goto' && (
                <input type="number" className={`${inputCls} mt-1 border-red-200`} placeholder="N°" value={step.routeNumNon ?? ''} onChange={(e) => up({ routeNumNon: e.target.value })} min={1} />
              )}
              <select className={`${selectCls} mt-1 border-red-200`} value={step.routeSideNon ?? 'auto'}
                onChange={(e) => up({ routeSideNon: e.target.value as RouteSide })}>
                <option value="auto">Sortie Auto</option>
                <option value="right">➡ Droite</option>
                <option value="left">⬅ Gauche</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Committer**

```bash
git add src/components/procedures/shared/StepFormRow.tsx
git commit -m "feat(procedures): StepFormRow — builder activité + décision Oui/Non"
```

---

## Task 4 : Orchestrateur `ProcedureWizard` + state

**Fichiers :**
- Créer : `src/components/procedures/wizard/ProcedureWizard.tsx`

- [ ] **Créer `src/components/procedures/wizard/ProcedureWizard.tsx`**

```typescript
// src/components/procedures/wizard/ProcedureWizard.tsx
import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { ProcedureDoc } from '../../../types/procedures';
import type { UseProcedureReturn } from '../../../hooks/useProcedure';
import WizardProgress from '../../cartographie/shared/WizardProgress';
import Step1General from './Step1General';
import Step2Context from './Step2Context';
import Step3Steps from './Step3Steps';
import Step4Risks from './Step4Risks';
import Step5Approval from './Step5Approval';
import Step6Preview from './Step6Preview';

interface Props {
  session: Session;
  procedure: UseProcedureReturn;
  editDocId?: string;
  onDone: () => void;
}

export type WizardState = Omit<ProcedureDoc, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & {
  savedDocId?: string;
};

export interface WizardStepProps {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
  onNext: (patch?: Partial<WizardState>) => Promise<void>;
  onBack: () => void;
  isSaving: boolean;
  procedure: UseProcedureReturn;
  session: Session;
}

const EMPTY_STATE: WizardState = {
  title: '',
  reference: '',
  version: 'V1.0',
  documentDate: new Date().toISOString().split('T')[0],
  direction: '',
  responsible: '',
  status: 'brouillon',
  processParent: '',
  objective: '',
  domain: '',
  docsIn: '',
  docsOut: '',
  kpi: '',
  steps: [],
  risks: [],
  approvers: [
    { id: crypto.randomUUID(), role: 'Rédigé par', nom: '', date: '' },
    { id: crypto.randomUUID(), role: 'Vérifié par', nom: '', date: '' },
    { id: crypto.randomUUID(), role: 'Approuvé par', nom: '', date: '' },
  ],
  revisions: [{ id: crypto.randomUUID(), version: 'V1.0', date: new Date().toISOString().split('T')[0], auteur: '', nature: 'Création initiale' }],
  revisionFrequency: 'Annuelle',
  phaseCompleted: false,
};

function docToState(doc: ProcedureDoc): WizardState {
  return { ...doc, savedDocId: doc.id };
}

export default function ProcedureWizard({ session, procedure, editDocId, onDone }: Props) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(EMPTY_STATE);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editDocId) {
      const doc = procedure.docs.find((d) => d.id === editDocId);
      if (doc) { setState(docToState(doc)); setStep(1); }
    }
  }, [editDocId, procedure.docs]);

  const update = (patch: Partial<WizardState>) => setState((prev) => ({ ...prev, ...patch }));

  const saveAndNext = async (patch?: Partial<WizardState>) => {
    const next = patch ? { ...state, ...patch } : state;
    setState(next);
    setIsSaving(true);
    try {
      const saved = await procedure.saveProcedure({
        id: next.savedDocId,
        title: next.title || 'Sans titre',
        reference: next.reference,
        version: next.version,
        documentDate: next.documentDate,
        direction: next.direction,
        responsible: next.responsible,
        status: next.status,
        processParent: next.processParent,
        objective: next.objective,
        domain: next.domain,
        docsIn: next.docsIn,
        docsOut: next.docsOut,
        kpi: next.kpi,
        steps: next.steps,
        risks: next.risks,
        approvers: next.approvers,
        revisions: next.revisions,
        revisionFrequency: next.revisionFrequency,
        phaseCompleted: step === 6,
      });
      if (!next.savedDocId) setState((prev) => ({ ...prev, savedDocId: saved.id }));
    } catch (e) {
      console.error('Erreur sauvegarde:', e);
    } finally {
      setIsSaving(false);
    }
    if (step < 6) setStep((s) => s + 1);
    else onDone();
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));
  const stepProps: WizardStepProps = { state, update, onNext: saveAndNext, onBack: goBack, isSaving, procedure, session };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f3' }}>
      <nav className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: 'var(--mase-primary)' }}>
        <a href="/procedures" className="text-lg font-bold text-white">MASE</a>
        <span className="text-sm text-white/70">{session.user.email}</span>
      </nav>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8">
          <WizardProgress currentStep={step} totalSteps={6} />
        </div>
        {step === 1 && <Step1General {...stepProps} />}
        {step === 2 && <Step2Context {...stepProps} />}
        {step === 3 && <Step3Steps {...stepProps} />}
        {step === 4 && <Step4Risks {...stepProps} />}
        {step === 5 && <Step5Approval {...stepProps} />}
        {step === 6 && <Step6Preview {...stepProps} />}
      </div>
    </div>
  );
}
```

- [ ] **Committer**

```bash
git add src/components/procedures/wizard/ProcedureWizard.tsx
git commit -m "feat(procedures): ProcedureWizard orchestrateur 6 étapes + autosave"
```

---

## Task 5 : Step1General

**Fichiers :**
- Créer : `src/components/procedures/wizard/Step1General.tsx`

- [ ] **Créer `src/components/procedures/wizard/Step1General.tsx`**

```typescript
// src/components/procedures/wizard/Step1General.tsx
import { useState } from 'react';
import type { WizardStepProps } from './ProcedureWizard';
import { PROCEDURE_TEMPLATES, PROC_PREFIXES } from '../../../types/procedures';

export default function Step1General({ state, update, onNext, onBack, isSaving }: WizardStepProps) {
  const [showTemplates, setShowTemplates] = useState(false);

  const handleProcessParentChange = (val: string) => {
    const prefix = PROC_PREFIXES[val] ?? 'PR';
    update({
      processParent: val,
      reference: state.reference || `${prefix}-001`,
    });
  };

  const applyTemplate = (tpl: typeof PROCEDURE_TEMPLATES[0]) => {
    update({ ...tpl.doc });
    setShowTemplates(false);
  };

  const canNext = state.title.trim().length > 0 && state.responsible.trim().length > 0;

  const inputCls = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
  const labelCls = 'mb-1.5 block text-sm font-semibold text-gray-700';

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-xl font-bold text-gray-900">Informations générales</h2>
      <p className="mb-6 text-sm text-gray-500">Identifiez votre procédure. Vous pouvez partir d'un modèle MASE prédéfini.</p>

      <button
        onClick={() => setShowTemplates((v) => !v)}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-200 py-3 text-sm font-semibold text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition"
      >
        ✦ Choisir un modèle MASE prédéfini ({PROCEDURE_TEMPLATES.length} disponibles)
      </button>

      {showTemplates && (
        <div className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
          {PROCEDURE_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              onClick={() => applyTemplate(tpl)}
              className="flex flex-col items-start gap-1 rounded-xl border border-gray-200 bg-white p-3 text-left hover:border-blue-400 hover:shadow-sm transition"
            >
              <span className="text-2xl">{tpl.icon}</span>
              <span className="text-xs font-bold text-gray-800">{tpl.label}</span>
              <span className="text-[10px] font-mono text-gray-400">{tpl.doc.reference}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div>
          <label className={labelCls}>Titre de la procédure *</label>
          <input className={inputCls} value={state.title} onChange={(e) => update({ title: e.target.value })} placeholder="ex: Élaboration du Plan de Prévention" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Référence</label>
            <input className={inputCls} value={state.reference} onChange={(e) => update({ reference: e.target.value })} placeholder="PR-QHSE-001" />
          </div>
          <div>
            <label className={labelCls}>Version</label>
            <input className={inputCls} value={state.version} onChange={(e) => update({ version: e.target.value })} placeholder="V1.0" />
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <input type="date" className={inputCls} value={state.documentDate} onChange={(e) => update({ documentDate: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Processus parent</label>
            <select className={inputCls} value={state.processParent} onChange={(e) => handleProcessParentChange(e.target.value)}>
              <option value="">Sélectionner…</option>
              {Object.keys(PROC_PREFIXES).map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Direction / Service</label>
            <input className={inputCls} value={state.direction} onChange={(e) => update({ direction: e.target.value })} placeholder="ex: QHSE" />
          </div>
        </div>

        <div>
          <label className={labelCls}>Responsable *</label>
          <input className={inputCls} value={state.responsible} onChange={(e) => update({ responsible: e.target.value })} placeholder="ex: Marion HUBERT — Responsable QHSE" />
        </div>

        <div>
          <label className={labelCls}>Statut</label>
          <div className="flex gap-2">
            {(['brouillon', 'valide', 'archive'] as const).map((s) => (
              <button key={s} onClick={() => update({ status: s })}
                className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition ${state.status === s ? (s === 'valide' ? 'border-green-400 bg-green-50 text-green-800' : s === 'archive' ? 'border-gray-400 bg-gray-100 text-gray-700' : 'border-amber-400 bg-amber-50 text-amber-800') : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'}`}>
                {s === 'brouillon' ? '🟡 Brouillon' : s === 'valide' ? '🟢 Validé' : '🔘 Archivé'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50">← Retour</button>
        <button onClick={() => onNext()} disabled={!canNext || isSaving}
          className="rounded-xl px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}>
          {isSaving ? 'Sauvegarde…' : 'Étape suivante →'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Committer**

```bash
git add src/components/procedures/wizard/Step1General.tsx
git commit -m "feat(procedures): Step1General — infos générales + 5 modèles MASE"
```

---

## Task 6 : Step2Context

**Fichiers :**
- Créer : `src/components/procedures/wizard/Step2Context.tsx`

- [ ] **Créer `src/components/procedures/wizard/Step2Context.tsx`**

```typescript
// src/components/procedures/wizard/Step2Context.tsx
import { useState } from 'react';
import type { WizardStepProps } from './ProcedureWizard';

export default function Step2Context({ state, update, onNext, onBack, isSaving, procedure, session }: WizardStepProps) {
  const [loadingAI, setLoadingAI] = useState<'objective' | 'kpi' | null>(null);

  const suggestWithAI = async (type: 'objective' | 'kpi') => {
    if (!state.title) return;
    setLoadingAI(type);
    try {
      const result = await procedure.callAiSuggest({
        questionType: type,
        title: state.title,
        sector: 'BTP / Maintenance industrielle',
        processParent: state.processParent,
      });
      if (type === 'objective') update({ objective: result.suggestion });
      else update({ kpi: result.suggestion });
    } catch (e) {
      console.error('Erreur IA:', e);
    } finally {
      setLoadingAI(null);
    }
  };

  const canNext = state.objective.trim().length > 0;

  const inputCls = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
  const textareaCls = `${inputCls} min-h-[80px] resize-y`;
  const labelCls = 'mb-1.5 block text-sm font-semibold text-gray-700';

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-xl font-bold text-gray-900">Contexte & Objectif</h2>
      <p className="mb-6 text-sm text-gray-500">Définissez l'objectif, le domaine d'application et les documents associés.</p>

      <div className="flex flex-col gap-5">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className={labelCls.replace('mb-1.5 ', '')}>Objectif de la procédure *</label>
            <button onClick={() => suggestWithAI('objective')} disabled={!state.title || loadingAI === 'objective'}
              className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50">
              {loadingAI === 'objective' ? '⏳ IA…' : '✨ Suggérer avec l\'IA'}
            </button>
          </div>
          <textarea className={textareaCls} value={state.objective} onChange={(e) => update({ objective: e.target.value })} placeholder="ex: Définir la procédure d'élaboration du plan de prévention pour toute intervention d'une entreprise extérieure, conformément au décret 92-158." />
        </div>

        <div>
          <label className={labelCls}>Domaine d'application</label>
          <textarea className={textareaCls} value={state.domain} onChange={(e) => update({ domain: e.target.value })} placeholder="ex: Toutes interventions d'entreprises extérieures sur sites clients." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Documents entrants</label>
            <textarea className={`${textareaCls} min-h-[60px]`} value={state.docsIn} onChange={(e) => update({ docsIn: e.target.value })} placeholder="ex: Contrat/commande, fiche de poste, DUER client" />
          </div>
          <div>
            <label className={labelCls}>Documents sortants</label>
            <textarea className={`${textareaCls} min-h-[60px]`} value={state.docsOut} onChange={(e) => update({ docsOut: e.target.value })} placeholder="ex: Plan de Prévention signé, PV d'inspection commune" />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className={labelCls.replace('mb-1.5 ', '')}>Indicateurs de performance (KPI)</label>
            <button onClick={() => suggestWithAI('kpi')} disabled={!state.title || loadingAI === 'kpi'}
              className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50">
              {loadingAI === 'kpi' ? '⏳ IA…' : '✨ Suggérer avec l\'IA'}
            </button>
          </div>
          <input className={inputCls} value={state.kpi} onChange={(e) => update({ kpi: e.target.value })} placeholder="ex: 100% des interventions EE couvertes par un PP · 0 intervention sans PP validé" />
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50">← Retour</button>
        <button onClick={() => onNext()} disabled={!canNext || isSaving}
          className="rounded-xl px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}>
          {isSaving ? 'Sauvegarde…' : 'Étape suivante →'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Committer**

```bash
git add src/components/procedures/wizard/Step2Context.tsx
git commit -m "feat(procedures): Step2Context — objectif + KPI + boutons IA suggérer"
```

---

## Task 7 : Step3Steps (builder + logigramme split screen)

**Fichiers :**
- Créer : `src/components/procedures/wizard/Step3Steps.tsx`

- [ ] **Créer `src/components/procedures/wizard/Step3Steps.tsx`**

```typescript
// src/components/procedures/wizard/Step3Steps.tsx
import { useState } from 'react';
import type { WizardStepProps } from './ProcedureWizard';
import type { StepDefinition } from '../../../types/procedures';
import StepFormRow from '../shared/StepFormRow';
import LogigrammePreview from '../shared/LogigrammePreview';

export default function Step3Steps({ state, update, onNext, onBack, isSaving, procedure }: WizardStepProps) {
  const [logiMode, setLogiMode] = useState<'flow' | 'swim'>('flow');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiDesc, setAiDesc] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);

  const addStep = (type: StepDefinition['type'] = 'activite') => {
    const num = state.steps.length + 1;
    const newStep: StepDefinition = {
      id: crypto.randomUUID(), type, num,
      activite: '', acteur: '',
      routeTypeAct: num > 1 ? 'next' : 'end',
      routeSideAct: 'auto',
      ...(type === 'decision' ? { ouiLabel: 'OUI', routeTypeOui: 'next', routeSideOui: 'auto', nonLabel: 'NON', routeTypeNon: 'end', routeSideNon: 'right' } : {}),
    };
    update({ steps: [...state.steps, newStep] });
  };

  const updateStep = (id: string, updated: StepDefinition) => {
    update({ steps: state.steps.map((s) => s.id === id ? updated : s) });
  };

  const removeStep = (id: string) => {
    const filtered = state.steps.filter((s) => s.id !== id);
    update({ steps: filtered.map((s, i) => ({ ...s, num: i + 1 }) as StepDefinition) });
  };

  const generateWithAI = async () => {
    if (!aiDesc.trim()) return;
    setIsGenerating(true);
    try {
      const result = await procedure.callGenerateSteps({
        description: aiDesc,
        sector: 'BTP / Maintenance industrielle',
        processType: state.processParent,
        companyName: '',
      });
      update({ steps: result.steps });
      setShowAiInput(false);
      setAiDesc('');
    } catch (e) {
      console.error('Erreur génération IA:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const canNext = state.steps.length >= 1 && state.steps.every((s) => s.activite.trim().length > 0);

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Étapes & Logigramme</h2>
          <p className="text-sm text-gray-500">Construisez votre procédure étape par étape. Le logigramme se met à jour en direct.</p>
        </div>
        <button
          onClick={() => setShowAiInput((v) => !v)}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #1e5f8e, #0e8a7a)' }}
        >
          ✨ IA génère les étapes
        </button>
      </div>

      {/* AI input */}
      {showAiInput && (
        <div className="border-b border-amber-100 bg-amber-50 px-6 py-4">
          <p className="mb-2 text-sm font-semibold text-amber-800">Décrivez votre processus en une phrase, l'IA génère les étapes :</p>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-amber-400"
              value={aiDesc}
              onChange={(e) => setAiDesc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generateWithAI()}
              placeholder="ex: Vérifier les habilitations des intervenants avant le démarrage d'un chantier"
            />
            <button onClick={generateWithAI} disabled={!aiDesc.trim() || isGenerating}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: '#c9922a' }}>
              {isGenerating ? '⏳ Génération…' : 'Générer →'}
            </button>
          </div>
        </div>
      )}

      {/* Split screen */}
      <div className="grid grid-cols-[420px_1fr] overflow-hidden" style={{ minHeight: '520px' }}>

        {/* LEFT: Builder */}
        <div className="flex flex-col border-r border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            {state.steps.length} étape{state.steps.length > 1 ? 's' : ''}
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {state.steps.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm">Ajoutez une activité ou une décision,<br/>ou laissez l'IA générer les étapes.</p>
              </div>
            )}
            {state.steps.map((step) => (
              <StepFormRow key={step.id} step={step} onChange={(u) => updateStep(step.id, u)} onRemove={() => removeStep(step.id)} />
            ))}
          </div>
          <div className="flex gap-2 border-t border-gray-100 bg-white p-3">
            <button onClick={() => addStep('activite')}
              className="flex-1 rounded-xl border-2 border-dashed border-gray-200 py-2.5 text-xs font-semibold text-gray-500 hover:border-blue-300 hover:text-blue-600 transition">
              + Activité
            </button>
            <button onClick={() => addStep('decision')}
              className="flex-1 rounded-xl border-2 border-dashed border-amber-200 py-2.5 text-xs font-semibold text-amber-600 hover:border-amber-400 transition">
              🔷 Décision
            </button>
          </div>
        </div>

        {/* RIGHT: Preview */}
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-2">
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              {(['flow', 'swim'] as const).map((m) => (
                <button key={m} onClick={() => setLogiMode(m)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${logiMode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>
                  {m === 'flow' ? '🔀 Organigramme' : '🏊 Couloirs'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400"></span>
              <span className="text-[10px] font-semibold text-green-600">Live</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <LogigrammePreview steps={state.steps} isSwim={logiMode === 'swim'} showSizeControls />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between border-t border-gray-100 bg-white px-6 py-4">
        <button onClick={onBack} className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50">← Retour</button>
        <button onClick={() => onNext()} disabled={!canNext || isSaving}
          className="rounded-xl px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}>
          {isSaving ? 'Sauvegarde…' : 'Étape suivante →'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Committer**

```bash
git add src/components/procedures/wizard/Step3Steps.tsx
git commit -m "feat(procedures): Step3Steps — builder + logigramme SVG split screen temps réel"
```

---

## Task 8 : Step4Risks

**Fichiers :**
- Créer : `src/components/procedures/wizard/Step4Risks.tsx`

- [ ] **Créer `src/components/procedures/wizard/Step4Risks.tsx`**

```typescript
// src/components/procedures/wizard/Step4Risks.tsx
import { useState } from 'react';
import type { WizardStepProps } from './ProcedureWizard';
import type { RiskItem, RiskLevel } from '../../../types/procedures';

export default function Step4Risks({ state, update, onNext, onBack, isSaving, procedure }: WizardStepProps) {
  const [loadingAI, setLoadingAI] = useState(false);

  const addRisk = () => {
    update({ risks: [...state.risks, { id: crypto.randomUUID(), risque: '', niveau: 'med', controle: '' }] });
  };

  const updateRisk = (id: string, patch: Partial<RiskItem>) => {
    update({ risks: state.risks.map((r) => r.id === id ? { ...r, ...patch } : r) });
  };

  const removeRisk = (id: string) => {
    update({ risks: state.risks.filter((r) => r.id !== id) });
  };

  const suggestWithAI = async () => {
    if (!state.title) return;
    setLoadingAI(true);
    try {
      const result = await procedure.callAiSuggest({ questionType: 'risks', title: state.title, sector: 'BTP / Maintenance industrielle', processParent: state.processParent });
      const parsed = JSON.parse(result.suggestion);
      if (Array.isArray(parsed)) {
        update({ risks: parsed.map((r: Record<string, string>) => ({ id: crypto.randomUUID(), risque: r.risque ?? '', niveau: (r.niveau ?? 'med') as RiskLevel, controle: r.controle ?? '' })) });
      }
    } catch (e) { console.error('Erreur IA risques:', e); }
    finally { setLoadingAI(false); }
  };

  const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800 outline-none focus:border-blue-400';

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Risques & Prévention</h2>
          <p className="text-sm text-gray-500">Identifiez les risques liés à cette procédure et les mesures de prévention.</p>
        </div>
        <button onClick={suggestWithAI} disabled={!state.title || loadingAI}
          className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50">
          {loadingAI ? '⏳ IA…' : '✨ IA suggère les risques'}
        </button>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        {state.risks.map((risk) => (
          <div key={risk.id} className={`rounded-xl border-l-4 p-4 ${risk.niveau === 'high' ? 'border-red-500 bg-red-50' : risk.niveau === 'low' ? 'border-green-500 bg-green-50' : 'border-amber-400 bg-amber-50'}`}>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Niveau :</span>
              {(['low', 'med', 'high'] as RiskLevel[]).map((n) => (
                <button key={n} onClick={() => updateRisk(risk.id, { niveau: n })}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${risk.niveau === n ? (n === 'high' ? 'bg-red-500 text-white' : n === 'low' ? 'bg-green-500 text-white' : 'bg-amber-500 text-white') : 'bg-white border border-gray-200 text-gray-500'}`}>
                  {n === 'high' ? '🔴 Élevé' : n === 'med' ? '🟡 Moyen' : '🟢 Faible'}
                </button>
              ))}
              <button onClick={() => removeRisk(risk.id)} className="ml-auto rounded p-1 text-gray-400 hover:bg-white hover:text-red-500">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Risque *</label>
                <input className={inputCls} value={risk.risque} onChange={(e) => updateRisk(risk.id, { risque: e.target.value })} placeholder="ex: Intervention sans PP validé" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Mesure de prévention</label>
                <input className={inputCls} value={risk.controle} onChange={(e) => updateRisk(risk.id, { controle: e.target.value })} placeholder="ex: Suspension immédiate de l'intervention" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addRisk}
        className="mb-8 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-semibold text-gray-500 hover:border-blue-300 hover:text-blue-600 transition">
        + Ajouter un risque
      </button>

      <div className="flex justify-between">
        <button onClick={onBack} className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50">← Retour</button>
        <button onClick={() => onNext()} disabled={isSaving}
          className="rounded-xl px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}>
          {isSaving ? 'Sauvegarde…' : 'Étape suivante →'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Committer**

```bash
git add src/components/procedures/wizard/Step4Risks.tsx
git commit -m "feat(procedures): Step4Risks — risques avec niveaux colorés + IA suggérer"
```

---

## Task 9 : Step5Approval

**Fichiers :**
- Créer : `src/components/procedures/wizard/Step5Approval.tsx`

- [ ] **Créer `src/components/procedures/wizard/Step5Approval.tsx`**

```typescript
// src/components/procedures/wizard/Step5Approval.tsx
import type { WizardStepProps } from './ProcedureWizard';
import type { Approver, Revision } from '../../../types/procedures';

export default function Step5Approval({ state, update, onNext, onBack, isSaving }: WizardStepProps) {
  const updateApprover = (id: string, patch: Partial<Approver>) => {
    update({ approvers: state.approvers.map((a) => a.id === id ? { ...a, ...patch } : a) });
  };

  const updateRevision = (id: string, patch: Partial<Revision>) => {
    update({ revisions: state.revisions.map((r) => r.id === id ? { ...r, ...patch } : r) });
  };

  const addRevision = () => {
    update({ revisions: [...state.revisions, { id: crypto.randomUUID(), version: `V${state.revisions.length + 1}.0`, date: new Date().toISOString().split('T')[0], auteur: '', nature: '' }] });
  };

  const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400';

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-xl font-bold text-gray-900">Approbation & Révisions</h2>
      <p className="mb-6 text-sm text-gray-500">Définissez les validateurs de cette procédure et l'historique des révisions.</p>

      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">Approbateurs</h3>
      <div className="mb-6 flex flex-col gap-3">
        {state.approvers.map((approver) => (
          <div key={approver.id} className="grid grid-cols-[160px_1fr_140px] gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Rôle</label>
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">{approver.role}</div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Nom & Fonction</label>
              <input className={inputCls} value={approver.nom} onChange={(e) => updateApprover(approver.id, { nom: e.target.value })} placeholder="ex: Marion HUBERT — Responsable QHSE" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Date</label>
              <input type="date" className={inputCls} value={approver.date ?? ''} onChange={(e) => updateApprover(approver.id, { date: e.target.value })} />
            </div>
          </div>
        ))}
      </div>

      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">Historique des révisions</h3>
      <div className="mb-3 flex flex-col gap-2">
        {state.revisions.map((rev) => (
          <div key={rev.id} className="grid grid-cols-[80px_140px_1fr_1fr] gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2">
            <input className={inputCls} value={rev.version} onChange={(e) => updateRevision(rev.id, { version: e.target.value })} placeholder="V1.0" />
            <input type="date" className={inputCls} value={rev.date} onChange={(e) => updateRevision(rev.id, { date: e.target.value })} />
            <input className={inputCls} value={rev.auteur} onChange={(e) => updateRevision(rev.id, { auteur: e.target.value })} placeholder="Auteur" />
            <input className={inputCls} value={rev.nature} onChange={(e) => updateRevision(rev.id, { nature: e.target.value })} placeholder="Nature de la modification" />
          </div>
        ))}
      </div>
      <button onClick={addRevision} className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-2.5 text-xs font-semibold text-gray-500 hover:border-blue-300 hover:text-blue-600 transition">
        + Ajouter une révision
      </button>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Fréquence de révision</label>
        <select className={inputCls} value={state.revisionFrequency ?? 'Annuelle'} onChange={(e) => update({ revisionFrequency: e.target.value })}>
          <option>Annuelle</option>
          <option>Semestrielle</option>
          <option>Trimestrielle</option>
          <option>En cas de modification significative</option>
        </select>
      </div>

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50">← Retour</button>
        <button onClick={() => onNext()} disabled={isSaving}
          className="rounded-xl px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}>
          {isSaving ? 'Sauvegarde…' : 'Aperçu →'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Committer**

```bash
git add src/components/procedures/wizard/Step5Approval.tsx
git commit -m "feat(procedures): Step5Approval — approbateurs + historique révisions"
```

---

## Task 10 : Step6Preview

**Fichiers :**
- Créer : `src/components/procedures/wizard/Step6Preview.tsx`

- [ ] **Créer `src/components/procedures/wizard/Step6Preview.tsx`**

```typescript
// src/components/procedures/wizard/Step6Preview.tsx
import { useState } from 'react';
import type { WizardStepProps } from './ProcedureWizard';
import LogigrammePreview from '../shared/LogigrammePreview';

export default function Step6Preview({ state, onNext, onBack, isSaving }: WizardStepProps) {
  const [view, setView] = useState<'doc' | 'logi'>('doc');
  const [logiMode, setLogiMode] = useState<'flow' | 'swim'>('flow');

  const riskColor = { high: '#fef2f2', med: '#fffbeb', low: '#f0fdf4' };
  const riskBorder = { high: '#dc2626', med: '#d97706', low: '#059669' };
  const riskLabel = { high: '🔴 Élevé', med: '🟡 Moyen', low: '🟢 Faible' };

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Aperçu de la procédure</h2>
          <p className="text-sm text-gray-500">Vérifiez votre procédure avant l'export PDF.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button onClick={() => setView('doc')} className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${view === 'doc' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>📄 Document ISO</button>
            <button onClick={() => setView('logi')} className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${view === 'logi' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>🔀 Logigramme</button>
          </div>
          {view === 'logi' && (
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              <button onClick={() => setLogiMode('flow')} className={`rounded-md px-3 py-1 text-[10px] font-semibold transition ${logiMode === 'flow' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Organigramme</button>
              <button onClick={() => setLogiMode('swim')} className={`rounded-md px-3 py-1 text-[10px] font-semibold transition ${logiMode === 'swim' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Couloirs</button>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-y-auto p-6" style={{ maxHeight: '65vh' }}>

        {view === 'doc' && (
          <div style={{ maxWidth: 740, margin: '0 auto', fontFamily: 'system-ui, sans-serif', fontSize: 12 }}>
            {/* En-tête ISO */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #0d2240', marginBottom: 20 }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #0d2240', padding: '10px 12px', width: '23%', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Arial,sans-serif' }}>
                      <strong style={{ color: '#e33512', fontSize: 22, fontStyle: 'italic', letterSpacing: -1, display: 'block' }}>DEF</strong>
                      <span style={{ color: '#000', fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2 }}>Océan Indien</span>
                    </div>
                  </td>
                  <td style={{ border: '1px solid #0d2240', padding: '10px 12px', width: '50%', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0d2240', lineHeight: 1.3 }}>{state.title || 'Titre de la procédure'}</div>
                    <div style={{ fontSize: 9.5, color: '#6b849a', marginTop: 5, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1 }}>PROCESSUS : {state.processParent || 'Non défini'}</div>
                  </td>
                  <td style={{ border: '1px solid #0d2240', padding: '10px 12px', width: '27%', fontSize: 10.5, lineHeight: 1.7 }}>
                    <div><strong style={{ color: '#0d2240' }}>Réf :</strong> <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{state.reference || 'PR-XXX'}</span></div>
                    <div><strong style={{ color: '#0d2240' }}>Version :</strong> {state.version}</div>
                    <div><strong style={{ color: '#0d2240' }}>Date :</strong> {state.documentDate}</div>
                    <div><strong style={{ color: '#0d2240' }}>Statut :</strong> <span style={{ textTransform: 'uppercase', fontWeight: 700, color: '#0e8a7a' }}>{state.status}</span></div>
                  </td>
                </tr>
              </tbody>
            </table>

            {state.objective && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: '#1e5f8e', padding: '4px 8px', background: '#eef3f8', borderLeft: '3px solid #1e5f8e', marginBottom: 8 }}>🎯 Objectif</div>
                <div style={{ lineHeight: 1.6 }}>{state.objective}</div>
              </div>
            )}

            {(state.domain || state.responsible) && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: '#1e5f8e', padding: '4px 8px', background: '#eef3f8', borderLeft: '3px solid #1e5f8e', marginBottom: 8 }}>🔍 Domaine & Responsable</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #d0dce8', borderRadius: 3, overflow: 'hidden' }}>
                  {[['Domaine d\'application', state.domain], ['Responsable', state.responsible], ['Documents entrants', state.docsIn], ['Documents sortants', state.docsOut]].map(([k, v]) => v && (
                    <div key={k} style={{ padding: '8px 10px', borderRight: '1px solid #d0dce8', borderBottom: '1px solid #d0dce8' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#6b849a', textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
                      <div style={{ fontSize: 11 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {state.kpi && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: '#1e5f8e', padding: '4px 8px', background: '#eef3f8', borderLeft: '3px solid #1e5f8e', marginBottom: 8 }}>📊 Indicateurs (KPI)</div>
                <div style={{ lineHeight: 1.6 }}>{state.kpi}</div>
              </div>
            )}

            {state.risks.filter((r) => r.risque).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: '#1e5f8e', padding: '4px 8px', background: '#eef3f8', borderLeft: '3px solid #1e5f8e', marginBottom: 8 }}>⚠️ Risques & Prévention</div>
                {state.risks.filter((r) => r.risque).map((r) => (
                  <div key={r.id} style={{ display: 'flex', gap: 8, padding: '8px 10px', background: riskColor[r.niveau], borderLeft: `3px solid ${riskBorder[r.niveau]}`, borderRadius: 4, marginBottom: 6, fontSize: 11 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 3, background: riskColor[r.niveau], border: `1px solid ${riskBorder[r.niveau]}`, color: riskBorder[r.niveau], flexShrink: 0 }}>{riskLabel[r.niveau]}</span>
                    <div><strong>{r.risque}</strong>{r.controle && <span style={{ color: '#6b849a' }}> — {r.controle}</span>}</div>
                  </div>
                ))}
              </div>
            )}

            {state.approvers.filter((a) => a.nom).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: '#1e5f8e', padding: '4px 8px', background: '#eef3f8', borderLeft: '3px solid #1e5f8e', marginBottom: 8 }}>✍️ Approbation</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead><tr>{['Rôle', 'Nom & Fonction', 'Date', 'Signature'].map((h) => <th key={h} style={{ background: '#eef3f8', color: '#0d2240', padding: '6px 8px', textAlign: 'left', fontSize: 9.5, fontWeight: 800, border: '1px solid #d0dce8' }}>{h}</th>)}</tr></thead>
                  <tbody>{state.approvers.filter((a) => a.nom).map((a) => <tr key={a.id}><td style={{ padding: '8px', border: '1px solid #d0dce8' }}><strong>{a.role}</strong></td><td style={{ padding: '8px', border: '1px solid #d0dce8' }}>{a.nom}</td><td style={{ padding: '8px', border: '1px solid #d0dce8' }}>{a.date}</td><td style={{ padding: '8px', border: '1px solid #d0dce8', minHeight: 36 }}></td></tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {view === 'logi' && (
          <LogigrammePreview steps={state.steps} isSwim={logiMode === 'swim'} showSizeControls />
        )}
      </div>

      <div className="flex justify-between border-t border-gray-100 bg-white px-6 py-4">
        <button onClick={onBack} className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50">← Retour</button>
        <button onClick={() => onNext()} disabled={isSaving}
          className="rounded-xl px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}>
          {isSaving ? 'Sauvegarde…' : '🎉 Finaliser et exporter →'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Committer**

```bash
git add src/components/procedures/wizard/Step6Preview.tsx
git commit -m "feat(procedures): Step6Preview — aperçu document ISO + logigramme"
```

---

## Task 11 : ProcedureList + ProceduresWizardPage complète

**Fichiers :**
- Créer : `src/components/procedures/list/ProcedureList.tsx`
- Modifier : `src/pages/ProceduresWizardPage.tsx`

- [ ] **Créer `src/components/procedures/list/ProcedureList.tsx`**

```typescript
// src/components/procedures/list/ProcedureList.tsx
import type { ProcedureDoc } from '../../../types/procedures';

interface Props {
  docs: ProcedureDoc[];
  isLoading: boolean;
  onNew: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onExportJSON: () => void;
  session: { user: { email: string } };
}

const statusConfig = {
  brouillon: { label: '🟡 Brouillon', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  valide:    { label: '🟢 Validé', cls: 'bg-green-50 text-green-800 border-green-200' },
  archive:   { label: '🔘 Archivé', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export default function ProcedureList({ docs, isLoading, onNew, onEdit, onDelete, onExportJSON, session }: Props) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f3' }}>
      <nav className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: 'var(--mase-primary)' }}>
        <a href="/" className="text-lg font-bold text-white">MASE</a>
        <span className="text-sm text-white/70">{session.user.email}</span>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes Procédures</h1>
            <p className="mt-1 text-sm text-gray-500">{docs.length} procédure{docs.length > 1 ? 's' : ''} sauvegardée{docs.length > 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onExportJSON} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition">
              ⬇ Export JSON
            </button>
            <button onClick={onNew}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: 'var(--mase-primary)' }}>
              + Nouvelle procédure
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12 text-gray-400">Chargement…</div>
        )}

        {!isLoading && docs.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
            <div className="mb-4 text-5xl">📋</div>
            <h3 className="mb-2 text-lg font-bold text-gray-700">Aucune procédure</h3>
            <p className="mb-6 text-sm text-gray-400">Créez votre première procédure MASE en quelques minutes.</p>
            <button onClick={onNew}
              className="rounded-xl px-6 py-3 text-sm font-bold text-white"
              style={{ backgroundColor: 'var(--mase-primary)' }}>
              Créer ma première procédure →
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {docs.map((doc) => {
            const status = statusConfig[doc.status] ?? statusConfig.brouillon;
            return (
              <div key={doc.id} className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm hover:shadow-md transition cursor-pointer" onClick={() => onEdit(doc.id!)}>
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="truncate text-sm font-bold text-gray-900">{doc.title}</span>
                    <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${status.cls}`}>{status.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="font-mono font-semibold text-gray-500">{doc.reference}</span>
                    {doc.processParent && <span>· {doc.processParent}</span>}
                    {doc.version && <span>· {doc.version}</span>}
                    {doc.updatedAt && <span>· {new Date(doc.updatedAt).toLocaleDateString('fr-FR')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={(e) => { e.stopPropagation(); onEdit(doc.id!); }}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-blue-300 hover:text-blue-600">
                    ✏️ Modifier
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); if (confirm('Supprimer cette procédure ?')) onDelete(doc.id!); }}
                    className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-400 hover:border-red-300 hover:text-red-600">
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Mettre à jour `src/pages/ProceduresWizardPage.tsx` (remplacer le stub)**

```typescript
// src/pages/ProceduresWizardPage.tsx
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { SessionContext } from '../contexts/SessionContext';
import { useProcedure } from '../hooks/useProcedure';
import ProcedureList from '../components/procedures/list/ProcedureList';
import ProcedureWizard from '../components/procedures/wizard/ProcedureWizard';

type Screen = 'list' | 'wizard';

export default function ProceduresWizardPage() {
  const session = useContext(SessionContext) as Session | null;
  const navigate = useNavigate();
  const procedure = useProcedure(session);
  const [screen, setScreen] = useState<Screen>('list');
  const [editDocId, setEditDocId] = useState<string | undefined>();

  if (!session) {
    navigate('/procedures');
    return null;
  }

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(procedure.docs, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `MASE_Procedures_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  if (screen === 'wizard') {
    return (
      <ProcedureWizard
        session={session}
        procedure={procedure}
        editDocId={editDocId}
        onDone={() => { setScreen('list'); setEditDocId(undefined); }}
      />
    );
  }

  return (
    <ProcedureList
      docs={procedure.docs}
      isLoading={procedure.isLoading}
      session={session}
      onNew={() => { setEditDocId(undefined); setScreen('wizard'); }}
      onEdit={(id) => { setEditDocId(id); setScreen('wizard'); }}
      onDelete={procedure.deleteProcedure}
      onExportJSON={handleExportJSON}
    />
  );
}
```

- [ ] **Lancer le dev server et tester le flow complet**

```bash
npm run dev
```

1. Aller sur `http://localhost:5173/procedures/wizard`
2. Cliquer "+ Nouvelle procédure"
3. Passer les 6 étapes, vérifier que le logigramme se met à jour en temps réel à l'étape 3
4. Vérifier que l'aperçu (étape 6) affiche le document ISO + le logigramme
5. Vérifier que la procédure apparaît dans la liste après "Finaliser"

- [ ] **Lancer tous les tests**

```bash
npx vitest run
```
Attendu : tous les tests passent

- [ ] **Committer**

```bash
git add src/components/procedures/list/ProcedureList.tsx src/pages/ProceduresWizardPage.tsx
git commit -m "feat(procedures): ProcedureList + ProceduresWizardPage — flow complet liste ↔ wizard"
```
