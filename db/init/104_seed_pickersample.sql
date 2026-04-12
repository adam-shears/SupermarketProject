BEGIN;

INSERT INTO customers (email, password_hash, first_name, last_name, phone, created_at)
VALUES
  ('alice@example.com', 'demo_hash', 'Alice', 'Smith', 1234567890, NOW()),
  ('john@example.com', 'demo_hash', 'John', 'Smith', 1234567891, NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO products (name, description, category_id, listed, created_at)
VALUES
  ('Milk', 'Fresh milk 2L bottle', 2, TRUE, NOW()),
  ('Bread', 'Wholemeal bread loaf', 3, TRUE, NOW()),
  ('Eggs', 'Free range eggs 12 pack', 2, TRUE, NOW()),
  ('Tesco Red Lentils 500g', 'Dry lentils', 1, TRUE, NOW()),
  ('Sainsburys Pork Sausages 8 pack', 'Frozen sausages', 2, TRUE, NOW()),
  ('Morrisons Bakery Blueberry Muffins 4 pack', 'Bakery muffins', 3, TRUE, NOW())
ON CONFLICT DO NOTHING;

UPDATE products SET location_code = 'A-12' WHERE name = 'Milk';
UPDATE products SET location_code = 'B-04' WHERE name = 'Bread';
UPDATE products SET location_code = 'C-03' WHERE name = 'Eggs';
UPDATE products SET location_code = 'D-08' WHERE name = 'Tesco Red Lentils 500g';
UPDATE products SET location_code = 'E-02' WHERE name = 'Sainsburys Pork Sausages 8 pack';
UPDATE products SET location_code = 'F-06' WHERE name = 'Morrisons Bakery Blueberry Muffins 4 pack';

INSERT INTO stock (product_id, quantity_on_hand, quantity_reserved, updated_at)
SELECT id, 20, 0, NOW() FROM products
ON CONFLICT (product_id) DO NOTHING;

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
    NULL, NULL, NULL,
    'pending',
    450, 0, 450,
    NOW(), NOW()
  ),
  (
    (SELECT id FROM customers WHERE email = 'john@example.com'),
    NULL, NULL, NULL,
    'pending',
    300, 0, 300,
    NOW(), NOW()
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
  picked,
  picked_at,
  substituted_product_id
)
VALUES
  (
    (SELECT MIN(id) FROM orders WHERE customer_id = (SELECT id FROM customers WHERE email = 'alice@example.com')),
    (SELECT id FROM products WHERE name = 'Milk'),
    1, 150, 150, 0, NULL, 150, FALSE, NULL, NULL
  ),
  (
    (SELECT MIN(id) FROM orders WHERE customer_id = (SELECT id FROM customers WHERE email = 'alice@example.com')),
    (SELECT id FROM products WHERE name = 'Bread'),
    2, 150, 300, 0, NULL, 300, FALSE, NULL, NULL
  ),
  (
    (SELECT MIN(id) FROM orders WHERE customer_id = (SELECT id FROM customers WHERE email = 'john@example.com')),
    (SELECT id FROM products WHERE name = 'Eggs'),
    1, 300, 300, 0, NULL, 300, FALSE, NULL, NULL
  )
ON CONFLICT (order_id, product_id) DO NOTHING;

COMMIT;