import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

const api = axios.create({
  baseURL,
  timeout: 90000,
});

export function extractErrorMessage(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.detail ||
    err?.message ||
    "Unable to reach KrishiAI server. Make sure Express (5000) and FastAPI (8000) are running."
  );
}

export const krishiApi = {
  // Dashboard
  getDashboardSummary: () => api.get("/dashboard/summary").then((r) => r.data),

  // 1. Plant Disease Vision DL
  getDiseaseModels: () => api.get("/disease/models").then((r) => r.data),
  predictDisease: (file, modelChoice = "ensemble", cropHint = "") => {
    const form = new FormData();
    form.append("image", file);
    form.append("model_choice", modelChoice);
    form.append("crop_hint", cropHint);
    return api
      .post("/disease/predict", form, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data);
  },

  // 2. Government Schemes (AgriParam)
  getSchemesCatalog: (params = {}) => api.get("/schemes/catalog", { params }).then((r) => r.data),
  querySchemes: (payload) => api.post("/schemes/query", payload).then((r) => r.data),

  // 3. Agro-Chemicals Chat (Qwen2.5-3B) & NPK Calculator
  chemicalChat: (payload) => api.post("/chemicals/chat", payload).then((r) => r.data),
  calculateDosage: (payload) => api.post("/chemicals/dosage-calculator", payload).then((r) => r.data),

  // 4. India Mandi Price Forecasting ML
  getPriceMetadata: () => api.get("/prices/metadata").then((r) => r.data),
  predictPrice: (payload) => api.post("/prices/predict", payload).then((r) => r.data),

  // 5. Weather Advisory
  getWeatherForecast: (params) => api.get("/weather/forecast", { params }).then((r) => r.data),

  // 6. Smart Crop Recommender ML
  recommendCrop: (payload) => api.post("/ml/recommend-crop", payload).then((r) => r.data),

  // 7. Indian Crops Encyclopedia
  getCrops: (params = {}) => api.get("/crops", { params }).then((r) => r.data),
  getCropById: (id) => api.get(`/crops/${id}`).then((r) => r.data),

  // 8. Modern Farming & Daily Agri-Tech
  getModernFarming: (params = {}) => api.get("/modern-farming", { params }).then((r) => r.data),
};
