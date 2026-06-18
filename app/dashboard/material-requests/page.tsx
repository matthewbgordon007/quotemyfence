'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FreeContractorOnboarding } from '@/components/dashboard/FreeContractorOnboarding';
import { isBillingActive } from '@/lib/billing';
import type { MaterialQuoteRequestDto } from '@/lib/supplier-material-quote-requests-enrich';
import { materialQuoteRequestTitle } from '@/lib/supplier-material-quote-requests-enrich';

type RequestRow = MaterialQuoteRequestDto & { supplier_name?: string | null };

function statusBadge(status: string) {
  switch (status) {
    case 'quoted':
      return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Quoted</span>;
    case 'closed':
      return <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">Closed</span>;
    default:
      return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Pending</span>;
  }
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function MaterialRequestsPage() {
  const [requests, setRequests] = useState<RequestRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [billingActive, setBillingActive] = useState(true);

  useEffect(() => {
    fetch('/api/contractor/me', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        if (!me) return;
        setBillingActive(
          me.account_type === 'supplier' ||
            me.billing_access_override === true ||
            isBillingActive(me.stripe_subscription_status)
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/contractor/material-quote-requests', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then((d: { requests?: RequestRow[] }) => {
        if (!cancelled) setRequests(d.requests || []);
      })
      .catch(() => {
        if (!cancelled) {
          setRequests([]);
          setError('Could not load your material requests. Please refresh to try again.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl pb-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Material requests</h1>
          <p className="mt-1 text-sm text-slate-600">
            Every material list request you&apos;ve sent, and the responses that come back.
          </p>
        </div>
        <Link
          href="/dashboard/layout"
          className="rounded-xl bg-[var(--accent,#2563eb)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          Draw a layout
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {requests === null ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent,#2563eb)] border-t-transparent" />
        </div>
      ) : requests.length === 0 ? (
        <div className="space-y-6">
          {!billingActive ? <FreeContractorOnboarding /> : null}
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-sm font-medium text-slate-700">No material requests yet.</p>
            <p className="mt-1 text-sm text-slate-500">
              Draw a layout and tap <span className="font-semibold">Get material list</span> to send it to your supplier.
            </p>
            <Link
              href="/dashboard/layout"
              className="mt-4 inline-block rounded-xl bg-[var(--accent,#2563eb)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Open the drawing page
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const open = openId === r.id;
            const sentTo = r.supplier_contractor_id ? r.supplier_name || 'Supplier' : 'Platform team';
            const productLabel = [
              r.project?.design_option?.type,
              r.project?.design_option?.style,
              r.project?.design_option?.colour,
            ]
              .filter(Boolean)
              .join(' · ');
            const response = r.supplier_response || r.master_response;
            const list = r.supplier_material_list;
            return (
              <div key={r.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : r.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-slate-900">{materialQuoteRequestTitle(r.project)}</span>
                      {statusBadge(r.status)}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Sent to <span className="font-medium text-slate-700">{sentTo}</span>
                      {productLabel ? ` · ${productLabel}` : ''} · {fmtDate(r.created_at)}
                      {list && list.length > 0 ? ` · ${list.length} items in their list` : ''}
                    </p>
                  </div>
                  <svg
                    className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                {open && (
                  <div className="space-y-4 border-t border-slate-100 px-5 py-4">
                    {list && list.length > 0 && (
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Material list from supplier
                          </h3>
                          {r.supplier_material_list_pdf_url ? (
                            <a
                              href={r.supplier_material_list_pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={r.supplier_material_list_pdf_name || 'material-list.pdf'}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[var(--accent,#2563eb)] shadow-sm transition hover:bg-slate-50"
                            >
                              Download material list (PDF)
                            </a>
                          ) : null}
                        </div>
                        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-100">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                                <th className="px-3 py-2">Item</th>
                                <th className="px-3 py-2 text-right">Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {list.map((line, i) => (
                                <tr key={`${i}-${line.description}`} className="border-b border-slate-100">
                                  <td className="px-3 py-1.5 text-slate-800">{line.description}</td>
                                  <td className="px-3 py-1.5 text-right tabular-nums">{line.qty}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {!list?.length && r.supplier_material_list_pdf_url ? (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Material list from supplier</h3>
                        <a
                          href={r.supplier_material_list_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={r.supplier_material_list_pdf_name || 'material-list.pdf'}
                          className="mt-2 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-[var(--accent,#2563eb)] shadow-sm transition hover:bg-slate-50"
                        >
                          Download material list (PDF)
                        </a>
                      </div>
                    ) : null}
                    {response ? (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Supplier notes</h3>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{response}</p>
                      </div>
                    ) : (
                      (!list || list.length === 0) && (
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Response</h3>
                          <p className="mt-1 text-sm text-slate-500">No response yet — we&apos;ll show it here as soon as it arrives.</p>
                        </div>
                      )
                    )}
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Your request</h3>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{r.description || '—'}</p>
                      {r.attachment_url && (
                        <a
                          href={r.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-sm font-medium text-[var(--accent,#2563eb)] hover:underline"
                        >
                          Attachment: {r.attachment_name || 'file'}
                        </a>
                      )}
                    </div>
                    {r.project?.image_data_url && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Layout</h3>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={r.project.image_data_url}
                          alt="Fence layout"
                          className="mt-2 max-h-72 rounded-lg border border-slate-200 object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
