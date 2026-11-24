import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScanLine, Landmark, FlaskConical, TrendingUp, CloudSun, Sprout, BookOpen, Cpu } from "lucide-react";
import { krishiApi, extractErrorMessage } from "../services/api";
import { LoadingSpinner, ErrorBanner } from "../components/Feedback";

const QUICK_MODULES = [
  { id: "disease", titleKey: "dashboard.modules.disease.title", descKey: "dashboard.modules.disease.desc", defaultTitle: "Plant Disease AI", defaultDesc: "Dual HuggingFace Vision DL models (94 + 38 classes)", icon: ScanLine },
  { id: "schemes", titleKey: "dashboard.modules.schemes.title", descKey: "dashboard.modules.schemes.desc", defaultTitle: "Govt Schemes ", defaultDesc: "BharatGen AgriParam LLM + PM-KISAN / PMFBY / KCC", icon: Landmark },
  { id: "chemicals", titleKey: "dashboard.modules.chemicals.title", descKey: "dashboard.modules.chemicals.desc", defaultTitle: "Chemicals & NPK Chat", defaultDesc: "Hindi/English Qwen2.5-3B + Fertilizer Bag Calculator", icon: FlaskConical },
  { id: "prices", titleKey: "dashboard.modules.prices.title", descKey: "dashboard.modules.prices.desc", defaultTitle: "Mandi Price Forecast", defaultDesc: "India APMC Mandi Time-Series ML Forecaster", icon: TrendingUp },
  { id: "recommender", titleKey: "dashboard.modules.recommender.title", descKey: "dashboard.modules.recommender.desc", defaultTitle: "Smart Crop ML", defaultDesc: "Soil N-P-K + Climate Crop Recommender & Profit", icon: Sprout },
  { id: "weather", titleKey: "dashboard.modules.weather.title", descKey: "dashboard.modules.weather.desc", defaultTitle: "Weather & Spray Window", defaultDesc: "Live Open-Meteo 7-day forecast + Pest/Irrigation alerts", icon: CloudSun },
  { id: "encyclopedia", titleKey: "dashboard.modules.encyclopedia.title", descKey: "dashboard.modules.encyclopedia.desc", defaultTitle: "Indian Crops Guide", defaultDesc: "Complete cultivation methods for 12+ Indian crops", icon: BookOpen },
  { id: "modern", titleKey: "dashboard.modules.modern.title", descKey: "dashboard.modules.modern.desc", defaultTitle: "Modern Farming & Tech", defaultDesc: "Hydroponics, Drones, IoT, Polyhouse, Solar & ZBNF", icon: Cpu },
];

export default function Dashboard({ onNavigate }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    krishiApi
      .getDashboardSummary()
      .then(setData)
      .catch((e) => setError(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner label={t("dashboard.loading", "Loading KrishiAI command center...")} />;

  const stats = data?.stats || {};
  const registry = data?.aiService?.ai_registry?.registered_models || {};

  return (
    <div className="grid" style={{ gap: 22 }}>
      <ErrorBanner message={error} />

      {/* Hero Banner — Farm Overview & Smart Insights */}
      <div className="page-hero-banner">
        <img
          src="/images/dashboard-banner.png"
          alt="Farm Overview & Smart Insights"
          className="page-hero-img"
        />
      </div>

      <div className="grid grid-4">
        <div className="card">
          <div className="kpi-label">{t("dashboard.kpiHfModels", "Pretrained HF AI/DL Models")}</div>
          <div className="kpi-value">{stats.pretrainedAiModels ?? 4}</div>
          <span className="badge">{t("dashboard.kpiHfDesc", "Vision + Bilingual LLMs")}</span>
        </div>
        <div className="card">
          <div className="kpi-label">{t("dashboard.kpiMlPipelines", "Trained ML Pipelines")}</div>
          <div className="kpi-value">{stats.trainedMlPipelines ?? 2}</div>
          <span className="badge blue">{t("dashboard.kpiMlDesc", "Mandi Forecast + Crop ML")}</span>
        </div>
        <div className="card">
          <div className="kpi-label">{t("dashboard.kpiDiseases", "Disease Classes Recognized")}</div>
          <div className="kpi-value">{stats.indianCropsCataloged ?? 94}</div>
          <span className="badge amber">{t("dashboard.kpiDiseasesDesc", "94 Crops & Vegetables")}</span>
        </div>
        <div className="card">
          <div className="kpi-label">{t("dashboard.kpiSchemes", "Govt Schemes Indexed")}</div>
          <div className="kpi-value">
            {(stats.modernFarmingMethods ?? 8) + (stats.agriTechAdvancements ?? 8)}
          </div>
          <span className="badge">{t("dashboard.kpiSchemesDesc", "PM-KISAN, PMFBY, KCC & more")}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">{t("dashboard.quickLaunchTitle", "Quick Launch — All KrishiAI Modules")}</div>
          <span className="badge">{t("dashboard.quickBadge", "100% Free Open-Source Stack")}</span>
        </div>
        <div className="grid grid-4">
          {QUICK_MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                className="card"
                style={{ textAlign: "left", cursor: "pointer", padding: 16 }}
                onClick={() => onNavigate(m.id)}
              >
                <div style={{ color: "var(--primary)", marginBottom: 8 }}>
                  <Icon size={22} />
                </div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{t(m.titleKey, m.defaultTitle)}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t(m.descKey, m.defaultDesc)}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">{t("dashboard.architectureTitle", "Registered AI/ML/DL Pipeline Status")}</div>
            <span className="badge blue">
              {t("dashboard.mode", "Mode")}: {data?.aiService?.ai_registry?.model_mode ? (data.aiService.ai_registry.model_mode === "auto" ? t("dashboard.modeAuto", "auto") : data.aiService.ai_registry.model_mode) : "auto"}
            </span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("dashboard.colModule", "Module")}</th>
                  <th>{t("dashboard.colModel", "Model / Artifact")}</th>
                  <th>{t("dashboard.colStatus", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(registry).map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ fontWeight: 600 }}>{k}</td>
                    <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {v.id || "Local Trained Artifact (.pkl)"}
                    </td>
                    <td>
                      <span className="badge">{v.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">{t("dashboard.recentActivityTitle", "Recent Farmer Activity Log")}</div>
          </div>
          {data?.recentActivity?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.recentActivity.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: "var(--surface-alt)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem" }}>
                    <strong>{item.title}</strong>
                    <span className="badge">{item.type}</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 3 }}>
                    {item.summary}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
              {t("dashboard.noActivity", "No scans or predictions yet. Run a plant disease scan, mandi price forecast, or scheme query to see history here.")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
