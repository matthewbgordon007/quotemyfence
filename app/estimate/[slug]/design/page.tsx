'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useEstimate } from '../EstimateContext';
import { DesignSimpleOptions } from '../DesignSimpleOptions';

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
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [selectedColourId, setSelectedColourId] = useState<string | null>(state.selectedColourOptionId ?? state.selectedProductOptionId);
  const [loading, setLoading] = useState(false);
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
  const stylesForType = hierarchy
    ? hierarchy.fenceStyles.filter((s) => s.fence_type_id === selectedTypeId)
    : [];
  const coloursForStyle = hierarchy
    ? hierarchy.colourOptions.filter((c) => c.fence_style_id === selectedStyleId)
    : [];

  const optionId = hasHierarchy ? selectedColourId : state.selectedProductOptionId ?? selectedColourId;

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
      .catch(() => setRange(null));
  }, [optionId, totalFeet, singleGates, doubleGates, hasRemoval, state.sessionId, hasHierarchy]);

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
      router.push(`/estimate/${slug}/review`);
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
      router.push(`/estimate/${slug}/review`);
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
            Select type, style, then colour. Based on {totalFeet.toFixed(1)} ft
            {hasRemoval ? ' including removal.' : '.'}
          </p>

          <div className="mt-8 space-y-8">
            <div>
              <h2 className={sectionLabel}>1. Type of fence</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {allTypes.map((t) => (
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
                    {t.standard_height_ft != null && (
                      <span className="ml-1 opacity-90">({t.standard_height_ft} ft)</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {selectedTypeId && (
              <div>
                <h2 className={sectionLabel}>2. Style</h2>
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
                      <div className="flex min-h-[200px] items-start justify-center overflow-hidden rounded-lg bg-[var(--bg2)]">
                        {s.photo_url ? (
                          <img src={s.photo_url} alt={s.style_name} className="max-h-[200px] w-full object-contain object-top" />
                        ) : (
                          <div className="flex min-h-[200px] w-full items-center justify-center text-sm text-[var(--muted)]">{s.style_name}</div>
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
                <h2 className={sectionLabel}>3. Colour</h2>
                <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {coloursForStyle.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedColourId(c.id)}
                      className={selectCard(selectedColourId === c.id)}
                    >
                      <div className="aspect-video overflow-hidden rounded-lg bg-[var(--bg2)]">
                        {c.photo_url ? (
                          <img src={c.photo_url} alt={c.color_name} className="h-full w-full object-cover" />
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
