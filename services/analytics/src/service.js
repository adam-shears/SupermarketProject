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
  getFrequentlyBoughtTogether,
  getListedProductsInStock,
  getPopularProducts,
  getProductContext,
  getRecommendationsFromOrderHistory,
  getSalesPerCategory,
  getTotalSales,
  getTrendingItems,
} from "./db.js";

import { mergeRecommendations } from "./recommendations.js";

export const analyticsDeps = {
  filterBySearch,
  getManagementData,
  getTotalSales,
  getBestSellers,
  getSalesPerCategory,
  getTrendingItems,
  getProductContext,
  getListedProductsInStock,
  getRecommendationsFromOrderHistory,
  getFrequentlyBoughtTogether,
  getPopularProducts,
  mergeRecommendations,
};

export class AnalyticsError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "AnalyticsError";
    this.statusCode = statusCode;
  }
}

function filterBySearch(items, searchQuery, fieldName) {
  if (!searchQuery) return items;
  const query = searchQuery.toLowerCase();
  return items.filter((item) => item[fieldName]?.toLowerCase().includes(query));
}

export async function getRecommendations(input) {
  let productId = input.productId;
  let customerId = input.customerId || null;
  let limit = input.limit || 4;
  let productsInBasket = input.productsInBasket || [];

  if (!productId) {
    throw new AnalyticsError("productId is required for recommendations", 400);
  }

  const productContext = await analyticsDeps.getProductContext(productId);

  if (!productContext || productContext.listed === false) {
    throw new AnalyticsError("Product not found or not listed", 404);
  }

  const queryLimit = limit * 3; // page shows 4 recommendations, so fetch slightly more to allow for filtering based on stock, what the user has in basket, etc

  const availableProducts = await analyticsDeps.getListedProductsInStock();
  const recommendationsFromOrderHistory = await analyticsDeps.getRecommendationsFromOrderHistory(
    customerId,
    productId,
    queryLimit
  );
  const recommendationsFromFrequentlyBoughtTogether =
    await analyticsDeps.getFrequentlyBoughtTogether(productId, queryLimit);

  const trendingItems = await analyticsDeps.getTrendingItems("week");
  const trendingItemsWithinCategory = trendingItems
    .filter((item) => item.category_id === productContext.category_id)
    .map((item) => item.id);

  const generallyPopularProducts = await analyticsDeps.getPopularProducts(queryLimit);

  return analyticsDeps.mergeRecommendations(
    [
      recommendationsFromOrderHistory,
      recommendationsFromFrequentlyBoughtTogether,
      trendingItemsWithinCategory,
      generallyPopularProducts,
    ],
    {
      currentlyViewing: productId,
      productsInBasket: productsInBasket,
      availableProducts: availableProducts,
      limit: limit,
    }
  );
}

export async function getManagementData(scale = "week", search = "") {
  if (!["day", "week", "month"].includes(scale)) {
    throw new Error("Invalid scale. Must be day, week, or month.");
  }

  const [totalSalesPence, bestSellers, salesPerCategory, trendingItems] = await Promise.all([
    analyticsDeps.getTotalSales(scale),
    analyticsDeps.getBestSellers(scale),
    analyticsDeps.getSalesPerCategory(scale),
    analyticsDeps.getTrendingItems(scale),
  ]);

  // Transform bestSellers to match frontend: remove units_sold, keep id and name
  let bestSellersFormatted = bestSellers.map((item) => ({ id: item.id, name: item.name }));
  bestSellersFormatted = analyticsDeps.filterBySearch(bestSellersFormatted, search, "name");

  // salesPerCategory already has category and sales_pence, rename to salesPence
  let salesPerCategoryFormatted = salesPerCategory.map((item) => ({
    category: item.category,
    salesPence: item.sales_pence,
  }));
  salesPerCategoryFormatted = analyticsDeps.filterBySearch(
    salesPerCategoryFormatted,
    search,
    "category"
  );

  let trendingItemsFormatted = trendingItems.map((item, index) => ({
    rank: index + 1,
    name: item.name,
    unitsSold: item.units_sold,
  }));
  trendingItemsFormatted = analyticsDeps.filterBySearch(trendingItemsFormatted, search, "name");

  return {
    totalSalesPence: Number(totalSalesPence || 0),
    bestSellers: bestSellersFormatted,
    salesPerCategory: salesPerCategoryFormatted,
    trendingItems: trendingItemsFormatted,
  };
}