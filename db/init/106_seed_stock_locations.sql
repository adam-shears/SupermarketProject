BEGIN;

INSERT INTO stock (product_id, quantity_on_hand, quantity_reserved, location_code, updated_at)
SELECT
  p.id,
  20,
  0,
  CHR(65 + ((p.id - 1) % 6)) || '-' || LPAD((((p.id - 1) % 24) + 1)::text, 2, '0'),
  NOW()
FROM products p
ON CONFLICT (product_id)
DO UPDATE SET
  quantity_on_hand = EXCLUDED.quantity_on_hand,
  location_code = EXCLUDED.location_code,
  updated_at = NOW();

COMMIT;