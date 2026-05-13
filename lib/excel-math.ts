/**
 * Excel-compatible rounding helpers — re-exported from `fms-excel-math` so all workbook
 * ports share one implementation (avoid drift between modules).
 */

export {
  excelCeiling,
  excelIfHPostTypeAdjustLongScrew,
  excelRound,
  excelRoundUp,
} from '@/lib/fms-excel-math';
