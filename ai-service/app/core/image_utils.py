"""Computer Vision utilities for leaf image preprocessing and lesion diagnostics."""

import io
from typing import Dict, Tuple
import numpy as np
from PIL import Image

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False


def load_rgb_image(image_bytes: bytes) -> Image.Image:
    """Safely decode uploaded bytes into an RGB PIL image."""
    img = Image.open(io.BytesIO(image_bytes))
    if img.mode != "RGB":
        img = img.convert("RGB")
    return img


def preprocess_for_vision(img: Image.Image, size: Tuple[int, int] = (224, 224)) -> Image.Image:
    """Resize and optionally apply CLAHE contrast normalization for clearer leaf lesions."""
    resized = img.resize(size, Image.Resampling.BILINEAR)
    if not HAS_CV2:
        return resized
    arr = np.array(resized)
    lab = cv2.cvtColor(arr, cv2.COLOR_RGB2LAB)
    l_chan, a_chan, b_chan = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l_chan)
    merged = cv2.merge((cl, a_chan, b_chan))
    enhanced = cv2.cvtColor(merged, cv2.COLOR_LAB2RGB)
    return Image.fromarray(enhanced)


def analyze_leaf_visual_health(img: Image.Image) -> Dict[str, float]:
    """
    HSV-based colorimetric lesion analyzer.
    Measures healthy chlorophyll green, chlorosis (yellowing), and necrosis (brown/dark lesions).
    Works offline and augments Deep Learning predictions with quantitative severity metrics.
    """
    w, h = img.size
    small = img.resize((224, 224), Image.Resampling.BILINEAR)
    rgb = np.array(small, dtype=np.uint8)

    if HAS_CV2:
        hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
        h_ch = hsv[:, :, 0].astype(np.float32) * 2.0  # 0..360
        s_ch = hsv[:, :, 1].astype(np.float32) / 255.0
        v_ch = hsv[:, :, 2].astype(np.float32) / 255.0
    else:
        arr = rgb.astype(np.float32) / 255.0
        mx = arr.max(axis=2)
        mn = arr.min(axis=2)
        df = mx - mn + 1e-6
        h_ch = np.zeros_like(mx)
        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
        mask_r = (mx == r)
        mask_g = (mx == g) & ~mask_r
        mask_b = ~mask_r & ~mask_g
        h_ch[mask_r] = (60.0 * ((g[mask_r] - b[mask_r]) / df[mask_r])) % 360.0
        h_ch[mask_g] = (60.0 * ((b[mask_g] - r[mask_g]) / df[mask_g]) + 120.0) % 360.0
        h_ch[mask_b] = (60.0 * ((r[mask_b] - g[mask_b]) / df[mask_b]) + 240.0) % 360.0
        s_ch = np.where(mx > 0, (mx - mn) / (mx + 1e-6), 0.0)
        v_ch = mx

    # Foreground plant tissue mask (exclude pure white/gray studio background)
    plant_mask = (s_ch > 0.12) & (v_ch > 0.08) & (v_ch < 0.96)
    total_plant = float(np.sum(plant_mask))
    if total_plant < 50:
        total_plant = float(rgb.shape[0] * rgb.shape[1])
        plant_mask = np.ones((rgb.shape[0], rgb.shape[1]), dtype=bool)

    green_mask = plant_mask & (h_ch >= 65) & (h_ch <= 165) & (v_ch >= 0.18)
    yellow_mask = plant_mask & (h_ch >= 32) & (h_ch < 65) & (s_ch >= 0.22)
    brown_mask = plant_mask & (((h_ch >= 5) & (h_ch < 32)) | (v_ch < 0.22))

    green_ratio = round(float(np.sum(green_mask)) / total_plant, 4)
    yellow_ratio = round(float(np.sum(yellow_mask)) / total_plant, 4)
    brown_ratio = round(float(np.sum(brown_mask)) / total_plant, 4)

    affected_pct = round(min(100.0, (yellow_ratio * 0.85 + brown_ratio * 1.15) * 100.0), 1)

    return {
        "green_health_ratio": green_ratio,
        "chlorosis_yellow_ratio": yellow_ratio,
        "necrosis_brown_ratio": brown_ratio,
        "estimated_affected_area_pct": affected_pct,
        "image_resolution": f"{w}x{h}",
    }
