import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, ShieldCheck, AlertTriangle, Leaf } from "lucide-react";
import { krishiApi, extractErrorMessage } from "../services/api";
import { LoadingSpinner, ErrorBanner } from "../components/Feedback";

export default function DiseaseDetector() {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [modelChoice, setModelChoice] = useState("ensemble");
  const [cropHint, setCropHint] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(e) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    setResult(null);
    setError("");
  }

  async function handlePredict(e) {
    e.preventDefault();
    if (!file) {
      setError("Please select or capture a plant leaf photo first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await krishiApi.predictDisease(file, modelChoice, cropHint);
      setResult(res);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-2">
      <form className="card" onSubmit={handlePredict}>
        <div className="card-header">
          <div className="card-title">
            <Leaf size={19} color="var(--primary)" /> {t("disease.uploadTitle", "Upload Plant / Crop Leaf Image")}
          </div>
          <span className="badge">Dual HF Vision DL</span>
        </div>

        <ErrorBanner message={error} />

        <label className="dropzone" style={{ display: "block", marginBottom: 14 }}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <Upload size={28} color="var(--primary)" style={{ marginBottom: 6 }} />
          <div style={{ fontWeight: 700 }}>
            {file ? file.name : t("disease.uploadHelp", "Click to upload leaf photo (JPEG, PNG, WEBP)")}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
            Clear close-up in daylight gives highest accuracy
          </div>
          {preview && <img src={preview} alt="Leaf preview" className="preview-img" />}
        </label>

        <div className="form-group">
          <label>{t("disease.modelChoice", "Deep Learning Model Pipeline")}</label>
          <select
            className="select"
            value={modelChoice}
            onChange={(e) => setModelChoice(e.target.value)}
          >
            <option value="ensemble">{t("disease.ensemble", "Dual-Model Ensemble (Saon110 + Plant-Disease-Detector)")}</option>
            <option value="primary">Saon110/bd-crop-vegetable-plant-disease-model (94 South Asian classes)</option>
            <option value="secondary">rarfileexe/Plant-Disease-Detector (MobileNetV2, 38 PlantVillage classes)</option>
          </select>
        </div>

        <div className="form-group">
          <label>{t("disease.cropHint", "Crop Hint (Optional)")}</label>
          <input
            className="input"
            placeholder={t("disease.cropHintPlaceholder", "e.g., Tomato, Potato, Rice, Wheat, Cotton, Mango")}
            value={cropHint}
            onChange={(e) => setCropHint(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? t("disease.btnDiagnosing", "Analyzing Leaf with Deep Learning...") : t("disease.btnDiagnose", "Diagnose Plant Disease")}
        </button>
      </form>

      <div className="card">
        <div className="card-header">
          <div className="card-title">{t("disease.resultsTitle", "AI Diagnosis & Treatment Plan")}</div>
          {result && <span className="badge blue">{result.inference_backend}</span>}
        </div>

        {loading && <LoadingSpinner label="Running CLAHE enhancement + Dual Vision DL inference..." />}

        {!loading && !result && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            {t("disease.emptyState", "Upload a leaf photo on the left to detect fungal, bacterial, or viral diseases, quantify affected leaf area, and receive chemical + organic IPM remedies.")}
          </p>
        )}

        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background:
                  result.top_prediction.disease.toLowerCase().includes("healthy")
                    ? "var(--primary-light)"
                    : "var(--accent-light)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>
                  {result.top_prediction.crop} — {result.top_prediction.disease}
                </strong>
                <span className="badge">
                  {(result.top_prediction.confidence * 100).toFixed(1)}% confidence
                </span>
              </div>
              <div style={{ fontSize: "0.84rem", marginTop: 4 }}>
                Severity: <strong>{result.treatment.severity}</strong> | Affected Area:{" "}
                <strong>{result.visual_diagnostics.estimated_affected_area_pct}%</strong>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: 6 }}>
                Top-K Predictions
              </div>
              {result.top_k_predictions.map((p, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                    <span>
                      {p.crop} — {p.disease}
                    </span>
                    <strong>{(p.confidence * 100).toFixed(1)}%</strong>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${Math.min(100, p.confidence * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontWeight: 700, fontSize: "0.86rem", marginBottom: 4 }}>
                <AlertTriangle size={15} style={{ verticalAlign: "middle" }} /> Immediate Actions
              </div>
              <ul className="list-clean">
                {result.treatment.immediate_actions.map((a, idx) => (
                  <li key={idx}>{a}</li>
                ))}
              </ul>
            </div>

            <div>
              <div style={{ fontWeight: 700, fontSize: "0.86rem", marginBottom: 4 }}>
                Chemical Remedies (ICAR Dosage)
              </div>
              <ul className="list-clean">
                {result.treatment.chemical_remedies.map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
            </div>

            <div>
              <div style={{ fontWeight: 700, fontSize: "0.86rem", marginBottom: 4 }}>
                <ShieldCheck size={15} style={{ verticalAlign: "middle" }} /> Organic & Bio-Control
              </div>
              <ul className="list-clean">
                {result.treatment.organic_remedies.map((o, idx) => (
                  <li key={idx}>{o}</li>
                ))}
              </ul>
            </div>

            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              {result.treatment.kvk_disclaimer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
