export type QuoteSessionStatus =
  | 'started'
  | 'contact_saved'
  | 'address_saved'
  | 'drawing_saved'
  | 'design_saved'
  | 'submitted'
  | 'abandoned';

export interface Contractor {
  id: string;
  company_name: string;
  slug: string;
  email: string;
  phone: string | null;
  website: string | null;
  address_line_1: string | null;
  city: string | null;
  province_state: string | null;
  postal_zip: string | null;
  country: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  contractor_id: string;
  name: string;
  category: string | null;
  material: string | null;
  style: string | null;
  default_height_ft: number;
  is_active: boolean;
  thumbnail_url: string | null;
  preview_image_url: string | null;
  description: string | null;
}

export interface ProductOption {
  id: string;
  product_id: string;
  height_ft: number;
  color: string | null;
  style_name: string | null;
  is_active: boolean;
  product?: Product;
}

export interface PricingRule {
  id: string;
  contractor_id: string;
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
  tax_mode: string;
  is_active: boolean;
}

export interface SalesTeamMember {
  id: string;
  contractor_id: string;
  name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  display_order: number;
  is_visible: boolean;
}

export interface LeadSource {
  id: string;
  contractor_id: string;
  label: string;
  display_order: number;
  is_active: boolean;
}

export interface DrawingPoint {
  lat: number;
  lng: number;
}

export interface DrawingSegment {
  length_ft: number;
}

export interface DrawingGate {
  type: 'single' | 'double';
  quantity: number;
}

export interface FenceDrawing {
  points: DrawingPoint[];
  segments: DrawingSegment[];
  gates: DrawingGate[];
  total_length_ft: number;
}
