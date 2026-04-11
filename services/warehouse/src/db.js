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
      oi.picked_at,
      oi.substituted_product_id,
      p.name AS product_name,
      p.description AS product_description,
      c2.name AS category_name,
      COALESCE(p.location_code, 'Unknown') AS location_code,
      COALESCE(s.quantity_on_hand - s.quantity_reserved, 0) AS stock_quantity,
      COALESCE(c.first_name || ' ' || c.last_name, o.guest_name, 'Guest Customer') AS customer_name,
      COUNT(*) OVER (PARTITION BY o.id) AS item_count,
      sp.name AS substituted_product_name,
      pi.id AS issue_id,
      pi.reason AS issue_reason,
      pi.resolved AS issue_resolved,
      pi.substitute_product_id AS issue_substitute_product_id,
      pi.created_at AS issue_created_at
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    LEFT JOIN categories c2 ON c2.id = p.category_id
    LEFT JOIN stock s ON s.product_id = p.id
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN products sp ON sp.id = oi.substituted_product_id
    LEFT JOIN LATERAL (
      SELECT id, reason, resolved, substitute_product_id, created_at
      FROM picker_issues
      WHERE order_id = o.id AND product_id = oi.product_id
      ORDER BY created_at DESC
      LIMIT 1
    ) pi ON TRUE
    ORDER BY o.id, oi.product_id
  `);

  return result.rows;
}

export async function getSubstituteProducts(productId, categoryName) {
  const result = await pool.query(
    `
      SELECT p.id, p.name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id <> $1
        AND p.listed = TRUE
        AND ($2::text IS NULL OR c.name = $2)
      ORDER BY p.id
      LIMIT 5
    `,
    [productId, categoryName || null]
  );

  return result.rows;
}

export async function getOrderItem(orderId, productId) {
  const result = await pool.query(
    `
      SELECT order_id, product_id, quantity, picked, picked_at, substituted_product_id
      FROM order_items
      WHERE order_id = $1 AND product_id = $2
    `,
    [orderId, productId]
  );

  return result.rows[0] || null;
}

export async function markItemAsPicked(orderId, productId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const itemResult = await client.query(
      `
        SELECT order_id, product_id, quantity, picked
        FROM order_items
        WHERE order_id = $1 AND product_id = $2
        FOR UPDATE
      `,
      [orderId, productId]
    );

    const item = itemResult.rows[0];
    if (!item) {
      throw new Error("Order item not found");
    }

    const updatedItemResult = await client.query(
      `
        UPDATE order_items
        SET picked = TRUE,
            picked_at = NOW()
        WHERE order_id = $1 AND product_id = $2
        RETURNING order_id, product_id, quantity, picked, picked_at
      `,
      [orderId, productId]
    );

    await client.query(
      `
        UPDATE stock
        SET quantity_on_hand = GREATEST(quantity_on_hand - $3, 0),
            updated_at = NOW()
        WHERE product_id = $2
      `,
      [orderId, productId, item.quantity]
    );

    await client.query("COMMIT");
    return updatedItemResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function insertPickerIssue(orderId, productId, substituteProductId, reason) {
  const result = await pool.query(
    `
      INSERT INTO picker_issues (order_id, product_id, substitute_product_id, reason)
      VALUES ($1, $2, $3, $4)
      RETURNING id, order_id, product_id, substitute_product_id, reason, resolved, created_at
    `,
    [orderId, productId, substituteProductId || null, reason]
  );

  return result.rows[0];
}

export async function resolvePickerIssue(issueId) {
  const result = await pool.query(
    `
      UPDATE picker_issues
      SET resolved = TRUE,
          resolved_at = NOW()
      WHERE id = $1
      RETURNING id, order_id, product_id, substitute_product_id, reason, resolved, resolved_at
    `,
    [issueId]
  );

  return result.rows[0] || null;
}

export async function applySubstitution(orderId, productId, substituteProductId) {
  const result = await pool.query(
    `
      UPDATE order_items
      SET substituted_product_id = $3
      WHERE order_id = $1 AND product_id = $2
      RETURNING order_id, product_id, substituted_product_id
    `,
    [orderId, productId, substituteProductId]
  );

  return result.rows[0] || null;
}

export async function getInventoryRows() {
  const result = await pool.query(`
    SELECT
      p.id,
      p.name,
      p.description,
      COALESCE(c.name, 'Unknown') AS category_name,
      COALESCE(p.location_code, 'Unknown') AS location_code,
      COALESCE(s.quantity_on_hand - s.quantity_reserved, 0) AS quantity
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN stock s ON s.product_id = p.id
    ORDER BY p.id
  `);

  return result.rows;
}

export async function updateInventoryItem(productId, quantity, locationCode) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        UPDATE products
        SET location_code = $2
        WHERE id = $1
      `,
      [productId, locationCode]
    );

    await client.query(
      `
        INSERT INTO stock (product_id, quantity_on_hand, quantity_reserved, updated_at)
        VALUES ($1, $2, 0, NOW())
        ON CONFLICT (product_id)
        DO UPDATE SET quantity_on_hand = EXCLUDED.quantity_on_hand, updated_at = NOW()
      `,
      [productId, quantity]
    );

    await client.query("COMMIT");
    return { productId: Number(productId), quantity: Number(quantity), locationCode };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}