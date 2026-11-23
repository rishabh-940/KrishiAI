const aiProxy = require("../services/aiProxyService");
const { getCache, setCache } = require("../middleware/cache");
const { appendActivity } = require("../services/historyStore");

async function listDiseaseModels(_req, res, next) {
  try {
    const data = await aiProxy.getDiseaseModels();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function predictDisease(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ status: "error", message: "Please upload a plant leaf image." });
    }
    const result = await aiProxy.predictDisease({
      fileBuffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      modelChoice: req.body.model_choice || "ensemble",
      cropHint: req.body.crop_hint || "",
    });
    appendActivity({
      type: "disease_scan",
      title: `${result.top_prediction.crop} — ${result.top_prediction.disease}`,
      summary: `Confidence ${(result.top_prediction.confidence * 100).toFixed(1)}% (${result.treatment.severity})`,
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function listSchemesCatalog(req, res, next) {
  try {
    const data = await aiProxy.getSchemesCatalog(req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function querySchemes(req, res, next) {
  try {
    const result = await aiProxy.querySchemes(req.body);
    appendActivity({
      type: "scheme_query",
      title: `Scheme Advisory: ${req.body.crop || "General"}`,
      summary: req.body.query.slice(0, 90),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function chemicalChat(req, res, next) {
  try {
    const result = await aiProxy.chemicalChat(req.body);
    appendActivity({
      type: "chemical_chat",
      title: `Agro-Chemical Chat (${req.body.crop || "General"})`,
      summary: req.body.message.slice(0, 90),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function calculateDosage(req, res, next) {
  try {
    const result = await aiProxy.calculateDosage(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getPriceMetadata(_req, res, next) {
  try {
    const cached = getCache("mandi_meta");
    if (cached) return res.json(cached);
    const data = await aiProxy.getPriceMetadata();
    setCache("mandi_meta", data, 600000);
    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

async function predictPrice(req, res, next) {
  try {
    const result = await aiProxy.predictPrice(req.body);
    appendActivity({
      type: "price_forecast",
      title: `${result.commodity} (${result.market}, ${result.state})`,
      summary: `Forecast avg Rs. ${result.predicted_avg_modal_price}/Qtl — ${result.market_signal}`,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function recommendCrop(req, res, next) {
  try {
    const result = await aiProxy.recommendCrop(req.body);
    const topCrop = result.recommendations?.[0]?.crop || "Crop";
    appendActivity({
      type: "crop_recommendation",
      title: `Top Recommended Crop: ${topCrop}`,
      summary: `Soil Grade ${result.soil_fertility_grade}`,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getWeather(req, res, next) {
  try {
    const key = `weather_${req.query.city || ""}_${req.query.lat || ""}_${req.query.lon || ""}`;
    const cached = getCache(key);
    if (cached) return res.json(cached);
    const data = await aiProxy.getWeatherForecast(req.query);
    setCache(key, data, 300000);
    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listDiseaseModels,
  predictDisease,
  listSchemesCatalog,
  querySchemes,
  chemicalChat,
  calculateDosage,
  getPriceMetadata,
  predictPrice,
  recommendCrop,
  getWeather,
};
