const modernData = require("../data/modernFarming.json");

function getModernFarmingHub(req, res) {
  const { tag = "" } = req.query;
  const tLow = tag.toLowerCase();

  const methods = tLow
    ? modernData.farmingTypes.filter((m) =>
        `${m.title} ${m.category} ${m.summary}`.toLowerCase().includes(tLow)
      )
    : modernData.farmingTypes;

  const advancements = tLow
    ? modernData.dailyAdvancements.filter((a) =>
        `${a.title} ${a.domain} ${a.summary}`.toLowerCase().includes(tLow)
      )
    : modernData.dailyAdvancements;

  res.json({
    status: "success",
    farmingTypes: methods,
    dailyAdvancements: advancements,
  });
}

module.exports = { getModernFarmingHub };
