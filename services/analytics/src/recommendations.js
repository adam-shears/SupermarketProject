/* This file is responsible for implementing algorithmic recommendations.

All functions are called from service.js and should be pure functions that take in data and return transformed data.

Responsibilities:
- Implementing recommendation algorithms
- Transforming data for recommendations

This file should not be responsible for:
- Making SQL queries (db.js)
- Handling HTTP requests and responses (routes.js)
- Any logic that is not directly related to the recommendation algorithms
*/

export function filterRecommendations(recommendations, constraints) {
  const basket = new Set(constraints.productsInBasket || []);
  const available = new Set(constraints.availableProducts || []);
  const currentlyViewing = constraints.currentlyViewing;
  const limit = constraints.limit || 4;
  const seen = new Set();
  const filtered = [];

  for (const product of recommendations) {
    if (seen.has(product)) continue;
    if (product === currentlyViewing) continue;
    if (basket.has(product)) continue;
    if (!available.has(product)) continue;

    seen.add(product);
    filtered.push(product);
    if (filtered.length >= limit) break;
  }

  return filtered;
}

export async function mergeRecommendations(recommendations, constraints) {
  const merged = [];

  for (const productList of recommendations) {
    const filtered = filterRecommendations(productList, constraints);
    merged.push(...filtered);

    if (merged.length >= constraints.limit) break;
  }

  return merged.slice(0, constraints.limit);
}
