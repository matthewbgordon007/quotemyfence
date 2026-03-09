'use client';

const STATUS_LABELS: Record<string, string> = {
  new: 'Needs follow-up',
  contacted: 'Contacted',
  quoted: 'Quoted',
  won: 'Won',
  lost: 'Lost',
};

const STATUS_COLORS = [
  '#3b82f6',   // new - blue
  '#eab308',   // contacted - yellow
  '#f97316',   // quoted - orange
  '#22c55e',   // won - green
  '#ef4444',   // lost - red
];

interface Props {
  breakdown: Record<string, number>;
}

export function LeadStatusPieChart({ breakdown }: Props) {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const order = ['new', 'contacted', 'quoted', 'won', 'lost'];

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <div className="h-40 w-40 rounded-full border-2 border-dashed border-[var(--line)]" />
        <p className="text-sm text-[var(--muted)]">No leads in this period</p>
      </div>
    );
  }

  const segments = order
    .filter((k) => breakdown[k] > 0)
    .map((key, i) => ({
      key,
      count: breakdown[key],
      percent: (breakdown[key] / total) * 100,
      color: STATUS_COLORS[order.indexOf(key)],
    }));

  let acc = 0;
  const conicParts = segments
    .map((s) => {
      const start = acc;
      acc += s.percent;
      return `${s.color} ${start}% ${acc}%`;
    })
    .join(', ');

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      <div
        className="h-40 w-40 shrink-0 rounded-full"
        style={{
          background: `conic-gradient(${conicParts})`,
        }}
      />
      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-sm">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-[var(--muted)]">{STATUS_LABELS[s.key] ?? s.key}:</span>
            <span className="font-medium">{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
