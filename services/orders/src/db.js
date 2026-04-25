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
    `SELECT id, email, password_hash, first_name, last_name, phone, created_at FROM customers WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

export async function selectStaffByEmail(email) {
  const result = await pool.query(
    `SELECT id, admin_level, email, password_hash, first_name, last_name, phone, created_at FROM staff WHERE email = $1`,
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

export async function selectShoppingListByCustomerID(customerID) {
  const result = await pool.query(
    `
      SELECT sl.product_id, sl.quantity, sl.checked, p.name, p.description, c.name AS category_name, COALESCE(pr.price_pence, 0) AS price_pence
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
      WHERE customer_id = $3 AND product_id = $4
      RETURNING product_id, quantity, checked
    `,
    [fields.quantity ?? null, fields.checked ?? null, customerID, productID]
  );
  return result.rows[0] || null;
}

export async function deleteShoppingListItem(customerID, productID) {
  await pool.query(
    `
      DELETE FROM shopping_list_items WHERE customer_id = $1 AND product_id = $2
    `,
    [customerID, productID]
  );
}

// ─── Basket ────────────────────────────────────────────────────────────────

export async function selectOrCreateBasket(customerId) {
  // Gets the active basket for this customer, or creates one if none exists
  const existing = await pool.query(
    `SELECT id FROM baskets WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [customerId]
  );
  if (existing.rows[0]) return existing.rows[0];

  const created = await pool.query(
    `INSERT INTO baskets (customer_id, name, saved, created_at, updated_at)
     VALUES ($1, 'default', FALSE, NOW(), NOW())
     RETURNING id`,
    [customerId]
  );
  return created.rows[0];
}

export async function upsertBasketItem(basketId, productId, quantity) {
  const result = await pool.query(
    `INSERT INTO basket_items (basket_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (basket_id, product_id)
     DO UPDATE SET quantity = basket_items.quantity + EXCLUDED.quantity
     RETURNING basket_id, product_id, quantity`,
    [basketId, productId, quantity]
  );
  return result.rows[0];
}

export async function selectBasketWithDetails(basketId) {
  // JOIN with catalogue tables (same DB) to include name and price — this mirrors shopping list pattern
  const result = await pool.query(
    `SELECT
       bi.product_id,
       bi.quantity,
       p.name,
       COALESCE(pr.price_pence, 0) AS price_pence
     FROM basket_items bi
     JOIN products p ON p.id = bi.product_id
     LEFT JOIN LATERAL (
       SELECT price_pence
       FROM prices
       WHERE product_id = p.id
         AND starts_at <= NOW()
         AND (ends_at IS NULL OR ends_at > NOW())
       ORDER BY starts_at DESC
       LIMIT 1
     ) pr ON true
     WHERE bi.basket_id = $1
     ORDER BY p.name ASC`,
    [basketId]
  );
  return result.rows;
}

export async function deleteBasketItem(basketId, productId) {
  await pool.query(
    `DELETE FROM basket_items WHERE basket_id = $1 AND product_id = $2`,
    [basketId, productId]
  );
}

export async function clearBasketItems(basketId) {
  await pool.query(`DELETE FROM basket_items WHERE basket_id = $1`, [basketId]);
}

// ─── Orders ────────────────────────────────────────────────────────────────

export async function insertOrder(customerId, guestEmail, guestName, subtotalPence, totalPence) {
  const result = await pool.query(
    `INSERT INTO orders
       (customer_id, guest_email, guest_name, status, subtotal_pence, discount_pence, total_pence, created_at, last_updated)
     VALUES ($1, $2, $3, 'pending', $4, 0, $5, NOW(), NOW())
     RETURNING id`,
    [customerId, guestEmail, guestName, subtotalPence, totalPence]
  );
  return result.rows[0];
}

export async function insertOrderItems(orderId, items) {
  // Insert all basket items into order_items in a single query
  const values = items.map((item, i) => {
    const base = i * 4;
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
  });
  const params = items.flatMap((item) => [
    orderId,
    item.product_id,
    item.quantity,
    item.price_pence,
  ]);

  await pool.query(
    `INSERT INTO order_items (order_id, product_id, quantity, price_pence_per_unit, line_total_pence, picked)
     SELECT v.order_id, v.product_id, v.quantity, v.price_pence,
            v.quantity * v.price_pence, FALSE
     FROM (VALUES ${values.join(",")}) AS v(order_id, product_id, quantity, price_pence)`,
    params
  );
}
