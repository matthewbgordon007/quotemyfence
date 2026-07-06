/**
 * Full PVC + hybrid horizontal/vertical calculator parity vs workbook sample cells.
 * Run: npx tsx scripts/verify-fms-excel-parity-ts.ts
 */
import { computeFmsPvcFenceLine } from '../lib/fms-pvc-material-calculator.ts';
import { buildPvcAdobeBreakdown, computePvcMasterColumn } from '../lib/fms-pvc-breakdown-master.ts';
import { computeFmsPvcShortGate, FMS_GATE_POST_COUNT, sumGateAdobeRows } from '../lib/fms-pvc-gates-calculator.ts';
import {
  layoutPointsToSegmentPairs,
  segmentRunEndTerminationsForSketch,
} from '../lib/layout-sketch-to-pvc-inputs.ts';
import {
  buildFmsHybridMasterList,
  classifyHybridHorizontalGateKind,
  classifyHybridVGateInputs,
  computeHybridHorizontalAdjacentGate,
  computeHybridHorizontalDoubleGate,
  computeHybridHorizontalFence,
  computeHybridHorizontalGate,
  computeHybridVerticalGateBlockRows,
  computeHybridVerticalGateDouble,
  computeHybridVerticalGateSingle,
  computeHybridVerticalPvc64Fence,
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

// Vertical Material Calculator — saved workbook samples (6'4" PVC, 8' spacing)
const veFence = computeHybridVerticalPvc64Fence({ length_ft: 1.5, h_post: 1, u_channel: 0 });
assertEq('hyb V 1.5′ h post', pickHybrid(veFence.rows, 'Aluminum H Post'), 1);
assertEq('hyb V 1.5′ 8ft rail', pickHybrid(veFence.rows, "8' Rail"), 1);
assertEq('hyb V 1.5′ 72in board', pickHybrid(veFence.rows, '72" Board'), 3);
assertEq('hyb V 1.5′ board stiff', pickHybrid(veFence.rows, 'Board Stiffener'), 1);
assertEq('hyb V 1.5′ long screw', pickHybrid(veFence.rows, 'Long Black Screw (2.5)'), 4);

const veFenceLong = computeHybridVerticalPvc64Fence({ length_ft: 16, h_post: 2, u_channel: 1 });
assertEq('hyb V 16′ h post', pickHybrid(veFenceLong.rows, 'Aluminum H Post'), 3);
assertEq('hyb V 16′ u channel', pickHybrid(veFenceLong.rows, 'U Channel'), 1);
assertEq('hyb V 16′ small screw u1', pickHybrid(veFenceLong.rows, 'Small Black Screw (3/4)'), 6);

const veSingle = computeHybridVerticalGateSingle({ gate_width_in: 48, posts: 1 });
assertEq('hyb V single gate board', pickHybrid(veSingle.rows, 'Board'), 8);
assertEq('hyb V single gate side plate', pickHybrid(veSingle.rows, 'Gate Side Plate'), 2);

const veDouble = computeHybridVerticalGateDouble({ gate_width_in: 96, posts: 1 });
assertEq('hyb V double gate board', pickHybrid(veDouble.rows, 'Board'), 16);
assertEq('hyb V double gate cross brace', pickHybrid(veDouble.rows, 'Gate Cross Brace (Hybrid/Metal)'), 2);
assertEq('hyb V double drop rod', pickHybrid(veDouble.rows, 'Drop Rod + Sleeve'), 1);

const veClassified = classifyHybridVGateInputs(
  [{ width_in: '48', posts: 1 }],
  [{ width_in: '72', posts: 1 }],
  [{ width_in: '96', posts: 1 }]
);
assertEq('hyb V classify short→single', veClassified[0]?.block, 'single');
assertEq('hyb V classify single', veClassified[1]?.block, 'single');
assertEq('hyb V classify double', veClassified[2]?.block, 'double');
assertEq(
  'hyb V block rows 48',
  pickHybrid(computeHybridVerticalGateBlockRows(veClassified[0]!), 'Board'),
  8
);

const veTotals = sumFmsHybridRows([veFence.rows, veSingle.rows]);
const veMaster = buildFmsHybridMasterList(veTotals, 'vertical');
assertEq('hyb V master concrete', veMaster.find((r) => r.item === 'Concrete')?.final ?? 0, 5);
assertEq('hyb V master board', veMaster.find((r) => r.item === 'Board')?.final ?? 0, 11);

console.log('OK: Hybrid vertical TypeScript parity checks passed.');

function d6FromRunEnds(ends: { start: { h_post: boolean }; end: { h_post: boolean } }) {
  return (ends.start.h_post ? 1 : 0) + (ends.end.h_post ? 1 : 0);
}

// Inline gate split: left 38′ | gate 4′ | right 38′ — fence sides must not post at the gate edge.
const splitPts = [
  { x: 0, y: 0 },
  { x: 0, y: 38 },
  { x: 0, y: 42 },
  { x: 0, y: 80 },
];
const splitMeta = [{ length_ft: 38 }, { length_ft: 4 }, { length_ft: 38 }];
const splitPairs = layoutPointsToSegmentPairs(splitPts, splitMeta);
const splitLengths = [38, 4, 38];
const splitGates = [{ type: 'single' as const, line_index: 1 }];
const leftEnds = segmentRunEndTerminationsForSketch(splitPairs, splitLengths, 0, {
  gatePlacements: splitGates,
});
const rightEnds = segmentRunEndTerminationsForSketch(splitPairs, splitLengths, 2, {
  gatePlacements: splitGates,
});
assertEq('split left d6', d6FromRunEnds(leftEnds!), 1);
assertEq('split left gate end no post', leftEnds!.end.h_post ? 1 : 0, 0);
assertEq('split right d6', d6FromRunEnds(rightEnds!), 1);
assertEq('split right gate start no post', rightEnds!.start.h_post ? 1 : 0, 0);

const leftFence = computeFmsPvcFenceLine({
  length_ft: 38,
  fence_terminated_h_post_type: d6FromRunEnds(leftEnds!) as 0 | 1 | 2,
  fence_terminated_u_channel: 0,
  panel_module: 'nominal_7ft',
});
const rightFence = computeFmsPvcFenceLine({
  length_ft: 38,
  fence_terminated_h_post_type: d6FromRunEnds(rightEnds!) as 0 | 1 | 2,
  fence_terminated_u_channel: 0,
  panel_module: 'nominal_7ft',
});
const walkGate = computeFmsPvcShortGate({ gate_width_in: 48, posts: FMS_GATE_POST_COUNT });
const splitPostTotal = leftFence.h_post + rightFence.h_post + (walkGate.adobe_gate_rows[18] ?? 0);
assertEq('split inline gate post total', splitPostTotal, 11);

console.log('OK: Inline gate split post checks passed.');
