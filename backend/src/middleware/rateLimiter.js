const { rateLimitWindowMs, rateLimitMaxRequests } = require("../config/env");

const buckets = new Map();

function rateLimiter(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || "local";
  const now = Date.now();
  const entry = buckets.get(ip) || { count: 0, resetAt: now + rateLimitWindowMs };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + rateLimitWindowMs;
  }

  entry.count += 1;
  buckets.set(ip, entry);

  res.setHeader("X-RateLimit-Limit", rateLimitMaxRequests);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, rateLimitMaxRequests - entry.count));

  if (entry.count > rateLimitMaxRequests) {
    return res.status(429).json({
      status: "error",
      message: "Too many requests. Please wait a moment and try again.",
    });
  }
  return next();
}

module.exports = rateLimiter;
