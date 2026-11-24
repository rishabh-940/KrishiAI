import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Landmark, ExternalLink, CheckCircle2 } from "lucide-react";
import { krishiApi, extractErrorMessage } from "../services/api";
import { LoadingSpinner, ErrorBanner } from "../components/Feedback";

const SAMPLE_PROMPTS = [
  "Which crop insurance and subsidy schemes apply for Wheat & Mustard in Rajasthan?",
  "How can I get 55% subsidy on drip irrigation and a solar water pump?",
  "Tell me about PM-KISAN, Kisan Credit Card 4% loan, and Soil Health Card.",
  "Subsidy for Kisan Drone and cold storage warehouse for FPO",
];

export default function SchemesAdvisor() {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState(SAMPLE_PROMPTS[0]);
  const [crop, setCrop] = useState("Wheat");
  const [state, setState] = useState("Rajasthan");
  const [language, setLanguage] = useState(i18n.language?.startsWith("hi") ? "hi" : "en");
  const [result, setResult] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLanguage(i18n.language?.startsWith("hi") ? "hi" : "en");
  }, [i18n.language]);

  useEffect(() => {
    krishiApi
      .getSchemesCatalog()
      .then((d) => setCatalog(d.schemes || []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await krishiApi.querySchemes({ query, crop, state, language });
      setResult(res);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Landmark size={19} color="var(--primary)" /> {t("schemes.title", "Government Schemes & Guidelines AI")}
          </div>
          <span className="badge">Model: bharatgenai/AgriParam</span>
        </div>

        <ErrorBanner message={error} />

        <div className="chip-row">
          {SAMPLE_PROMPTS.map((p, idx) => (
            <button key={idx} type="button" className="chip" onClick={() => setQuery(p)}>
              {p.slice(0, 52)}...
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-3">
            <div className="form-group">
              <label>{t("common.crop", "Crop")}</label>
              <input className="input" value={crop} onChange={(e) => setCrop(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t("common.state", "State")}</label>
              <input className="input" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t("schemes.responseLanguage", "Response Language")}</label>
              <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="en">{t("schemes.englishOption", "English")}</option>
                <option value="hi">{t("schemes.hindiOption", "Hindi (हिंदी)")}</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>{t("schemes.askPrompt", "Ask AgriParam about Subsidies, Insurance, Credit, or Guidelines")}</label>
            <textarea
              className="textarea"
              rows={3}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? t("schemes.btnAsking", "Consulting AgriParam AI...") : t("schemes.btnAsk", "Get Schemes & Guidelines")}
          </button>
        </form>
      </div>

      {loading && <LoadingSpinner label="Querying bharatgenai/AgriParam + Government Schemes RAG..." />}

      {result && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">{t("schemes.recommendation", "AgriParam Recommendation")}</div>
            <span className="badge blue">{result.inference_backend}</span>
          </div>
          <p style={{ whiteSpace: "pre-wrap", marginBottom: 16 }}>{result.answer}</p>

          <div style={{ fontWeight: 700, marginBottom: 8 }}>{t("schemes.actionChecklist", "Action Checklist")}</div>
          <ul className="list-clean" style={{ marginBottom: 16 }}>
            {result.action_checklist.map((step, i) => (
              <li key={i}>
                <CheckCircle2 size={14} color="var(--primary)" style={{ marginRight: 6, verticalAlign: "middle" }} />
                {step}
              </li>
            ))}
          </ul>

          <div className="grid grid-2">
            {result.matched_schemes.map((s) => (
              <div key={s.id} className="card" style={{ padding: 15, background: "var(--surface-alt)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong>{s.name}</strong>
                  <span className="badge">{s.category}</span>
                </div>
                <p style={{ fontSize: "0.84rem", margin: "8px 0" }}>{s.benefit_summary}</p>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 8 }}>
                  <strong>{t("schemes.eligibility", "Eligibility")}:</strong> {s.eligibility}
                </div>
                <a
                  href={s.official_portal}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: "0.8rem", padding: "6px 12px" }}
                >
                  <ExternalLink size={14} /> {t("schemes.applyOnline", "Apply on Official Portal")}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            {t("schemes.verifiedDirectory", "Verified Indian Agricultural Schemes Directory")} ({catalog.length})
          </div>
        </div>
        <div className="grid grid-3">
          {catalog.map((s) => (
            <div key={s.id} className="card" style={{ padding: 14 }}>
              <span className="badge amber" style={{ marginBottom: 6 }}>{s.category}</span>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{s.name}</div>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 8 }}>
                {s.benefit_summary}
              </p>
              <a href={s.official_portal} target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)" }}>
                Apply / Details →
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
