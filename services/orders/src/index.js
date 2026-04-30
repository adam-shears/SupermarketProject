/*
This is the entry point for the orders service.
It should only be responsible for setting up the express server.
All logic related to handling requests should be in routes.js and all
business logic should be in service.js.

This file does not need to be meaningfully altered in any way
that isn't related to setting up the express server.
*/

import express from "express";
import routes from "./routes.js";

const app = express();

app.use(express.json());

app.use("/", routes);

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => console.log(`orders service on port ${port}`));
