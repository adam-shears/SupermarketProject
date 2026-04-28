/*
This file is solely responsible for making requests to the database.
It should only contain functions that make SQL queries and return the
results to service.js for further computation.
It should not contain any logic that is not directly related to making SQL
queries in order to preserve maintainability and separation of concerns.
*/

import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function selectCustomerByEmail(email) {
  const result = await pool.query(
    `
      SELECT
        id,
        email,
        password_hash,
        first_name,
        last_name,
        phone,
        created_at,
        deleted_at
      FROM customers
      WHERE email = $1
        AND deleted_at IS NULL
    `,
    [email]
  );

  return result.rows[0] || null;
}

export async function selectStaffByEmail(email) {
  const result = await pool.query(
    `
      SELECT
        id,
        admin_level,
        email,
        password_hash,
        first_name,
        last_name,
        phone,
        created_at
      FROM staff
      WHERE email = $1
    `,
    [email]
  );

  return result.rows[0] || null;
}

export async function insertNewCustomer(email, passwordHash, firstName, lastName, phone) {
  const result = await pool.query(
    `
      INSERT INTO customers (email, password_hash, first_name, last_name, phone, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, email, first_name, last_name, phone, created_at
    `,
    [email, passwordHash, firstName, lastName, phone]
  );

  return result.rows[0];
}

export async function insertNewStaff(email, passwordHash, firstName, lastName, phone, adminLevel) {
  const result = await pool.query(
    `
      INSERT INTO staff (email, password_hash, first_name, last_name, phone, admin_level, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, email, first_name, last_name, phone, admin_level, created_at
    `,
    [email, passwordHash, firstName, lastName, phone, adminLevel]
  );

  return result.rows[0];
}

export async function selectAllStaff() {
  const result = await pool.query(
    `
      SELECT
        id,
        admin_level,
        email,
        first_name,
        last_name,
        phone,
        created_at
      FROM staff
      ORDER BY admin_level DESC, created_at ASC
    `
  );

  return result.rows;
}

export async function selectShoppingListByCustomerID(customerID) {
  const result = await pool.query(
    `
      SELECT
        sl.product_id,
        sl.quantity,
        sl.checked,
        p.name,
        p.description,
        c.name AS category_name,
        COALESCE(pr.price_pence, 0) AS price_pence
      FROM shopping_list_items sl
      JOIN products p ON p.id = sl.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN LATERAL (
        SELECT price_pence
        FROM prices
        WHERE product_id = p.id
          AND starts_at <= NOW()
          AND (ends_at IS NULL OR ends_at > NOW())
        ORDER BY starts_at DESC
        LIMIT 1
      ) pr ON true
      WHERE sl.customer_id = $1
      ORDER BY sl.created_at ASC
    `,
    [customerID]
  );

  return result.rows;
}

export async function insertShoppingListItem(customerID, productID, quantity) {
  const result = await pool.query(
    `
      INSERT INTO shopping_list_items (customer_id, product_id, quantity, checked, updated_at)
      VALUES ($1, $2, $3, FALSE, NOW())
      ON CONFLICT (customer_id, product_id)
      DO UPDATE SET
        quantity = shopping_list_items.quantity + EXCLUDED.quantity,
        updated_at = NOW()
      RETURNING product_id, quantity, checked
    `,
    [customerID, productID, quantity]
  );

  return result.rows[0];
}

export async function updateShoppingList(customerID, productID, fields) {
  const result = await pool.query(
    `
      UPDATE shopping_list_items
      SET
        quantity = COALESCE($1, quantity),
        checked = COALESCE($2, checked),
        updated_at = NOW()
      WHERE customer_id = $3
        AND product_id = $4
      RETURNING product_id, quantity, checked
    `,
    [fields.quantity ?? null, fields.checked ?? null, customerID, productID]
  );

  return result.rows[0] || null;
}

export async function deleteShoppingListItem(customerID, productID) {
  await pool.query(
    `
      DELETE FROM shopping_list_items
      WHERE customer_id = $1
        AND product_id = $2
    `,
    [customerID, productID]
  );
}

/*
  User Space / My Account functions
*/

export async function selectCustomerAccountById(customerId) {
  const result = await pool.query(
    `
      SELECT
        id,
        email,
        first_name,
        last_name,
        phone,
        created_at
      FROM customers
      WHERE id = $1
        AND deleted_at IS NULL
    `,
    [customerId]
  );

  return result.rows[0] || null;
}

export async function updateCustomerAccountById(customerId, details) {
  const result = await pool.query(
    `
      UPDATE customers
      SET
        first_name = $1,
        last_name = $2,
        phone = $3
      WHERE id = $4
        AND deleted_at IS NULL
      RETURNING
        id,
        email,
        first_name,
        last_name,
        phone,
        created_at
    `,
    [details.firstName, details.lastName, details.phone || null, customerId]
  );

  return result.rows[0] || null;
}

export async function selectCustomerOrdersById(customerId) {
  const result = await pool.query(
    `
      SELECT
        o.id,
        o.status,
        o.subtotal_pence,
        COALESCE(o.discount_pence, 0) AS discount_pence,
        o.total_pence,
        o.created_at,
        COALESCE(SUM(oi.quantity), 0)::int AS item_count
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.customer_id = $1
      GROUP BY
        o.id,
        o.status,
        o.subtotal_pence,
        o.discount_pence,
        o.total_pence,
        o.created_at
      ORDER BY o.created_at DESC
    `,
    [customerId]
  );

  return result.rows;
}

export async function softDeleteCustomerById(customerId) {
  const result = await pool.query(
    `
      UPDATE customers
      SET
        email = 'deleted_user_' || id || '@deleted.local',
        first_name = 'Deleted',
        last_name = 'User',
        phone = NULL,
        deleted_at = NOW()
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING id
    `,
    [customerId]
  );

  return result.rows[0] || null;
}

// Basket queries
export async function selectBasketByCustomerId(customerId) {
  const result = await pool.query(`
    SELECT
      bi.product_id,
      bi.quantity,
      p.name,
      p.description,
      c.name AS category_name,
      COALESCE(pr.price_pence, 0) AS price_pence
    FROM baskets b
    JOIN basket_items bi ON bi.basket_id = b.id
    JOIN products p ON p.id = bi.product_id
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN LATERAL (
      SELECT price_pence
      FROM prices
      WHERE product_id = p.id
        AND starts_at <= NOW()
        AND (ends_at IS NULL OR ends_at > NOW())
      ORDER BY starts_at DESC
      LIMIT 1
    ) pr ON true
    WHERE b.customer_id = $1
      AND b.saved = FALSE
    ORDER BY bi.product_id ASC
  `, [customerId]);

  return result.rows;
}

export async function upsertBasketItem(customerId, productId, quantity) {
  const result = await pool.query(`
    WITH active_basket AS (
      INSERT INTO baskets (customer_id, name, saved, created_at, updated_at)
      VALUES ($1, NULL, FALSE, NOW(), NOW())
      ON CONFLICT (customer_id) WHERE saved = FALSE AND customer_id IS NOT NULL
      DO UPDATE SET updated_at = NOW()
      RETURNING id
    )
    INSERT INTO basket_items (basket_id, product_id, quantity)
    SELECT id, $2, $3 FROM active_basket
    ON CONFLICT (basket_id, product_id)
    DO UPDATE SET quantity = basket_items.quantity + EXCLUDED.quantity
    RETURNING product_id, quantity
  `, [customerId, productId, quantity]);

  return result.rows[0];
}

export async function updateBasketItem(customerId, productId, quantity) {
  const result = await pool.query(`
    UPDATE basket_items bi
    SET quantity = $1
    FROM baskets b
    WHERE b.id = bi.basket_id
      AND b.customer_id = $2
      AND b.saved = FALSE
      AND bi.product_id = $3
    RETURNING bi.product_id, bi.quantity
  `, [quantity, customerId, productId]);

  return result.rows[0] || null;
}

export async function deleteBasketItem(customerId, productId) {
  await pool.query(`
    DELETE FROM basket_items bi
    USING baskets b
    WHERE b.id = bi.basket_id
      AND b.customer_id = $1
      AND b.saved = FALSE
      AND bi.product_id = $2
  `, [customerId, productId]);
}

export async function copyActiveBasketToSaved(customerId, name = null) {
  const result = await pool.query(`
    WITH active_basket AS (
      SELECT id FROM baskets
      WHERE customer_id = $1
        AND saved = FALSE
      LIMIT 1
    ),
    saved_basket AS (
      INSERT INTO baskets (customer_id, name, saved, created_at, updated_at)
      SELECT $1, $2, TRUE, NOW(), NOW()
      FROM active_basket
      WHERE EXISTS (SELECT 1 FROM basket_items bi WHERE bi.basket_id = active_basket.id)
      RETURNING id, customer_id, name, saved, created_at, updated_at
    ),
    copied_items AS (
      INSERT INTO basket_items (basket_id, product_id, quantity)
      SELECT
        saved_basket.id,
        bi.product_id,
        bi.quantity
      FROM saved_basket
      JOIN active_basket ON true
      JOIN basket_items bi ON bi.basket_id = active_basket.id
      RETURNING product_id, quantity
    )
    SELECT sb.id, sb.name, sb.saved, sb.created_at, sb.updated_at, COUNT(ci.product_id) AS item_count
    FROM saved_basket sb
    LEFT JOIN copied_items ci ON TRUE
    GROUP BY sb.id, sb.name, sb.saved, sb.created_at, sb.updated_at
  `, [customerId, name]);

  return result.rows[0] || null;
}

export async function selectSavedBasketsByCustomerId(customerId) {
  const result = await pool.query(`
    SELECT
      b.id AS basket_id,
      b.name AS basket_name,
      b.created_at,
      b.updated_at,
      bi.product_id,
      bi.quantity,
      p.name AS product_name,
      COALESCE(pr.price_pence, 0) AS price_pence
    FROM baskets b
    LEFT JOIN basket_items bi ON bi.basket_id = b.id
    LEFT JOIN products p ON p.id = bi.product_id
    LEFT JOIN LATERAL (
      SELECT price_pence
      FROM prices
      WHERE product_id = bi.product_id
        AND starts_at <= NOW()
        AND (ends_at IS NULL OR ends_at > NOW())
      ORDER BY starts_at DESC
      LIMIT 1
    ) pr ON true
    WHERE b.customer_id = $1
      AND b.saved = TRUE
    ORDER BY b.updated_at DESC
  `, [customerId]);

  return result.rows;
}
