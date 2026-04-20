'use client';

import { MaterialQuoteRequestViewer } from '@/components/dashboard/MaterialQuoteRequestViewer';
import {
  buildGoogleSheetsEmbedUrl,
  getGoogleSheetsTopLevelEditUrl,
  sanitizeExcelOfficeEmbedUrl,
  type GoogleSheetsEmbedMode,
} from '@/lib/supplier-embed-calculator-urls';
import {
  defaultEmbedCalculatorConfig,
  EMBED_CALC_CONFIG_VERSION,
  parseEmbedCalculatorConfig,
} from '@/lib/supplier-embed-calculator-config';
import {
  materialLinesToTsv,
  normalizeMaterialListClipboardPaste,
  parseMaterialListFromPaste,
} from '@/lib/material-quote-lines';
import type { MaterialQuoteRequestDto } from '@/lib/supplier-material-quote-requests-enrich';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ClipboardEvent } from 'react';

/** Legacy browser-only storage; migrated once to company settings when server config is empty. */
const STORAGE_KEY = 'supplier-embedded-calculator-links-v1';

type Stored = {
  googlePasted: string;
  excelPasted: string;
  active: 'google' | 'excel';
  googleSheetsMode: GoogleSheetsEmbedMode;
};

const field =
  'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20';

const sectionLabel = 'text-[11px] font-semibold uppercase tracking-wider text-slate-500';

function loadStored(): Stored {
  if (typeof window === 'undefined') {
    return { googlePasted: '', excelPasted: '', active: 'google', googleSheetsMode: 'fullEdit' };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { googlePasted: '', excelPasted: '', active: 'google', googleSheetsMode: 'fullEdit' };
    const j = JSON.parse(raw) as Partial<Stored>;
    const mode: GoogleSheetsEmbedMode =
      j.googleSheetsMode === 'compact' || j.googleSheetsMode === 'fullEdit' ? j.googleSheetsMode : 'fullEdit';
    return {
      googlePasted: typeof j.googlePasted === 'string' ? j.googlePasted : '',
      excelPasted: typeof j.excelPasted === 'string' ? j.excelPasted : '',
      active: j.active === 'excel' ? 'excel' : 'google',
      googleSheetsMode: mode,
    };
  } catch {
    return { googlePasted: '', excelPasted: '', active: 'google', googleSheetsMode: 'fullEdit' };
  }
}

export function SupplierEmbeddedCalculatorClient() {
  const searchParams = useSearchParams();
  const materialRequestId = searchParams.get('materialRequest');
  const showQuotePanel = Boolean(materialRequestId?.trim());

  const [active, setActive] = useState<'google' | 'excel'>('google');
  const [googlePasted, setGooglePasted] = useState('');
  const [excelPasted, setExcelPasted] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [excelError, setExcelError] = useState<string | null>(null);
  const [googleSheetsMode, setGoogleSheetsMode] = useState<GoogleSheetsEmbedMode>('fullEdit');
  const [sideRequest, setSideRequest] = useState<MaterialQuoteRequestDto | null>(null);
  const [sideLoading, setSideLoading] = useState(false);
  const [sideError, setSideError] = useState<string | null>(null);
  const [materialDraftTsv, setMaterialDraftTsv] = useState('');
  const [materialSaving, setMaterialSaving] = useState(false);
  const [quotedNotesDraft, setQuotedNotesDraft] = useState('');
  const [quotedSaving, setQuotedSaving] = useState(false);
  const [syncState, setSyncState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/supplier/embed-calculator-config', { credentials: 'include' });
        const j = (await r.json()) as { error?: string; config?: unknown };
        if (cancelled) return;
        if (!r.ok) throw new Error(j.error || 'Could not load saved links');
        let cfg = parseEmbedCalculatorConfig(j.config);
        if (!cfg.googlePasted.trim() && !cfg.excelPasted.trim()) {
          const local = loadStored();
          if (local.googlePasted.trim() || local.excelPasted.trim()) {
            const body = { version: EMBED_CALC_CONFIG_VERSION, ...local };
            const put = await fetch('/api/supplier/embed-calculator-config', {
              method: 'PUT',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            const pj = (await put.json()) as { error?: string; config?: unknown };
            if (put.ok && pj.config) {
              cfg = parseEmbedCalculatorConfig(pj.config);
              try {
                localStorage.removeItem(STORAGE_KEY);
              } catch {
                /* ignore */
              }
            } else {
              cfg = { ...defaultEmbedCalculatorConfig(), ...local, version: EMBED_CALC_CONFIG_VERSION };
            }
          }
        }
        setGooglePasted(cfg.googlePasted);
        setExcelPasted(cfg.excelPasted);
        setActive(cfg.active);
        setGoogleSheetsMode(cfg.googleSheetsMode);
      } catch (e) {
        if (!cancelled) {
          const local = loadStored();
          setGooglePasted(local.googlePasted);
          setExcelPasted(local.excelPasted);
          setActive(local.active);
          setGoogleSheetsMode(local.googleSheetsMode);
          setSyncMessage(
            e instanceof Error ? e.message : 'Using this browser only until company save is available.',
          );
          setSyncState('error');
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = materialRequestId?.trim();
    if (!id) {
      setSideRequest(null);
      setSideError(null);
      setSideLoading(false);
      setMaterialDraftTsv('');
      return;
    }
    let cancelled = false;
    setSideLoading(true);
    setSideError(null);
    setSideRequest(null);
    (async () => {
      try {
        const r = await fetch(`/api/supplier/material-quote-requests/${encodeURIComponent(id)}`, {
          credentials: 'include',
        });
        const j = (await r.json()) as { error?: string; request?: MaterialQuoteRequestDto };
        if (cancelled) return;
        if (!r.ok) {
          setSideError(j.error || 'Could not load this material request.');
          setSideRequest(null);
        } else if (j.request) {
          setSideRequest(j.request);
          setMaterialDraftTsv(materialLinesToTsv(j.request.supplier_material_list || []));
          setQuotedNotesDraft(j.request.supplier_response?.trim() ? j.request.supplier_response : '');
          setSideError(null);
        } else {
          setSideError('Request not found.');
          setSideRequest(null);
        }
      } catch {
        if (!cancelled) {
          setSideError('Network error loading the request.');
          setSideRequest(null);
        }
      } finally {
        if (!cancelled) setSideLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [materialRequestId]);

  const refetchMaterialRequest = useCallback(async () => {
    const id = materialRequestId?.trim();
    if (!id) return;
    const refetch = await fetch(`/api/supplier/material-quote-requests/${encodeURIComponent(id)}`, {
      credentials: 'include',
    });
    const jj = (await refetch.json()) as { request?: MaterialQuoteRequestDto };
    if (jj.request) {
      setSideRequest(jj.request);
      setMaterialDraftTsv(materialLinesToTsv(jj.request.supplier_material_list || []));
      setQuotedNotesDraft(jj.request.supplier_response?.trim() ? jj.request.supplier_response : '');
    }
  }, [materialRequestId]);

  const onMaterialTsvPaste = useCallback((e: ClipboardEvent<HTMLTextAreaElement>) => {
    const chunk = normalizeMaterialListClipboardPaste(e.clipboardData);
    if (chunk == null) return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    setMaterialDraftTsv((prev) => {
      const next = prev.slice(0, start) + chunk + prev.slice(end);
      queueMicrotask(() => {
        el.selectionStart = el.selectionEnd = start + chunk.length;
      });
      return next;
    });
  }, []);

  const materialParsedCount = useMemo(
    () => parseMaterialListFromPaste(materialDraftTsv).length,
    [materialDraftTsv],
  );

  const googleEmbed = useMemo(
    () => buildGoogleSheetsEmbedUrl(googlePasted, googleSheetsMode),
    [googlePasted, googleSheetsMode],
  );
  const excelEmbed = useMemo(() => sanitizeExcelOfficeEmbedUrl(excelPasted), [excelPasted]);
  const googleOpenInSheetsUrl = useMemo(() => getGoogleSheetsTopLevelEditUrl(googlePasted), [googlePasted]);

  const saveToServer = useCallback(async (payload: Stored) => {
    setSyncState('saving');
    setSyncMessage(null);
    try {
      const r = await fetch('/api/supplier/embed-calculator-config', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: EMBED_CALC_CONFIG_VERSION,
          googlePasted: payload.googlePasted,
          excelPasted: payload.excelPasted,
          active: payload.active,
          googleSheetsMode: payload.googleSheetsMode,
        }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        setSyncMessage(j.error || 'Save failed');
        setSyncState('error');
        return;
      }
      setSyncState('saved');
      window.setTimeout(() => {
        setSyncState((s) => (s === 'saved' ? 'idle' : s));
      }, 2200);
    } catch {
      setSyncMessage('Network error while saving.');
      setSyncState('error');
    }
  }, []);

  const persist = useCallback(
    (patch: Partial<Stored>) => {
      setHydrated(true);
      const next: Stored = {
        googlePasted: patch.googlePasted ?? googlePasted,
        excelPasted: patch.excelPasted ?? excelPasted,
        active: patch.active ?? active,
        googleSheetsMode: patch.googleSheetsMode ?? googleSheetsMode,
      };
      if (patch.googlePasted !== undefined) setGooglePasted(patch.googlePasted);
      if (patch.excelPasted !== undefined) setExcelPasted(patch.excelPasted);
      if (patch.active !== undefined) setActive(patch.active);
      if (patch.googleSheetsMode !== undefined) setGoogleSheetsMode(patch.googleSheetsMode);
      void saveToServer(next);
    },
    [googlePasted, excelPasted, active, googleSheetsMode, saveToServer],
  );

  const iframeSrc =
    active === 'google'
      ? googleEmbed.ok
        ? googleEmbed.embedUrl
        : null
      : excelEmbed.ok
        ? excelEmbed.embedUrl
        : null;

  return (
    <div
      className={`mx-auto min-h-0 space-y-8 px-4 pb-10 sm:px-6 ${showQuotePanel ? 'max-w-[min(96rem,calc(100vw-1rem))]' : 'max-w-5xl'}`}
    >
      <header className="border-b border-slate-200/80 pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link href="/dashboard/supplier" className="text-sm font-medium text-slate-500 hover:text-slate-800">
              ← Supplier home
            </Link>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Embedded calculator</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Connect a Google Sheet or Excel embed for your company. Everyone on your supplier account uses the same saved
              links.
              {showQuotePanel ? (
                <>
                  {' '}
                  A contractor request is open beside your sheet so you can align materials and send your quote back.
                </>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
            {syncState === 'saving' ? (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                Saving…
              </span>
            ) : syncState === 'saved' ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
                Saved for company
              </span>
            ) : syncState === 'error' && syncMessage ? (
              <span
                className="inline-flex max-w-xs rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 ring-1 ring-amber-200/80"
                title={syncMessage}
              >
                {syncMessage}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div className={`flex min-h-0 flex-col gap-8 ${showQuotePanel ? 'xl:flex-row xl:items-start' : ''}`}>
        {showQuotePanel ? (
          <aside
            className="order-1 w-full shrink-0 space-y-4 rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 shadow-sm sm:p-5 xl:sticky xl:top-4 xl:order-1 xl:w-[min(22rem,100%)] xl:max-h-[min(88dvh,56rem)] xl:overflow-y-auto xl:overscroll-contain"
            style={{ borderColor: 'var(--dashboard-line)' }}
          >
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div className="min-w-0">
                <p className={sectionLabel}>Contractor request</p>
                {sideRequest ? (
                  <>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-900">{sideRequest.contractor.company_name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{new Date(sideRequest.created_at).toLocaleString()}</p>
                    <p className="mt-2 line-clamp-3 text-sm text-slate-700">
                      {sideRequest.project.design_summary || 'Material request'}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">Loading request…</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-1.5 text-right">
                <Link
                  href="/dashboard/supplier/embedded-calculator"
                  scroll={false}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Hide panel
                </Link>
                <Link href="/dashboard/supplier/contractor-quotes" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">
                  All requests
                </Link>
              </div>
            </div>
            {sideLoading ? (
              <div className="flex justify-center py-10">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              </div>
            ) : sideError ? (
              <p className="text-sm font-medium text-red-600">{sideError}</p>
            ) : sideRequest ? (
              <MaterialQuoteRequestViewer request={sideRequest} compact />
            ) : null}
          </aside>
        ) : null}

        <div className={`min-w-0 space-y-8 ${showQuotePanel ? 'order-2 min-w-0 flex-1 xl:order-2' : ''}`}>
          <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-wrap gap-1 border-b border-slate-100 bg-slate-50/90 p-1 sm:p-1.5">
              <button
                type="button"
                onClick={() => {
                  setActive('google');
                  persist({ active: 'google' });
                  setGoogleError(null);
                }}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4 sm:py-2.5 ${
                  active === 'google'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/90'
                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                }`}
              >
                Google Sheets
              </button>
              <button
                type="button"
                onClick={() => {
                  setActive('excel');
                  persist({ active: 'excel' });
                  setExcelError(null);
                }}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4 sm:py-2.5 ${
                  active === 'excel'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/90'
                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                }`}
              >
                Microsoft Excel
              </button>
            </div>
            {active === 'google' ? (
              <div className="space-y-5 p-5 sm:p-6">
                <div>
                  <p className={sectionLabel}>Sheet link</p>
                  <p className="mt-1.5 text-sm text-slate-600">
                    Paste the URL from your browser&apos;s address bar (it includes{' '}
                    <span className="font-mono text-[11px] text-slate-800">/spreadsheets/d/…</span>). Grant{' '}
                    <span className="font-medium text-slate-800">Editor</span> on the sheet and stay signed into Google in
                    this browser.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-800">URL</label>
                  <textarea
                    className={`mt-1.5 min-h-[4.5rem] ${field}`}
                    placeholder="https://docs.google.com/spreadsheets/d/…"
                    value={googlePasted}
                    onChange={(e) => {
                      setGooglePasted(e.target.value);
                      setGoogleError(null);
                    }}
                    disabled={!hydrated}
                  />
                </div>
                {googleError ? <p className="text-sm font-medium text-red-600">{googleError}</p> : null}
                {!googleEmbed.ok && googlePasted.trim() ? (
                  <p className="text-sm text-amber-800">{googleEmbed.error}</p>
                ) : null}
                <div>
                  <p className={sectionLabel}>Toolbar in the frame</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!hydrated}
                      onClick={() => {
                        setGoogleSheetsMode('fullEdit');
                        persist({ googleSheetsMode: 'fullEdit' });
                      }}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4 ${
                        googleSheetsMode === 'fullEdit'
                          ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-500/30'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Full toolbar (edit here)
                    </button>
                    <button
                      type="button"
                      disabled={!hydrated}
                      onClick={() => {
                        setGoogleSheetsMode('compact');
                        persist({ googleSheetsMode: 'compact' });
                      }}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4 ${
                        googleSheetsMode === 'compact'
                          ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-500/30'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Compact view
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">Full toolbar matches opening the same sheet in a new tab.</p>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    onClick={() => {
                      if (!googleEmbed.ok) {
                        setGoogleError(googleEmbed.error);
                        return;
                      }
                      setGoogleError(null);
                      persist({ googlePasted });
                    }}
                  >
                    Save for company
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setGooglePasted('');
                      persist({ googlePasted: '' });
                      setGoogleError(null);
                    }}
                  >
                    Clear URL
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5 p-5 sm:p-6">
                <div>
                  <p className={sectionLabel}>Excel embed</p>
                  <p className="mt-1.5 text-sm text-slate-600">
                    Use the <span className="font-medium text-slate-800">embed</span> URL from OneDrive or SharePoint (
                    <span className="font-mono text-[11px]">onedrive.live.com/embed</span> or{' '}
                    <span className="font-mono text-[11px]">view.officeapps.live.com</span>).
                  </p>
                </div>
                <details className="rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-2 text-sm text-slate-600">
                  <summary className="cursor-pointer font-medium text-slate-800">Where to find the embed URL</summary>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    Open the workbook → <span className="font-medium">⋯</span> (More) → <span className="font-medium">Embed</span>{' '}
                    → copy the <span className="font-medium">src</span> from the iframe code. With edit rights you can usually
                    type in cells below; your organization may restrict embedding.
                  </p>
                </details>
                <div>
                  <label className="block text-sm font-medium text-slate-800">Embed URL</label>
                  <textarea
                    className={`mt-1.5 min-h-[4.5rem] ${field}`}
                    placeholder="https://onedrive.live.com/embed?resid=… or https://view.officeapps.live.com/op/embed.aspx?src=…"
                    value={excelPasted}
                    onChange={(e) => {
                      setExcelPasted(e.target.value);
                      setExcelError(null);
                    }}
                    disabled={!hydrated}
                  />
                </div>
                {excelError ? <p className="text-sm font-medium text-red-600">{excelError}</p> : null}
                {!excelEmbed.ok && excelPasted.trim() ? <p className="text-sm text-amber-800">{excelEmbed.error}</p> : null}
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    onClick={() => {
                      if (!excelEmbed.ok) {
                        setExcelError(excelEmbed.error);
                        return;
                      }
                      setExcelError(null);
                      persist({ excelPasted });
                    }}
                  >
                    Save for company
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setExcelPasted('');
                      persist({ excelPasted: '' });
                      setExcelError(null);
                    }}
                  >
                    Clear URL
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-white px-5 py-3.5 sm:px-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className={sectionLabel}>Live preview</p>
                  <h2 className="text-base font-semibold text-slate-900">Your workbook</h2>
                </div>
                <p className="max-w-xl text-xs leading-relaxed text-slate-500 sm:text-right">
                  {active === 'google'
                    ? 'Blank? Check sharing. A sign-in prompt is often third-party cookies in the iframe—not your dashboard password.'
                    : 'Blank? Regenerate the embed link and confirm your org allows embedding.'}
                </p>
              </div>
              {active === 'google' && googleEmbed.ok && googleOpenInSheetsUrl ? (
                <details className="mt-3 rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium text-slate-800">
                    Sign-in or “view only” inside the sheet?
                  </summary>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    Your QuoteMyFence login is separate from Google. Many browsers do not send your normal Google session into
                    cross-origin iframes, so sign in again inside the sheet or open it in a full tab.
                  </p>
                  <div className="mt-3">
                    <a
                      href={googleOpenInSheetsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                    >
                      Open in Google Sheets
                    </a>
                  </div>
                </details>
              ) : null}
            </div>
            <div className="relative min-h-[62vh] w-full bg-slate-50/60 overscroll-none">
              {!hydrated ? (
                <p className="p-8 text-sm text-slate-500">Loading…</p>
              ) : iframeSrc ? (
                <div
                  className="relative isolate mx-auto h-[min(82vh,880px)] w-full max-w-full overflow-hidden overscroll-none"
                  onWheel={(e) => {
                    /* Wheel over cross-origin iframe retargets to the iframe node; bubbling would hit #main-content and scroll it too. */
                    if (e.target instanceof HTMLIFrameElement) {
                      e.stopPropagation();
                    }
                  }}
                >
                  <iframe
                    title={active === 'google' ? 'Embedded Google Sheet' : 'Embedded Excel workbook'}
                    src={iframeSrc}
                    className="absolute inset-0 h-full w-full border-0 overscroll-none"
                    allow="clipboard-write; clipboard-read; fullscreen"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center">
                  <p className="max-w-sm text-sm text-slate-600">
                    {active === 'google'
                      ? 'Save a valid Google Sheets URL above to load it here.'
                      : 'Save a Microsoft embed URL above to load Excel here.'}
                  </p>
                </div>
              )}
            </div>
          </section>

          {showQuotePanel && materialRequestId?.trim() ? (
            <section className="overflow-hidden rounded-xl border border-amber-200/70 bg-gradient-to-b from-amber-50/50 to-white shadow-sm">
              <div className="border-b border-amber-100/90 px-5 py-4 sm:px-6">
                <p className={sectionLabel}>Reply to contractor</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Material list &amp; quote</h2>
                <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
                  Paste from your sheet above; clipboard tables are cleaned into tab-separated rows. Save materials only, or
                  mark quoted when you are ready to notify the contractor.
                </p>
              </div>
              <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2 lg:items-start">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <label className="text-sm font-medium text-slate-800" htmlFor="material-tsv-draft">
                      1 — Material lines
                    </label>
                    <span className="text-xs tabular-nums text-slate-500">
                      {materialParsedCount === 0
                        ? 'No rows yet'
                        : `${materialParsedCount} line${materialParsedCount === 1 ? '' : 's'} parsed`}
                    </span>
                  </div>
                  <textarea
                    id="material-tsv-draft"
                    value={materialDraftTsv}
                    onChange={(e) => setMaterialDraftTsv(e.target.value)}
                    onPaste={onMaterialTsvPaste}
                    rows={12}
                    className={`min-h-[11rem] ${field} font-mono text-xs leading-relaxed`}
                    placeholder="Description&#9;Qty&#9;Unit&#9;Unit $&#9;Line $"
                    spellCheck={false}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800" htmlFor="supplier-quote-notes">
                    2 — Supplier notes{' '}
                    <span className="font-normal text-slate-500">(optional; included when marked quoted)</span>
                  </label>
                  <textarea
                    id="supplier-quote-notes"
                    value={quotedNotesDraft}
                    onChange={(e) => setQuotedNotesDraft(e.target.value)}
                    rows={6}
                    className={`min-h-[7rem] ${field}`}
                    placeholder="SKUs, lead time, pickup instructions…"
                  />
                </div>
              </div>
              <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
                <p className={sectionLabel}>3 — Send to contractor</p>
                <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                  <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
                    <button
                      type="button"
                      disabled={materialSaving || quotedSaving}
                      onClick={async () => {
                        const id = materialRequestId?.trim();
                        if (!id) return;
                        setMaterialSaving(true);
                        try {
                          const rows = parseMaterialListFromPaste(materialDraftTsv);
                          const r = await fetch(`/api/supplier/material-quote-requests/${encodeURIComponent(id)}`, {
                            method: 'PATCH',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              supplier_material_list_json: rows.length ? rows : null,
                            }),
                          });
                          const j = (await r.json()) as { error?: string };
                          if (!r.ok) throw new Error(j.error || 'Save failed');
                          await refetchMaterialRequest();
                          alert('Saved to contractor quote.');
                        } catch (e) {
                          alert(e instanceof Error ? e.message : 'Save failed');
                        } finally {
                          setMaterialSaving(false);
                        }
                      }}
                      className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {materialSaving ? 'Saving…' : 'Save to contractor quote'}
                    </button>
                    <span className="text-xs text-slate-500">Updates the material list only; request stays open.</span>
                  </div>
                  <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
                    <button
                      type="button"
                      disabled={materialSaving || quotedSaving}
                      onClick={async () => {
                        const id = materialRequestId?.trim();
                        if (!id) return;
                        if (!confirm('Mark this request as quoted and email the contractor?')) return;
                        setQuotedSaving(true);
                        try {
                          const rows = parseMaterialListFromPaste(materialDraftTsv);
                          const r = await fetch(`/api/supplier/material-quote-requests/${encodeURIComponent(id)}`, {
                            method: 'PATCH',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              supplier_material_list_json: rows.length ? rows : null,
                              supplier_response: quotedNotesDraft.trim() || null,
                              status: 'quoted',
                            }),
                          });
                          const j = (await r.json()) as { error?: string };
                          if (!r.ok) throw new Error(j.error || 'Save failed');
                          await refetchMaterialRequest();
                          alert('Marked quoted. The contractor receives an email when mail is configured.');
                        } catch (e) {
                          alert(e instanceof Error ? e.message : 'Save failed');
                        } finally {
                          setQuotedSaving(false);
                        }
                      }}
                      className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {quotedSaving ? 'Saving…' : 'Save & mark quoted'}
                    </button>
                    <span className="text-xs text-slate-500">Saves notes and materials and notifies the contractor.</span>
                  </div>
                </div>
                <div className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Contractor installed quote</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    They open <span className="font-medium">Quote calculator</span> with your link to build the installed
                    quote and save to a customer or new lead. The material list appears there when opened from this request.
                  </p>
                  <div className="mt-3">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                      onClick={() => {
                        const path = `/dashboard/calculator?material_quote_id=${encodeURIComponent(materialRequestId.trim())}`;
                        const url = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
                        void navigator.clipboard.writeText(url).then(
                          () => alert('Calculator link copied. Send it to your contractor.'),
                          () => prompt('Copy this link:', url),
                        );
                      }}
                    >
                      Copy contractor calculator link
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <details className="group rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-semibold text-slate-800 sm:px-6 [&::-webkit-details-marker]:hidden">
              Privacy &amp; limits
            </summary>
            <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-600 sm:px-6">
              <ul className="list-inside list-disc space-y-2">
                <li>Only https links on Google Docs or Microsoft embed hosts are accepted.</li>
                <li>Saved links apply to your whole supplier company.</li>
                <li>Google and Microsoft control login, printing, and whether a file may be embedded.</li>
                <li>
                  Editing in the frame follows each vendor&apos;s rules: you need Editor access, and some orgs block embedding
                  or third-party cookies that sign-in relies on.
                </li>
                <li>
                  Google Sheets in an iframe may not see the same Google account as a normal tab; that is a browser privacy
                  rule, not a bug in your dashboard password.
                </li>
                {showQuotePanel ? (
                  <li>The contractor panel loads from your supplier account; only requests assigned to you can be opened.</li>
                ) : null}
              </ul>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
