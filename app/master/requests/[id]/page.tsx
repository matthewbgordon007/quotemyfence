'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const FenceDrawingMap = dynamic(
  () => import('@/components/FenceDrawingMap').then((m) => ({ default: m.FenceDrawingMap })),
  { ssr: false, loading: () => <div className="min-h-[300px] animate-pulse rounded-lg border border-[var(--line)] bg-[var(--bg2)]" /> }
);

const LayoutDrawCanvas = dynamic(
  () => import('@/components/LayoutDrawCanvas').then((m) => ({ default: m.LayoutDrawCanvas })),
  { ssr: false, loading: () => <div className="min-h-[300px] animate-pulse rounded-lg border border-[var(--line)] bg-[var(--bg2)]" /> }
);

interface MasterRequestDetail {
  request: { id: string; description: string; status: string; master_response: string | null; created_at?: string };
  layoutDrawing: { drawing_data: any; title: string; image_data_url?: string | null } | null;
  session: any;
  customer: { first_name: string; last_name: string; email: string; phone: string | null } | null;
  property: { formatted_address: string; city?: string | null; province_state?: string | null; postal_zip?: string | null } | null;
  fence: { total_length_ft: number; has_removal: boolean } | null;
  segments: { start_lat: number; start_lng: number; end_lat: number; end_lng: number; length_ft?: number }[];
  gates: { gate_type: string; quantity: number }[];
  contractor: { company_name: string } | null;
}

export default function MasterRequestDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<MasterRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    fetch(`/api/master/requests/${id}`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((d) => {
        setData(d);
        setResponseText(d.request?.master_response ?? '');
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSaveQuote() {
    setSaving(true);
    try {
      const res = await fetch(`/api/master/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'quoted', master_response: responseText }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setData((prev) =>
        prev ? { ...prev, request: { ...prev.request, status: 'quoted', master_response: responseText } } : null
      );
    } catch {
      alert('Failed to save quote');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  const { request, layoutDrawing, customer, property, fence, segments, gates, contractor } = data;
  const center = useMemo<[number, number] | undefined>(
    () => (segments[0] ? [Number(segments[0].start_lat), Number(segments[0].start_lng)] : undefined),
    [segments[0]?.start_lat, segments[0]?.start_lng]
  );

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/master" className="text-sm font-medium text-[var(--accent)] hover:underline">
        ← Back to requests
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-bold">{layoutDrawing?.title || 'Material quote request'}</h1>
        <p className="text-sm text-[var(--muted)]">{contractor?.company_name} • {new Date(request.created_at || 0).toLocaleString()}</p>
      </div>

      <div className="mt-8 space-y-6">
        <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Contractor&apos;s description</h2>
          <p className="mt-2 text-[var(--text)] whitespace-pre-wrap">{request.description}</p>
        </section>

        {customer && (
          <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Contact</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-[var(--muted)]">Name</dt>
                <dd>{customer.first_name} {customer.last_name}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Email</dt>
                <dd><a href={`mailto:${customer.email}`} className="text-[var(--accent)] hover:underline">{customer.email}</a></dd>
              </div>
              {customer.phone && (
                <div>
                  <dt className="text-[var(--muted)]">Phone</dt>
                  <dd><a href={`tel:${customer.phone}`} className="text-[var(--accent)] hover:underline">{customer.phone}</a></dd>
                </div>
              )}
            </dl>
          </section>
        )}

        {property && (
          <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Address</h2>
            <p className="mt-2 text-[var(--text)]">{property.formatted_address}</p>
            {(property.city || property.province_state || property.postal_zip) && (
              <p className="mt-1 text-sm text-[var(--muted)]">
                {[property.city, property.province_state, property.postal_zip].filter(Boolean).join(', ')}
              </p>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Layout drawing</h2>
          <div className="mt-4 space-y-4">
            {layoutDrawing?.image_data_url && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-[var(--muted)]">Layout screenshot</h3>
                <div className="min-h-[200px] rounded-lg border border-[var(--line)] overflow-hidden bg-white">
                  <img
                    src={layoutDrawing.image_data_url}
                    alt="Layout drawing"
                    className="max-h-[400px] w-auto object-contain"
                  />
                </div>
              </div>
            )}
            {layoutDrawing?.drawing_data?.points?.length >= 2 && !layoutDrawing?.image_data_url && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-[var(--muted)]">Layout</h3>
                <div className="min-h-[300px] rounded-lg border border-[var(--line)] overflow-hidden">
                  <LayoutDrawCanvas
                    readOnly
                    initialDrawing={{
                      points: layoutDrawing!.drawing_data!.points ?? [],
                      segments: layoutDrawing!.drawing_data!.segments ?? [],
                      gates: (layoutDrawing!.drawing_data!.gates ?? []).map((g: { type: string; quantity: number }) => ({
                        type: g.type as 'single' | 'double',
                        quantity: g.quantity ?? 0,
                      })),
                      total_length_ft: layoutDrawing!.drawing_data!.total_length_ft ?? 0,
                    }}
                  />
                </div>
              </div>
            )}
            {segments.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-[var(--muted)]">
                  {layoutDrawing?.image_data_url ? 'Map view' : 'Fence outline'}
                </h3>
                <FenceDrawingMap segments={segments} gates={gates} center={center} className="min-h-[300px]" />
              </div>
            )}
            {!layoutDrawing?.image_data_url && !layoutDrawing?.drawing_data?.points?.length && segments.length === 0 && (
              <p className="text-[var(--muted)]">No drawing available</p>
            )}
          </div>
          {fence && (
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <span><strong>Total length:</strong> {fence.total_length_ft.toFixed(1)} ft</span>
              {fence.has_removal && <span className="text-[var(--muted)]">Removal included</span>}
              {gates.length > 0 && (
                <span><strong>Gates:</strong> {gates.map((g) => `${g.quantity} ${g.gate_type}`).join(', ')}</span>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Your material quote</h2>
          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Add your material list, pricing, notes..."
            rows={6}
            className="mt-3 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          {request.master_response && (
            <p className="mt-2 text-xs text-[var(--muted)]">Previously saved: {new Date().toLocaleString()}</p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleSaveQuote}
              disabled={saving}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90"
            >
              {saving ? 'Saving…' : 'Save & mark as quoted'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
