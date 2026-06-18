import {
  coerceFmsPvcCalculatorColour,
  coerceFmsWpcCalculatorColour,
  type FmsPvcCalculatorColour,
  type FmsWpcCalculatorColour,
} from '@/lib/fms-calculator-colour-presets';
import { stripSupplierFromTypeName } from '@/lib/supplier-import-label';

export type FmsHubMaterialKind = 'pvc' | 'chain' | 'hybrid' | 'unsupported';

export type FmsHubMaterialInference = {
  kind: FmsHubMaterialKind;
  /** Tab to select in the FMS material calculator hub (null when unsupported). */
  tab: 'pvc' | 'chain' | 'hybrid_h' | 'hybrid_v' | null;
  pvcColour: FmsPvcCalculatorColour | null;
  wpcColour: FmsWpcCalculatorColour | null;
  /** Shown in UI / alerts when unsupported. */
  materialLabel: string;
};

type DesignOption = { height_ft?: number; type?: string; style?: string; colour?: string } | null | undefined;

function splitSummaryParts(summary: string): string[] {
  return summary
    .split(/\s*•\s*|\s*[|]\s*/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function coloursFromBlob(colourField: string | null | undefined, summary: string): {
  pvc: FmsPvcCalculatorColour | null;
  wpc: FmsWpcCalculatorColour | null;
} {
  let pvc = coerceFmsPvcCalculatorColour(colourField);
  let wpc = coerceFmsWpcCalculatorColour(colourField);
  for (const part of splitSummaryParts(summary)) {
    if (!pvc) pvc = coerceFmsPvcCalculatorColour(part);
    if (!wpc) wpc = coerceFmsWpcCalculatorColour(part);
  }
  return { pvc, wpc };
}

/**
 * Map a saved quote / material request (`design_option` + `design_summary`) to the FMS hub tab and colours.
 * Anything that is clearly not vinyl/PVC, chain link, or hybrid is `unsupported`.
 */
export function inferFmsHubMaterialFromQuoteProject(project: {
  design_summary: string | null;
  design_option: DesignOption;
}): FmsHubMaterialInference {
  const rawType = stripSupplierFromTypeName(project.design_option?.type ?? '').trim();
  const rawStyle = String(project.design_option?.style ?? '').trim();
  const summary = String(project.design_summary ?? '').trim();
  const colourField = project.design_option?.colour?.trim() ?? null;

  const blob = `${rawType} ${rawStyle} ${summary}`.toLowerCase();
  const materialLabel = rawType || summary || 'This job';

  const { pvc: pvcHint, wpc: wpcHint } = coloursFromBlob(colourField, summary);

  const isHybrid = /\bhybrid\b/i.test(blob);
  if (isHybrid) {
    const pvcColour = pvcHint ?? 'White';
    const wpcColour = wpcHint ?? 'Ash';
    // Vertical hybrid (6'4" PVC panels) vs horizontal hybrid (WPC / aluminum boards).
    const isVertical = /\bvertical\b/i.test(blob);
    return {
      kind: 'hybrid',
      tab: isVertical ? 'hybrid_v' : 'hybrid_h',
      pvcColour,
      wpcColour,
      materialLabel: rawType || rawStyle || 'Hybrid',
    };
  }

  const isChain =
    /\bchain\s*link\b/i.test(blob) ||
    /\bchainlink\b/i.test(blob) ||
    (/\bchain\b/i.test(blob) && /\blink\b/i.test(blob));
  if (isChain) {
    return {
      kind: 'chain',
      tab: 'chain',
      pvcColour: null,
      wpcColour: null,
      materialLabel: rawType || 'Chain link',
    };
  }

  const isVinylOrPvc =
    /\bvinyl\b/i.test(blob) ||
    /\bpvc\b/i.test(blob) ||
    /\bpolyrail\b/i.test(blob) ||
    /\bpoly\s*vinyl\b/i.test(blob);

  if (isVinylOrPvc) {
    const pvcColour = pvcHint ?? 'Adobe';
    return {
      kind: 'pvc',
      tab: 'pvc',
      pvcColour,
      wpcColour: null,
      materialLabel: rawType || 'PVC / Vinyl',
    };
  }

  return {
    kind: 'unsupported',
    tab: null,
    pvcColour: null,
    wpcColour: null,
    materialLabel,
  };
}

/** Label stored on `calculator_fence_colour` when a contractor sends a material request. */
export function fmsCalculatorColourLabelFromDesignOption(design_option: DesignOption): string | null {
  const inferred = inferFmsHubMaterialFromQuoteProject({
    design_summary: '',
    design_option: design_option ?? null,
  });
  if (inferred.kind === 'pvc' && inferred.pvcColour) return inferred.pvcColour;
  if (inferred.kind === 'chain') return 'Chain link';
  if (inferred.kind === 'hybrid') {
    if (inferred.tab === 'hybrid_v' && inferred.pvcColour) return inferred.pvcColour;
    if (inferred.tab === 'hybrid_h' && inferred.wpcColour) return `${inferred.wpcColour} (horizontal)`;
  }
  const c = design_option?.colour?.trim();
  return c || null;
}

export type ApplyMaterialQuoteCalculatorFields = {
  setJobAddress: (v: string) => void;
  setPvcBreakdownColour: (v: FmsPvcCalculatorColour) => void;
  setHybridWpcColour: (v: FmsWpcCalculatorColour) => void;
  setHybridPvcColour: (v: FmsPvcCalculatorColour) => void;
};

/** Apply job label + FMS calculator colours from a material quote request. */
export function applyMaterialQuoteCalculatorFields(
  req: {
    job_site_address?: string | null;
    calculator_fence_colour?: string | null;
    project?: {
      home_address?: string | null;
      design_summary?: string | null;
      design_option?: DesignOption;
    } | null;
  },
  setters: ApplyMaterialQuoteCalculatorFields
): { savedCalcColour: string | null } {
  const addr = String(req.job_site_address || req.project?.home_address || '').trim();
  if (addr) setters.setJobAddress(addr);

  const savedCalcColour = String(req.calculator_fence_colour || '').trim() || null;
  if (savedCalcColour) {
    const pvcCol = coerceFmsPvcCalculatorColour(savedCalcColour);
    if (pvcCol) {
      setters.setPvcBreakdownColour(pvcCol);
      return { savedCalcColour };
    }
    const horizontalMatch = /^(.+?)\s*\(horizontal\)\s*$/i.exec(savedCalcColour);
    if (horizontalMatch) {
      const wpc = coerceFmsWpcCalculatorColour(horizontalMatch[1]);
      if (wpc) setters.setHybridWpcColour(wpc);
      return { savedCalcColour };
    }
    const wpc = coerceFmsWpcCalculatorColour(savedCalcColour);
    if (wpc) {
      setters.setHybridWpcColour(wpc);
      return { savedCalcColour };
    }
  }

  return { savedCalcColour };
}
