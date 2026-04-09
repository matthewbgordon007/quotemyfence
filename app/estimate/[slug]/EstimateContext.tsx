'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Contractor, LeadSource, SalesTeamMember } from '@/lib/types';

export interface ProductWithOptions {
  id: string;
  name: string;
  product_options: { id: string; height_ft: number; color: string | null; style_name: string | null }[];
}

export interface PricingRule {
  product_option_id: string;
  base_price_per_ft_low: number;
  base_price_per_ft_high: number;
  single_gate_low: number;
  single_gate_high: number;
  double_gate_low: number;
  double_gate_high: number;
  removal_price_per_ft_low: number;
  removal_price_per_ft_high: number;
  minimum_job_low: number;
  minimum_job_high: number;
}

export interface ProductHierarchy {
  heights: { id: string; height_ft: number }[];
  fenceTypes: { id: string; height_id: string; name: string; standard_height_ft: number }[];
  fenceStyles: { id: string; fence_type_id: string; style_name: string; photo_url?: string | null }[];
  colourOptions: { id: string; fence_style_id: string; color_name: string; photo_url: string | null }[];
  colourPricingRules: { colour_option_id: string; base_price_per_ft_low: number; base_price_per_ft_high: number }[];
}

export interface EstimateConfig {
  contractor: Contractor;
  products: ProductWithOptions[];
  pricingRules: PricingRule[];
  productHierarchy?: ProductHierarchy;
  salesTeam: SalesTeamMember[];
  leadSources: LeadSource[];
}

export interface EstimateState {
  sessionId: string | null;
  contact: { firstName: string; lastName: string; email: string; phone: string; leadSource: string };
  property: { formattedAddress: string; lat: number | null; lng: number | null; placeId: string | null } | null;
  drawing: {
    points: { lat: number; lng: number }[];
    segments: { length_ft: number }[];
    gates: { type: 'single' | 'double'; quantity: number; lat?: number; lng?: number }[];
    total_length_ft: number;
  } | null;
  hasRemoval: boolean;
  selectedProductOptionId: string | null;
  selectedColourOptionId: string | null;
  totals: { subtotal_low: number; subtotal_high: number; total_low: number; total_high: number } | null;
}

const defaultContact = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  leadSource: '',
};

const defaultState: EstimateState = {
  sessionId: null,
  contact: defaultContact,
  property: null,
  drawing: null,
  hasRemoval: false,
  selectedProductOptionId: null,
  selectedColourOptionId: null,
  totals: null,
};

export type EstimateHydrationPayload = {
  sessionId: string;
  contact: EstimateState['contact'];
  property: EstimateState['property'];
  drawing: EstimateState['drawing'];
  hasRemoval: boolean;
  selectedProductOptionId: string | null;
  selectedColourOptionId: string | null;
  totals: EstimateState['totals'];
};

const EstimateContext = createContext<{
  config: EstimateConfig;
  state: EstimateState;
  setSessionId: (id: string) => void;
  setContact: (c: Partial<EstimateState['contact']>) => void;
  setProperty: (p: EstimateState['property']) => void;
  setDrawing: (d: EstimateState['drawing']) => void;
  setHasRemoval: (v: boolean) => void;
  setSelectedProductOptionId: (id: string | null) => void;
  setSelectedColourOptionId: (id: string | null) => void;
  setTotals: (t: EstimateState['totals']) => void;
  hydrateFromServer: (data: EstimateHydrationPayload) => void;
  resetState: () => void;
} | null>(null);

export function EstimateProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config: Awaited<ReturnType<typeof import('@/lib/contractor').getContractorPublicConfig>>;
}) {
  const [state, setState] = useState<EstimateState>(defaultState);

  const hydrateFromServer = useCallback((data: EstimateHydrationPayload) => {
    setState((s) => ({
      ...s,
      sessionId: data.sessionId,
      contact: { ...defaultContact, ...data.contact },
      property: data.property,
      drawing: data.drawing,
      hasRemoval: data.hasRemoval,
      selectedProductOptionId: data.selectedProductOptionId,
      selectedColourOptionId: data.selectedColourOptionId,
      totals: data.totals,
    }));
  }, []);

  const resetState = useCallback(() => setState(defaultState), []);

  const value = useMemo(() => {
    if (!config) return null;
    return {
      config: config as unknown as EstimateConfig,
      state,
      setSessionId: (sessionId: string) => setState((s) => ({ ...s, sessionId })),
      setContact: (c: Partial<EstimateState['contact']>) => setState((s) => ({ ...s, contact: { ...s.contact, ...c } })),
      setProperty: (property: EstimateState['property']) => setState((s) => ({ ...s, property })),
      setDrawing: (drawing: EstimateState['drawing']) => setState((s) => ({ ...s, drawing })),
      setHasRemoval: (hasRemoval: boolean) => setState((s) => ({ ...s, hasRemoval })),
      setSelectedProductOptionId: (selectedProductOptionId: string | null) =>
        setState((s) => ({ ...s, selectedProductOptionId })),
      setSelectedColourOptionId: (selectedColourOptionId: string | null) =>
        setState((s) => ({ ...s, selectedColourOptionId })),
      setTotals: (totals: EstimateState['totals']) => setState((s) => ({ ...s, totals })),
      hydrateFromServer,
      resetState,
    };
  }, [config, state, hydrateFromServer, resetState]);

  if (!value) return null;
  return (
    <EstimateContext.Provider value={value}>
      {children}
    </EstimateContext.Provider>
  );
}

export function useEstimate() {
  const ctx = useContext(EstimateContext);
  if (!ctx) throw new Error('useEstimate must be used within EstimateProvider');
  return ctx;
}
