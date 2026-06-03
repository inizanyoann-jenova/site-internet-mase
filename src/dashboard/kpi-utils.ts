// src/dashboard/kpi-utils.ts
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
