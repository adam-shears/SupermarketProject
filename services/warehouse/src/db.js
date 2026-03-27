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

export async function getPickerOrdersRows() {
  const result = await pool.query(`
    SELECT
      o.id AS order_id,
      oi.product_id,
      oi.quantity,
      oi.picked,
      p.name AS product_name,
      COALESCE(p.location_code, 'Unknown') AS location_code,
      COALESCE(c.first_name || ' ' || c.last_name, o.guest_name, 'Guest Customer') AS customer_name,
      COUNT(*) OVER (PARTITION BY o.id) AS item_count
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    LEFT JOIN customers c ON c.id = o.customer_id
    ORDER BY o.id, oi.product_id
  `);

  return result.rows;
}

export async function getSubstituteProducts(productId) {
  const result = await pool.query(
    `
      SELECT id, name
      FROM products
      WHERE id <> $1
      ORDER BY id
      LIMIT 5
    `,
    [productId]
  );

  return result.rows;
}

export async function getOrderItem(orderId, productId) {
  const result = await pool.query(
    `
      SELECT order_id, product_id, quantity, picked
      FROM order_items
      WHERE order_id = $1 AND product_id = $2
    `,
    [orderId, productId]
  );

  return result.rows[0] || null;
}

export async function markItemAsPicked(orderId, productId) {
  const result = await pool.query(
    `
      UPDATE order_items
      SET picked = TRUE
      WHERE order_id = $1 AND product_id = $2
      RETURNING order_id, product_id, quantity, picked
    `,
    [orderId, productId]
  );

  return result.rows[0] || null;
}

export async function insertPickerIssue(orderId, productId, substituteProductId, reason) {
  const result = await pool.query(
    `
      INSERT INTO picker_issues (order_id, product_id, substitute_product_id, reason)
      VALUES ($1, $2, $3, $4)
      RETURNING id, order_id, product_id, substitute_product_id, reason, created_at
    `,
    [orderId, productId, substituteProductId || null, reason]
  );

  return result.rows[0];
}