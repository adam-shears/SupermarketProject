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
  const interval = scale === 'day' ? '1 day' : scale === 'week' ? '1 week' : '1 month';
  const query = `
    SELECT COALESCE(SUM(total_pence), 0) as total_sales_pence
    FROM orders
    WHERE created_at >= NOW() - INTERVAL '${interval}'
  `;
  const result = await pool.query(query);
  return result.rows[0].total_sales_pence;
}

export async function getBestSellers(scale) {
  const interval = scale === 'day' ? '1 day' : scale === 'week' ? '1 week' : '1 month';
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
  const interval = scale === 'day' ? '1 day' : scale === 'week' ? '1 week' : '1 month';
  const query = `
    SELECT c.name as category, COALESCE(SUM(oi.line_total_pence), 0) as sales_pence
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id
    LEFT JOIN order_items oi ON p.id = oi.product_id
    LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= NOW() - INTERVAL '${interval}'
    GROUP BY c.id, c.name
    ORDER BY sales_pence DESC
  `;
  const result = await pool.query(query);
  return result.rows;
}

export async function getTrendingItems(scale) {
  // Assuming trending is same as best sellers for now
  return await getBestSellers(scale);
}
