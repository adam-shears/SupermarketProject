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

// --- AUTH QUERIES (Preserved) ---

export async function selectCustomerByEmail(email) {
  const result = await pool.query(
    `SELECT id, email, password_hash, first_name, last_name, phone, created_at FROM customers WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

export async function insertNewCustomer(email, passwordHash, firstName, lastName, phone) {
  const result = await pool.query(
    `INSERT INTO customers (email, password_hash, first_name, last_name, phone, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING id, email, first_name, last_name, phone, created_at`,
    [email, passwordHash, firstName, lastName, phone]
  );
  return result.rows[0];
}

// --- BASKET QUERIES (The Fix) ---

/**
 * Ensures a basket exists for the customer.
 */
export async function getOrCreateBasket(customerId) {
  const existing = await pool.query(`SELECT id FROM baskets WHERE customer_id = $1 LIMIT 1`, [customerId]);
  if (existing.rows.length > 0) return existing.rows[0];

  const result = await pool.query(
    `INSERT INTO baskets (customer_id, saved, created_at, updated_at) 
     VALUES ($1, true, NOW(), NOW()) RETURNING id`, [customerId]
  );
  return result.rows[0];
}

/**
 * FETCHES BASKET WITH METADATA: 
 * Joins with products and prices to ensure the frontend gets 'name' and 'price_pence'.
 */
export async function getBasketItemsWithDetails(basketId) {
  const result = await pool.query(
    `SELECT 
        bi.product_id AS "productId", 
        bi.quantity, 
        p.name, 
        pr.price_pence
     FROM basket_items bi
     JOIN products p ON bi.product_id = p.id
     JOIN prices pr ON pr.product_id = p.id
     WHERE bi.basket_id = $1 
     AND pr.starts_at <= NOW()
     AND (pr.ends_at IS NULL OR pr.ends_at > NOW())
     ORDER BY pr.starts_at DESC`,
    [basketId]
  );

  // Return only the most recent price per product to prevent UI duplication
  const itemsMap = new Map();
  result.rows.forEach(row => {
    if (!itemsMap.has(row.productId)) itemsMap.set(row.productId, row);
  });
  return Array.from(itemsMap.values());
}

/**
 * UPSERT: Adds item or increases quantity if it already exists.
 */
export async function upsertBasketItem(basketId, productId, quantity) {
  return pool.query(
    `INSERT INTO basket_items (basket_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (basket_id, product_id)
     DO UPDATE SET quantity = basket_items.quantity + EXCLUDED.quantity`,
    [basketId, productId, quantity]
  );
}

// --- ORDER QUERIES (Preserved Original Logic) ---

export async function insertOrder(customerId, guestEmail, guestName, guestPhone, status, subtotal, discount, total) {
  const result = await pool.query(
    `INSERT INTO orders (customer_id, guest_email, guest_name, guest_phone, status, subtotal_pence, discount_pence, total_pence, created_at, last_updated)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     RETURNING *`,
    [customerId, guestEmail, guestName, guestPhone, status, subtotal, discount, total]
  );
  return result.rows[0];
}

export async function insertOrderItem(orderId, productId, qty, price, sub, disc, discId, total) {
  return pool.query(
    `INSERT INTO order_items (order_id, product_id, quantity, price_pence_per_unit, line_subtotal_pence, line_discount_pence, applied_discount_id, line_total_pence)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [orderId, productId, qty, price, sub, disc, discId, total]
  );
}