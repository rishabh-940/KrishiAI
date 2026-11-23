import React, { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { krishiApi, extractErrorMessage } from "../services/api";
import { LoadingSpinner, ErrorBanner } from "../components/Feedback";

export default function PricePredictor() {
  const [meta, setMeta] = useState(null);
  const [state, setState] = useState("Rajasthan");
  const [commodity, setCommodity] = useState("Mustard");
  const [horizonDays, setHorizonDays] = useState(30);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    krishiApi
      .getPriceMetadata()
      .then((m) => {
        setMeta(m);
        if (m.states?.length) setState(m.states[0]);
      })
      .catch((e) => setError(extractErrorMessage(e)));
  }, []);

  const availableMarkets = (meta?.markets || []).filter((m) => m.state === state);
  const availableCommodities = [...new Set(availableMarkets.map((m) => m.commodity))];

  useEffect(() => {
    if (availableCommodities.length && !availableCommodities.includes(commodity)) {
      setCommodity(availableCommodities[0]);
    }
  }, [state, meta]);

  async function handlePredict(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await krishiApi.predictPrice({
        state,
        commodity,
        horizon_days: Number(horizonDays),
      });
      setResult(res);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const chartData = result
    ? [
        ...result.historical_series.map((p) => ({
          date: p.date.slice(5),
          historical: p.modal_price,
          forecast: null,
          min: p.min_price,
          max: p.max_price,
        })),
        ...result.forecast_series.map((p) => ({
          date: p.date.slice(5),
          historical: null,
          forecast: p.modal_price,
          min: p.min_price,
          max: p.max_price,
        })),
      ]
    : [];

  return (
    <div className="grid" style={{ gap: 20 }}>
      <form className="card" onSubmit={handlePredict}>
        <div className="card-header">
          <div className="card-title">
            <TrendingUp size={19} color="var(--primary)" /> India Commodity Wise Mandi Price Forecast
          </div>
          <span className="badge">APMC Time-Series ML</span>
        </div>

        <ErrorBanner message={error} />

        <div className="grid grid-4" style={{ alignItems: "end" }}>
          <div className="form-group">
            <label>State</label>
            <select className="select" value={state} onChange={(e) => setState(e.target.value)}>
              {(meta?.states || ["Rajasthan", "Maharashtra", "Punjab", "Madhya Pradesh", "Uttar Pradesh"]).map(
                (st) => (
                  <option key={st} value={st}>{st}</option>
                )
              )}
            </select>
          </div>

          <div className="form-group">
            <label>Commodity</label>
            <select className="select" value={commodity} onChange={(e) => setCommodity(e.target.value)}>
              {(availableCommodities.length ? availableCommodities : ["Wheat", "Mustard", "Onion", "Tomato"]).map(
                (c) => (
                  <option key={c} value={c}>{c}</option>
                )
              )}
            </select>
          </div>

          <div className="form-group">
            <label>Forecast Horizon</label>
            <select className="select" value={horizonDays} onChange={(e) => setHorizonDays(e.target.value)}>
              <option value={14}>Next 14 Days</option>
              <option value={30}>Next 30 Days</option>
              <option value={60}>Next 60 Days</option>
              <option value={90}>Next 90 Days</option>
            </select>
          </div>

          <div className="form-group">
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? "Forecasting..." : "Predict Mandi Price"}
            </button>
          </div>
        </div>
      </form>

      {loading && <LoadingSpinner label="Running Mandi time-series forecasting ML model..." />}

      {result && (
        <>
          <div className="grid grid-4">
            <div className="card">
              <div className="kpi-label">Latest Modal Price ({result.market})</div>
              <div className="kpi-value">Rs. {result.current_modal_price}</div>
              <span className="badge">{result.unit}</span>
            </div>
            <div className="card">
              <div className="kpi-label">Predicted Avg ({horizonDays}d)</div>
              <div className="kpi-value">Rs. {result.predicted_avg_modal_price}</div>
              <span className={`badge ${result.expected_change_pct >= 0 ? "" : "red"}`}>
                {result.expected_change_pct >= 0 ? "+" : ""}
                {result.expected_change_pct}% vs current
              </span>
            </div>
            <div className="card">
              <div className="kpi-label">Projected Peak Price</div>
              <div className="kpi-value">Rs. {result.predicted_peak_price}</div>
              <span className="badge blue">Variety: {result.variety}</span>
            </div>
            <div className="card">
              <div className="kpi-label">AI Market Signal</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--primary-dark)", margin: "6px 0" }}>
                {result.market_signal}
              </div>
              <span className="badge amber">
                MAPE: {result.model_metrics?.validation_mape_pct}% | R²: {result.model_metrics?.validation_r2}
              </span>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">
                Historical & Forecasted Modal Price Trend — {result.commodity} ({result.market}, {result.state})
              </div>
            </div>
            <p style={{ fontSize: "0.86rem", color: "var(--text-muted)", marginBottom: 14 }}>
              {result.signal_reason}
            </p>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} domain={["auto", "auto"]} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="historical"
                    name="Historical Modal (Rs/Qtl)"
                    stroke="#15803d"
                    fill="#dcfce7"
                    strokeWidth={2.5}
                    connectNulls
                  />
                  <Area
                    type="monotone"
                    dataKey="forecast"
                    name="ML Forecast Modal (Rs/Qtl)"
                    stroke="#d97706"
                    fill="#fef3c7"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Forecast Breakdown Table (Rs./Quintal)</div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Forecast Date</th>
                    <th>Min Price</th>
                    <th>Modal Price</th>
                    <th>Max Price</th>
                    <th>Est. Arrivals (Tonnes)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.forecast_series.map((row) => (
                    <tr key={row.date}>
                      <td>{row.date}</td>
                      <td>Rs. {row.min_price}</td>
                      <td><strong>Rs. {row.modal_price}</strong></td>
                      <td>Rs. {row.max_price}</td>
                      <td>{row.arrivals_tonnes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
