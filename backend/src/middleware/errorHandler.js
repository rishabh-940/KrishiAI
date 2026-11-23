const crypto = require("crypto");

function requestIdMiddleware(req, res, next) {
  req.requestId = crypto.randomUUID().slice(0, 8);
  res.setHeader("X-Request-Id", req.requestId);
  next();
}

function notFoundHandler(req, res) {
  res.status(404).json({
    status: "error",
    requestId: req.requestId,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || err.response?.status || 500;
  const detail =
    err.response?.data?.detail ||
    err.response?.data?.message ||
    err.message ||
    "Internal server error";

  if (statusCode >= 500) {
    console.error(`[${req.requestId}] Error ${statusCode}:`, detail);
  }

  res.status(statusCode).json({
    status: "error",
    requestId: req.requestId,
    message: typeof detail === "string" ? detail : JSON.stringify(detail),
  });
}

module.exports = { requestIdMiddleware, notFoundHandler, errorHandler };
