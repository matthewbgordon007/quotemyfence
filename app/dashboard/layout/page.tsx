'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LayoutDrawCanvas, LayoutDrawCanvasRef } from '@/components/LayoutDrawCanvas';

type SavedLayout = { id: string; title: string; created_at: string; updated_at: string };

type ApiSegment = { start_lat: number; start_lng: number; end_lat: number; end_lng: number; length_ft?: number };

// Convert lat/lng segments to x,y in feet (origin at first point)
function convertSegmentsToDrawing(
  segments: ApiSegment[],
  totalLengthFt: number,
  gates: { gate_type: string; quantity: number }[]
): {
  points: { x: number; y: number }[];
  segments: { length_ft: number }[];
  gates: { type: 'single' | 'double'; quantity: number }[];
  total_length_ft: number;
} {
  if (segments.length === 0) {
    return {
      points: [],
      segments: [],
      gates: gates.map((g) => ({ type: g.gate_type as 'single' | 'double', quantity: g.quantity || 0 })),
      total_length_ft: totalLengthFt,
    };
  }
  const METERS_PER_DEG_LAT = 111320;
  const refLat = Number(segments[0].start_lat);
  const refLng = Number(segments[0].start_lng);
  const metersPerDegLng = 111320 * Math.cos((refLat * Math.PI) / 180);
  const M_TO_FT = 3.28084;

  function toFeet(lat: number, lng: number): { x: number; y: number } {
    const dx = (lng - refLng) * metersPerDegLng;
    const dy = (lat - refLat) * METERS_PER_DEG_LAT;
    return { x: dx * M_TO_FT, y: -dy * M_TO_FT };
  }

  const points: { x: number; y: number }[] = [];
  const segLengths: { length_ft: number }[] = [];
  for (const seg of segments) {
    if (points.length === 0) {
      points.push(toFeet(Number(seg.start_lat), Number(seg.start_lng)));
    }
    points.push(toFeet(Number(seg.end_lat), Number(seg.end_lng)));
    if (seg.length_ft != null) {
      segLengths.push({ length_ft: Number(seg.length_ft) });
    }
  }
  const total = totalLengthFt > 0 ? totalLengthFt : segLengths.reduce((s, x) => s + x.length_ft, 0);
  return {
    points,
    segments: segLengths.length > 0 ? segLengths : points.length >= 2 ? [{ length_ft: total }] : [],
    gates: gates.map((g) => ({ type: g.gate_type as 'single' | 'double', quantity: g.quantity || 0 })),
    total_length_ft: total,
  };
}

export default function LayoutPage() {
  const searchParams = useSearchParams();
  const fromId = searchParams.get('from');
  const layoutId = searchParams.get('layout');
  const drawRef = useRef<LayoutDrawCanvasRef>(null);
  const [initialDrawing, setInitialDrawing] = useState<{
    points: { x: number; y: number }[];
    segments: { length_ft: number }[];
    gates: { type: 'single' | 'double'; quantity: number }[];
    total_length_ft: number;
  } | null>(null);
  const [drawingData, setDrawingData] = useState<{
    points: { x: number; y: number }[];
    segments: { length_ft: number }[];
    gates: { type: 'single' | 'double'; quantity: number }[];
    total_length_ft: number;
  } | null>(null);
  const [title, setTitle] = useState('');
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>([]);
  const [loading, setLoading] = useState(!!fromId || !!layoutId);
  const [saving, setSaving] = useState(false);
  const [customerLabel, setCustomerLabel] = useState<string | null>(null);
  const [addLength, setAddLength] = useState('');
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    fetch('/api/contractor/layouts', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setSavedLayouts(data.layouts || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (layoutId && !fromId) {
      fetch(`/api/contractor/layouts/${layoutId}`)
        .then((r) => {
          if (!r.ok) throw new Error('Not found');
          return r.json();
        })
        .then((data) => {
          const d = data.drawing_data;
          if (d?.points?.length >= 2) {
            setInitialDrawing({
              points: d.points,
              segments: d.segments || [],
              gates: d.gates || [],
              total_length_ft: d.total_length_ft ?? 0,
            });
            setTitle(data.title || '');
          }
        })
        .catch(() => setLoading(false))
        .finally(() => setLoading(false));
      return;
    }
    if (!fromId) {
      setLoading(false);
      return;
    }
    fetch(`/api/contractor/customers/${fromId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((data) => {
        const { segments = [], fence, gates = [] } = data;
        const drawing = convertSegmentsToDrawing(
          segments,
          fence?.total_length_ft ?? 0,
          gates
        );
        setInitialDrawing(drawing);
        const c = data.customer;
        setCustomerLabel(c ? `${c.first_name} ${c.last_name}` : null);
      })
      .catch(() => setInitialDrawing(null))
      .finally(() => setLoading(false));
  }, [fromId, layoutId]);

  function handleReset() {
    setInitialDrawing(null);
    setResetKey((k) => k + 1);
  }

  async function handleSave() {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }
    if (!drawingData || drawingData.points.length < 2) {
      alert('Please draw at least one line before saving');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/contractor/layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          drawing_data: drawingData,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }
      const saved = await res.json();
      const listRes = await fetch('/api/contractor/layouts', { credentials: 'include' });
      const listData = await listRes.json();
      setSavedLayouts(listData.layouts || []);
      window.history.replaceState(null, '', `/dashboard/layout?layout=${saved.id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function handleLoadLayout(id: string) {
    setResetKey((k) => k + 1);
    window.location.href = `/dashboard/layout?layout=${id}`;
  }

  function handleAddSegment() {
    const ft = parseFloat(addLength);
    if (!Number.isFinite(ft) || ft <= 0) return;
    drawRef.current?.appendSegmentByLength(ft);
    setAddLength('');
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        <p className="mt-4 text-sm text-[var(--muted)]">Loading customer drawing…</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-[var(--accent)] hover:underline"
          >
            ← Dashboard
          </Link>
          <h1 className="text-lg font-bold">Layout drawing</h1>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Layout title"
            className="w-48 rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 hover:opacity-90"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {savedLayouts.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (v) handleLoadLayout(v);
              }}
              className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm"
            >
              <option value="">Load saved…</option>
              {savedLayouts.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          )}
          {customerLabel && (
            <span className="rounded-full bg-[var(--accent)]/10 px-3 py-0.5 text-sm font-medium text-[var(--accent)]">
              From: {customerLabel}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Add segment (ft)"
              value={addLength}
              onChange={(e) => setAddLength(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSegment()}
              min="0.1"
              step="0.1"
              className="w-28 rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={handleAddSegment}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex-1 p-4">
        <LayoutDrawCanvas
          ref={drawRef}
          key={`${resetKey}-${layoutId || 'new'}-${initialDrawing ? 'loaded' : 'init'}`}
          initialDrawing={resetKey === 0 ? initialDrawing : null}
          onReset={handleReset}
          onDrawingChange={setDrawingData}
        />
      </div>

      <p className="py-2 text-center text-xs text-[var(--muted)]">
        Click to add points, double-click to start a new section. Add segments by length or export from a customer quote.
      </p>
    </div>
  );
}
