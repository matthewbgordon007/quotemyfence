'use client';

const STEPS = [
  { id: 'contact', label: 'Contact', num: 1 },
  { id: 'location', label: 'Address', num: 2 },
  { id: 'draw', label: 'Draw', num: 3 },
  { id: 'design', label: 'Design', num: 4 },
  { id: 'review', label: 'Review', num: 5 },
  { id: 'complete', label: 'Done', num: 6 },
];

export function EstimateStepProgress({ currentStep }: { currentStep: string }) {
  const currentIdx = STEPS.findIndex((s) => s.id === currentStep);
  const isComplete = currentStep === 'complete';

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {STEPS.map((step, i) => {
        const isActive = step.id === currentStep;
        const isPast = currentIdx > i || isComplete;
        const isLast = i === STEPS.length - 1;
        return (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition sm:h-9 sm:w-9 ${
                isActive
                  ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/30'
                  : isPast
                    ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                    : 'bg-[var(--line)]/80 text-[var(--muted)]'
              }`}
              title={step.label}
            >
              {isPast && !isActive && !isComplete ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                step.num
              )}
            </div>
            {!isLast && (
              <div
                className={`mx-0.5 h-0.5 w-4 sm:mx-1 sm:w-6 ${
                  isPast || isComplete ? 'bg-[var(--accent)]/40' : 'bg-[var(--line)]'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
