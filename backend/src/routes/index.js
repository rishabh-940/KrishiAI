const express = require("express");
const upload = require("../middleware/upload");
const aiCtrl = require("../controllers/aiController");
const cropsCtrl = require("../controllers/cropsController");
const farmingCtrl = require("../controllers/farmingController");
const dashCtrl = require("../controllers/dashboardController");

const router = express.Router();

// Dashboard & System Health
router.get("/dashboard/summary", dashCtrl.getDashboardSummary);

// 1. Plant / Crop Disease Prediction (Dual HuggingFace Vision DL)
router.get("/disease/models", aiCtrl.listDiseaseModels);
router.post("/disease/predict", upload.single("image"), aiCtrl.predictDisease);

// 2. Government Schemes & Crop Guidelines (bharatgenai/AgriParam)
router.get("/schemes/catalog", aiCtrl.listSchemesCatalog);
router.post("/schemes/query", aiCtrl.querySchemes);

// 3. Agro-Chemical, Fertilizer & Pesticide Chat (me-nabi/farmer-advisory-hindi-qwen2.5-3b)
router.post("/chemicals/chat", aiCtrl.chemicalChat);
router.post("/chemicals/dosage-calculator", aiCtrl.calculateDosage);

// 4. India Commodity Wise Mandi Price Forecasting ML
router.get("/prices/metadata", aiCtrl.getPriceMetadata);
router.post("/prices/predict", aiCtrl.predictPrice);

// 5. Weather Prediction & Agri Advisory (Open-Meteo Free API)
router.get("/weather/forecast", aiCtrl.getWeather);

// 6. Smart Crop Recommendation ML
router.post("/ml/recommend-crop", aiCtrl.recommendCrop);

// 7. Major Indian Crops Encyclopedia
router.get("/crops", cropsCtrl.listCrops);
router.get("/crops/:id", cropsCtrl.getCropById);

// 8. Modern Farming Types & Daily Agri-Tech Advancements
router.get("/modern-farming", farmingCtrl.getModernFarmingHub);

module.exports = router;
