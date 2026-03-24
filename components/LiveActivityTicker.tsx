'use client';

import { useEffect, useState } from 'react';

const PROVINCES = [
  'Ontario',
  'Alberta',
  'British Columbia',
  'Quebec',
  'Nova Scotia',
  'Saskatchewan',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Prince Edward Island',
];

const BUSINESS_TYPES = [
  'Fence contractor',
  'Fence installer',
  'Landscaping company',
  'Deck and fence crew',
  'Outdoor renovation team',
  'Material supplier',
  'Property services company',
  'General contractor',
  'Residential fencing team',
  'Commercial fencing team',
];

const ACTIONS = [
  'started a live demo',
  'published a branded quote page',
  'booked a strategy call',
  'sent a same-day quote',
  'captured new homeowner leads',
  'updated product pricing',
  'added seasonal fence packages',
  'launched a Google Business quote link',
  'closed a high-intent lead',
  'generated map-based fence estimates',
];

const TIME_WINDOWS = [
  'in the last hour',
  'today',
  'this afternoon',
  'this morning',
  'this week',
  'in the last 24 hours',
];

const ITEMS = PROVINCES.flatMap((province) =>
  BUSINESS_TYPES.flatMap((businessType, idx) =>
    ACTIONS.slice(0, 5).map((action, actionIdx) => {
      const timeWindow = TIME_WINDOWS[(idx + actionIdx) % TIME_WINDOWS.length];
      return `${businessType} in ${province} ${action} ${timeWindow}`;
    })
  )
).slice(0, 120);

export function LiveActivityTicker() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * ITEMS.length));

  useEffect(() => {
    const id = setInterval(() => setIndex((v) => (v + 1) % ITEMS.length), 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto mt-6 w-full max-w-3xl rounded-full border border-blue-200 bg-blue-50/80 px-4 py-2 text-center text-sm text-blue-800">
      <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
      <span className="font-semibold">Live activity:</span> {ITEMS[index]}
    </div>
  );
}

