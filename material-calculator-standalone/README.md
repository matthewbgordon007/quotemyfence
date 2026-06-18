# FMS Material Calculator (Standalone)

A self-contained copy of the QuoteMyFence **material calculator** — PVC/vinyl, chain link, and hybrid fence material lists with layout sketching.

No login, database, or hosting required. Runs locally in the browser.

## Quick start

```bash
cd material-calculator-standalone
npm install
npm run dev
```

Open the URL shown in the terminal (usually http://localhost:5173).

## What's included

- **PVC / Vinyl** — panel runs, gates, master material list, PDF export
- **Chain link** — mesh, rails, ties, gates
- **Hybrid horizontal & vertical** — WPC/aluminum and PVC hybrid calculators
- **Layout sketch canvas** — draw fence lines and place gates
- **Auto-save** — your work is stored in the browser (`localStorage`)

## Editing the calculator

| Area | Files |
|------|-------|
| Main UI & tabs | `src/MaterialCalculator.tsx` |
| Layout drawing | `src/components/LayoutDrawCanvas.tsx` |
| PVC math | `src/lib/fms-pvc-material-calculator.ts`, `fms-pvc-gates-calculator.ts`, `fms-pvc-breakdown-master.ts` |
| Chain link math | `src/lib/fms-chain-link-calculator.ts` |
| Hybrid math | `src/lib/fms-hybrid-calculators.ts` |
| Excel-style rounding | `src/lib/fms-excel-math.ts` |
| PDF export | `src/lib/master-material-list-pdf-data.ts`, `master-material-list-pdf-document.tsx` |

Formulas are transcribed from the FMS 2026 Fencing Material Calculator workbook. Run parity checks from the parent project with `npm run verify:fms` if you change math.

## Build for sharing

```bash
npm run build
npm run preview
```

Or zip this entire folder and send it. The recipient only needs Node.js installed.

## Notes

- This is extracted from the main QuoteMyFence app. Platform features (supplier quotes, layout imports from the dashboard, billing) are removed.
- Work saves under the key `qmf_material_calculator_draft_v…_standalone` in browser storage.
