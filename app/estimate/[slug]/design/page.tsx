'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { estimateStepPath } from '@/lib/estimate-session-url';
import { useEstimate } from '../EstimateContext';
import { DesignSimpleOptions } from '../DesignSimpleOptions';
import { OptimizedProductImage } from '@/components/OptimizedProductImage';

type ProductOption = {
  id: string;
  productName: string;
  height_ft: number;
  color: string | null;
  style_name: string | null;
  rule: { base_price_per_ft_low: number; base_price_per_ft_high: number };
};

export default function DesignPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { config, state, setSelectedProductOptionId, setSelectedColourOptionId, setTotals } = useEstimate();

  const hierarchy = config.productHierarchy;
  const hasHierarchy = hierarchy && hierarchy.fenceTypes?.length > 0;

  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedHeightFt, setSelectedHeightFt] = useState<number | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [selectedColourId, setSelectedColourId] = useState<string | null>(state.selectedColourOptionId ?? state.selectedProductOptionId);
  const [loading, setLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<{
    low: number;
    high: number;
    breakdown?: {
      material_low: number;
      material_high: number;
      gates_low: number;
      gates_high: number;
      removal_low: number;
      removal_high: number;
    };
  } | null>(null);

  const { products, pricingRules } = config;
  const totalFeet = state.drawing?.total_length_ft ?? 0;
  const singleGates = state.drawing?.gates?.find((g) => g.type === 'single')?.quantity ?? 0;
  const doubleGates = state.drawing?.gates?.find((g) => g.type === 'double')?.quantity ?? 0;
  const hasRemoval = state.hasRemoval;

  const allTypes = hierarchy?.fenceTypes ?? [];
  const availableHeights = useMemo(() => {
    const vals = allTypes
      .map((t) => Number(t.standard_height_ft))
      .filter((n) => Number.isFinite(n));
    return Array.from(new Set(vals)).sort((a, b) => a - b);
  }, [allTypes]);
  const typesForSelectedHeight = useMemo(() => {
    if (selectedHeightFt == null) return [];
    return allTypes.filter((t) => Number(t.standard_height_ft) === selectedHeightFt);
  }, [allTypes, selectedHeightFt]);
  const stylesForType = hierarchy
    ? hierarchy.fenceStyles.filter((s) => s.fence_type_id === selectedTypeId)
    : [];
  const coloursForStyle = hierarchy
    ? hierarchy.colourOptions.filter((c) => c.fence_style_id === selectedStyleId)
    : [];

  const optionId = hasHierarchy ? selectedColourId : state.selectedProductOptionId ?? selectedColourId;
  const displayTotals = state.totals ?? (range
    ? {
        subtotal_low: range.low,
        subtotal_high: range.high,
        total_low: range.low,
        total_high: range.high,
      }
    : null);

  const options: ProductOption[] = [];
  for (const p of products || []) {
    for (const o of p.product_options || []) {
      const rule = pricingRules?.find((r: { product_option_id?: string }) => r.product_option_id === o.id);
      if (rule) {
        options.push({
          id: o.id,
          productName: p.name,
          height_ft: o.height_ft,
          color: o.color,
          style_name: o.style_name,
          rule: {
            base_price_per_ft_low: rule.base_price_per_ft_low,
            base_price_per_ft_high: rule.base_price_per_ft_high,
          },
        });
      }
    }
  }

  const cardClass = 'overflow-hidden rounded-2xl border border-[var(--line)] bg-white/90 shadow-xl shadow-slate-200/50 backdrop-blur-sm';
  const sectionLabel = 'text-sm font-semibold text-slate-600';
  const btnPrimary =
    'mt-6 w-full rounded-xl px-4 py-3.5 font-bold text-white shadow-lg shadow-[var(--accent)]/25 transition hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:opacity-50';
  const selectCard = (active: boolean) =>
    'rounded-xl border-2 p-4 text-left transition ' +
    (active ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm' : 'border-[var(--line)] hover:border-[var(--accent)]/40');

  useEffect(() => {
    if (!optionId || !state.sessionId) return;
    setIsCalculating(true);
    const payload = hasHierarchy
      ? { colour_option_id: optionId }
      : { product_option_id: optionId };
    fetch('/api/public/quote-session/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        total_length_ft: totalFeet,
        single_gate_qty: singleGates,
        double_gate_qty: doubleGates,
        has_removal: hasRemoval,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setRange({ low: data.total_low, high: data.total_high, breakdown: data.breakdown });
          setTotals({
            subtotal_low: data.subtotal_low,
            subtotal_high: data.subtotal_high,
            total_low: data.total_low,
            total_high: data.total_high,
          });
        }
      })
      .catch(() => {})
      .finally(() => setIsCalculating(false));
  }, [optionId, totalFeet, singleGates, doubleGates, hasRemoval, state.sessionId, hasHierarchy]);

  useEffect(() => {
    if (!hasHierarchy || availableHeights.length === 0) return;
    if (state.selectedColourOptionId) return;
    if (selectedHeightFt == null || !availableHeights.includes(selectedHeightFt)) {
      setSelectedHeightFt(availableHeights[0]);
      setSelectedTypeId(null);
      setSelectedStyleId(null);
      setSelectedColourId(null);
    }
  }, [hasHierarchy, availableHeights, selectedHeightFt, state.selectedColourOptionId]);

  useEffect(() => {
    if (!hasHierarchy || !hierarchy || !state.selectedColourOptionId) return;
    const colour = hierarchy.colourOptions.find((c) => c.id === state.selectedColourOptionId);
    if (!colour) return;
    const style = hierarchy.fenceStyles.find((s) => s.id === colour.fence_style_id);
    if (!style) return;
    const type = hierarchy.fenceTypes.find((t) => t.id === style.fence_type_id);
    if (!type) return;
    setSelectedStyleId(style.id);
    setSelectedTypeId(type.id);
    setSelectedHeightFt(Number(type.standard_height_ft));
    setSelectedColourId(state.selectedColourOptionId);
  }, [hasHierarchy, hierarchy, state.selectedColourOptionId]);

  useEffect(() => {
    if (hasHierarchy) return;
    if (state.selectedProductOptionId) setSelectedColourId(state.selectedProductOptionId);
  }, [hasHierarchy, state.selectedProductOptionId]);

  async function handleContinue() {
    if (!optionId) {
      setError(hasHierarchy ? 'Please select a colour to continue.' : 'Please select a fence option.');
      return;
    }
    if (hasHierarchy) {
      setSelectedColourOptionId(optionId);
      setSelectedProductOptionId(null);
    } else {
      setSelectedProductOptionId(optionId);
      setSelectedColourOptionId(null);
    }

    if (!state.sessionId) {
      router.push(estimateStepPath(slug, 'review', null));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = hasHierarchy
        ? { colour_option_id: optionId }
        : { product_option_id: optionId };
      const res = await fetch(`/api/public/quote-session/${state.sessionId}/design`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          subtotal_low: state.totals?.subtotal_low ?? range?.low ?? 0,
          subtotal_high: state.totals?.subtotal_high ?? range?.high ?? 0,
          total_low: state.totals?.total_low ?? range?.low ?? 0,
          total_high: state.totals?.total_high ?? range?.high ?? 0,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push(estimateStepPath(slug, 'review', state.sessionId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save design');
    } finally {
      setLoading(false);
    }
  }

  const hierarchyContent = (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className={cardClass}>
          <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-secondary))' }} />
          <div className="p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Choose your fence</h1>
          <p className="mt-2 text-sm text-slate-500">
            Select height, type, style, then colour. Based on {totalFeet.toFixed(0)} ft
            {hasRemoval ? ' including removal.' : '.'}
          </p>

          <div className="mt-8 space-y-8">
            <div>
              <h2 className={sectionLabel}>1. Height</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {availableHeights.map((heightFt) => (
                  <button
                    key={heightFt}
                    type="button"
                    onClick={() => {
                      setSelectedHeightFt(heightFt);
                      setSelectedTypeId(null);
                      setSelectedStyleId(null);
                      setSelectedColourId(null);
                    }}
                    className={selectedHeightFt === heightFt ? 'rounded-xl px-4 py-2.5 font-medium bg-[var(--accent)] text-white shadow-md' : 'rounded-xl px-4 py-2.5 font-medium border border-[var(--line)] hover:border-[var(--accent)]/50'}
                  >
                    {heightFt} ft
                  </button>
                ))}
              </div>
            </div>

            {selectedHeightFt != null && (
              <div>
                <h2 className={sectionLabel}>2. Type of fence</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {typesForSelectedHeight.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTypeId(t.id);
                        setSelectedStyleId(null);
                        setSelectedColourId(null);
                      }}
                      className={selectedTypeId === t.id ? 'rounded-xl px-4 py-2.5 font-medium bg-[var(--accent)] text-white shadow-md' : 'rounded-xl px-4 py-2.5 font-medium border border-[var(--line)] hover:border-[var(--accent)]/50'}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedTypeId && (
              <div>
                <h2 className={sectionLabel}>3. Style</h2>
                <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {stylesForType.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedStyleId(s.id);
                        setSelectedColourId(null);
                      }}
                      className={selectCard(selectedStyleId === s.id)}
                    >
                      <div className="relative h-[200px] w-full overflow-hidden rounded-lg bg-[var(--bg2)]">
                        {s.photo_url ? (
                          <OptimizedProductImage
                            src={s.photo_url}
                            alt={s.style_name}
                            fill
                            sizes="(max-width: 768px) 50vw, 220px"
                            className="object-contain object-top"
                            priority={selectedStyleId === s.id}
                            fetchPriority={selectedStyleId === s.id ? 'high' : 'auto'}
                            preferredWidth={520}
                            preferredQuality={70}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm text-[var(--muted)]">{s.style_name}</div>
                        )}
                      </div>
                      <div className="mt-2 font-medium">{s.style_name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedStyleId && (
              <div>
                <h2 className={sectionLabel}>4. Colour</h2>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {coloursForStyle.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedColourId(c.id)}
                      className={selectCard(selectedColourId === c.id)}
                    >
                      <div className="relative h-[200px] w-full overflow-hidden rounded-lg bg-[var(--bg2)]">
                        {c.photo_url ? (
                          <OptimizedProductImage
                            src={c.photo_url}
                            alt={c.color_name}
                            fill
                            sizes="(max-width: 768px) 95vw, 420px"
                            className="object-contain object-center"
                            priority={selectedColourId === c.id}
                            fetchPriority={selectedColourId === c.id ? 'high' : 'auto'}
                            preferredWidth={760}
                            preferredQuality={72}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">{c.color_name}</div>
                        )}
                      </div>
                      <div className="mt-2 font-medium">{c.color_name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estimated price</p>
            {displayTotals ? (
              <p className="mt-1 text-lg font-semibold text-slate-900">
                ${displayTotals.total_low.toLocaleString('en-CA', { maximumFractionDigits: 0 })} - $
                {displayTotals.total_high.toLocaleString('en-CA', { maximumFractionDigits: 0 })}
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-600">Select a fence option to see pricing.</p>
            )}
            {isCalculating && (
              <p className="mt-1 text-xs text-slate-500">Updating price...</p>
            )}
          </div>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!selectedColourId || loading}
            className={btnPrimary}
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))' }}
          >
            {loading ? 'Saving…' : 'Continue to review'}
          </button>
          </div>
        </div>
    </div>
  );

  if (hasHierarchy) return hierarchyContent;

  return (
    <DesignSimpleOptions
      options={options}
      optionId={optionId}
      totalFeet={totalFeet}
      hasRemoval={hasRemoval}
      error={error}
      loading={loading}
      onSelect={(id) => setSelectedColourId(id)}
      onContinue={handleContinue}
      cardClass={cardClass}
      selectCard={selectCard}
      btnPrimary={btnPrimary}
    />
  );
}
