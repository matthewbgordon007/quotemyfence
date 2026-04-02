/**
 * Supabase Storage image render URLs (same as OptimizedProductImage) for cache-aligned preloading.
 */
export function buildSupabaseRenderUrl(src: string, width?: number, quality?: number): string | null {
  if (!width) return null;
  try {
    const u = new URL(src);
    const marker = '/storage/v1/object/public/';
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    const tail = u.pathname.slice(idx + marker.length);
    if (!tail) return null;
    const render = new URL(u.origin + '/storage/v1/render/image/public/' + tail);
    render.searchParams.set('width', String(width));
    if (quality) render.searchParams.set('quality', String(quality));
    return render.toString();
  } catch {
    return null;
  }
}

export function resolveProductImageSrc(
  clean: string,
  preferredWidth?: number,
  preferredQuality = 72
): string {
  const c = typeof clean === 'string' ? clean.trim() : '';
  if (!c) return c;
  const transformed = buildSupabaseRenderUrl(c, preferredWidth, preferredQuality);
  return transformed || c;
}
