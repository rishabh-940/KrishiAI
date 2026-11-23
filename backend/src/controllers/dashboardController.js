const aiProxy = require("../services/aiProxyService");
const { readAll } = require("../services/historyStore");
const cropsData = require("../data/indianCrops.json");
const modernData = require("../data/modernFarming.json");

async function getDashboardSummary(_req, res) {
  let aiStatus = { status: "offline", ai_registry: null };
  try {
    aiStatus = await aiProxy.getHealth();
  } catch {
    aiStatus = { status: "unreachable", ai_registry: null };
  }

  const recentActivity = readAll().slice(0, 8);
  res.json({
    status: "success",
    gateway: "KrishiAI Express Gateway v1.0",
    aiService: aiStatus,
    stats: {
      indianCropsCataloged: cropsData.length,
      modernFarmingMethods: modernData.farmingTypes.length,
      agriTechAdvancements: modernData.dailyAdvancements.length,
      pretrainedAiModels: 4,
      trainedMlPipelines: 2,
    },
    recentActivity,
  });
}

module.exports = { getDashboardSummary };
