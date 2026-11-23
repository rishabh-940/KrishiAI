const app = require("./app");
const { port, aiServiceUrl } = require("./config/env");

const server = app.listen(port, () => {
  console.log(`KrishiAI Express Gateway running on http://localhost:${port}`);
  console.log(`Connected to Python AI/ML/DL Service at ${aiServiceUrl}`);
});

function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down KrishiAI Express Gateway gracefully...`);
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
