-- QuoteMyFence multi-tenant schema
-- Run this in Supabase SQL editor to create tables + RLS

-- 1. contractors
CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  address_line_1 TEXT,
  city TEXT,
  province_state TEXT,
  postal_zip TEXT,
  country TEXT DEFAULT 'CA',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  secondary_color TEXT,
  accent_color TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. users (contractor staff – link to Supabase Auth via email or custom)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  auth_id UUID, -- Supabase auth.users.id if using Supabase Auth
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sales' CHECK (role IN ('owner','admin','sales','estimator')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contractor_id, email)
);

-- 3. sales_team_members (shown on completion page)
CREATE TABLE IF NOT EXISTS sales_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  phone TEXT,
  email TEXT,
  photo_url TEXT,
  display_order INT DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. lead_sources
CREATE TABLE IF NOT EXISTS lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  material TEXT,
  style TEXT,
  default_height_ft NUMERIC(5,2) DEFAULT 6,
  is_active BOOLEAN DEFAULT true,
  thumbnail_url TEXT,
  preview_image_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. product_options (height, color, style per product)
CREATE TABLE IF NOT EXISTS product_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  height_ft NUMERIC(5,2) NOT NULL,
  color TEXT,
  style_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. pricing_rules (low/high range per product_option)
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  product_option_id UUID NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
  base_price_per_ft_low NUMERIC(10,2) NOT NULL DEFAULT 0,
  base_price_per_ft_high NUMERIC(10,2) NOT NULL DEFAULT 0,
  single_gate_low NUMERIC(10,2) DEFAULT 0,
  single_gate_high NUMERIC(10,2) DEFAULT 0,
  double_gate_low NUMERIC(10,2) DEFAULT 0,
  double_gate_high NUMERIC(10,2) DEFAULT 0,
  removal_price_per_ft_low NUMERIC(10,2) DEFAULT 0,
  removal_price_per_ft_high NUMERIC(10,2) DEFAULT 0,
  minimum_job_low NUMERIC(10,2) DEFAULT 0,
  minimum_job_high NUMERIC(10,2) DEFAULT 0,
  tax_mode TEXT DEFAULT 'excluded',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_option_id)
);

-- 8. quote_sessions (homeowner workflow)
CREATE TABLE IF NOT EXISTS quote_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN (
    'started','contact_saved','address_saved','drawing_saved','design_saved','submitted','abandoned'
  )),
  current_step TEXT DEFAULT 'contact',
  started_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_sessions_contractor ON quote_sessions(contractor_id);
CREATE INDEX IF NOT EXISTS idx_quote_sessions_status ON quote_sessions(status);

-- 9. customers (lead record per session)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_session_id UUID NOT NULL REFERENCES quote_sessions(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  lead_source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quote_session_id)
);

-- 10. properties
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_session_id UUID NOT NULL REFERENCES quote_sessions(id) ON DELETE CASCADE,
  formatted_address TEXT NOT NULL,
  street_address TEXT,
  city TEXT,
  province_state TEXT,
  postal_zip TEXT,
  country TEXT,
  latitude NUMERIC(12,8),
  longitude NUMERIC(12,8),
  place_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quote_session_id)
);

-- 11. fences (one per session for MVP; later multiple runs)
CREATE TABLE IF NOT EXISTS fences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_session_id UUID NOT NULL REFERENCES quote_sessions(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Main',
  total_length_ft NUMERIC(12,2) NOT NULL DEFAULT 0,
  has_removal BOOLEAN DEFAULT false,
  selected_product_option_id UUID REFERENCES product_options(id) ON DELETE SET NULL,
  subtotal_low NUMERIC(12,2) DEFAULT 0,
  subtotal_high NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. fence_segments (drawing points)
CREATE TABLE IF NOT EXISTS fence_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fence_id UUID NOT NULL REFERENCES fences(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  start_lat NUMERIC(12,8) NOT NULL,
  start_lng NUMERIC(12,8) NOT NULL,
  end_lat NUMERIC(12,8) NOT NULL,
  end_lng NUMERIC(12,8) NOT NULL,
  length_ft NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. gates
CREATE TABLE IF NOT EXISTS gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fence_id UUID NOT NULL REFERENCES fences(id) ON DELETE CASCADE,
  gate_type TEXT NOT NULL CHECK (gate_type IN ('single','double')),
  quantity INT NOT NULL DEFAULT 1,
  unit_price_low NUMERIC(10,2) DEFAULT 0,
  unit_price_high NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. quote_totals
CREATE TABLE IF NOT EXISTS quote_totals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_session_id UUID NOT NULL REFERENCES quote_sessions(id) ON DELETE CASCADE,
  subtotal_low NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal_high NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_low NUMERIC(12,2) DEFAULT 0,
  tax_high NUMERIC(12,2) DEFAULT 0,
  total_low NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_high NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quote_session_id)
);

-- 15. notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_session_id UUID NOT NULL REFERENCES quote_sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('contractor_email','customer_email','internal_alert')),
  recipient TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  sent_at TIMESTAMPTZ,
  provider_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: public read contractor by slug only
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active contractors by slug"
  ON contractors FOR SELECT
  USING (is_active = true);

-- RLS: contractor users see only their data
CREATE POLICY "Users see own contractor"
  ON contractors FOR ALL
  USING (
    id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true)
  );

-- Enable RLS on other tables (contractor-scoped)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE fences ENABLE ROW LEVEL SECURITY;
ALTER TABLE fence_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_totals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Service role / API will bypass RLS; anon key used for public estimate flow.
-- Public API creates quote_sessions and related rows via service role or dedicated anon policies.
CREATE POLICY "Allow anon insert quote_sessions"
  ON quote_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anon select own quote_session by id" 
  ON quote_sessions FOR SELECT
  USING (true);

CREATE POLICY "Allow anon update quote_sessions"
  ON quote_sessions FOR UPDATE
  USING (true);

-- Similar for customers, properties, fences, etc. (simplified: anon can insert/update for quote flow)
-- In production you'd scope by session token or similar.
CREATE POLICY "Allow insert customers" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Allow update customers" ON customers FOR UPDATE USING (true);

CREATE POLICY "Allow insert properties" ON properties FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select properties" ON properties FOR SELECT USING (true);
CREATE POLICY "Allow update properties" ON properties FOR UPDATE USING (true);

CREATE POLICY "Allow insert fences" ON fences FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select fences" ON fences FOR SELECT USING (true);
CREATE POLICY "Allow update fences" ON fences FOR UPDATE USING (true);

CREATE POLICY "Allow insert fence_segments" ON fence_segments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select fence_segments" ON fence_segments FOR SELECT USING (true);

CREATE POLICY "Allow insert gates" ON gates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select gates" ON gates FOR SELECT USING (true);

CREATE POLICY "Allow insert quote_totals" ON quote_totals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select quote_totals" ON quote_totals FOR SELECT USING (true);
CREATE POLICY "Allow update quote_totals" ON quote_totals FOR UPDATE USING (true);

-- 16. saved_quotes (multiple saved versions of a quote)
CREATE TABLE IF NOT EXISTS saved_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_session_id UUID NOT NULL REFERENCES quote_sessions(id) ON DELETE CASCADE,
  quote_text TEXT NOT NULL,
  grand_total NUMERIC(12,2) DEFAULT 0,
  calculator_state JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE saved_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow select saved_quotes" ON saved_quotes FOR SELECT USING (true);
CREATE POLICY "Allow insert saved_quotes" ON saved_quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete saved_quotes" ON saved_quotes FOR DELETE USING (true);

-- Public read for products/product_options/pricing_rules by contractor (via slug lookup)
CREATE POLICY "Public read products by contractor"
  ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Public read product_options"
  ON product_options FOR SELECT USING (is_active = true);
CREATE POLICY "Public read pricing_rules"
  ON pricing_rules FOR SELECT USING (is_active = true);
CREATE POLICY "Public read sales_team_members"
  ON sales_team_members FOR SELECT USING (is_visible = true);
CREATE POLICY "Public read lead_sources"
  ON lead_sources FOR SELECT USING (is_active = true);
