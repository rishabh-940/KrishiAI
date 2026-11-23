const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { corsOrigin } = require("./config/env");
const rateLimiter = require("./middleware/rateLimiter");
const { requestIdMiddleware, notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const v1Routes = require("./routes");

const app = express();

app.use(helmet());
app.use(cors({ origin: corsOrigin === "*" ? true : corsOrigin }));
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(requestIdMiddleware);
app.use(rateLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "healthy", service: "krishiai-express-gateway", timestamp: new Date().toISOString() });
});

app.use("/api/v1", v1Routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
