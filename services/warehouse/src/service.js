/*
This file is responsible for implementing actual business logic for the warehouse service.

If data from the db is required, it should be requested from db.js and processed here.
Responsibilities:
- Validation beyond simple checks at the HTTP layer
- Transforming data
- Enforcing constraints
- Anything else beyond simple HTTP checks or SQL queries
*/


import * as db from "./db.js";

export async function getPickerOrders() {
  const rows = await db.getPickerOrdersRows();
  const ordersMap = new Map();

  for (const row of rows) {
    if (!ordersMap.has(row.order_id)) {
      ordersMap.set(row.order_id, {
        id: row.order_id,
        customer_name: row.customer_name,
        order_info: `${row.item_count} ${row.item_count === 1 ? "item" : "items"} in order`,
        items: [],
      });
    }

    const substitutes = await db.getSubstituteProducts(row.product_id);

    ordersMap.get(row.order_id).items.push({
      product_id: row.product_id,
      product_name: row.product_name,
      quantity: row.quantity,
      location_code: row.location_code,
      picked: row.picked,
      substitutes,
    });
  }

  return Array.from(ordersMap.values());
}

export async function completePickerItem(orderId, productId) {
  if (!orderId || !productId) {
    throw new Error("orderId and productId are required");
  }

  const item = await db.getOrderItem(orderId, productId);
  if (!item) {
    throw new Error("Order item not found");
  }

  const updated = await db.markItemAsPicked(orderId, productId);
  if (!updated) {
    throw new Error("Failed to mark item as picked");
  }

  return {
    message: "Picker item marked as completed",
    item: updated,
  };
}

export async function reportPickerIssue(orderId, productId, payload) {
  if (!orderId || !productId) {
    throw new Error("orderId and productId are required");
  }

  if (!payload?.reason) {
    throw new Error("Reason is required");
  }

  const item = await db.getOrderItem(orderId, productId);
  if (!item) {
    throw new Error("Order item not found");
  }

  const issue = await db.insertPickerIssue(
    orderId,
    productId,
    payload.substituteProductId || null,
    payload.reason
  );

  return {
    message: "Picker issue reported successfully",
    issue,
  };
}