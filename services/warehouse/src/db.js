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

export async function assignPickerToOrder(orderId, pickerId) {
  const result = await pool.query(`
    UPDATE orders
    SET assigned_picker_id = $1,
        assigned_at = NOW(),
        last_updated = NOW()
    WHERE id = $2 AND status = 'pending'
    RETURNING id, assigned_picker_id, assigned_at
  `, [pickerId, orderId]);

  return result.rows[0] || null;
}

export async function getPendingOrders() {
  const result = await pool.query(`
    SELECT
      o.id,
      o.status,
      o.assigned_picker_id,
      COALESCE(c.first_name || ' ' || c.last_name, o.guest_name, 'Guest Customer') AS customer
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.status = 'pending'
    ORDER BY o.created_at ASC
  `);

  return result.rows;
}

export async function getPickerOrdersRows(pickerId) {
  let pickerSQL = "";
  if (pickerId) {
    pickerSQL = `
      AND o.assigned_picker_id = ${pickerId}
    `;
  }

  const result = await pool.query(`
    SELECT
      o.id AS order_id,
      o.status AS order_status,
      oi.product_id,
      oi.quantity,
      oi.picked,
      oi.picked_at,
      oi.substituted_product_id,
      p.name AS product_name,
      p.description AS product_description,
      c2.name AS category_name,
      COALESCE(s.location_code, 'Unknown') AS location_code,
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
    WHERE o.status IN ('pending', 'picking')
    ${pickerSQL}
    ORDER BY o.id, oi.product_id
  `);

  return result.rows;
}

export async function getSubstituteProducts(productId, categoryName) {
  const sameCategoryResult = await pool.query(
    `
      SELECT
        p.id,
        p.name,
        COALESCE(s.location_code, 'Unknown') AS location_code
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stock s ON s.product_id = p.id
      WHERE p.id <> $1
        AND p.listed = TRUE
        AND ($2::text IS NULL OR c.name = $2)
      ORDER BY p.id
      LIMIT 15
    `,
    [productId, categoryName || null]
  );

  if (sameCategoryResult.rows.length >= 8) {
    return sameCategoryResult.rows;
  }

  const existingIds = sameCategoryResult.rows.map((row) => row.id);

  const fallbackResult = await pool.query(
    `
      SELECT
        p.id,
        p.name,
        COALESCE(s.location_code, 'Unknown') AS location_code
      FROM products p
      LEFT JOIN stock s ON s.product_id = p.id
      WHERE p.id <> $1
        AND p.listed = TRUE
        AND NOT (p.id = ANY($2::int[]))
      ORDER BY p.id
      LIMIT $3
    `,
    [productId, existingIds.length ? existingIds : [0], 15 - sameCategoryResult.rows.length]
  );

  return [...sameCategoryResult.rows, ...fallbackResult.rows];
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
        SET quantity_on_hand = GREATEST(quantity_on_hand - $2, 0),
            updated_at = NOW()
        WHERE product_id = $1
      `,
      [productId, item.quantity]
    );

    await client.query(
      `
        UPDATE orders
        SET status = 'picking',
            last_updated = NOW()
        WHERE id = $1 AND status = 'pending'
      `,
      [orderId]
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
      COALESCE(s.location_code, 'Unknown') AS location_code,
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
        INSERT INTO stock (product_id, quantity_on_hand, quantity_reserved, location_code, updated_at)
        VALUES ($1, $2, 0, $3, NOW())
        ON CONFLICT (product_id)
        DO UPDATE SET
          quantity_on_hand = EXCLUDED.quantity_on_hand,
          location_code = EXCLUDED.location_code,
          updated_at = NOW()
      `,
      [productId, quantity, locationCode]
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

export async function insertManagementAlert(issueId, orderId, productId, message) {
  const result = await pool.query(
    `
      INSERT INTO management_alerts (issue_id, order_id, product_id, message)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [issueId, orderId, productId, message]
  );

  return result.rows[0];
}

export async function resolveManagementAlertsForIssue(issueId) {
  const result = await pool.query(
    `
      UPDATE management_alerts
      SET resolved = TRUE,
          resolved_at = NOW()
      WHERE issue_id = $1
      RETURNING *
    `,
    [issueId]
  );

  return result.rows;
}

export async function getManagementIssueRows() {
  const result = await pool.query(`
    SELECT
      pi.id AS issue_id,
      pi.order_id,
      pi.product_id,
      pi.reason,
      pi.resolved,
      pi.created_at,
      p.name AS product_name,
      COALESCE(s.location_code, 'Unknown') AS location_code,
      COALESCE(c.first_name || ' ' || c.last_name, o.guest_name, 'Guest Customer') AS customer_name,
      ma.id AS alert_id,
      ma.message AS alert_message,
      ma.created_at AS alert_created_at,
      ma.resolved AS alert_resolved
    FROM picker_issues pi
    JOIN orders o ON o.id = pi.order_id
    JOIN products p ON p.id = pi.product_id
    LEFT JOIN stock s ON s.product_id = p.id
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN management_alerts ma ON ma.issue_id = pi.id
    ORDER BY pi.resolved ASC, pi.created_at DESC
  `);

  return result.rows;
}

export async function countUnresolvedIssuesForOrder(orderId) {
  const result = await pool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM picker_issues
      WHERE order_id = $1 AND resolved = FALSE
    `,
    [orderId]
  );

  return result.rows[0].total;
}

export async function countUnpickedItemsForOrder(orderId) {
  const result = await pool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM order_items
      WHERE order_id = $1 AND picked = FALSE
    `,
    [orderId]
  );

  return result.rows[0].total;
}

export async function finalisePickerOrder(orderId) {
  const result = await pool.query(
    `
      UPDATE orders
      SET status = 'picked',
          last_updated = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [orderId]
  );

  return result.rows[0] || null;
}
