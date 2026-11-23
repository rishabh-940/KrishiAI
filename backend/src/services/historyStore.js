const fs = require("fs");
const path = require("path");

const STORE_PATH = path.join(__dirname, "..", "data", "activityHistory.json");
const MAX_ITEMS = 50;

function readAll() {
  try {
    if (!fs.existsSync(STORE_PATH)) return [];
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function appendActivity(entry) {
  const items = readAll();
  const record = {
    id: `act_${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  items.unshift(record);
  const trimmed = items.slice(0, MAX_ITEMS);
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(trimmed, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not persist activity history:", err.message);
  }
  return record;
}

module.exports = { readAll, appendActivity };
