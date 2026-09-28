from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import json
import os


# ============================================================
# SkyGuard AI - FastAPI Backend
# ============================================================

app = FastAPI(
    title="SkyGuard AI",
    description="AI/ML-Based Intelligent Anomaly Detection for Automatic Weather Stations",
    version="1.0.0"
)


# ============================================================
# MODEL PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "model",
    "isolation_forest.pkl"
)

CONFIG_PATH = os.path.join(
    BASE_DIR,
    "model",
    "config.json"
)


# ============================================================
# LOAD MODEL
# ============================================================

model = None
config = {}
MODEL_LOADED = False
MODEL_ERROR = None

try:
    model = joblib.load(MODEL_PATH)

    with open(CONFIG_PATH, "r") as file:
        config = json.load(file)

    MODEL_LOADED = True

except Exception as e:
    MODEL_ERROR = str(e)


# ============================================================
# INPUT SCHEMA
# ============================================================

class WeatherReading(BaseModel):
    Temperature_C: float
    Pressure_hPa: float
    Humidity_percent: float
    Rain_mm: float = 0.0
    WindSpeed_kmh: float = 0.0


class WeatherHistory(BaseModel):
    readings: list[WeatherReading]


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "project": "SkyGuard AI",
        "status": "Backend is running",
        "model_loaded": MODEL_LOADED
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health():

    response = {
        "status": "healthy" if MODEL_LOADED else "model_error",
        "model_loaded": MODEL_LOADED
    }

    if MODEL_ERROR:
        response["model_error"] = MODEL_ERROR

    return response


# ============================================================
# MODEL INFORMATION
# ============================================================

@app.get("/api/model-info")
def model_info():

    if not MODEL_LOADED:
        raise HTTPException(
            status_code=500,
            detail="ML model could not be loaded."
        )

    return {
        "model_name": config.get(
            "model_name",
            "SkyGuard AI Isolation Forest"
        ),
        "model_type": config.get(
            "model_type",
            "IsolationForest"
        ),
        "n_estimators": config.get(
            "n_estimators",
            200
        ),
        "threshold": config.get("threshold"),
        "feature_count": len(
            config.get("features", [])
        ),
        "features": config.get("features", [])
    }


# ============================================================
# WEATHER HISTORY
# ============================================================

@app.post("/api/weather/history")
def weather_history(data: WeatherHistory):

    if len(data.readings) == 0:
        raise HTTPException(
            status_code=400,
            detail="At least one weather reading is required."
        )

    latest = data.readings[-1]

    return {
        "status": "received",
        "records_received": len(data.readings),
        "latest_reading": latest.model_dump(),
        "message": (
            "Weather history received. "
            "The exact training-time feature engineering "
            "will be connected before ML prediction."
        )
    }


# ============================================================
# CURRENT WEATHER
# ============================================================

@app.post("/api/weather")
def current_weather(data: WeatherReading):

    return {
        "status": "received",
        "weather": data.model_dump()
    }


# ============================================================
# PREDICTION
# ============================================================

@app.post("/api/predict")
def predict(data: WeatherHistory):

    if not MODEL_LOADED:
        raise HTTPException(
            status_code=500,
            detail="ML model could not be loaded."
        )

    if len(data.readings) < 24:
        raise HTTPException(
            status_code=400,
            detail=(
                "At least 24 hourly readings are required "
                "for the 24-hour rolling features used by "
                "the trained model."
            )
        )

    return {
        "status": "ready",
        "records_received": len(data.readings),
        "message": (
            "History contains enough records for temporal "
            "feature engineering. Exact training-time "
            "15-feature pipeline will be connected next."
        )
    }
