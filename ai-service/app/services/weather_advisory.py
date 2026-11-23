"""
100% Free Weather Prediction & Agricultural Advisory Service.
Uses Open-Meteo (https://open-meteo.com/) — completely free, zero API key required.
Provides 7-day weather forecast + spraying suitability, irrigation trigger, and pest risk analysis.
Includes an offline-safe regional fallback when running in air-gapped/offline environments.
"""

from datetime import date, timedelta
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.schemas.models import WeatherAdvisoryResponse, WeatherDay

WMO_CODES = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    80: "Rain Showers",
    95: "Thunderstorm",
}

INDIAN_CITY_COORDS = {
    "kota": ("Kota, Rajasthan", 25.2138, 75.8648),
    "jaipur": ("Jaipur, Rajasthan", 26.9124, 75.7873),
    "indore": ("Indore, Madhya Pradesh", 22.7196, 75.8577),
    "nashik": ("Nashik, Maharashtra", 19.9975, 73.7898),
    "pune": ("Pune, Maharashtra", 18.5204, 73.8567),
    "ludhiana": ("Ludhiana, Punjab", 30.9010, 75.8573),
    "lucknow": ("Lucknow, Uttar Pradesh", 26.8467, 80.9462),
    "patna": ("Patna, Bihar", 25.5941, 85.1376),
    "nagpur": ("Nagpur, Maharashtra", 21.1458, 79.0882),
    "bengaluru": ("Bengaluru, Karnataka", 12.9716, 77.5946),
    "hyderabad": ("Hyderabad, Telangana", 17.3850, 78.4867),
    "delhi": ("New Delhi, India", 28.6139, 77.2090),
}


class WeatherAdvisoryService:
    async def geocode_city(self, city: str) -> Tuple[str, float, float]:
        key = city.strip().lower()
        if key in INDIAN_CITY_COORDS:
            return INDIAN_CITY_COORDS[key]

        try:
            url = "https://geocoding-api.open-meteo.com/v1/search"
            async with httpx.AsyncClient(timeout=8.0) as client:
                r = await client.get(url, params={"name": city, "count": 1, "language": "en", "format": "json"})
                if r.status_code == 200:
                    data = r.json()
                    if data.get("results"):
                        top = data["results"][0]
                        label = f"{top['name']}, {top.get('admin1', top.get('country', ''))}".strip(", ")
                        return label, float(top["latitude"]), float(top["longitude"])
        except Exception:
            pass

        return ("Kota, Rajasthan", 25.2138, 75.8648)

    @staticmethod
    def _classify_spray(rain_prob: float, wind_kmh: float, temp_max: float) -> str:
        if rain_prob >= 50 or wind_kmh >= 18:
            return "Avoid Spraying (Rain/High Wind)"
        if temp_max >= 37:
            return "Spray Early Morning / Late Evening Only"
        if rain_prob >= 25 or wind_kmh >= 12:
            return "Caution — Moderate Drift Risk"
        return "Optimal Spraying Window"

    def _build_agri_advisories(
        self, days: List[WeatherDay], current: Dict[str, Any]
    ) -> Tuple[List[Dict[str, str]], str, str]:
        advisories: List[Dict[str, str]] = []
        total_rain_3d = sum(d.precipitation_mm for d in days[:3])
        max_temp_3d = max(d.temp_max_c for d in days[:3])
        avg_hum = sum(d.humidity_pct for d in days[:3]) / 3.0

        if total_rain_3d >= 20:
            irrigation = "Pause Irrigation — Significant rainfall (>20 mm) expected in the next 72 hours. Ensure field drainage channels are clear."
            advisories.append({
                "category": "Drainage & Sowing",
                "level": "warning",
                "message": "Clear bund drainage channels to prevent root rot in vegetables, soybean, and pulses. Delay fertilizer top-dressing until rain subsides.",
            })
        elif total_rain_3d >= 5:
            irrigation = "Light / Skip Irrigation — Expected showers (5–20 mm) will partially replenish topsoil moisture."
        else:
            irrigation = "Schedule Irrigation — Dry 72-hour window ahead. Irrigate early morning or evening (drip/furrow) to cut evaporation loss."

        if max_temp_3d >= 38:
            advisories.append({
                "category": "Heat Stress Alert",
                "level": "danger",
                "message": f"Peak temperatures near {max_temp_3d}°C. Apply light evening irrigation and organic mulch to protect flowering crops.",
            })
        elif days[0].temp_min_c <= 6:
            advisories.append({
                "category": "Frost / Cold Wave Alert",
                "level": "danger",
                "message": "Low night temperatures (<6°C) risk frost injury in Mustard, Potato, and Tomato. Give light irrigation at dusk.",
            })

        if avg_hum >= 75 and 18 <= current.get("temperature_c", 25) <= 30:
            pest_risk = "High (Fungal Blight & Sucking Pests)"
            advisories.append({
                "category": "Pest & Fungal Risk",
                "level": "warning",
                "message": "High humidity (>75%) + mild warmth strongly favor Early/Late Blight, Paddy Blast, and Aphids. Scout undersides of leaves.",
            })
        elif avg_hum >= 60:
            pest_risk = "Moderate"
        else:
            pest_risk = "Low"

        advisories.append({
            "category": "Spraying Guidance",
            "level": "info",
            "message": f"Today's spray status: {days[0].spray_suitability}. Ideal spray hours are 6:00–9:30 AM or 4:00–6:30 PM.",
        })

        return advisories, irrigation, pest_risk

    async def get_forecast(
        self,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        city: Optional[str] = None,
    ) -> WeatherAdvisoryResponse:
        location_name = city or "Selected Farm Location"
        if lat is None or lon is None:
            location_name, lat, lon = await self.geocode_city(city or "Kota")

        data_source = "Open-Meteo Live Free API"
        days: List[WeatherDay] = []
        current: Dict[str, Any] = {}

        try:
            url = "https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation",
                "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max",
                "timezone": "auto",
                "forecast_days": 7,
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(url, params=params)
                r.raise_for_status()
                payload = r.json()

            cur = payload["current"]
            current = {
                "temperature_c": round(float(cur["temperature_2m"]), 1),
                "humidity_pct": round(float(cur["relative_humidity_2m"]), 1),
                "wind_speed_kmh": round(float(cur["wind_speed_10m"]), 1),
                "precipitation_mm": round(float(cur.get("precipitation", 0.0)), 1),
                "condition": WMO_CODES.get(int(cur.get("weather_code", 0)), "Clear Sky"),
            }
            d = payload["daily"]
            for i in range(len(d["time"])):
                tmax = round(float(d["temperature_2m_max"][i]), 1)
                tmin = round(float(d["temperature_2m_min"][i]), 1)
                rain = round(float(d["precipitation_sum"][i] or 0.0), 1)
                rprob = round(float(d["precipitation_probability_max"][i] or 0.0), 1)
                wind = round(float(d["wind_speed_10m_max"][i] or 8.0), 1)
                hum = current["humidity_pct"] if i == 0 else round(min(92.0, max(35.0, current["humidity_pct"] + (rprob - 30) * 0.25)), 1)
                cond = WMO_CODES.get(int(d["weather_code"][i] or 0), "Partly Cloudy")
                days.append(
                    WeatherDay(
                        date=d["time"][i],
                        temp_max_c=tmax,
                        temp_min_c=tmin,
                        precipitation_mm=rain,
                        precipitation_prob_pct=rprob,
                        wind_speed_kmh=wind,
                        humidity_pct=hum,
                        condition=cond,
                        spray_suitability=self._classify_spray(rprob, wind, tmax),
                    )
                )
        except Exception:
            # Offline-safe seasonal climatology fallback
            data_source = "Climatology Fallback (Offline Mode)"
            today = date.today()
            current = {
                "temperature_c": 27.5,
                "humidity_pct": 58.0,
                "wind_speed_kmh": 9.4,
                "precipitation_mm": 0.0,
                "condition": "Partly Cloudy",
            }
            for i in range(7):
                dt = today + timedelta(days=i)
                tmax = round(28.5 + (i % 3) * 1.1, 1)
                tmin = round(15.2 + (i % 2) * 0.8, 1)
                rain = 6.5 if i == 3 else 0.0
                rprob = 45.0 if i == 3 else 12.0
                wind = 10.5 if i == 3 else 8.2
                hum = 72.0 if i == 3 else 56.0
                days.append(
                    WeatherDay(
                        date=dt.strftime("%Y-%m-%d"),
                        temp_max_c=tmax,
                        temp_min_c=tmin,
                        precipitation_mm=rain,
                        precipitation_prob_pct=rprob,
                        wind_speed_kmh=wind,
                        humidity_pct=hum,
                        condition="Light Showers" if rain > 0 else "Mainly Clear",
                        spray_suitability=self._classify_spray(rprob, wind, tmax),
                    )
                )

        advisories, irrigation, pest_risk = self._build_agri_advisories(days, current)
        return WeatherAdvisoryResponse(
            location_name=location_name,
            latitude=round(lat, 4),
            longitude=round(lon, 4),
            data_source=data_source,
            current=current,
            forecast_7d=days,
            agri_advisories=advisories,
            irrigation_recommendation=irrigation,
            pest_risk_level=pest_risk,
        )


weather_service = WeatherAdvisoryService()
