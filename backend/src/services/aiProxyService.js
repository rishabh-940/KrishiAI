const axios = require("axios");
const FormData = require("form-data");
const { aiServiceUrl } = require("../config/env");

const aiClient = axios.create({
  baseURL: aiServiceUrl,
  timeout: 90000,
});

async function getHealth() {
  const { data } = await aiClient.get("/health", { timeout: 5000 });
  return data;
}

async function getDiseaseModels() {
  const { data } = await aiClient.get("/api/v1/disease/models");
  return data;
}

async function predictDisease({ fileBuffer, originalName, mimeType, modelChoice, cropHint }) {
  const form = new FormData();
  form.append("image", fileBuffer, {
    filename: originalName || "leaf.jpg",
    contentType: mimeType || "image/jpeg",
  });
  form.append("model_choice", modelChoice || "ensemble");
  form.append("crop_hint", cropHint || "");

  const { data } = await aiClient.post("/api/v1/disease/predict", form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
  });
  return data;
}

async function getSchemesCatalog(params) {
  const { data } = await aiClient.get("/api/v1/schemes/catalog", { params });
  return data;
}

async function querySchemes(payload) {
  const { data } = await aiClient.post("/api/v1/schemes/query", payload);
  return data;
}

async function chemicalChat(payload) {
  const { data } = await aiClient.post("/api/v1/chemicals/chat", payload);
  return data;
}

async function calculateDosage(payload) {
  const { data } = await aiClient.post("/api/v1/chemicals/dosage-calculator", payload);
  return data;
}

async function getPriceMetadata() {
  const { data } = await aiClient.get("/api/v1/prices/metadata");
  return data;
}

async function predictPrice(payload) {
  const { data } = await aiClient.post("/api/v1/prices/predict", payload);
  return data;
}

async function recommendCrop(payload) {
  const { data } = await aiClient.post("/api/v1/ml/recommend-crop", payload);
  return data;
}

async function getWeatherForecast(params) {
  const { data } = await aiClient.get("/api/v1/weather/forecast", { params });
  return data;
}

module.exports = {
  getHealth,
  getDiseaseModels,
  predictDisease,
  getSchemesCatalog,
  querySchemes,
  chemicalChat,
  calculateDosage,
  getPriceMetadata,
  predictPrice,
  recommendCrop,
  getWeatherForecast,
};
