'use client';

import { usePathname } from 'next/navigation';
import { EstimateStepProgress } from '@/components/EstimateStepProgress';

export function EstimateStepIndicator() {
  const pathname = usePathname();
  const slugMatch = pathname?.match(/\/estimate\/[^/]+\/([^/?]+)/);
  const step = slugMatch?.[1] ?? 'contact';

  return <EstimateStepProgress currentStep={step} />;
}
