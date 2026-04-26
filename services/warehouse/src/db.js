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

export async function insertStockIssue(productId, reporterId, notes = null) {
  const result = await pool.query(
    `INSERT INTO stock_issues (product_id, reporter_id, notes, status, created_at)
     VALUES ($1, $2, $3, 'unresolved', NOW())
     RETURNING id, product_id, reporter_id, status, notes, created_at, resolved_at`,
    [productId, reporterId, notes]
  );
  return result.rows[0];
}

export async function selectStockIssues(status) {
  if (status && !['resolved', 'unresolved'].includes(status)) {
    throw new Error('Invalid stock issue status');
  }
  const query = status
    ? 'SELECT si.*, p.name AS product_name, s.first_name AS reporter_first_name, s.last_name AS reporter_last_name FROM stock_issues si LEFT JOIN products p ON p.id = si.product_id LEFT JOIN staff s ON s.id = si.reporter_id WHERE si.status = $1 ORDER BY si.created_at DESC'
    : 'SELECT si.*, p.name AS product_name, s.first_name AS reporter_first_name, s.last_name AS reporter_last_name FROM stock_issues si LEFT JOIN products p ON p.id = si.product_id LEFT JOIN staff s ON s.id = si.reporter_id ORDER BY si.created_at DESC';

  const result = status ? await pool.query(query, [status]) : await pool.query(query);
  return result.rows;
}

export async function markStockIssueResolved(id) {
  const result = await pool.query(
    `UPDATE stock_issues
     SET status = 'resolved', resolved_at = NOW()
     WHERE id = $1
     RETURNING id, product_id, reporter_id, status, notes, created_at, resolved_at`,
    [id]
  );
  return result.rows[0] || null;
}
