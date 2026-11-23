"""
Generates a realistic sample India Commodity Wise Mandi Dataset CSV matching the exact
10-column schema of the Kaggle dataset:
https://www.kaggle.com/datasets/vandeetshah/india-commodity-wise-mandi-dataset

Columns:
  State Name, District Name, Market Name, Variety, Group,
  Arrivals (Tonnes), Min Price (Rs./Quintal), Max Price (Rs./Quintal),
  Modal Price (Rs./Quintal), Reported Date

To train on the full 2000-2024 Kaggle dataset, simply download the Kaggle CSV(s) into
ai-service/data/ and run:
  python pipelines/train_mandi_price_model.py --data ./data/<your_kaggle_file_or_dir>
"""

import csv
import math
import random
from datetime import date, timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_CSV = BASE_DIR / "data" / "mandi_sample.csv"

SERIES_SPECS = [
    # (State, District, Market, Commodity, Variety, Group, BasePrice, TrendPerYear, Amp, PeakMonth, BaseArrivals)
    ("Rajasthan", "Kota", "Kota (FV)", "Wheat", "Lokwan", "Cereals", 2250, 95, 190, 2, 420),
    ("Rajasthan", "Kota", "Ramganj Mandi", "Mustard", "Mustard", "Oil Seeds", 5400, 140, 480, 11, 310),
    ("Rajasthan", "Kota", "Kota (FV)", "Soybean", "Yellow", "Oil Seeds", 4650, 110, 420, 9, 360),
    ("Rajasthan", "Jaipur", "Jaipur (F&V)", "Onion", "Red", "Vegetables", 1950, 85, 780, 10, 520),
    ("Maharashtra", "Nashik", "Lasalgaon", "Onion", "Red", "Vegetables", 1850, 90, 850, 10, 1450),
    ("Maharashtra", "Pune", "Pune", "Tomato", "Hybrid", "Vegetables", 1700, 75, 920, 7, 680),
    ("Maharashtra", "Nagpur", "Nagpur", "Cotton", "H-4(A) 27mm", "Fibre Crops", 6800, 180, 520, 12, 540),
    ("Uttar Pradesh", "Agra", "Agra", "Potato", "Desi", "Vegetables", 1350, 60, 460, 10, 890),
    ("Uttar Pradesh", "Lucknow", "Lucknow", "Rice", "Common", "Cereals", 2650, 105, 220, 8, 610),
    ("Uttar Pradesh", "Meerut", "Meerut", "Wheat", "Dara", "Cereals", 2300, 95, 185, 2, 740),
    ("Punjab", "Ludhiana", "Ludhiana", "Wheat", "Sharbati", "Cereals", 2320, 100, 170, 2, 980),
    ("Punjab", "Amritsar", "Amritsar", "Rice", "Basmati 1121", "Cereals", 3850, 150, 390, 9, 640),
    ("Madhya Pradesh", "Indore", "Indore", "Soybean", "Yellow", "Oil Seeds", 4700, 115, 430, 9, 820),
    ("Madhya Pradesh", "Sehore", "Sehore", "Wheat", "Sharbati", "Cereals", 2850, 120, 240, 2, 460),
    ("Madhya Pradesh", "Ujjain", "Ujjain", "Chana", "Desi", "Pulses", 5350, 155, 380, 1, 380),
    ("Gujarat", "Rajkot", "Rajkot", "Cotton", "Shankar-6", "Fibre Crops", 7150, 190, 560, 12, 710),
    ("Gujarat", "Junagadh", "Junagadh", "Groundnut", "Bold", "Oil Seeds", 6150, 160, 450, 10, 490),
    ("Karnataka", "Bengaluru", "Binny Mill (F&V)", "Tomato", "Local", "Vegetables", 1650, 70, 880, 7, 790),
    ("Haryana", "Karnal", "Karnal", "Rice", "PR-126", "Cereals", 2420, 95, 210, 8, 720),
    ("West Bengal", "Hooghly", "Sheoraphuli", "Potato", "Jyoti", "Vegetables", 1420, 65, 440, 10, 950),
]


def generate_dataset(output_path: Path = OUTPUT_CSV) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    rng = random.Random(42)

    start_date = date(2020, 1, 1)
    end_date = date(2024, 2, 1)
    headers = [
        "State Name",
        "District Name",
        "Market Name",
        "Commodity",
        "Variety",
        "Group",
        "Arrivals (Tonnes)",
        "Min Price (Rs./Quintal)",
        "Max Price (Rs./Quintal)",
        "Modal Price (Rs./Quintal)",
        "Reported Date",
    ]

    rows = []
    for (
        state,
        district,
        market,
        commodity,
        variety,
        group,
        base_price,
        trend_yr,
        amp,
        peak_month,
        base_arrivals,
    ) in SERIES_SPECS:
        cur = start_date
        ar_noise = 0.0
        while cur <= end_date:
            years_elapsed = (cur - start_date).days / 365.25
            phase = 2.0 * math.pi * ((cur.month - peak_month) / 12.0)
            seasonal = amp * math.cos(phase)
            # Autocorrelated market shock
            ar_noise = 0.72 * ar_noise + rng.gauss(0, base_price * 0.025)
            modal = max(450.0, base_price + trend_yr * years_elapsed + seasonal + ar_noise)
            spread = modal * rng.uniform(0.05, 0.11)
            min_p = max(300.0, modal - spread * rng.uniform(0.7, 1.1))
            max_p = modal + spread * rng.uniform(0.8, 1.2)
            # Arrivals inversely correlated with price spikes
            arrivals = max(
                15.0,
                base_arrivals * (1.0 - 0.35 * math.cos(phase)) * rng.uniform(0.8, 1.22),
            )
            rows.append([
                state,
                district,
                market,
                commodity,
                variety,
                group,
                round(arrivals, 2),
                round(min_p, 2),
                round(max_p, 2),
                round(modal, 2),
                cur.strftime("%Y-%m-%d"),
            ])
            cur += timedelta(days=7)

    with output_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

    print(f"Generated {len(rows)} mandi rows across {len(SERIES_SPECS)} markets -> {output_path}")
    return output_path


if __name__ == "__main__":
    generate_dataset()
