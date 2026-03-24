'use client';

import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';

const DEMO_URL = 'https://www.quotemyfence.ca/estimate/demo-fence-inc/contact';
const SCHEDULE_CALL_URL = 'https://calendar.app.google/vuWD6xi7CfNptAon9';

export function DesktopCTARail() {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  const ampY = reduceMotion ? 0 : 16;
  const ampX = reduceMotion ? 0 : 8;
  const ampScale = reduceMotion ? 0 : 0.022;

  const driftY = useTransform(scrollY, (s) => Math.sin(s / 520) * ampY);
  const driftX = useTransform(scrollY, (s) => Math.cos(s / 660) * ampX);
  const y = useSpring(driftY, { stiffness: 100, damping: 34, mass: 0.38 });
  const x = useSpring(driftX, { stiffness: 100, damping: 34, mass: 0.38 });

  const rawScale = useTransform(scrollY, (s) => 1 + Math.sin(s / 780) * ampScale);
  const scale = useSpring(rawScale, { stiffness: 85, damping: 28 });

  return (
    <div className="pointer-events-none fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 xl:block 2xl:right-8">
      <motion.div
        className="pointer-events-auto w-52 rounded-2xl border border-slate-200/90 bg-white/90 p-3 shadow-xl shadow-blue-900/[0.07] backdrop-blur-xl ring-1 ring-slate-100/90"
        style={{ x, y, scale }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ready to start?</p>
        <div className="mt-3 flex flex-col gap-2">
          <a
            href={DEMO_URL}
            className="rounded-lg bg-blue-600 px-3 py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-blue-500"
          >
            Try demo
          </a>
          <Link
            href="/signup"
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-center text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50"
          >
            Get started
          </Link>
          <a
            href={SCHEDULE_CALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-center text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50"
          >
            Book call
          </a>
        </div>
      </motion.div>
    </div>
  );
}
