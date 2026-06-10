-- Suppliers can read layout drawings attached to material quote requests assigned to them.
DROP POLICY IF EXISTS "Suppliers read layouts on assigned material requests" ON layout_drawings;
CREATE POLICY "Suppliers read layouts on assigned material requests"
  ON layout_drawings FOR SELECT
  USING (
    id IN (
      SELECT layout_drawing_id
      FROM material_quote_requests
      WHERE layout_drawing_id IS NOT NULL
        AND supplier_contractor_id IN (
          SELECT contractor_id FROM users WHERE auth_id = auth.uid() AND is_active = true
        )
    )
  );
