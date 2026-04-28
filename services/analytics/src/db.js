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

export async function getTotalSales(scale) {
  const interval = scale === "day" ? "1 day" : scale === "week" ? "1 week" : "1 month";
  const query = `
    SELECT COALESCE(SUM(total_pence), 0) as total_sales_pence
    FROM orders
    WHERE created_at >= NOW() - INTERVAL '${interval}'
  `;
  const result = await pool.query(query);
  return result.rows[0].total_sales_pence;
}

export async function getBestSellers(scale) {
  const interval = scale === "day" ? "1 day" : scale === "week" ? "1 week" : "1 month";
  const query = `
    SELECT p.id, p.name, SUM(oi.quantity) as units_sold
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN products p ON oi.product_id = p.id
    WHERE o.created_at >= NOW() - INTERVAL '${interval}'
    GROUP BY p.id, p.name
    ORDER BY units_sold DESC
    LIMIT 3
  `;
  const result = await pool.query(query);
  return result.rows;
}

export async function getSalesPerCategory(scale) {
  const interval = scale === "day" ? "1 day" : scale === "week" ? "1 week" : "1 month";
  const query = `
    SELECT c.name as category, COALESCE(SUM(oi.line_total_pence), 0) as sales_pence
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id
    LEFT JOIN order_items oi ON p.id = oi.product_id
    LEFT JOIN orders o ON oi.order_id = o.id
    WHERE o.created_at >= NOW() - INTERVAL '${interval}' OR o.id IS NULL
    GROUP BY c.id, c.name
    ORDER BY sales_pence DESC
  `;
  const result = await pool.query(query);
  return result.rows;
}

export async function getTrendingItems(scale) {
  const intervals = {
    day: { current: "1 day", previous: "2 day" },
    week: { current: "7 day", previous: "14 day" },
    month: { current: "30 day", previous: "60 day" },
  };

  const interval = intervals[scale] || intervals.week;

  const query = `
    WITH current_period AS (
      SELECT p.id, p.name, p.category_id, SUM(oi.quantity) as current_units
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE o.created_at >= NOW() - INTERVAL '${interval.current}'
      GROUP BY p.id, p.name, p.category_id
    ),
    previous_period AS (
      SELECT p.id, p.name, p.category_id, SUM(oi.quantity) as previous_units
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE o.created_at >= NOW() - INTERVAL '${interval.previous}'
        AND o.created_at < NOW() - INTERVAL '${interval.current}'
      GROUP BY p.id, p.name, p.category_id
    )
    SELECT
      cp.id,
      cp.name,
      cp.category_id,
      cp.current_units as units_sold,
      COALESCE(
        ROUND(
          ((cp.current_units - COALESCE(pp.previous_units, 0))::numeric / NULLIF(pp.previous_units, 0)::numeric) * 100,
          2
        ),
        CASE WHEN pp.previous_units IS NULL AND cp.current_units > 0 THEN 999999 ELSE 0 END
      ) as growth_rate
    FROM current_period cp
    LEFT JOIN previous_period pp ON cp.id = pp.id
    WHERE cp.current_units > 0
    ORDER BY growth_rate DESC, units_sold DESC
    LIMIT 3
  `;

  const result = await pool.query(query);
  return result.rows;
}

export async function getProductContext(productId) {
  const result = await pool.query(
    `
    SELECT id, category_id, listed
    FROM products
    WHERE id = $1
    `,
    [productId]
  );

  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0];
}

export async function getListedProductsInStock() {
  const result = await pool.query(`
    SELECT p.id
    FROM products p
    JOIN stock s ON s.product_id = p.id
    WHERE p.listed = TRUE
      AND (s.quantity_on_hand - s.quantity_reserved) > 0
    `);

  return result.rows.map((row) => row.id);
}

export async function getRecommendationsFromOrderHistory(customerId, currentProductId, limit = 4) {
  // where currentProductId is the product the customer is CURRENTLY viewing, i couldnt think of a better name
  const result = await pool.query(
    `
    SELECT oi.product_id AS id, SUM(oi.quantity) AS units_ordered
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.customer_id = $1
      AND oi.product_id != $2
    GROUP BY oi.product_id
    ORDER BY units_ordered DESC
    LIMIT $3
  `,
    [customerId, currentProductId, limit]
  );

  return result.rows.map((row) => row.id);
}

export async function getFrequentlyBoughtTogether(currentProductId, limit = 4) {
  /* count the occurrences of other products being bought in the same order
  this is per order, so does not take quantity into account,
  just whether it was bought in the same order or not */
  const result = await pool.query(
    `
    SELECT oi.product_id AS id, COUNT(*) AS times_bought_together
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.id IN (
      SELECT o.id
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE oi.product_id = $1
    )
    AND oi.product_id != $1
    GROUP BY oi.product_id
    ORDER BY times_bought_together DESC
    LIMIT $2
  `,
    [currentProductId, limit]
  );
  return result.rows.map((row) => row.id);
}

export async function getPopularProducts(limit = 4) {
  // fallback to just get the most popular products overall per HLD in #70
  const result = await pool.query(
    `
    SELECT oi.product_id AS id, SUM(oi.quantity) AS units_ordered
    FROM order_items oi
    GROUP BY oi.product_id
    ORDER BY units_ordered DESC
    LIMIT $1
  `,
    [limit]
  );

  return result.rows.map((row) => row.id);
}
