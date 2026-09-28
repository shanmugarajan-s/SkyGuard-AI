from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import json
import numpy as np
import os


# --------------------------------------------------
# FastAPI Application
# --------------------------------------------------

app = FastAPI(
    title="SkyGuard AI",
    description="AI/ML-Based Intelligent Anomaly Detection for Automatic Weather Stations",
    version="1.0.0"
)


# --------------------------------------------------
# Model Paths
# --------------------------------------------------

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


# --------------------------------------------------
# Load Model
# --------------------------------------------------

try:
    model = joblib.load(MODEL_PATH)

    with open(CONFIG_PATH, "r") as f:
        config = json.load(f)

    MODEL_LOADED = True

except Exception as e:
    model = None
    config = {}
    MODEL_LOADED = False
    MODEL_ERROR = str(e)


# --------------------------------------------------
# Input Data Schema
# --------------------------------------------------

class WeatherData(BaseModel):
    Temperature_C: float
    Pressure_hPa: float
    Humidity_percent: float


# --------------------------------------------------
# Root Endpoint
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "project": "SkyGuard AI",
        "status": "Backend is running",
        "model_loaded": MODEL_LOADED
    }


# --------------------------------------------------
# Health Check
# --------------------------------------------------

@app.get("/api/health")
def health():

    response = {
        "status": "healthy",
        "model_loaded": MODEL_LOADED
    }

    if not MODEL_LOADED:
        response["model_error"] = MODEL_ERROR

    return response


# --------------------------------------------------
# Model Information
# --------------------------------------------------

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
        "threshold": config.get(
            "threshold"
        ),
        "features": config.get(
            "features",
            []
        )
    }


# --------------------------------------------------
# Prediction Endpoint
# --------------------------------------------------

@app.post("/api/predict")
def predict(data: WeatherData):

    if not MODEL_LOADED:
        raise HTTPException(
            status_code=500,
            detail="ML model could not be loaded."
        )

    # --------------------------------------------------
    # IMPORTANT
    # --------------------------------------------------
    # This endpoint is currently a basic deployment test.
    # The trained model expects 15 engineered features.
    # We will add the complete temporal feature
    # engineering pipeline in the next step.

    return {
        "status": "received",
        "message": "Weather data received successfully.",
        "weather": {
            "Temperature_C": data.Temperature_C,
            "Pressure_hPa": data.Pressure_hPa,
            "Humidity_percent": data.Humidity_percent
        },
        "next_step": "Complete 15-feature anomaly inference pipeline"
    }
