'use client';

import { useRouter, useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { OptimizedProductImage } from '@/components/OptimizedProductImage';
import { useEstimate, type EstimateConfig } from '../EstimateContext';

type ReviewSelection =
  | {
      mode: 'hierarchy';
      styleName: string;
      colourName: string;
      stylePhotoUrl: string | null;
      colourPhotoUrl: string | null;
      typeName: string | null;
      heightFt: number | null;
    }
  | {
      mode: 'legacy';
      productName: string;
      heightFt: number;
      styleName: string | null;
      colourName: string | null;
    };

function resolveReviewSelection(
  config: EstimateConfig,
  state: {
    selectedColourOptionId: string | null;
    selectedProductOptionId: string | null;
  }
): ReviewSelection | null {
  const h = config.productHierarchy;
  const hasHierarchy = !!(h && (h.fenceTypes?.length ?? 0) > 0);

  if (hasHierarchy && state.selectedColourOptionId && h) {
    const colour = h.colourOptions.find((c) => c.id === state.selectedColourOptionId);
    if (colour) {
      const style = h.fenceStyles.find((s) => s.id === colour.fence_style_id);
      const fenceType = style ? h.fenceTypes.find((t) => t.id === style.fence_type_id) : null;
      return {
        mode: 'hierarchy',
        styleName: style?.style_name ?? '—',
        colourName: colour.color_name,
        stylePhotoUrl: style?.photo_url ?? null,
        colourPhotoUrl: colour.photo_url ?? null,
        typeName: fenceType?.name ?? null,
        heightFt: fenceType?.standard_height_ft != null ? Number(fenceType.standard_height_ft) : null,
      };
    }
  }

  if (state.selectedProductOptionId) {
    for (const p of config.products || []) {
      const o = p.product_options?.find((x) => x.id === state.selectedProductOptionId);
      if (o) {
        return {
          mode: 'legacy',
          productName: p.name,
          heightFt: o.height_ft,
          styleName: o.style_name,
          colourName: o.color,
        };
      }
    }
  }

  return null;
}

export default function ReviewPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { config, state } = useEstimate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = state.totals;
  const contractor = config.contractor;

  const selection = useMemo(() => resolveReviewSelection(config, state), [config, state]);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/quote-session/${state.sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Submit failed');
      }
      router.push(`/estimate/${slug}/complete`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white/90 shadow-xl shadow-slate-200/50 backdrop-blur-sm">
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-secondary))' }} />
        <div className="p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Review & submit</h1>
        <p className="mt-2 text-sm text-slate-500">
          Confirm your details and send your quote request to {contractor.company_name}.
        </p>

        <div className="mt-8 space-y-4">
          <div className="rounded-xl border border-[var(--line)] bg-slate-50/80 p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contact</div>
            <div className="mt-1">
              {state.contact.firstName} {state.contact.lastName}
            </div>
            <div className="text-sm text-slate-500">{state.contact.email}</div>
            {state.contact.phone && (
              <div className="text-sm text-slate-500">{state.contact.phone}</div>
            )}
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-slate-50/80 p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Property</div>
            <div className="mt-1">{state.property?.formattedAddress ?? '—'}</div>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-slate-50/80 p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fence</div>
            <div className="mt-1">
              Total length: {state.drawing?.total_length_ft?.toFixed(1) ?? 0} ft
            </div>
            {state.hasRemoval && (
              <div className="text-sm text-slate-500">Removal included</div>
            )}

            {selection?.mode === 'hierarchy' && (
              <>
                {(selection.typeName || selection.heightFt != null) && (
                  <div className="mt-3 text-sm font-medium text-slate-700">
                    {[selection.heightFt != null ? `${selection.heightFt} ft` : null, selection.typeName]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                )}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Style</div>
                    <div className="relative mt-2 aspect-[4/3] w-full overflow-hidden rounded-xl border border-[var(--line)] bg-white">
                      {selection.stylePhotoUrl ? (
                        <OptimizedProductImage
                          src={selection.stylePhotoUrl}
                          alt={selection.styleName}
                          fill
                          sizes="(max-width: 640px) 100vw, 50vw"
                          className="object-contain object-top"
                          preferredWidth={520}
                          preferredQuality={72}
                        />
                      ) : (
                        <div className="flex h-full min-h-[120px] items-center justify-center px-3 text-center text-sm text-slate-500">
                          {selection.styleName}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-800">{selection.styleName}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Colour</div>
                    <div className="relative mt-2 aspect-[4/3] w-full overflow-hidden rounded-xl border border-[var(--line)] bg-white">
                      {selection.colourPhotoUrl ? (
                        <OptimizedProductImage
                          src={selection.colourPhotoUrl}
                          alt={selection.colourName}
                          fill
                          sizes="(max-width: 640px) 100vw, 50vw"
                          className="object-contain object-center"
                          preferredWidth={520}
                          preferredQuality={72}
                        />
                      ) : (
                        <div className="flex h-full min-h-[120px] items-center justify-center px-3 text-center text-sm text-slate-500">
                          {selection.colourName}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-800">{selection.colourName}</div>
                  </div>
                </div>
              </>
            )}

            {selection?.mode === 'legacy' && (
              <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-sm text-slate-700">
                <span className="font-medium">{selection.productName}</span>
                <span className="text-slate-400">·</span>
                <span>{selection.heightFt} ft</span>
                {selection.styleName && (
                  <>
                    <span className="text-slate-400">·</span>
                    <span>{selection.styleName}</span>
                  </>
                )}
                {selection.colourName && (
                  <>
                    <span className="text-slate-400">·</span>
                    <span>{selection.colourName}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {totals && (
            <div className="rounded-xl border-2 border-[var(--accent)]/40 bg-gradient-to-br from-[var(--accent)]/10 to-[var(--accent-secondary)]/10 p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">Your quote (incl. estimated tax)</div>
              <div className="mt-1 text-xl font-bold">
                ${totals.total_low.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} – ${totals.total_high.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !state.sessionId}
          className="mt-6 w-full rounded-xl px-4 py-3.5 font-bold text-white shadow-lg shadow-[var(--accent)]/25 transition hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))' }}
        >
          {submitting ? 'Submitting…' : 'Submit quote request'}
        </button>
        </div>
      </div>
    </div>
  );
}
