'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import html2canvas from 'html2canvas';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LayoutDrawCanvas, LayoutDrawCanvasRef, type LineHighlightMode } from '@/components/LayoutDrawCanvas';
import { LeadSearchModal } from '@/components/dashboard/LeadSearchModal';

type SavedLayout = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  quote_session_id?: string | null;
  linked_lead_name?: string | null;
  total_length_ft?: number | null;
};

type LeadSearchRow = { id: string; first_name: string; last_name: string; email: string; address: string | null };

type ApiSegment = { start_lat: number; start_lng: number; end_lat: number; end_lng: number; length_ft?: number };

type LayoutHomeowner = {
  id: string;
  name: string;
  address: string;
  quote_session_id?: string | null;
};

function newHomeownerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `h_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function syncAssignmentsLength(assignments: string[][], segmentCount: number): string[][] {
  const next = assignments.slice(0, segmentCount);
  while (next.length < segmentCount) next.push([]);
  return next;
}

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
  const canvasContainerRef = useRef<HTMLDivElement>(null);
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
  const [materialDesc, setMaterialDesc] = useState('');
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [submittingMaterial, setSubmittingMaterial] = useState(false);
  const [linkedSuppliers, setLinkedSuppliers] = useState<{ id: string; company_name: string }[]>([]);
  const [materialSupplierId, setMaterialSupplierId] = useState<string>('master');
  const [materialAttachment, setMaterialAttachment] = useState<File | null>(null);
  const [showLinkLeadModal, setShowLinkLeadModal] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkSearchResults, setLinkSearchResults] = useState<LeadSearchRow[]>([]);
  const [linkingLeadId, setLinkingLeadId] = useState<string | null>(null);
  const [homeowners, setHomeowners] = useState<LayoutHomeowner[]>([]);
  const [segmentAssignments, setSegmentAssignments] = useState<string[][]>([]);
  const [linkHomeownerId, setLinkHomeownerId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/contractor/layouts', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setSavedLayouts(data.layouts || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/contractor/suppliers', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        setLinkedSuppliers(d.linkedSuppliers || []);
      })
      .catch(() => setLinkedSuppliers([]));
  }, []);

  useEffect(() => {
    if (layoutId && !fromId) {
      fetch(`/api/contractor/layouts/${layoutId}`)
        .then((r) => {
          if (!r.ok) throw new Error('Not found');
          return r.json();
        })
        .then((data) => {
          const d = data.drawing_data as {
            points?: { x: number; y: number }[];
            segments?: { length_ft: number }[];
            gates?: { type: string; quantity: number }[];
            total_length_ft?: number;
            homeowners?: LayoutHomeowner[];
            segment_assignments?: string[][];
          };
          const pts = d?.points;
          if (pts && pts.length >= 2) {
            setInitialDrawing({
              points: pts,
              segments: d.segments || [],
              gates: (d.gates || []).map((g) => ({
                type: (g.type === 'double' ? 'double' : 'single') as 'single' | 'double',
                quantity: g.quantity || 0,
              })),
              total_length_ft: d.total_length_ft ?? 0,
            });
            setTitle(data.title || '');
            const nSeg = (d.segments || []).length;
            const rawHo = Array.isArray(d.homeowners) ? d.homeowners : [];
            setHomeowners(
              rawHo.map((h) => ({
                id: typeof h.id === 'string' ? h.id : newHomeownerId(),
                name: String(h.name || ''),
                address: String(h.address || ''),
                quote_session_id: h.quote_session_id ?? null,
              }))
            );
            setSegmentAssignments(syncAssignmentsLength(Array.isArray(d.segment_assignments) ? d.segment_assignments : [], nSeg));
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
        const p = data.property;
        setCustomerLabel(c ? `${c.first_name} ${c.last_name}` : null);
        if (!layoutId && (c || p)) {
          setTitle(
            c ? `${c.first_name} ${c.last_name}`.trim()
              : (p?.formatted_address && p.formatted_address !== '—' ? p.formatted_address : '') || ''
          );
        }
        if (fromId && c) {
          setHomeowners([
            {
              id: newHomeownerId(),
              name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Homeowner',
              address: p?.formatted_address && p.formatted_address !== '—' ? p.formatted_address : '',
              quote_session_id: fromId,
            },
          ]);
          setSegmentAssignments([]);
        } else if (!layoutId) {
          setHomeowners([]);
          setSegmentAssignments([]);
        }
      })
      .catch(() => setInitialDrawing(null))
      .finally(() => setLoading(false));
  }, [fromId, layoutId]);

  const searchLeads = useCallback(async (q: string) => {
    const t = q.trim();
    if (t.length < 2) {
      setLinkSearchResults([]);
      return;
    }
    try {
      const res = await fetch('/api/contractor/customers', { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      const list = (data.customers || []) as LeadSearchRow[];
      const lower = t.toLowerCase();
      setLinkSearchResults(
        list
          .filter((c) => {
            const name = `${c.first_name} ${c.last_name}`.toLowerCase();
            const em = (c.email || '').toLowerCase();
            const ad = (c.address || '').toLowerCase();
            return name.includes(lower) || em.includes(lower) || ad.includes(lower);
          })
          .slice(0, 12)
      );
    } catch {
      setLinkSearchResults([]);
    }
  }, []);

  useEffect(() => {
    if (!showLinkLeadModal) return;
    const tm = setTimeout(() => searchLeads(linkSearch), 250);
    return () => clearTimeout(tm);
  }, [linkSearch, showLinkLeadModal, searchLeads]);

  async function attachLayoutToLead(sessionId: string) {
    const lid = layoutId || window.location.search.match(/layout=([^&]+)/)?.[1];
    if (!lid) return;
    setLinkingLeadId(sessionId);
    try {
      const res = await fetch(`/api/contractor/layouts/${lid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ quote_session_id: sessionId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to link');
      }
      setShowLinkLeadModal(false);
      window.location.href = `/dashboard/customers/${sessionId}`;
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to link');
    } finally {
      setLinkingLeadId(null);
    }
  }

  function handleReset() {
    setInitialDrawing(null);
    setHomeowners([]);
    setSegmentAssignments([]);
    setResetKey((k) => k + 1);
  }

  const handleDrawingChange = useCallback(
    (geo: {
      points: { x: number; y: number }[];
      segments: { length_ft: number }[];
      gates: { type: 'single' | 'double'; quantity: number }[];
      total_length_ft: number;
    }) => {
      setDrawingData(geo);
      setSegmentAssignments((prev) => syncAssignmentsLength(prev, geo.segments.length));
    },
    []
  );

  const lineHighlightModes = useMemo((): LineHighlightMode[] => {
    const n = drawingData?.segments?.length ?? 0;
    return Array.from({ length: n }, (_, i) => {
      const ids = segmentAssignments[i] || [];
      if (ids.length === 0) return 'none';
      if (ids.length === 1) return 'private';
      return 'shared';
    });
  }, [drawingData?.segments?.length, segmentAssignments]);

  function toggleLineHomeowner(lineIndex: number, homeownerId: string) {
    const n = drawingData?.segments.length ?? 0;
    setSegmentAssignments((prev) => {
      const next = syncAssignmentsLength(prev, n);
      const row = [...(next[lineIndex] || [])];
      const pos = row.indexOf(homeownerId);
      if (pos >= 0) row.splice(pos, 1);
      else row.push(homeownerId);
      next[lineIndex] = row;
      return next;
    });
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
    const nSeg = drawingData.segments.length;
    const drawingPayload = {
      ...drawingData,
      homeowners,
      segment_assignments: syncAssignmentsLength(segmentAssignments, nSeg),
    };
    setSaving(true);
    try {
      let imageDataUrl: string | undefined;
      if (canvasContainerRef.current) {
        const canvas = await html2canvas(canvasContainerRef.current, {
          useCORS: true,
          backgroundColor: '#ffffff',
          scale: 1,
          logging: false,
        });
        imageDataUrl = canvas.toDataURL('image/png');
      }
      const isUpdate = !!layoutId;
      const url = isUpdate ? `/api/contractor/layouts/${layoutId}` : '/api/contractor/layouts';
      const method = isUpdate ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          drawing_data: drawingPayload,
          quote_session_id: fromId || undefined,
          standalone: !isUpdate && !fromId,
          image_data_url: imageDataUrl,
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
      if (saved.lead_id) {
        window.location.href = `/dashboard/customers/${saved.lead_id}`;
        return;
      }
      if (!isUpdate && !fromId && !saved.lead_id) {
        setShowLinkLeadModal(true);
      }
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

  async function handleGetMaterialList() {
    const desc = materialDesc.trim();
    if (!desc) {
      alert('Please add a description with the specifics of your quote (materials, preferences, etc.) before requesting a material list.');
      return;
    }
    const lid = layoutId || (window.location.search.match(/layout=([^&]+)/)?.[1]);
    if (!lid) {
      alert('Please save the layout first before requesting a material quote.');
      return;
    }
    setSubmittingMaterial(true);
    try {
      let attachmentPayload:
        | { attachment_url: string; attachment_name: string; attachment_content_type: string; attachment_size_bytes: number }
        | undefined;
      if (materialAttachment) {
        const fd = new FormData();
        fd.set('file', materialAttachment);
        const upRes = await fetch('/api/contractor/material-quote/attachment', {
          method: 'POST',
          credentials: 'include',
          body: fd,
        });
        const up = await upRes.json();
        if (!upRes.ok) throw new Error(up.error || 'Attachment upload failed');
        attachmentPayload = {
          attachment_url: up.url,
          attachment_name: up.name,
          attachment_content_type: up.content_type,
          attachment_size_bytes: up.size_bytes,
        };
      }
      const res = await fetch('/api/contractor/material-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          layout_drawing_id: lid,
          quote_session_id: fromId || undefined,
          description: desc,
          supplier_contractor_id: materialSupplierId === 'master' ? null : materialSupplierId,
          ...(attachmentPayload || {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit');
      }
      setShowMaterialModal(false);
      setMaterialDesc('');
      setMaterialAttachment(null);
      alert(
        materialSupplierId === 'master'
          ? 'Material quote request sent to the platform team.'
          : 'Material quote request sent to your supplier.'
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to send request');
    } finally {
      setSubmittingMaterial(false);
    }
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
    <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col">
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
          {layoutId && (
            <select
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                e.target.value = '';
                if (!v) return;
                if (v === 'all') {
                  window.location.href = `/dashboard/calculator?from_layout=${encodeURIComponent(layoutId)}`;
                  return;
                }
                window.location.href = `/dashboard/calculator?from_layout=${encodeURIComponent(layoutId)}&layout_homeowner=${encodeURIComponent(v)}`;
              }}
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-medium text-slate-800"
            >
              <option value="">Export to calculator…</option>
              <option value="all">All lines</option>
              {homeowners.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name.trim() || 'Homeowner'} — their lines only
                </option>
              ))}
            </select>
          )}
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

      {layoutId && (
        <div className="border-b border-[var(--line)] bg-[var(--bg2)] px-4 py-3">
          <button
            type="button"
            onClick={() => {
              setMaterialSupplierId(linkedSuppliers[0]?.id ?? 'master');
              setShowMaterialModal(true);
            }}
            className="rounded-lg border border-[var(--accent)] bg-white px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/5"
          >
            Get material list
          </button>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Send this layout to a linked supplier (or the platform team) for a material quote. Add a description first.
          </p>
        </div>
      )}

      {showLinkLeadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !linkingLeadId && setShowLinkLeadModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[var(--line)] bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900">Save layout to a lead?</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Your layout is saved. Optionally attach it to an existing lead, or close and find it later under Leads →
              Layouts.
            </p>
            <input
              type="search"
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
              placeholder="Search leads by name or email…"
              className="mt-4 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <ul className="mt-3 max-h-56 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-100">
              {linkSearchResults.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={!!linkingLeadId}
                    onClick={() => attachLayoutToLead(c.id)}
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    <span className="font-medium text-slate-900">
                      {c.first_name} {c.last_name}
                    </span>
                    <span className="text-xs text-slate-500">{c.email}</span>
                    {c.address && <span className="text-xs text-slate-400">{c.address}</span>}
                  </button>
                </li>
              ))}
              {linkSearch.trim().length >= 2 && linkSearchResults.length === 0 && (
                <li className="px-3 py-4 text-sm text-slate-500">No matches.</li>
              )}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={!!linkingLeadId}
                onClick={() => setShowLinkLeadModal(false)}
                className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      <LeadSearchModal
        open={!!linkHomeownerId}
        title="Link homeowner to a lead"
        onClose={() => setLinkHomeownerId(null)}
        onPick={async (sessionId) => {
          const hid = linkHomeownerId;
          if (!hid) return;
          try {
            const r = await fetch(`/api/contractor/customers/${sessionId}`, { credentials: 'include' });
            if (r.ok) {
              const d = await r.json();
              const c = d.customer;
              const prop = d.property;
              const name = c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : '';
              const addr =
                prop?.formatted_address && prop.formatted_address !== '—' ? prop.formatted_address : '';
              setHomeowners((hs) =>
                hs.map((h) =>
                  h.id === hid
                    ? { ...h, quote_session_id: sessionId, name: name || h.name, address: addr || h.address }
                    : h
                )
              );
            } else {
              setHomeowners((hs) =>
                hs.map((h) => (h.id === hid ? { ...h, quote_session_id: sessionId } : h))
              );
            }
          } catch {
            setHomeowners((hs) =>
              hs.map((h) => (h.id === hid ? { ...h, quote_session_id: sessionId } : h))
            );
          }
        }}
      />

      {showMaterialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !submittingMaterial && setShowMaterialModal(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-[var(--line)] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Request material quote</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Describe materials, preferences, and quantities. Link suppliers under Dashboard → Suppliers.
            </p>
            <label className="mt-4 block text-sm font-medium text-[var(--text)]">Send to</label>
            <select
              value={materialSupplierId}
              onChange={(e) => setMaterialSupplierId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="master">Platform team (legacy)</option>
              {linkedSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.company_name}
                </option>
              ))}
            </select>
            {linkedSuppliers.length === 0 && (
              <p className="mt-2 text-xs text-amber-800">No linked suppliers yet — only the platform team option is available.</p>
            )}
            <textarea
              value={materialDesc}
              onChange={(e) => setMaterialDesc(e.target.value)}
              placeholder="e.g. WPC privacy fence, 6 ft height, white. Need H-posts every 8 ft. Include gate hardware."
              rows={4}
              className="mt-4 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <label className="mt-4 block text-sm font-medium text-[var(--text)]">Attachment (optional)</label>
            <input
              type="file"
              onChange={(e) => setMaterialAttachment(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.txt,.docx,.xlsx"
            />
            {materialAttachment && (
              <p className="mt-1 text-xs text-[var(--muted)]">
                Selected: {materialAttachment.name} ({Math.round(materialAttachment.size / 1024)} KB)
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleGetMaterialList}
                disabled={submittingMaterial || !materialDesc.trim()}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:opacity-90"
              >
                {submittingMaterial ? 'Sending…' : 'Send to supplier'}
              </button>
              <button
                type="button"
                onClick={() => !submittingMaterial && setShowMaterialModal(false)}
                disabled={submittingMaterial}
                className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-medium hover:bg-[var(--bg2)] disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
        <aside className="max-h-[min(52vh,28rem)] shrink-0 overflow-y-auto border-b border-[var(--line)] bg-[var(--bg2)] px-4 py-4 lg:max-h-none lg:w-[22rem] lg:border-b-0 lg:border-r lg:border-[var(--line)]">
          <h2 className="text-sm font-bold text-slate-900">Homeowners &amp; lines</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Add each address, then tick which lines belong to whom. One homeowner = private (green). Several = shared
            fence (red).
          </p>
          <button
            type="button"
            onClick={() =>
              setHomeowners((prev) => [
                ...prev,
                { id: newHomeownerId(), name: '', address: '', quote_session_id: null },
              ])
            }
            className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            + Add homeowner
          </button>
          <ul className="mt-3 space-y-3">
            {homeowners.map((h) => (
              <li key={h.id} className="rounded-xl border border-[var(--line)] bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500">Homeowner</span>
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-600 hover:underline"
                    onClick={() => {
                      setHomeowners((prev) => prev.filter((x) => x.id !== h.id));
                      setSegmentAssignments((prev) =>
                        prev.map((row) => row.filter((id) => id !== h.id))
                      );
                    }}
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  value={h.name}
                  onChange={(e) =>
                    setHomeowners((prev) =>
                      prev.map((x) => (x.id === h.id ? { ...x, name: e.target.value } : x))
                    )
                  }
                  placeholder="Name"
                  className="mt-2 w-full rounded-lg border border-[var(--line)] px-2 py-1.5 text-sm"
                />
                <textarea
                  value={h.address}
                  onChange={(e) =>
                    setHomeowners((prev) =>
                      prev.map((x) => (x.id === h.id ? { ...x, address: e.target.value } : x))
                    )
                  }
                  placeholder="Address"
                  rows={2}
                  className="mt-2 w-full rounded-lg border border-[var(--line)] px-2 py-1.5 text-sm"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setLinkHomeownerId(h.id)}
                    className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Link to lead
                  </button>
                  {h.quote_session_id && (
                    <span className="text-xs text-green-700">Linked</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {homeowners.length === 0 && (
            <p className="mt-2 text-xs text-[var(--muted)]">No homeowners yet — add at least one to assign lines.</p>
          )}
          {homeowners.length > 0 && (drawingData?.segments.length ?? 0) > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">Assign lines</h3>
              <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-[var(--line)] bg-white">
                <table className="w-full min-w-[200px] text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className="px-2 py-2 font-semibold text-slate-700">Line</th>
                      <th className="px-2 py-2 font-semibold text-slate-700">ft</th>
                      {homeowners.map((h) => (
                        <th key={h.id} className="px-1 py-2 font-semibold text-slate-600">
                          <span className="line-clamp-2 block max-w-[4.5rem]">{h.name.trim() || '—'}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(drawingData?.segments || []).map((seg, lineIdx) => (
                      <tr key={lineIdx} className="border-t border-slate-100">
                        <td className="px-2 py-1.5 font-medium text-slate-800">{lineIdx + 1}</td>
                        <td className="px-2 py-1.5 text-slate-600">
                          {Number(seg.length_ft).toFixed(1)}
                        </td>
                        {homeowners.map((h) => (
                          <td key={h.id} className="px-1 py-1.5 text-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300"
                              checked={(segmentAssignments[lineIdx] || []).includes(h.id)}
                              onChange={() => toggleLineHomeowner(lineIdx, h.id)}
                              aria-label={`Line ${lineIdx + 1} for ${h.name || 'homeowner'}`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </aside>
        <div ref={canvasContainerRef} className="relative flex min-h-[min(45vh,20rem)] flex-1 flex-col p-4 lg:min-h-0">
          <LayoutDrawCanvas
            ref={drawRef}
            key={`${resetKey}-${layoutId || 'new'}-${initialDrawing ? 'loaded' : 'init'}`}
            initialDrawing={resetKey === 0 ? initialDrawing : null}
            lineHighlightModes={lineHighlightModes}
            onReset={handleReset}
            onDrawingChange={handleDrawingChange}
          />
        </div>
      </div>

      <p className="py-2 text-center text-xs text-[var(--muted)]">
        Click to start a line, then click again to finish (or use End line). Esc cancels the line in progress. Drag on an
        empty canvas to pan.
      </p>
    </div>
  );
}
