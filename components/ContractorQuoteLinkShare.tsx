'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { SITE_URL } from '@/lib/seo';
import { contractorQuotePageUrl, slugifyQuoteSlug } from '@/lib/quote-url';

type Props = {
  slug: string;
  className?: string;
  /** Smaller layout for inline forms (e.g. signup / complete setup). */
  compact?: boolean;
};

export function ContractorQuoteLinkShare({ slug, className = '', compact = false }: Props) {
  const [siteBase, setSiteBase] = useState(() => SITE_URL.replace(/\/$/, ''));
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setSiteBase(window.location.origin);
  }, []);

  const url = useMemo(() => contractorQuotePageUrl(slug, siteBase), [slug, siteBase]);

  const copy = useCallback(async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [url]);

  const downloadPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !url) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `quote-page-qr-${slugifyQuoteSlug(slug).slice(0, 48) || 'quote'}.png`;
    a.click();
  }, [url, slug]);

  if (!url) return null;

  const qrSize = compact ? 112 : 168;
  const title = 'Your public quote page';

  return (
    <div
      className={`rounded-xl border border-slate-200/90 bg-slate-50/80 p-4 shadow-sm ring-1 ring-slate-900/[0.02] sm:p-5 ${className}`}
    >
      <p className={`font-semibold text-slate-900 ${compact ? 'text-sm' : 'text-base'}`}>{title}</p>
      <p className="mt-1 text-xs text-slate-500">
        Share this link or QR on your website, trucks, and estimates—customers land on your branded quote flow.
      </p>

      <div className={`mt-4 flex flex-col gap-5 ${compact ? '' : 'sm:flex-row sm:items-start sm:justify-between'}`}>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="break-all rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 font-mono text-xs leading-relaxed text-slate-800 sm:text-sm">
            {url}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 sm:text-sm"
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:text-sm"
            >
              Open page
            </a>
            <button
              type="button"
              onClick={downloadPng}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:text-sm"
            >
              Download QR (PNG)
            </button>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-2 sm:items-end">
          <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            <QRCodeSVG
              value={url}
              size={qrSize}
              level="M"
              marginSize={2}
              title={`QR code for ${title}`}
              bgColor="#ffffff"
              fgColor="#0f172a"
            />
          </div>
          <span className="sr-only">QR code encoding your quote page URL</span>
        </div>
      </div>

      {/* Hidden canvas for PNG export (matches on-screen QR). */}
      <div className="pointer-events-none fixed left-0 top-0 -z-10 h-px w-px overflow-hidden opacity-0" aria-hidden>
        <QRCodeCanvas
          ref={canvasRef}
          value={url}
          size={qrSize}
          level="M"
          marginSize={2}
          bgColor="#ffffff"
          fgColor="#0f172a"
        />
      </div>
    </div>
  );
}
