/*
This file is solely response for handling incoming requests to the catalogue service.
It should only contain definitions for the API endpoints.
All requests should be delegated to service.js for actual handling. Even if the request is simple,
never call db.js directly from here.

The only logic in this file should be handling incoming requests, validating the request itself,
and sending the response.
Actual validation should be done in service.js.
*/

import { Router } from "express";
import {
  CatalogueError,
  getActiveDeals,
  getProductById,
  getProductsWithDiscounts,
  searchProducts,
} from "./service.js";

const router = Router();

function sendErrorResponse(res, error, fallbackMessage) {
  if (error instanceof CatalogueError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: fallbackMessage });
}

router.get("/", async (req, res) => {
  res.json({ message: "catalogue service" });
});

router.get("/health", async (req, res) => {
  res.status(200).json({ message: "catalogue service is healthy." });
});

router.get("/products", async (req, res) => {
  try {
    const products = await getProductsWithDiscounts();
    res.status(200).json(products);
  } catch (error) {
    sendErrorResponse(res, error, "failed to get products");
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const product = await getProductById(req.params.id);
    res.status(200).json(product);
  } catch (error) {
    sendErrorResponse(res, error, "failed to get product");
  }
});

router.get("/deals", async (req, res) => {
  try {
    const deals = await getActiveDeals();
    res.status(200).json(deals);
  } catch (error) {
    sendErrorResponse(res, error, "failed to get deals");
  }
});

router.get("/products/search", async (req, res) => {
  try {
    const products = await searchProducts(req.query.q || "");
    res.status(200).json(products);
  } catch (error) {
    sendErrorResponse(res, error, "couldn't search products");
  }
});

export default router;
