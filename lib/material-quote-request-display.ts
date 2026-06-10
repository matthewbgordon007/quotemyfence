import type { MaterialQuoteRequestProject } from '@/lib/supplier-material-quote-requests-enrich';

/** Product label from supplier catalog pick or lead design. */
export function materialQuoteProductLabel(
  project: Pick<MaterialQuoteRequestProject, 'design_option' | 'design_summary'> | null | undefined
): string | null {
  const opt = project?.design_option;
  if (opt) {
    const parts = [opt.type, opt.style, opt.colour].filter(Boolean);
    if (parts.length > 0) return parts.join(' · ');
  }
  const summary = project?.design_summary?.trim();
  if (summary && !/^not selected$/i.test(summary)) return summary;
  return null;
}

/** Strip auto-appended metadata from stored description — show only contractor-typed notes. */
export function materialQuoteUserNotes(
  description: string | null | undefined,
  homeAddress?: string | null
): string {
  let text = String(description ?? '').trim();
  if (!text || /^no specifications provided\.?$/i.test(text)) return '';

  const dropPatterns = [
    /^—\s*Product:.*$/gim,
    /^—\s*Linear footage:.*$/gim,
    /^—\s*Lines:.*$/gim,
    /^—\s*Gates:.*$/gim,
    /^—\s*Job site:.*$/gim,
  ];
  for (const pattern of dropPatterns) {
    text = text.replace(pattern, '');
  }
  const addr = homeAddress?.trim();
  if (addr) text = text.replace(addr, '');
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  if (/^no specifications provided\.?$/i.test(text)) return '';
  return text;
}
