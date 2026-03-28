BEGIN;

INSERT INTO customers (email, password_hash, first_name, last_name, phone, created_at)
VALUES
  ('alice@example.com', 'demo_hash', 'Alice', 'Smith', 1234567890, NOW()),
  ('john@example.com', 'demo_hash', 'John', 'Smith', 1234567891, NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO products (name, description, category_id, listed, created_at)
VALUES
  ('Milk', 'Fresh milk', 2, TRUE, NOW()),
  ('Bread', 'Wholemeal bread', 3, TRUE, NOW()),
  ('Eggs', 'Free range eggs', 2, TRUE, NOW())
ON CONFLICT DO NOTHING;

UPDATE products SET location_code = 'A-12' WHERE name = 'Milk';
UPDATE products SET location_code = 'B-04' WHERE name = 'Bread';
UPDATE products SET location_code = 'C-03' WHERE name = 'Eggs';

INSERT INTO orders (
  customer_id,
  guest_email,
  guest_name,
  guest_phone,
  status,
  subtotal_pence,
  discount_pence,
  total_pence,
  created_at,
  last_updated
)
VALUES
  (
    (SELECT id FROM customers WHERE email = 'alice@example.com'),
    NULL,
    NULL,
    NULL,
    'pending',
    450,
    0,
    450,
    NOW(),
    NOW()
  ),
  (
    (SELECT id FROM customers WHERE email = 'john@example.com'),
    NULL,
    NULL,
    NULL,
    'pending',
    300,
    0,
    300,
    NOW(),
    NOW()
  );

INSERT INTO order_items (
  order_id,
  product_id,
  quantity,
  price_pence_per_unit,
  line_subtotal_pence,
  line_discount_pence,
  applied_discount_id,
  line_total_pence,
  picked
)
VALUES
  (
    (SELECT MIN(id) FROM orders WHERE customer_id = (SELECT id FROM customers WHERE email = 'alice@example.com')),
    (SELECT id FROM products WHERE name = 'Milk'),
    1,
    150,
    150,
    0,
    NULL,
    150,
    FALSE
  ),
  (
    (SELECT MIN(id) FROM orders WHERE customer_id = (SELECT id FROM customers WHERE email = 'alice@example.com')),
    (SELECT id FROM products WHERE name = 'Bread'),
    2,
    150,
    300,
    0,
    NULL,
    300,
    FALSE
  ),
  (
    (SELECT MIN(id) FROM orders WHERE customer_id = (SELECT id FROM customers WHERE email = 'john@example.com')),
    (SELECT id FROM products WHERE name = 'Eggs'),
    1,
    300,
    300,
    0,
    NULL,
    300,
    FALSE
  )
ON CONFLICT (order_id, product_id) DO NOTHING;

COMMIT;