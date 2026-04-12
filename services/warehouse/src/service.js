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

export const warehouseDeps = {
  getPickerOrdersRows: db.getPickerOrdersRows,
  getSubstituteProducts: db.getSubstituteProducts,
  getOrderItem: db.getOrderItem,
  markItemAsPicked: db.markItemAsPicked,
  insertPickerIssue: db.insertPickerIssue,
  resolvePickerIssue: db.resolvePickerIssue,
  applySubstitution: db.applySubstitution,
  getInventoryRows: db.getInventoryRows,
  updateInventoryItem: db.updateInventoryItem,
  insertManagementAlert: db.insertManagementAlert,
  resolveManagementAlertsForIssue: db.resolveManagementAlertsForIssue,
  getManagementIssueRows: db.getManagementIssueRows,
  countUnresolvedIssuesForOrder: db.countUnresolvedIssuesForOrder,
  countUnpickedItemsForOrder: db.countUnpickedItemsForOrder,
  finalisePickerOrder: db.finalisePickerOrder,
};

export async function getPickerOrders() {
  const rows = await warehouseDeps.getPickerOrdersRows();
  const ordersMap = new Map();

  for (const row of rows) {
    if (!ordersMap.has(row.order_id)) {
      ordersMap.set(row.order_id, {
        id: row.order_id,
        status: row.order_status,
        customer_name: row.customer_name,
        order_info: `${row.item_count} ${row.item_count === 1 ? "item" : "items"} in order`,
        items: [],
      });
    }

    const substitutes = await warehouseDeps.getSubstituteProducts(
      row.product_id,
      row.category_name
    );

    ordersMap.get(row.order_id).items.push({
      product_id: row.product_id,
      product_name: row.product_name,
      description: row.product_description,
      category_name: row.category_name,
      quantity: row.quantity,
      location_code: row.location_code,
      stock_quantity: row.stock_quantity,
      picked: row.picked,
      picked_at: row.picked_at,
      substituted_product_id: row.substituted_product_id,
      substituted_product_name: row.substituted_product_name,
      issue: row.issue_id
        ? {
            id: row.issue_id,
            reason: row.issue_reason,
            resolved: row.issue_resolved,
            substitute_product_id: row.issue_substitute_product_id,
            created_at: row.issue_created_at,
          }
        : null,
      substitutes,
    });
  }

  return Array.from(ordersMap.values()).map((order) => ({
    ...order,
    hasUnresolvedIssues: order.items.some((item) => item.issue && !item.issue.resolved),
    hasUnpickedItems: order.items.some((item) => !item.picked),
  }));
}

export async function completePickerItem(orderId, productId) {
  if (!orderId || !productId) {
    throw new Error("orderId and productId are required");
  }

  const item = await warehouseDeps.getOrderItem(orderId, productId);
  if (!item) {
    throw new Error("Order item not found");
  }

  if (item.picked) {
    return {
      message: "Item already marked as picked",
      item,
    };
  }

  const updated = await warehouseDeps.markItemAsPicked(orderId, productId);

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

  const item = await warehouseDeps.getOrderItem(orderId, productId);
  if (!item) {
    throw new Error("Order item not found");
  }

  const issue = await warehouseDeps.insertPickerIssue(
    orderId,
    productId,
    payload.substituteProductId || null,
    payload.reason
  );

  if (payload.substituteProductId) {
    await warehouseDeps.applySubstitution(orderId, productId, payload.substituteProductId);
  }

  await warehouseDeps.insertManagementAlert(
    issue.id,
    orderId,
    productId,
    `Stock issue reported for order ${orderId}, product ${productId}: ${payload.reason}`
  );

  return {
    message: "Picker issue reported successfully",
    issue,
  };
}

export async function resolvePickerIssue(issueId) {
  if (!issueId) {
    throw new Error("issueId is required");
  }

  const updated = await warehouseDeps.resolvePickerIssue(issueId);
  if (!updated) {
    throw new Error("Issue not found");
  }

  await warehouseDeps.resolveManagementAlertsForIssue(issueId);

  return {
    message: "Issue resolved successfully",
    issue: updated,
  };
}

export async function getInventory() {
  return warehouseDeps.getInventoryRows();
}

export async function updateInventory(productId, payload) {
  if (!productId) {
    throw new Error("productId is required");
  }

  const quantity = Number(payload.quantity);
  const locationCode = (payload.locationCode || "").trim();

  if (Number.isNaN(quantity) || quantity < 0) {
    throw new Error("Quantity must be a non-negative number");
  }

  if (!locationCode) {
    throw new Error("Location code is required");
  }

  const updated = await warehouseDeps.updateInventoryItem(productId, quantity, locationCode);

  return {
    message: "Inventory updated successfully",
    item: updated,
  };
}

export async function getManagementIssues() {
  return warehouseDeps.getManagementIssueRows();
}

export async function finaliseOrder(orderId) {
  if (!orderId) {
    throw new Error("orderId is required");
  }

  const openIssues = await warehouseDeps.countUnresolvedIssuesForOrder(orderId);
  if (openIssues > 0) {
    throw new Error("Order cannot be finalised while unresolved stock issues exist");
  }

  const unpickedItems = await warehouseDeps.countUnpickedItemsForOrder(orderId);
  if (unpickedItems > 0) {
    throw new Error("Order cannot be finalised until all items are picked");
  }

  const updatedOrder = await warehouseDeps.finalisePickerOrder(orderId);
  if (!updatedOrder) {
    throw new Error("Order not found");
  }

  return {
    message: "Order finalised successfully",
    order: updatedOrder,
  };
}