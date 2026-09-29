import React, { useEffect, useState } from "react";

const API_URL = "https://skyguard-ai-1-4rqi.onrender.com";

function App() {
  // =========================================================
  // STATE
  // =========================================================

  const [weather, setWeather] = useState({
    temperature: 0,
    pressure: 0,
    humidity: 0,
    rain: 0,
    wind: 0,
    timestamp: "--",
    station: "AWS_COIMBATORE_TARGET",
  });

  const [result, setResult] = useState({
    status: "NORMAL",
    anomaly: false,
    temperature: 0,
    pressure: 0,
    humidity: 0,
    rain: 0,
    wind: 0,
    anomalies: 0,
    records: 0,
    anomalyPercentage: 0,
    anomalyScore: 0,
    threshold: 0,
    rootCause: "Waiting for AI analysis",
    severity: "Normal",
    confidence: 0,
    action: "Run AI analysis",
  });

  const [sensorHealth, setSensorHealth] = useState(null);

  const [loading, setLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [error, setError] = useState("");

  // =========================================================
  // FORMAT TIMESTAMP
  // =========================================================

  const formatTimestamp = (timestamp) => {
    if (!timestamp || timestamp === "--") {
      return "--";
    }

    return timestamp.replace("T", " ");
  };

  // =========================================================
  // LOAD LIVE WEATHER
  // =========================================================

  const loadWeather = async () => {
    try {
      setWeatherLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/weather`);

      if (!response.ok) {
        throw new Error("Unable to fetch weather data");
      }

      const data = await response.json();

      if (data.status !== "success") {
        throw new Error("Unable to load weather data");
      }

      const latest = data.latest || {};

      setWeather({
        temperature: latest.Temperature_C ?? 0,
        pressure: latest.Pressure_hPa ?? 0,
        humidity: latest.Humidity_percent ?? 0,
        rain: latest.Rain_mm ?? 0,
        wind: latest.WindSpeed_kmh ?? 0,
        timestamp: latest.Timestamp || "--",
        station: data.station || "AWS_COIMBATORE_TARGET",
      });
    } catch (err) {
      console.error("Weather error:", err);

      setError(
        "Unable to connect to SkyGuard AI backend."
      );
    } finally {
      setLoading(false);
      setWeatherLoading(false);
    }
  };

  // =========================================================
  // LOAD SENSOR HEALTH
  // =========================================================

  const loadSensorHealth = async () => {
    try {
      setHealthLoading(true);

      const response = await fetch(
        `${API_URL}/api/sensor-health`
      );

      if (!response.ok) {
        throw new Error("Unable to fetch sensor health");
      }

      const data = await response.json();

      setSensorHealth(data);
    } catch (err) {
      console.error(
        "Sensor health error:",
        err
      );
    } finally {
      setHealthLoading(false);
    }
  };

  // =========================================================
  // RUN AI ANALYSIS
  // =========================================================

  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      setLoading(true);
      setError("");

      // -----------------------------------------------------
      // STEP 1: GET LIVE WEATHER
      // -----------------------------------------------------

      const weatherResponse = await fetch(
        `${API_URL}/api/weather`
      );

      if (!weatherResponse.ok) {
        throw new Error(
          "Unable to fetch weather data"
        );
      }

      const weatherData =
        await weatherResponse.json();

      if (
        weatherData.status !== "success" ||
        !weatherData.records ||
        weatherData.records.length === 0
      ) {
        throw new Error(
          "No weather records received"
        );
      }

      const records = weatherData.records;
      const latestWeather =
        weatherData.latest || {};

      // -----------------------------------------------------
      // UPDATE WEATHER CARDS
      // -----------------------------------------------------

      setWeather({
        temperature:
          latestWeather.Temperature_C ?? 0,

        pressure:
          latestWeather.Pressure_hPa ?? 0,

        humidity:
          latestWeather.Humidity_percent ?? 0,

        rain:
          latestWeather.Rain_mm ?? 0,

        wind:
          latestWeather.WindSpeed_kmh ?? 0,

        timestamp:
          latestWeather.Timestamp || "--",

        station:
          weatherData.station ||
          "AWS_COIMBATORE_TARGET",
      });

      // -----------------------------------------------------
      // STEP 2: SEND DATA TO ML MODEL
      // -----------------------------------------------------

      const predictionResponse =
        await fetch(`${API_URL}/api/predict`, {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            records: records,
          }),
        });

      if (!predictionResponse.ok) {
        throw new Error(
          "AI prediction failed"
        );
      }

      const predictionData =
        await predictionResponse.json();

      // -----------------------------------------------------
      // LATEST ML PREDICTION
      // -----------------------------------------------------

      const latestPrediction =
        predictionData.latest_prediction || {};

      const anomalyDetected =
        Boolean(latestPrediction.anomaly);

      // -----------------------------------------------------
      // UPDATE RESULT
      // -----------------------------------------------------

      setResult({
        status:
          latestPrediction.status ||
          "NORMAL",

        anomaly:
          anomalyDetected,

        temperature:
          latestWeather.Temperature_C ?? 0,

        pressure:
          latestWeather.Pressure_hPa ?? 0,

        humidity:
          latestWeather.Humidity_percent ?? 0,

        rain:
          latestWeather.Rain_mm ?? 0,

        wind:
          latestWeather.WindSpeed_kmh ?? 0,

        anomalies:
          predictionData.anomalies_detected ?? 0,

        records:
          predictionData.records_processed ??
          records.length,

        anomalyPercentage:
          Number(
            predictionData.anomaly_percentage ?? 0
          ).toFixed(2),

        anomalyScore:
          latestPrediction.anomaly_score ?? 0,

        threshold:
          predictionData.threshold ?? 0,

        rootCause:
          anomalyDetected
            ? "AI detected abnormal sensor behaviour"
            : "No anomaly detected",

        severity:
          anomalyDetected
            ? "Medium"
            : "Normal",

        // This is a heuristic dashboard score,
        // NOT a calibrated probability.
        confidence:
          anomalyDetected
            ? 70
            : 0,

        action:
          anomalyDetected
            ? "Inspect station sensors and verify readings"
            : "Continue normal monitoring",
      });

      // -----------------------------------------------------
      // STEP 3: REFRESH SENSOR HEALTH
      // -----------------------------------------------------

      await loadSensorHealth();
    } catch (err) {
      console.error(
        "Analysis error:",
        err
      );

      setError(
        "AI analysis failed. Please try again."
      );
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  // =========================================================
  // INITIAL PAGE LOAD
  // =========================================================

  useEffect(() => {
    loadWeather();
    loadSensorHealth();
  }, []);

  // =========================================================
  // SENSOR HEALTH VALUES
  // =========================================================

  const health =
    sensorHealth?.health || null;

  const healthScore =
    health?.health_score ?? 0;

  const healthStatus =
    health?.health_status || "Unknown";

  const healthAnomalyRate =
    health?.anomaly_rate ?? 0;

  const healthPersistence =
    health?.average_anomaly_persistence_hours ??
    0;

  const healthRecords =
    health?.records_processed ?? 0;

  const healthAnomalies =
    health?.anomalies_detected ?? 0;

  // =========================================================
  // HEALTH STATUS CLASS
  // =========================================================

  const getHealthClass = (status) => {
    if (status === "Healthy") {
      return "healthy";
    }

    if (status === "Good") {
      return "good";
    }

    if (status === "Warning") {
      return "warning";
    }

    if (status === "Critical") {
      return "critical";
    }

    return "unknown";
  };

  // =========================================================
  // AI STATUS
  // =========================================================

  const getAIStatus = () => {
    if (result.records === 0) {
      return {
        text: "Ready",
        className: "status-ready",
      };
    }

    if (result.anomalies === 0) {
      return {
        text: "No Anomaly Detected",
        className: "status-normal",
      };
    }

    return {
      text: "Anomaly Detected",
      className: "status-alert",
    };
  };

  const aiStatus = getAIStatus();

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="app">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="header">

        <div>
          <h1>🛡️ SkyGuard AI</h1>

          <p className="subtitle">
            Intelligent Anomaly Detection for
            Automatic Weather Stations
          </p>
        </div>

        <div className="header-status">
          <span className="online-dot"></span>
          Backend Online
        </div>

      </header>


      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="error-box">
          ⚠️ {error}
        </div>
      )}


      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="hero">

        <div>

          <span className="section-label">
            MONITORED STATION
          </span>

          <h2>
            Weather Station Intelligence Dashboard
          </h2>

          <p>
            Monitor live weather sensor data and
            detect abnormal readings using
            Isolation Forest machine learning.
          </p>

          <small>
            Station: {weather.station}
          </small>

          <br />

          <small>
            Last updated:{" "}
            {formatTimestamp(
              weather.timestamp
            )}
          </small>

        </div>

        <div className="station-badge">
          AWS
        </div>

        <button
          className="analyze-button"
          onClick={runAnalysis}
          disabled={
            analyzing ||
            weatherLoading
          }
        >
          {analyzing
            ? "⏳ Analyzing..."
            : "🚀 Run AI Analysis"}
        </button>

      </section>


      {/* =====================================================
          CURRENT WEATHER
      ===================================================== */}

      <section className="section">

        <h2>
          🌦️ Current Weather
        </h2>

        <div className="cards">

          {/* Temperature */}

          <div className="card">

            <div className="card-icon">
              🌡️
            </div>

            <span>
              Temperature
            </span>

            <strong>
              {loading
                ? "..."
                : `${Number(
                    weather.temperature
                  ).toFixed(1)} °C`}
            </strong>

          </div>


          {/* Pressure */}

          <div className="card">

            <div className="card-icon">
              🔵
            </div>

            <span>
              Pressure
            </span>

            <strong>
              {loading
                ? "..."
                : `${Number(
                    weather.pressure
                  ).toFixed(1)} hPa`}
            </strong>

          </div>


          {/* Humidity */}

          <div className="card">

            <div className="card-icon">
              💧
            </div>

            <span>
              Humidity
            </span>

            <strong>
              {loading
                ? "..."
                : `${Number(
                    weather.humidity
                  ).toFixed(0)} %`}
            </strong>

          </div>


          {/* Rain */}

          <div className="card">

            <div className="card-icon">
              🌧️
            </div>

            <span>
              Rain
            </span>

            <strong>
              {loading
                ? "..."
                : `${Number(
                    weather.rain
                  ).toFixed(1)} mm`}
            </strong>

          </div>


          {/* Wind */}

          <div className="card">

            <div className="card-icon">
              💨
            </div>

            <span>
              Wind Speed
            </span>

            <strong>
              {loading
                ? "..."
                : `${Number(
                    weather.wind
                  ).toFixed(1)} km/h`}
            </strong>

          </div>

        </div>

      </section>


      {/* =====================================================
          AI DETECTION STATUS
      ===================================================== */}

      <section className="section">

        <h2>
          🤖 AI Detection Status
        </h2>

        <div
          className={`detection ${
            result.anomaly
              ? "anomaly"
              : "normal"
          }`}
        >

          <div className="detection-icon">

            {result.anomaly
              ? "⚠️"
              : "✅"}

          </div>

          <div>

            <h2>

              {result.anomaly
                ? "ANOMALY DETECTED"
                : result.records > 0
                ? "NORMAL WEATHER"
                : "READY FOR ANALYSIS"}

            </h2>

            <p>

              {result.anomaly
                ? "The AI model detected abnormal sensor behaviour."
                : result.records > 0
                ? "No anomaly detected in the analyzed records."
                : "Run AI analysis to start anomaly detection."}

            </p>

          </div>

        </div>

      </section>


      {/* =====================================================
          SENSOR HEALTH
      ===================================================== */}

      <section className="section">

        <div className="health-header">

          <div>

            <span className="section-label">
              SENSOR MONITORING
            </span>

            <h2>
              🩺 Sensor Health
            </h2>

            <p>
              Live engineering health assessment
              based on recent anomaly behaviour.
            </p>

          </div>

          <div
            className={`health-status ${
              getHealthClass(
                healthStatus
              )
            }`}
          >

            {healthStatus === "Healthy" &&
              "🟢"}

            {healthStatus === "Good" &&
              "🟢"}

            {healthStatus === "Warning" &&
              "🟡"}

            {healthStatus === "Critical" &&
              "🔴"}

            {" "}

            {healthLoading
              ? "Checking..."
              : healthStatus}

          </div>

        </div>


        <div className="health-grid">

          {/* Health Score */}

          <div className="health-score-card">

            <p>
              Sensor Health Score
            </p>

            <div className="health-score">

              {healthLoading
                ? "..."
                : `${Number(
                    healthScore
                  ).toFixed(0)}/100`}

            </div>

            <div className="health-bar">

              <div
                className="health-bar-fill"
                style={{
                  width: `${Math.min(
                    Math.max(
                      Number(
                        healthScore
                      ),
                      0
                    ),
                    100
                  )}%`,
                }}
              ></div>

            </div>

            <small>
              Engineering dashboard score
            </small>

          </div>


          {/* Anomaly Rate */}

          <div className="health-metric">

            <span>
              📊
            </span>

            <div>

              <p>
                Anomaly Rate
              </p>

              <h3>

                {healthLoading
                  ? "..."
                  : `${Number(
                      healthAnomalyRate
                    ).toFixed(2)}%`}

              </h3>

            </div>

          </div>


          {/* Anomalies */}

          <div className="health-metric">

            <span>
              🚨
            </span>

            <div>

              <p>
                Anomalies Detected
              </p>

              <h3>

                {healthLoading
                  ? "..."
                  : healthAnomalies}

              </h3>

            </div>

          </div>


          {/* Records */}

          <div className="health-metric">

            <span>
              📡
            </span>

            <div>

              <p>
                Records Checked
              </p>

              <h3>

                {healthLoading
                  ? "..."
                  : healthRecords}

              </h3>

            </div>

          </div>


          {/* Persistence */}

          <div className="health-metric">

            <span>
              ⏱️
            </span>

            <div>

              <p>
                Avg. Anomaly Persistence
              </p>

              <h3>

                {healthLoading
                  ? "..."
                  : `${Number(
                      healthPersistence
                    ).toFixed(2)} h`}

              </h3>

            </div>

          </div>

        </div>


        <div className="health-note">

          ℹ️{" "}

          {sensorHealth?.note ||
            "Sensor Health Score is an engineering dashboard score, not a calibrated probability."}

        </div>

      </section>


      {/* =====================================================
          ANALYSIS SUMMARY
      ===================================================== */}

      <section className="section">

        <h2>
          📊 Analysis Summary
        </h2>

        <div className="stats">

          <div className="stat">

            <span>
              Records Processed
            </span>

            <strong>
              {result.records}
            </strong>

          </div>


          <div className="stat">

            <span>
              Anomalies Detected
            </span>

            <strong>
              {result.anomalies}
            </strong>

          </div>


          <div className="stat">

            <span>
              Anomaly Percentage
            </span>

            <strong>
              {Number(
                result.anomalyPercentage
              ).toFixed(2)}%
            </strong>

          </div>


          <div className="stat">

            <span>
              Detection Threshold
            </span>

            <strong>
              {Number(
                result.threshold
              ).toFixed(4)}
            </strong>

          </div>

        </div>

      </section>


      {/* =====================================================
          AI EXPLANATION
      ===================================================== */}

      <section className="section">

        <h2>
          🧠 AI Explanation
        </h2>

        <div className="explanation">

          <div>

            <span>
              Root Cause
            </span>

            <strong>
              {result.rootCause}
            </strong>

          </div>


          <div>

            <span>
              Severity
            </span>

            <strong>
              {result.severity}
            </strong>

          </div>


          <div>

            <span>
              Confidence Score (heuristic)
            </span>

            <strong>
              {result.confidence}%
            </strong>

          </div>


          <div>

            <span>
              Recommended Action
            </span>

            <strong>
              {result.action}
            </strong>

          </div>

        </div>

      </section>


      {/* =====================================================
          LATEST ML DECISION
      ===================================================== */}

      <section className="section">

        <h2>
          📈 Latest ML Decision
        </h2>

        <div
          className={`decision-card ${
            result.anomaly
              ? "decision-alert"
              : "decision-normal"
          }`}
        >

          <div className="decision-icon">

            {result.anomaly
              ? "🚨"
              : "✅"}

          </div>

          <div>

            <span>
              Latest Status
            </span>

            <h3>
              {result.status}
            </h3>

            <p>
              Anomaly Score:{" "}
              {Number(
                result.anomalyScore
              ).toFixed(4)}
            </p>

            <p>
              Detection Threshold:{" "}
              {Number(
                result.threshold
              ).toFixed(4)}
            </p>

            {result.records > 0 && (
              <p>
                Latest observation:{" "}
                {result.temperature} °C,{" "}
                {result.pressure} hPa,{" "}
                {result.humidity}% RH
              </p>
            )}

          </div>

        </div>

      </section>


      {/* =====================================================
          AI MODEL
      ===================================================== */}

      <section className="section">

        <h2>
          ⚙️ AI Model
        </h2>

        <div className="model-box">

          <div className="model-grid">

            <div>
              <span>
                Model
              </span>

              <strong>
                Isolation Forest
              </strong>
            </div>


            <div>
              <span>
                Estimators
              </span>

              <strong>
                200
              </strong>
            </div>


            <div>
              <span>
                Features
              </span>

              <strong>
                15
              </strong>
            </div>


            <div>
              <span>
                Contamination
              </span>

              <strong>
                Auto
              </strong>
            </div>


            <div>
              <span>
                Threshold
              </span>

              <strong>
                0.0453
              </strong>
            </div>


            <div>
              <span>
                Architecture
              </span>

              <strong>
                Edge + Cloud
              </strong>
            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          SKYGUARD AI PIPELINE
      ===================================================== */}

      <section className="section">

        <h2>
          🔄 SkyGuard AI Pipeline
        </h2>

        <div className="pipeline">

          <div className="pipeline-step">

            <span>1</span>

            <strong>
              Ingest
            </strong>

            <p>
              Live weather data from Open-Meteo
            </p>

          </div>


          <div className="pipeline-arrow">
            →
          </div>


          <div className="pipeline-step">

            <span>2</span>

            <strong>
              Engineer
            </strong>

            <p>
              Temporal and missing-value features
            </p>

          </div>


          <div className="pipeline-arrow">
            →
          </div>


          <div className="pipeline-step">

            <span>3</span>

            <strong>
              Detect
            </strong>

            <p>
              Isolation Forest anomaly detection
            </p>

          </div>


          <div className="pipeline-arrow">
            →
          </div>


          <div className="pipeline-step">

            <span>4</span>

            <strong>
              Explain
            </strong>

            <p>
              Evidence and sensor health monitoring
            </p>

          </div>


          <div className="pipeline-arrow">
            →
          </div>


          <div className="pipeline-step">

            <span>5</span>

            <strong>
              Act
            </strong>

            <p>
              Alert and maintenance response
            </p>

          </div>

        </div>

      </section>


      {/* =====================================================
          HOW SKYGUARD AI WORKS
      ===================================================== */}

      <section className="section">

        <div className="model-box">

          <h2>
            🧠 How SkyGuard AI Works
          </h2>

          <p>
            Live weather data is collected from
            Open-Meteo, transformed into temporal
            features, and passed through an
            Isolation Forest model to identify
            unusual sensor behaviour.
          </p>

          <p>
            The detected anomalies are then
            combined with engineering evidence
            and sensor-health monitoring to
            support alert and maintenance decisions.
          </p>

        </div>

      </section>


      {/* =====================================================
          AI STATUS
      ===================================================== */}

      <section className="section">

        <div
          className={`ai-status ${
            aiStatus.className
          }`}
        >
          {aiStatus.text}
        </div>

      </section>


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="footer">

        <div>

          <strong>
            SkyGuard AI
          </strong>

          <span>
            {" "}• SIH Project • AI/ML-Based
            Intelligent Anomaly Detection for
            Automatic Weather Stations
          </span>

        </div>

        <p>
          Prototype • v1.3.0
        </p>

      </footer>

    </div>
  );
}

export default App;
