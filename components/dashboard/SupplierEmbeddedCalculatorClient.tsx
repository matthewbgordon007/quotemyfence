'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildGoogleSheetsEmbedUrl,
  sanitizeExcelOfficeEmbedUrl,
  type GoogleSheetsEmbedMode,
} from '@/lib/supplier-embed-calculator-urls';

const STORAGE_KEY = 'supplier-embedded-calculator-links-v1';

type Stored = {
  googlePasted: string;
  excelPasted: string;
  active: 'google' | 'excel';
  googleSheetsMode: GoogleSheetsEmbedMode;
};

const field =
  'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20';

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

function saveStored(s: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore quota */
  }
}

export function SupplierEmbeddedCalculatorClient() {
  const [active, setActive] = useState<'google' | 'excel'>('google');
  const [googlePasted, setGooglePasted] = useState('');
  const [excelPasted, setExcelPasted] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [excelError, setExcelError] = useState<string | null>(null);
  const [googleSheetsMode, setGoogleSheetsMode] = useState<GoogleSheetsEmbedMode>('fullEdit');

  useEffect(() => {
    const s = loadStored();
    setGooglePasted(s.googlePasted);
    setExcelPasted(s.excelPasted);
    setActive(s.active);
    setGoogleSheetsMode(s.googleSheetsMode);
    setHydrated(true);
  }, []);

  const googleEmbed = useMemo(
    () => buildGoogleSheetsEmbedUrl(googlePasted, googleSheetsMode),
    [googlePasted, googleSheetsMode],
  );
  const excelEmbed = useMemo(() => sanitizeExcelOfficeEmbedUrl(excelPasted), [excelPasted]);

  const persist = useCallback((patch: Partial<Stored>) => {
    setHydrated(true);
    const next: Stored = {
      googlePasted: patch.googlePasted ?? googlePasted,
      excelPasted: patch.excelPasted ?? excelPasted,
      active: patch.active ?? active,
      googleSheetsMode: patch.googleSheetsMode ?? googleSheetsMode,
    };
    saveStored(next);
    if (patch.googlePasted !== undefined) setGooglePasted(patch.googlePasted);
    if (patch.excelPasted !== undefined) setExcelPasted(patch.excelPasted);
    if (patch.active !== undefined) setActive(patch.active);
    if (patch.googleSheetsMode !== undefined) setGoogleSheetsMode(patch.googleSheetsMode);
  }, [googlePasted, excelPasted, active, googleSheetsMode]);

  const iframeSrc =
    active === 'google'
      ? googleEmbed.ok
        ? googleEmbed.embedUrl
        : null
      : excelEmbed.ok
        ? excelEmbed.embedUrl
        : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <div
        className="relative overflow-hidden rounded-[2rem] border p-6 shadow-xl shadow-slate-900/[0.05] sm:p-8"
        style={{
          borderColor: 'var(--dashboard-line)',
          background:
            'linear-gradient(135deg, rgb(var(--dashboard-brand-rgb) / 0.14), rgb(255 255 255 / 0.98) 42%, rgb(var(--dashboard-brand-rgb) / 0.05))',
        }}
      >
        <p
          className="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--dashboard-ink)]"
          style={{ background: 'var(--dashboard-soft)' }}
        >
          Supplier workspace
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Embedded calculator</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          Link your own Google Sheet or Microsoft Excel embed and edit in the frame when your account has Editor access—no
          separate tab required. Links are saved in this browser only until we add per-company storage.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-1.5">
        <button
          type="button"
          onClick={() => {
            setActive('google');
            persist({ active: 'google' });
            setGoogleError(null);
          }}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            active === 'google'
              ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/90'
              : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
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
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            active === 'excel'
              ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/90'
              : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
          }`}
        >
          Microsoft Excel
        </button>
      </div>

      {active === 'google' ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-white to-indigo-50/40 px-5 py-4 sm:px-6">
            <h2 className="font-semibold text-slate-900">Google Sheets — link</h2>
            <p className="mt-1 text-sm text-slate-600">
              Paste the normal browser URL (contains <span className="font-mono text-xs">/spreadsheets/d/…</span>). For
              in-dashboard editing, use <span className="font-medium">Edit here (full toolbar)</span> and grant{' '}
              <span className="font-medium">Editor</span> on the sheet. You must be signed into Google in this browser.
            </p>
          </div>
          <div className="space-y-4 p-5 sm:p-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">Sheet URL</label>
              <textarea
                className={`mt-1.5 min-h-[5rem] ${field}`}
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
              <p className="text-sm font-medium text-slate-700">How the sheet appears below</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!hydrated}
                  onClick={() => {
                    setGoogleSheetsMode('fullEdit');
                    persist({ googleSheetsMode: 'fullEdit' });
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    googleSheetsMode === 'fullEdit'
                      ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-500/30'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Edit here (full toolbar)
                </button>
                <button
                  type="button"
                  disabled={!hydrated}
                  onClick={() => {
                    setGoogleSheetsMode('compact');
                    persist({ googleSheetsMode: 'compact' });
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    googleSheetsMode === 'compact'
                      ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-500/30'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Compact (read-mostly)
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Full toolbar is the same Google Sheets UI you get in a new tab, just inside this page.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                onClick={() => {
                  if (!googleEmbed.ok) {
                    setGoogleError(googleEmbed.error);
                    return;
                  }
                  setGoogleError(null);
                  persist({ googlePasted });
                }}
              >
                Save link in this browser
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setGooglePasted('');
                  persist({ googlePasted: '' });
                  setGoogleError(null);
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-white to-indigo-50/40 px-5 py-4 sm:px-6">
            <h2 className="font-semibold text-slate-900">Microsoft Excel — embed URL</h2>
            <p className="mt-1 text-sm text-slate-600">
              Excel in the browser must use an <span className="font-medium">embed</span> address. In OneDrive or SharePoint:
              open the workbook → <span className="font-medium">⋯</span> → <span className="font-medium">Embed</span> → copy the
              URL from the iframe code (starts with{' '}
              <span className="font-mono text-xs">https://onedrive.live.com/embed</span> or{' '}
              <span className="font-mono text-xs">view.officeapps.live.com</span>). When you have edit rights, you can usually
              type in cells right in the frame below; your tenant may restrict embedding or interactivity.
            </p>
          </div>
          <div className="space-y-4 p-5 sm:p-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">Embed URL</label>
              <textarea
                className={`mt-1.5 min-h-[5rem] ${field}`}
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
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                onClick={() => {
                  if (!excelEmbed.ok) {
                    setExcelError(excelEmbed.error);
                    return;
                  }
                  setExcelError(null);
                  persist({ excelPasted });
                }}
              >
                Save link in this browser
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setExcelPasted('');
                  persist({ excelPasted: '' });
                  setExcelError(null);
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-white to-emerald-50/30 px-5 py-4 sm:px-6">
          <h2 className="font-semibold text-slate-900">Live embed</h2>
          <p className="mt-1 text-sm text-slate-600">
            {active === 'google'
              ? 'If the frame is blank, confirm sharing on the sheet and that you are signed into the correct Google account in this browser.'
              : 'If the frame is blank, regenerate the embed link from OneDrive/SharePoint and ensure the file allows embedding for your org.'}
          </p>
        </div>
        <div className="relative min-h-[70vh] w-full bg-slate-50/50">
          {!hydrated ? (
            <p className="p-8 text-sm text-slate-500">Loading…</p>
          ) : iframeSrc ? (
            <iframe
              title={active === 'google' ? 'Embedded Google Sheet' : 'Embedded Excel workbook'}
              src={iframeSrc}
              className="h-[min(85vh,900px)] w-full border-0"
              allow="clipboard-write; clipboard-read; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
              <p className="max-w-md text-sm text-slate-600">
                {active === 'google'
                  ? 'Add a valid Google Sheets URL above to preview it here.'
                  : 'Add a Microsoft embed URL above to preview Excel here.'}
              </p>
            </div>
          )}
        </div>
      </section>

      <details className="group rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-800 sm:px-6">
          Privacy & limits
        </summary>
        <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-600 sm:px-6">
          <ul className="list-inside list-disc space-y-2">
            <li>Only https links on Google Docs or Microsoft embed hosts are accepted.</li>
            <li>Saved links stay in this browser (localStorage), not on our servers yet.</li>
            <li>Google and Microsoft control login, printing, and whether a file may be embedded.</li>
            <li>
              Editing in the frame follows each vendor&apos;s rules: you need Editor access, and some orgs block embedding or
              third-party cookies that sign-in relies on.
            </li>
          </ul>
        </div>
      </details>
    </div>
  );
}
