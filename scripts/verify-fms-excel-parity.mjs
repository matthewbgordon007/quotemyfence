#!/usr/bin/env node
/**
 * Regression checks against `docs/2026 FMS - Fencing Material Calculator.xlsx`
 * (2026 FMS - Fencing Material Calculator-2.xlsx).
 *
 * Run: node scripts/verify-fms-excel-parity.mjs
 * Full PVC gate/fence parity: npx tsx scripts/verify-fms-excel-parity-ts.ts
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

// --- PVC 7′ block (C5=6, D6=1, D7=0) ---
const P7 = 8.20833333;
const L = 6;
const c8 = L / P7;
assertClose('PVC7 C8', c8, 0.7309644673019144, 1e-10);
assertClose('PVC7 C9', excelRound(c8, 4), 0.731, 1e-10);
assertEq('PVC7 D9', excelRoundUp(excelRound(c8, 4), 0), 1);

// D17 = ROUNDUP(C8*16, 0) for 4′ sample in workbook
const c8_4 = 4 / P7;
const d17_4 = excelRoundUp(c8_4 * 16, 0);
assertEq('PVC7 D17 (4ft)', d17_4, 8);
const d18_4 = excelRoundUp(c8_4 * 3, 1);
assertEq('PVC7 D18 (4ft)', d18_4, 1.5);

// --- PVC 6′ block (H5=87, I6=1) divisor /6 ---
const P6 = 6;
const L87 = 87;
const h8 = L87 / P6;
assertClose('PVC6 H8', h8, 14.5, 1e-10);
const h9 = excelRound(h8, 4);
const i9 = excelRoundUp(h9, 0);
assertEq('PVC6 I9', i9, 15);
const i12 = i9 + 1 - 1;
const g17In = L87 * 12 - 2 * i12;
const i17 = (g17In / 12) * 2;
assertEq('PVC6 I17 boards', i17, 169);
const i18 = excelRoundUp(h8 * 3, 1);
assertEq('PVC6 I18 board stiff', i18, 43.5);

// --- Chain link (C5=19.75, D6=2) ---
const Lc = 19.75;
const c10 = Lc / 8;
const c11 = excelRound(c10, 4);
assertClose('Chain C11', c11, 2.4688, 1e-10);
assertEq('Chain D11', excelRound(c11, 0), 2);
const d14 = 2;
const d15 = 2 - 1;
const d25 = Lc / 2 + (d14 + d15) * 4;
assertClose('Chain D25', d25, 21.875, 1e-10);

// --- Horizontal WPC (C6=42, B18=1, C17=28) ---
const Lh = 42;
const c9h = Lh / 6.0833;
assertClose('Horiz C9', c9h, 6.904147419985862, 1e-10);
const c10h = excelCeiling(c9h, 0.5);
assertEq('Horiz C10', c10h, 7);
const c17 = 7 * 4;
assertEq('Horiz C17', c17, 28);
const d17 = c17 - 2;
assertEq('Horiz D17', d17, 26);

console.log('OK: FMS Excel parity spot checks passed.');
