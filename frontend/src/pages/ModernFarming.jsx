import React, { useEffect, useState } from "react";
import { Cpu, Sparkles } from "lucide-react";
import { krishiApi, extractErrorMessage } from "../services/api";
import { LoadingSpinner, ErrorBanner } from "../components/Feedback";

export default function ModernFarming() {
  const [data, setData] = useState(null);
  const [view, setView] = useState("methods");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    krishiApi
      .getModernFarming()
      .then(setData)
      .catch((e) => setError(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner label="Loading Modern Farming & Agri-Tech Knowledge Hub..." />;

  return (
    <div className="grid" style={{ gap: 18 }}>
      <ErrorBanner message={error} />

      <div className="card">
        <div className="card-header" style={{ marginBottom: 0 }}>
          <div className="card-title">
            <Cpu size={19} color="var(--primary)" /> Modern Farming Methods & Daily Agri-Tech Advancements
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={`btn ${view === "methods" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setView("methods")}
            >
              Types of Modern Farming ({data?.farmingTypes?.length || 0})
            </button>
            <button
              className={`btn ${view === "tech" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setView("tech")}
            >
              <Sparkles size={15} /> Daily Agri-Tech Advancements ({data?.dailyAdvancements?.length || 0})
            </button>
          </div>
        </div>
      </div>

      {view === "methods" ? (
        <div className="grid grid-2">
          {(data?.farmingTypes || []).map((m) => (
            <div key={m.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800 }}>{m.title}</h3>
                <span className="badge">{m.category}</span>
              </div>
              <p style={{ fontSize: "0.86rem", color: "var(--text-muted)", marginBottom: 12 }}>
                {m.summary}
              </p>
              <div className="chip-row">
                <span className="badge blue">Water Saved: {m.waterSavings}</span>
                <span className="badge">Yield: {m.yieldBoost}</span>
                <span className="badge amber">Subsidy: {m.govtSubsidy}</span>
              </div>
              <div style={{ fontSize: "0.82rem", marginBottom: 8 }}>
                <strong>Best Crops:</strong> {m.bestFor.join(", ")}
              </div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>How to Start:</div>
              <ul className="list-clean">
                {m.howToStart.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-2">
          {(data?.dailyAdvancements || []).map((a) => (
            <div key={a.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800 }}>{a.title}</h3>
                <span className="badge blue">{a.domain}</span>
              </div>
              <p style={{ fontSize: "0.86rem", color: "var(--text-muted)", marginBottom: 10 }}>
                {a.summary}
              </p>
              <div style={{ padding: 10, borderRadius: 10, background: "var(--primary-light)", fontSize: "0.83rem", marginBottom: 8 }}>
                <strong>Field Impact:</strong> {a.impact}
              </div>
              <div style={{ fontSize: "0.82rem" }}>
                <strong>Accessibility & Cost:</strong> {a.accessibility}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
