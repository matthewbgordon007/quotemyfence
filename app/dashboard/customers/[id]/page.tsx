'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

const FenceDrawingMap = dynamic(
  () => import('@/components/FenceDrawingMap').then((m) => ({ default: m.FenceDrawingMap })),
  { ssr: false, loading: () => <div className="min-h-[300px] animate-pulse rounded-lg border border-[var(--line)] bg-[var(--bg2)]" /> }
);

const LayoutDrawCanvas = dynamic(
  () => import('@/components/LayoutDrawCanvas').then((m) => ({ default: m.LayoutDrawCanvas })),
  { ssr: false, loading: () => <div className="min-h-[300px] animate-pulse rounded-lg border border-[var(--line)] bg-[var(--bg2)]" /> }
);

interface ClientDetail {
  session: { status: string; current_step: string; last_active_at: string; lead_status?: string; contractor_quote_text?: string | null; contractor_quote_saved_at?: string | null };
  customer: { first_name: string; last_name: string; email: string; phone: string | null; lead_source: string | null } | null;
  property: { formatted_address: string; street_address?: string | null; city: string | null; province_state: string | null; postal_zip: string | null; country?: string | null; latitude?: number | null; longitude?: number | null } | null;
  fence: {
    total_length_ft: number;
    has_removal: boolean;
    subtotal_low: number | null;
    subtotal_high: number | null;
  } | null;
  segments: { start_lat: number; start_lng: number; end_lat: number; end_lng: number; length_ft?: number }[];
  gates: { gate_type: string; quantity: number; lat?: number | null; lng?: number | null }[];
  quoteTotals: { total_low: number; total_high: number } | null;
  designSummary: string | null;
  designOption: { height_ft?: number; type?: string; style?: string; colour?: string } | null;
  savedQuotes?: { id: string; created_at: string; grand_total: number; calculator_state?: any }[];
  layoutDrawing?: { drawing_data: { points?: { x: number; y: number }[]; segments?: { length_ft: number }[]; gates?: { type: string; quantity: number }[]; total_length_ft?: number } } | null;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingQuoteId, setDeletingQuoteId] = useState<string | null>(null);
  const [editingInfo, setEditingInfo] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [showExportToAdmin, setShowExportToAdmin] = useState(false);
  const [exportNotes, setExportNotes] = useState('');
  const [submittingExport, setSubmittingExport] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    lead_source: '',
    formatted_address: '',
    street_address: '',
    city: '',
    province_state: '',
    postal_zip: '',
    country: '',
  });

  const handleDelete = async () => {
    if (!confirm('Delete this customer and all their quote data? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/contractor/customers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/dashboard/customers');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch {
      alert('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const updateLeadStatus = async (leadStatus: string) => {
    if (!data) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/contractor/customers/${id}/lead-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_status: leadStatus }),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? { ...prev, session: { ...prev.session, lead_status: leadStatus } }
            : null
        );
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleExportToAdmin = async () => {
    setSubmittingExport(true);
    try {
      const res = await fetch('/api/contractor/material-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ quote_session_id: id, description: exportNotes.trim() || undefined }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to send');
      }
      setShowExportToAdmin(false);
      setExportNotes('');
      alert('Fence layout and notes sent to admin. They will prepare your material quote.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSubmittingExport(false);
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm('Delete this quote?')) return;
    setDeletingQuoteId(quoteId);
    try {
      const res = await fetch(`/api/contractor/customers/${id}/quote?quote_id=${quoteId}`, { method: 'DELETE' });
      if (res.ok) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            savedQuotes: prev.savedQuotes?.filter(q => q.id !== quoteId),
          };
        });
      } else {
        alert('Failed to delete quote');
      }
    } catch {
      alert('Failed to delete quote');
    } finally {
      setDeletingQuoteId(null);
    }
  };

  useEffect(() => {
    fetch(`/api/contractor/customers/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !data) return;
    fetch(`/api/contractor/customers/${id}/viewed`, { method: 'POST' }).catch(() => {});
  }, [id, data]);

  useEffect(() => {
    if (data?.customer || data?.property) {
      setEditForm({
        first_name: data.customer?.first_name ?? '',
        last_name: data.customer?.last_name ?? '',
        email: data.customer?.email ?? '',
        phone: data.customer?.phone ?? '',
        lead_source: data.customer?.lead_source ?? '',
        formatted_address: data.property?.formatted_address ?? '',
        street_address: data.property?.street_address ?? '',
        city: data.property?.city ?? '',
        province_state: data.property?.province_state ?? '',
        postal_zip: data.property?.postal_zip ?? '',
        country: data.property?.country ?? '',
      });
    }
  }, [data]);

  const handleSaveInfo = async () => {
    setSavingInfo(true);
    try {
      const res = await fetch(`/api/contractor/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              customer: prev.customer
                ? {
                    ...prev.customer,
                    first_name: editForm.first_name,
                    last_name: editForm.last_name,
                    email: editForm.email,
                    phone: editForm.phone || null,
                    lead_source: editForm.lead_source || null,
                  }
                : prev.customer,
              property: prev.property
                ? {
                    ...prev.property,
                    formatted_address: editForm.formatted_address || '—',
                    street_address: editForm.street_address || null,
                    city: editForm.city || null,
                    province_state: editForm.province_state || null,
                    postal_zip: editForm.postal_zip || null,
                    country: editForm.country || null,
                  }
                : prev.property,
            }
          : null
      );
      setEditingInfo(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingInfo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-red-600">Customer not found.</p>
        <Link href="/dashboard/customers" className="mt-4 inline-block text-[var(--accent)] hover:underline">
          ← Back to customers
        </Link>
      </div>
    );
  }

  const { session, customer, property, fence, segments, gates, quoteTotals, designSummary, designOption, layoutDrawing } = data;
  const center: [number, number] | undefined =
    property?.latitude != null && property?.longitude != null
      ? [Number(property.latitude), Number(property.longitude)]
      : undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/customers" className="text-sm font-medium text-[var(--accent)] hover:underline">
        ← Back to customers
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {customer ? `${customer.first_name} ${customer.last_name}` : 'Customer'}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {session.status === 'submitted' ? 'Quote submitted' : `Stopped at: ${session.current_step || '—'}`} • Last active {new Date(session.last_active_at).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-[var(--muted)]">Lead status:</span>
          <select
            value={session.lead_status ?? 'new'}
            onChange={(e) => updateLeadStatus(e.target.value)}
            disabled={updatingStatus}
            className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="new">Needs follow-up</option>
            <option value="contacted">Contacted</option>
            <option value="quoted">Quoted</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete customer'}
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Contact</h2>
            {!editingInfo ? (
              <button
                type="button"
                onClick={() => setEditingInfo(true)}
                className="text-sm font-medium text-[var(--accent)] hover:underline"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveInfo}
                  disabled={savingInfo}
                  className="text-sm font-medium text-[var(--accent)] hover:underline disabled:opacity-50"
                >
                  {savingInfo ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingInfo(false); setEditForm({ first_name: customer?.first_name ?? '', last_name: customer?.last_name ?? '', email: customer?.email ?? '', phone: customer?.phone ?? '', lead_source: customer?.lead_source ?? '', formatted_address: property?.formatted_address ?? '', street_address: property?.street_address ?? '', city: property?.city ?? '', province_state: property?.province_state ?? '', postal_zip: property?.postal_zip ?? '', country: property?.country ?? '' }); }}
                  disabled={savingInfo}
                  className="text-sm font-medium text-[var(--muted)] hover:underline disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          {editingInfo ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--muted)]">First name</label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm((p) => ({ ...p, first_name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--muted)]">Last name</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm((p) => ({ ...p, last_name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted)]">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted)]">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted)]">Lead source</label>
                <input
                  type="text"
                  value={editForm.lead_source}
                  onChange={(e) => setEditForm((p) => ({ ...p, lead_source: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted)]">Address</label>
                <input
                  type="text"
                  value={editForm.formatted_address}
                  onChange={(e) => setEditForm((p) => ({ ...p, formatted_address: e.target.value }))}
                  placeholder="123 Main St, City, Province"
                  className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--muted)]">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--muted)]">Province / State</label>
                  <input
                    type="text"
                    value={editForm.province_state}
                    onChange={(e) => setEditForm((p) => ({ ...p, province_state: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--muted)]">Postal / Zip</label>
                  <input
                    type="text"
                    value={editForm.postal_zip}
                    onChange={(e) => setEditForm((p) => ({ ...p, postal_zip: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--muted)]">Country</label>
                  <input
                    type="text"
                    value={editForm.country}
                    onChange={(e) => setEditForm((p) => ({ ...p, country: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>
            </div>
          ) : (
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-[var(--muted)]">Name</dt>
                <dd>{customer ? `${customer.first_name} ${customer.last_name}` : '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Email</dt>
                <dd><a href={`mailto:${customer?.email}`} className="text-[var(--accent)] hover:underline">{customer?.email ?? '—'}</a></dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Phone</dt>
                <dd>{customer?.phone ? <a href={`tel:${customer.phone}`} className="text-[var(--accent)] hover:underline">{customer.phone}</a> : '—'}</dd>
              </div>
              {(customer?.lead_source || editingInfo) && (
                <div>
                  <dt className="text-[var(--muted)]">Lead source</dt>
                  <dd>{customer?.lead_source ?? '—'}</dd>
                </div>
              )}
            </dl>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Address</h2>
          {!editingInfo && (
            <>
              <p className="mt-2 text-[var(--text)]">{property?.formatted_address ?? '—'}</p>
              {(property?.city || property?.province_state || property?.postal_zip) && (
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {[property.city, property.province_state, property.postal_zip].filter(Boolean).join(', ')}
                </p>
              )}
            </>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Fence drawing</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {layoutDrawing && segments.length > 0
                  ? 'Layout drawing and map view below.'
                  : layoutDrawing
                    ? 'Layout drawing from Draw.'
                    : segments.length > 0
                      ? 'The outline they drew on the map.'
                      : 'Export to layout or calculator to add a drawing.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(layoutDrawing || segments.length > 0 || fence) && (
                <button
                  type="button"
                  onClick={() => setShowExportToAdmin(true)}
                  className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
                >
                  Export fence layout to admin →
                </button>
              )}
              <button
                type="button"
                onClick={() => router.push(`/dashboard/calculator?from=${id}`)}
                className="rounded-xl border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Export to Quote Calculator →
              </button>
              <button
                type="button"
                onClick={() => router.push(`/dashboard/layout?from=${id}`)}
                className="rounded-xl border border-[var(--accent)] bg-white px-4 py-2 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/5"
              >
                Export to layout →
              </button>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {layoutDrawing?.drawing_data && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-[var(--muted)]">Layout drawing</h3>
                <div className="min-h-[300px] rounded-lg border border-[var(--line)] overflow-hidden">
                  <LayoutDrawCanvas
                    readOnly
                    initialDrawing={{
                      points: layoutDrawing.drawing_data.points ?? [],
                      segments: layoutDrawing.drawing_data.segments ?? [],
                      gates: (layoutDrawing.drawing_data.gates ?? []).map((g: { type: string; quantity: number }) => ({
                        type: g.type as 'single' | 'double',
                        quantity: g.quantity ?? 0,
                      })),
                      total_length_ft: layoutDrawing.drawing_data.total_length_ft ?? 0,
                    }}
                  />
                </div>
              </div>
            )}
            {segments.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-[var(--muted)]">Map view</h3>
                <FenceDrawingMap segments={segments} gates={gates} center={center} className="min-h-[300px]" />
              </div>
            )}
            {!layoutDrawing?.drawing_data && segments.length === 0 && !fence && (
              <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--bg2)] text-sm text-[var(--muted)]">
                No fence drawing saved yet
              </div>
            )}
          </div>
          {(segments.length > 0 || fence) && (
            <div className="mt-4 space-y-2">
              {segments.length > 0 && (
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                  <span className="font-medium">Segment lengths:</span>
                  {segments.map((seg, i) => (
                    <span key={i} className="text-[var(--muted)]">
                      Line {i + 1}: {seg.length_ft != null ? `${Number(seg.length_ft).toFixed(1)} ft` : '—'}
                    </span>
                  ))}
                </div>
              )}
              {fence && (
                <div className="flex flex-wrap gap-4 text-sm">
                  <span><strong>Total length:</strong> {fence.total_length_ft.toFixed(1)} ft</span>
                  {fence.has_removal && <span className="text-[var(--muted)]">Removal included</span>}
                  {gates.length > 0 && (
                    <span>
                      <strong>Gates:</strong> {gates.map((g) => `${g.quantity} ${g.gate_type}`).join(', ')}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

      {showExportToAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !submittingExport && setShowExportToAdmin(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-[var(--line)] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Export fence layout to admin</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Add quote notes with specifications or anything the admin should know. The layout will be sent for a material quote.
            </p>
            <textarea
              value={exportNotes}
              onChange={(e) => setExportNotes(e.target.value)}
              placeholder="e.g. WPC privacy, 6 ft, white. Need gates. Include removal."
              rows={4}
              className="mt-4 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleExportToAdmin}
                disabled={submittingExport}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-amber-600"
              >
                {submittingExport ? 'Sending…' : 'Submit to admin'}
              </button>
              <button
                type="button"
                onClick={() => !submittingExport && setShowExportToAdmin(false)}
                disabled={submittingExport}
                className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-medium hover:bg-[var(--bg2)] disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

        <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Design choice</h2>
          {designSummary ? (
            <>
              <p className="mt-2 font-medium">{designSummary}</p>
              {designOption && (
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {designOption.height_ft != null && (
                    <><dt className="text-[var(--muted)]">Height</dt><dd>{designOption.height_ft} ft</dd></>
                  )}
                  {designOption.type && (
                    <><dt className="text-[var(--muted)]">Material / type</dt><dd>{designOption.type}</dd></>
                  )}
                  {designOption.style && (
                    <><dt className="text-[var(--muted)]">Style</dt><dd>{designOption.style}</dd></>
                  )}
                  {designOption.colour && (
                    <><dt className="text-[var(--muted)]">Colour</dt><dd>{designOption.colour}</dd></>
                  )}
                </dl>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">No design selected yet.</p>
          )}
          {quoteTotals && (
            <div className="mt-4 rounded-lg bg-[var(--bg2)] p-4">
              <div className="text-xs font-bold text-[var(--muted)]">Estimated range</div>
              <div className="text-xl font-bold">
                ${quoteTotals.total_low.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} – ${quoteTotals.total_high.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD
              </div>
            </div>
          )}
        </section>

        {(data.savedQuotes && data.savedQuotes.length > 0) ? (
          <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Saved Quotes</h2>
            <div className="space-y-3">
              {data.savedQuotes.map((q, idx) => (
                <div key={q.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--line)] p-4">
                  <div>
                    <div className="font-semibold text-[var(--text)]">Quote #{data.savedQuotes!.length - idx}</div>
                    <div className="text-sm text-[var(--muted)]">Saved: {new Date(q.created_at).toLocaleString()}</div>
                  </div>
                  <div className="font-bold text-lg text-[var(--text)]">
                    ${q.grand_total.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {q.calculator_state && (
                      <Link
                        href={`/dashboard/calculator?from=${id}&quote_id=${q.id}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-[var(--accent)] bg-[var(--accent)]/10 px-3 py-2 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/20"
                      >
                        Load in Calculator
                      </Link>
                    )}
                    <Link
                      href={`/dashboard/customers/${id}/preview?quote_id=${q.id}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--bg2)]"
                    >
                      Preview
                    </Link>
                    <a
                      href={`/api/contractor/customers/${id}/quote-pdf?quote_id=${q.id}`}
                      download={`quote-${q.id.slice(0, 8)}.pdf`}
                      className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                      Download PDF
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuote(q.id)}
                      disabled={deletingQuoteId === q.id}
                      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingQuoteId === q.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : session.contractor_quote_text ? (
          <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Your saved quote</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {session.contractor_quote_saved_at
                    ? `Saved ${new Date(session.contractor_quote_saved_at).toLocaleString()}`
                    : 'Saved from Quote Calculator'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/customers/${id}/preview`}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--text)] shadow-sm transition hover:bg-[var(--bg2)]"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview quote
                </Link>
                <a
                  href={`/api/contractor/customers/${id}/quote-pdf`}
                  download="quote.pdf"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </a>
              </div>
            </div>
            <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-[var(--bg2)] p-4 text-sm font-mono">
              {session.contractor_quote_text}
            </pre>
          </section>
        ) : null}
      </div>
    </div>
  );
}
