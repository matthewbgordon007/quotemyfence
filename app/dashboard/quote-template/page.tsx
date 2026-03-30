'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  DEFAULT_QUOTE_TEMPLATE_TEXT,
  legacyQuoteBlocksStorageKey,
  QUOTE_TOKEN_DEFS,
  QuoteTokenId,
  composeQuoteText,
  isQuoteBlocks,
  quoteBlocksToTemplateText,
  quoteTemplateStorageKey,
  tokenPlaceholder,
} from '@/lib/quote-template';

const cardShell =
  'overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]';
const cardHeader =
  'border-b border-slate-100/90 bg-gradient-to-r from-slate-50/95 via-white to-blue-50/40 px-5 py-4 sm:px-6';

export default function QuoteTemplatePage() {
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [templateText, setTemplateText] = useState(DEFAULT_QUOTE_TEMPLATE_TEXT);
  const [saved, setSaved] = useState(false);
  const templateRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/api/contractor/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.id) setContractorId(data.id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!contractorId) return;
    try {
      const raw = localStorage.getItem(quoteTemplateStorageKey(contractorId));
      if (raw) {
        setTemplateText(raw);
        return;
      }
      // One-time migration from old block-based template storage.
      const legacyRaw = localStorage.getItem(legacyQuoteBlocksStorageKey(contractorId));
      if (!legacyRaw) return;
      const parsed: unknown = JSON.parse(legacyRaw);
      if (isQuoteBlocks(parsed)) {
        const migrated = quoteBlocksToTemplateText(parsed);
        setTemplateText(migrated);
        localStorage.setItem(quoteTemplateStorageKey(contractorId), migrated);
      }
    } catch {
      // ignore malformed local payloads
    }
  }, [contractorId]);

  const tokenValues: Record<QuoteTokenId, string> = useMemo(
    () => ({
      brand: 'TitanFencing.ca',
      homeowner: 'John Doe',
      location: '123 Main St, Toronto, ON',
      product: 'PVC • Privacy • White • 6 ft',
      style: 'Rideau',
      color: 'WESTPORT GREY',
      gateInstalledLength: "4.10'",
      lengthExpression: "4.10' + 44.20' + 44.05' + 50.55' + 6.50'",
      privateLengths:
        "LHS Adjacent: 4.10' + Gate Conversion Kit = ( $757.46 + Tax )\nBack: 44.05' = ( $3,303.31 + Tax )\nRHS: 50.55' = ( $3,790.74 + Tax )\nRHS Adjacent: 6.50' = ( $487.43 + Tax )",
      sharedLengths: "LHS: 44.20' length shared 50% w 766 Poetry Circle ( $1,657.28 +Tax)",
      pricePerLinearFt: '$74.99',
      gateKitPrice: '$450.00',
      gates: '1',
      lengths: "- LHS: 42.00' @ $85.00/ft = $3,570.00\n- Back: 50.00' shared 50% with neighbour @ $85.00/ft = $2,125.00",
      privateTotal: '$5,100.00',
      sharedTotal: '$2,125.00',
      gateTotal: '$1,000.00',
      removalTotal: '$450.00',
      subtotal: '$8,675.00',
      taxLine: '13%: $1,127.75',
      grandTotal: '$9,802.75',
      deposit: '$980.28',
    }),
    []
  );

  const previewText = composeQuoteText(templateText, tokenValues);

  function insertToken(token: QuoteTokenId) {
    const el = templateRef.current;
    const placeholder = tokenPlaceholder(token);
    if (!el) {
      setTemplateText((prev) => `${prev}${prev.endsWith('\n') ? '' : '\n'}${placeholder}`);
      return;
    }
    const start = el.selectionStart ?? templateText.length;
    const end = el.selectionEnd ?? templateText.length;
    const next = `${templateText.slice(0, start)}${placeholder}${templateText.slice(end)}`;
    setTemplateText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + placeholder.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function saveTemplate() {
    if (!contractorId) return;
    localStorage.setItem(quoteTemplateStorageKey(contractorId), templateText);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function resetTemplate() {
    setTemplateText(DEFAULT_QUOTE_TEMPLATE_TEXT);
  }

  return (
    <div className="relative mx-auto w-full max-w-6xl space-y-8 pb-10">
      <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Sales tools</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Quote template</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Customize wording once, then the calculator uses this template for every quote.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/calculator"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            Back to calculator
          </Link>
          <button
            type="button"
            onClick={resetTemplate}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={saveTemplate}
            disabled={!contractorId}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-60"
          >
            {saved ? 'Saved' : 'Save template'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className={cardShell}>
          <div className={cardHeader}>
            <h2 className="text-base font-semibold text-slate-900">Template editor</h2>
            <p className="mt-1 text-xs text-slate-500">Paste your full quote text, then insert dynamic placeholders where needed.</p>
          </div>
          <div className="space-y-4 p-4 sm:p-5">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
              <p className="text-xs font-medium text-slate-600">Insert placeholder at cursor</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUOTE_TOKEN_DEFS.map((def) => (
                  <button
                    key={def.token}
                    type="button"
                    onClick={() => insertToken(def.token)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    {def.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              ref={templateRef}
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              rows={20}
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm leading-relaxed text-slate-900 shadow-inner outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              spellCheck={false}
            />
          </div>
        </div>

        <div className={cardShell}>
          <div className={cardHeader}>
            <h2 className="text-base font-semibold text-slate-900">Preview (sample values)</h2>
            <p className="mt-1 text-xs text-slate-500">Calculator values replace these tokens at runtime.</p>
          </div>
          <div className="p-4 sm:p-5">
            <textarea
              readOnly
              value={previewText}
              rows={18}
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-[11px] font-mono leading-relaxed text-slate-900 shadow-inner outline-none selection:bg-blue-200/70"
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
