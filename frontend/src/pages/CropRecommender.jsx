import React, { useState } from "react";
import { Sprout } from "lucide-react";
import { krishiApi, extractErrorMessage } from "../services/api";
import { LoadingSpinner, ErrorBanner } from "../components/Feedback";

export default function CropRecommender() {
  const [form, setForm] = useState({
    nitrogen: 95,
    phosphorus: 50,
    potassium: 45,
    temperature: 22,
    humidity: 62,
    ph: 6.8,
    rainfall: 450,
    area_acres: 3,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, Number(v)]));
      const res = await krishiApi.recommendCrop(payload);
      setResult(res);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-2">
      <form className="card" onSubmit={handleSubmit}>
        <div className="card-header">
          <div className="card-title">
            <Sprout size={19} color="var(--primary)" /> Smart Crop Recommendation & Profit ML
          </div>
          <span className="badge">Soil + Climate ML</span>
        </div>

        <ErrorBanner message={error} />

        <div className="grid grid-2" style={{ gap: 10 }}>
          {[
            ["nitrogen", "Soil Nitrogen (N, kg/ha)"],
            ["phosphorus", "Soil Phosphorus (P, kg/ha)"],
            ["potassium", "Soil Potassium (K, kg/ha)"],
            ["ph", "Soil pH (3.0 - 10.0)"],
            ["temperature", "Avg Temperature (°C)"],
            ["humidity", "Relative Humidity (%)"],
            ["rainfall", "Seasonal Rainfall (mm)"],
            ["area_acres", "Cultivable Area (Acres)"],
          ].map(([key, label]) => (
            <div className="form-group" key={key}>
              <label>{label}</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required
              />
            </div>
          ))}
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Running ML Classifier..." : "Predict Best Crops & Expected Profit"}
        </button>
      </form>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Top ML-Ranked Crop Recommendations</div>
          {result && <span className="badge blue">{result.model_engine}</span>}
        </div>

        {loading && <LoadingSpinner label="Evaluating soil N-P-K, pH, and climate suitability..." />}

        {!loading && !result && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Enter your Soil Health Card values and local climate on the left to get ML-ranked crop
            recommendations, soil fertility grading, and estimated net profit for your farm size.
          </p>
        )}

        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <strong>Soil Fertility Grade:</strong>
              <span className="badge">{result.soil_fertility_grade}</span>
            </div>

            {result.recommendations.map((rec, idx) => (
              <div
                key={rec.crop}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: idx === 0 ? "var(--primary-light)" : "var(--surface-alt)",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>
                    #{idx + 1} {rec.crop} ({rec.season})
                  </strong>
                  <span className="badge">{rec.suitability_score}% Match</span>
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "6px 0" }}>
                  {rec.rationale}
                </p>
                <div style={{ display: "flex", gap: 16, fontSize: "0.82rem", flexWrap: "wrap" }}>
                  <span>Yield: <strong>{rec.expected_yield_qtl_per_acre} qtl/acre</strong></span>
                  <span>Gross: <strong>Rs. {rec.est_gross_revenue_inr.toLocaleString("en-IN")}</strong></span>
                  <span style={{ color: "var(--primary-dark)" }}>
                    Est. Net Profit: <strong>Rs. {rec.est_net_profit_inr.toLocaleString("en-IN")}</strong>
                  </span>
                </div>
              </div>
            ))}

            <div>
              <div style={{ fontWeight: 700, fontSize: "0.86rem", marginBottom: 6 }}>Soil Amendments</div>
              <ul className="list-clean">
                {result.soil_amendments.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
