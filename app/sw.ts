import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Authenticated contractor APIs must never be served from the generic "apis" cache
  // (stale GET responses revert client UI, e.g. sales team "receives leads").
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url: { pathname } }) =>
        sameOrigin && pathname.startsWith("/api/contractor/"),
      method: "POST",
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ sameOrigin, url: { pathname } }) =>
        sameOrigin && pathname.startsWith("/api/contractor/"),
      method: "GET",
      handler: new NetworkOnly({ networkTimeoutSeconds: 15 }),
    },
    // Supabase Storage public URLs must not be served stale/broken from SW cache (product photos would blank).
    {
      matcher: ({ url }) =>
        url.hostname.endsWith("supabase.co") && url.pathname.includes("/storage/"),
      method: "GET",
      handler: new NetworkOnly({ networkTimeoutSeconds: 30 }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
