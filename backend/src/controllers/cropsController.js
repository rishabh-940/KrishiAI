const cropsData = require("../data/indianCrops.json");

function listCrops(req, res) {
  const { season = "", category = "", search = "" } = req.query;
  const sLow = season.toLowerCase();
  const cLow = category.toLowerCase();
  const qLow = search.toLowerCase();

  const filtered = cropsData.filter((crop) => {
    const matchSeason = !sLow || crop.season.toLowerCase().includes(sLow);
    const matchCat = !cLow || crop.category.toLowerCase().includes(cLow);
    const matchSearch =
      !qLow ||
      crop.name.toLowerCase().includes(qLow) ||
      crop.hindiName.includes(search) ||
      crop.scientificName.toLowerCase().includes(qLow) ||
      crop.majorStates.join(" ").toLowerCase().includes(qLow);
    return matchSeason && matchCat && matchSearch;
  });

  res.json({
    status: "success",
    total: filtered.length,
    crops: filtered,
  });
}

function getCropById(req, res) {
  const crop = cropsData.find((c) => c.id === req.params.id);
  if (!crop) {
    return res.status(404).json({ status: "error", message: "Crop not found in encyclopedia." });
  }
  return res.json({ status: "success", crop });
}

module.exports = { listCrops, getCropById };
