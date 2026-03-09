-- Run in Supabase SQL editor: RLS policies for contractor dashboard
-- Contractors can manage their products, options, and pricing via authenticated session

-- Users: allow authenticated users to read their own row (required for contractor lookup)
DROP POLICY IF EXISTS "Users can read own row" ON users;
CREATE POLICY "Users can read own row"
  ON users FOR SELECT
  USING (auth_id = auth.uid());

-- Products: contractor can CRUD their own
DROP POLICY IF EXISTS "Contractors manage own products" ON products;
CREATE POLICY "Contractors manage own products"
  ON products FOR ALL
  USING (
    contractor_id IN (
      SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    contractor_id IN (
      SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true
    )
  );

-- Product options: via product ownership
DROP POLICY IF EXISTS "Contractors manage own product options" ON product_options;
CREATE POLICY "Contractors manage own product options"
  ON product_options FOR ALL
  USING (
    product_id IN (
      SELECT id FROM products WHERE contractor_id IN (
        SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true
      )
    )
  )
  WITH CHECK (
    product_id IN (
      SELECT id FROM products WHERE contractor_id IN (
        SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true
      )
    )
  );

-- Pricing rules: contractor can CRUD their own
DROP POLICY IF EXISTS "Contractors manage own pricing rules" ON pricing_rules;
CREATE POLICY "Contractors manage own pricing rules"
  ON pricing_rules FOR ALL
  USING (
    contractor_id IN (
      SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    contractor_id IN (
      SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true
    )
  );

-- Product hierarchy: fence_heights, fence_types, fence_styles, colour_options, colour_pricing_rules
DROP POLICY IF EXISTS "Contractors manage own fence_heights" ON fence_heights;
CREATE POLICY "Contractors manage own fence_heights"
  ON fence_heights FOR ALL
  USING (contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true))
  WITH CHECK (contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true));

DROP POLICY IF EXISTS "Contractors manage own fence_types" ON fence_types;
CREATE POLICY "Contractors manage own fence_types"
  ON fence_types FOR ALL
  USING (
    contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true)
  )
  WITH CHECK (
    contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true)
  );

DROP POLICY IF EXISTS "Contractors manage own fence_styles" ON fence_styles;
CREATE POLICY "Contractors manage own fence_styles"
  ON fence_styles FOR ALL
  USING (
    fence_type_id IN (
      SELECT id FROM fence_types
      WHERE contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    fence_type_id IN (
      SELECT id FROM fence_types
      WHERE contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true)
    )
  );

DROP POLICY IF EXISTS "Contractors manage own colour_options" ON colour_options;
CREATE POLICY "Contractors manage own colour_options"
  ON colour_options FOR ALL
  USING (
    fence_style_id IN (
      SELECT fs.id FROM fence_styles fs
      JOIN fence_types ft ON fs.fence_type_id = ft.id
      WHERE ft.contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    fence_style_id IN (
      SELECT fs.id FROM fence_styles fs
      JOIN fence_types ft ON fs.fence_type_id = ft.id
      WHERE ft.contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true)
    )
  );

DROP POLICY IF EXISTS "Contractors manage own colour_pricing_rules" ON colour_pricing_rules;
CREATE POLICY "Contractors manage own colour_pricing_rules"
  ON colour_pricing_rules FOR ALL
  USING (contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true))
  WITH CHECK (contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true));

-- Sales team members: contractors can CRUD their own
DROP POLICY IF EXISTS "Contractors manage own sales_team_members" ON sales_team_members;
CREATE POLICY "Contractors manage own sales_team_members"
  ON sales_team_members FOR ALL
  USING (contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true))
  WITH CHECK (contractor_id IN (SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true));
