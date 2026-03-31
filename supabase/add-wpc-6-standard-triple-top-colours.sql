-- Add missing colour options for:
-- 1) WPC 6' + WPC 7' styles: Standard + Triple Top
-- 2) Hybrid Horizontal 6' + 7' styles:
-- 3) Hybrid Vertical 6' + 7' styles:
--    - Standard + Triple Top Standard: White, Adobe, Light Grey, Westport Grey, Dark Grey
--    - Premium + Triple Top Premium: Moonlit, Teak
-- Safe to re-run (uses NOT EXISTS checks).

WITH target_styles AS (
  SELECT
    fs.id AS fence_style_id
  FROM fence_styles fs
  JOIN fence_types ft ON ft.id = fs.fence_type_id
  WHERE ft.name IN ('WPC 6''', 'WPC 7''')
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

WITH hybrid_standard_styles AS (
  SELECT fs.id AS fence_style_id
  FROM fence_styles fs
  JOIN fence_types ft ON ft.id = fs.fence_type_id
  WHERE ft.name IN (
    'Hybrid Horizontal 6''',
    'Hybrid Horizontal 7''',
    'Hybrid Vertical 6''',
    'Hybrid Vertical 7'''
  )
    AND fs.style_name IN ('Standard', 'Triple Top Standard')
    AND fs.is_active = true
),
hybrid_standard_colours AS (
  SELECT unnest(
    ARRAY[
      'White',
      'Adobe',
      'Light Grey',
      'Westport Grey',
      'Dark Grey'
    ]
  ) AS color_name
)
INSERT INTO colour_options (fence_style_id, color_name, is_active)
SELECT
  hs.fence_style_id,
  hc.color_name,
  true
FROM hybrid_standard_styles hs
CROSS JOIN hybrid_standard_colours hc
WHERE NOT EXISTS (
  SELECT 1
  FROM colour_options co
  WHERE co.fence_style_id = hs.fence_style_id
    AND lower(co.color_name) = lower(hc.color_name)
);

WITH hybrid_premium_styles AS (
  SELECT fs.id AS fence_style_id
  FROM fence_styles fs
  JOIN fence_types ft ON ft.id = fs.fence_type_id
  WHERE ft.name IN (
    'Hybrid Horizontal 6''',
    'Hybrid Horizontal 7''',
    'Hybrid Vertical 6''',
    'Hybrid Vertical 7'''
  )
    AND fs.style_name IN ('Premium', 'Triple Top Premium')
    AND fs.is_active = true
),
hybrid_premium_colours AS (
  SELECT unnest(
    ARRAY[
      'Moonlit',
      'Teak'
    ]
  ) AS color_name
)
INSERT INTO colour_options (fence_style_id, color_name, is_active)
SELECT
  hp.fence_style_id,
  hc.color_name,
  true
FROM hybrid_premium_styles hp
CROSS JOIN hybrid_premium_colours hc
WHERE NOT EXISTS (
  SELECT 1
  FROM colour_options co
  WHERE co.fence_style_id = hp.fence_style_id
    AND lower(co.color_name) = lower(hc.color_name)
);
