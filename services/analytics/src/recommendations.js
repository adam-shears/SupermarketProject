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
  const basket = new Set((constraints.productsInBasket || []).map(Number));
  const available = new Set((constraints.availableProducts || []).map(Number));
  const currentlyViewing = Number(constraints.currentlyViewing);
  const limit = constraints.limit || 4;
  const seen = constraints.seen || new Set();
  const filtered = [];

  for (const candidate of recommendations || []) {
    const product = Number(candidate);

    if (!Number.isInteger(product) || product <= 0) continue;
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
  const seen = new Set();

  for (const productList of recommendations) {
    const filtered = filterRecommendations(productList, { ...constraints, seen });
    merged.push(...filtered);

    if (merged.length >= constraints.limit) break;
  }

  return merged.slice(0, constraints.limit);
}
