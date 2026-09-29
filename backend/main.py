from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel
from typing import List, Optional

import pandas as pd
import numpy as np
import joblib
import json
import requests
import os


# =========================================================
# SKYGUARD AI - FASTAPI BACKEND
# =========================================================

app = FastAPI(
    title="SkyGuard AI",
    description=(
        "AI/ML-Based Intelligent Anomaly Detection "
        "for Automatic Weather Stations"
    ),
   version="1.3.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# PATHS
# =========================================================

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


# =========================================================
# LOAD MODEL
# =========================================================

model = None
model_loaded = False

try:
    model = joblib.load(MODEL_PATH)
    model_loaded = True
    print("Isolation Forest model loaded successfully.")

except Exception as e:
    print("Model loading error:", e)


# =========================================================
# LOAD CONFIG
# =========================================================

try:

    with open(CONFIG_PATH, "r") as file:
        config = json.load(file)

except Exception as e:

    print("Config loading error:", e)
    config = {}


# =========================================================
# MODEL SETTINGS
# =========================================================

THRESHOLD = config.get(
    "threshold",
    0.045255535895246286
)


FEATURES = [
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


# =========================================================
# PROTOTYPE AWS LOCATION
# =========================================================

STATION_NAME = "AWS_COIMBATORE_TARGET"

LATITUDE = 11.0168
LONGITUDE = 76.9558


# =========================================================
# INPUT MODELS
# =========================================================

class WeatherReading(BaseModel):

    Timestamp: Optional[str] = None

    Temperature_C: float
    Pressure_hPa: float
    Humidity_percent: float

    Rain_mm: Optional[float] = 0.0
    WindSpeed_kmh: Optional[float] = 0.0


class WeatherHistory(BaseModel):

    records: List[WeatherReading]


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():

    return {
        "project": "SkyGuard AI",
        "status": "Backend is running",
        "model_loaded": model_loaded,
        "version": "1.2.0"
    }


# =========================================================
# HEALTH
# =========================================================

@app.get("/health")
@app.get("/api/health")
def health():

    return {
        "status": "healthy",
        "model_loaded": model_loaded
    }


# =========================================================
# MODEL INFO
# =========================================================

@app.get("/api/model-info")
def model_info():

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

        "features": FEATURES,

        "feature_count": len(FEATURES),

        "confidence_note": config.get(
            "confidence_note",
            "Confidence score is a heuristic engineering score."
        ),

        "validation_note": config.get(
            "validation_note",
            "Prototype validation using synthetic anomaly injections."
        )
    }


# =========================================================
# OPEN-METEO WEATHER
# =========================================================

def fetch_open_meteo_weather():

    url = "https://api.open-meteo.com/v1/forecast"

    params = {

        "latitude": LATITUDE,

        "longitude": LONGITUDE,

        "hourly": (
            "temperature_2m,"
            "relativehumidity_2m,"
            "surface_pressure,"
            "rain,"
            "windspeed_10m"
        ),

        "past_days": 2,

        "forecast_days": 1,

        "timezone": "Asia/Kolkata"
    }

    response = requests.get(
        url,
        params=params,
        timeout=20
    )

    response.raise_for_status()

    data = response.json()

    hourly = data["hourly"]

    weather_df = pd.DataFrame({

        "Timestamp": hourly["time"],

        "Temperature_C":
            hourly["temperature_2m"],

        "Pressure_hPa":
            hourly["surface_pressure"],

        "Humidity_percent":
            hourly["relativehumidity_2m"],

        "Rain_mm":
            hourly["rain"],

        "WindSpeed_kmh":
            hourly["windspeed_10m"]
    })

    return weather_df


# =========================================================
# FEATURE ENGINEERING
# =========================================================

def create_features(df):

    data = df.copy()

    # -----------------------------------------------------
    # Timestamp
    # -----------------------------------------------------

    data["Timestamp"] = pd.to_datetime(
        data["Timestamp"],
        errors="coerce"
    )

    data = data.sort_values(
        "Timestamp"
    ).reset_index(drop=True)

    # -----------------------------------------------------
    # Missing indicators
    # -----------------------------------------------------

    data["Temperature_C_Missing"] = (
        data["Temperature_C"]
        .isna()
        .astype(int)
    )

    data["Pressure_hPa_Missing"] = (
        data["Pressure_hPa"]
        .isna()
        .astype(int)
    )

    data["Humidity_percent_Missing"] = (
        data["Humidity_percent"]
        .isna()
        .astype(int)
    )

    # -----------------------------------------------------
    # Fill missing sensor values
    # -----------------------------------------------------

    sensor_columns = [
        "Temperature_C",
        "Pressure_hPa",
        "Humidity_percent"
    ]

    data[sensor_columns] = (
        data[sensor_columns]
        .ffill()
        .bfill()
    )

    # -----------------------------------------------------
    # Delta features
    # -----------------------------------------------------

    data["Temperature_C_Delta"] = (
        data["Temperature_C"].diff()
    )

    data["Pressure_hPa_Delta"] = (
        data["Pressure_hPa"].diff()
    )

    data["Humidity_percent_Delta"] = (
        data["Humidity_percent"].diff()
    )

    # -----------------------------------------------------
    # Rolling features
    # -----------------------------------------------------

    data["Temperature_C_RollingMean_24h"] = (
        data["Temperature_C"]
        .rolling(
            window=24,
            min_periods=1
        )
        .mean()
    )

    data["Temperature_C_RollingStd_24h"] = (
        data["Temperature_C"]
        .rolling(
            window=24,
            min_periods=1
        )
        .std()
    )

    data["Pressure_hPa_RollingMean_24h"] = (
        data["Pressure_hPa"]
        .rolling(
            window=24,
            min_periods=1
        )
        .mean()
    )

    data["Pressure_hPa_RollingStd_24h"] = (
        data["Pressure_hPa"]
        .rolling(
            window=24,
            min_periods=1
        )
        .std()
    )

    data["Humidity_percent_RollingMean_24h"] = (
        data["Humidity_percent"]
        .rolling(
            window=24,
            min_periods=1
        )
        .mean()
    )

    data["Humidity_percent_RollingStd_24h"] = (
        data["Humidity_percent"]
        .rolling(
            window=24,
            min_periods=1
        )
        .std()
    )

    # -----------------------------------------------------
    # Final NaN cleanup
    # -----------------------------------------------------

    data[FEATURES] = (
        data[FEATURES]
        .replace(
            [np.inf, -np.inf],
            np.nan
        )
        .ffill()
        .bfill()
        .fillna(0)
    )

    return data
# =========================================================
# SENSOR HEALTH CALCULATION
# =========================================================

def calculate_sensor_health(result_df):

    total_records = len(result_df)

    if total_records == 0:
        return {
            "health_score": 0,
            "health_status": "Unknown",
            "anomaly_rate": 0,
            "average_anomaly_persistence_hours": 0,
            "records_processed": 0,
            "anomalies_detected": 0
        }

    anomaly_count = int(
        result_df["Anomaly"].sum()
    )

    anomaly_rate = (
        anomaly_count /
        total_records *
        100
    )

    # -----------------------------------------------------
    # Calculate consecutive anomaly runs
    # -----------------------------------------------------

    anomaly_values = (
        result_df["Anomaly"]
        .astype(int)
        .tolist()
    )

    runs = []
    current_run = 0

    for value in anomaly_values:

        if value == 1:

            current_run += 1

        else:

            if current_run > 0:
                runs.append(current_run)

            current_run = 0

    if current_run > 0:
        runs.append(current_run)

    if runs:

        average_persistence = (
            float(np.mean(runs))
        )

    else:

        average_persistence = 0.0

    # -----------------------------------------------------
    # Engineering health score
    #
    # This is a dashboard score,
    # NOT a calibrated probability.
    # -----------------------------------------------------

    anomaly_burden = min(
        anomaly_rate * 2,
        40
    )

    persistence_burden = min(
        average_persistence * 5,
        20
    )

    health_score = (
        100
        - anomaly_burden
        - persistence_burden
    )

    health_score = max(
        0,
        min(
            100,
            health_score
        )
    )

    # -----------------------------------------------------
    # Health status
    # -----------------------------------------------------

    if health_score >= 90:

        health_status = "Healthy"

    elif health_score >= 75:

        health_status = "Good"

    elif health_score >= 50:

        health_status = "Warning"

    else:

        health_status = "Critical"

    return {

        "health_score":
            round(
                health_score,
                2
            ),

        "health_status":
            health_status,

        "anomaly_rate":
            round(
                anomaly_rate,
                2
            ),

        "average_anomaly_persistence_hours":
            round(
                average_persistence,
                2
            ),

        "records_processed":
            total_records,

        "anomalies_detected":
            anomaly_count
    }

# =========================================================
# RUN ISOLATION FOREST
# =========================================================

def run_prediction(df):

    if not model_loaded or model is None:

        raise HTTPException(
            status_code=500,
            detail="Isolation Forest model is not loaded."
        )

    feature_df = create_features(df)

    X = feature_df[FEATURES]

    # Isolation Forest:
    # higher decision_function = more normal
    # lower decision_function = more anomalous

    decision_scores = model.decision_function(X)

    anomaly_scores = -decision_scores

    predictions = (
        anomaly_scores >= THRESHOLD
    )

    feature_df["Anomaly_Score"] = (
        anomaly_scores
    )

    feature_df["Anomaly"] = (
        predictions
    )

    feature_df["Status"] = np.where(
        predictions,
        "ANOMALY",
        "NORMAL"
    )

    return feature_df


# =========================================================
# LIVE WEATHER ENDPOINT
# =========================================================

@app.get("/api/weather")
def get_live_weather():

    try:

        weather_df = fetch_open_meteo_weather()

        latest = weather_df.iloc[-1]

        return {

            "status": "success",

            "station": STATION_NAME,

            "location": {
                "latitude": LATITUDE,
                "longitude": LONGITUDE
            },

            "latest": {

                "Timestamp":
                    str(latest["Timestamp"]),

                "Temperature_C":
                    float(latest["Temperature_C"]),

                "Pressure_hPa":
                    float(latest["Pressure_hPa"]),

                "Humidity_percent":
                    float(latest["Humidity_percent"]),

                "Rain_mm":
                    float(latest["Rain_mm"]),

                "WindSpeed_kmh":
                    float(latest["WindSpeed_kmh"])
            },

            "records":
                weather_df.to_dict(
                    orient="records"
                )
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Weather API error: {str(e)}"
        )


# =========================================================
# PREDICT USER DATA
# =========================================================

@app.post("/api/predict")
def predict_weather(
    history: WeatherHistory
):

    try:

        if len(history.records) == 0:

            raise HTTPException(
                status_code=400,
                detail="At least one weather record is required."
            )

        records = [
            record.model_dump()
            for record in history.records
        ]

        df = pd.DataFrame(records)

        result_df = run_prediction(df)

        anomaly_count = int(
            result_df["Anomaly"].sum()
        )

        normal_count = (
            len(result_df) - anomaly_count
        )

        anomaly_percentage = (
            anomaly_count /
            len(result_df) *
            100
        )

        latest = result_df.iloc[-1]

        return {

            "status":
                "prediction_successful",

            "records_processed":
                len(result_df),

            "anomalies_detected":
                anomaly_count,

            "normal_records":
                normal_count,

            "anomaly_percentage":
                round(
                    anomaly_percentage,
                    2
                ),

            "threshold":
                THRESHOLD,

            "latest_prediction": {

                "status":
                    latest["Status"],

                "anomaly":
                    bool(latest["Anomaly"]),

                "anomaly_score":
                    float(
                        latest["Anomaly_Score"]
                    ),

                "threshold":
                    THRESHOLD,

                "Timestamp":
                    str(
                        latest["Timestamp"]
                    ),

                "Temperature_C":
                    float(
                        latest["Temperature_C"]
                    ),

                "Pressure_hPa":
                    float(
                        latest["Pressure_hPa"]
                    ),

                "Humidity_percent":
                    float(
                        latest["Humidity_percent"]
                    )
            },

            "message":
                "Isolation Forest anomaly detection completed successfully."
        }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )


# =========================================================
# LIVE WEATHER + AI ANOMALY DETECTION
# =========================================================

@app.get("/api/anomalies")
def live_anomaly_detection():

    try:

        weather_df = (
            fetch_open_meteo_weather()
        )

        result_df = run_prediction(
            weather_df
        )

        anomaly_count = int(
            result_df["Anomaly"].sum()
        )

        latest = result_df.iloc[-1]

        anomalies = result_df[
            result_df["Anomaly"]
        ]

        return {

            "status": "success",

            "station":
                STATION_NAME,

            "records_processed":
                len(result_df),

            "anomalies_detected":
                anomaly_count,

            "anomaly_percentage":
                round(
                    anomaly_count /
                    len(result_df) *
                    100,
                    2
                ),

            "threshold":
                THRESHOLD,

            "latest": {

                "Timestamp":
                    str(
                        latest["Timestamp"]
                    ),

                "Temperature_C":
                    float(
                        latest["Temperature_C"]
                    ),

                "Pressure_hPa":
                    float(
                        latest["Pressure_hPa"]
                    ),

                "Humidity_percent":
                    float(
                        latest["Humidity_percent"]
                    ),

                "Rain_mm":
                    float(
                        latest["Rain_mm"]
                    ),

                "WindSpeed_kmh":
                    float(
                        latest["WindSpeed_kmh"]
                    ),

                "Anomaly":
                    bool(
                        latest["Anomaly"]
                    ),

                "Status":
                    latest["Status"],

                "Anomaly_Score":
                    float(
                        latest["Anomaly_Score"]
                    )
            },

            "anomalies":
                anomalies[
                    [
                        "Timestamp",
                        "Temperature_C",
                        "Pressure_hPa",
                        "Humidity_percent",
                        "Rain_mm",
                        "WindSpeed_kmh",
                        "Anomaly_Score",
                        "Status"
                    ]
                ].to_dict(
                    orient="records"
                )
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Live anomaly detection failed: "
                + str(e)
            )
        )
# =========================================================
# SENSOR HEALTH
# =========================================================

@app.get("/api/sensor-health")
def sensor_health():

    try:

        weather_df = (
            fetch_open_meteo_weather()
        )

        result_df = run_prediction(
            weather_df
        )

        health = calculate_sensor_health(
            result_df
        )

        return {

            "status": "success",

            "station":
                STATION_NAME,

            "health": health,

            "note":
                "Sensor Health Score is an engineering "
                "dashboard score, not a calibrated probability."

        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Sensor health calculation failed: "
                + str(e)
            )
        )

# =========================================================
# RUN LOCALLY
# =========================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(
            os.environ.get(
                "PORT",
                8000
            )
        )
    )
