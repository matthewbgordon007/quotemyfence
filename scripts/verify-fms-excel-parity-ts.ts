/**
 * Full PVC + hybrid horizontal calculator parity vs workbook sample cells.
 * Run: npx tsx scripts/verify-fms-excel-parity-ts.ts
 */
import { computeFmsPvcFenceLine } from '../lib/fms-pvc-material-calculator.ts';
import { buildPvcAdobeBreakdown, computePvcMasterColumn } from '../lib/fms-pvc-breakdown-master.ts';
import { computeFmsPvcShortGate, sumGateAdobeRows } from '../lib/fms-pvc-gates-calculator.ts';
import {
  buildFmsHybridMasterList,
  classifyHybridHorizontalGateKind,
  computeHybridHorizontalAdjacentGate,
  computeHybridHorizontalDoubleGate,
  computeHybridHorizontalFence,
  computeHybridHorizontalGate,
  sumFmsHybridRows,
} from '../lib/fms-hybrid-calculators.ts';

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
assertEq('7ft line 4′ board D17', line7.board, 8);
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

// Short gate 48″, 1 post
const sg = computeFmsPvcShortGate({ gate_width_in: 48, posts: 1 });
assertEq('short gate posts', sg.adobe_gate_rows[18] ?? 0, 1);
assertEq('short gate rail', sg.adobe_gate_rows[21] ?? 0, 1);
assertEq('short gate long screw', sg.adobe_gate_rows[26] ?? 0, 10);
assertEq('short gate plug', sg.adobe_gate_rows[27] ?? 0, 17);
assertEq('short gate short screw', sg.adobe_gate_rows[25] ?? 0, 10);

// Adobe sums per-line finals (two-line job: 4′ 7ft + 87′ 6ft)
const adobe = buildPvcAdobeBreakdown([line7, line6], {}, 0);
assertEq('adobe rail sum', adobe[6] ?? 0, 30);
assertEq('adobe board sum', adobe[8] ?? 0, 177);
assertEq('adobe board stiff sum', adobe[9] ?? 0, 45);

// Master column with one short gate
const gates = sumGateAdobeRows([{ gate_width_in: 48, posts: 1 }], [], []);
const adobeG = buildPvcAdobeBreakdown([line7, line6], gates.merged, 48);
const master = computePvcMasterColumn(adobeG, {}, 1, 91);
const pick = (label: string) => master.find((r) => r.label === label)?.qty;
assertEq('master concrete', pick('Concrete') ?? 0, 16 * 2.5);
assertEq('master rail', pick('Rail') ?? 0, 31);
assertEq('master board', pick('Board') ?? 0, 184);

console.log('OK: PVC TypeScript parity checks passed.');

function pickHybrid(rows: { item: string; final: number }[], label: string) {
  const key = label.trim().toLowerCase();
  return rows.find((r) => r.item.trim().toLowerCase() === key)?.final ?? 0;
}

// Horizontal Material Calculator — saved workbook samples
const wg6 = computeHybridHorizontalFence({ length_ft: 4, h_post: 1, u_channel: 0 }, 'woodGrain', 6);
assertEq('hyb WG 6ft 4′ h post', pickHybrid(wg6.rows, 'Aluminum H Post'), 1);
assertEq('hyb WG 6ft 4′ rail', pickHybrid(wg6.rows, "6' Rail"), 2);
assertEq('hyb WG 6ft 4′ board', pickHybrid(wg6.rows, 'Board'), 12);
assertEq('hyb WG 6ft 4′ long screw', pickHybrid(wg6.rows, 'Long Black Screw (2.5)'), 4);

const wg7 = computeHybridHorizontalFence({ length_ft: 29, h_post: 2, u_channel: 0 }, 'woodGrain', 7);
assertEq('hyb WG 7ft 29′ h post', pickHybrid(wg7.rows, 'Aluminum H Post'), 6);
assertEq('hyb WG 7ft 29′ board', pickHybrid(wg7.rows, 'Board'), 70);

const sl6 = computeHybridHorizontalFence({ length_ft: 5, h_post: 1, u_channel: 0 }, 'slatted', 6);
assertEq('hyb slatted 6ft board', pickHybrid(sl6.rows, 'Board'), 11);

const sl7 = computeHybridHorizontalFence({ length_ft: 2.5, h_post: 1, u_channel: 0 }, 'slatted', 7);
assertEq('hyb slatted 7ft rail', pickHybrid(sl7.rows, "6' Rail"), 1);
assertEq('hyb slatted 7ft board', pickHybrid(sl7.rows, 'Board'), 6.5);

const al6 = computeHybridHorizontalFence({ length_ft: 69, h_post: 0, u_channel: 1 }, 'aluminum', 6);
assertEq('hyb alu 6ft h post', pickHybrid(al6.rows, 'Aluminum H Post'), 11);
assertEq('hyb alu 6ft long screw u1', pickHybrid(al6.rows, 'Long Black Screw (2.5)'), 46);
assertEq('hyb alu 6ft board', pickHybrid(al6.rows, 'Board'), 195.5);

const al7 = computeHybridHorizontalFence({ length_ft: 34, h_post: 2, u_channel: 1 }, 'aluminum', 7);
assertEq('hyb alu 7ft long screw u1', pickHybrid(al7.rows, 'Long Black Screw (2.5)'), 22);

const sgH = computeHybridHorizontalGate({ gate_width_in: 60, posts: 1 }, 'woodGrain', 6);
assertEq('hyb simple gate board', pickHybrid(sgH.rows, 'Board'), 12);

const adj = computeHybridHorizontalAdjacentGate({ gate_line_width_in: 92, adjoining: 0 });
assertEq('hyb adjacent board', pickHybrid(adj.rows, 'Board'), 18);
assertEq('hyb adjacent 8ft rail', pickHybrid(adj.rows, '8 foot Rail'), 2);

const dbl = computeHybridHorizontalDoubleGate({ gate_line_width_in: 108, adjoining: 0 });
assertEq('hyb double board', pickHybrid(dbl.rows, 'Board'), 20);
assertEq('hyb double 8ft rail', pickHybrid(dbl.rows, '8 foot Rail'), 3);

assertEq('hyb gate kind 48 simple', classifyHybridHorizontalGateKind(48, 'adjacent'), 'simple');
assertEq('hyb gate kind 92 adjacent', classifyHybridHorizontalGateKind(92, 'adjacent'), 'adjacent');
assertEq('hyb gate kind 108 double', classifyHybridHorizontalGateKind(108, 'double'), 'double');
assertEq('hyb gate kind 108 adjacent', classifyHybridHorizontalGateKind(108, 'adjacent'), 'adjacent');

const hybTotals = sumFmsHybridRows([wg6.rows, wg7.rows, sgH.rows]);
const hybMaster = buildFmsHybridMasterList(hybTotals, 'horizontal');
assertEq('hyb master concrete', hybMaster.find((r) => r.item === 'Concrete')?.final ?? 0, 8 * 2.5);

console.log('OK: Hybrid horizontal TypeScript parity checks passed.');
