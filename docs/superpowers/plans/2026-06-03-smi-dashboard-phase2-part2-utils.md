# SMI Dashboard Phase 2 — Partie 2 : Utils + CSS + recharts

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Installer recharts, créer kpi-utils.ts (port TypeScript de qhse-dashboard2/src/utils/kpi.js), ajouter les classes CSS partagées pour les modules dashboard.

**Architecture:** `src/dashboard/kpi-utils.ts` est la source unique des calculs QHSE. Le thème est light-only, défini comme constante `T` dans chaque module. Pas de dark mode.

---

### Task 1 : Installer recharts

**Files:**
- Modify: `package.json`

- [ ] **Step 1 : npm install recharts**

```powershell
npm install recharts
```

Résultat attendu : `added X packages` sans erreur.

- [ ] **Step 2 : Vérifier le build**

```powershell
npm run build 2>&1 | Select-String -Pattern "error|Error" | Select-Object -First 5
```

Résultat attendu : aucune erreur TypeScript liée à recharts.

---

### Task 2 : Créer kpi-utils.ts

**Files:**
- Create: `src/dashboard/kpi-utils.ts`

- [ ] **Step 1 : Écrire le fichier**

```typescript
// src/dashboard/kpi-utils.ts
// Port TypeScript de qhse-dashboard2/src/utils/kpi.js

export function safeNumber(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function safeDate(input: unknown): Date | null {
  if (input === null || input === undefined || input === '') return null;
  const d = input instanceof Date ? input : new Date(input as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function diffJours(dateCible: unknown, dateRef: Date = new Date()): number | null {
  const c = safeDate(dateCible);
  const r = safeDate(dateRef);
  if (c === null || r === null) return null;
  return Math.ceil((c.getTime() - r.getTime()) / 86400000);
}

export function calcExpiration(dateObtention: unknown, validiteAnnees: unknown): Date | null {
  const debut = safeDate(dateObtention);
  if (!debut) return null;
  const n = safeNumber(validiteAnnees, NaN);
  if (!Number.isFinite(n)) return null;
  const exp = new Date(debut.getTime());
  exp.setFullYear(exp.getFullYear() + n);
  return Number.isFinite(exp.getTime()) ? exp : null;
}

export function safeMean(
  arr: unknown[],
  getter: (x: unknown) => unknown = (x) => x
): { value: number | null; hasData: boolean; count: number } {
  if (!Array.isArray(arr) || arr.length === 0) return { value: null, hasData: false, count: 0 };
  const valides = arr.map((x) => safeNumber(getter(x), NaN)).filter((n) => Number.isFinite(n));
  if (valides.length === 0) return { value: null, hasData: false, count: 0 };
  return { value: valides.reduce((s, n) => s + n, 0) / valides.length, hasData: true, count: valides.length };
}
```

- [ ] **Step 2 : Écrire les tests unitaires**

```typescript
// src/dashboard/kpi-utils.test.ts
import { describe, it, expect } from 'vitest';
import { diffJours, calcExpiration, safeNumber, safeMean } from './kpi-utils';

describe('safeNumber', () => {
  it('retourne fallback pour null', () => expect(safeNumber(null)).toBe(0));
  it('retourne le nombre', () => expect(safeNumber('42')).toBe(42));
  it('retourne fallback pour NaN', () => expect(safeNumber('abc')).toBe(0));
});

describe('diffJours', () => {
  it('retourne null pour date invalide', () => expect(diffJours(null)).toBeNull());
  it('retourne nombre positif pour date future', () => {
    const futur = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0];
    expect(diffJours(futur)).toBeGreaterThan(0);
  });
  it('retourne nombre négatif pour date passée', () => {
    const passe = '2020-01-01';
    expect(diffJours(passe)).toBeLessThan(0);
  });
});

describe('calcExpiration', () => {
  it('retourne null pour date invalide', () => expect(calcExpiration(null, 2)).toBeNull());
  it('retourne null pour validité invalide', () => expect(calcExpiration('2023-01-01', null)).toBeNull());
  it('calcule +2 ans', () => {
    const exp = calcExpiration('2023-06-01', 2);
    expect(exp?.getFullYear()).toBe(2025);
  });
});

describe('safeMean', () => {
  it('retourne hasData false pour tableau vide', () => expect(safeMean([])).toMatchObject({ hasData: false }));
  it('calcule la moyenne', () => expect(safeMean([2, 4, 6])).toMatchObject({ value: 4, hasData: true }));
});
```

- [ ] **Step 3 : Lancer les tests**

```powershell
npm test -- kpi-utils --run
```

Résultat attendu : `8 tests passed`.

- [ ] **Step 4 : Commit**

```powershell
git add src/dashboard/kpi-utils.ts src/dashboard/kpi-utils.test.ts
git commit -m "feat(dashboard): add kpi-utils TypeScript port + unit tests"
```

---

### Task 3 : CSS dashboard utilities

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1 : Ajouter les classes CSS partagées (après la règle .mase-card)**

```css
/* ── Dashboard module utilities ──────────────────────────────────────── */

.db-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.db-kpi {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
}

.db-input {
  width: 100%;
  padding: 6px 10px;
  font-size: 13px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  color: #0f172a;
  font-family: inherit;
  outline: none;
}

.db-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59,130,246,0.1);
}

.db-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  background: #166534;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.db-btn-primary:hover { opacity: 0.88; }
.db-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.db-btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  background: #f8fafc;
  color: #334155;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.db-btn-secondary:hover { background: #f1f5f9; }

.db-alert-red {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  color: #991b1b;
  font-size: 13px;
}

.db-alert-amber {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  color: #92400e;
  font-size: 13px;
}

.db-alert-green {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  color: #166534;
  font-size: 13px;
}

.db-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.db-table thead th {
  background: #f8fafc;
  padding: 10px 12px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  border-bottom: 2px solid #e2e8f0;
}

.db-table tbody td {
  padding: 8px 12px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  vertical-align: middle;
}

.db-table tbody tr:hover td {
  background: #fafafa;
}

.db-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 700;
}

.db-page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
```

- [ ] **Step 2 : Vérifier le build CSS**

```powershell
npm run build 2>&1 | Select-String -Pattern "error|Error" | Select-Object -First 5
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```powershell
git add src/index.css
git commit -m "feat(dashboard): add shared CSS utilities for dashboard modules"
```

---

**Fin Partie 2.** Continuer avec la Partie 3 (DUERP + PDCA).
