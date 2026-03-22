/*
This is the entry point for the frontend service.
It should only be responsible for setting up the express server.
All logic related to handling requests should be in routes.js.

This file does not need to be meaningfully altered in any way
that isn't related to setting up the express server.
*/

import express from "express";
import session from "express-session";
import nunjucks from "nunjucks";
import routes from "./routes.js";

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("styles"));
app.use(express.static("scripts"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "default",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});
app.use(express.static("src"));

const env = nunjucks.configure("views", {
  autoescape: true,
  express: app,
});

// Add helper filter for fixed two-decimal prices (e.g. 2.50)
env.addFilter("toFixed", (value, decimals = 2) => {
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toFixed(Number(decimals));
});

app.use("/", routes);

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => console.log(`frontend on :${port} http://localhost:${port}`));
