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
    `
      SELECT
        id,
        email,
        password_hash,
        first_name,
        last_name,
        phone,
        created_at,
        deleted_at
      FROM customers
      WHERE email = $1
        AND deleted_at IS NULL
    `,
    [email]
  );

  return result.rows[0] || null;
}

export async function selectStaffByEmail(email) {
  const result = await pool.query(
    `
      SELECT
        id,
        admin_level,
        email,
        password_hash,
        first_name,
        last_name,
        phone,
        created_at
      FROM staff
      WHERE email = $1
    `,
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

export async function insertNewCustomerWithLoyalty(
  email,
  passwordHash,
  firstName,
  lastName,
  phone,
  tier,
  points
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const customerResult = await client.query(
      `
        INSERT INTO customers (email, password_hash, first_name, last_name, phone, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id, email, first_name, last_name, phone, created_at
      `,
      [email, passwordHash, firstName, lastName, phone]
    );

    const user = customerResult.rows[0];

    await client.query(
      `
        INSERT INTO loyalty_accounts (customer_id, points, tier, created_at)
        VALUES ($1, $2, $3, NOW())
      `,
      [user.id, points, tier]
    );

    await client.query("COMMIT");
    return user;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function insertNewStaff(email, passwordHash, firstName, lastName, phone, adminLevel) {
  const result = await pool.query(
    `
      INSERT INTO staff (email, password_hash, first_name, last_name, phone, admin_level, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, email, first_name, last_name, phone, admin_level, created_at
    `,
    [email, passwordHash, firstName, lastName, phone, adminLevel]
  );

  return result.rows[0];
}

export async function selectAllStaff() {
  const result = await pool.query(
    `
      SELECT
        id,
        admin_level,
        email,
        first_name,
        last_name,
        phone,
        created_at
      FROM staff
      ORDER BY admin_level DESC, created_at ASC
    `
  );

  return result.rows;
}

export async function selectLoyaltyAccountByCustomerId(customerId) {
  const result = await pool.query(
    `
      SELECT id, customer_id, points, tier, created_at
      FROM loyalty_accounts
      WHERE customer_id = $1
    `,
    [customerId]
  );

  return result.rows[0] || null;
}

export async function insertLoyaltyAccount(customerId, tier, points) {
  const result = await pool.query(
    `
      INSERT INTO loyalty_accounts (customer_id, points, tier, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id, customer_id, points, tier, created_at
    `,
    [customerId, points, tier]
  );

  return result.rows[0];
}

export async function updateLoyaltyAccountPoints(loyaltyAccountId, points, tier) {
  const result = await pool.query(
    `
      UPDATE loyalty_accounts
      SET points = $1, tier = $2
      WHERE id = $3
      RETURNING id, customer_id, points, tier, created_at
    `,
    [points, tier, loyaltyAccountId]
  );

  return result.rows[0] || null;
}

export async function insertLoyaltyTransaction(loyaltyAccountId, orderId, type, pointChange) {
  const result = await pool.query(
    `
      INSERT INTO loyalty_transactions (loyalty_account_id, order_id, type, point_change, timestamp)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, loyalty_account_id, order_id, type, point_change, timestamp
    `,
    [loyaltyAccountId, orderId, type, pointChange]
  );

  return result.rows[0];
}

export async function selectLoyaltyTransactionsByAccountId(loyaltyAccountId) {
  const result = await pool.query(
    `
      SELECT id, order_id, type, point_change, timestamp
      FROM loyalty_transactions
      WHERE loyalty_account_id = $1
      ORDER BY timestamp DESC
      LIMIT 20
    `,
    [loyaltyAccountId]
  );

  return result.rows;
}

export async function selectShoppingListByCustomerID(customerID) {
  const result = await pool.query(
    `
      SELECT
        sl.product_id,
        sl.quantity,
        sl.checked,
        p.name,
        p.description,
        c.name AS category_name,
        COALESCE(pr.price_pence, 0) AS price_pence
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
      WHERE customer_id = $3
        AND product_id = $4
      RETURNING product_id, quantity, checked
    `,
    [fields.quantity ?? null, fields.checked ?? null, customerID, productID]
  );

  return result.rows[0] || null;
}

export async function deleteShoppingListItem(customerID, productID) {
  await pool.query(
    `
      DELETE FROM shopping_list_items
      WHERE customer_id = $1
        AND product_id = $2
    `,
    [customerID, productID]
  );
}

export async function selectLoyaltyTierBenefits(tier) {
  const result = await pool.query(
    `
      SELECT *
      FROM loyalty_tier_benefits
      WHERE tier = $1
    `,
    [tier]
  );

  return result.rows[0] || null;
}

export async function selectAllLoyaltyTierBenefits() {
  const result = await pool.query(
    `
      SELECT *
      FROM loyalty_tier_benefits
      ORDER BY points_per_pound DESC
    `
  );

  return result.rows;
}

export async function insertLoyaltyCoupon(
  loyaltyAccountId,
  code,
  discountPercent,
  minSpendPence,
  expiresAt
) {
  const result = await pool.query(
    `
      INSERT INTO loyalty_coupons (
        loyalty_account_id,
        code,
        discount_percent,
        min_spend_pence,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, loyalty_account_id, code, discount_percent, min_spend_pence, expires_at, used_at, created_at
    `,
    [loyaltyAccountId, code, discountPercent, minSpendPence, expiresAt]
  );

  return result.rows[0];
}

export async function selectLoyaltyCouponsByAccountId(loyaltyAccountId) {
  const result = await pool.query(
    `
      SELECT id, code, discount_percent, min_spend_pence, expires_at, used_at, created_at
      FROM loyalty_coupons
      WHERE loyalty_account_id = $1
      ORDER BY created_at DESC
    `,
    [loyaltyAccountId]
  );

  return result.rows;
}

export async function selectUnusedLoyaltyCouponsByAccountId(loyaltyAccountId) {
  const result = await pool.query(
    `
      SELECT id, code, discount_percent, min_spend_pence, expires_at, created_at
      FROM loyalty_coupons
      WHERE loyalty_account_id = $1
        AND used_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
    `,
    [loyaltyAccountId]
  );

  return result.rows;
}

export async function markLoyaltyCouponAsUsed(couponId) {
  const result = await pool.query(
    `
      UPDATE loyalty_coupons
      SET used_at = NOW()
      WHERE id = $1
        AND used_at IS NULL
      RETURNING id, code, discount_percent
    `,
    [couponId]
  );

  return result.rows[0] || null;
}

export async function selectLoyaltyCouponByCode(code) {
  const result = await pool.query(
    `
      SELECT id, loyalty_account_id, code, discount_percent, min_spend_pence, expires_at, used_at, created_at
      FROM loyalty_coupons
      WHERE code = $1
    `,
    [code]
  );

  return result.rows[0] || null;
}

/*
  User Space / My Account functions
*/

export async function selectCustomerAccountById(customerId) {
  const result = await pool.query(
    `
      SELECT
        id,
        email,
        first_name,
        last_name,
        phone,
        created_at
      FROM customers
      WHERE id = $1
        AND deleted_at IS NULL
    `,
    [customerId]
  );

  return result.rows[0] || null;
}

export async function updateCustomerAccountById(customerId, details) {
  const result = await pool.query(
    `
      UPDATE customers
      SET
        first_name = $1,
        last_name = $2,
        phone = $3
      WHERE id = $4
        AND deleted_at IS NULL
      RETURNING
        id,
        email,
        first_name,
        last_name,
        phone,
        created_at
    `,
    [details.firstName, details.lastName, details.phone || null, customerId]
  );

  return result.rows[0] || null;
}

export async function selectCustomerOrdersById(customerId) {
  const result = await pool.query(
    `
      SELECT
        o.id,
        o.status,
        o.subtotal_pence,
        COALESCE(o.discount_pence, 0) AS discount_pence,
        o.total_pence,
        o.created_at,
        COALESCE(SUM(oi.quantity), 0)::int AS item_count
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.customer_id = $1
      GROUP BY
        o.id,
        o.status,
        o.subtotal_pence,
        o.discount_pence,
        o.total_pence,
        o.created_at
      ORDER BY o.created_at DESC
    `,
    [customerId]
  );

  return result.rows;
}

export async function softDeleteCustomerById(customerId) {
  const result = await pool.query(
    `
      UPDATE customers
      SET
        email = 'deleted_user_' || id || '@deleted.local',
        first_name = 'Deleted',
        last_name = 'User',
        phone = NULL,
        deleted_at = NOW()
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING id
    `,
    [customerId]
  );

  return result.rows[0] || null;
}
