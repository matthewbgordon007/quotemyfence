-- Add missing colour options for WPC 6' styles: Standard + Triple Top
-- Safe to re-run (uses NOT EXISTS checks).

WITH target_styles AS (
  SELECT
    fs.id AS fence_style_id
  FROM fence_styles fs
  JOIN fence_types ft ON ft.id = fs.fence_type_id
  WHERE ft.name = 'WPC 6'''
    AND fs.style_name IN ('Standard', 'Triple Top')
    AND fs.is_active = true
),
colour_names AS (
  SELECT unnest(
    ARRAY[
      'Walnut',
      'Iron',
      'Ash',
      'Onyx',
      'Mocha',
      'Driftwood'
    ]
  ) AS color_name
)
INSERT INTO colour_options (fence_style_id, color_name, is_active)
SELECT
  ts.fence_style_id,
  cn.color_name,
  true
FROM target_styles ts
CROSS JOIN colour_names cn
WHERE NOT EXISTS (
  SELECT 1
  FROM colour_options co
  WHERE co.fence_style_id = ts.fence_style_id
    AND lower(co.color_name) = lower(cn.color_name)
);
