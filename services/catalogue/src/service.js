/*
This file is responsible for implementing actual business logic for the catalogue service.

If data from the db is required, it should be requested from db.js and processed here.
Responsibilities:
- Validation beyond simple checks at the HTTP layer
- Transforming data
- Enforcing constraints
- Anything else beyond simple HTTP checks or SQL queries

This file should not be responsible for:
- Making SQL queries (db.js)
- Handling HTTP requests and responses (index.js and routes.js)
- Any logic that is not directly related to the business logic of the catalogue service
*/

import {
  selectActiveDealRows,
  selectListedProductByIdWithDiscountRows,
  selectListedProductsWithDiscountRows,
} from "./db.js";

export class CatalogueError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "CatalogueError";
    this.statusCode = statusCode;
  }
}

function toDiscount(row) {
  if (row.discount_id === null) return null;

  return {
    id: row.discount_id,
    code: row.discount_code,
    name: row.discount_name,
    type: row.discount_type,
    value: row.discount_value,
  };
}

function mergeProductRows(rows) {
  const productMap = new Map();

  for (const row of rows) {
    if (!productMap.has(row.id)) {
      productMap.set(row.id, {
        id: row.id,
        name: row.name,
        description: row.description,
        price_pence: row.price_pence,
        discounts: [],
      });
    }

    const discount = toDiscount(row);
    if (discount !== null) {
      const product = productMap.get(row.id);
      const exists = product.discounts.some((item) => item.id === discount.id);
      if (!exists) {
        product.discounts.push(discount);
      }
    }
  }

  return Array.from(productMap.values());
}

function parseProductId(rawId) {
  const productId = Number(rawId);
  const isInteger = Number.isInteger(productId);
  if (!isInteger || productId <= 0) {
    throw new CatalogueError("product id must be a positive integer", 400);
  }

  return productId;
}

export async function getProductsWithDiscounts() {
  const rows = await selectListedProductsWithDiscountRows();
  return mergeProductRows(rows);
}

export async function getProductById(id) {
  const productId = parseProductId(id);
  const rows = await selectListedProductByIdWithDiscountRows(productId);
  const products = mergeProductRows(rows);

  if (products.length === 0) {
    throw new CatalogueError("product not found", 404);
  }

  return products[0];
}

export async function getActiveDeals() {
  const rows = await selectActiveDealRows();
  const deals = new Map();

  for (const row of rows) {
    if (!deals.has(row.discount_id)) {
      deals.set(row.discount_id, {
        id: row.discount_id,
        code: row.code,
        name: row.discount_name,
        type: row.type,
        value: row.value,
        products: [],
      });
    }

    deals.get(row.discount_id).products.push({
      id: row.product_id,
      name: row.product_name,
    });
  }

  return Array.from(deals.values());
}
