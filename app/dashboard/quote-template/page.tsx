'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  DEFAULT_QUOTE_BLOCKS,
  QUOTE_TOKEN_DEFS,
  QuoteBlock,
  QuoteTokenId,
  composeQuoteText,
  isQuoteBlocks,
  quoteTemplateStorageKey,
} from '@/lib/quote-template';

const cardShell =
  'overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]';
const cardHeader =
  'border-b border-slate-100/90 bg-gradient-to-r from-slate-50/95 via-white to-blue-50/40 px-5 py-4 sm:px-6';

export default function QuoteTemplatePage() {
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [quoteBlocks, setQuoteBlocks] = useState<QuoteBlock[]>(DEFAULT_QUOTE_BLOCKS);
  const [saved, setSaved] = useState(false);

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
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (isQuoteBlocks(parsed)) setQuoteBlocks(parsed);
    } catch {
      // ignore malformed local payloads
    }
  }, [contractorId]);

  const tokenValues: Record<QuoteTokenId, string> = useMemo(
    () => ({
      homeowner: 'John Doe',
      location: '123 Main St, Toronto, ON',
      product: 'PVC • Privacy • White • 6 ft',
      gates: '1 single, 1 double • Removal included',
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

  const previewText = composeQuoteText(quoteBlocks, tokenValues);

  function updateTextBlock(blockId: string, nextText: string) {
    setQuoteBlocks((prev) =>
      prev.map((block) => (block.id === blockId && block.type === 'text' ? { ...block, text: nextText } : block))
    );
  }

  function moveBlock(blockId: string, dir: -1 | 1) {
    setQuoteBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === blockId);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  }

  function addTextBlock() {
    setQuoteBlocks((prev) => [
      ...prev,
      { id: globalThis.crypto?.randomUUID?.() ?? `text-${Date.now()}`, type: 'text', text: 'New text line' },
    ]);
  }

  function addTokenBlock(token: QuoteTokenId) {
    setQuoteBlocks((prev) => [
      ...prev,
      { id: globalThis.crypto?.randomUUID?.() ?? `token-${Date.now()}`, type: 'token', token },
    ]);
  }

  function saveTemplate() {
    if (!contractorId) return;
    localStorage.setItem(quoteTemplateStorageKey(contractorId), JSON.stringify(quoteBlocks));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function resetTemplate() {
    setQuoteBlocks(DEFAULT_QUOTE_BLOCKS);
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
            <h2 className="text-base font-semibold text-slate-900">Template builder</h2>
            <p className="mt-1 text-xs text-slate-500">Text blocks are editable. Value inserts are locked and moveable.</p>
          </div>
          <div className="space-y-4 p-4 sm:p-5">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
              <p className="text-xs font-medium text-slate-600">Add block</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUOTE_TOKEN_DEFS.map((def) => (
                  <button
                    key={def.token}
                    type="button"
                    onClick={() => addTokenBlock(def.token)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    + {def.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={addTextBlock}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  + Text block
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {quoteBlocks.map((block, i) => (
                <div key={block.id} className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => moveBlock(block.id, -1)}
                        disabled={i === 0}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 disabled:opacity-40"
                        aria-label="Move block up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(block.id, 1)}
                        disabled={i === quoteBlocks.length - 1}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 disabled:opacity-40"
                        aria-label="Move block down"
                      >
                        ↓
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      {block.type === 'text' ? (
                        <textarea
                          value={block.text}
                          onChange={(e) => updateTextBlock(block.id, e.target.value)}
                          rows={Math.max(1, block.text.split('\n').length)}
                          className="w-full resize-y rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                        />
                      ) : (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                          {QUOTE_TOKEN_DEFS.find((d) => d.token === block.token)?.label}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
