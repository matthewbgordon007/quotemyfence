'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

const field =
  'rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20';

const FenceDrawingMap = dynamic(
  () => import('@/components/FenceDrawingMap').then((m) => ({ default: m.FenceDrawingMap })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[220px] animate-pulse rounded-xl border border-slate-200/80 bg-slate-100/80" />
    ),
  }
);

type ProductOption = {
  id: string;
  height_ft: number;
  color: string | null;
  style_name: string | null;
};

type Product = {
  id: string;
  name: string;
  product_options: ProductOption[];
};

type PricingRule = {
  product_option_id?: string;
  colour_option_id?: string;
  fence_style_id?: string;
  base_price_per_ft_low: number;
  base_price_per_ft_high: number;
  single_gate_low: number;
  single_gate_high: number;
  double_gate_low: number;
  double_gate_high: number;
  removal_price_per_ft_low: number;
  removal_price_per_ft_high: number;
  minimum_job_low: number;
  minimum_job_high: number;
};

type ColourOption = { id: string; fence_style_id: string; color_name: string };
type FenceStyle = { id: string; fence_type_id: string; style_name: string };
type FenceType = { id: string; name: string };

type Segment = {
  key: string;
  name: string;
  meters: number;
  feet: number;
  lastEdited: 'meters' | 'feet';
  extend: boolean;
  shared: boolean;
  sharedWith: string;
};

const SEGMENTS: Segment[] = [
  { key: 'lhs_adj', name: 'LHS Adjacent', meters: 0, feet: 0, lastEdited: 'meters', extend: false, shared: false, sharedWith: '' },
  { key: 'lhs', name: 'LHS', meters: 0, feet: 0, lastEdited: 'meters', extend: false, shared: false, sharedWith: '' },
  { key: 'back', name: 'Back', meters: 0, feet: 0, lastEdited: 'meters', extend: false, shared: false, sharedWith: '' },
  { key: 'rhs', name: 'RHS', meters: 0, feet: 0, lastEdited: 'meters', extend: false, shared: false, sharedWith: '' },
  { key: 'rhs_adj', name: 'RHS Adjacent', meters: 0, feet: 0, lastEdited: 'meters', extend: false, shared: false, sharedWith: '' },
];

const M_TO_FT = 3.28084;
const ROUND_INC = 0.05;
const EXTEND_ADD = 2;

function safeNum(v: unknown): number {
  return Number(v) || 0;
}

function moneyCAD(n: number): string {
  return (Number.isFinite(n) ? n : 0).toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });
}

function roundToInc(x: number, inc: number): number {
  if (inc <= 0) return x;
  return Math.round(x / inc) * inc;
}

function calcFeetFinal(seg: Segment, extendAdd: number): number {
  const ftRaw = seg.feet;
  const ftRounded = roundToInc(ftRaw, ROUND_INC);
  const ftFinal = ftRounded + (seg.extend ? extendAdd : 0);
  return Math.max(0, Math.round(ftFinal * 100) / 100);
}

function fmtFeet(ft: number): string {
  return ft.toFixed(2) + "'";
}

export default function CalculatorPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [types, setTypes] = useState<FenceType[]>([]);
  const [styles, setStyles] = useState<FenceStyle[]>([]);
  const [colours, setColours] = useState<ColourOption[]>([]);
  const [colourPricingRules, setColourPricingRules] = useState<PricingRule[]>([]);
  const [stylePricingRules, setStylePricingRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [quoteAddress, setQuoteAddress] = useState('');
  const [homeownerName, setHomeownerName] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [selectedColourId, setSelectedColourId] = useState<string | null>(null);
  const [pricePerFtOverride, setPricePerFtOverride] = useState<number | null>(null);
  const [segments, setSegments] = useState<Segment[]>(() => JSON.parse(JSON.stringify(SEGMENTS)));
  const [extendAdd, setExtendAdd] = useState(EXTEND_ADD);
  const [singleGateQty, setSingleGateQty] = useState(0);
  const [doubleGateQty, setDoubleGateQty] = useState(0);
  const [hasRemoval, setHasRemoval] = useState(false);
  const [taxRate, setTaxRate] = useState(13);
  const [applyTax, setApplyTax] = useState(true);
  const [gateSideKey, setGateSideKey] = useState('back');
  const [customerSegments, setCustomerSegments] = useState<{ start_lat: number; start_lng: number; end_lat: number; end_lng: number; length_ft?: number }[]>([]);
  const [customerGates, setCustomerGates] = useState<{ gate_type: string; quantity: number; lat?: number | null; lng?: number | null }[]>([]);
  const [customerMapCenter, setCustomerMapCenter] = useState<[number, number] | undefined>(undefined);
  const [segmentAssignments, setSegmentAssignments] = useState<Record<string, number | null>>({});

  const searchParams = useSearchParams();
  const router = useRouter();
  const fromCustomerId = searchParams.get('from');
  const quoteId = searchParams.get('quote_id');

  useEffect(() => {
    async function load() {
      try {
        const [productsRes, hierarchyRes] = await Promise.all([
          fetch('/api/contractor/products', { cache: 'no-store' }),
          fetch('/api/contractor/product-hierarchy', { cache: 'no-store' }),
        ]);
        const productsData = productsRes.ok ? await productsRes.json() : {};
        const hierarchyData = hierarchyRes.ok ? await hierarchyRes.json() : {};

        const prods = Array.isArray(productsData?.products) ? productsData.products : [];
        const rules = Array.isArray(productsData?.pricingRules) ? productsData.pricingRules : [];
        const hierarchyTypes = Array.isArray(hierarchyData?.fenceTypes) ? hierarchyData.fenceTypes : [];
        const hierarchyStyles = Array.isArray(hierarchyData?.fenceStyles) ? hierarchyData.fenceStyles : [];
        const hierarchyColours = Array.isArray(hierarchyData?.colourOptions) ? hierarchyData.colourOptions : [];
        const colourRules = Array.isArray(hierarchyData?.colourPricingRules) ? hierarchyData.colourPricingRules : [];
        const styleRules = Array.isArray(hierarchyData?.stylePricingRules) ? hierarchyData.stylePricingRules : [];

        setProducts(prods);
        setTypes(hierarchyTypes);
        setStyles(hierarchyStyles);
        setColours(hierarchyColours);
        setPricingRules(rules);
        setColourPricingRules(colourRules);
        setStylePricingRules(styleRules);

        const firstType = hierarchyTypes[0];
        if (firstType) {
          const typeStyles = hierarchyStyles.filter((s: FenceStyle) => s.fence_type_id === firstType.id);
          const firstStyle = typeStyles[0];
          if (firstStyle) {
            const styleColours = hierarchyColours.filter((c: ColourOption) => c.fence_style_id === firstStyle.id);
            const styleHasRule = styleRules.some((r: { fence_style_id?: string }) => r?.fence_style_id === firstStyle.id);
            const colourHasRule = (c: ColourOption) =>
              styleRules.some((r: { fence_style_id?: string }) => r?.fence_style_id === c.fence_style_id) ||
              colourRules.some((r: { colour_option_id?: string }) => r?.colour_option_id === c.id);
            const firstColourWithRule = styleHasRule
              ? styleColours[0]
              : styleColours.find(colourHasRule);
            if (firstColourWithRule) {
              setSelectedTypeId(firstType.id);
              setSelectedStyleId(firstStyle.id);
              setSelectedColourId(firstColourWithRule.id);
            }
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (loading) return;

    if (quoteId) {
      // If loading a specific saved quote, use its state
      fetch(`/api/contractor/quotes/${quoteId}`)
        .then((r) => {
          if (!r.ok) throw new Error('Not found');
          return r.json();
        })
        .then((data) => {
          const st = data.quote?.calculator_state;
          if (st) {
            if (st.homeownerName) setHomeownerName(st.homeownerName);
            if (st.quoteAddress) setQuoteAddress(st.quoteAddress);
            if (st.selectedTypeId) setSelectedTypeId(st.selectedTypeId);
            if (st.selectedStyleId) setSelectedStyleId(st.selectedStyleId);
            if (st.selectedColourId) setSelectedColourId(st.selectedColourId);
            if (st.pricePerFtOverride != null) setPricePerFtOverride(st.pricePerFtOverride);
            if (st.segments) setSegments(st.segments);
            if (st.extendAdd) setExtendAdd(st.extendAdd);
            if (st.singleGateQty != null) setSingleGateQty(st.singleGateQty);
            if (st.doubleGateQty != null) setDoubleGateQty(st.doubleGateQty);
            if (st.hasRemoval != null) setHasRemoval(st.hasRemoval);
            if (st.taxRate != null) setTaxRate(st.taxRate);
            if (st.applyTax != null) setApplyTax(st.applyTax);
            if (st.gateSideKey) setGateSideKey(st.gateSideKey);
            if (st.segmentAssignments) setSegmentAssignments(st.segmentAssignments);
          }
        })
        .catch(() => {});
        
      // Still fetch the customer to get the drawing map if fromCustomerId exists
      if (fromCustomerId) {
        fetch(`/api/contractor/customers/${fromCustomerId}`)
          .then((r) => r.ok ? r.json() : null)
          .then((data) => {
            if (!data) return;
            const segs = data.segments || [];
            const gateList = data.gates || [];
            const prop = data.property;
            
            if (segs.length > 0) {
              setCustomerSegments(segs);
              if (prop?.latitude != null && prop?.longitude != null) {
                setCustomerMapCenter([Number(prop.latitude), Number(prop.longitude)]);
              }
            }
            if (gateList.length > 0) {
              setCustomerGates(gateList);
            }
          })
          .catch(() => {});
      }
    } else if (fromCustomerId) {
      // If no saved quote, but we have a customer, populate from their lead data
      fetch(`/api/contractor/customers/${fromCustomerId}`)
        .then((r) => {
          if (!r.ok) throw new Error('Not found');
          return r.json();
        })
        .then((data) => {
          const c = data.customer;
          const prop = data.property;
          const fence = data.fence;
          const segs = data.segments || [];
          const gateList = data.gates || [];

          if (c) setHomeownerName(`${c.first_name || ''} ${c.last_name || ''}`.trim());
          if (prop?.formatted_address) setQuoteAddress(prop.formatted_address);
          if (fence?.has_removal) setHasRemoval(true);

          const singleG = gateList.find((g: { gate_type: string }) => g.gate_type === 'single');
          const doubleG = gateList.find((g: { gate_type: string }) => g.gate_type === 'double');
          if (singleG?.quantity) setSingleGateQty(singleG.quantity);
          if (doubleG?.quantity) setDoubleGateQty(doubleG.quantity);

          if (segs.length > 0) {
            setCustomerSegments(segs);
            if (prop?.latitude != null && prop?.longitude != null) {
              setCustomerMapCenter([Number(prop.latitude), Number(prop.longitude)]);
            }
            setSegmentAssignments({ lhs_adj: null, lhs: null, back: null, rhs: null, rhs_adj: null });
          }

          if (gateList.length > 0) {
            setCustomerGates(gateList);
          }

          if (fence?.selected_colour_option_id) {
            setSelectedColourId(fence.selected_colour_option_id);
            fetch('/api/contractor/product-hierarchy')
              .then((r) => r.ok ? r.json() : null)
              .then((h) => {
                if (!h?.colourOptions?.length) return;
                const colour = h.colourOptions.find((c: ColourOption) => c.id === fence.selected_colour_option_id);
                if (!colour) return;
                const style = (h.fenceStyles || []).find((s: FenceStyle) => s.id === colour.fence_style_id);
                if (!style) return;
                const type = (h.fenceTypes || []).find((t: FenceType) => t.id === style.fence_type_id);
                if (type) {
                  setSelectedTypeId(type.id);
                  setSelectedStyleId(style.id);
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [fromCustomerId, quoteId, loading]);

  const stylesForType = selectedTypeId ? styles.filter((s) => s.fence_type_id === selectedTypeId) : [];
  const coloursForStyle = selectedStyleId ? colours.filter((c) => c.fence_style_id === selectedStyleId) : [];
  const styleHasPricing = (styleId: string) =>
    stylePricingRules.some((r) => r.fence_style_id === styleId);
  const colourHasPricing = (c: ColourOption) =>
    styleHasPricing(c.fence_style_id) || colourPricingRules.some((r) => r.colour_option_id === c.id);
  const coloursWithPricing = coloursForStyle.filter(colourHasPricing);

  const selectedColour = colours.find((c) => c.id === selectedColourId);
  const styleRule = selectedColour
    ? stylePricingRules.find((r) => r.fence_style_id === selectedColour.fence_style_id)
    : null;
  const colourRule = selectedColourId
    ? colourPricingRules.find((r) => r.colour_option_id === selectedColourId)
    : null;
  const rule = styleRule ?? colourRule ?? null;

  const cataloguePricePerFt = rule
    ? (safeNum(rule.base_price_per_ft_low) + safeNum(rule.base_price_per_ft_high)) / 2 || 0
    : 0;
  const pricePerFt = pricePerFtOverride != null ? pricePerFtOverride : cataloguePricePerFt;
  const singleGatePrice = rule
    ? (safeNum(rule.single_gate_low) + safeNum(rule.single_gate_high)) / 2 || 0
    : 0;
  const doubleGatePrice = rule
    ? (safeNum(rule.double_gate_low) + safeNum(rule.double_gate_high)) / 2 || 0
    : 0;
  const removalPerFt = rule ? safeNum(rule.removal_price_per_ft_low) : 0;
  const minJob = rule ? (safeNum(rule.minimum_job_low) + safeNum(rule.minimum_job_high)) / 2 || 0 : 0;

  const selectedType = types.find((t) => t.id === selectedTypeId);
  const selectedStyle = styles.find((s) => s.id === selectedStyleId);
  const selectedColourDisplay = colours.find((c) => c.id === selectedColourId);
  const optionLabel = selectedType
    ? [selectedType.name, selectedStyle?.style_name, selectedColourDisplay?.color_name].filter(Boolean).join(' • ')
    : null;

  const hasHierarchyOptions = types.some((t) => {
    const typeStyles = styles.filter((s) => s.fence_type_id === t.id);
    return typeStyles.some((s) => {
      const styleColours = colours.filter((c) => c.fence_style_id === s.id);
      return stylePricingRules.some((r) => r.fence_style_id === s.id) ||
        styleColours.some((c) => colourPricingRules.some((r) => r.colour_option_id === c.id));
    });
  });

  const feetFinalByKey: Record<string, number> = {};
  let billableLength = 0;
  let totalLength = 0;
  for (const seg of segments) {
    const ft = calcFeetFinal(seg, extendAdd);
    feetFinalByKey[seg.key] = ft;
    totalLength += ft;
    billableLength += seg.shared ? ft * 0.5 : ft;
  }

  let privateTotal = 0;
  let sharedTotal = 0;
  const segmentCosts: Record<string, number> = {};
  for (const seg of segments) {
    const ft = feetFinalByKey[seg.key];
    const cost = ft * pricePerFt * (seg.shared ? 0.5 : 1);
    segmentCosts[seg.key] = cost;
    if (seg.shared) sharedTotal += cost;
    else privateTotal += cost;
  }
  const gateTotal =
    singleGateQty * singleGatePrice + doubleGateQty * doubleGatePrice;
  privateTotal += gateTotal;
  const removalTotal = hasRemoval && totalLength > 0 ? totalLength * removalPerFt : 0;
  const subtotal = Math.max(
    privateTotal + sharedTotal + removalTotal,
    minJob
  );
  const taxAmount = applyTax ? subtotal * (taxRate / 100) : 0;
  const grandTotal = subtotal + taxAmount;
  const deposit = grandTotal * 0.1;

  function updateSegment(index: number, updates: Partial<Segment>) {
    setSegments((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  }

  function syncFromMeters(index: number, meters: number) {
    const feet = meters * M_TO_FT;
    updateSegment(index, { meters, feet, lastEdited: 'meters' });
  }

  function syncFromFeet(index: number, feet: number) {
    const meters = feet / M_TO_FT;
    updateSegment(index, { meters, feet, lastEdited: 'feet' });
  }

  function assignLineToSegment(segKey: string, segIdx: number, lineIndex: number | null) {
    setSegmentAssignments((prev) => ({ ...prev, [segKey]: lineIndex }));
    if (lineIndex != null && customerSegments[lineIndex]?.length_ft != null) {
      const ft = Number(customerSegments[lineIndex].length_ft);
      const meters = ft / M_TO_FT;
      updateSegment(segIdx, { feet: ft, meters, lastEdited: 'feet' });
    } else if (lineIndex === null) {
      updateSegment(segIdx, { feet: 0, meters: 0, lastEdited: 'feet' });
    }
  }

  function addSegment() {
    const newKey = `custom_${Date.now()}`;
    setSegments((prev) => [
      ...prev,
      { key: newKey, name: `Line ${prev.length + 1}`, meters: 0, feet: 0, lastEdited: 'feet', extend: false, shared: false, sharedWith: '' }
    ]);
  }

  function removeSegment(index: number) {
    if (window.confirm('Are you sure you want to delete this line?')) {
      setSegments((prev) => prev.filter((_, i) => i !== index));
    }
  }

  function resetCalculator() {
    setQuoteAddress('');
    setHomeownerName('');
    setPricePerFtOverride(null);
    setCustomerSegments([]);
    setCustomerMapCenter(undefined);
    setSegmentAssignments({});
    setSegments(JSON.parse(JSON.stringify(SEGMENTS)));
    setSingleGateQty(0);
    setDoubleGateQty(0);
    setHasRemoval(false);
    setApplyTax(true);
    if (types[0]) {
      const tStyles = styles.filter((s) => s.fence_type_id === types[0].id);
      const firstStyle = tStyles[0];
      if (firstStyle) {
        const sColours = colours.filter((c) => c.fence_style_id === firstStyle.id);
        const styleHasRule = stylePricingRules.some((r) => r.fence_style_id === firstStyle.id);
        const firstWithRule = styleHasRule
          ? sColours[0]
          : sColours.find((c) => colourPricingRules.some((r) => r.colour_option_id === c.id));
        setSelectedTypeId(types[0].id);
        setSelectedStyleId(firstStyle.id);
        setSelectedColourId(firstWithRule?.id ?? null);
      }
    }
  }

  const quoteLines: string[] = [];
  for (const seg of segments) {
    const ft = feetFinalByKey[seg.key];
    if (ft <= 0) continue;
    const cost = segmentCosts[seg.key];
    if (seg.shared) {
      const who = (seg.sharedWith || '').trim() || 'neighbour';
      quoteLines.push(
        `- ${seg.name}: ${fmtFeet(ft)} shared 50% with ${who} @ ${moneyCAD(pricePerFt)}/ft = ${moneyCAD(cost)}`
      );
    } else {
      quoteLines.push(
        `- ${seg.name}: ${fmtFeet(ft)} @ ${moneyCAD(pricePerFt)}/ft = ${moneyCAD(cost)}`
      );
    }
  }

  const quoteText = `Fence Quote Summary

Prepared for: ${homeownerName || '—'}
Location: ${quoteAddress || '—'}
Product: ${optionLabel || '—'}
Gates: ${singleGateQty} single, ${doubleGateQty} double${hasRemoval ? ' • Removal included' : ''}

Lengths & line totals:
${quoteLines.length ? quoteLines.join('\n') : '- (No lengths entered)'}

Totals:
- Private fence: ${moneyCAD(privateTotal - gateTotal)}
- Shared fence: ${moneyCAD(sharedTotal)}
- Gates: ${moneyCAD(gateTotal)}
- Removal: ${moneyCAD(removalTotal)}
- Subtotal: ${moneyCAD(subtotal)}${applyTax ? '' : ' (before tax)'}
${applyTax ? `- Tax (${taxRate}%): ${moneyCAD(taxAmount)}\n- Total: ${moneyCAD(grandTotal)}` : ''}

Deposit (10% incl. tax): ${moneyCAD(deposit)}
`;

  async function copyQuote() {
    try {
      await navigator.clipboard.writeText(quoteText);
      alert('Quote copied to clipboard.');
    } catch {
      prompt('Copy this text:', quoteText);
    }
  }

  const [savingToCustomer, setSavingToCustomer] = useState(false);
  
  function getCalculatorState() {
    return {
      homeownerName,
      quoteAddress,
      selectedTypeId,
      selectedStyleId,
      selectedColourId,
      pricePerFtOverride,
      segments,
      extendAdd,
      singleGateQty,
      doubleGateQty,
      hasRemoval,
      taxRate,
      applyTax,
      gateSideKey,
      segmentAssignments,
    };
  }

  async function saveToCustomer() {
    if (!fromCustomerId) return;
    setSavingToCustomer(true);
    try {
      const res = await fetch(`/api/contractor/customers/${fromCustomerId}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          quote_text: quoteText, 
          grand_total: grandTotal,
          calculator_state: getCalculatorState(),
        }),
      });
      if (res.ok) {
        alert('Quote saved to customer.');
        router.push(`/dashboard/customers/${fromCustomerId}`);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save quote.');
      }
    } catch {
      alert('Failed to save quote.');
    } finally {
      setSavingToCustomer(false);
    }
  }

  async function saveAsNewQuote() {
    setSavingToCustomer(true);
    try {
      const res = await fetch(`/api/contractor/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          quote_text: quoteText, 
          grand_total: grandTotal,
          calculator_state: getCalculatorState(),
          homeowner_name: homeownerName,
          quote_address: quoteAddress,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        alert('Quote saved as a new lead.');
        router.push(`/dashboard/customers/${data.quote_session_id}`);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save quote.');
      }
    } catch {
      alert('Failed to save quote.');
    } finally {
      setSavingToCustomer(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-8">
        <div className="h-8 w-72 animate-pulse rounded-lg bg-slate-200/80" />
        <div className="h-4 max-w-xl animate-pulse rounded bg-slate-200/60" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
          <div className="space-y-4">
            <div className="h-80 animate-pulse rounded-2xl bg-slate-200/70" />
            <div className="h-96 animate-pulse rounded-2xl bg-slate-200/50" />
          </div>
          <div className="h-72 animate-pulse rounded-2xl bg-slate-200/60" />
        </div>
      </div>
    );
  }

  if (!hasHierarchyOptions) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-8 py-12 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quote calculator</p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">Set up products first</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-600">
          Add fence types, styles, and colours with pricing in Products, then return here to price jobs.
        </p>
        <Link
          href="/dashboard/products"
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-500"
        >
          Go to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 pb-8">
      <div className="flex flex-col gap-6 border-b border-slate-200/80 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Sales tools</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Quote calculator</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Build quotes from your catalog. Enter lengths in meters or feet, map customer drawing lines to sides when
            available, then copy or save.
          </p>
          {fromCustomerId && (
            <Link
              href={`/dashboard/customers/${fromCustomerId}`}
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition hover:text-blue-500"
            >
              <span aria-hidden>←</span> Back to this lead
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/products"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            Products
          </Link>
          <Link
            href="/dashboard/customers"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            Leads
          </Link>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">Quote setup</h2>
              <p className="mt-0.5 text-xs text-slate-500">Homeowner • Address • Product • Gates • Tax</p>
            </div>
            <div className="space-y-6 p-5 sm:p-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Homeowner name</label>
                  <input
                    type="text"
                    value={homeownerName}
                    onChange={(e) => setHomeownerName(e.target.value)}
                    placeholder="e.g., John Smith"
                    className={field}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Address / location</label>
                  <input
                    type="text"
                    value={quoteAddress}
                    onChange={(e) => setQuoteAddress(e.target.value)}
                    placeholder="e.g., 113 Ocala Street"
                    className={field}
                  />
                </div>
              </div>
              <div className="space-y-4 border-t border-slate-100 pt-6">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Fence type</label>
                  <select
                    value={selectedTypeId || ''}
                    onChange={(e) => {
                      const id = e.target.value || null;
                      setSelectedTypeId(id);
                      setSelectedStyleId(null);
                      setSelectedColourId(null);
                      setPricePerFtOverride(null);
                      if (id) {
                        const tStyles = styles.filter((s) => s.fence_type_id === id);
                        const firstStyle = tStyles[0];
                        if (firstStyle) {
                          setSelectedStyleId(firstStyle.id);
                          const sColours = colours.filter((c) => c.fence_style_id === firstStyle.id);
                          const styleHasRule = stylePricingRules.some((r) => r.fence_style_id === firstStyle.id);
                          const firstWithRule = styleHasRule
                            ? sColours[0]
                            : sColours.find((c) => colourPricingRules.some((r) => r.colour_option_id === c.id));
                          if (firstWithRule) setSelectedColourId(firstWithRule.id);
                        }
                      }
                    }}
                    className={field}
                  >
                    <option value="">Select type</option>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Style</label>
                    <select
                      value={selectedStyleId || ''}
                      onChange={(e) => {
                        const id = e.target.value || null;
                        setSelectedStyleId(id);
                        setSelectedColourId(null);
                        setPricePerFtOverride(null);
                        if (id) {
                          const sColours = colours.filter((c) => c.fence_style_id === id);
                          const styleHasRule = stylePricingRules.some((r) => r.fence_style_id === id);
                          const firstWithRule = styleHasRule
                            ? sColours[0]
                            : sColours.find((c) => colourPricingRules.some((r) => r.colour_option_id === c.id));
                          if (firstWithRule) setSelectedColourId(firstWithRule.id);
                        }
                      }}
                      className={`${field} disabled:cursor-not-allowed disabled:opacity-50`}
                      disabled={!selectedTypeId}
                    >
                      <option value="">Select style</option>
                      {stylesForType.map((s) => (
                        <option key={s.id} value={s.id}>{s.style_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Colour</label>
                    <select
                      value={selectedColourId || ''}
                      onChange={(e) => {
                        setSelectedColourId(e.target.value || null);
                        setPricePerFtOverride(null);
                      }}
                      className={`${field} disabled:cursor-not-allowed disabled:opacity-50`}
                      disabled={!selectedStyleId}
                    >
                      <option value="">Select colour</option>
                      {coloursWithPricing.map((c) => (
                        <option key={c.id} value={c.id}>{c.color_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {selectedColourId && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Price per ft <span className="font-normal text-slate-500">(catalogue default — editable for this quote only)</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-600">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={pricePerFt > 0 ? pricePerFt : ''}
                        onChange={(e) => {
                          const v = safeNum(e.target.value);
                          setPricePerFtOverride(v > 0 ? v : null);
                        }}
                        placeholder={cataloguePricePerFt > 0 ? String(cataloguePricePerFt) : '—'}
                        className="w-32 rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm font-semibold tabular-nums text-slate-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                      />
                      <span className="text-xs text-slate-500">/ ft</span>
                      {pricePerFtOverride != null && (
                        <button
                          type="button"
                          onClick={() => setPricePerFtOverride(null)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-500 hover:underline"
                        >
                          Reset to catalogue
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 border-t border-slate-100 pt-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Single gates</label>
                    <input
                      type="number"
                      min={0}
                      value={singleGateQty}
                      onChange={(e) => setSingleGateQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className={field}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Double gates</label>
                    <input
                      type="number"
                      min={0}
                      value={doubleGateQty}
                      onChange={(e) => setDoubleGateQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className={field}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Gate side</label>
                    <select
                      value={gateSideKey}
                      onChange={(e) => setGateSideKey(e.target.value)}
                      className={field}
                    >
                      {segments.map((s) => (
                        <option key={s.key} value={s.key}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t border-slate-100 pt-6">
                <div className="flex flex-wrap gap-3">
                  <label className="flex min-w-[140px] flex-1 cursor-pointer items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={hasRemoval}
                      onChange={(e) => setHasRemoval(e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                    />
                    <span>Removal</span>
                  </label>
                  <label className="flex min-w-[140px] flex-1 cursor-pointer items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={applyTax}
                      onChange={(e) => setApplyTax(e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                    />
                    <span>Apply tax</span>
                  </label>
                </div>
                {applyTax && (
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/90 px-4 py-3">
                    <label htmlFor="tax-rate" className="text-sm font-medium text-slate-700">
                      Tax rate (%)
                    </label>
                    <input
                      id="tax-rate"
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={taxRate}
                      onChange={(e) => setTaxRate(Math.min(100, Math.max(0, safeNum(e.target.value))))}
                      className="w-24 rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-sm font-semibold tabular-nums text-slate-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/90 p-4">
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-semibold text-slate-900">Extend add</span>
                    <span className="text-xs text-slate-500">Extra feet when a segment uses &quot;Extend&quot;</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={extendAdd}
                    onChange={(e) => setExtendAdd(safeNum(e.target.value) || EXTEND_ADD)}
                    className="w-24 shrink-0 rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-center text-sm font-medium tabular-nums text-slate-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">Segments</h2>
              <p className="mt-0.5 text-xs text-slate-500">Meters or feet • Extend • Shared fence (50%)</p>
            </div>
            {customerSegments.length > 0 && customerMapCenter && (
              <div className="border-b border-slate-100 p-5">
                <p className="mb-3 text-xs font-medium leading-relaxed text-slate-600">
                  Customer drawing — assign each numbered line to the correct side (LHS, back, RHS, etc.).
                </p>
                <FenceDrawingMap
                  segments={customerSegments}
                  gates={customerGates}
                  center={customerMapCenter}
                  className="min-h-[220px] overflow-hidden rounded-xl border border-slate-200/80"
                />
              </div>
            )}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/90">
                    <th className="px-3 py-2 text-left font-medium">Segment</th>
                    {customerSegments.length > 0 && (
                      <th className="px-3 py-2 text-left font-medium">From line</th>
                    )}
                    <th className="px-3 py-2 text-right font-medium">Meters</th>
                    <th className="px-3 py-2 text-right font-medium">Feet</th>
                    <th className="px-3 py-2 text-center font-medium">Extend</th>
                    <th className="px-3 py-2 text-center font-medium">Shared</th>
                    <th className="px-3 py-2 text-right font-medium">Cost</th>
                    <th className="px-3 py-2 text-center font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {segments.map((seg, idx) => (
                    <tr key={seg.key} className="border-b border-slate-100 transition-colors hover:bg-slate-50/80">
                      <td className="px-3 py-2.5">
                        <input
                          type="text"
                          value={seg.name}
                          onChange={(e) => updateSegment(idx, { name: e.target.value })}
                          className="w-36 rounded-lg border border-slate-200/90 bg-white px-2 py-1.5 text-sm font-medium text-slate-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-500/25"
                        />
                      </td>
                      {customerSegments.length > 0 && (
                        <td className="px-3 py-2.5">
                          <select
                            value={segmentAssignments[seg.key] != null ? String(segmentAssignments[seg.key]) : ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              assignLineToSegment(seg.key, idx, v === '' ? null : parseInt(v, 10));
                            }}
                            className="w-full max-w-[150px] rounded-lg border border-slate-200/90 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-500/25"
                          >
                            <option value="">—</option>
                            {customerSegments.map((cs, i) => (
                              <option key={i} value={i}>
                                Line {i + 1} ({cs.length_ft != null ? Number(cs.length_ft).toFixed(1) : '?'} ft)
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                      <td className="px-3 py-2.5 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={seg.meters || ''}
                          onChange={(e) => syncFromMeters(idx, safeNum(e.target.value))}
                          className="w-24 rounded-lg border border-slate-200/90 bg-white px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-500/25"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={seg.feet || ''}
                          onChange={(e) => syncFromFeet(idx, safeNum(e.target.value))}
                          className="w-24 rounded-lg border border-slate-200/90 bg-white px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-500/25"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={seg.extend}
                          onChange={(e) => updateSegment(idx, { extend: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={seg.shared}
                            onChange={(e) => updateSegment(idx, { shared: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                          />
                          {seg.shared && (
                            <input
                              type="text"
                              placeholder="Neighbour"
                              value={seg.sharedWith}
                              onChange={(e) => updateSegment(idx, { sharedWith: e.target.value })}
                              className="min-w-0 flex-1 rounded-lg border border-slate-200/90 bg-white px-2 py-1 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-500/25"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-slate-900">
                        {moneyCAD(segmentCosts[seg.key] ?? 0)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeSegment(idx)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Remove line"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col md:hidden">
              {segments.map((seg, idx) => (
                <div key={seg.key} className="space-y-4 border-b border-slate-100 p-5 last:border-b-0">
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="text"
                      value={seg.name}
                      onChange={(e) => updateSegment(idx, { name: e.target.value })}
                      className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-base font-bold text-slate-900 outline-none transition-colors focus:border-slate-200 focus:bg-slate-50"
                    />
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-base font-bold tabular-nums text-slate-900">
                        {moneyCAD(segmentCosts[seg.key] ?? 0)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSegment(idx)}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Remove line"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  </div>
                  
                  {customerSegments.length > 0 && (
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-600">Assign line</span>
                      <select
                        value={segmentAssignments[seg.key] != null ? String(segmentAssignments[seg.key]) : ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          assignLineToSegment(seg.key, idx, v === '' ? null : parseInt(v, 10));
                        }}
                        className="max-w-[180px] rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">—</option>
                        {customerSegments.map((cs, i) => (
                          <option key={i} value={i}>
                            Line {i + 1} ({cs.length_ft != null ? Number(cs.length_ft).toFixed(1) : '?'} ft)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Meters</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={seg.meters || ''}
                        onChange={(e) => syncFromMeters(idx, safeNum(e.target.value))}
                        className={field}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Feet</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={seg.feet || ''}
                        onChange={(e) => syncFromFeet(idx, safeNum(e.target.value))}
                        className={field}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={seg.extend}
                        onChange={(e) => updateSegment(idx, { extend: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      <span>Extend (+{extendAdd} ft)</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={seg.shared}
                        onChange={(e) => updateSegment(idx, { shared: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      <span>Shared 50%</span>
                    </label>
                  </div>

                  {seg.shared && (
                    <div>
                      <input
                        type="text"
                        placeholder="Neighbour name (optional)"
                        value={seg.sharedWith}
                        onChange={(e) => updateSegment(idx, { sharedWith: e.target.value })}
                        className={field}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 border-t border-slate-100 bg-slate-50/50 p-5">
              <button
                type="button"
                onClick={addSegment}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-500"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add line
              </button>
              <button
                type="button"
                onClick={resetCalculator}
                className="rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                Reset calculator
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-4 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">Totals</h2>
              <p className="mt-0.5 text-xs text-slate-500">Private • Shared • Gates • Tax • Deposit</p>
            </div>
            <div className="space-y-3 p-5 sm:p-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Private</span>
                <span className="font-semibold tabular-nums text-slate-900">{moneyCAD(privateTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Shared</span>
                <span className="font-semibold tabular-nums text-slate-900">{moneyCAD(sharedTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Gates</span>
                <span className="font-semibold tabular-nums text-slate-900">{moneyCAD(gateTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Removal</span>
                <span className="font-semibold tabular-nums text-slate-900">{moneyCAD(removalTotal)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-3 text-sm">
                <span className="font-medium text-slate-800">Subtotal</span>
                <span className="font-bold tabular-nums text-slate-900">{moneyCAD(subtotal)}</span>
              </div>
              {applyTax && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Tax ({taxRate}%)</span>
                  <span className="tabular-nums text-slate-900">{moneyCAD(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-100 pt-4 text-lg">
                <span className="font-bold text-slate-900">Grand total</span>
                <span className="font-bold tabular-nums text-blue-600">{moneyCAD(grandTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">10% deposit</span>
                <span className="font-semibold tabular-nums text-slate-900">{moneyCAD(deposit)}</span>
              </div>
            </div>
            <div className="space-y-3 border-t border-slate-100 bg-slate-50/40 p-5">
              {fromCustomerId ? (
                <button
                  type="button"
                  onClick={saveToCustomer}
                  disabled={savingToCustomer}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {savingToCustomer ? 'Saving…' : 'Save to customer'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={saveAsNewQuote}
                  disabled={savingToCustomer}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {savingToCustomer ? 'Saving…' : 'Save quote'}
                </button>
              )}
              <button
                type="button"
                onClick={copyQuote}
                className={`w-full rounded-xl px-4 py-3.5 text-sm font-bold shadow-sm transition ${
                  fromCustomerId
                    ? 'border border-slate-200/90 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                    : 'bg-white text-blue-700 ring-1 ring-inset ring-blue-200 hover:bg-blue-50/80'
                }`}
              >
                Copy quote text
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">Generated quote</h2>
              <p className="mt-0.5 text-xs text-slate-500">Read-only — copy or save from above</p>
            </div>
            <div className="p-4 sm:p-5">
              <textarea
                readOnly
                value={quoteText}
                rows={14}
                className="w-full resize-y rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 text-xs font-mono leading-relaxed text-slate-800 outline-none focus:border-slate-300 focus:ring-1 focus:ring-slate-200"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
