-- Add workbook-mapped Hybrid Horizontal styles so supplier calculators can map
-- directly to the source spreadsheet families:
--   - Wood Grain WPC
--   - Slatted WPC + PVC
--   - Aluminum
--
-- Safe to re-run. This only inserts missing rows.

WITH hybrid_horizontal_types AS (
  SELECT id
  FROM fence_types
  WHERE name IN ('Hybrid Horizontal 6''', 'Hybrid Horizontal 7''')
    AND is_active = true
),
target_styles AS (
  SELECT
    hht.id AS fence_type_id,
    style_name
  FROM hybrid_horizontal_types hht
  CROSS JOIN (
    SELECT unnest(
      ARRAY[
        'Wood Grain WPC',
        'Slatted WPC + PVC',
        'Aluminum'
      ]
    ) AS style_name
  ) styles
)
INSERT INTO fence_styles (fence_type_id, style_name, is_active, visibility_target)
SELECT
  ts.fence_type_id,
  ts.style_name,
  true,
  'both'
FROM target_styles ts
WHERE NOT EXISTS (
  SELECT 1
  FROM fence_styles fs
  WHERE fs.fence_type_id = ts.fence_type_id
    AND lower(fs.style_name) = lower(ts.style_name)
);

WITH hybrid_horizontal_family_styles AS (
  SELECT
    fs.id AS fence_style_id,
    fs.style_name
  FROM fence_styles fs
  JOIN fence_types ft ON ft.id = fs.fence_type_id
  WHERE ft.name IN ('Hybrid Horizontal 6''', 'Hybrid Horizontal 7''')
    AND fs.style_name IN ('Wood Grain WPC', 'Slatted WPC + PVC')
    AND fs.is_active = true
),
family_colours AS (
  SELECT 'Wood Grain WPC'::text AS style_name, unnest(ARRAY['Mahogany', 'Moonlit', 'Green Teak']) AS color_name
  UNION ALL
  SELECT 'Slatted WPC + PVC'::text AS style_name, unnest(ARRAY['White', 'Adobe', 'Light Grey', 'Westport Grey', 'Dark Grey']) AS color_name
)
INSERT INTO colour_options (fence_style_id, color_name, is_active)
SELECT
  hhfs.fence_style_id,
  fc.color_name,
  true
FROM hybrid_horizontal_family_styles hhfs
JOIN family_colours fc
  ON fc.style_name = hhfs.style_name
WHERE NOT EXISTS (
  SELECT 1
  FROM colour_options co
  WHERE co.fence_style_id = hhfs.fence_style_id
    AND lower(co.color_name) = lower(fc.color_name)
);

-- Note: the workbook has an Aluminum hybrid-horizontal calculator family, but
-- it does not include a color-specific material breakdown tab. No colour rows
-- are seeded for Aluminum until the business-facing colour mapping is defined.
