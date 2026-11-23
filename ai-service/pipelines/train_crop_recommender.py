"""
Smart Crop Recommendation ML Training Pipeline.
Trains a multi-class classifier on (N, P, K, Temperature, Humidity, pH, Rainfall)
across 14 major Indian crops with agronomy-grounded feature distributions.

Uses RandomForestClassifier when scikit-learn is installed, and a standardized
Gaussian Naive Bayes + Mahalanobis-weighted ensemble (NumPy) otherwise.
"""

import json
import pickle
from pathlib import Path
from typing import Dict, Any, List

import numpy as np

try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models_store"

# (crop, season, yield_qtl_acre, modal_price_qtl, input_cost_acre, N, P, K, Temp, Hum, pH, Rain)
CROP_PROFILES = [
    ("Rice (Paddy)", "Kharif", 22.0, 2350, 21000, (90, 18), (45, 10), (42, 10), (27, 3.5), (82, 6), (6.3, 0.5), (1400, 320)),
    ("Wheat", "Rabi", 19.5, 2325, 16500, (110, 18), (55, 10), (40, 8), (18, 3.0), (58, 8), (6.9, 0.4), (380, 90)),
    ("Mustard", "Rabi", 8.5, 5650, 12500, (75, 14), (38, 8), (35, 8), (19, 3.2), (52, 8), (7.1, 0.5), (320, 80)),
    ("Cotton", "Kharif", 9.0, 7100, 24000, (115, 18), (50, 10), (45, 10), (30, 3.5), (65, 8), (7.2, 0.5), (720, 160)),
    ("Soybean", "Kharif", 8.0, 4850, 13000, (35, 10), (62, 10), (42, 8), (27, 3.0), (72, 7), (6.6, 0.4), (820, 160)),
    ("Maize", "Kharif/Rabi", 21.0, 2150, 15000, (100, 16), (52, 10), (40, 8), (25, 3.5), (68, 8), (6.5, 0.5), (680, 140)),
    ("Sugarcane", "Annual", 340.0, 340, 48000, (160, 22), (70, 12), (75, 15), (29, 3.2), (78, 7), (6.8, 0.5), (1250, 240)),
    ("Chickpea (Chana)", "Rabi", 7.5, 5500, 11000, (30, 8), (58, 10), (40, 8), (20, 3.0), (45, 8), (7.0, 0.5), (300, 75)),
    ("Groundnut", "Kharif", 9.5, 6300, 17500, (32, 9), (55, 10), (45, 8), (29, 3.0), (62, 8), (6.4, 0.4), (620, 130)),
    ("Potato", "Rabi", 95.0, 1400, 38000, (130, 18), (75, 12), (90, 15), (18, 2.8), (72, 7), (5.8, 0.4), (480, 100)),
    ("Tomato", "All Season", 120.0, 1650, 42000, (115, 18), (72, 12), (75, 14), (24, 3.0), (68, 7), (6.3, 0.4), (650, 130)),
    ("Onion", "Rabi/Kharif", 85.0, 1900, 34000, (100, 15), (55, 10), (65, 12), (23, 3.2), (60, 8), (6.5, 0.4), (550, 110)),
    ("Pearl Millet (Bajra)", "Kharif", 10.5, 2500, 9500, (55, 12), (30, 8), (30, 8), (33, 3.5), (42, 8), (7.5, 0.5), (360, 95)),
    ("Pigeon Pea (Tur/Arhar)", "Kharif", 6.5, 7200, 12500, (28, 8), (50, 10), (35, 8), (28, 3.0), (60, 8), (6.7, 0.5), (650, 140)),
]


def generate_training_data(samples_per_crop: int = 180):
    rng = np.random.default_rng(42)
    X_rows: List[np.ndarray] = []
    y_rows: List[int] = []
    for idx, prof in enumerate(CROP_PROFILES):
        dists = prof[5:]
        cols = [rng.normal(mean, std, size=samples_per_crop) for mean, std in dists]
        block = np.column_stack(cols)
        # Clip to realistic agronomic bounds
        block[:, 0] = np.clip(block[:, 0], 5, 240)   # N
        block[:, 1] = np.clip(block[:, 1], 5, 150)   # P
        block[:, 2] = np.clip(block[:, 2], 5, 200)   # K
        block[:, 3] = np.clip(block[:, 3], 5, 48)    # Temp
        block[:, 4] = np.clip(block[:, 4], 15, 98)   # Humidity
        block[:, 5] = np.clip(block[:, 5], 4.2, 9.0) # pH
        block[:, 6] = np.clip(block[:, 6], 100, 3000)# Rainfall
        X_rows.append(block)
        y_rows.extend([idx] * samples_per_crop)
    return np.vstack(X_rows), np.array(y_rows, dtype=np.int64)


def train_crop_recommender(models_dir: Path = MODELS_DIR) -> Dict[str, Any]:
    models_dir.mkdir(parents=True, exist_ok=True)
    X, y = generate_training_data(samples_per_crop=180)
    rng = np.random.default_rng(123)
    perm = rng.permutation(len(X))
    X, y = X[perm], y[perm]

    split = int(len(X) * 0.8)
    X_train, X_val = X[:split], X[split:]
    y_train, y_val = y[:split], y[split:]

    if HAS_SKLEARN:
        engine = "RandomForestClassifier"
        clf = RandomForestClassifier(n_estimators=160, max_depth=14, random_state=42)
        clf.fit(X_train, y_train)
        val_acc = float(np.mean(clf.predict(X_val) == y_val))
        clf.fit(X, y)
        model_payload = {"engine": engine, "rf_model": clf}
    else:
        engine = "GaussianNaiveBayes"
        means = []
        variances = []
        for idx in range(len(CROP_PROFILES)):
            sub = X_train[y_train == idx]
            means.append(sub.mean(axis=0))
            variances.append(sub.var(axis=0) + 1e-4)
        means_arr = np.array(means)
        vars_arr = np.array(variances)

        # Evaluate validation accuracy
        log_probs = []
        for idx in range(len(CROP_PROFILES)):
            lp = -0.5 * np.sum(np.log(2.0 * np.pi * vars_arr[idx]) + ((X_val - means_arr[idx]) ** 2) / vars_arr[idx], axis=1)
            log_probs.append(lp)
        preds = np.argmax(np.column_stack(log_probs), axis=1)
        val_acc = float(np.mean(preds == y_val))

        # Fit on full dataset
        full_means = np.array([X[y == i].mean(axis=0) for i in range(len(CROP_PROFILES))])
        full_vars = np.array([X[y == i].var(axis=0) + 1e-4 for i in range(len(CROP_PROFILES))])
        model_payload = {
            "engine": engine,
            "means": full_means.tolist(),
            "variances": full_vars.tolist(),
        }

    metadata = [
        {
            "crop": p[0],
            "season": p[1],
            "yield_qtl_acre": p[2],
            "modal_price_qtl": p[3],
            "input_cost_acre": p[4],
            "ideal_ph": p[10][0],
            "ideal_rain": p[11][0],
        }
        for p in CROP_PROFILES
    ]
    metrics = {
        "engine": engine,
        "num_crops": len(CROP_PROFILES),
        "training_samples": int(len(X)),
        "validation_accuracy": round(val_acc, 4),
    }
    artifact = {
        "metrics": metrics,
        "metadata": metadata,
        "model": model_payload,
    }
    with (models_dir / "crop_recommender.pkl").open("wb") as f:
        pickle.dump(artifact, f)
    (models_dir / "crop_metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(f"Trained Crop Recommender ({engine}): {metrics}")
    return metrics


if __name__ == "__main__":
    train_crop_recommender()
