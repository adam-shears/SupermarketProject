/*
This file is responsible for making requests to the other services to get data or logic
that the frontend needs to return to the user.

Never put logic in this file beyond HTTP-specific concerns or very light normalisation.
The only changes that should be made to this file are adding new functions in the api object
that make requests to the other services.

HTTP validation should be performed in thos services' routes.js files and business logic
should be performed in those services' service.js files.
*/

const CATALOGUE_URL = process.env.CATALOGUE_URL || "http://catalogue:3000";
const ORDERS_URL = process.env.ORDERS_URL || "http://orders:3000";
const WAREHOUSE_URL = process.env.WAREHOUSE_URL || "http://warehouse:3000";
const ANALYTICS_URL = process.env.ANALYTICS_URL || "http://analytics:3000";

async function getJson(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Request failed ${res.status}: ${url}`);
  return data;
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data.message || `Request failed ${res.status}: ${url}`);
  return data;
}

async function patchJson(url, body) {
  const res = await fetch(url, {
    methdod: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.status === 204) {
    return null;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Request failed ${res.status}: ${url}`);
  return data;
}

async function deleteRequest(url) {
  const res = await fetch(url, {
    method: "DELETE"
  });
  if (res.status !== 204 && !res.ok) {
    const data = await res.json();
    throw new Error(data.message || `Request failed ${res.status}: ${url}`);
  }
}

export const api = {
  listProducts: () => getJson(`${CATALOGUE_URL}/products`),
  getProduct: (id) => getJson(`${CATALOGUE_URL}/products/${id}`),
  searchProducts: (term) => getJson(`${CATALOGUE_URL}/products/search?q=${encodeURIComponent(term)}`),

  getBasket: () => getJson(`${ORDERS_URL}/basket`),
  addToBasket: (productId, quantity) =>
    postJson(`${ORDERS_URL}/basket/items`, { productId, quantity }),

  register: (payload) => postJson(`${ORDERS_URL}/auth/register`, payload),
  login: (payload) => postJson(`${ORDERS_URL}/auth/login`, payload),

  getShoppingList: (customerId) => getJson(`${ORDERS_URL}/customers/${customerId}/shopping-list`),
  addShoppingListItem: (customerId, payload) => postJson(`${ORDERS_URL}/customers/${customerId}/shopping-list/items`, payload),
  updateShoppingListItem: (customerId, productId, payload) => patchJson(`${ORDERS_URL}/customers/${customerId}/shopping-list/items/${productId}`, payload),
  deleteShoppingListItem: (customerId, productId) => deleteRequest(`${ORDERS_URL}/customers/${customerId}/shopping-list/items/${productId}`),
};
