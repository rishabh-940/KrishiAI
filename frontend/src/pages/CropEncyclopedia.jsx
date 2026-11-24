import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Search, ArrowLeft } from "lucide-react";
import { krishiApi, extractErrorMessage } from "../services/api";
import { LoadingSpinner, ErrorBanner } from "../components/Feedback";

export default function CropEncyclopedia() {
  const { t, i18n } = useTranslation();
  const [crops, setCrops] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [season, setSeason] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isHindi = i18n.language?.startsWith("hi");

  useEffect(() => {
    setLoading(true);
    krishiApi
      .getCrops({ search, season })
      .then((d) => setCrops(d.crops || []))
      .catch((e) => setError(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [search, season]);

  if (selected) {
    return (
      <div className="card">
        <button className="btn btn-secondary" onClick={() => setSelected(null)} style={{ marginBottom: 16 }}>
          <ArrowLeft size={16} /> {t("encyclopedia.backBtn", "Back to All Indian Crops")}
        </button>

        <div className="card-header">
          <div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800 }}>
              {isHindi && selected.hindiName ? `${selected.hindiName} (${selected.name})` : `${selected.name} (${selected.hindiName})`}
            </h2>
            <p style={{ fontSize: "0.86rem", color: "var(--text-muted)", fontStyle: "italic" }}>
              {selected.scientificName} • {selected.category} • {selected.season}
            </p>
          </div>
          <span className="badge">{selected.durationDays}</span>
        </div>

        <div className="grid grid-3" style={{ marginBottom: 18 }}>
          <div style={{ padding: 14, borderRadius: 10, background: "var(--surface-alt)" }}>
            <div className="kpi-label">{t("encyclopedia.climateRainfall", "Climate & Rainfall")}</div>
            <div style={{ fontSize: "0.86rem", marginTop: 4 }}>
              <strong>{t("common.temperature", "Temp")}:</strong> {selected.climate.tempC}<br />
              <strong>{t("common.rainfall", "Rainfall")}:</strong> {selected.climate.rainfallMm}<br />
              <strong>{t("common.humidity", "Humidity")}:</strong> {selected.climate.humidity}
            </div>
          </div>
          <div style={{ padding: 14, borderRadius: 10, background: "var(--surface-alt)" }}>
            <div className="kpi-label">{t("encyclopedia.soilSeed", "Soil & Seed Rate")}</div>
            <div style={{ fontSize: "0.86rem", marginTop: 4 }}>
              <strong>{t("encyclopedia.soil", "Soil")}:</strong> {selected.soil}<br />
              <strong>{t("encyclopedia.seedRate", "Seed Rate")}:</strong> {selected.seedRate}
            </div>
          </div>
          <div style={{ padding: 14, borderRadius: 10, background: "var(--surface-alt)" }}>
            <div className="kpi-label">{t("encyclopedia.nutritionYield", "Nutrition & Yield")}</div>
            <div style={{ fontSize: "0.86rem", marginTop: 4 }}>
              <strong>{t("encyclopedia.npk", "NPK")}:</strong> {selected.fertilizerNPK}<br />
              <strong>{t("common.yield", "Expected Yield")}:</strong> {selected.expectedYield}
            </div>
          </div>
        </div>

        <div className="grid grid-2">
          <div>
            <h3 style={{ fontSize: "1rem", marginBottom: 8 }}>{t("encyclopedia.cultivationMethod", "Step-by-Step Cultivation Method")}</h3>
            <ol className="list-clean">
              {selected.cultivationSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
          <div>
            <h3 style={{ fontSize: "1rem", marginBottom: 8 }}>{t("encyclopedia.irrigationStages", "Critical Irrigation Stages")}</h3>
            <ul className="list-clean" style={{ marginBottom: 14 }}>
              {selected.irrigationSchedule.map((stage, i) => (
                <li key={i}>{stage}</li>
              ))}
            </ul>

            <h3 style={{ fontSize: "1rem", marginBottom: 8 }}>{t("encyclopedia.majorPests", "Major Pests & Diseases")}</h3>
            <div className="chip-row">
              {selected.majorPestsDiseases.map((p) => (
                <span key={p} className="badge red">{p}</span>
              ))}
            </div>

            <h3 style={{ fontSize: "1rem", margin: "12px 0 8px" }}>{t("encyclopedia.popularVarieties", "Popular High-Yielding Varieties")}</h3>
            <div className="chip-row">
              {selected.popularVarieties.map((v) => (
                <span key={v} className="badge blue">{v}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      {/* Hero Banner — Indian Crops Reference Library */}
      <div className="page-hero-banner" style={{ height: 220 }}>
        <img
          src="/images/encyclopedia-banner.png"
          alt="Indian Crops Reference Library"
          className="page-hero-img"
        />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <BookOpen size={19} color="var(--primary)" /> {t("encyclopedia.title", "Major Indian Crops Encyclopedia")}
          </div>
          <span className="badge">{crops.length} {t("common.crop", "Crops")}</span>
        </div>

        <ErrorBanner message={error} />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
            <input
              className="input"
              placeholder={t("encyclopedia.searchPlaceholder", "Search by crop name, Hindi name, or state (e.g., Wheat, सरसों, Rajasthan)...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {["", "Kharif", "Rabi", "Annual"].map((s) => (
            <button
              key={s || "all"}
              className={`chip ${season === s ? "active" : ""}`}
              onClick={() => setSeason(s)}
            >
              {s ? (isHindi ? (s === "Kharif" ? "खरीफ" : s === "Rabi" ? "रबी" : "वार्षिक") : s) : t("common.allSeasons", "All Seasons")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading Indian crops database..." />
      ) : (
        <div className="grid grid-3">
          {crops.map((crop) => (
            <div key={crop.id} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                  <div>
                    <h3 style={{ fontSize: "1.06rem", fontWeight: 800 }}>
                      {crop.name} <span style={{ color: "var(--primary)" }}>({crop.hindiName})</span>
                    </h3>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                      {crop.scientificName}
                    </div>
                  </div>
                  <span className="badge amber">{crop.category}</span>
                </div>
                <p style={{ fontSize: "0.84rem", marginBottom: 6 }}>
                  <strong>{t("common.season", "Season")}:</strong> {isHindi && crop.season === "Kharif" ? "खरीफ" : isHindi && crop.season === "Rabi" ? "रबी" : crop.season}
                </p>
                <p style={{ fontSize: "0.84rem", marginBottom: 6 }}>
                  <strong>{t("common.yield", "Yield")}:</strong> {crop.expectedYield}
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 12 }}>
                  <strong>{t("common.state", "Top States")}:</strong> {crop.majorStates.slice(0, 4).join(", ")}
                </p>
              </div>
              <button className="btn btn-secondary" onClick={() => setSelected(crop)} style={{ width: "100%" }}>
                <Search size={15} /> {t("encyclopedia.viewPlaybook", "Read Full Cultivation Guide")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
