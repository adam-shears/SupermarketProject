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
    day: { current: '1 day', previous: '2 day' },
    week: { current: '7 day', previous: '14 day' },
    month: { current: '30 day', previous: '60 day' }
  };
  
  const interval = intervals[scale] || intervals.week;
  
  const query = `
    WITH current_period AS (
      SELECT p.id, p.name, SUM(oi.quantity) as current_units
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE o.created_at >= NOW() - INTERVAL '${interval.current}'
      GROUP BY p.id, p.name
    ),
    previous_period AS (
      SELECT p.id, p.name, SUM(oi.quantity) as previous_units
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE o.created_at >= NOW() - INTERVAL '${interval.previous}'
        AND o.created_at < NOW() - INTERVAL '${interval.current}'
      GROUP BY p.id, p.name
    )
    SELECT 
      cp.id, 
      cp.name, 
      cp.current_units as units_sold,
      COALESCE(ROUND(((cp.current_units - COALESCE(pp.previous_units, 0))::float / NULLIF(pp.previous_units, 0)) * 100, 2), 
        CASE WHEN pp.previous_units IS NULL AND cp.current_units > 0 THEN 999999 ELSE 0 END) as growth_rate
    FROM current_period cp
    LEFT JOIN previous_period pp ON cp.id = pp.id
    WHERE cp.current_units > 0
    ORDER BY growth_rate DESC, units_sold DESC
    LIMIT 3
  `;
  
  const result = await pool.query(query);
  return result.rows;
}
