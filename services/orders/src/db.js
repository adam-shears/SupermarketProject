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
