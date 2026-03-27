/*
This file is responsible for implementing actual business logic for the warehouse service.

If data from the db is required, it should be requested from db.js and processed here.
Responsibilities:
- Validation beyond simple checks at the HTTP layer
- Transforming data
- Enforcing constraints
- Anything else beyond simple HTTP checks or SQL queries
*/


const mockOrders = [
  {
    id: 101,
    customer_name: "Alice Smith",
    order_info: "2 items in order",
    items: [
      {
        id: 1,
        product_id: 11,
        product_name: "Milk",
        location_code: "A-12",
        picked: false,
        substitutes: [
          { id: 201, name: "Semi-skimmed Milk" },
          { id: 202, name: "Whole Milk" },
        ],
      },
      {
        id: 2,
        product_id: 12,
        product_name: "Bread",
        location_code: "B-04",
        picked: false,
        substitutes: [
          { id: 203, name: "Brown Bread" },
          { id: 204, name: "Seeded Bread" },
        ],
      },
    ],
  },
  {
    id: 102,
    customer_name: "John Smith",
    order_info: "1 item in order",
    items: [
      {
        id: 3,
        product_id: 13,
        product_name: "Eggs",
        location_code: "C-03",
        picked: false,
        substitutes: [
          { id: 205, name: "Free Range Eggs" },
        ],
      },
    ],
  },
];

export async function getPickerOrders() {
  return mockOrders;
}

export async function completePickerItem(orderId, itemId) {
  if (!orderId || !itemId) {
    throw new Error("orderId and itemId are required");
  }

  return {
    message: "Picker item marked as completed",
    orderId: Number(orderId),
    itemId: Number(itemId),
  };
}

export async function reportPickerIssue(orderId, itemId, payload) {
  if (!orderId || !itemId) {
    throw new Error("orderId and itemId are required");
  }

  if (!payload?.reason) {
    throw new Error("Reason is required");
  }

  return {
    message: "Picker issue reported successfully",
    orderId: Number(orderId),
    itemId: Number(itemId),
    reason: payload.reason,
    substituteProductId: payload.substituteProductId
      ? Number(payload.substituteProductId)
      : null,
  };
}