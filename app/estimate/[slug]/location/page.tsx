'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useEstimate } from '../EstimateContext';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';

export default function LocationPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { state, setProperty } = useEstimate();
  const [address, setAddress] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<{
    formattedAddress: string;
    lat: number;
    lng: number;
    placeId: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.property?.formattedAddress) {
      setAddress(state.property.formattedAddress);
      if (state.property.lat != null && state.property.lng != null) {
        setSelectedPlace({
          formattedAddress: state.property.formattedAddress,
          lat: state.property.lat,
          lng: state.property.lng,
          placeId: state.property.placeId ?? null,
        });
      }
    }
  }, [state.property?.formattedAddress, state.property?.lat, state.property?.lng, state.property?.placeId]);

  function handlePlaceSelect(place: { formattedAddress: string; lat: number; lng: number; placeId: string | null }) {
    setSelectedPlace(place);
    setAddress(place.formattedAddress);
  }

  async function handleConfirm() {
    const trimmed = address.trim();
    if (!trimmed) {
      setError('Please enter an address.');
      return;
    }
    if (!state.sessionId) {
      setError('Session missing. Please go back to contact and try again.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/public/quote-session/${state.sessionId}/property`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formattedAddress: trimmed,
          latitude: selectedPlace?.lat ?? state.property?.lat ?? null,
          longitude: selectedPlace?.lng ?? state.property?.lng ?? null,
          placeId: selectedPlace?.placeId ?? state.property?.placeId ?? null,
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to save address');
      }
      setProperty({
        formattedAddress: trimmed,
        lat: selectedPlace?.lat ?? state.property?.lat ?? null,
        lng: selectedPlace?.lng ?? state.property?.lng ?? null,
        placeId: selectedPlace?.placeId ?? state.property?.placeId ?? null,
      });
      router.push(`/estimate/${slug}/draw`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-[var(--line)] bg-white/80 px-4 py-3 text-[var(--text)] outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/20';

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white/90 shadow-xl shadow-slate-200/50 backdrop-blur-sm">
        <div
          className="h-1.5 w-full"
          style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-secondary))' }}
        />
        <div className="p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Find your property</h1>
          <p className="mt-2 text-sm text-slate-500">
            Enter your address so we can center the map for drawing your fence.
          </p>

          <div className="mt-8 space-y-5">
          <div>
            <label htmlFor="address" className="block text-sm font-semibold text-slate-600">
              Address
            </label>
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              onPlaceSelect={handlePlaceSelect}
              placeholder="e.g. 123 Main St, Ottawa ON"
              inputId="address"
              className={`mt-2 ${inputClass}`}
            />
            <p className="mt-2 text-xs text-slate-500">
              Start typing — pick your address from the dropdown to center the map correctly.
            </p>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="mt-2 w-full rounded-xl px-4 py-3.5 font-bold text-white shadow-lg shadow-[var(--accent)]/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[var(--accent)]/30 disabled:translate-y-0 disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))' }}
          >
            {loading ? 'Saving…' : 'Continue to draw fence'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
