"use client";

import { motion } from "framer-motion";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";

export function HeroHighlightSection() {
  return (
    <HeroHighlight containerClassName="h-[32rem] sm:h-[36rem] bg-gradient-to-b from-blue-50/80 via-white to-slate-50/80">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: [20, -5, 0] }}
        transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
        className="text-xl px-4 md:text-3xl lg:text-4xl font-bold text-slate-800 max-w-4xl leading-relaxed lg:leading-snug text-center mx-auto"
      >
        Get{" "}
        <Highlight className="text-slate-900">
          instant quotes
        </Highlight>
        {" "}on{" "}
        <Highlight className="text-slate-900">
          satellite-precise
        </Highlight>
        {" "}maps. Capture{" "}
        <Highlight className="text-slate-900">
          24/7
        </Highlight>
        {" "}pre-qualified leads. Turn tire-kickers into{" "}
        <Highlight className="text-slate-900">
          ready-to-buy
        </Highlight>
        {" "}customers.
      </motion.h2>
    </HeroHighlight>
  );
}
