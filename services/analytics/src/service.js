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

import { getTotalSales, getBestSellers, getSalesPerCategory, getTrendingItems } from './db.js';

function filterBySearch(items, searchQuery, fieldName) {
  if (!searchQuery) return items;
  const query = searchQuery.toLowerCase();
  return items.filter(item => 
    item[fieldName]?.toLowerCase().includes(query)
  );
}

export async function getManagementData(scale = 'week', search = '') {
  if (!['day', 'week', 'month'].includes(scale)) {
    throw new Error('Invalid scale. Must be day, week, or month.');
  }

  const [totalSalesPence, bestSellers, salesPerCategory, trendingItems] = await Promise.all([
    getTotalSales(scale),
    getBestSellers(scale),
    getSalesPerCategory(scale),
    getTrendingItems(scale)
  ]);

  // Transform bestSellers to match frontend: remove units_sold, keep id and name
  let bestSellersFormatted = bestSellers.map(item => ({ id: item.id, name: item.name }));
  bestSellersFormatted = filterBySearch(bestSellersFormatted, search, 'name');

  // salesPerCategory already has category and sales_pence, rename to salesPence
  let salesPerCategoryFormatted = salesPerCategory.map(item => ({ category: item.category, salesPence: item.sales_pence }));
  salesPerCategoryFormatted = filterBySearch(salesPerCategoryFormatted, search, 'category');

  // trendingItems: rank them and include unitsSold
  let trendingItemsFormatted = trendingItems.map((item, index) => ({
    rank: index + 1,
    name: item.name,
    unitsSold: item.units_sold
  }));
  trendingItemsFormatted = filterBySearch(trendingItemsFormatted, search, 'name');

  return {
    totalSalesPence,
    bestSellers: bestSellersFormatted,
    salesPerCategory: salesPerCategoryFormatted,
    trendingItems: trendingItemsFormatted
  };
}
