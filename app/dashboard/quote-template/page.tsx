'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  buildTypeScopeKey,
  buildTypeStyleScopeKey,
  DEFAULT_QUOTE_TEMPLATE_TEXT,
  getMaterialQuoteTemplate,
  legacyQuoteBlocksStorageKey,
  normalizeTemplateScope,
  QUOTE_TOKEN_DEFS,
  QuoteTokenId,
  composeQuoteText,
  isQuoteBlocks,
  quoteBlocksToTemplateText,
  quoteTemplateScopedStorageKey,
  quoteTemplateStorageKey,
  tokenPlaceholder,
} from '@/lib/quote-template';

const cardShell =
  'overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]';
const cardHeader =
  'border-b border-slate-100/90 bg-gradient-to-r from-slate-50/95 via-white to-blue-50/40 px-5 py-4 sm:px-6';

export default function QuoteTemplatePage() {
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [globalTemplateText, setGlobalTemplateText] = useState(DEFAULT_QUOTE_TEMPLATE_TEXT);
  const [scopedTemplates, setScopedTemplates] = useState<Record<string, string>>({});
  const [targetMode, setTargetMode] = useState<'global' | 'type' | 'type_style'>('global');
  const [types, setTypes] = useState<{ id: string; name: string }[]>([]);
  const [styles, setStyles] = useState<{ id: string; fence_type_id: string; style_name: string }[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [selectedStyleId, setSelectedStyleId] = useState<string>('');
  const selectedType = types.find((t) => t.id === selectedTypeId) || null;
  const selectedStyle = styles.find((s) => s.id === selectedStyleId) || null;

  const activeScopeKey = useMemo(() => {
    if (targetMode === 'global') return null;
    if (!selectedType?.name) return null;
    if (targetMode === 'type') return buildTypeScopeKey(selectedType.name);
    if (!selectedStyle?.style_name) return null;
    return buildTypeStyleScopeKey(selectedType.name, selectedStyle.style_name);
  }, [targetMode, selectedType?.name, selectedStyle?.style_name]);

  const templateText = useMemo(() => {
    if (!activeScopeKey) return globalTemplateText;
    const fromScoped = scopedTemplates[activeScopeKey];
    if (fromScoped) return fromScoped;
    const material = getMaterialQuoteTemplate(selectedType?.name || '');
    return material || globalTemplateText;
  }, [activeScopeKey, scopedTemplates, selectedType?.name, globalTemplateText]);
  const [saved, setSaved] = useState(false);
  const templateRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/api/contractor/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.id) setContractorId(data.id);
      })
      .then(async () => {
        const h = await fetch('/api/contractor/product-hierarchy', { cache: 'no-store' }).then((r) =>
          r.ok ? r.json() : null
        );
        setTypes(Array.isArray(h?.fenceTypes) ? h.fenceTypes : []);
        setStyles(Array.isArray(h?.fenceStyles) ? h.fenceStyles : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!contractorId) return;
    try {
      const raw = localStorage.getItem(quoteTemplateStorageKey(contractorId));
      if (raw) {
        setGlobalTemplateText(raw);
      } else {
        // One-time migration from old block-based template storage.
        const legacyRaw = localStorage.getItem(legacyQuoteBlocksStorageKey(contractorId));
        if (legacyRaw) {
          const parsed: unknown = JSON.parse(legacyRaw);
          if (isQuoteBlocks(parsed)) {
            const migrated = quoteBlocksToTemplateText(parsed);
            setGlobalTemplateText(migrated);
            localStorage.setItem(quoteTemplateStorageKey(contractorId), migrated);
          }
        }
      }
      const scopedRaw = localStorage.getItem(quoteTemplateScopedStorageKey(contractorId));
      if (scopedRaw) {
        const parsedScoped = JSON.parse(scopedRaw) as unknown;
        if (parsedScoped && typeof parsedScoped === 'object') {
          setScopedTemplates(parsedScoped as Record<string, string>);
        }
      }
    } catch {
      // ignore malformed local payloads
    }
  }, [contractorId]);

  useEffect(() => {
    if (!selectedTypeId && types.length > 0) setSelectedTypeId(types[0].id);
  }, [types, selectedTypeId]);

  useEffect(() => {
    if (!selectedTypeId) return;
    const forType = styles.filter((s) => s.fence_type_id === selectedTypeId);
    if (!forType.length) {
      setSelectedStyleId('');
      return;
    }
    if (!forType.some((s) => s.id === selectedStyleId)) {
      setSelectedStyleId(forType[0].id);
    }
  }, [styles, selectedTypeId, selectedStyleId]);

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
      const updater = (prev: string) => `${prev}${prev.endsWith('\n') ? '' : '\n'}${placeholder}`;
      if (activeScopeKey) {
        setScopedTemplates((prev) => ({ ...prev, [activeScopeKey]: updater(templateText) }));
      } else {
        setGlobalTemplateText(updater);
      }
      return;
    }
    const start = el.selectionStart ?? templateText.length;
    const end = el.selectionEnd ?? templateText.length;
    const next = `${templateText.slice(0, start)}${placeholder}${templateText.slice(end)}`;
    if (activeScopeKey) {
      setScopedTemplates((prev) => ({ ...prev, [activeScopeKey]: next }));
    } else {
      setGlobalTemplateText(next);
    }
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + placeholder.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function saveTemplate() {
    if (!contractorId) return;
    if (activeScopeKey) {
      localStorage.setItem(
        quoteTemplateScopedStorageKey(contractorId),
        JSON.stringify({ ...scopedTemplates, [activeScopeKey]: templateText })
      );
    } else {
      localStorage.setItem(quoteTemplateStorageKey(contractorId), templateText);
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function resetTemplate() {
    if (activeScopeKey) {
      setScopedTemplates((prev) => {
        const next = { ...prev };
        delete next[activeScopeKey];
        return next;
      });
      return;
    }
    setGlobalTemplateText(DEFAULT_QUOTE_TEMPLATE_TEXT);
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
              <p className="text-xs font-medium text-slate-600">Template target</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTargetMode('global')}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                    targetMode === 'global' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  Global default
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode('type')}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                    targetMode === 'type' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  Per type
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode('type_style')}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                    targetMode === 'type_style' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  Per type + style
                </button>
              </div>
              {targetMode !== 'global' && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <select
                    value={selectedTypeId}
                    onChange={(e) => setSelectedTypeId(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  {targetMode === 'type_style' ? (
                    <select
                      value={selectedStyleId}
                      onChange={(e) => setSelectedStyleId(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                    >
                      {styles
                        .filter((s) => s.fence_type_id === selectedTypeId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.style_name}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                      Applies to all styles under this type
                    </div>
                  )}
                </div>
              )}
              {activeScopeKey && (
                <p className="mt-2 text-xs text-slate-500">
                  Scope key: <code>{normalizeTemplateScope(activeScopeKey)}</code>
                </p>
              )}
            </div>
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
              onChange={(e) => {
                if (activeScopeKey) {
                  setScopedTemplates((prev) => ({ ...prev, [activeScopeKey]: e.target.value }));
                } else {
                  setGlobalTemplateText(e.target.value);
                }
              }}
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
