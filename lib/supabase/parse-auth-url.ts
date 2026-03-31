/**
 * Mirrors GoTrue's parseParametersFromURL: query params override hash fragment.
 * Used because @supabase/ssr's browser client forces flowType "pkce", which rejects
 * implicit-grant tokens in the hash during auto-detect — we apply them via setSession instead.
 */
export function parseAuthParamsFromUrl(href: string): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    const url = new URL(href);
    if (url.hash?.startsWith('#')) {
      const hashSearchParams = new URLSearchParams(url.hash.slice(1));
      hashSearchParams.forEach((value, key) => {
        result[key] = value;
      });
    }
    url.searchParams.forEach((value, key) => {
      result[key] = value;
    });
  } catch {
    /* ignore */
  }
  return result;
}
