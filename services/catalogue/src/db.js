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

const PRODUCTS_BASE_SELECT = `
  SELECT
    p.id,
    p.name,
    p.description,
    c.name AS category_name,
    pr.price_pence,
    d.id AS discount_id,
    d.code AS discount_code,
    d.name AS discount_name,
    d.type AS discount_type,
    d.value AS discount_value
  FROM products p
  LEFT JOIN categories c
    ON c.id = p.category_id
  LEFT JOIN prices pr
    ON pr.product_id = p.id
   AND pr.starts_at <= NOW()
   AND (pr.ends_at IS NULL OR pr.ends_at > NOW())
  LEFT JOIN product_discounts pd
    ON p.id = pd.product_id
  LEFT JOIN discounts d
    ON pd.discount_id = d.id
   AND d.active = true
   AND d.starts_at <= NOW()
   AND (d.ends_at IS NULL OR d.ends_at > NOW())
`;

export async function selectListedProductsWithDiscountRows() {
  const result = await pool.query(`
    ${PRODUCTS_BASE_SELECT}
    WHERE p.listed = true
    ORDER BY p.id
  `);

  return result.rows;
}

export async function selectListedProductByIdWithDiscountRows(productId) {
  const result = await pool.query(
    `
      ${PRODUCTS_BASE_SELECT}
      WHERE p.id = $1
        AND p.listed = true
    `,
    [productId],
  );

  return result.rows;
}

export async function selectActiveDealRows() {
  const result = await pool.query(`
    SELECT
      d.id AS discount_id,
      d.code,
      d.name AS discount_name,
      d.type,
      d.value,
      p.id AS product_id,
      p.name AS product_name
    FROM discounts d
    JOIN product_discounts pd
      ON d.id = pd.discount_id
    JOIN products p
      ON pd.product_id = p.id
    WHERE d.active = true
      AND d.starts_at <= NOW()
      AND (d.ends_at IS NULL OR d.ends_at > NOW())
      AND p.listed = true
    ORDER BY d.id, p.id
  `);

  return result.rows;
}

export async function selectProductsBySearchTerm(term) {
  const result = await pool.query(
    `
      SELECT
        p.id,
        p.name,
        p.description,
        c.name AS category_name,
        pr.price_pence,
        d.id AS discount_id,
        d.code AS discount_code,
        d.name AS discount_name,
        d.type AS discount_type,
        d.value AS discount_value
      FROM products p
      LEFT JOIN categories c
        ON c.id = p.category_id
      LEFT JOIN LATERAL (
        SELECT price_pence
        FROM prices
        WHERE product_id = p.id
          AND starts_at <= NOW()
          AND (ends_at IS NULL OR ends_at > NOW())
        ORDER BY starts_at DESC
        LIMIT 1
      ) pr ON true
      LEFT JOIN product_discounts pd ON pd.product_id = p.id
      LEFT JOIN discounts d ON d.id = pd.discount_id
      WHERE p.listed = TRUE
        AND p.name ILIKE $1
      ORDER BY p.name ASC
      LIMIT 8
    `,
    [`%${term}%`]
  );
  return result.rows;
}
