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

export const api = {
  listProducts: () => getJson(`${CATALOGUE_URL}/products`),
  getProduct: (id) => getJson(`${CATALOGUE_URL}/products/${id}`),

  getBasket: () => getJson(`${ORDERS_URL}/basket`),
  addToBasket: (productId, quantity) =>
    postJson(`${ORDERS_URL}/basket/items`, { productId, quantity }),

  register: (payload) => postJson(`${ORDERS_URL}/auth/register`, payload),
  login: (payload) => postJson(`${ORDERS_URL}/auth/login`, payload),
  
  getManagementView: async (scale = "week") => {
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

  getSalesByCategoryCsvUrl: (scale = "week") =>
    `/management/export.csv?scale=${scale}`,
};
