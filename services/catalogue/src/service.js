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
  insertNewDeal,
  selectDealRows,
  selectListedProductByIdWithDiscountRows,
  selectListedProductsWithDiscountRows,
  selectProductsBySearchTerm,
} from "./db.js";

export const catalogueDeps = {
  selectDealRows,
  selectListedProductByIdWithDiscountRows,
  selectListedProductsWithDiscountRows,
  selectProductsBySearchTerm,
  toDiscount,
  mergeProductRows,
  parseProductId,
  insertNewDeal,
  getActiveDeals,
};

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
        category_name: row.category_name,
        price_pence: row.price_pence,
        discounts: [],
      });
    }

    const discount = catalogueDeps.toDiscount(row);
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
  const rows = await catalogueDeps.selectListedProductsWithDiscountRows();
  return catalogueDeps.mergeProductRows(rows);
}

export async function getProductById(id) {
  const productId = catalogueDeps.parseProductId(id);
  const rows = await catalogueDeps.selectListedProductByIdWithDiscountRows(productId);
  const products = catalogueDeps.mergeProductRows(rows);

  if (products.length === 0) {
    throw new CatalogueError("product not found", 404);
  }

  return products[0];
}

export async function getActiveDeals(includeExpired = false) {
  const rows = await catalogueDeps.selectDealRows();
  if (!includeExpired) {
    const now = new Date();
    return rows.filter(
      (row) => row.starts_at <= now && (row.ends_at === null || row.ends_at > now)
    );
  }
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
        startDate: row.starts_at,
        endDate: row.ends_at,
      });
    }

    deals.get(row.discount_id).products.push({
      id: row.product_id,
      name: row.product_name,
    });
  }

  // reorder by end date descending, then start date descending, then id ascending
  let dealArray = Array.from(deals.values());
  dealArray.sort((a, b) => {
    if (a.endDate === null && b.endDate !== null) return -1;
    if (a.endDate !== null && b.endDate === null) return 1;
    if (a.endDate !== b.endDate) return new Date(b.endDate) - new Date(a.endDate);
    if (a.startDate !== b.startDate) return new Date(b.startDate) - new Date(a.startDate);
    return a.id - b.id;
  });

  return dealArray;
}

export async function searchProducts(searchTerm) {
  const term = searchTerm.trim();

  if (term.length < 2) {
    return [];
  }

  const rows = await catalogueDeps.selectProductsBySearchTerm(term);
  return catalogueDeps.mergeProductRows(rows);
}

export async function getProductsByCategoryWithDiscounts() {
  const rows = await catalogueDeps.selectListedProductsWithDiscountRows();
  const products = catalogueDeps.mergeProductRows(rows);

  const categoryMap = new Map();

  for (const product of products) {
    const category = product.category_name || "No Category";
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category).push({
      id: product.id,
      name: product.name,
    });
  }

  return Object.fromEntries(categoryMap);
}

async function getLowestPriceOfProducts(products) {
  let lowestPrice, lowestPriceName;
  let minPrice = Infinity,
    minPriceName = "";
  for (const productId of products) {
    [lowestPrice, lowestPriceName] = await getLowestPriceForProduct(productId);
    if (lowestPrice === null) {
      throw new CatalogueError(`product with id ${productId} not found`, 404);
    }
    if (lowestPrice === 0) {
      return [0, lowestPriceName];
    }
    if (lowestPrice < minPrice) {
      minPrice = lowestPrice;
      minPriceName = lowestPriceName;
    }
  }
  return [minPrice, minPriceName];
}

async function getLowestPriceForProduct(productId) {
  const rows = await catalogueDeps.selectListedProductByIdWithDiscountRows(productId);
  if (rows.length === 0) {
    throw new CatalogueError("product not found", 404);
  }

  const basePrice = rows[0].price_pence;
  let lowestPrice = basePrice;
  let lowestPriceName = rows[0].name;
  for (const row of rows) {
    const discount = catalogueDeps.toDiscount(row);
    if (discount) {
      let discountedPrice;
      if (discount.type === "percentage") {
        discountedPrice = basePrice * (1 - discount.value / 100);
      } else if (discount.type === "fixed") {
        discountedPrice = basePrice - discount.value * 100;
      }
      if (discountedPrice < lowestPrice) {
        lowestPrice = discountedPrice;
      }
    }
  }

  return [lowestPrice, lowestPriceName];
}

export async function createDeal(deal) {
  const code = deal.code;
  const name = deal.name;
  const type = deal.type;
  let value = deal.value;
  const startsAt = deal.startsAt;
  const endsAt = deal.endsAt;
  const products = deal.products || [];

  // presence checks
  if (!name || !type || value === undefined || !startsAt || !endsAt) {
    throw new CatalogueError("missing required fields", 400);
  }
  if (products.length === 0) {
    throw new CatalogueError("at least one product must be included in the deal", 400);
  }

  // value checks
  if (type !== "percentage" && type !== "fixed") {
    throw new CatalogueError("invalid deal type", 400);
  }
  if (type === "percentage" && (value <= 0 || value > 100)) {
    throw new CatalogueError("percentage value must be between 0 and 100", 400);
  }
  if (type === "fixed" && value <= 0) {
    throw new CatalogueError("fixed value must be a positive number", 400);
  }
  const [lowestPrice, lowestPriceName] = await getLowestPriceOfProducts(products);
  if (type === "fixed" && value > lowestPrice / 100) {
    throw new CatalogueError(
      `fixed value cannot be greater than the lowest product price. ${lowestPriceName} has price of £${lowestPrice / 100}`,
      400
    );
  }

  // date checks
  const now = new Date();
  const startsAtDate = new Date(startsAt);
  const endsAtDate = new Date(endsAt);

  if (isNaN(startsAtDate.getTime()) || isNaN(endsAtDate.getTime())) {
    throw new CatalogueError("invalid date format", 400);
  }
  if (startsAtDate >= endsAtDate) {
    throw new CatalogueError("start date cannot be after end date", 400);
  }
  if (endsAtDate <= now) {
    throw new CatalogueError("end date cannot be in the past", 400);
  }

  // code uniqueness check - only if code is provided as it's optional
  if (code) {
    const activeDeals = await catalogueDeps.getActiveDeals();
    const codeExists = activeDeals.some((deal) => deal.code === code);
    if (codeExists) {
      throw new CatalogueError("deal code must be unique", 400);
    }
  }

  const productIds = products.map((id) => {
    const parsedId = Number(id);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw new CatalogueError("product ids must be positive integers", 400);
    }
    return parsedId;
  });

  // transform fixed amount to pence
  if (type === "fixed") {
    value *= 100;
  }
  // drop decimals from value as database expects an integer
  value = Math.floor(value);

  return catalogueDeps.insertNewDeal(code, name, type, value, startsAt, endsAt, productIds);
}
