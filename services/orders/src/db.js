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

export async function insertOrder(
  customerId,
  guestEmail,
  guestName,
  guestPhone,
  status,
  subtotalPence,
  discountPence,
  totalPence
) {
  const result = await pool.query(
    `
      INSERT INTO orders (
        customer_id, guest_email, guest_name, guest_phone, status,
        subtotal_pence, discount_pence, total_pence, created_at, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id, customer_id, guest_email, guest_name, guest_phone, status,
                subtotal_pence, discount_pence, total_pence, created_at, last_updated
    `,
    [
      customerId,
      guestEmail,
      guestName,
      guestPhone,
      status,
      subtotalPence,
      discountPence,
      totalPence,
    ]
  );
  return result.rows[0];
}

export async function insertOrderItem(
  orderId,
  productId,
  quantity,
  pricePencePerUnit,
  lineSubtotalPence,
  lineDiscountPence,
  appliedDiscountId,
  lineTotalPence
) {
  const result = await pool.query(
    `
      INSERT INTO order_items (
        order_id, product_id, quantity, price_pence_per_unit,
        line_subtotal_pence, line_discount_pence, applied_discount_id, line_total_pence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [
      orderId,
      productId,
      quantity,
      pricePencePerUnit,
      lineSubtotalPence,
      lineDiscountPence,
      appliedDiscountId,
      lineTotalPence,
    ]
  );
  return result.rows[0];
}

/**
 * Inserts a full order and its items using a Transaction.
 * This ensures data integrity—the order and items are saved together or not at all.
 */
export async function insertFullOrder(orderData, items) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Insert the main Order record
    const orderResult = await client.query(
      `
      INSERT INTO orders (
        customer_id, guest_email, status, 
        subtotal_pence, total_pence, 
        created_at, last_updated
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id
      `,
      [
        orderData.customer_id,
        orderData.guest_email,
        orderData.status || "CONFIRMED",
        orderData.subtotal_pence,
        orderData.total_pence,
      ]
    );

    const orderId = orderResult.rows[0].id;

    // 2. Insert each item into order_items
    const itemPromises = items.map((item) => {
      return client.query(
        `
        INSERT INTO order_items (
          order_id, product_id, quantity, 
          price_pence_per_unit, line_subtotal_pence, line_total_pence
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          orderId,
          item.productId,
          item.quantity,
          item.price_pence,
          item.price_pence * item.quantity,
          item.price_pence * item.quantity,
        ]
      );
    });

    await Promise.all(itemPromises);

    await client.query("COMMIT");
    return orderId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
