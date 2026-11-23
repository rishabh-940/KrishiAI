import React, { useEffect, useState } from "react";
import { ScanLine, Landmark, FlaskConical, TrendingUp, CloudSun, Sprout, BookOpen, Cpu } from "lucide-react";
import { krishiApi, extractErrorMessage } from "../services/api";
import { LoadingSpinner, ErrorBanner } from "../components/Feedback";

const QUICK_MODULES = [
  { id: "disease", title: "Plant Disease AI", desc: "Dual HuggingFace Vision DL models (94 + 38 classes)", icon: ScanLine },
  { id: "schemes", title: "Govt Schemes (AgriParam)", desc: "BharatGen AgriParam LLM + PM-KISAN / PMFBY / KCC", icon: Landmark },
  { id: "chemicals", title: "Chemicals & NPK Chat", desc: "Hindi/English Qwen2.5-3B + Fertilizer Bag Calculator", icon: FlaskConical },
  { id: "prices", title: "Mandi Price Forecast", desc: "India APMC Mandi Time-Series ML Forecaster", icon: TrendingUp },
  { id: "recommender", title: "Smart Crop ML", desc: "Soil N-P-K + Climate Crop Recommender & Profit", icon: Sprout },
  { id: "weather", title: "Weather & Spray Window", desc: "Live Open-Meteo 7-day forecast + Pest/Irrigation alerts", icon: CloudSun },
  { id: "encyclopedia", title: "Indian Crops Guide", desc: "Complete cultivation methods for 12+ Indian crops", icon: BookOpen },
  { id: "modern", title: "Modern Farming & Tech", desc: "Hydroponics, Drones, IoT, Polyhouse, Solar & ZBNF", icon: Cpu },
];

export default function Dashboard({ onNavigate }) {
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

  if (loading) return <LoadingSpinner label="Loading KrishiAI command center..." />;

  const stats = data?.stats || {};
  const registry = data?.aiService?.ai_registry?.registered_models || {};

  return (
    <div className="grid" style={{ gap: 22 }}>
      <ErrorBanner message={error} />

      <div className="grid grid-4">
        <div className="card">
          <div className="kpi-label">Pretrained HF AI/DL Models</div>
          <div className="kpi-value">{stats.pretrainedAiModels ?? 4}</div>
          <span className="badge">Vision + Bilingual LLMs</span>
        </div>
        <div className="card">
          <div className="kpi-label">Trained ML Pipelines</div>
          <div className="kpi-value">{stats.trainedMlPipelines ?? 2}</div>
          <span className="badge blue">Mandi Forecast + Crop ML</span>
        </div>
        <div className="card">
          <div className="kpi-label">Indian Crops Cataloged</div>
          <div className="kpi-value">{stats.indianCropsCataloged ?? 12}</div>
          <span className="badge amber">Full Cultivation Playbooks</span>
        </div>
        <div className="card">
          <div className="kpi-label">Modern Tech & Methods</div>
          <div className="kpi-value">
            {(stats.modernFarmingMethods ?? 8) + (stats.agriTechAdvancements ?? 8)}
          </div>
          <span className="badge">Subsidies & ROI Included</span>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Quick Launch — All KrishiAI Modules</div>
          <span className="badge">100% Free Open-Source Stack</span>
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
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{m.title}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{m.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Registered AI/ML/DL Pipeline Status</div>
            <span className="badge blue">
              Mode: {data?.aiService?.ai_registry?.model_mode || "auto"}
            </span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Model / Artifact</th>
                  <th>Status</th>
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
            <div className="card-title">Recent Farmer Activity Log</div>
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
              No scans or predictions yet. Run a plant disease scan, mandi price forecast, or scheme query to see history here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
