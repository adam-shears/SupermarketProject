/*
This file is responsible for implementing actual business logic for the analytics service.

If data from the db is required, it should be requested from db.js and processed here.
Responsibilities:
- Validation beyond simple checks at the HTTP layer
- Transforming data
- Enforcing constraints
- Anything else beyond simple HTTP checks or SQL queries

This file should not be responsible for:
- Making SQL queries (db.js)
- Handling HTTP requests and responses (index.js and routes.js)
- Any logic that is not directly related to the business logic of the analytics service
*/

// product discounts feature
import { pool } from "./db.js";

export async function getProductsWithDiscounts() {
    const result = await pool.query(`
        SELECT
            p.id,
            p.name,
            p.description,
            pr.price_pence,
            d.id AS discount_id,
            d.code AS discount_code,
            d.name AS discount_name,
            d.type AS discount_type,
            d.value AS discount_value
        FROM products p
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
        WHERE p.listed = true
        ORDER BY p.id
    `);

    return result.rows;
}

export async function getProductById(id) {
    const result = await pool.query(`
        SELECT
            p.id,
            p.name,
            p.description,
            pr.price_pence,
            d.id AS discount_id,
            d.code AS discount_code,
            d.name AS discount_name,
            d.type AS discount_type,
            d.value AS discount_value
        FROM products p
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
        WHERE p.id = $1
          AND p.listed = true
    `, [id]);

    return result.rows[0];
}

export async function getActiveDeals() {
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