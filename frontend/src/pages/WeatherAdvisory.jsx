import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CloudSun, MapPin, Droplets, Wind, Thermometer } from "lucide-react";
import { krishiApi, extractErrorMessage } from "../services/api";
import { LoadingSpinner, ErrorBanner } from "../components/Feedback";

export default function WeatherAdvisory() {
  const { t } = useTranslation();
  const [city, setCity] = useState("Kota");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchWeather(params) {
    setLoading(true);
    setError("");
    try {
      const res = await krishiApi.getWeatherForecast(params);
      setData(res);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWeather({ city: "Kota" });
  }, []);

  function handleUseGPS() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser. Enter a city name instead.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeather({
          lat: pos.coords.latitude.toFixed(4),
          lon: pos.coords.longitude.toFixed(4),
          city: "My Farm GPS Location",
        });
      },
      () => {
        setLoading(false);
        setError("Location permission denied. You can search any Indian city/district below.");
      }
    );
  }

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <CloudSun size={19} color="var(--primary)" /> {t("weather.title", "Hyperlocal Agri-Weather & Spray Window")}
          </div>
          <span className="badge">Open-Meteo 100% Free API</span>
        </div>

        <ErrorBanner message={error} />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchWeather({ city });
          }}
          style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
        >
          <input
            className="input"
            style={{ flex: 1, minWidth: 220 }}
            placeholder={t("weather.cityPlaceholder", "Enter City / District (e.g., Kota, Nashik, Indore, Ludhiana)")}
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {t("weather.btnForecast", "Get Forecast")}
          </button>
          <button className="btn btn-secondary" type="button" onClick={handleUseGPS} disabled={loading}>
            <MapPin size={16} /> {t("weather.btnGps", "Use My GPS Location")}
          </button>
        </form>
      </div>

      {loading && <LoadingSpinner label={t("weather.loading", "Fetching live weather & computing agricultural advisories...")} />}

      {data && !loading && (
        <>
          <div className="grid grid-4">
            <div className="card">
              <div className="kpi-label">{t("weather.location", "Location")}</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 800, margin: "6px 0" }}>{data.location_name}</div>
              <span className="badge blue">{data.data_source}</span>
            </div>
            <div className="card">
              <div className="kpi-label"><Thermometer size={14} /> {t("weather.tempNow", "Current Temp")}</div>
              <div className="kpi-value">{data.current.temperature_c}°C</div>
              <span className="badge">{data.current.condition}</span>
            </div>
            <div className="card">
              <div className="kpi-label"><Droplets size={14} /> {t("common.humidity", "Humidity")}</div>
              <div className="kpi-value">{data.current.humidity_pct}%</div>
              <span className="badge amber">Pest Risk: {data.pest_risk_level}</span>
            </div>
            <div className="card">
              <div className="kpi-label"><Wind size={14} /> {t("weather.colWind", "Wind Speed")}</div>
              <div className="kpi-value">{data.current.wind_speed_kmh} km/h</div>
              <span className="badge">{t("common.rainfall", "Rain")}: {data.current.precipitation_mm} mm</span>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">{t("weather.sprayWindow", "Actionable Farm Advisories")}</div>
            </div>
            <p style={{ marginBottom: 12, fontWeight: 600, color: "var(--primary-dark)" }}>
              {t("weather.irrigationAdvice", "Irrigation Advice")}: {data.irrigation_recommendation}
            </p>
            <div className="grid grid-2">
              {data.agri_advisories.map((adv, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 13,
                    borderRadius: 10,
                    background:
                      adv.level === "danger"
                        ? "var(--danger-light)"
                        : adv.level === "warning"
                        ? "var(--accent-light)"
                        : "var(--info-light)",
                  }}
                >
                  <strong>{adv.category}</strong>
                  <p style={{ fontSize: "0.84rem", marginTop: 4 }}>{adv.message}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">{t("weather.sevenDay", "7-Day Forecast & Spraying Suitability")}</div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("weather.colDate", "Date")}</th>
                    <th>{t("common.statusLabel", "Condition")}</th>
                    <th>{t("weather.colTemp", "Min / Max °C")}</th>
                    <th>{t("weather.colRain", "Rain (mm / %)")}</th>
                    <th>{t("weather.colWind", "Wind")}</th>
                    <th>{t("weather.colSpray", "Spray Window")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.forecast_7d.map((d) => (
                    <tr key={d.date}>
                      <td><strong>{d.date}</strong></td>
                      <td>{d.condition}</td>
                      <td>{d.temp_min_c}° / {d.temp_max_c}°</td>
                      <td>{d.precipitation_mm} mm ({d.precipitation_prob_pct}%)</td>
                      <td>{d.wind_speed_kmh} km/h</td>
                      <td>
                        <span
                          className={`badge ${
                            d.spray_suitability.includes("Optimal")
                              ? ""
                              : d.spray_suitability.includes("Avoid")
                              ? "red"
                              : "amber"
                          }`}
                        >
                          {d.spray_suitability}
                        </span>
                      </td>
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
