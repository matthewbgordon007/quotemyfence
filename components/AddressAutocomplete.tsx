'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google?: unknown;
    initPlacesAutocomplete?: () => void;
  }
}

export interface PlaceResult {
  formattedAddress: string;
  lat: number;
  lng: number;
  placeId: string | null;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: PlaceResult) => void;
  placeholder?: string;
  inputId?: string;
  className?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'e.g. 123 Main St, Ottawa ON',
  inputId = 'address',
  className = '',
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteRef = useRef<any>(null);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const onChangeRef = useRef(onChange);
  onPlaceSelectRef.current = onPlaceSelect;
  onChangeRef.current = onChange;

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
    if (!apiKey) return;

    const init = () => {
      if (!inputRef.current || !window.google?.maps?.places) return;
      if (autocompleteRef.current) return;

      const Autocomplete = (window as Window & { google?: { maps: { places: { Autocomplete: new (el: HTMLInputElement, opts?: object) => { addListener: (ev: string, fn: () => void) => void; getPlace: () => { geometry?: { location?: { lat: () => number; lng: () => number } }; formatted_address?: string; place_id?: string } } } } } }).google?.maps?.places?.Autocomplete;
      if (!Autocomplete) return;
      const autocomplete = new Autocomplete(inputRef.current, {
        fields: ['formatted_address', 'geometry', 'place_id'],
        types: ['address'],
        componentRestrictions: { country: ['ca', 'us'] },
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place?.geometry?.location) return;
        const loc = place.geometry.location;
        const formatted = place.formatted_address || inputRef.current?.value || '';
        onPlaceSelectRef.current({
          formattedAddress: formatted,
          lat: loc.lat(),
          lng: loc.lng(),
          placeId: place.place_id || null,
        });
        onChangeRef.current(formatted);
      });

      autocompleteRef.current = autocomplete;
    };

    if (window.google?.maps?.places) {
      init();
      return;
    }

    const script = document.getElementById('google-maps-script');
    if (script) {
      script.addEventListener('load', init);
      return () => script.removeEventListener('load', init);
    }

    window.initPlacesAutocomplete = init;
    const s = document.createElement('script');
    s.id = 'google-maps-script';
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&callback=initPlacesAutocomplete`;
    s.onerror = () => console.warn('Google Maps script failed to load');
    document.head.appendChild(s);
  }, []);

  return (
    <input
      ref={inputRef}
      id={inputId}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      placeholder={placeholder}
      autoComplete="off"
    />
  );
}
