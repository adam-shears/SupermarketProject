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

import { pool } from "./db.js";

function matchesSearch(value, search) {
  return String(value || "").toLowerCase().includes(search);
}

function filterManagementPayload(payload, rawSearch = "") {
  const search = rawSearch.trim().toLowerCase();

  if (!search) {
    return payload;
  }

  return {
    ...payload,
    bestSellers: (payload.bestSellers || []).filter((item) =>
      matchesSearch(item.name, search)
    ),
    salesPerCategory: (payload.salesPerCategory || []).filter((item) =>
      matchesSearch(item.category, search)
    ),
    trendingItems: (payload.trendingItems || []).filter((item) =>
      matchesSearch(item.name, search)
    ),
    staff: (payload.staff || []).filter(
      (item) =>
        matchesSearch(item.name, search) ||
        matchesSearch(item.role, search) ||
        matchesSearch(item.status, search)
    ),
    ordersToAssign: (payload.ordersToAssign || []).filter(
      (item) =>
        matchesSearch(item.id, search) ||
        matchesSearch(item.customer, search) ||
        matchesSearch(item.status, search) ||
        matchesSearch(item.picker, search)
    ),
    promoCodes: (payload.promoCodes || []).filter(
      (item) =>
        matchesSearch(item.code, search) ||
        matchesSearch(item.description, search) ||
        matchesSearch(item.discount, search) ||
        matchesSearch(item.status, search)
    ),
    discounts: (payload.discounts || []).filter(
      (item) =>
        matchesSearch(item.product, search) ||
        matchesSearch(item.category, search) ||
        matchesSearch(item.status, search)
    ),
  };
}

export async function getManagementView(scale = "week", search = "") {
  const result = await pool.query(
    "SELECT payload FROM management_demo_data WHERE scale = $1",
    [scale]
  );

  if (result.rows.length === 0) {
    const error = new Error(`No management demo data found for scale: ${scale}`);
    error.status = 404;
    throw error;
  }

  const payload = result.rows[0].payload;
  return filterManagementPayload(payload, search);
}