/*
This is solely responsible for handling requests within the frontend.
It should only contain functions that handle requests and return responses.

There should not be any business logic in the frontend service, as this service's
only responsibility is to render the frontend. All business logic should be in the
other services and the frontend should make reqests to those via api.js to get the
data it needs to serve HTML to the user.

The only logic that should be in this file is deciding which HTML to serve and catching
API failures to serve error pages.
*/

import { Router } from "express";
import { api } from "./api.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const products = await api.listProducts();

    res.render("home.njk", {
      title: "Supermarket",
      products
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to load products");
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const product = await api.getProduct(req.params.id);

    res.render("product.njk", {
      title: product.name,
      product
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to load product");
  }
});

router.get("/health", async (req, res) => {
  res.status(200).json({ message: "frontend service is healthy." });
});

export default router;