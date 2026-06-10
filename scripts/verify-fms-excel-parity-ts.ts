/**
 * Full PVC calculator parity vs workbook sample cells.
 * Run: npx tsx scripts/verify-fms-excel-parity-ts.ts
 */
import { computeFmsPvcFenceLine } from '../lib/fms-pvc-material-calculator.ts';
import { buildPvcAdobeBreakdown, computePvcMasterColumn } from '../lib/fms-pvc-breakdown-master.ts';
import { computeFmsPvcShortGate, sumGateAdobeRows } from '../lib/fms-pvc-gates-calculator.ts';

function assertClose(name: string, got: number, exp: number, tol = 1e-9) {
  if (Math.abs(got - exp) > tol) {
    console.error(`FAIL ${name}: got ${got} expected ${exp}`);
    process.exit(1);
  }
}

function assertEq(name: string, got: number, exp: number) {
  if (got !== exp) {
    console.error(`FAIL ${name}: got ${got} expected ${exp}`);
    process.exit(1);
  }
}

// Material Calculator - PVC saved samples (columns C and H)
const line7 = computeFmsPvcFenceLine({
  length_ft: 4,
  fence_terminated_h_post_type: 0,
  fence_terminated_u_channel: 0,
  panel_module: 'nominal_7ft',
});
assertEq('7ft line 4′ rail D15', line7.rail, 1);
assertClose('7ft line 4′ board D17', line7.board, 7.796954318, 1e-9);
assertEq('7ft line 4′ board stiff D18', line7.board_stiffener, 1.5);
assertEq('7ft line 4′ posts D12', line7.h_post, 0);

const line6 = computeFmsPvcFenceLine({
  length_ft: 87,
  fence_terminated_h_post_type: 1,
  fence_terminated_u_channel: 0,
  panel_module: 'nominal_6ft',
});
assertEq('6ft line 87′ rail I15', line6.rail, 29);
assertEq('6ft line 87′ boards I17', line6.board, 169);
assertEq('6ft line 87′ board stiff I18', line6.board_stiffener, 43.5);
assertEq('6ft line 87′ posts I12', line6.h_post, 15);

// Short gate C28=48, C29=1
const sg = computeFmsPvcShortGate({ gate_width_in: 48, posts: 1 });
assertEq('short gate posts', sg.adobe_gate_rows[18] ?? 0, 1);
assertEq('short gate rail', sg.adobe_gate_rows[21] ?? 0, 1);
assertEq('short gate long screw', sg.adobe_gate_rows[26] ?? 0, 10);
assertEq('short gate plug', sg.adobe_gate_rows[27] ?? 0, 17);

// Adobe sums per-line finals (two-line job: 4′ 7ft + 87′ 6ft)
const adobe = buildPvcAdobeBreakdown([line7, line6], {}, 0);
assertEq('adobe rail sum', adobe[6] ?? 0, 30);
assertClose('adobe board sum', adobe[8] ?? 0, 176.796954318, 1e-9);
assertEq('adobe board stiff sum', adobe[9] ?? 0, 45);

// Master column with one short gate
const gates = sumGateAdobeRows([{ gate_width_in: 48, posts: 1 }], [], []);
const adobeG = buildPvcAdobeBreakdown([line7, line6], gates.merged, 48);
const master = computePvcMasterColumn(adobeG, {}, 1, 91);
const pick = (label: string) => master.find((r) => r.label === label)?.qty;
assertEq('master concrete', pick('Concrete') ?? 0, 16 * 2.5);
assertEq('master rail', pick('Rail') ?? 0, 31);
assertClose('master board', pick('Board') ?? 0, 183.796954318, 1e-9);

console.log('OK: PVC TypeScript parity checks passed.');
