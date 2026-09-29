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
import time


# ============================================================
# SKYGUARD AI BACKEND
# ============================================================

app = FastAPI(
    title="SkyGuard AI",
    description="AWS Intelligent Anomaly Detection API",
    version="1.4.0"
)


# ============================================================
# CORS
# ============================================================

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


# ============================================================
# MODEL CONFIGURATION
# ============================================================

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


# ============================================================
# STATION
# ============================================================

STATION_NAME = "AWS_COIMBATORE_TARGET"

STATION_LAT = 11.0168
STATION_LON = 76.9558


# ============================================================
# WEATHER CACHE
# ============================================================

# Cache duration = 5 minutes
CACHE_DURATION_SECONDS = 300

weather_cache = {
    "data": None,
    "timestamp": 0
}


# ============================================================
# LAST SUCCESSFUL DATA
# ============================================================

last_successful_weather = None


# ============================================================
# REQUEST MODELS
# ============================================================

class WeatherReading(BaseModel):

    Timestamp: Optional[str] = None

    Temperature_C: float
    Pressure_hPa: float
    Humidity_percent: float

    Rain_mm: Optional[float] = 0.0
    WindSpeed_kmh: Optional[float] = 0.0


class WeatherHistory(BaseModel):

    records: List[WeatherReading]


# ============================================================
# WEATHER API
# ============================================================

def fetch_open_meteo_weather():

    global weather_cache
    global last_successful_weather

    current_time = time.time()

    # --------------------------------------------------------
    # 1. RETURN CACHE IF STILL VALID
    # --------------------------------------------------------

    if (
        weather_cache["data"] is not None
        and
        current_time - weather_cache["timestamp"]
        < CACHE_DURATION_SECONDS
    ):

        return weather_cache["data"]


    # --------------------------------------------------------
    # 2. OPEN-METEO REQUEST
    # --------------------------------------------------------

    url = "https://api.open-meteo.com/v1/forecast"

    params = {

        "latitude": STATION_LAT,

        "longitude": STATION_LON,

        "hourly":
            "temperature_2m,"
            "relativehumidity_2m,"
            "surface_pressure,"
            "rain,"
            "windspeed_10m",

        "past_days": 2,

        "forecast_days": 1,

        "timezone": "Asia/Kolkata"
    }


    try:

        response = requests.get(
            url,
            params=params,
            timeout=20
        )

        response.raise_for_status()

        data = response.json()


        # ----------------------------------------------------
        # 3. VALIDATE RESPONSE
        # ----------------------------------------------------

        if "hourly" not in data:

            raise Exception(
                "Open-Meteo response does not contain hourly data."
            )


        hourly = data["hourly"]

        timestamps = hourly["time"]

        temperatures = hourly["temperature_2m"]

        pressures = hourly["surface_pressure"]

        humidities = hourly["relativehumidity_2m"]

        rains = hourly["rain"]

        winds = hourly["windspeed_10m"]


        records = []


        for i in range(len(timestamps)):

            records.append({

                "Timestamp": timestamps[i],

                "Temperature_C":
                    temperatures[i],

                "Pressure_hPa":
                    pressures[i],

                "Humidity_percent":
                    humidities[i],

                "Rain_mm":
                    rains[i],

                "WindSpeed_kmh":
                    winds[i]
            })


        result = {

            "status": "success",

            "station": STATION_NAME,

            "latitude": STATION_LAT,

            "longitude": STATION_LON,

            "records": records,

            "source": "Open-Meteo",

            "cached": False
        }


        # ----------------------------------------------------
        # 4. UPDATE CACHE
        # ----------------------------------------------------

        weather_cache["data"] = result

        weather_cache["timestamp"] = time.time()

        last_successful_weather = result


        return result


    except requests.exceptions.HTTPError as e:

        # ----------------------------------------------------
        # 5. 429 FALLBACK
        # ----------------------------------------------------

        if (
            response.status_code == 429
            and
            last_successful_weather is not None
        ):

            cached_result = last_successful_weather.copy()

            cached_result["cached"] = True

            cached_result["fallback"] = True

            return cached_result


        raise Exception(
            f"Weather API error: {str(e)}"
        )


    except Exception as e:

        # ----------------------------------------------------
        # 6. GENERAL FALLBACK
        # ----------------------------------------------------

        if last_successful_weather is not None:

            cached_result = last_successful_weather.copy()

            cached_result["cached"] = True

            cached_result["fallback"] = True

            return cached_result


        raise Exception(
            f"Weather API error: {str(e)}"
        )


# ============================================================
# FEATURE ENGINEERING
# ============================================================

def create_features(df):

    df = df.copy()


    # --------------------------------------------------------
    # TIMESTAMP
    # --------------------------------------------------------

    if "Timestamp" in df.columns:

        df["Timestamp"] = pd.to_datetime(
            df["Timestamp"],
            errors="coerce"
        )

        df = df.sort_values(
            "Timestamp"
        )


    # --------------------------------------------------------
    # MISSING VALUE INDICATORS
    # --------------------------------------------------------

    df["Temperature_C_Missing"] = (
        df["Temperature_C"].isna().astype(int)
    )

    df["Pressure_hPa_Missing"] = (
        df["Pressure_hPa"].isna().astype(int)
    )

    df["Humidity_percent_Missing"] = (
        df["Humidity_percent"].isna().astype(int)
    )


    # --------------------------------------------------------
    # FILL SENSOR VALUES
    # --------------------------------------------------------

    sensor_columns = [
        "Temperature_C",
        "Pressure_hPa",
        "Humidity_percent"
    ]


    for column in sensor_columns:

        df[column] = (
            df[column]
            .ffill()
            .bfill()
        )


    # --------------------------------------------------------
    # DELTA FEATURES
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
    # ROLLING FEATURES
    # --------------------------------------------------------

    df["Temperature_C_RollingMean_24h"] = (
        df["Temperature_C"]
        .rolling(24, min_periods=1)
        .mean()
    )

    df["Temperature_C_RollingStd_24h"] = (
        df["Temperature_C"]
        .rolling(24, min_periods=1)
        .std()
        .fillna(0)
    )


    df["Pressure_hPa_RollingMean_24h"] = (
        df["Pressure_hPa"]
        .rolling(24, min_periods=1)
        .mean()
    )

    df["Pressure_hPa_RollingStd_24h"] = (
        df["Pressure_hPa"]
        .rolling(24, min_periods=1)
        .std()
        .fillna(0)
    )


    df["Humidity_percent_RollingMean_24h"] = (
        df["Humidity_percent"]
        .rolling(24, min_periods=1)
        .mean()
    )

    df["Humidity_percent_RollingStd_24h"] = (
        df["Humidity_percent"]
        .rolling(24, min_periods=1)
        .std()
        .fillna(0)
    )


    # --------------------------------------------------------
    # CLEAN NaN / INF
    # --------------------------------------------------------

    df = df.replace(
        [np.inf, -np.inf],
        np.nan
    )

    df = df.fillna(0)


    return df


# ============================================================
# ML PREDICTION
# ============================================================

def run_prediction(df):

    if model is None:

        raise Exception(
            "ML model is not loaded."
        )


    X = df[FEATURES]


    decision_scores = model.decision_function(X)


    anomaly_scores = -decision_scores


    predictions = (
        anomaly_scores >= THRESHOLD
    )


    result = df.copy()


    result["Anomaly_Score"] = (
        anomaly_scores
    )

    result["Anomaly"] = (
        predictions
    )


    return result


# ============================================================
# SENSOR HEALTH
# ============================================================

def calculate_sensor_health(result_df):

    total_records = len(result_df)


    anomaly_count = int(
        result_df["Anomaly"].sum()
    )


    if total_records > 0:

        anomaly_rate = (
            anomaly_count /
            total_records
        ) * 100

    else:

        anomaly_rate = 0


    # --------------------------------------------------------
    # ANOMALY PERSISTENCE
    # --------------------------------------------------------

    persistence_runs = []

    current_run = 0


    for value in result_df["Anomaly"]:

        if value:

            current_run += 1

        else:

            if current_run > 0:

                persistence_runs.append(
                    current_run
                )

            current_run = 0


    if current_run > 0:

        persistence_runs.append(
            current_run
        )


    if persistence_runs:

        average_persistence = float(
            np.mean(
                persistence_runs
            )
        )

    else:

        average_persistence = 0


    # --------------------------------------------------------
    # ENGINEERING HEALTH SCORE
    # --------------------------------------------------------

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
        -
        anomaly_burden
        -
        persistence_burden
    )


    health_score = max(
        0,
        min(
            100,
            health_score
        )
    )


    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    if health_score >= 90:

        status = "Healthy"

    elif health_score >= 75:

        status = "Good"

    elif health_score >= 50:

        status = "Warning"

    else:

        status = "Critical"


    return {

        "health_score":
            round(
                health_score,
                2
            ),

        "health_status":
            status,

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


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {

        "project": "SkyGuard AI",

        "status":
            "Backend is running",

        "model_loaded":
            MODEL_LOADED,

        "version":
            "1.4.0"
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    return {

        "status":
            "healthy",

        "model_loaded":
            MODEL_LOADED
    }


# ============================================================
# API HEALTH
# ============================================================

@app.get("/api/health")
def api_health():

    return {

        "status":
            "healthy",

        "model_loaded":
            MODEL_LOADED,

        "version":
            "1.4.0"
    }


# ============================================================
# MODEL INFO
# ============================================================

@app.get("/api/model-info")
def model_info():

    return {

        "model_name":
            config.get(
                "model_name",
                "SkyGuard AI Isolation Forest"
            ),

        "model_type":
            config.get(
                "model_type",
                "IsolationForest"
            ),

        "n_estimators":
            config.get(
                "n_estimators",
                200
            ),

        "contamination":
            config.get(
                "contamination",
                "auto"
            ),

        "threshold":
            THRESHOLD,

        "features":
            FEATURES,

        "confidence_note":
            "Confidence score is a heuristic engineering score, not calibrated probability.",

        "validation_note":
            "Chronologically held-out prototype validation with synthetic anomaly injections."
    }


# ============================================================
# WEATHER
# ============================================================

@app.get("/api/weather")
def get_weather():

    try:

        weather = fetch_open_meteo_weather()

        records = weather["records"]


        if not records:

            raise Exception(
                "No weather records available."
            )


        latest = records[-1]


        return {

            "status":
                "success",

            "station":
                weather["station"],

            "latitude":
                weather["latitude"],

            "longitude":
                weather["longitude"],

            "source":
                weather["source"],

            "cached":
                weather.get(
                    "cached",
                    False
                ),

            "latest": {

                "Timestamp":
                    latest["Timestamp"],

                "Temperature_C":
                    latest["Temperature_C"],

                "Pressure_hPa":
                    latest["Pressure_hPa"],

                "Humidity_percent":
                    latest["Humidity_percent"],

                "Rain_mm":
                    latest["Rain_mm"],

                "WindSpeed_kmh":
                    latest["WindSpeed_kmh"]
            },

            "records":
                records
        }


    except Exception as e:

        raise HTTPException(
            status_code=503,
            detail=str(e)
        )


# ============================================================
# PREDICT
# ============================================================

@app.post("/api/predict")
def predict_weather(history: WeatherHistory):

    try:

        records = [
            record.model_dump()
            for record in history.records
        ]


        df = pd.DataFrame(records)


        if df.empty:

            raise Exception(
                "No weather records supplied."
            )


        processed_df = create_features(
            df
        )


        result_df = run_prediction(
            processed_df
        )


        anomaly_count = int(
            result_df["Anomaly"].sum()
        )


        total_records = len(
            result_df
        )


        normal_count = (
            total_records -
            anomaly_count
        )


        anomaly_percentage = (

            anomaly_count /
            total_records *
            100

        ) if total_records else 0


        latest_row = result_df.iloc[-1]


        return {

            "status":
                "prediction_successful",

            "records_processed":
                total_records,

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
                    "ANOMALY"
                    if latest_row["Anomaly"]
                    else "NORMAL",

                "anomaly":
                    bool(
                        latest_row["Anomaly"]
                    ),

                "anomaly_score":
                    float(
                        latest_row[
                            "Anomaly_Score"
                        ]
                    ),

                "threshold":
                    THRESHOLD,

                "Temperature_C":
                    float(
                        latest_row[
                            "Temperature_C"
                        ]
                    ),

                "Pressure_hPa":
                    float(
                        latest_row[
                            "Pressure_hPa"
                        ]
                    ),

                "Humidity_percent":
                    float(
                        latest_row[
                            "Humidity_percent"
                        ]
                    )
            },

            "message":
                "Isolation Forest anomaly detection completed successfully."
        }


    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# LIVE ANOMALIES
# ============================================================

@app.get("/api/anomalies")
def get_anomalies():

    try:

        weather = fetch_open_meteo_weather()


        records = weather["records"]


        df = pd.DataFrame(records)


        processed_df = create_features(
            df
        )


        result_df = run_prediction(
            processed_df
        )


        anomalies = []


        for _, row in result_df.iterrows():

            if row["Anomaly"]:

                anomalies.append({

                    "Timestamp":
                        row["Timestamp"].isoformat()
                        if hasattr(
                            row["Timestamp"],
                            "isoformat"
                        )
                        else str(
                            row["Timestamp"]
                        ),

                    "Temperature_C":
                        float(
                            row[
                                "Temperature_C"
                            ]
                        ),

                    "Pressure_hPa":
                        float(
                            row[
                                "Pressure_hPa"
                            ]
                        ),

                    "Humidity_percent":
                        float(
                            row[
                                "Humidity_percent"
                            ]
                        ),

                    "Anomaly_Score":
                        float(
                            row[
                                "Anomaly_Score"
                            ]
                        )
                })


        return {

            "status":
                "success",

            "station":
                STATION_NAME,

            "anomalies_detected":
                len(anomalies),

            "anomalies":
                anomalies
        }


    except Exception as e:

        raise HTTPException(
            status_code=503,
            detail=str(e)
        )


# ============================================================
# SENSOR HEALTH
# ============================================================

@app.get("/api/sensor-health")
def sensor_health():

    try:

        weather = fetch_open_meteo_weather()


        df = pd.DataFrame(
            weather["records"]
        )


        processed_df = create_features(
            df
        )


        result_df = run_prediction(
            processed_df
        )


        health = calculate_sensor_health(
            result_df
        )


        return {

            "status":
                "success",

            "station":
                STATION_NAME,

            "health":
                health,

            "cached":
                weather.get(
                    "cached",
                    False
                ),

            "note":
                "Sensor Health Score is an engineering dashboard score, not a calibrated probability."
        }


    except Exception as e:

        raise HTTPException(
            status_code=503,
            detail=f"Sensor health calculation failed: {str(e)}"
        )


# ============================================================
# START SERVER
# ============================================================

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
