'use client';

import { useEffect, useMemo, useState } from 'react';

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

export function LiveActivityTicker() {
  const [cityIndex, setCityIndex] = useState(() => Math.floor(Math.random() * PROVINCES.length));
  const [businessIndex, setBusinessIndex] = useState(() => Math.floor(Math.random() * BUSINESS_TYPES.length));
  const [actionIndex, setActionIndex] = useState(() => Math.floor(Math.random() * ACTIONS.length));
  const [timeIndex, setTimeIndex] = useState(() => Math.floor(Math.random() * TIME_WINDOWS.length));

  const currentItem = useMemo(() => {
    const province = PROVINCES[cityIndex];
    const businessType = BUSINESS_TYPES[businessIndex];
    const action = ACTIONS[actionIndex];
    const timeWindow = TIME_WINDOWS[timeIndex];
    return `${businessType} in ${province} ${action} ${timeWindow}`;
  }, [cityIndex, businessIndex, actionIndex, timeIndex]);

  useEffect(() => {
    const id = setInterval(() => {
      // All moving parts advance every cycle so city and message both keep changing.
      setCityIndex((v) => (v + 3) % PROVINCES.length);
      setBusinessIndex((v) => (v + 2) % BUSINESS_TYPES.length);
      setActionIndex((v) => (v + 5) % ACTIONS.length);
      setTimeIndex((v) => (v + 1) % TIME_WINDOWS.length);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto mt-6 w-full max-w-3xl rounded-full border border-blue-200 bg-blue-50/80 px-4 py-2 text-center text-sm text-blue-800">
      <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
      <span className="font-semibold">Live activity:</span> {currentItem}
    </div>
  );
}

