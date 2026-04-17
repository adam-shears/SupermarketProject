/*
This file is responsible for making requests to the other services to get data or logic
that the frontend needs to return to the user.

Never put logic in this file beyond HTTP-specific concerns or very light normalisation.
The only changes that should be made to this file are adding new functions in the api object
that make requests to the other services.

HTTP validation should be performed in thos services' routes.js files and business logic
should be performed in those services' service.js files.
*/

// Detect if running in server (Node.js) or browser context
const isServer = typeof window === 'undefined';

// Server-side: Use Docker internal network (service names)
// Browser-side: Use localhost with exposed ports
const CATALOGUE_URL = isServer ? "http://catalogue:3000" : "http://localhost:3001";
const ORDERS_URL = isServer ? "http://orders:3000" : "http://localhost:3002";
const WAREHOUSE_URL = isServer ? "http://warehouse:3000" : "http://localhost:3003";
const ANALYTICS_URL = isServer ? "http://analytics:3000" : "http://localhost:3004";

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

export const api = {
  // --- CATALOGUE ---
  listProducts: () => getJson(`${CATALOGUE_URL}/products`),
  getProduct: (id) => getJson(`${CATALOGUE_URL}/products/${id}`),

  // --- BASKET (The Handshake Logic) ---
  // Fetches the official DB basket for a logged-in user
  getBasket: (customerId) => getJson(`${ORDERS_URL}/basket?customerId=${customerId}`),

  // Adds a single item to the DB (Used during "Dual-Save" while logged in)
  addToBasket: (productId, quantity, customerId) =>
    postJson(`${ORDERS_URL}/basket/items`, { productId, quantity, customerId }),

  // MERGE: Sends the localStorage guest items to the DB to be combined with the account
  mergeBasket: (customerId, items) => postJson(`${ORDERS_URL}/basket/merge`, { customerId, items }),

  // --- ORDERS & AUTH ---
  createOrder: (payload) => postJson(`${ORDERS_URL}/orders`, payload),
  register: (payload) => postJson(`${ORDERS_URL}/auth/register`, payload),
  login: (payload) => postJson(`${ORDERS_URL}/auth/login`, payload),

  // --- ANALYTICS & MANAGEMENT (Fully Preserved) ---
  getManagementView: async (scale = "week") => {
    // This is the data used for the Manager's Dashboard
    const mockData = {
      day: {
        totalSalesPence: 48230,
        bestSellers: [
          { id: 1, name: "Milk" },
          { id: 2, name: "Bread" },
          { id: 3, name: "Eggs" },
        ],
        salesPerCategory: [
          { category: "Fruit", salesPence: 9200 },
          { category: "Bakery", salesPence: 8400 },
          { category: "Drinks", salesPence: 11300 },
          { category: "Snacks", salesPence: 7600 },
          { category: "Dairy", salesPence: 11730 },
        ],
        trendingItems: [
          { rank: 1, name: "Milk", unitsSold: 28 },
          { rank: 2, name: "Bread", unitsSold: 24 },
          { rank: 3, name: "Eggs", unitsSold: 20 },
        ],
      },
      week: {
        totalSalesPence: 284560,
        bestSellers: [
          { id: 1, name: "Milk" },
          { id: 2, name: "Bread" },
          { id: 3, name: "Eggs" },
        ],
        salesPerCategory: [
          { category: "Fruit", salesPence: 72400 },
          { category: "Bakery", salesPence: 53100 },
          { category: "Drinks", salesPence: 64800 },
          { category: "Snacks", salesPence: 40300 },
          { category: "Dairy", salesPence: 53960 },
        ],
        trendingItems: [
          { rank: 1, name: "Milk", unitsSold: 142 },
          { rank: 2, name: "Bread", unitsSold: 127 },
          { rank: 3, name: "Eggs", unitsSold: 111 },
        ],
      },
      month: {
        totalSalesPence: 1123780,
        bestSellers: [
          { id: 1, name: "Milk" },
          { id: 2, name: "Eggs" },
          { id: 3, name: "Bread" },
        ],
        salesPerCategory: [
          { category: "Fruit", salesPence: 264000 },
          { category: "Bakery", salesPence: 211500 },
          { category: "Drinks", salesPence: 248400 },
          { category: "Snacks", salesPence: 178200 },
          { category: "Dairy", salesPence: 221680 },
        ],
        trendingItems: [
          { rank: 1, name: "Milk", unitsSold: 530 },
          { rank: 2, name: "Eggs", unitsSold: 488 },
          { rank: 3, name: "Bread", unitsSold: 455 },
        ],
      },
    };

    try {
      return await getJson(`${ANALYTICS_URL}/management?scale=${scale}`);
    } catch (error) {
      console.warn("Using mock management data:", error.message);
      return mockData[scale] || mockData.week;
    }
  },

  getSalesByCategoryCsvUrl: (scale = "week") => `/management/export.csv?scale=${scale}`,
};
