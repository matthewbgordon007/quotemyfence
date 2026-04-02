'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
import { estimateStepPath } from '@/lib/estimate-session-url';
import { useEstimate } from '../EstimateContext';
import { DrawFenceMap } from '@/components/DrawFenceMap';

export default function DrawPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { state, setDrawing, setHasRemoval } = useEstimate();
  const [showInstructions, setShowInstructions] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const [drawingData, setDrawingData] = useState<{
    points: { lat: number; lng: number }[];
    segments: { length_ft: number }[];
    gates: { type: 'single' | 'double'; quantity: number }[];
    total_length_ft: number;
  } | null>(state.drawing);

  function handleReset() {
    setDrawing(null);
    setDrawingData(null);
    setResetKey((k) => k + 1);
  }
  const [saving, setSaving] = useState(false);
  const [removalModal, setRemovalModal] = useState(false);

  useEffect(() => {
    if (state.drawing && state.drawing.points.length >= 2) {
      setDrawingData(state.drawing);
    }
  }, [state.drawing]);

  const mapRemountKey =
    state.drawing && state.drawing.points.length >= 2
      ? `${state.sessionId ?? 'local'}-${state.drawing.points.length}-${state.drawing.total_length_ft}`
      : `new-${resetKey}`;

  const handleDrawingComplete = useCallback(
    (data: {
      points: { lat: number; lng: number }[];
      segments: { length_ft: number }[];
      gates: { type: 'single' | 'double'; quantity: number }[];
      total_length_ft: number;
    }) => {
      setDrawingData(data);
    },
    []
  );

  async function handleContinue() {
    if (!drawingData || drawingData.points.length < 2) {
      setRemovalModal(false);
      return;
    }
    setDrawing(drawingData);
    setShowInstructions(false);
    setRemovalModal(true);
  }

  async function handleRemovalChoice(hasRemoval: boolean) {
    setHasRemoval(hasRemoval);
    if (!state.sessionId) {
      router.push(estimateStepPath(slug, 'design', null));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/public/quote-session/${state.sessionId}/drawing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: drawingData!.points,
          segments: drawingData!.segments,
          gates: drawingData!.gates,
          total_length_ft: drawingData!.total_length_ft,
          has_removal: hasRemoval,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push(estimateStepPath(slug, 'design', state.sessionId));
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] bg-white/95 px-4 py-3 backdrop-blur-sm">
        <h1 className="text-lg font-bold text-slate-800">Draw your fence</h1>
        <div className="flex items-center gap-3">
          {drawingData && drawingData.total_length_ft > 0 && (
            <span className="rounded-full border border-[var(--line)] bg-slate-50/90 px-3 py-1.5 text-sm font-bold text-slate-700">
              Total: {drawingData.total_length_ft.toFixed(1)} ft
            </span>
          )}
          <button
            type="button"
            onClick={handleContinue}
            disabled={!drawingData || drawingData.points.length < 2}
            className="rounded-xl px-4 py-2 font-bold text-white shadow-md transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))' }}
          >
            Continue
          </button>
        </div>
      </div>

      {showInstructions && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="max-w-lg overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-2xl">
            <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-secondary))' }} />
            <div className="p-6">
            <h2 className="text-xl font-bold text-slate-800">How to draw your fence</h2>
            <p className="mt-2 text-sm text-slate-500">
              Follow these steps to trace your fence line on the map.
            </p>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-sm font-bold text-[var(--accent)]">1</span>
                <span>
                  The <strong className="text-red-700">red “your home” pin</strong> marks the address you entered so you can match the satellite view to your property.{' '}
                  <strong>Click</strong> elsewhere on the map to trace your fence — yellow lines connect your points.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-sm font-bold text-[var(--accent)]">2</span>
                <span>
                  When you finish one straight run, tap <strong>Finish line</strong> (bottom left), <strong>double‑click</strong>{' '}
                  the map, or press <strong>Esc</strong>. Then keep clicking to start the next section.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-sm font-bold text-[var(--accent)]">3</span>
                <span>Use <strong>+ Single gate</strong> or <strong>+ Double gate</strong>, then click on the map where each gate goes.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-sm font-bold text-[var(--accent)]">4</span>
                <span>Each segment shows its length in feet. Use <strong>Undo point</strong> if you make a mistake.</span>
              </li>
            </ul>
            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              className="mt-6 w-full rounded-xl px-4 py-3 font-bold text-white shadow-lg shadow-[var(--accent)]/25 transition hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))' }}
            >
              OK, start drawing
            </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative flex-1">
        <DrawFenceMap
          key={mapRemountKey}
          center={
            state.property?.lat != null && state.property?.lng != null
              ? [state.property.lat, state.property.lng]
              : undefined
          }
          propertyPin={
            state.property?.lat != null && state.property?.lng != null
              ? { lat: state.property.lat, lng: state.property.lng }
              : null
          }
          propertyLabel={state.property?.formattedAddress ?? null}
          onDrawingComplete={handleDrawingComplete}
          onReset={handleReset}
          initialDrawing={state.drawing}
        />
      </div>

      {removalModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="max-w-md overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-2xl">
            <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-secondary))' }} />
            <div className="p-6">
            <h3 className="text-lg font-bold text-slate-800">Add fence removal?</h3>
            <p className="mt-2 text-sm text-slate-500">
              Do you need the old fence removed before installation?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => handleRemovalChoice(false)}
                disabled={saving}
                className="flex-1 rounded-xl border border-[var(--line)] bg-white py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => handleRemovalChoice(true)}
                disabled={saving}
                className="flex-1 rounded-xl py-3 font-bold text-white shadow-md transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))' }}
              >
                Yes
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
