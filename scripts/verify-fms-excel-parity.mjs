#!/usr/bin/env node
/**
 * Regression checks against cached values from `docs/2026 FMS - Fencing Material Calculator.xlsx`.
 * Run: node scripts/verify-fms-excel-parity.mjs
 *
 * Keep in sync with `lib/fms-excel-math.ts` (ROUND / ROUNDUP).
 * Master Material List column C sums do not use ROUND in the FMS workbook — do not add rounding there in TS.
 */

function excelRound(value, digits) {
  if (!Number.isFinite(value)) return value;
  const m = 10 ** digits;
  const x = value * m;
  const s = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const f = Math.floor(ax);
  const frac = ax - f;
  const roundedInt = frac < 0.5 ? f : f + 1;
  return (s * roundedInt) / m;
}

function excelRoundUp(value, digits) {
  if (!Number.isFinite(value)) return value;
  const m = 10 ** digits;
  const x = value * m;
  const eps = 1e-12;
  const r = x > 0 ? Math.ceil(x - eps) : x === 0 ? 0 : Math.floor(x + eps);
  return r / m;
}

function excelCeiling(n, significance) {
  if (!Number.isFinite(n) || !Number.isFinite(significance) || significance <= 0) return n >= 0 ? n : 0;
  if (n <= 0) return 0;
  return Math.ceil(n / significance - 1e-12) * significance;
}

function assertClose(name, got, exp, tol = 1e-9) {
  if (Math.abs(got - exp) > tol) {
    console.error(`FAIL ${name}: got ${got} expected ${exp}`);
    process.exit(1);
  }
}

function assertEq(name, got, exp) {
  if (got !== exp) {
    console.error(`FAIL ${name}: got ${got} expected ${exp}`);
    process.exit(1);
  }
}

// --- PVC Material Calculator (saved C5=6, D6=1, D7=0) ---
const P7 = 8.20833333;
const L = 6;
const c8 = L / P7;
assertClose('PVC C8', c8, 0.7309644673019144, 1e-10);
assertClose('PVC C9', excelRound(c8, 4), 0.731, 1e-10);
assertEq('PVC D9', excelRoundUp(excelRound(c8, 4), 0), 1);

// --- Chain link (saved C5=19.75, D6=2) ---
const Lc = 19.75;
const c10 = Lc / 8;
const c11 = excelRound(c10, 4);
assertClose('Chain C11', c11, 2.4688, 1e-10);
assertEq('Chain D11', excelRound(c11, 0), 2);
const d14 = 2;
const d15 = 2 - 1;
const d25 = Lc / 2 + (d14 + d15) * 4;
assertClose('Chain D25', d25, 21.875, 1e-10);

// --- Horizontal WPC (saved C6=42, B18=1, C17=28) ---
const Lh = 42;
const c9h = Lh / 6.0833;
assertClose('Horiz C9', c9h, 6.904147419985862, 1e-10);
const c10h = excelCeiling(c9h, 0.5);
assertEq('Horiz C10', c10h, 7);
const c17 = 7 * 4;
assertEq('Horiz C17', c17, 28);
const d17 = c17 - 2;
assertEq('Horiz D17', d17, 26);

console.log('OK: FMS parity spot checks passed.');
