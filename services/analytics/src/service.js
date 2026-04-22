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

import {
  getBestSellers,
  getSalesPerCategory,
  getTotalSales,
  getTrendingItems,
} from "./db.js";

export const analyticsDeps = {
  filterBySearch,
  getManagementData,
  getTotalSales,
  getBestSellers,
  getSalesPerCategory,
  getTrendingItems,
};

function filterBySearch(items, searchQuery, fieldName) {
  if (!searchQuery) return items;
  const query = searchQuery.toLowerCase();
  return items.filter((item) =>
    String(item[fieldName] || "").toLowerCase().includes(query)
  );
}

export async function getManagementData(scale = "week", search = "") {
  if (!["day", "week", "month"].includes(scale)) {
    throw new Error("Invalid scale. Must be day, week, or month.");
  }

  const [totalSalesPence, bestSellers, salesPerCategory, trendingItems] =
    await Promise.all([
      analyticsDeps.getTotalSales(scale),
      analyticsDeps.getBestSellers(scale),
      analyticsDeps.getSalesPerCategory(scale),
      analyticsDeps.getTrendingItems(scale),
    ]);

  let bestSellersFormatted = bestSellers.map((item) => ({
    id: item.id,
    name: item.name,
  }));
  bestSellersFormatted = analyticsDeps.filterBySearch(
    bestSellersFormatted,
    search,
    "name"
  );

  let salesPerCategoryFormatted = salesPerCategory.map((item) => ({
    category: item.category,
    salesPence: Number(item.sales_pence || 0),
  }));
  salesPerCategoryFormatted = analyticsDeps.filterBySearch(
    salesPerCategoryFormatted,
    search,
    "category"
  );

  let trendingItemsFormatted = trendingItems.map((item, index) => ({
    rank: index + 1,
    name: item.name,
    unitsSold: Number(item.units_sold || 0),
  }));
  trendingItemsFormatted = analyticsDeps.filterBySearch(
    trendingItemsFormatted,
    search,
    "name"
  );

  return {
    totalSalesPence: Number(totalSalesPence || 0),
    bestSellers: bestSellersFormatted,
    salesPerCategory: salesPerCategoryFormatted,
    trendingItems: trendingItemsFormatted,
  };
}