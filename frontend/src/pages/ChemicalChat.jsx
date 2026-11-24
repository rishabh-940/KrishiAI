import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlaskConical, Send, Calculator } from "lucide-react";
import { krishiApi, extractErrorMessage } from "../services/api";
import { ErrorBanner } from "../components/Feedback";

const QUICK_QS = [
  "सरसों में माहू कीट के लिए कौन सा कीटनाशक छिड़कें?",
  "गेहूं में पीला रतुआ (Yellow Rust) के लिए सही दवाई और मात्रा बताएं",
  "What is the safe fungicide dosage for Tomato Late Blight?",
  "Can I mix Zinc Sulphate with DAP fertilizer?",
];

export default function ChemicalChat() {
  const { t, i18n } = useTranslation();
  const isHindi = i18n.language?.startsWith("hi");
  
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: isHindi
        ? "नमस्ते! मुझसे खाद (यूरिया/डीएपी/एमओपी/नैनो यूरिया), कीटनाशक, फफूंदनाशक, सटीक मात्रा (मिली/लीटर) या छिड़काव सुरक्षा अवधि के बारे में कुछ भी पूछें।"
        : "Namaste! Ask me anything about fertilizers (Urea/DAP/MOP/Nano Urea), pesticides, fungicides, exact dosages (ml/L), or safety intervals in Hindi or English.",
    },
  ]);
  const [input, setInput] = useState("");
  const [crop, setCrop] = useState("Mustard");
  const [language, setLanguage] = useState("hi-en");
  const [lastMeta, setLastMeta] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // NPK Dosage Calculator state
  const [calcForm, setCalcForm] = useState({ crop: "Wheat", area_acres: 3, soil_n: 240, soil_p: 16, soil_k: 190 });
  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  async function sendQuestion(text) {
    const q = (text ?? input).trim();
    if (!q) return;
    setError("");
    const nextHistory = [...messages, { role: "user", content: q }];
    setMessages(nextHistory);
    setInput("");
    setSending(true);
    try {
      const res = await krishiApi.chemicalChat({
        message: q,
        crop,
        language,
        history: nextHistory.slice(-4),
      });
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
      setLastMeta(res);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function handleDosageCalc(e) {
    e.preventDefault();
    setCalcLoading(true);
    setError("");
    try {
      const res = await krishiApi.calculateDosage({
        crop: calcForm.crop,
        area_acres: Number(calcForm.area_acres),
        soil_n: Number(calcForm.soil_n),
        soil_p: Number(calcForm.soil_p),
        soil_k: Number(calcForm.soil_k),
      });
      setCalcResult(res);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setCalcLoading(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 20 }}>
      {/* Hero Banner — Input & Crop Care Guidance */}
      <div className="page-hero-banner" style={{ height: 215 }}>
        <img
          src="/images/chemicals-banner.png"
          alt="Input & Crop Care Guidance"
          className="page-hero-img"
        />
      </div>

      <div className="grid grid-2">
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <FlaskConical size={19} color="var(--primary)" /> {t("chemicals.title", "Agro-Chemical & Pesticide AI Chat")}
          </div>
          <span className="badge">me-nabi/farmer-advisory-hindi-qwen2.5-3b</span>
        </div>

        <ErrorBanner message={error} />

        <div className="grid grid-2" style={{ gap: 10 }}>
          <div className="form-group">
            <label>{t("chemicals.cropContext", "Crop Context")}</label>
            <input className="input" value={crop} onChange={(e) => setCrop(e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t("chemicals.language", "Language")}</label>
            <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="hi-en">{t("chemicals.bilingual", "Bilingual (Hindi + English)")}</option>
              <option value="hi">{t("chemicals.hindi", "Hindi (हिंदी)")}</option>
              <option value="en">{t("chemicals.english", "English")}</option>
            </select>
          </div>
        </div>

        <div className="chip-row">
          {QUICK_QS.map((q, i) => (
            <button key={i} type="button" className="chip" onClick={() => sendQuestion(q)}>
              {q.slice(0, 44)}...
            </button>
          ))}
        </div>

        <div className="chat-box">
          {messages.map((m, idx) => (
            <div key={idx} className={`chat-msg ${m.role}`}>
              {m.content}
            </div>
          ))}
          {sending && <div className="chat-msg assistant">{t("chemicals.generating", "Generating ICAR/KVK advisory...")}</div>}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendQuestion();
          }}
          style={{ display: "flex", gap: 8 }}
        >
          <input
            className="input"
            placeholder={t("chemicals.chatPlaceholder", "Ask in Hindi, Hinglish, or English...")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={sending}>
            <Send size={16} /> {t("common.send", "Send")}
          </button>
        </form>

        {lastMeta && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700, fontSize: "0.84rem", marginBottom: 6 }}>
              Recommended Products & Safety Alerts
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
              {lastMeta.recommended_products?.map((p, i) => (
                <div key={i} style={{ fontSize: "0.82rem", background: "var(--surface-alt)", padding: "8px 10px", borderRadius: 8 }}>
                  <strong>{p.name}</strong> ({p.type}) — Dosage: <strong>{p.dosage}</strong> | PHI: {p.phi_days} days
                </div>
              ))}
            </div>
            <ul className="list-clean">
              {lastMeta.safety_alerts?.map((a, i) => (
                <li key={i} style={{ color: "#991b1b" }}>{a}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Calculator size={19} color="var(--primary)" /> {t("chemicals.calcTitle", "ICAR NPK Fertilizer Bag Calculator")}
          </div>
          <span className="badge amber">Exact Urea / DAP / MOP</span>
        </div>

        <form onSubmit={handleDosageCalc}>
          <div className="grid grid-2" style={{ gap: 10 }}>
            <div className="form-group">
              <label>{t("common.crop", "Crop")}</label>
              <select
                className="select"
                value={calcForm.crop}
                onChange={(e) => setCalcForm({ ...calcForm, crop: e.target.value })}
              >
                {["Wheat", "Rice", "Maize", "Cotton", "Sugarcane", "Mustard", "Soybean", "Tomato", "Potato", "Onion"].map(
                  (c) => (
                    <option key={c} value={c}>{c}</option>
                  )
                )}
              </select>
            </div>
            <div className="form-group">
              <label>{t("chemicals.area", "Farm Area (Acres)")}</label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                className="input"
                value={calcForm.area_acres}
                onChange={(e) => setCalcForm({ ...calcForm, area_acres: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-3" style={{ gap: 10 }}>
            <div className="form-group">
              <label>{t("chemicals.soilN", "Soil N (kg/ha)")}</label>
              <input
                type="number"
                className="input"
                value={calcForm.soil_n}
                onChange={(e) => setCalcForm({ ...calcForm, soil_n: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>{t("chemicals.soilP", "Soil P (kg/ha)")}</label>
              <input
                type="number"
                className="input"
                value={calcForm.soil_p}
                onChange={(e) => setCalcForm({ ...calcForm, soil_p: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>{t("chemicals.soilK", "Soil K (kg/ha)")}</label>
              <input
                type="number"
                className="input"
                value={calcForm.soil_k}
                onChange={(e) => setCalcForm({ ...calcForm, soil_k: e.target.value })}
              />
            </div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={calcLoading} style={{ width: "100%" }}>
            {calcLoading ? t("common.loading", "Calculating...") : t("chemicals.btnCalc", "Calculate Fertilizer Bags & Cost")}
          </button>
        </form>

        {calcResult && (
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="grid grid-3" style={{ gap: 10 }}>
              <div style={{ padding: 12, borderRadius: 10, background: "var(--primary-light)" }}>
                <div className="kpi-label">{t("chemicals.ureaBags", "Urea (45kg bags)")}</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 800 }}>{calcResult.fertilizer_bags.urea_45kg_bags}</div>
                <div style={{ fontSize: "0.76rem" }}>{calcResult.fertilizer_bags.urea_total_kg} kg total</div>
              </div>
              <div style={{ padding: 12, borderRadius: 10, background: "var(--info-light)" }}>
                <div className="kpi-label">{t("chemicals.dapBags", "DAP (50kg bags)")}</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 800 }}>{calcResult.fertilizer_bags.dap_50kg_bags}</div>
                <div style={{ fontSize: "0.76rem" }}>{calcResult.fertilizer_bags.dap_total_kg} kg total</div>
              </div>
              <div style={{ padding: 12, borderRadius: 10, background: "var(--accent-light)" }}>
                <div className="kpi-label">{t("chemicals.mopBags", "MOP (50kg bags)")}</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 800 }}>{calcResult.fertilizer_bags.mop_50kg_bags}</div>
                <div style={{ fontSize: "0.76rem" }}>{calcResult.fertilizer_bags.mop_total_kg} kg total</div>
              </div>
            </div>

            <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>
              Estimated Subsidized Cost: Rs. {calcResult.estimated_cost_inr.toLocaleString("en-IN")} (
              {calcResult.area_acres} acres / {calcResult.area_hectares} ha)
            </div>

            <div>
              <div style={{ fontWeight: 700, fontSize: "0.84rem", marginBottom: 6 }}>Split Application Schedule</div>
              <ul className="list-clean">
                {calcResult.split_schedule.map((s, i) => (
                  <li key={i}>
                    <strong>{s.stage}:</strong> {s.instruction}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
