'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  firstSheetColorLineRecipeDefaults,
  firstSheetFieldSpecs,
  firstSheetGateLineRecipeDefaults,
  pvcLinePostsForMaterials,
  pvcLinePostsIncludingGatePosts,
  pvcLongScrewFinalFromSheet,
  pvcPlugFinalFromSheet,
  pvcWholePanelsD9,
  starterMaterialCalculatorTemplate,
  type MaterialCalculatorInputField,
  type MaterialCalculatorRecipeItem,
} from '@/lib/material-calculator-framework';
import { fmsPvcColorLineMaterialFinals, fmsPvcConcreteBags, fmsPvcGateMaterialFinals } from '@/lib/fms-pvc-calculator';
import { fmsHybridVeHhPvcColorLineFinals, fmsHybridVeHhPvcGateFinals } from '@/lib/fms-hybrid-ve-horizontal-pvc';
import { fmsVerticalHybridColorLineFinals } from '@/lib/fms-hybrid-ve-vertical-line';

const field =
  'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20';

const cardShell =
  'overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm';

const cardHeader =
  'border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-white to-indigo-50/40 px-5 py-4 sm:px-6';

type SampleLine = {
  length_ft: number;
  h_post_terminations: number;
  u_channel_terminations: number;
};

type SampleGateLine = {
  line_width_inches: number;
  posts_needed: number;
};

type HybridVeHorizontalGateInputs = {
  gateLineWidthInches: number;
  gatePostsNeeded: number;
  sideLayoutWidthInches: number;
  adjoiningMode: number;
};

type VerticalHybridInputs = {
  lineLengthFt: number;
  hPostTerminations: number;
  uChannelTerminations: number;
};

const inputFieldLabels: Record<MaterialCalculatorInputField, string> = {
  line_length_ft: 'Line length',
  exact_panels: 'Exact panels',
  rounded_panels: 'Rounded panels',
  line_posts_including_first: 'Post count (fence D9+D6−1 + gate posts)',
  pvc_long_screw_sheet_final: 'Long screw Final (PVC IF on U channel)',
  pvc_plug_sheet_final: 'Plug Final (PVC IF on U channel)',
  h_post_terminations: 'H post terminations',
  u_channel_terminations: 'U channel terminations',
  gate_unit: 'Gate unit',
  gate_posts_needed: 'Gate posts needed',
  gate_total_boards: 'Gate total boards',
};

function roundForMode(value: number, mode: MaterialCalculatorRecipeItem['rounding_mode']) {
  if (mode === 'none') return value;
  if (mode === 'nearest') return Math.round(value);
  return Math.ceil(value);
}

function materialKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function formatQty(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return n.toFixed(2);
}

/** First segment before comma/pipe — used as the master list column header (e.g. "Adobe, 6ft" → "Adobe"). */
function colorHeadingFromDescription(description: string): string {
  const t = description.trim();
  if (!t) return 'Color';
  const head = t.split(/[,|]/)[0]?.trim();
  return head || 'Color';
}

type FenceTypeRow = { id: string; name?: string | null; standard_height_ft?: number | null };
type FenceStyleRow = { id: string; fence_type_id: string; style_name?: string | null };
type ColourOptionRow = { id: string; fence_style_id: string; color_name: string };

type ProductHierarchyPayload = {
  fenceTypes: FenceTypeRow[];
  fenceStyles: FenceStyleRow[];
  colourOptions: ColourOptionRow[];
};

type HybridHorizontalSelection = {
  heightFt: number | null;
  colorName: string;
};

type HybridHorizontalInputs = {
  lineLabel: string;
  lineLengthFt: number;
  hPostTerminations: number;
  uChannelTerminations: number;
  gateLabel: string;
  gateWidthInches: number;
  gatePostsNeeded: number;
};

type HybridHorizontalFamilyConfig = {
  boardQtyPerRoundedPanel: number;
  gateBoardQtyFullWidth: number;
};

function parseStarterDescription(desc: string): { colorName: string; heightFt: number | null } {
  const t = desc.trim();
  const parts = t.split(',').map((s) => s.trim()).filter(Boolean);
  const colorName = parts[0] ?? '';
  const heightPart = parts[1] ?? '';
  const m = heightPart.match(/(\d+(?:\.\d+)?)\s*ft/i);
  const heightFt = m ? Number(m[1]) : null;
  return { colorName, heightFt };
}

function typeHeightFt(t: FenceTypeRow): number {
  return Number(t.standard_height_ft ?? 6);
}

function uniqueHeightsForTypes(fenceTypes: FenceTypeRow[]): number[] {
  const s = new Set<number>();
  for (const t of fenceTypes) s.add(typeHeightFt(t));
  return Array.from(s).sort((a, b) => a - b);
}

function colorNamesForHeight(
  heightFt: number,
  fenceTypes: FenceTypeRow[],
  fenceStyles: FenceStyleRow[],
  colourOptions: ColourOptionRow[],
): string[] {
  const typeIds = new Set(fenceTypes.filter((t) => typeHeightFt(t) === heightFt).map((t) => t.id));
  const styleIds = new Set(fenceStyles.filter((s) => typeIds.has(s.fence_type_id)).map((s) => s.id));
  const names = colourOptions
    .filter((c) => styleIds.has(c.fence_style_id))
    .map((c) => c.color_name.trim())
    .filter(Boolean);
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
}

function hybridHorizontalTypeRows(fenceTypes: FenceTypeRow[]): FenceTypeRow[] {
  return fenceTypes.filter((t) => (t.name || '').toLowerCase().includes('hybrid horizontal'));
}

function hybridHorizontalStyleNames(fenceTypes: FenceTypeRow[], fenceStyles: FenceStyleRow[]): string[] {
  const typeIds = new Set(hybridHorizontalTypeRows(fenceTypes).map((t) => t.id));
  const preferredOrder = [
    'Wood Grain WPC',
    'Slatted WPC + PVC',
    'Aluminum',
    'Standard',
    'Triple Top Standard',
    'Premium',
    'Triple Top Premium',
  ];
  const names = Array.from(
    new Set(
      fenceStyles
        .filter((s) => typeIds.has(s.fence_type_id))
        .map((s) => (s.style_name || '').trim())
        .filter(Boolean),
    ),
  );
  return names.sort((a, b) => {
    const ai = preferredOrder.indexOf(a);
    const bi = preferredOrder.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
    return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
  });
}

function hybridHorizontalHeightsForStyle(styleName: string, fenceTypes: FenceTypeRow[], fenceStyles: FenceStyleRow[]): number[] {
  const matchingStyleTypeIds = new Set(
    fenceStyles
      .filter((s) => (s.style_name || '').trim() === styleName)
      .map((s) => s.fence_type_id),
  );
  const heights = hybridHorizontalTypeRows(fenceTypes)
    .filter((t) => matchingStyleTypeIds.has(t.id))
    .map(typeHeightFt)
    .filter(Number.isFinite);
  return Array.from(new Set(heights)).sort((a, b) => a - b);
}

function hybridHorizontalColoursForStyleAndHeight(
  styleName: string,
  heightFt: number,
  fenceTypes: FenceTypeRow[],
  fenceStyles: FenceStyleRow[],
  colourOptions: ColourOptionRow[],
): string[] {
  const typeIds = new Set(
    hybridHorizontalTypeRows(fenceTypes)
      .filter((t) => typeHeightFt(t) === heightFt)
      .map((t) => t.id),
  );
  const styleIds = new Set(
    fenceStyles
      .filter((s) => typeIds.has(s.fence_type_id) && (s.style_name || '').trim() === styleName)
      .map((s) => s.id),
  );
  const names = colourOptions
    .filter((c) => styleIds.has(c.fence_style_id))
    .map((c) => c.color_name.trim())
    .filter(Boolean);
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
}

function defaultHybridHorizontalInputs(): HybridHorizontalInputs {
  return {
    lineLabel: '',
    lineLengthFt: 0,
    hPostTerminations: 0,
    uChannelTerminations: 0,
    gateLabel: '',
    gateWidthInches: 0,
    gatePostsNeeded: 0,
  };
}

function hybridHorizontalFamilyConfig(styleName: string, heightFt: number | null): HybridHorizontalFamilyConfig | null {
  if (heightFt == null) return null;
  const roundedHeight = Math.round(heightFt);
  if (styleName === 'Wood Grain WPC') {
    return roundedHeight >= 7
      ? { boardQtyPerRoundedPanel: 14, gateBoardQtyFullWidth: 14 }
      : { boardQtyPerRoundedPanel: 12, gateBoardQtyFullWidth: 12 };
  }
  if (styleName === 'Slatted WPC + PVC') {
    return roundedHeight >= 7
      ? { boardQtyPerRoundedPanel: 13, gateBoardQtyFullWidth: 13 }
      : { boardQtyPerRoundedPanel: 11, gateBoardQtyFullWidth: 11 };
  }
  if (styleName === 'Aluminum') {
    return roundedHeight >= 7
      ? { boardQtyPerRoundedPanel: 19, gateBoardQtyFullWidth: 19 }
      : { boardQtyPerRoundedPanel: 17, gateBoardQtyFullWidth: 17 };
  }
  return null;
}

const HYBRID_HORIZONTAL_PANEL_LENGTH_FT = 6.0833;

function hybridHalfPanelCeiling(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value * 2) / 2;
}

function hybridRoundedWholePanels(halfPanelCeil: number): number {
  if (!Number.isFinite(halfPanelCeil) || halfPanelCeil <= 0) return 0;
  return Math.ceil(halfPanelCeil);
}

type HybridHorizontalMaterialRow = { name: string; qty: number };

const HYBRID_HORIZONTAL_MASTER_ROWS = [
  'Concrete',
  'Aluminum HPost 120"',
  'Aluminum HPost Cap',
  '3" Aluminum Pocket Rail 72"',
  'Board',
  'Outer U-Channel',
  'Inner U-Channel',
  'Aluminum Gate Side Frame',
  'Aluminum Gate Post Cap',
  'Adjustable Aluminum Gate Brace',
  'Long Black Screw (2.5")',
  'Rail Screw (1.5" x #10)',
  'Plugs (7/8")',
  'Gate Screw (1.5")',
  'U-Channel Screw (3/4")',
  'Latch kit',
  'Hinge Kit',
  'Base Plate w Screws',
  'Drop Rod',
] as const;

const supplierMaterialCalculatorStarterColourHeight = parseStarterDescription(
  starterMaterialCalculatorTemplate.description,
);

type MasterSheetRow =
  | { kind: 'item'; label: string; matchNames: string[] }
  | { kind: 'section'; label: string };

/** Spreadsheet order: labels match the supplier sheet; `matchNames` tie to recipe `name` values (merged totals). */
const MASTER_MATERIAL_SHEET_ROWS: MasterSheetRow[] = [
  { kind: 'item', label: 'Concrete', matchNames: ['Concrete'] },
  { kind: 'item', label: 'Rail', matchNames: ['Rail'] },
  { kind: 'item', label: 'Rail Stiffener', matchNames: ['Rail Stiffener'] },
  { kind: 'item', label: 'Board', matchNames: ['Board'] },
  { kind: 'item', label: 'Board Stiffener', matchNames: ['Board Stiffener'] },
  { kind: 'item', label: 'H-Post', matchNames: ['H Post'] },
  { kind: 'item', label: 'H-Post Stiffener', matchNames: ['H-Post Stiffener', 'H Post Stiffener'] },
  { kind: 'item', label: 'Galvanized Post', matchNames: ['Galvanized Post'] },
  { kind: 'item', label: 'U-Channel', matchNames: ['U Channel'] },
  { kind: 'section', label: 'Post Filler' },
  { kind: 'item', label: 'Post Cap', matchNames: ['Cap (H Post)', 'Cap (H post)'] },
  { kind: 'item', label: 'Overhead Brace', matchNames: ['Gate OverHead Brace', 'Gate Overhead Brace'] },
  { kind: 'item', label: 'Diagonal Brace', matchNames: ['Gate Cross Brace'] },
  { kind: 'item', label: 'Hole Cap', matchNames: ['Hole Cap', 'Plug'] },
  { kind: 'item', label: 'Large Screw', matchNames: ['Long Screw'] },
  { kind: 'item', label: 'Small Screw', matchNames: ['Short Screw'] },
  { kind: 'item', label: '*PREMIUM*Latch', matchNames: ['Latch kit', 'Latch Kit'] },
  { kind: 'item', label: '*PREMIUM*Hinge', matchNames: ['Hinge Kit', 'Hinge kit'] },
  { kind: 'section', label: 'Drop Rod/Sleeve' },
  { kind: 'section', label: 'Base Plates' },
];

const MASTER_SHEET_COLOR_COL = '#FDE9A9';
const MASTER_SHEET_SECTION_BG = '#55FF33';

const masterSheetCellInput =
  'min-h-[2.25rem] w-full border-0 bg-transparent px-2 py-1.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-600/70 focus:bg-white/40 focus:ring-2 focus:ring-blue-500/25';

function lookupMaterialTotal(totals: Map<string, number>, matchNames: string[]): number {
  for (const name of matchNames) {
    const key = materialKey(name);
    if (totals.has(key)) return totals.get(key) ?? 0;
  }
  return 0;
}

/** H-post stiffener count follows hinge count; if stiffener is not in the recipe, fall back to hinge kit totals. */
function lookupHPostStiffenerQty(totals: Map<string, number>): number {
  return Math.max(
    lookupMaterialTotal(totals, ['H Post Stiffener', 'H-Post Stiffener']),
    lookupMaterialTotal(totals, ['Hinge Kit', 'Hinge kit']),
  );
}

export function SupplierMaterialCalculatorFramework() {
  const [title, setTitle] = useState(starterMaterialCalculatorTemplate.title);
  const [selectedHeightFt, setSelectedHeightFt] = useState<number | null>(supplierMaterialCalculatorStarterColourHeight.heightFt);
  const [selectedColorName, setSelectedColorName] = useState(supplierMaterialCalculatorStarterColourHeight.colorName);
  const [productHierarchy, setProductHierarchy] = useState<ProductHierarchyPayload | null>(null);
  const [productHierarchyLoading, setProductHierarchyLoading] = useState(true);
  const [productHierarchyError, setProductHierarchyError] = useState<string | null>(null);

  const [panelLengthFt, setPanelLengthFt] = useState(starterMaterialCalculatorTemplate.panel_length_ft);
  const [sampleLine, setSampleLine] = useState<SampleLine>({
    length_ft: 70,
    h_post_terminations: 3,
    u_channel_terminations: 2,
  });
  const [recipeItems, setRecipeItems] = useState(firstSheetColorLineRecipeDefaults);
  const [gateRecipeItems, setGateRecipeItems] = useState(firstSheetGateLineRecipeDefaults);
  const [sampleGateLine, setSampleGateLine] = useState<SampleGateLine>({
    line_width_inches: 60,
    posts_needed: 2,
  });
  const [hybridVeGate, setHybridVeGate] = useState<HybridVeHorizontalGateInputs>({
    gateLineWidthInches: 48,
    gatePostsNeeded: 1,
    sideLayoutWidthInches: 92,
    adjoiningMode: 0,
  });
  const [verticalHybrid, setVerticalHybrid] = useState<VerticalHybridInputs>({
    lineLengthFt: 21,
    hPostTerminations: 2,
    uChannelTerminations: 2,
  });
  const [masterSheetCellEdits, setMasterSheetCellEdits] = useState<Record<string, string>>({});
  const [hybridHorizontalSelections, setHybridHorizontalSelections] = useState<Record<string, HybridHorizontalSelection>>({});
  const [hybridHorizontalInputs, setHybridHorizontalInputs] = useState<Record<string, HybridHorizontalInputs>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProductHierarchyLoading(true);
      setProductHierarchyError(null);
      try {
        const r = await fetch('/api/contractor/product-hierarchy', { cache: 'no-store', credentials: 'include' });
        const j = (await r.json()) as ProductHierarchyPayload & { error?: string };
        if (!r.ok) throw new Error(j.error || 'Could not load products');
        if (cancelled) return;
        const fenceTypes = j.fenceTypes ?? [];
        const fenceStyles = j.fenceStyles ?? [];
        const colourOptions = j.colourOptions ?? [];
        setProductHierarchy({ fenceTypes, fenceStyles, colourOptions });

        const heights = uniqueHeightsForTypes(fenceTypes);
        if (heights.length > 0) {
          const wantH = supplierMaterialCalculatorStarterColourHeight.heightFt;
          const h = wantH != null && heights.includes(wantH) ? wantH : heights[0];
          const colors = colorNamesForHeight(h, fenceTypes, fenceStyles, colourOptions);
          const wantC = supplierMaterialCalculatorStarterColourHeight.colorName;
          const c = wantC && colors.includes(wantC) ? wantC : colors[0] ?? '';
          setSelectedHeightFt(h);
          setSelectedColorName(c);
        }

        const hybridStyles = hybridHorizontalStyleNames(fenceTypes, fenceStyles);
        setHybridHorizontalSelections((prev) => {
          const next: Record<string, { heightFt: number | null; colorName: string }> = {};
          for (const styleName of hybridStyles) {
            const heightsForStyle = hybridHorizontalHeightsForStyle(styleName, fenceTypes, fenceStyles);
            const prevSelection = prev[styleName];
            const heightFt =
              prevSelection?.heightFt != null && heightsForStyle.includes(prevSelection.heightFt)
                ? prevSelection.heightFt
                : (heightsForStyle[0] ?? null);
            const coloursForStyle =
              heightFt != null
                ? hybridHorizontalColoursForStyleAndHeight(styleName, heightFt, fenceTypes, fenceStyles, colourOptions)
                : [];
            next[styleName] = {
              heightFt,
              colorName:
                prevSelection?.colorName && coloursForStyle.includes(prevSelection.colorName)
                  ? prevSelection.colorName
                  : (coloursForStyle[0] ?? ''),
            };
          }
          return next;
        });
        setHybridHorizontalInputs((prev) => {
          const next: Record<string, HybridHorizontalInputs> = {};
          for (const styleName of hybridStyles) {
            next[styleName] = prev[styleName] ?? defaultHybridHorizontalInputs();
          }
          return next;
        });
      } catch (e) {
        if (!cancelled) setProductHierarchyError(e instanceof Error ? e.message : 'Could not load products');
      } finally {
        if (!cancelled) setProductHierarchyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const heightOptions = useMemo(() => {
    if (!productHierarchy?.fenceTypes.length) return [];
    return uniqueHeightsForTypes(productHierarchy.fenceTypes);
  }, [productHierarchy]);

  const colourOptionsForHeight = useMemo(() => {
    if (!productHierarchy || selectedHeightFt == null) return [];
    return colorNamesForHeight(
      selectedHeightFt,
      productHierarchy.fenceTypes,
      productHierarchy.fenceStyles,
      productHierarchy.colourOptions,
    );
  }, [productHierarchy, selectedHeightFt]);

  const description = useMemo(() => {
    const parts: string[] = [];
    if (selectedColorName.trim()) parts.push(selectedColorName.trim());
    if (selectedHeightFt != null && Number.isFinite(selectedHeightFt)) parts.push(`${selectedHeightFt}ft`);
    return parts.join(', ');
  }, [selectedColorName, selectedHeightFt]);

  function onHeightSelectChange(heightFt: number) {
    setSelectedHeightFt(heightFt);
    if (!productHierarchy) return;
    const nextColours = colorNamesForHeight(
      heightFt,
      productHierarchy.fenceTypes,
      productHierarchy.fenceStyles,
      productHierarchy.colourOptions,
    );
    setSelectedColorName((prev) => (nextColours.includes(prev) ? prev : nextColours[0] ?? ''));
  }

  const hybridHorizontalStyleOptions = useMemo(() => {
    if (!productHierarchy) return [];
    return hybridHorizontalStyleNames(productHierarchy.fenceTypes, productHierarchy.fenceStyles);
  }, [productHierarchy]);

  function updateHybridHorizontalHeight(styleName: string, heightFt: number) {
    if (!productHierarchy) return;
    const coloursForStyle = hybridHorizontalColoursForStyleAndHeight(
      styleName,
      heightFt,
      productHierarchy.fenceTypes,
      productHierarchy.fenceStyles,
      productHierarchy.colourOptions,
    );
    setHybridHorizontalSelections((prev) => ({
      ...prev,
      [styleName]: {
        heightFt,
        colorName: coloursForStyle.includes(prev[styleName]?.colorName || '') ? prev[styleName]?.colorName || '' : (coloursForStyle[0] ?? ''),
      },
    }));
  }

  function updateHybridHorizontalColour(styleName: string, colorName: string) {
    setHybridHorizontalSelections((prev) => ({
      ...prev,
      [styleName]: {
        heightFt: prev[styleName]?.heightFt ?? null,
        colorName,
      },
    }));
  }

  function updateHybridHorizontalInputs(styleName: string, patch: Partial<HybridHorizontalInputs>) {
    setHybridHorizontalInputs((prev) => ({
      ...prev,
      [styleName]: {
        ...(prev[styleName] ?? defaultHybridHorizontalInputs()),
        ...patch,
      },
    }));
  }

  const exactPanels = useMemo(() => {
    if (!panelLengthFt || panelLengthFt <= 0) return 0;
    return sampleLine.length_ft / panelLengthFt;
  }, [panelLengthFt, sampleLine.length_ft]);

  const pvcSheetLine = useMemo(
    () =>
      fmsPvcColorLineMaterialFinals({
        lengthFt: sampleLine.length_ft,
        hPostTerminations: sampleLine.h_post_terminations,
        uChannelTerminations: sampleLine.u_channel_terminations,
      }),
    [sampleLine],
  );

  const pvcSheetGate = useMemo(
    () =>
      fmsPvcGateMaterialFinals({
        gateLineWidthInches: sampleGateLine.line_width_inches,
        gatePostsNeeded: sampleGateLine.posts_needed,
      }),
    [sampleGateLine],
  );

  const hybridVeHorizontalLine = useMemo(
    () =>
      fmsHybridVeHhPvcColorLineFinals({
        lengthFt: sampleLine.length_ft,
        hPostTerminations: sampleLine.h_post_terminations,
        uChannelTerminations: sampleLine.u_channel_terminations,
      }),
    [sampleLine],
  );

  const hybridVeHorizontalGate = useMemo(
    () =>
      fmsHybridVeHhPvcGateFinals({
        gateLineWidthInches: hybridVeGate.gateLineWidthInches,
        gatePostsNeeded: hybridVeGate.gatePostsNeeded,
        l6Inches: hybridVeGate.sideLayoutWidthInches,
        l7: hybridVeGate.adjoiningMode,
        lineUChannelD7: sampleLine.u_channel_terminations,
      }),
    [hybridVeGate, sampleLine.u_channel_terminations],
  );

  const verticalHybridLine = useMemo(
    () =>
      fmsVerticalHybridColorLineFinals({
        lengthFt: verticalHybrid.lineLengthFt,
        hPostTerminations: verticalHybrid.hPostTerminations,
        uChannelTerminations: verticalHybrid.uChannelTerminations,
      }),
    [verticalHybrid],
  );

  const roundedPanels = useMemo(() => pvcWholePanelsD9(exactPanels), [exactPanels]);

  /** Fence line only (D9+D6−1) — used for gate recipe rows that multiply from “line posts” so gate extras are not double-counted. */
  const linePostsFenceLineOnly = useMemo(
    () => pvcLinePostsForMaterials(exactPanels, sampleLine.h_post_terminations),
    [exactPanels, sampleLine.h_post_terminations],
  );

  /** Color line galvanized/H/cap/short/concrete: fence line posts + gate posts needed. */
  const linePostsIncludingFirst = useMemo(
    () => pvcLinePostsIncludingGatePosts(exactPanels, sampleLine.h_post_terminations, sampleGateLine.posts_needed),
    [exactPanels, sampleGateLine.posts_needed, sampleLine.h_post_terminations],
  );

  const previewRows = useMemo(
    () =>
      pvcSheetLine.rows.map((row, idx) => ({
        id: `pvc-sheet-line-${idx}`,
        name: row.item,
        raw: row.final,
        final: row.final,
      })),
    [pvcSheetLine],
  );

  const gateDoorWidth = useMemo(() => pvcSheetGate.z.c31, [pvcSheetGate]);

  const gateTotalBoards = useMemo(() => pvcSheetGate.z.c32, [pvcSheetGate]);

  const gatePreviewRows = useMemo(
    () =>
      pvcSheetGate.rows.map((row, idx) => ({
        id: `pvc-sheet-gate-${idx}`,
        name: row.item,
        raw: row.final,
        final: row.final,
      })),
    [pvcSheetGate],
  );

  const materialTotalsByKey = useMemo(() => {
    const map = new Map<string, number>();
    const add = (name: string, qty: number) => {
      const label = name.trim() || 'Untitled item';
      const key = materialKey(label);
      map.set(key, (map.get(key) ?? 0) + qty);
    };
    add('Concrete', fmsPvcConcreteBags(linePostsIncludingFirst));
    for (const row of previewRows) add(row.name || '', Number(row.final) || 0);
    for (const row of gatePreviewRows) add(row.name || '', Number(row.final) || 0);
    return map;
  }, [gatePreviewRows, linePostsIncludingFirst, previewRows]);

  const masterListColorHeading = useMemo(() => colorHeadingFromDescription(description), [description]);

  const colorLineInputs = useMemo(() => firstSheetFieldSpecs.filter((f) => f.section === 'color_line' && f.mode === 'input'), []);
  const colorLineCalculated = useMemo(() => firstSheetFieldSpecs.filter((f) => f.section === 'color_line' && f.mode === 'calculated'), []);
  const gateLineInputs = useMemo(() => firstSheetFieldSpecs.filter((f) => f.section === 'gate_line' && f.mode === 'input'), []);
  const gateLineCalculated = useMemo(() => firstSheetFieldSpecs.filter((f) => f.section === 'gate_line' && f.mode === 'calculated'), []);

  function updateRecipeItem(id: string, patch: Partial<MaterialCalculatorRecipeItem>) {
    setRecipeItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addRecipeItem() {
    setRecipeItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: '',
        quantity_per_panel: 1,
        input_field: 'exact_panels',
        rounding_mode: 'ceil',
        notes: '',
      },
    ]);
  }

  function removeRecipeItem(id: string) {
    setRecipeItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateGateRecipeItem(id: string, patch: Partial<MaterialCalculatorRecipeItem>) {
    setGateRecipeItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addGateRecipeItem() {
    setGateRecipeItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: '',
        quantity_per_panel: 1,
        input_field: 'gate_unit',
        rounding_mode: 'ceil',
        notes: '',
      },
    ]);
  }

  function removeGateRecipeItem(id: string) {
    setGateRecipeItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <div
        className="relative overflow-hidden rounded-[2rem] border p-6 shadow-xl shadow-slate-900/[0.05] sm:p-8"
        style={{
          borderColor: 'var(--dashboard-line)',
          background:
            'linear-gradient(135deg, rgb(var(--dashboard-brand-rgb) / 0.14), rgb(255 255 255 / 0.98) 42%, rgb(var(--dashboard-brand-rgb) / 0.05))',
        }}
      >
        <p className="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--dashboard-ink)]" style={{ background: 'var(--dashboard-soft)' }}>
          Supplier Pages
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">PVC material calculator</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          Premium fence PVC takeoff: color line, gate line, master order sheet, framework notes, and recipe builders. Open the drawer below to use the calculator.
        </p>
      </div>

      <details className="group rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <span>
            <span className="block text-base font-semibold text-slate-900">PVC material calculator</span>
            <span className="mt-0.5 block text-xs font-normal text-slate-500">Inputs, totals, master list, math, and recipes</span>
          </span>
          <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 group-open:bg-emerald-50 group-open:text-emerald-800 group-open:border-emerald-200">
            <span className="group-open:hidden">Open</span>
            <span className="hidden group-open:inline">Close</span>
          </span>
        </summary>
        <div className="space-y-6 border-t border-slate-100 px-5 py-6 sm:px-6">
      <section className={cardShell}>
        <div className={cardHeader}>
          <h2 className="font-semibold text-slate-900">Premium Fence Color Line - Manual inputs</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <div>
            <label className="block text-sm font-medium text-slate-700">Address / line label</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 53 Rothesay Ave" className={`mt-1.5 ${field}`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Height (ft)</label>
            <select
              className={`mt-1.5 ${field}`}
              value={selectedHeightFt != null && heightOptions.includes(selectedHeightFt) ? String(selectedHeightFt) : ''}
              disabled={productHierarchyLoading || heightOptions.length === 0}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) onHeightSelectChange(v);
              }}
            >
              {productHierarchyLoading ? (
                <option value="">Loading catalog…</option>
              ) : heightOptions.length === 0 ? (
                <option value="">No heights in catalog</option>
              ) : (
                heightOptions.map((h) => (
                  <option key={h} value={h}>
                    {Math.abs(h - Math.round(h)) < 1e-6 ? String(Math.round(h)) : String(h)} ft
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Colour</label>
            <select
              className={`mt-1.5 ${field}`}
              value={colourOptionsForHeight.includes(selectedColorName) ? selectedColorName : ''}
              disabled={productHierarchyLoading || colourOptionsForHeight.length === 0}
              onChange={(e) => setSelectedColorName(e.target.value)}
            >
              {productHierarchyLoading ? (
                <option value="">Loading catalog…</option>
              ) : colourOptionsForHeight.length === 0 ? (
                <option value="">No colours for this height</option>
              ) : (
                colourOptionsForHeight.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))
              )}
            </select>
            <p className="mt-1.5 text-xs text-slate-500">Pulled from your company’s product catalog (Dashboard → Products).</p>
            {productHierarchyError ? <p className="mt-1 text-xs font-medium text-red-600">{productHierarchyError}</p> : null}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Total fence line length (ft)</label>
            <input type="number" min={0} step={0.01} value={sampleLine.length_ft} onChange={(e) => setSampleLine((prev) => ({ ...prev, length_ft: Number(e.target.value) || 0 }))} className={`mt-1.5 ${field}`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Fence terminated with H post (0, 1, 2)</label>
            <input type="number" min={0} step={1} value={sampleLine.h_post_terminations} onChange={(e) => setSampleLine((prev) => ({ ...prev, h_post_terminations: Number(e.target.value) || 0 }))} className={`mt-1.5 ${field}`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Fence terminated with U channel (0, 1, 2)</label>
            <input type="number" min={0} step={1} value={sampleLine.u_channel_terminations} onChange={(e) => setSampleLine((prev) => ({ ...prev, u_channel_terminations: Number(e.target.value) || 0 }))} className={`mt-1.5 ${field}`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Panel length basis (ft)</label>
            <input type="number" min={0.01} step={0.01} value={panelLengthFt} onChange={(e) => setPanelLengthFt(Number(e.target.value) || 0)} className={`mt-1.5 ${field}`} />
          </div>
        </div>
      </section>

      <section className={cardShell}>
        <div className={cardHeader}>
          <h2 className="font-semibold text-slate-900">Premium Fence Color Line - Material totals</h2>
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total fence line panels</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{exactPanels.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Whole panels (D9)</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{roundedPanels}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Post count for materials (fence + gate)</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{linePostsIncludingFirst}</p>
              <p className="mt-2 text-xs leading-snug text-emerald-900/80">
                Fence line: D9+D6−1 (whole panels + H terminations − 1), plus gate posts needed from the gate inputs. Galvanized, H posts, caps, and short screws multiply from this total. A D9-only “Posts” row on the sheet stays lower when D6 is 3 (by D6−1) and does not include gate posts.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-3 font-semibold text-slate-700">Item</th>
                  <th className="py-3 text-right font-semibold text-slate-700">Final</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 font-medium text-slate-900">{row.name || 'Untitled item'}</td>
                    <td className="py-2.5 text-right font-semibold tabular-nums text-slate-900">{row.final}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={cardShell}>
        <div className={cardHeader}>
          <h2 className="font-semibold text-slate-900">Gate Line - Manual inputs</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <div>
            <label className="block text-sm font-medium text-slate-700">Total gate line width (inches)</label>
            <input type="number" min={0} step={0.01} value={sampleGateLine.line_width_inches} onChange={(e) => setSampleGateLine((prev) => ({ ...prev, line_width_inches: Number(e.target.value) || 0 }))} className={`mt-1.5 ${field}`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Post needed (0, 1, or 2)</label>
            <input type="number" min={0} step={1} value={sampleGateLine.posts_needed} onChange={(e) => setSampleGateLine((prev) => ({ ...prev, posts_needed: Number(e.target.value) || 0 }))} className={`mt-1.5 ${field}`} />
          </div>
        </div>
      </section>

      <section className={cardShell}>
        <div className={cardHeader}>
          <h2 className="font-semibold text-slate-900">Gate Line - Material totals</h2>
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total gate door width</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{gateDoorWidth.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Total gate boards</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{gateTotalBoards.toFixed(2)}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-3 font-semibold text-slate-700">Item</th>
                  <th className="py-3 text-right font-semibold text-slate-700">Final</th>
                </tr>
              </thead>
              <tbody>
                {gatePreviewRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 font-medium text-slate-900">{row.name || 'Untitled item'}</td>
                    <td className="py-2.5 text-right font-semibold tabular-nums text-slate-900">{row.final}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={cardShell}>
        <div className={cardHeader}>
          <h2 className="font-semibold text-slate-900">Master material list</h2>
          <p className="mt-1 text-sm text-slate-600">
            Order sheet layout: quantities combine color and gate recipes. The center column uses the{' '}
            <span className="font-medium text-slate-800">Colour</span> you selected above (for example <span className="font-medium">Adobe</span> at{' '}
            <span className="font-medium">6 ft</span>). Green section rows and the Extras column are editable for handwritten add-ons.
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] border-collapse text-sm text-slate-900">
              <thead>
                <tr>
                  <th className="border border-black bg-white px-2 py-2 text-left font-bold text-slate-900" />
                  <th
                    className="border border-black px-2 py-2 text-center font-bold text-slate-900"
                    style={{ backgroundColor: MASTER_SHEET_COLOR_COL }}
                  >
                    {masterListColorHeading}
                  </th>
                  <th className="border border-black bg-white p-0 font-bold text-slate-900">
                    <input
                      type="text"
                      aria-label="Extras column header note"
                      placeholder="Extras"
                      value={masterSheetCellEdits['m-hdr-ex'] ?? ''}
                      onChange={(e) => setMasterSheetCellEdits((prev) => ({ ...prev, 'm-hdr-ex': e.target.value }))}
                      className={`${masterSheetCellInput} text-center font-bold`}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {MASTER_MATERIAL_SHEET_ROWS.map((row, idx) =>
                  row.kind === 'section' ? (
                    <tr key={`section-${idx}-${row.label}`}>
                      <td className="border border-black p-0" style={{ backgroundColor: MASTER_SHEET_SECTION_BG }}>
                        <input
                          type="text"
                          aria-label={`Section row ${idx + 1} label`}
                          placeholder={row.label}
                          value={masterSheetCellEdits[`m-${idx}-s1`] ?? ''}
                          onChange={(e) => setMasterSheetCellEdits((prev) => ({ ...prev, [`m-${idx}-s1`]: e.target.value }))}
                          className={`${masterSheetCellInput} text-left font-semibold`}
                        />
                      </td>
                      <td className="border border-black p-0" style={{ backgroundColor: MASTER_SHEET_SECTION_BG }}>
                        <input
                          type="text"
                          aria-label={`Section row ${idx + 1} center`}
                          placeholder="Qty / notes"
                          value={masterSheetCellEdits[`m-${idx}-s2`] ?? ''}
                          onChange={(e) => setMasterSheetCellEdits((prev) => ({ ...prev, [`m-${idx}-s2`]: e.target.value }))}
                          className={`${masterSheetCellInput} text-center font-medium`}
                        />
                      </td>
                      <td className="border border-black p-0" style={{ backgroundColor: MASTER_SHEET_SECTION_BG }}>
                        <input
                          type="text"
                          aria-label={`Section row ${idx + 1} extras`}
                          placeholder="Extras"
                          value={masterSheetCellEdits[`m-${idx}-s3`] ?? ''}
                          onChange={(e) => setMasterSheetCellEdits((prev) => ({ ...prev, [`m-${idx}-s3`]: e.target.value }))}
                          className={`${masterSheetCellInput} text-center font-medium`}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr key={`item-${idx}-${row.label}`}>
                      <td className="border border-black bg-white px-2 py-1.5 text-left font-medium">{row.label}</td>
                      <td
                        className="border border-black px-2 py-1.5 text-center font-semibold tabular-nums text-slate-900"
                        style={{ backgroundColor: MASTER_SHEET_COLOR_COL }}
                      >
                        {formatQty(
                          row.label === 'H-Post Stiffener'
                            ? lookupHPostStiffenerQty(materialTotalsByKey)
                            : lookupMaterialTotal(materialTotalsByKey, row.matchNames),
                        )}
                      </td>
                      <td className="border border-black bg-white p-0">
                        <input
                          type="text"
                          aria-label={`${row.label} extras`}
                          placeholder="—"
                          value={masterSheetCellEdits[`m-${idx}-ex`] ?? ''}
                          onChange={(e) => setMasterSheetCellEdits((prev) => ({ ...prev, [`m-${idx}-ex`]: e.target.value }))}
                          className={`${masterSheetCellInput} text-center text-slate-800`}
                        />
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <details className="group rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-800 sm:px-6">
          Show math + framework details
        </summary>
        <div className="border-t border-slate-100 p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Color line - contractor inputs</p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">{colorLineInputs.map((f) => <li key={f.id}>- {f.label}</li>)}</ul>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Color line - auto calculated</p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">{colorLineCalculated.map((f) => <li key={f.id}>- {f.label}</li>)}</ul>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Gate line - contractor inputs</p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">{gateLineInputs.map((f) => <li key={f.id}>- {f.label}</li>)}</ul>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Gate line - auto calculated</p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">{gateLineCalculated.map((f) => <li key={f.id}>- {f.label}</li>)}</ul>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Core math: `exact panels = length / panel length`, `D9 whole panels = ceil(exact panels)`, fence-line material post count = `D9 + D6 − 1`, then add gate posts needed for the full total used by the color line (galvanized, H posts, caps, short screws, concrete). Gate recipe rows that use “line posts” resolve to the fence-only base so gate post counts are not applied twice. A D9-only “Posts” row is lower than D9+D6−1 when D6 is 3 (by D6−1) and does not include gate posts.
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Long screws and plugs (PVC color line): both start from `C = ceil(4 × exact panels)` (sheet column C), then sheet IFs on U channel (B22). After that, long screws include 10 extras and plugs include 10 extras (hole caps). Color-line short screws use `ceil(line post count × qty)` then add 1 spare. Gate line screws add `ceil(multiplier × gate boards)` on top of line long/short totals.
          </p>
        </div>
      </details>
        </div>
      </details>

      <details className="group rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <span>
            <span className="block text-base font-semibold text-slate-900">Hybrid Ve calculators</span>
            <span className="mt-0.5 block text-xs font-normal text-slate-500">Horizontal Hybrid PVC and Vertical Hybrid, exactly from the workbook tab</span>
          </span>
          <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 group-open:border-emerald-200 group-open:bg-emerald-50 group-open:text-emerald-800">
            <span className="group-open:hidden">Open</span>
            <span className="hidden group-open:inline">Close</span>
          </span>
        </summary>
        <div className="space-y-6 border-t border-slate-100 px-5 py-6 sm:px-6">
          <details className="group rounded-2xl border border-slate-200/80 bg-slate-50/60 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5">
              <span>
                <span className="block text-lg font-semibold text-slate-900">Horizontal Hybrid PVC</span>
                <span className="mt-1 block text-sm text-slate-600">Workbook basis: `length / 6.0833`, `CEILING(..., 0.5)`, then `ROUNDUP(...)`.</span>
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 group-open:border-emerald-200 group-open:bg-emerald-50 group-open:text-emerald-800">
                <span className="group-open:hidden">Open</span>
                <span className="hidden group-open:inline">Close</span>
              </span>
            </summary>
            <div className="space-y-4 border-t border-slate-200/70 px-4 py-4 sm:px-5 sm:py-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <section className={cardShell}>
                  <div className={cardHeader}>
                    <h4 className="font-semibold text-slate-900">Line inputs</h4>
                  </div>
                  <div className="grid gap-4 p-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Total fence line length (ft)</label>
                      <input type="number" min={0} step={0.01} value={sampleLine.length_ft} onChange={(e) => setSampleLine((prev) => ({ ...prev, length_ft: Number(e.target.value) || 0 }))} className={`mt-1.5 ${field}`} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Fence terminated with H post (0, 1, 2)</label>
                      <input type="number" min={0} step={1} value={sampleLine.h_post_terminations} onChange={(e) => setSampleLine((prev) => ({ ...prev, h_post_terminations: Number(e.target.value) || 0 }))} className={`mt-1.5 ${field}`} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Fence terminated with U channel (0, 1, 2)</label>
                      <input type="number" min={0} step={1} value={sampleLine.u_channel_terminations} onChange={(e) => setSampleLine((prev) => ({ ...prev, u_channel_terminations: Number(e.target.value) || 0 }))} className={`mt-1.5 ${field}`} />
                    </div>
                  </div>
                </section>
                <section className={cardShell}>
                  <div className={cardHeader}>
                    <h4 className="font-semibold text-slate-900">Gate inputs</h4>
                  </div>
                  <div className="grid gap-4 p-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Gate line width (H6, inches)</label>
                      <input type="number" min={0} step={0.01} value={hybridVeGate.gateLineWidthInches} onChange={(e) => setHybridVeGate((prev) => ({ ...prev, gateLineWidthInches: Number(e.target.value) || 0 }))} className={`mt-1.5 ${field}`} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Gate posts needed (H7, 0–2)</label>
                      <input type="number" min={0} step={1} value={hybridVeGate.gatePostsNeeded} onChange={(e) => setHybridVeGate((prev) => ({ ...prev, gatePostsNeeded: Number(e.target.value) || 0 }))} className={`mt-1.5 ${field}`} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Side layout width (L6, inches)</label>
                      <input type="number" min={0} step={0.01} value={hybridVeGate.sideLayoutWidthInches} onChange={(e) => setHybridVeGate((prev) => ({ ...prev, sideLayoutWidthInches: Number(e.target.value) || 0 }))} className={`mt-1.5 ${field}`} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Adjoining mode (L7: 0 / 1 / 2)</label>
                      <input type="number" min={0} step={1} value={hybridVeGate.adjoiningMode} onChange={(e) => setHybridVeGate((prev) => ({ ...prev, adjoiningMode: Number(e.target.value) || 0 }))} className={`mt-1.5 ${field}`} />
                    </div>
                  </div>
                </section>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <section className={cardShell}>
                  <div className={cardHeader}>
                    <h4 className="font-semibold text-slate-900">Line material totals</h4>
                  </div>
                  <div className="p-5 sm:p-6">
                    <div className="mb-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">C8 exact panels</p>
                        <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{hybridVeHorizontalLine.z.c8.toFixed(4)}</p>
                      </div>
                      <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">C9 ceiling 0.5</p>
                        <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{formatQty(hybridVeHorizontalLine.z.c9)}</p>
                      </div>
                      <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">D9 whole panels</p>
                        <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{formatQty(hybridVeHorizontalLine.z.d9)}</p>
                      </div>
                    </div>
                    <table className="min-w-full text-sm">
                      <thead><tr className="border-b border-slate-200 text-left"><th className="py-3 font-semibold text-slate-700">Item</th><th className="py-3 text-right font-semibold text-slate-700">Final</th></tr></thead>
                      <tbody>
                        {hybridVeHorizontalLine.rows.map((row) => (
                          <tr key={`hybrid-ve-line-${row.item}`} className="border-b border-slate-100 last:border-0">
                            <td className="py-2.5 font-medium text-slate-900">{row.item}</td>
                            <td className="py-2.5 text-right font-semibold tabular-nums text-slate-900">{formatQty(row.final)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
                <section className={cardShell}>
                  <div className={cardHeader}>
                    <h4 className="font-semibold text-slate-900">Gate material totals</h4>
                  </div>
                  <div className="p-5 sm:p-6">
                    <div className="mb-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">L8 side panel length</p>
                        <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{formatQty(hybridVeHorizontalGate.z.l8)}</p>
                      </div>
                      <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">L12 rounded side fraction</p>
                        <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{formatQty(hybridVeHorizontalGate.z.l12)}</p>
                      </div>
                      <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Gate boards</p>
                        <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{formatQty(hybridVeHorizontalGate.z.h19)}</p>
                      </div>
                    </div>
                    <table className="min-w-full text-sm">
                      <thead><tr className="border-b border-slate-200 text-left"><th className="py-3 font-semibold text-slate-700">Item</th><th className="py-3 text-right font-semibold text-slate-700">Final</th></tr></thead>
                      <tbody>
                        {hybridVeHorizontalGate.rows.map((row) => (
                          <tr key={`hybrid-ve-gate-${row.item}`} className="border-b border-slate-100 last:border-0">
                            <td className="py-2.5 font-medium text-slate-900">{row.item}</td>
                            <td className="py-2.5 text-right font-semibold tabular-nums text-slate-900">{formatQty(row.final)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </div>
          </details>

          <details className="group rounded-2xl border border-slate-200/80 bg-slate-50/60 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5">
              <span>
                <span className="block text-lg font-semibold text-slate-900">Vertical Hybrid</span>
                <span className="mt-1 block text-sm text-slate-600">Workbook basis: `length / 8`, `ROUND(C60,4)`, then `ROUNDUP(C61,0)`.</span>
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 group-open:border-emerald-200 group-open:bg-emerald-50 group-open:text-emerald-800">
                <span className="group-open:hidden">Open</span>
                <span className="hidden group-open:inline">Close</span>
              </span>
            </summary>
            <div className="space-y-4 border-t border-slate-200/70 px-4 py-4 sm:px-5 sm:py-5">
              <section className={cardShell}>
                <div className={cardHeader}>
                  <h4 className="font-semibold text-slate-900">Line inputs</h4>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Total fence line length (ft)</label>
                    <input type="number" min={0} step={0.01} value={verticalHybrid.lineLengthFt} onChange={(e) => setVerticalHybrid((prev) => ({ ...prev, lineLengthFt: Number(e.target.value) || 0 }))} className={`mt-1.5 ${field}`} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Fence terminated with H post (0, 1, 2)</label>
                    <input type="number" min={0} step={1} value={verticalHybrid.hPostTerminations} onChange={(e) => setVerticalHybrid((prev) => ({ ...prev, hPostTerminations: Number(e.target.value) || 0 }))} className={`mt-1.5 ${field}`} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Fence terminated with U channel (0, 1, 2)</label>
                    <input type="number" min={0} step={1} value={verticalHybrid.uChannelTerminations} onChange={(e) => setVerticalHybrid((prev) => ({ ...prev, uChannelTerminations: Number(e.target.value) || 0 }))} className={`mt-1.5 ${field}`} />
                  </div>
                </div>
              </section>
              <section className={cardShell}>
                <div className={cardHeader}>
                  <h4 className="font-semibold text-slate-900">Line material totals</h4>
                </div>
                <div className="p-5 sm:p-6">
                  <div className="mb-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">C60 exact panels</p>
                      <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{formatQty(verticalHybridLine.z.c60)}</p>
                    </div>
                    <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/70 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">C61 rounded</p>
                      <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{formatQty(verticalHybridLine.z.c61)}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">D61 whole panels</p>
                      <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{formatQty(verticalHybridLine.z.d61)}</p>
                    </div>
                  </div>
                  <table className="min-w-full text-sm">
                    <thead><tr className="border-b border-slate-200 text-left"><th className="py-3 font-semibold text-slate-700">Item</th><th className="py-3 text-right font-semibold text-slate-700">Final</th></tr></thead>
                    <tbody>
                      {verticalHybridLine.rows.map((row) => (
                        <tr key={`vertical-hybrid-${row.item}`} className="border-b border-slate-100 last:border-0">
                          <td className="py-2.5 font-medium text-slate-900">{row.item}</td>
                          <td className="py-2.5 text-right font-semibold tabular-nums text-slate-900">{formatQty(row.final)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </details>
        </div>
      </details>

      <details className="group rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <span>
            <span className="block text-base font-semibold text-slate-900">Hybrid horizontal calculator</span>
            <span className="mt-0.5 block text-xs font-normal text-slate-500">Separate dropdowns for each Hybrid Horizontal style in your catalog</span>
          </span>
          <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 group-open:border-emerald-200 group-open:bg-emerald-50 group-open:text-emerald-800">
            <span className="group-open:hidden">Open</span>
            <span className="hidden group-open:inline">Close</span>
          </span>
        </summary>
        <div className="space-y-6 border-t border-slate-100 px-5 py-6 sm:px-6">
          <section className={cardShell}>
            <div className={cardHeader}>
              <h2 className="font-semibold text-slate-900">Hybrid Horizontal families</h2>
              <p className="mt-1 text-sm text-slate-600">
                Built from the workbook families: each card includes the correct line calculator, gate calculator, material totals, and master list for that Hybrid Horizontal family.
              </p>
            </div>
            <div className="space-y-6 p-5 sm:p-6">
              {hybridHorizontalStyleOptions.length === 0 ? (
                <div>
                  <p className="text-sm text-slate-600">
                    {productHierarchyLoading
                      ? 'Loading Hybrid Horizontal styles from your catalog...'
                      : 'No Hybrid Horizontal styles were found in your company products yet.'}
                  </p>
                  {productHierarchyError ? <p className="mt-2 text-sm font-medium text-red-600">{productHierarchyError}</p> : null}
                </div>
              ) : (
                hybridHorizontalStyleOptions.map((styleName) => {
                  const selection = hybridHorizontalSelections[styleName] ?? { heightFt: null, colorName: '' };
                  const inputs = hybridHorizontalInputs[styleName] ?? defaultHybridHorizontalInputs();
                  const heightsForStyle = productHierarchy
                    ? hybridHorizontalHeightsForStyle(styleName, productHierarchy.fenceTypes, productHierarchy.fenceStyles)
                    : [];
                  const coloursForStyle =
                    productHierarchy && selection.heightFt != null
                      ? hybridHorizontalColoursForStyleAndHeight(
                          styleName,
                          selection.heightFt,
                          productHierarchy.fenceTypes,
                          productHierarchy.fenceStyles,
                          productHierarchy.colourOptions,
                        )
                      : [];
                  const config = hybridHorizontalFamilyConfig(styleName, selection.heightFt);
                  const exactPanels = inputs.lineLengthFt > 0 ? inputs.lineLengthFt / HYBRID_HORIZONTAL_PANEL_LENGTH_FT : 0;
                  const halfPanelCeil = hybridHalfPanelCeiling(exactPanels);
                  const roundedWholePanels = hybridRoundedWholePanels(halfPanelCeil);
                  const linePostCount = Math.max(0, roundedWholePanels + Math.round(inputs.hPostTerminations) - 1);
                  const lineRows: HybridHorizontalMaterialRow[] = config
                    ? [
                        { name: 'Aluminum H Post', qty: linePostCount },
                        { name: 'Cap (H Post)', qty: linePostCount },
                        { name: `6' Rail`, qty: halfPanelCeil * 2 },
                        { name: 'Board', qty: roundedWholePanels * config.boardQtyPerRoundedPanel },
                        {
                          name: 'Long Black Screw (2.5)',
                          qty:
                            roundedWholePanels * 4 -
                            (inputs.uChannelTerminations === 1
                              ? 2
                              : inputs.uChannelTerminations === 2
                                ? 4
                                : 0),
                        },
                        { name: 'U Channel', qty: Math.max(0, Math.round(inputs.uChannelTerminations)) },
                        { name: 'Small Black Screw (3/4)', qty: Math.max(0, Math.round(inputs.uChannelTerminations)) * 6 },
                      ]
                    : [];
                  const gateIsActive = inputs.gateWidthInches > 0;
                  const gateBoardQty =
                    gateIsActive && config
                      ? inputs.gateWidthInches > 37
                        ? config.gateBoardQtyFullWidth
                        : config.gateBoardQtyFullWidth / 2
                      : 0;
                  const gateRows: HybridHorizontalMaterialRow[] = gateIsActive
                    ? [
                        { name: 'Gate Side Frame', qty: 2 },
                        { name: 'H Post', qty: Math.max(0, Math.round(inputs.gatePostsNeeded)) },
                        { name: 'Cap (H post)', qty: Math.max(0, Math.round(inputs.gatePostsNeeded)) },
                        { name: 'Small Cap (Gate Side Frame Cap)', qty: 2 },
                        { name: '6 Foot Rail/Overhead Brace', qty: 3 },
                        { name: 'Board', qty: gateBoardQty },
                        { name: 'Long Black Screw (2.5)', qty: 2 },
                        { name: 'Medium Black screw (1.5)', qty: 8 },
                        { name: 'Gate Cross Brace', qty: 1 },
                        { name: 'Latch kit', qty: 1 },
                        { name: 'Hinge Kit', qty: 1 },
                      ]
                    : [];
                  const longBlackTotal =
                    (lineRows.find((row) => row.name === 'Long Black Screw (2.5)')?.qty ?? 0) +
                    (gateRows.find((row) => row.name === 'Long Black Screw (2.5)')?.qty ?? 0);
                  const linePostTotal = lineRows.find((row) => row.name === 'Aluminum H Post')?.qty ?? 0;
                  const gatePostTotal = gateRows.find((row) => row.name === 'H Post')?.qty ?? 0;
                  const lineCapTotal = lineRows.find((row) => row.name === 'Cap (H Post)')?.qty ?? 0;
                  const gateCapTotal = gateRows.find((row) => row.name === 'Cap (H post)')?.qty ?? 0;
                  const railTotal =
                    (lineRows.find((row) => row.name === `6' Rail`)?.qty ?? 0) +
                    (gateRows.find((row) => row.name === '6 Foot Rail/Overhead Brace')?.qty ?? 0);
                  const boardTotal =
                    (lineRows.find((row) => row.name === 'Board')?.qty ?? 0) +
                    (gateRows.find((row) => row.name === 'Board')?.qty ?? 0);
                  const uChannelTotal = lineRows.find((row) => row.name === 'U Channel')?.qty ?? 0;
                  const crossBraceTotal = gateRows.find((row) => row.name === 'Gate Cross Brace')?.qty ?? 0;
                  const gateSideFrameTotal = gateRows.find((row) => row.name === 'Gate Side Frame')?.qty ?? 0;
                  const gateSideCapTotal = gateRows.find((row) => row.name === 'Small Cap (Gate Side Frame Cap)')?.qty ?? 0;
                  const uChannelScrewTotal = lineRows.find((row) => row.name === 'Small Black Screw (3/4)')?.qty ?? 0;
                  const gateScrewTotal = gateRows.find((row) => row.name === 'Medium Black screw (1.5)')?.qty ?? 0;
                  const masterRows: HybridHorizontalMaterialRow[] = [
                    { name: 'Concrete', qty: (linePostTotal + gatePostTotal) * 2.5 },
                    { name: 'Aluminum HPost 120"', qty: linePostTotal + gatePostTotal },
                    { name: 'Aluminum HPost Cap', qty: lineCapTotal + gateCapTotal },
                    { name: '3" Aluminum Pocket Rail 72"', qty: railTotal },
                    { name: 'Board', qty: boardTotal },
                    { name: 'Outer U-Channel', qty: uChannelTotal },
                    { name: 'Inner U-Channel', qty: uChannelTotal },
                    { name: 'Aluminum Gate Side Frame', qty: gateSideFrameTotal },
                    { name: 'Aluminum Gate Post Cap', qty: gateSideCapTotal },
                    { name: 'Adjustable Aluminum Gate Brace', qty: crossBraceTotal },
                    { name: 'Long Black Screw (2.5")', qty: longBlackTotal },
                    { name: 'Rail Screw (1.5" x #10)', qty: longBlackTotal * 2 },
                    { name: 'Plugs (7/8")', qty: longBlackTotal * 2 },
                    { name: 'Gate Screw (1.5")', qty: gateScrewTotal },
                    { name: 'U-Channel Screw (3/4")', qty: uChannelScrewTotal },
                    { name: 'Latch kit', qty: gateRows.find((row) => row.name === 'Latch kit')?.qty ?? 0 },
                    { name: 'Hinge Kit', qty: gateRows.find((row) => row.name === 'Hinge Kit')?.qty ?? 0 },
                    { name: 'Base Plate w Screws', qty: 0 },
                    { name: 'Drop Rod', qty: 0 },
                  ];
                  return (
                    <details key={styleName} className="group rounded-2xl border border-slate-200/80 bg-slate-50/60 shadow-sm">
                      <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{styleName}</h3>
                          <p className="mt-1 text-sm text-slate-600">
                            Workbook panel basis: `length / 6.0833`, then `CEILING(..., 0.5)` and `ROUNDUP(...)` before line posts and board totals.
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {config ? (
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                              Boards per rounded panel: <span className="font-semibold text-slate-900">{config.boardQtyPerRoundedPanel}</span>
                            </div>
                          ) : null}
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 group-open:border-emerald-200 group-open:bg-emerald-50 group-open:text-emerald-800">
                            <span className="group-open:hidden">Open</span>
                            <span className="hidden group-open:inline">Close</span>
                          </span>
                        </div>
                      </summary>

                      <div className="space-y-4 border-t border-slate-200/70 px-4 py-4 sm:px-5 sm:py-5">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className={cardShell}>
                          <div className={cardHeader}>
                            <h4 className="font-semibold text-slate-900">Line calculator</h4>
                          </div>
                          <div className="grid gap-4 p-5 sm:grid-cols-2">
                            <div>
                              <label className="block text-sm font-medium text-slate-700">Height</label>
                              <select
                                className={`mt-1.5 ${field}`}
                                value={selection.heightFt != null && heightsForStyle.includes(selection.heightFt) ? String(selection.heightFt) : ''}
                                disabled={productHierarchyLoading || heightsForStyle.length === 0}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  if (Number.isFinite(v)) updateHybridHorizontalHeight(styleName, v);
                                }}
                              >
                                {productHierarchyLoading ? (
                                  <option value="">Loading catalog...</option>
                                ) : heightsForStyle.length === 0 ? (
                                  <option value="">No heights</option>
                                ) : (
                                  heightsForStyle.map((h) => (
                                    <option key={`${styleName}-${h}`} value={h}>
                                      {Math.abs(h - Math.round(h)) < 1e-6 ? String(Math.round(h)) : String(h)} ft
                                    </option>
                                  ))
                                )}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700">Colour</label>
                              <select
                                className={`mt-1.5 ${field}`}
                                value={coloursForStyle.includes(selection.colorName) ? selection.colorName : ''}
                                disabled={productHierarchyLoading || coloursForStyle.length === 0}
                                onChange={(e) => updateHybridHorizontalColour(styleName, e.target.value)}
                              >
                                {productHierarchyLoading ? (
                                  <option value="">Loading catalog...</option>
                                ) : coloursForStyle.length === 0 ? (
                                  <option value="">No colours</option>
                                ) : (
                                  coloursForStyle.map((name) => (
                                    <option key={`${styleName}-${name}`} value={name}>
                                      {name}
                                    </option>
                                  ))
                                )}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700">Address / line label</label>
                              <input
                                value={inputs.lineLabel}
                                onChange={(e) => updateHybridHorizontalInputs(styleName, { lineLabel: e.target.value })}
                                className={`mt-1.5 ${field}`}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700">Total fence line length (ft)</label>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={inputs.lineLengthFt}
                                onChange={(e) => updateHybridHorizontalInputs(styleName, { lineLengthFt: Number(e.target.value) || 0 })}
                                className={`mt-1.5 ${field}`}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700">Fence terminated with H post (0, 1, 2)</label>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={inputs.hPostTerminations}
                                onChange={(e) => updateHybridHorizontalInputs(styleName, { hPostTerminations: Number(e.target.value) || 0 })}
                                className={`mt-1.5 ${field}`}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700">Fence terminated with U channel (0, 1, 2)</label>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={inputs.uChannelTerminations}
                                onChange={(e) => updateHybridHorizontalInputs(styleName, { uChannelTerminations: Number(e.target.value) || 0 })}
                                className={`mt-1.5 ${field}`}
                              />
                            </div>
                          </div>
                        </div>

                        <div className={cardShell}>
                          <div className={cardHeader}>
                            <h4 className="font-semibold text-slate-900">Gate calculator</h4>
                          </div>
                          <div className="grid gap-4 p-5 sm:grid-cols-2">
                            <div>
                              <label className="block text-sm font-medium text-slate-700">Address / line label</label>
                              <input
                                value={inputs.gateLabel}
                                onChange={(e) => updateHybridHorizontalInputs(styleName, { gateLabel: e.target.value })}
                                className={`mt-1.5 ${field}`}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700">Total gate line width (inches)</label>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={inputs.gateWidthInches}
                                onChange={(e) => updateHybridHorizontalInputs(styleName, { gateWidthInches: Number(e.target.value) || 0 })}
                                className={`mt-1.5 ${field}`}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700">Post needed (0, 1, or 2)</label>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={inputs.gatePostsNeeded}
                                onChange={(e) => updateHybridHorizontalInputs(styleName, { gatePostsNeeded: Number(e.target.value) || 0 })}
                                className={`mt-1.5 ${field}`}
                              />
                            </div>
                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gate boards</p>
                              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{formatQty(gateBoardQty)}</p>
                              <p className="mt-2 text-xs text-slate-600">Workbook rule: if width is greater than 37&quot;, use the full board count; otherwise use half.</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 xl:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Exact panels</p>
                          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{exactPanels.toFixed(2)}</p>
                        </div>
                        <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/70 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Ceiling to 0.5 panel</p>
                          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{formatQty(halfPanelCeil)}</p>
                        </div>
                        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Rounded whole panels / posts row</p>
                          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{formatQty(roundedWholePanels)}</p>
                          <p className="mt-2 text-xs text-emerald-900/80">Line structural posts use `rounded whole panels + H posts - 1`.</p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <section className={cardShell}>
                          <div className={cardHeader}>
                            <h4 className="font-semibold text-slate-900">Line material totals</h4>
                          </div>
                          <div className="p-5 sm:p-6">
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead>
                                  <tr className="border-b border-slate-200 text-left">
                                    <th className="py-3 font-semibold text-slate-700">Item</th>
                                    <th className="py-3 text-right font-semibold text-slate-700">Final</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {lineRows.map((row) => (
                                    <tr key={`${styleName}-line-${row.name}`} className="border-b border-slate-100 last:border-0">
                                      <td className="py-2.5 font-medium text-slate-900">{row.name}</td>
                                      <td className="py-2.5 text-right font-semibold tabular-nums text-slate-900">{formatQty(row.qty)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </section>

                        <section className={cardShell}>
                          <div className={cardHeader}>
                            <h4 className="font-semibold text-slate-900">Gate material totals</h4>
                          </div>
                          <div className="p-5 sm:p-6">
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead>
                                  <tr className="border-b border-slate-200 text-left">
                                    <th className="py-3 font-semibold text-slate-700">Item</th>
                                    <th className="py-3 text-right font-semibold text-slate-700">Final</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {gateRows.length === 0 ? (
                                    <tr>
                                      <td className="py-2.5 text-sm text-slate-500" colSpan={2}>Enter a gate width above to calculate gate materials.</td>
                                    </tr>
                                  ) : (
                                    gateRows.map((row) => (
                                      <tr key={`${styleName}-gate-${row.name}`} className="border-b border-slate-100 last:border-0">
                                        <td className="py-2.5 font-medium text-slate-900">{row.name}</td>
                                        <td className="py-2.5 text-right font-semibold tabular-nums text-slate-900">{formatQty(row.qty)}</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </section>
                      </div>

                      <section className={cardShell}>
                        <div className={cardHeader}>
                          <h4 className="font-semibold text-slate-900">Hybrid Horizontal master material list</h4>
                          <p className="mt-1 text-sm text-slate-600">
                            Master list rows mirror the workbook&apos;s horizontal-hybrid material sheet for the selected family and height.
                          </p>
                        </div>
                        <div className="p-5 sm:p-6">
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[360px] border-collapse text-sm text-slate-900">
                              <thead>
                                <tr>
                                  <th className="border border-black bg-white px-2 py-2 text-left font-bold text-slate-900">Item</th>
                                  <th
                                    className="border border-black px-2 py-2 text-center font-bold text-slate-900"
                                    style={{ backgroundColor: MASTER_SHEET_COLOR_COL }}
                                  >
                                    {selection.colorName || styleName}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {HYBRID_HORIZONTAL_MASTER_ROWS.map((rowLabel) => (
                                  <tr key={`${styleName}-master-${rowLabel}`}>
                                    <td className="border border-black bg-white px-2 py-1.5 text-left font-medium">{rowLabel}</td>
                                    <td
                                      className="border border-black px-2 py-1.5 text-center font-semibold tabular-nums text-slate-900"
                                      style={{ backgroundColor: MASTER_SHEET_COLOR_COL }}
                                    >
                                      {formatQty(masterRows.find((row) => row.name === rowLabel)?.qty ?? 0)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </section>
                      </div>
                    </details>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </details>

      <details className="group rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-800 sm:px-6">
          Show recipe builders
        </summary>
        <div className="space-y-6 border-t border-slate-100 p-5 sm:p-6">
          <section className={cardShell}>
            <div className={cardHeader}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">Per-panel recipe builder</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    This is where suppliers define what goes into a panel and what each item should multiply against.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addRecipeItem}
                  className="rounded-xl bg-[var(--dashboard-brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
                >
                  Add item
                </button>
              </div>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              {recipeItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
                  <div className="grid gap-3 lg:grid-cols-12">
                    <div className="lg:col-span-3">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Item</label>
                      <input
                        value={item.name}
                        onChange={(e) => updateRecipeItem(item.id, { name: e.target.value })}
                        className={`mt-1.5 ${field}`}
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Qty</label>
                      <input
                        type="number"
                        step={0.01}
                        value={item.quantity_per_panel}
                        onChange={(e) => updateRecipeItem(item.id, { quantity_per_panel: Number(e.target.value) || 0 })}
                        className={`mt-1.5 ${field}`}
                      />
                    </div>
                    <div className="lg:col-span-3">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Multiply from</label>
                      <select
                        value={item.input_field}
                        onChange={(e) => updateRecipeItem(item.id, { input_field: e.target.value as MaterialCalculatorInputField })}
                        className={`mt-1.5 ${field}`}
                      >
                        {Object.entries(inputFieldLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Rounding</label>
                      <select
                        value={item.rounding_mode}
                        onChange={(e) => updateRecipeItem(item.id, { rounding_mode: e.target.value as MaterialCalculatorRecipeItem['rounding_mode'] })}
                        className={`mt-1.5 ${field}`}
                      >
                        <option value="ceil">Round up</option>
                        <option value="nearest">Nearest whole</option>
                        <option value="none">Keep exact</option>
                      </select>
                    </div>
                    <div className="flex items-end lg:col-span-2">
                      <button
                        type="button"
                        onClick={() => removeRecipeItem(item.id)}
                        className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="lg:col-span-12">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</label>
                      <input
                        value={item.notes ?? ''}
                        onChange={(e) => updateRecipeItem(item.id, { notes: e.target.value })}
                        placeholder="Optional reminder about how this item should behave"
                        className={`mt-1.5 ${field}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className={cardShell}>
            <div className={cardHeader}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">Gate line recipe builder</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Gate material items from the first sheet with editable quantities, sources, and rounding.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addGateRecipeItem}
                  className="rounded-xl bg-[var(--dashboard-brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
                >
                  Add gate item
                </button>
              </div>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              {gateRecipeItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
                  <div className="grid gap-3 lg:grid-cols-12">
                    <div className="lg:col-span-3">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Item</label>
                      <input value={item.name} onChange={(e) => updateGateRecipeItem(item.id, { name: e.target.value })} className={`mt-1.5 ${field}`} />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Qty</label>
                      <input
                        type="number"
                        step={0.01}
                        value={item.quantity_per_panel}
                        onChange={(e) => updateGateRecipeItem(item.id, { quantity_per_panel: Number(e.target.value) || 0 })}
                        className={`mt-1.5 ${field}`}
                      />
                    </div>
                    <div className="lg:col-span-3">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Multiply from</label>
                      <select
                        value={item.input_field}
                        onChange={(e) => updateGateRecipeItem(item.id, { input_field: e.target.value as MaterialCalculatorInputField })}
                        className={`mt-1.5 ${field}`}
                      >
                        {Object.entries(inputFieldLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Rounding</label>
                      <select
                        value={item.rounding_mode}
                        onChange={(e) => updateGateRecipeItem(item.id, { rounding_mode: e.target.value as MaterialCalculatorRecipeItem['rounding_mode'] })}
                        className={`mt-1.5 ${field}`}
                      >
                        <option value="ceil">Round up</option>
                        <option value="nearest">Nearest whole</option>
                        <option value="none">Keep exact</option>
                      </select>
                    </div>
                    <div className="flex items-end lg:col-span-2">
                      <button
                        type="button"
                        onClick={() => removeGateRecipeItem(item.id)}
                        className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="lg:col-span-12">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</label>
                      <input
                        value={item.notes ?? ''}
                        onChange={(e) => updateGateRecipeItem(item.id, { notes: e.target.value })}
                        placeholder="Optional reminder for gate-specific logic"
                        className={`mt-1.5 ${field}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </details>
    </div>
  );
}
