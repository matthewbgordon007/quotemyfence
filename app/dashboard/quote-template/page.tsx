'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  buildTypeScopeKey,
  buildTypeStyleScopeKey,
  DEFAULT_QUOTE_TEMPLATE_TEXT,
  GENERIC_BASE_QUOTE_TEMPLATE_TEXT,
  getMaterialQuoteTemplate,
  isCanadianFenceMaterialSupplyProfile,
  legacyQuoteBlocksStorageKey,
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

/** Grouped “insert” chips — plain English; same tokens as the calculator uses behind the scenes. */
const QUOTE_INSERT_GROUPS: { title: string; blurb: string; tokens: QuoteTokenId[] }[] = [
  {
    title: 'Who it’s for & what you’re selling',
    blurb: 'Names, address, fence type, colour.',
    tokens: ['brand', 'homeowner', 'location', 'product', 'style', 'color'],
  },
  {
    title: 'Lengths & gates from the calculator',
    blurb: 'These pull from the lines you enter on the calculator.',
    tokens: ['gateInstalledLength', 'lengthExpression', 'privateLengths', 'sharedLengths', 'gates', 'lengths'],
  },
  {
    title: 'Prices & totals',
    blurb: 'Money lines — subtotal, tax, total, deposit.',
    tokens: [
      'pricePerLinearFt',
      'gateKitPrice',
      'privateTotal',
      'sharedTotal',
      'gateTotal',
      'removalTotal',
      'subtotal',
      'taxLine',
      'grandTotal',
      'deposit',
    ],
  },
];

function labelForToken(token: QuoteTokenId): string {
  return QUOTE_TOKEN_DEFS.find((d) => d.token === token)?.label ?? token;
}

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
        if (data?.id) {
          const id = data.id as string;
          setContractorId(id);
          try {
            const raw = localStorage.getItem(quoteTemplateStorageKey(id));
            if (raw) {
              setGlobalTemplateText(raw);
            } else {
              const legacyRaw = localStorage.getItem(legacyQuoteBlocksStorageKey(id));
              if (legacyRaw) {
                const parsed: unknown = JSON.parse(legacyRaw);
                if (isQuoteBlocks(parsed)) {
                  const migrated = quoteBlocksToTemplateText(parsed);
                  setGlobalTemplateText(migrated);
                  localStorage.setItem(quoteTemplateStorageKey(id), migrated);
                }
              } else if (!isCanadianFenceMaterialSupplyProfile(data.company_name, data.slug)) {
                setGlobalTemplateText(GENERIC_BASE_QUOTE_TEMPLATE_TEXT);
              }
            }
            const scopedRaw = localStorage.getItem(quoteTemplateScopedStorageKey(id));
            if (scopedRaw) {
              const parsedScoped = JSON.parse(scopedRaw) as unknown;
              if (parsedScoped && typeof parsedScoped === 'object') {
                setScopedTemplates(parsedScoped as Record<string, string>);
              }
            }
          } catch {
            // ignore malformed local payloads
          }
        }
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

  const editingLabel =
    targetMode === 'global'
      ? 'Default for all jobs'
      : targetMode === 'type'
        ? `Only when the job is: ${selectedType?.name ?? '…'}`
        : `Only when the job is: ${selectedType?.name ?? '…'} — ${selectedStyle?.style_name ?? '…'}`;

  return (
    <div className="relative mx-auto w-full max-w-6xl space-y-8 pb-10">
      <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Sales tools</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Quote wording</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600">
            Write the letter your customer sees after you run the calculator. Tap the grey buttons to drop in prices
            and measurements — you don’t need to know any special codes.
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
            {activeScopeKey ? 'Clear this custom letter' : 'Restore default letter'}
          </button>
          <button
            type="button"
            onClick={saveTemplate}
            disabled={!contractorId}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-60"
          >
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      <div
        className="rounded-xl border border-blue-100 bg-blue-50/90 px-4 py-3 text-sm leading-relaxed text-slate-800 sm:px-5"
        role="note"
      >
        <p className="font-semibold text-slate-900">How this works</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-slate-700">
          <li>Type normal sentences — same as email or Word.</li>
          <li>
            When you see short codes in curly braces (like a total), leave them alone: the calculator fills those in
            when you build a quote.
          </li>
          <li>Use the sections below to insert a line — the app puts the code in the right spot for you.</li>
        </ul>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,440px)]">
        <div className={cardShell}>
          <div className={cardHeader}>
            <h2 className="text-base font-semibold text-slate-900">Your quote letter</h2>
            <p className="mt-1 text-sm text-slate-600">
              Currently editing: <span className="font-medium text-slate-900">{editingLabel}</span>
            </p>
          </div>
          <div className="space-y-4 p-4 sm:p-5">
            <details className="group rounded-xl border border-slate-200/90 bg-slate-50/80 open:bg-white">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900 outline-none marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="mr-2 inline-block text-slate-400 transition group-open:rotate-90">▸</span>
                Optional: different letter for one kind of fence only
              </summary>
              <div className="border-t border-slate-100 px-4 pb-4 pt-2">
                <p className="text-xs leading-relaxed text-slate-600">
                  Most people only need the default above. Use this if, for example, chain-link quotes should read
                  differently than vinyl quotes.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetMode('global')}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      targetMode === 'global'
                        ? 'border-blue-400 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    All jobs (default)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetMode('type')}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      targetMode === 'type'
                        ? 'border-blue-400 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    This fence type only
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetMode('type_style')}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      targetMode === 'type_style'
                        ? 'border-blue-400 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    This type + one style
                  </button>
                </div>
                {targetMode !== 'global' && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Fence type
                      <select
                        value={selectedTypeId}
                        onChange={(e) => setSelectedTypeId(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                      >
                        {types.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {targetMode === 'type_style' ? (
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Style
                        <select
                          value={selectedStyleId}
                          onChange={(e) => setSelectedStyleId(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                        >
                          {styles
                            .filter((s) => s.fence_type_id === selectedTypeId)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.style_name}
                              </option>
                            ))}
                        </select>
                      </label>
                    ) : (
                      <div className="flex items-end rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600">
                        Applies to every style under this fence type.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </details>

            <div className="space-y-5">
              <p className="text-sm font-semibold text-slate-900">Add a line from the calculator</p>
              {QUOTE_INSERT_GROUPS.map((group) => (
                <div key={group.title} className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 sm:p-4">
                  <p className="text-sm font-semibold text-slate-900">{group.title}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{group.blurb}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.tokens.map((token) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() => insertToken(token)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/60"
                      >
                        + {labelForToken(token)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-900">Letter text</span>
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
                rows={18}
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-base leading-relaxed text-slate-900 shadow-inner outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                spellCheck
                autoComplete="off"
                aria-describedby="quote-template-hint"
              />
              <span id="quote-template-hint" className="mt-2 block text-xs text-slate-500">
                Words in <code className="rounded bg-slate-100 px-1 text-[11px] text-slate-700">{'{{…}}'}</code> are
                filled automatically — use the buttons above if you are not sure what to type.
              </span>
            </label>
          </div>
        </div>

        <div className={cardShell}>
          <div className={cardHeader}>
            <h2 className="text-base font-semibold text-slate-900">Example for a customer</h2>
            <p className="mt-1 text-sm text-slate-600">
              Fake numbers so you can see the layout. Real quotes use your calculator results.
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <textarea
              readOnly
              value={previewText}
              rows={20}
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-900 shadow-inner outline-none selection:bg-blue-100"
              spellCheck={false}
              aria-label="Preview of quote with sample values"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
