BEGIN;

-- Seed a more fleshed-out order history into the real orders/order_items tables.
-- This is demo data for the management and picker flows.

-- Optional cleanup if you want to rerun this seed repeatedly.
-- DELETE FROM order_items WHERE order_id >= 2001;
-- DELETE FROM orders WHERE id >= 2001;

INSERT INTO orders (
    id,
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
) VALUES
    (2001, NULL, 'emma.taylor@example.com',   'Emma Taylor',   447700000001, 'complete', 1988,   0, 1988,   NOW() - INTERVAL '27 days', NOW() - INTERVAL '27 days'),
    (2002, NULL, 'daniel.white@example.com',  'Daniel White',  447700000002, 'complete', 2495, 114, 2381,   NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days'),
    (2003, NULL, 'sophie.hall@example.com',   'Sophie Hall',   447700000003, 'complete', 1846,   0, 1846,   NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days'),
    (2004, NULL, 'luca.martin@example.com',   'Luca Martin',   447700000004, 'complete', 3334, 134, 3200,   NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
    (2005, NULL, 'mia.jones@example.com',     'Mia Jones',     447700000005, 'complete', 2758,   0, 2758,   NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),
    (2006, NULL, 'oliver.reed@example.com',   'Oliver Reed',   447700000006, 'complete', 4121, 191, 3930,   NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days'),
    (2007, NULL, 'ava.morgan@example.com',    'Ava Morgan',    447700000007, 'picking',  2310,   0, 2310,   NOW() - INTERVAL '8 days',  NOW() - INTERVAL '8 days'),
    (2008, NULL, 'leo.walker@example.com',    'Leo Walker',    447700000008, 'pending',  1678,   0, 1678,   NOW() - INTERVAL '6 days',  NOW() - INTERVAL '6 days'),
    (2009, NULL, 'ryan.cooper@example.com',   'Ryan Cooper',   447700000009, 'picking',  2954,  91, 2863,   NOW() - INTERVAL '4 days',  NOW() - INTERVAL '4 days'),
    (2010, NULL, 'mia.scott@example.com',     'Mia Scott',     447700000010, 'pending',  2249,   0, 2249,   NOW() - INTERVAL '3 days',  NOW() - INTERVAL '3 days'),
    (2011, NULL, 'noah.green@example.com',    'Noah Green',    447700000011, 'pending',  3574, 150, 3424,   NOW() - INTERVAL '1 day',   NOW() - INTERVAL '1 day'),
    (2012, NULL, 'emily.king@example.com',    'Emily King',    447700000012, 'pending',  2864,   0, 2864,   NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours');

INSERT INTO order_items (
    order_id,
    product_id,
    quantity,
    price_pence_per_unit,
    line_subtotal_pence,
    line_discount_pence,
    applied_discount_id,
    line_total_pence
) VALUES
    -- 2001
    (
      2001,
      (SELECT id FROM products WHERE name = 'Tesco British Strawberries 400g' LIMIT 1),
      2, 764, 1528, 0, NULL, 1528
    ),
    (
      2001,
      (SELECT id FROM products WHERE name = 'Tesco Bakery Butter Croissants 4 pack' LIMIT 1),
      1, 460, 460, 0, NULL, 460
    ),

    -- 2002
    (
      2002,
      (SELECT id FROM products WHERE name = 'Walkers Ready Salted Crisps 6 pack' LIMIT 1),
      3, 216, 648, 108,
      (SELECT id FROM discounts WHERE code = 'SNACK20' LIMIT 1),
      540
    ),
    (
      2002,
      (SELECT id FROM products WHERE name = 'Coca-Cola Zero Sugar 24x330ml' LIMIT 1),
      2, 480, 960, 0, NULL, 960
    ),
    (
      2002,
      (SELECT id FROM products WHERE name = 'Warburtons Toastie Thick White 800g' LIMIT 1),
      1, 881, 881, 6, NULL, 875
    ),

    -- 2003
    (
      2003,
      (SELECT id FROM products WHERE name = 'Alpro Oat Drink 1L' LIMIT 1),
      1, 974, 974, 0, NULL, 974
    ),
    (
      2003,
      (SELECT id FROM products WHERE name = 'Tesco Free Range Eggs 12 pack' LIMIT 1),
      1, 420, 420, 0, NULL, 420
    ),
    (
      2003,
      (SELECT id FROM products WHERE name = 'Cathedral City Cheddar 350g' LIMIT 1),
      1, 452, 452, 0, NULL, 452
    ),

    -- 2004
    (
      2004,
      (SELECT id FROM products WHERE name = 'Ariel All in One Pods 24 pack' LIMIT 1),
      1, 1341, 1341, 134,
      (SELECT id FROM discounts WHERE code = 'CLEAN10' LIMIT 1),
      1207
    ),
    (
      2004,
      (SELECT id FROM products WHERE name = 'Andrex Gentle Clean Toilet Roll 9 pack' LIMIT 1),
      1, 999, 999, 0, NULL, 999
    ),
    (
      2004,
      (SELECT id FROM products WHERE name = 'Coca-Cola Zero Sugar 24x330ml' LIMIT 1),
      1, 480, 480, 0, NULL, 480
    ),
    (
      2004,
      (SELECT id FROM products WHERE name = 'Tesco Bakery Butter Croissants 4 pack' LIMIT 1),
      1, 648, 648, 0, NULL, 648
    ),

    -- 2005
    (
      2005,
      (SELECT id FROM products WHERE name = 'Haagen Dazs Vanilla 460ml' LIMIT 1),
      2, 894, 1788, 0, NULL, 1788
    ),
    (
      2005,
      (SELECT id FROM products WHERE name = 'Walkers Ready Salted Crisps 6 pack' LIMIT 1),
      2, 216, 432, 0, NULL, 432
    ),
    (
      2005,
      (SELECT id FROM products WHERE name = 'Coca-Cola Zero Sugar 24x330ml' LIMIT 1),
      1, 538, 538, 0, NULL, 538
    ),

    -- 2006
    (
      2006,
      (SELECT id FROM products WHERE name = 'Tesco British Strawberries 400g' LIMIT 1),
      2, 764, 1528, 114,
      (SELECT id FROM discounts WHERE code = 'FRESH10' LIMIT 1),
      1414
    ),
    (
      2006,
      (SELECT id FROM products WHERE name = 'Alpro Oat Drink 1L' LIMIT 1),
      2, 974, 1948, 77,
      (SELECT id FROM discounts WHERE code = 'DRINK8' LIMIT 1),
      1871
    ),
    (
      2006,
      (SELECT id FROM products WHERE name = 'Tesco Bakery Butter Croissants 4 pack' LIMIT 1),
      1, 836, 836, 0, NULL, 836
    ),

    -- 2007
    (
      2007,
      (SELECT id FROM products WHERE name = 'Birds Eye Southern Fried Chicken 710g' LIMIT 1),
      2, 525, 1050, 0, NULL, 1050
    ),
    (
      2007,
      (SELECT id FROM products WHERE name = 'Walkers Ready Salted Crisps 6 pack' LIMIT 1),
      2, 216, 432, 0, NULL, 432
    ),
    (
      2007,
      (SELECT id FROM products WHERE name = 'Coca-Cola Zero Sugar 24x330ml' LIMIT 1),
      1, 828, 828, 0, NULL, 828
    ),

    -- 2008
    (
      2008,
      (SELECT id FROM products WHERE name = 'Tesco Free Range Eggs 12 pack' LIMIT 1),
      2, 420, 840, 0, NULL, 840
    ),
    (
      2008,
      (SELECT id FROM products WHERE name = 'Warburtons Toastie Thick White 800g' LIMIT 1),
      2, 419, 838, 0, NULL, 838
    ),

    -- 2009
    (
      2009,
      (SELECT id FROM products WHERE name = 'Ariel All in One Pods 24 pack' LIMIT 1),
      1, 1341, 1341, 91,
      (SELECT id FROM discounts WHERE code = 'HOME10' LIMIT 1),
      1250
    ),
    (
      2009,
      (SELECT id FROM products WHERE name = 'Andrex Gentle Clean Toilet Roll 9 pack' LIMIT 1),
      1, 999, 999, 0, NULL, 999
    ),
    (
      2009,
      (SELECT id FROM products WHERE name = 'Tesco British Strawberries 400g' LIMIT 1),
      1, 614, 614, 0, NULL, 614
    ),

    -- 2010
    (
      2010,
      (SELECT id FROM products WHERE name = 'Haagen Dazs Vanilla 460ml' LIMIT 1),
      1, 894, 894, 0, NULL, 894
    ),
    (
      2010,
      (SELECT id FROM products WHERE name = 'Tesco Bakery Butter Croissants 4 pack' LIMIT 1),
      2, 460, 920, 0, NULL, 920
    ),
    (
      2010,
      (SELECT id FROM products WHERE name = 'Alpro Oat Drink 1L' LIMIT 1),
      1, 435, 435, 0, NULL, 435
    ),

    -- 2011
    (
      2011,
      (SELECT id FROM products WHERE name = 'Walkers Ready Salted Crisps 6 pack' LIMIT 1),
      4, 216, 864, 86,
      (SELECT id FROM discounts WHERE code = 'SNACK10' LIMIT 1),
      778
    ),
    (
      2011,
      (SELECT id FROM products WHERE name = 'Coca-Cola Zero Sugar 24x330ml' LIMIT 1),
      3, 480, 1440, 0, NULL, 1440
    ),
    (
      2011,
      (SELECT id FROM products WHERE name = 'Birds Eye Southern Fried Chicken 710g' LIMIT 1),
      2, 678, 1356, 64,
      (SELECT id FROM discounts WHERE code = 'MONTH20' LIMIT 1),
      1292
    ),

    -- 2012
    (
      2012,
      (SELECT id FROM products WHERE name = 'Tesco British Strawberries 400g' LIMIT 1),
      2, 764, 1528, 0, NULL, 1528
    ),
    (
      2012,
      (SELECT id FROM products WHERE name = 'Cathedral City Cheddar 350g' LIMIT 1),
      1, 452, 452, 0, NULL, 452
    ),
    (
      2012,
      (SELECT id FROM products WHERE name = 'Tesco Free Range Eggs 12 pack' LIMIT 1),
      1, 420, 420, 0, NULL, 420
    ),
    (
      2012,
      (SELECT id FROM products WHERE name = 'Warburtons Toastie Thick White 800g' LIMIT 1),
      1, 464, 464, 0, NULL, 464
    );

COMMIT;