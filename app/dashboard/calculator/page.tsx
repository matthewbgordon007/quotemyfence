'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';

const FenceDrawingMap = dynamic(
  () => import('@/components/FenceDrawingMap').then((m) => ({ default: m.FenceDrawingMap })),
  { ssr: false, loading: () => <div className="min-h-[200px] animate-pulse rounded-lg border border-[var(--line)] bg-[var(--bg2)]" /> }
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
  const [loading, setLoading] = useState(true);
  const [quoteAddress, setQuoteAddress] = useState('');
  const [homeownerName, setHomeownerName] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [selectedColourId, setSelectedColourId] = useState<string | null>(null);
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
          fetch('/api/contractor/products'),
          fetch('/api/contractor/product-hierarchy'),
        ]);
        const productsData = productsRes.ok ? await productsRes.json() : {};
        const hierarchyData = hierarchyRes.ok ? await hierarchyRes.json() : {};

        const prods = Array.isArray(productsData?.products) ? productsData.products : [];
        const rules = Array.isArray(productsData?.pricingRules) ? productsData.pricingRules : [];
        const hierarchyTypes = Array.isArray(hierarchyData?.fenceTypes) ? hierarchyData.fenceTypes : [];
        const hierarchyStyles = Array.isArray(hierarchyData?.fenceStyles) ? hierarchyData.fenceStyles : [];
        const hierarchyColours = Array.isArray(hierarchyData?.colourOptions) ? hierarchyData.colourOptions : [];
        const colourRules = Array.isArray(hierarchyData?.colourPricingRules) ? hierarchyData.colourPricingRules : [];

        setProducts(prods);
        setTypes(hierarchyTypes);
        setStyles(hierarchyStyles);
        setColours(hierarchyColours);
        setPricingRules(rules);
        setColourPricingRules(colourRules);

        const firstType = hierarchyTypes[0];
        if (firstType) {
          const typeStyles = hierarchyStyles.filter((s: FenceStyle) => s.fence_type_id === firstType.id);
          const firstStyle = typeStyles[0];
          if (firstStyle) {
            const styleColours = hierarchyColours.filter((c: ColourOption) => c.fence_style_id === firstStyle.id);
            const firstColourWithRule = styleColours.find((c: ColourOption) =>
              colourRules.some((r: { colour_option_id?: string }) => r?.colour_option_id === c.id)
            );
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
        })
        .catch(() => {});
    }
  }, [fromCustomerId, quoteId, loading]);

  const stylesForType = selectedTypeId ? styles.filter((s) => s.fence_type_id === selectedTypeId) : [];
  const coloursForStyle = selectedStyleId ? colours.filter((c) => c.fence_style_id === selectedStyleId) : [];
  const coloursWithPricing = coloursForStyle.filter((c) =>
    colourPricingRules.some((r) => r.colour_option_id === c.id)
  );

  const rule = selectedColourId
    ? colourPricingRules.find((r) => r.colour_option_id === selectedColourId)
    : null;

  const pricePerFt = rule
    ? (safeNum(rule.base_price_per_ft_low) + safeNum(rule.base_price_per_ft_high)) / 2 || 0
    : 0;
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
  const selectedColour = colours.find((c) => c.id === selectedColourId);
  const optionLabel = selectedType
    ? [selectedType.name, selectedStyle?.style_name, selectedColour?.color_name].filter(Boolean).join(' • ')
    : null;

  const hasHierarchyOptions = types.some((t) => {
    const typeStyles = styles.filter((s) => s.fence_type_id === t.id);
    return typeStyles.some((s) => {
      const styleColours = colours.filter((c) => c.fence_style_id === s.id);
      return styleColours.some((c) => colourPricingRules.some((r) => r.colour_option_id === c.id));
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
    setSegments((prev) => prev.filter((_, i) => i !== index));
  }

  function resetCalculator() {
    setQuoteAddress('');
    setHomeownerName('');
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
        const firstWithRule = sColours.find((c) =>
          colourPricingRules.some((r) => r.colour_option_id === c.id)
        );
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
      <div className="text-[var(--muted)]">Loading products…</div>
    );
  }

  if (!hasHierarchyOptions) {
    return (
      <div className="rounded-xl border border-[var(--line)] bg-white p-6">
        <h2 className="text-lg font-bold">Quote Calculator</h2>
        <p className="mt-2 text-[var(--muted)]">
          Add fence types, styles, and colours with pricing in{' '}
          <a href="/dashboard/products" className="text-[var(--accent)] underline">
            Products
          </a>{' '}
          to use the calculator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Quote Calculator</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Build quotes from your product catalog. Enter lengths in meters or feet.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--line)] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[var(--line)] bg-[var(--bg2)] px-4 py-3">
              <h2 className="font-semibold">Quote setup</h2>
              <p className="text-xs text-[var(--muted)]">Homeowner • Address • Type • Style • Colour • Gates • Tax</p>
            </div>
            <div className="p-4 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--muted)] mb-1.5">Homeowner name</label>
                  <input
                    type="text"
                    value={homeownerName}
                    onChange={(e) => setHomeownerName(e.target.value)}
                    placeholder="e.g., John Smith"
                    className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--muted)] mb-1.5">Address / location</label>
                  <input
                    type="text"
                    value={quoteAddress}
                    onChange={(e) => setQuoteAddress(e.target.value)}
                    placeholder="e.g., 113 Ocala Street"
                    className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-base"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t border-[var(--line)]">
                <div>
                  <label className="block text-sm font-medium text-[var(--muted)] mb-1.5">Fence Type</label>
                  <select
                    value={selectedTypeId || ''}
                    onChange={(e) => {
                      const id = e.target.value || null;
                      setSelectedTypeId(id);
                      setSelectedStyleId(null);
                      setSelectedColourId(null);
                      if (id) {
                        const tStyles = styles.filter((s) => s.fence_type_id === id);
                        const firstStyle = tStyles[0];
                        if (firstStyle) {
                          setSelectedStyleId(firstStyle.id);
                          const sColours = colours.filter((c) => c.fence_style_id === firstStyle.id);
                          const firstWithRule = sColours.find((c) =>
                            colourPricingRules.some((r) => r.colour_option_id === c.id)
                          );
                          if (firstWithRule) setSelectedColourId(firstWithRule.id);
                        }
                      }
                    }}
                    className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-base bg-white"
                  >
                    <option value="">Select type</option>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--muted)] mb-1.5">Style</label>
                    <select
                      value={selectedStyleId || ''}
                      onChange={(e) => {
                        const id = e.target.value || null;
                        setSelectedStyleId(id);
                        setSelectedColourId(null);
                        if (id) {
                          const sColours = colours.filter((c) => c.fence_style_id === id);
                          const firstWithRule = sColours.find((c) =>
                            colourPricingRules.some((r) => r.colour_option_id === c.id)
                          );
                          if (firstWithRule) setSelectedColourId(firstWithRule.id);
                        }
                      }}
                      className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-base bg-white disabled:opacity-50"
                      disabled={!selectedTypeId}
                    >
                      <option value="">Select style</option>
                      {stylesForType.map((s) => (
                        <option key={s.id} value={s.id}>{s.style_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--muted)] mb-1.5">Colour</label>
                    <select
                      value={selectedColourId || ''}
                      onChange={(e) => setSelectedColourId(e.target.value || null)}
                      className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-base bg-white disabled:opacity-50"
                      disabled={!selectedStyleId}
                    >
                      <option value="">Select colour</option>
                      {coloursWithPricing.map((c) => (
                        <option key={c.id} value={c.id}>{c.color_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 pt-4 border-t border-[var(--line)]">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--muted)] mb-1.5">Single gates</label>
                    <input
                      type="number"
                      min={0}
                      value={singleGateQty}
                      onChange={(e) => setSingleGateQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--muted)] mb-1.5">Double gates</label>
                    <input
                      type="number"
                      min={0}
                      value={doubleGateQty}
                      onChange={(e) => setDoubleGateQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-base"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-[var(--muted)] mb-1.5">Gate side</label>
                    <select
                      value={gateSideKey}
                      onChange={(e) => setGateSideKey(e.target.value)}
                      className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-base bg-white"
                    >
                      {segments.map((s) => (
                        <option key={s.key} value={s.key}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-[var(--line)]">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg2)] px-4 py-3 text-base font-medium hover:bg-[var(--line)] transition-colors flex-1 min-w-[140px]">
                    <input
                      type="checkbox"
                      checked={hasRemoval}
                      onChange={(e) => setHasRemoval(e.target.checked)}
                      className="h-5 w-5 rounded border-[var(--line)] text-[var(--accent)]"
                    />
                    <span>Removal</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg2)] px-4 py-3 text-base font-medium hover:bg-[var(--line)] transition-colors flex-1 min-w-[140px]">
                    <input
                      type="checkbox"
                      checked={applyTax}
                      onChange={(e) => setApplyTax(e.target.checked)}
                      className="h-5 w-5 rounded border-[var(--line)] text-[var(--accent)]"
                    />
                    <span>Tax ({taxRate}%)</span>
                  </label>
                </div>
                <div className="flex items-center justify-between gap-4 p-3 bg-[var(--bg2)] rounded-xl border border-[var(--line)]">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Extend Add</span>
                    <span className="text-xs text-[var(--muted)]">Feet added when extending lines</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={extendAdd}
                    onChange={(e) => setExtendAdd(safeNum(e.target.value) || EXTEND_ADD)}
                    className="w-20 rounded-lg border border-[var(--line)] px-3 py-1.5 text-base text-center"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[var(--line)] bg-[var(--bg2)] px-4 py-3">
              <h2 className="font-semibold">Segments</h2>
              <p className="text-xs text-[var(--muted)]">Enter meters or feet • Extend • Shared (50%)</p>
            </div>
            {customerSegments.length > 0 && customerMapCenter && (
              <div className="p-4 border-b border-[var(--line)]">
                <p className="text-xs font-medium text-[var(--muted)] mb-2">Customer&apos;s drawing — use the numbered lines below to assign each to the correct side (LHS, Back, RHS, etc.)</p>
                <FenceDrawingMap segments={customerSegments} gates={customerGates} center={customerMapCenter} className="min-h-[200px] rounded-lg overflow-hidden" />
              </div>
            )}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] bg-[var(--bg2)]">
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
                    <tr key={seg.key} className="border-b border-[var(--line)] hover:bg-[var(--bg2)]/50 transition-colors">
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={seg.name}
                          onChange={(e) => updateSegment(idx, { name: e.target.value })}
                          className="w-32 rounded border border-[var(--line)] px-2 py-1.5 text-sm font-medium bg-transparent focus:bg-white transition-colors"
                        />
                      </td>
                      {customerSegments.length > 0 && (
                        <td className="px-3 py-2">
                          <select
                            value={segmentAssignments[seg.key] != null ? String(segmentAssignments[seg.key]) : ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              assignLineToSegment(seg.key, idx, v === '' ? null : parseInt(v, 10));
                            }}
                            className="rounded border border-[var(--line)] px-2 py-1 text-xs w-full max-w-[140px] bg-transparent"
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
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={seg.meters || ''}
                          onChange={(e) => syncFromMeters(idx, safeNum(e.target.value))}
                          className="w-24 rounded border border-[var(--line)] px-2 py-1 text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={seg.feet || ''}
                          onChange={(e) => syncFromFeet(idx, safeNum(e.target.value))}
                          className="w-24 rounded border border-[var(--line)] px-2 py-1 text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={seg.extend}
                          onChange={(e) => updateSegment(idx, { extend: e.target.checked })}
                          className="rounded border-[var(--line)] text-[var(--accent)]"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={seg.shared}
                            onChange={(e) => updateSegment(idx, { shared: e.target.checked })}
                            className="rounded border-[var(--line)] text-[var(--accent)]"
                          />
                          {seg.shared && (
                            <input
                              type="text"
                              placeholder="Neighbour"
                              value={seg.sharedWith}
                              onChange={(e) => updateSegment(idx, { sharedWith: e.target.value })}
                              className="flex-1 min-w-0 rounded border border-[var(--line)] px-2 py-1 text-xs"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {moneyCAD(segmentCosts[seg.key] ?? 0)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeSegment(idx)}
                          className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
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
                <div key={seg.key} className="border-b border-[var(--line)] p-4 space-y-3">
                  <div className="flex justify-between items-center font-bold text-[var(--text)]">
                    <input
                      type="text"
                      value={seg.name}
                      onChange={(e) => updateSegment(idx, { name: e.target.value })}
                      className="w-1/2 rounded border-b border-transparent focus:border-[var(--line)] focus:bg-[var(--bg2)] px-1 py-0.5 text-base font-bold bg-transparent transition-colors outline-none"
                    />
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{moneyCAD(segmentCosts[seg.key] ?? 0)}</span>
                      <button
                        type="button"
                        onClick={() => removeSegment(idx)}
                        className="text-red-500 bg-red-50 rounded p-1.5"
                        title="Remove line"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  </div>
                  
                  {customerSegments.length > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--muted)] font-medium">Assign line</span>
                      <select
                        value={segmentAssignments[seg.key] != null ? String(segmentAssignments[seg.key]) : ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          assignLineToSegment(seg.key, idx, v === '' ? null : parseInt(v, 10));
                        }}
                        className="rounded-lg border border-[var(--line)] px-2 py-1.5 text-sm bg-[var(--bg2)] max-w-[160px]"
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
                      <label className="block text-xs font-medium text-[var(--muted)] mb-1">Meters</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={seg.meters || ''}
                        onChange={(e) => syncFromMeters(idx, safeNum(e.target.value))}
                        className="w-full rounded-xl border border-[var(--line)] px-3 py-2 text-base font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--muted)] mb-1">Feet</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={seg.feet || ''}
                        onChange={(e) => syncFromFeet(idx, safeNum(e.target.value))}
                        className="w-full rounded-xl border border-[var(--line)] px-3 py-2 text-base font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--bg2)] px-3 py-2 text-sm font-medium hover:bg-[var(--line)] transition-colors">
                      <input
                        type="checkbox"
                        checked={seg.extend}
                        onChange={(e) => updateSegment(idx, { extend: e.target.checked })}
                        className="h-4 w-4 rounded border-[var(--line)] text-[var(--accent)]"
                      />
                      <span>Extend (+{extendAdd}ft)</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--bg2)] px-3 py-2 text-sm font-medium hover:bg-[var(--line)] transition-colors">
                      <input
                        type="checkbox"
                        checked={seg.shared}
                        onChange={(e) => updateSegment(idx, { shared: e.target.checked })}
                        className="h-4 w-4 rounded border-[var(--line)] text-[var(--accent)]"
                      />
                      <span>Shared 50%</span>
                    </label>
                  </div>

                  {seg.shared && (
                    <div className="pt-1">
                      <input
                        type="text"
                        placeholder="Neighbour name (optional)"
                        value={seg.sharedWith}
                        onChange={(e) => updateSegment(idx, { sharedWith: e.target.value })}
                        className="w-full rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={addSegment}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                Add line
              </button>
              <button
                type="button"
                onClick={resetCalculator}
                className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-medium hover:bg-[var(--bg2)] transition-colors"
              >
                Reset calculator
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6">
          <div className="rounded-xl border border-[var(--line)] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[var(--line)] bg-[var(--bg2)] px-4 py-3">
              <h2 className="font-semibold">Totals</h2>
              <p className="text-xs text-[var(--muted)]">Private • Shared • Gates • Deposit</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex justify-between text-base">
                <span className="text-[var(--muted)]">Private</span>
                <span className="font-semibold">{moneyCAD(privateTotal)}</span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-[var(--muted)]">Shared</span>
                <span className="font-semibold">{moneyCAD(sharedTotal)}</span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-[var(--muted)]">Gates</span>
                <span className="font-semibold">{moneyCAD(gateTotal)}</span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-[var(--muted)]">Removal</span>
                <span className="font-semibold">{moneyCAD(removalTotal)}</span>
              </div>
              <div className="flex justify-between text-base pt-3 border-t border-[var(--line)]">
                <span className="font-medium">Subtotal</span>
                <span className="font-bold">{moneyCAD(subtotal)}</span>
              </div>
              {applyTax && (
                <div className="flex justify-between text-base">
                  <span className="text-[var(--muted)]">Tax ({taxRate}%)</span>
                  <span>{moneyCAD(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl pt-3 border-t border-[var(--line)]">
                <span className="font-bold">Grand total</span>
                <span className="font-bold text-[var(--accent)]">{moneyCAD(grandTotal)}</span>
              </div>
              <div className="flex justify-between text-base pt-1">
                <span className="text-[var(--muted)]">10% deposit</span>
                <span className="font-semibold">{moneyCAD(deposit)}</span>
              </div>
            </div>
            <div className="p-5 border-t border-[var(--line)] space-y-3">
              {fromCustomerId ? (
                <button
                  type="button"
                  onClick={saveToCustomer}
                  disabled={savingToCustomer}
                  className="w-full rounded-xl bg-[var(--accent)] px-4 py-4 text-base font-bold text-white shadow-md hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {savingToCustomer ? 'Saving…' : 'Save to customer'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={saveAsNewQuote}
                  disabled={savingToCustomer}
                  className="w-full rounded-xl bg-[var(--accent)] px-4 py-4 text-base font-bold text-white shadow-md hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {savingToCustomer ? 'Saving…' : 'Save Quote'}
                </button>
              )}
              <button
                type="button"
                onClick={copyQuote}
                className={`w-full rounded-xl px-4 py-4 text-base font-bold shadow-md hover:opacity-90 transition-opacity ${fromCustomerId ? 'border border-[var(--line)] bg-white text-[var(--text)]' : 'bg-[var(--accent)] text-white'}`}
              >
                Copy quote text
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[var(--line)] bg-[var(--bg2)] px-4 py-3">
              <h2 className="font-semibold">Generated quote</h2>
            </div>
            <div className="p-4">
              <textarea
                readOnly
                value={quoteText}
                rows={14}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg2)] px-3 py-2 text-xs font-mono resize-y"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
