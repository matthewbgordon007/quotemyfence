"use client";

import { motion } from "framer-motion";
import { Highlight } from "@/components/ui/hero-highlight";

export function DemoVideoTitle() {
  return (
    <motion.h2
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="text-center font-heading text-xl font-bold text-slate-800 sm:text-2xl md:text-3xl max-w-3xl mx-auto px-4 mb-8 sm:mb-10 leading-relaxed"
    >
      Get <Highlight className="text-slate-900">instant quotes</Highlight> on
      satellite-precise maps. Capture{" "}
      <Highlight className="text-slate-900">24/7 pre-qualified leads</Highlight>.
      Turn tire-kickers into{" "}
      <Highlight className="text-slate-900">ready-to-buy customers</Highlight>.
    </motion.h2>
  );
}
