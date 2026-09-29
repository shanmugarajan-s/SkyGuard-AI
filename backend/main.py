from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import json
import os
import pandas as pd
import numpy as np


# ============================================================
# SkyGuard AI - FastAPI Backend
# Actual ML Inference API
# ============================================================

app = FastAPI(
    title="SkyGuard AI",
    description=(
        "AI/ML-Based Intelligent Anomaly Detection "
        "for Automatic Weather Stations"
    ),
    version="1.1.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# PATHS
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
# MODEL SETTINGS
# ============================================================

THRESHOLD = config.get(
    "threshold",
    0.045255535895246286
)

FEATURES = config.get(
    "features",
    [
        "Temperature_C",
        "Pressure_hPa",
        "Humidity_percent",

        "Temperature_C_Missing",
        "Pressure_hPa_Missing",
        "Humidity_percent_Missing",

        "Temperature_C_Delta",
        "Pressure_hPa_Delta",
        "Humidity_percent_Delta",

        "Temperature_C_RollingMean_24h",
        "Temperature_C_RollingStd_24h",

        "Pressure_hPa_RollingMean_24h",
        "Pressure_hPa_RollingStd_24h",

        "Humidity_percent_RollingMean_24h",
        "Humidity_percent_RollingStd_24h"
    ]
)


# ============================================================
# INPUT SCHEMAS
# ============================================================

class WeatherReading(BaseModel):

    Timestamp: str | None = None

    Temperature_C: float | None = None

    Pressure_hPa: float | None = None

    Humidity_percent: float | None = None

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
        "model_loaded": MODEL_LOADED,
        "version": "1.1.0"
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

        "contamination": config.get(
            "contamination",
            "auto"
        ),

        "threshold": THRESHOLD,

        "feature_count": len(FEATURES),

        "features": FEATURES,

        "confidence_note": config.get(
            "confidence_note",
            "Confidence score is a heuristic engineering score."
        ),

        "validation_note": config.get(
            "validation_note",
            "Prototype validation using synthetic anomaly injections."
        )
    }


# ============================================================
# FEATURE ENGINEERING
# ============================================================

def create_features(readings):

    # --------------------------------------------------------
    # Convert input to DataFrame
    # --------------------------------------------------------

    records = []

    for reading in readings:

        records.append(
            reading.model_dump()
        )

    df = pd.DataFrame(records)

    # --------------------------------------------------------
    # Sort chronologically
    # --------------------------------------------------------

    if "Timestamp" in df.columns:

        df["Timestamp"] = pd.to_datetime(
            df["Timestamp"],
            errors="coerce"
        )

        if df["Timestamp"].notna().any():

            df = df.sort_values(
                "Timestamp"
            ).reset_index(drop=True)

    # --------------------------------------------------------
    # Make sure required columns exist
    # --------------------------------------------------------

    required = [
        "Temperature_C",
        "Pressure_hPa",
        "Humidity_percent"
    ]

    for column in required:

        if column not in df.columns:

            df[column] = np.nan

    # --------------------------------------------------------
    # Missing indicators
    # --------------------------------------------------------

    df["Temperature_C_Missing"] = (
        df["Temperature_C"]
        .isna()
        .astype(int)
    )

    df["Pressure_hPa_Missing"] = (
        df["Pressure_hPa"]
        .isna()
        .astype(int)
    )

    df["Humidity_percent_Missing"] = (
        df["Humidity_percent"]
        .isna()
        .astype(int)
    )

    # --------------------------------------------------------
    # Fill base sensor values
    # --------------------------------------------------------

    df[
        [
            "Temperature_C",
            "Pressure_hPa",
            "Humidity_percent"
        ]
    ] = (
        df[
            [
                "Temperature_C",
                "Pressure_hPa",
                "Humidity_percent"
            ]
        ]
        .ffill()
        .bfill()
    )

    # --------------------------------------------------------
    # Delta features
    # --------------------------------------------------------

    df["Temperature_C_Delta"] = (
        df["Temperature_C"].diff()
    )

    df["Pressure_hPa_Delta"] = (
        df["Pressure_hPa"].diff()
    )

    df["Humidity_percent_Delta"] = (
        df["Humidity_percent"].diff()
    )

    # --------------------------------------------------------
    # 24-hour rolling features
    # --------------------------------------------------------

    df["Temperature_C_RollingMean_24h"] = (
        df["Temperature_C"]
        .rolling(
            window=24,
            min_periods=1
        )
        .mean()
    )

    df["Temperature_C_RollingStd_24h"] = (
        df["Temperature_C"]
        .rolling(
            window=24,
            min_periods=2
        )
        .std()
    )

    df["Pressure_hPa_RollingMean_24h"] = (
        df["Pressure_hPa"]
        .rolling(
            window=24,
            min_periods=1
        )
        .mean()
    )

    df["Pressure_hPa_RollingStd_24h"] = (
        df["Pressure_hPa"]
        .rolling(
            window=24,
            min_periods=2
        )
        .std()
    )

    df["Humidity_percent_RollingMean_24h"] = (
        df["Humidity_percent"]
        .rolling(
            window=24,
            min_periods=1
        )
        .mean()
    )

    df["Humidity_percent_RollingStd_24h"] = (
        df["Humidity_percent"]
        .rolling(
            window=24,
            min_periods=2
        )
        .std()
    )

    # --------------------------------------------------------
    # Fill feature NaN values
    # --------------------------------------------------------

    df = df.ffill().bfill()

    # --------------------------------------------------------
    # Safety check
    # --------------------------------------------------------

    missing_features = [
        feature
        for feature in FEATURES
        if feature not in df.columns
    ]

    if missing_features:

        raise ValueError(
            "Missing model features: "
            + ", ".join(missing_features)
        )

    X = df[FEATURES].copy()

    return df, X


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

        "records_received": len(
            data.readings
        ),

        "latest_reading": latest.model_dump(),

        "message": (
            "Weather history received successfully."
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
# ACTUAL ML PREDICTION
# ============================================================

@app.post("/api/predict")
def predict(data: WeatherHistory):

    # --------------------------------------------------------
    # Check model
    # --------------------------------------------------------

    if not MODEL_LOADED:

        raise HTTPException(
            status_code=500,
            detail="ML model could not be loaded."
        )

    # --------------------------------------------------------
    # Minimum history
    # --------------------------------------------------------

    if len(data.readings) < 24:

        raise HTTPException(
            status_code=400,
            detail=(
                "At least 24 hourly readings are required "
                "for the 24-hour temporal features."
            )
        )

    try:

        # ----------------------------------------------------
        # Feature engineering
        # ----------------------------------------------------

        df, X = create_features(
            data.readings
        )

        # ----------------------------------------------------
        # Isolation Forest
        # ----------------------------------------------------

        decision_scores = model.decision_function(
            X
        )

        # Convert sklearn decision score
        # so higher value = more anomalous

        anomaly_scores = -decision_scores

        # ----------------------------------------------------
        # Threshold-based prediction
        # ----------------------------------------------------

        predictions = (
            anomaly_scores >= THRESHOLD
        ).astype(int)

        # ----------------------------------------------------
        # Add results
        # ----------------------------------------------------

        df["Anomaly_Score"] = anomaly_scores

        df["Anomaly"] = predictions

        df["Status"] = np.where(
            predictions == 1,
            "ANOMALY",
            "NORMAL"
        )

        # ----------------------------------------------------
        # Latest reading
        # ----------------------------------------------------

        latest = df.iloc[-1]

        latest_result = {

            "status": latest["Status"],

            "anomaly": bool(
                latest["Anomaly"]
            ),

            "anomaly_score": float(
                latest["Anomaly_Score"]
            ),

            "threshold": float(
                THRESHOLD
            ),

            "Temperature_C": float(
                latest["Temperature_C"]
            ),

            "Pressure_hPa": float(
                latest["Pressure_hPa"]
            ),

            "Humidity_percent": float(
                latest["Humidity_percent"]
            )
        }

        # ----------------------------------------------------
        # Summary
        # ----------------------------------------------------

        anomaly_count = int(
            predictions.sum()
        )

        normal_count = int(
            len(predictions) - anomaly_count
        )

        anomaly_percentage = (
            anomaly_count
            / len(predictions)
            * 100
        )

        # ----------------------------------------------------
        # Return response
        # ----------------------------------------------------

        return {

            "status": "prediction_successful",

            "records_processed": len(
                predictions
            ),

            "anomalies_detected": anomaly_count,

            "normal_records": normal_count,

            "anomaly_percentage": round(
                anomaly_percentage,
                2
            ),

            "threshold": float(
                THRESHOLD
            ),

            "latest_prediction": latest_result,

            "message": (
                "Isolation Forest anomaly detection "
                "completed successfully."
            )
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Prediction failed: "
                + str(e)
            )
        )


# ============================================================
# ALL ANOMALY RESULTS
# ============================================================

@app.post("/api/anomalies")
def anomalies(data: WeatherHistory):

    if not MODEL_LOADED:

        raise HTTPException(
            status_code=500,
            detail="ML model could not be loaded."
        )

    if len(data.readings) < 24:

        raise HTTPException(
            status_code=400,
            detail=(
                "At least 24 hourly readings are required."
            )
        )

    try:

        df, X = create_features(
            data.readings
        )

        decision_scores = model.decision_function(
            X
        )

        anomaly_scores = -decision_scores

        predictions = (
            anomaly_scores >= THRESHOLD
        ).astype(int)

        results = []

        for index in range(
            len(df)
        ):

            row = df.iloc[index]

            result = {

                "timestamp": (
                    str(row["Timestamp"])
                    if pd.notna(row["Timestamp"])
                    else None
                ),

                "temperature_c": round(
                    float(row["Temperature_C"]),
                    2
                ),

                "pressure_hpa": round(
                    float(row["Pressure_hPa"]),
                    2
                ),

                "humidity_percent": round(
                    float(row["Humidity_percent"]),
                    2
                ),

                "anomaly_score": round(
                    float(anomaly_scores[index]),
                    6
                ),

                "anomaly": bool(
                    predictions[index]
                ),

                "status": (
                    "ANOMALY"
                    if predictions[index] == 1
                    else "NORMAL"
                )
            }

            results.append(result)

        return {

            "status": "success",

            "records_processed": len(
                results
            ),

            "threshold": float(
                THRESHOLD
            ),

            "anomalies_detected": int(
                predictions.sum()
            ),

            "results": results
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Anomaly detection failed: "
                + str(e)
            )
        )
