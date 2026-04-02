import type { ProductHierarchy } from '@/app/estimate/[slug]/EstimateContext';
import { resolveProductImageSrc } from '@/lib/supabase-product-image-url';

/** Match design page OptimizedProductImage settings for styles. */
const STYLE_WIDTH = 520;
const STYLE_QUALITY = 70;
/** Match design page for colour cards. */
const COLOUR_WIDTH = 760;
const COLOUR_QUALITY = 72;

export function collectDesignImageUrlsFromHierarchy(hierarchy: ProductHierarchy | null | undefined): string[] {
  if (!hierarchy) return [];
  const out = new Set<string>();
  for (const s of hierarchy.fenceStyles) {
    const u = s.photo_url?.trim();
    if (u) out.add(resolveProductImageSrc(u, STYLE_WIDTH, STYLE_QUALITY));
  }
  for (const c of hierarchy.colourOptions) {
    const u = c.photo_url?.trim();
    if (u) out.add(resolveProductImageSrc(u, COLOUR_WIDTH, COLOUR_QUALITY));
  }
  return Array.from(out);
}

function preloadOne(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

/** Load all URLs in parallel; failures do not block. */
export function preloadDesignProductImages(urls: string[]): Promise<void> {
  if (urls.length === 0) return Promise.resolve();
  return Promise.all(urls.map(preloadOne)).then(() => undefined);
}
