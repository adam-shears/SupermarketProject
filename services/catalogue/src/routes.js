/*
This file is solely response for handling incoming requests to the analytics service.
It should only contain definitions for the API endpoints.
All requests should be delegated to service.js for actual handling. Even if the request is simple,
never call db.js directly from here.

The only logic in this file should be handling incoming requests, validating the request itself,
and sending the response.
Actual validation should be done in service.js.
*/

import { Router } from "express";
import { getProductsWithDiscounts, getActiveDeals } from "./service.js";

const router = Router();

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
        console.error(error);
        res.status(500).json({ message: "failed to get products" });
    }
});

router.get("/deals", async (req, res) => {
    try {
        const deals = await getActiveDeals();
        res.status(200).json(deals);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "failed to get deals" });
    }
});

export default router;
