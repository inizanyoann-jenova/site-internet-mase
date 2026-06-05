import type { StepDefinition } from '../../types/procedures';

// ── Types ──────────────────────────────────────────────────────────────────

export interface LogiSizes {
  boxW: number;
  boxH: number;
  dHW: number;
  dHH: number;
}

export const DEFAULT_LOGI_SIZES: LogiSizes = {
  boxW: 380,
  boxH: 76,
  dHW: 165,
  dHH: 44,
};

// ── Internal color types ───────────────────────────────────────────────────

interface ActorColor {
  fill: string;
  stroke: string;
  text: string;
}

// ── Constants (ported from ProcedureV8_DEF_OI_v2.html) ────────────────────

const ACTOR_COLORS: ActorColor[] = [
  { fill: '#dbeafe', stroke: '#2563eb', text: '#1e3a8a' },
  { fill: '#d1fae5', stroke: '#059669', text: '#064e3b' },
  { fill: '#fce7f3', stroke: '#db2777', text: '#831843' },
  { fill: '#ede9fe', stroke: '#7c3aed', text: '#4c1d95' },
  { fill: '#ffedd5', stroke: '#ea580c', text: '#7c2d12' },
  { fill: '#cffafe', stroke: '#0891b2', text: '#164e63' },
  { fill: '#fef9c3', stroke: '#ca8a04', text: '#713f12' },
  { fill: '#f0fdf4', stroke: '#16a34a', text: '#14532d' },
];

const LINE_COLORS: Record<string, string> = {
  gray: '#475569',
  green: '#059669',
  red: '#dc2626',
};

// ── Internal step type with computed layout fields ─────────────────────────

interface ComputedStep extends StepDefinition {
  _cx: number;
  _h: number;
  _y_top: number;
  _y_center: number;
  _y_bottom: number;
  _non_cx?: number;
  _non_y_top?: number;
  _non_y_center?: number;
  _non_y_bottom?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Escape HTML entities in a string for safe SVG/HTML embedding. */
function esc(str: string | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Split text into lines of at most maxChars characters (word-wrap). */
function wrapText(text: string | undefined, maxChars: number): string[] {
  if (!text) return [''];
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  words.forEach((w) => {
    if ((cur + ' ' + w).trim().length <= maxChars) {
      cur = (cur + ' ' + w).trim();
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  });
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Builds an SVG string for a procedure flowchart (logigramme) from a list of
 * steps. Faithfully ported from buildLogiSVG() in ProcedureV8_DEF_OI_v2.html.
 *
 * @param steps   Array of StepDefinition objects.
 * @param isSwim  Whether to render in swim-lane (couloirs) mode.
 * @param sizes   Optional custom shape sizes (defaults to DEFAULT_LOGI_SIZES).
 * @returns       { svgStr, legendHtml }
 */
export function buildLogiSVG(
  steps: StepDefinition[],
  isSwim: boolean,
  sizes: LogiSizes = DEFAULT_LOGI_SIZES,
): { svgStr: string; legendHtml: string } {
  if (!steps || steps.length === 0) {
    return { svgStr: '', legendHtml: '' };
  }

  // ── Actor → color mapping ──────────────────────────────────────────────
  const actors: string[] = [...new Set(steps.map((s) => s.acteur))].filter(Boolean);
  steps.forEach((s) => {
    if (s.type === 'decision' && s.nonAction && s.nonActor && !actors.includes(s.nonActor)) {
      actors.push(s.nonActor);
    }
  });
  if (actors.length === 0) actors.push('Général');

  const colorMap: Record<string, ActorColor> = {};
  actors.forEach((a, i) => {
    colorMap[a] = ACTOR_COLORS[i % ACTOR_COLORS.length];
  });

  // ── Layout constants ───────────────────────────────────────────────────
  const padTop = 80, padLeft = 40, LANE_W = 280, GAP = 55;
  const BOX_H = sizes.boxH;
  const D_HH = sizes.dHH;
  const BOX_W = isSwim ? Math.round(sizes.boxW * 0.6) : sizes.boxW;
  const D_HW = isSwim ? Math.round(sizes.dHW * 0.7) : sizes.dHW;
  const W = isSwim ? Math.max(820, padLeft + actors.length * LANE_W + 60) : 860;
  const RAIL_R = W - 40;
  const RAIL_L = 40;

  // ── Compute layout positions for each step ─────────────────────────────
  let y = padTop + 40 + GAP;
  const computed: ComputedStep[] = steps.map((s) => ({ ...s } as ComputedStep));

  computed.forEach((s) => {
    let aIdx = actors.indexOf(s.acteur);
    if (aIdx < 0) aIdx = 0;
    s._cx = isSwim ? padLeft + aIdx * LANE_W + LANE_W / 2 : W / 2;
    s._h = s.type === 'decision' ? D_HH * 2 : BOX_H;
    s._y_top = y;
    s._y_center = y + s._h / 2;
    s._y_bottom = y + s._h;
    y += s._h + GAP;

    if (s.type === 'decision' && s.nonAction) {
      let sideNon = s.routeSideNon || 'auto';
      if (sideNon === 'auto') sideNon = 'right';
      let nonAIdx = actors.indexOf(s.nonActor ?? '');
      if (nonAIdx < 0) nonAIdx = 0;
      const nBw = isSwim ? BOX_W : 200;
      if (isSwim) {
        s._non_cx = padLeft + nonAIdx * LANE_W + LANE_W / 2;
      } else {
        if (sideNon === 'left') {
          s._non_cx = RAIL_L + nBw / 2 + 20;
        } else if (sideNon === 'bottom') {
          s._non_cx = s._cx;
        } else {
          s._non_cx = RAIL_R - nBw / 2 - 20;
        }
      }
      s._non_y_top = y;
      s._non_y_center = y + BOX_H / 2;
      s._non_y_bottom = y + BOX_H;
      y += BOX_H + GAP;
    }
  });

  const endCy = y;
  const endCx = W / 2;
  const totalH = endCy + 80;

  // ── SVG header ─────────────────────────────────────────────────────────
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${totalH}" style="font-family:'DM Sans',sans-serif; background:white; border-radius:8px;">
  <defs>
    <filter id="sh"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.1"/></filter>
    <marker id="arr-gray" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,1 L0,7 L8,4 z" fill="${LINE_COLORS.gray}"/></marker>
    <marker id="arr-green" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,1 L0,7 L8,4 z" fill="${LINE_COLORS.green}"/></marker>
    <marker id="arr-red" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,1 L0,7 L8,4 z" fill="${LINE_COLORS.red}"/></marker>
  </defs>`;

  // ── Swim lanes ─────────────────────────────────────────────────────────
  if (isSwim) {
    actors.forEach((act, i) => {
      const c = colorMap[act];
      const lx = padLeft + i * LANE_W;
      svg += `<rect x="${lx}" y="${padTop}" width="${LANE_W}" height="${totalH - padTop - 20}" fill="${i % 2 === 0 ? '#f8fafc' : '#f1f5f9'}" stroke="${c?.stroke || '#ccc'}" stroke-width="0.5" opacity="0.6"/>`;
      svg += `<rect x="${lx + 15}" y="${padTop - 30}" width="${LANE_W - 30}" height="40" rx="8" fill="${c?.fill || '#fff'}" stroke="${c?.stroke || '#ccc'}" stroke-width="1.5"/>`;
      svg += `<text x="${lx + LANE_W / 2}" y="${padTop - 5}" text-anchor="middle" font-size="12" font-weight="700" fill="${c?.text || '#000'}">${esc(act)}</text>`;
    });
  }

  // ── DÉBUT and FIN ellipses ─────────────────────────────────────────────
  svg += `<ellipse cx="${endCx}" cy="${padTop / 2}" rx="56" ry="20" fill="#0d2240" filter="url(#sh)"/><text x="${endCx}" y="${padTop / 2 + 5}" text-anchor="middle" font-size="12" font-weight="700" fill="white" letter-spacing="1">DÉBUT</text>`;
  svg += `<ellipse cx="${endCx}" cy="${endCy}" rx="56" ry="20" fill="#0e8a7a" filter="url(#sh)"/><text x="${endCx}" y="${endCy + 5}" text-anchor="middle" font-size="12" font-weight="700" fill="white" letter-spacing="1">FIN</text>`;

  // ── Target resolver ────────────────────────────────────────────────────
  interface Target {
    isEnd: boolean;
    idx?: number;
    y_top: number;
    y_center: number;
    x_right: number;
    x_left: number;
    cx: number;
  }

  function getTarget(routeType: string | undefined, routeNum: string | undefined, currentIndex: number): Target {
    if (routeType === 'end') {
      return { isEnd: true, y_top: endCy - 20, y_center: endCy, x_right: endCx + 60, x_left: endCx - 60, cx: endCx };
    }
    let tIdx = routeType === 'goto' ? parseInt(routeNum ?? '0') - 1 : currentIndex + 1;
    if (tIdx >= 0 && tIdx < computed.length) {
      const ts = computed[tIdx];
      const hw = ts.type === 'decision' ? D_HW : BOX_W / 2;
      return { isEnd: false, idx: tIdx, y_top: ts._y_top, y_center: ts._y_center, x_right: ts._cx + hw, x_left: ts._cx - hw, cx: ts._cx };
    }
    return { isEnd: true, y_top: endCy - 20, y_center: endCy, x_right: endCx + 60, x_left: endCx - 60, cx: endCx };
  }

  // ── Arrow builder ──────────────────────────────────────────────────────
  function getLinkSVG(
    fromNode: ComputedStep,
    routeType: string | undefined,
    routeNum: string | undefined,
    currentIndex: number,
    colorKey: string,
    label: string,
    isNonBranch: boolean,
  ): string {
    const t = getTarget(routeType, routeNum, currentIndex);
    const color = LINE_COLORS[colorKey];
    let path = '';

    let prefSide: string = 'auto';
    if (isNonBranch) {
      prefSide = fromNode.routeSideNon ?? 'auto';
    } else if (fromNode.type === 'decision') {
      prefSide = fromNode.routeSideOui ?? 'auto';
    } else {
      prefSide = fromNode.routeSideAct ?? 'auto';
    }

    let side = prefSide;
    if (!side || side === 'auto') {
      if (isNonBranch) {
        side = (t.idx !== undefined && t.idx < currentIndex) ? 'left' : 'right';
      } else {
        const isStraight = (t.idx === currentIndex + 1) || (t.isEnd && currentIndex === computed.length - 1);
        side = isStraight ? 'bottom' : 'right';
      }
    }

    const hw = fromNode.type === 'decision' ? D_HW : BOX_W / 2;
    let startX: number, startY: number;
    if (side === 'left') {
      startX = fromNode._cx - hw;
      startY = fromNode._y_center;
    } else if (side === 'right') {
      startX = fromNode._cx + hw;
      startY = fromNode._y_center;
    } else {
      startX = fromNode._cx;
      startY = fromNode._y_bottom;
    }

    // NON branch with nonAction box
    if (isNonBranch && fromNode.nonAction) {
      const boxTopX = fromNode._non_cx!;
      const boxTopY = fromNode._non_y_top!;
      if (side === 'left') {
        path += `<polyline points="${startX},${startY} ${boxTopX},${startY} ${boxTopX},${boxTopY - 6}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="5,3" marker-end="url(#arr-${colorKey})"/>`;
        if (label) path += `<text x="${startX - 10}" y="${startY - 5}" text-anchor="end" fill="${color}" font-size="10.5" font-weight="700">${label}</text>`;
      } else if (side === 'right') {
        path += `<polyline points="${startX},${startY} ${boxTopX},${startY} ${boxTopX},${boxTopY - 6}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="5,3" marker-end="url(#arr-${colorKey})"/>`;
        if (label) path += `<text x="${startX + 6}" y="${startY - 5}" fill="${color}" font-size="10.5" font-weight="700">${label}</text>`;
      } else {
        path += `<line x1="${startX}" y1="${startY}" x2="${boxTopX}" y2="${boxTopY - 6}" stroke="${color}" stroke-width="2" stroke-dasharray="5,3" marker-end="url(#arr-${colorKey})"/>`;
        if (label) path += `<text x="${startX + 8}" y="${startY + 15}" fill="${color}" font-size="10.5" font-weight="700">${label}</text>`;
      }
      const outX = fromNode._non_cx!;
      const outY = fromNode._non_y_bottom!;
      const targetEnterX = outX < t.cx ? t.x_left - 6 : outX > t.cx ? t.x_right + 6 : t.cx;
      if (outX === t.cx) {
        path += `<line x1="${outX}" y1="${outY}" x2="${t.cx}" y2="${t.y_top - 6}" stroke="${color}" stroke-width="2" stroke-dasharray="5,3" marker-end="url(#arr-${colorKey})"/>`;
      } else {
        path += `<polyline points="${outX},${outY} ${outX},${t.y_center} ${targetEnterX},${t.y_center}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="5,3" marker-end="url(#arr-${colorKey})"/>`;
      }
      return path;
    }

    // Regular arrows
    if (side === 'bottom') {
      const toX = t.cx;
      const toY = t.y_top - 6;
      if (startX === toX) {
        path += `<line x1="${startX}" y1="${startY}" x2="${toX}" y2="${toY}" stroke="${color}" stroke-width="2" marker-end="url(#arr-${colorKey})"/>`;
        if (label) path += `<text x="${startX + 8}" y="${startY + (toY - startY) / 2}" fill="${color}" font-size="10.5" font-weight="700">${label}</text>`;
      } else {
        const midY = startY + (toY - startY) / 2;
        path += `<polyline points="${startX},${startY} ${startX},${midY} ${toX},${midY} ${toX},${toY}" fill="none" stroke="${color}" stroke-width="2" marker-end="url(#arr-${colorKey})"/>`;
        if (label) path += `<text x="${startX + 8}" y="${startY + 15}" fill="${color}" font-size="10.5" font-weight="700">${label}</text>`;
      }
    } else if (side === 'right') {
      const rx = RAIL_R - (currentIndex % 4) * 6;
      const strokeType = isNonBranch ? 'stroke-dasharray="5,3"' : '';
      path += `<polyline points="${startX},${startY} ${rx},${startY} ${rx},${t.y_center} ${t.x_right + 6},${t.y_center}" fill="none" stroke="${color}" stroke-width="2" ${strokeType} marker-end="url(#arr-${colorKey})"/>`;
      if (label) path += `<text x="${startX + 6}" y="${startY - 5}" fill="${color}" font-size="10.5" font-weight="700">${label}</text>`;
    } else if (side === 'left') {
      const lx = RAIL_L + (currentIndex % 4) * 6;
      const strokeType = isNonBranch ? 'stroke-dasharray="5,3"' : '';
      path += `<polyline points="${startX},${startY} ${lx},${startY} ${lx},${t.y_center} ${t.x_left - 6},${t.y_center}" fill="none" stroke="${color}" stroke-width="2" ${strokeType} marker-end="url(#arr-${colorKey})"/>`;
      if (label) path += `<text x="${startX - 10}" y="${startY - 5}" text-anchor="end" fill="${color}" font-size="10.5" font-weight="700">${label}</text>`;
    }
    return path;
  }

  // ── Initial arrow from DÉBUT to first step ─────────────────────────────
  svg += `<line x1="${endCx}" y1="${padTop / 2 + 20}" x2="${computed[0]._cx}" y2="${computed[0]._y_top - 6}" stroke="${LINE_COLORS.gray}" stroke-width="2" marker-end="url(#arr-gray)"/>`;

  // ── Arrows between steps ───────────────────────────────────────────────
  computed.forEach((step, i) => {
    if (step.type === 'activite') {
      svg += getLinkSVG(step, step.routeTypeAct, step.routeNumAct, i, 'gray', '', false);
    } else {
      svg += getLinkSVG(step, step.routeTypeOui, step.routeNumOui, i, 'green', step.ouiLabel ?? '', false);
      svg += getLinkSVG(step, step.routeTypeNon, step.routeNumNon, i, 'red', step.nonLabel ?? '', true);
    }
  });

  // ── Step shapes ────────────────────────────────────────────────────────
  computed.forEach((step) => {
    const c = colorMap[step.acteur] ?? { fill: '#f8fafc', stroke: '#94a3b8', text: '#1e293b' };
    const maxChars = isSwim ? 22 : 44;

    if (step.type === 'decision') {
      const pts = `${step._cx},${step._y_top} ${step._cx + D_HW},${step._y_center} ${step._cx},${step._y_bottom} ${step._cx - D_HW},${step._y_center}`;
      svg += `<polygon points="${pts}" fill="#fef3c7" stroke="#d97706" stroke-width="2" filter="url(#sh)"/>`;
      wrapText(step.activite, isSwim ? 20 : 34)
        .slice(0, 3)
        .forEach((line, li, arr) => {
          const ty = step._y_center - ((arr.length - 1) * 14) / 2 + li * 14;
          svg += `<text x="${step._cx}" y="${ty + 4}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#78350f">${esc(line)}</text>`;
        });

      if (step.nonAction) {
        const nC = colorMap[step.nonActor ?? ''] ?? { fill: '#fef2f2', stroke: '#dc2626', text: '#b91c1c' };
        const nBw = isSwim ? BOX_W : 200;
        const nBx = step._non_cx! - nBw / 2;
        svg += `<rect x="${nBx}" y="${step._non_y_top}" width="${nBw}" height="${BOX_H}" rx="8" fill="${nC?.fill || '#fef2f2'}" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4,2" filter="url(#sh)"/>`;
        wrapText(step.nonAction, isSwim ? 22 : 24)
          .slice(0, 3)
          .forEach((line, li, arr) => {
            const ty = step._non_y_center! - ((arr.length - 1) * 15) / 2 - 5 + li * 15;
            svg += `<text x="${step._non_cx}" y="${ty + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="${nC?.text || '#b91c1c'}">${esc(line)}</text>`;
          });
        svg += `<text x="${step._non_cx}" y="${step._non_y_bottom! - 8}" text-anchor="middle" font-size="9.5" fill="#dc2626" font-weight="700">⚠️ ${esc(step.nonActor || step.acteur)}</text>`;
      }
    } else {
      const bx = step._cx - BOX_W / 2;
      svg += `<rect x="${bx}" y="${step._y_top}" width="${BOX_W}" height="${BOX_H}" rx="8" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.5" filter="url(#sh)"/>`;
      svg += `<circle cx="${bx + 24}" cy="${step._y_center}" r="14" fill="${c.stroke}"/><text x="${bx + 24}" y="${step._y_center + 4}" text-anchor="middle" font-size="11.5" font-weight="700" fill="white">${step.num}</text>`;
      wrapText(step.activite, maxChars)
        .slice(0, 3)
        .forEach((line, li, arr) => {
          const ty = step._y_center - ((arr.length - 1) * 15) / 2 - 5 + li * 15;
          svg += `<text x="${bx + 48}" y="${ty + 4}" font-size="12" font-weight="600" fill="${c.text}">${esc(line)}</text>`;
        });
      if (!isSwim) {
        svg += `<text x="${bx + BOX_W - 10}" y="${step._y_bottom - 8}" text-anchor="end" font-size="9.5" fill="${c.stroke}" font-weight="700">${esc(step.acteur)}</text>`;
      }
      if (step.outil) {
        svg += `<text x="${bx + 48}" y="${step._y_bottom - 8}" font-size="9" fill="#64748b">⚙ ${esc(step.outil.slice(0, 30))}</text>`;
      }
    }
  });

  svg += `</svg>`;

  // ── Legend HTML ────────────────────────────────────────────────────────
  let legendHtml = actors
    .map(
      (a) =>
        `<div class="legend-item"><div class="legend-dot" style="background:${colorMap[a]?.fill || '#ccc'};border:2px solid ${colorMap[a]?.stroke || '#999'};"></div>${esc(a)}</div>`,
    )
    .join('');
  if (steps.some((s) => s.type === 'decision')) {
    legendHtml += `<div class="legend-item"><div class="legend-diamond"></div>Décision (OUI/NON)</div>`;
  }

  return { svgStr: svg, legendHtml };
}
