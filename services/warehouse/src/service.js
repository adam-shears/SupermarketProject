/*
This file is responsible for implementing actual business logic for the warehouse service.
*/

import { insertStockIssue, selectStockIssues, markStockIssueResolved } from "./db.js";

export class WarehouseError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "WarehouseError";
    this.statusCode = statusCode;
  }
}

export async function reportStockIssue(productId, reporterId, notes = null) {
  if (!Number.isInteger(productId) || productId <= 0) {
    throw new WarehouseError("productId must be a positive integer", 400);
  }

  if (!Number.isInteger(reporterId) || reporterId <= 0) {
    throw new WarehouseError("reporterId must be a positive integer", 400);
  }

  return insertStockIssue(productId, reporterId, notes);
}

export async function listStockIssues(status) {
  if (status && !['resolved', 'unresolved'].includes(status)) {
    throw new WarehouseError("status must be 'resolved' or 'unresolved'", 400);
  }

  return selectStockIssues(status);
}

export async function resolveStockIssue(id) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new WarehouseError("id must be a positive integer", 400);
  }

  const issue = await markStockIssueResolved(id);
  if (!issue) {
    throw new WarehouseError("Stock issue not found", 404);
  }
  return issue;
}
