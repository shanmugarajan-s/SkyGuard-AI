import React, { useEffect, useState } from "react";

const API_URL = "https://skyguard-ai-1-4rqi.onrender.com";

function App() {
  const [weather, setWeather] = useState(null);
  const [result, setResult] = useState(null);
  const [sensorHealth, setSensorHealth] = useState(null);

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);

  const [error, setError] = useState("");

  // --------------------------------------------------
  // LOAD LIVE WEATHER
  // --------------------------------------------------
  const loadWeather = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/weather`);

      if (!response.ok) {
        throw new Error("Unable to fetch weather data");
      }

      const data = await response.json();

      setWeather(data);
    } catch (err) {
      console.error("Weather error:", err);
      setError("Unable to connect to SkyGuard AI backend.");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // LOAD SENSOR HEALTH
  // --------------------------------------------------
  const loadSensorHealth = async () => {
    try {
      setHealthLoading(true);

      const response = await fetch(`${API_URL}/api/sensor-health`);

      if (!response.ok) {
        throw new Error("Unable to fetch sensor health");
      }

      const data = await response.json();

      setSensorHealth(data);
    } catch (err) {
      console.error("Sensor health error:", err);
    } finally {
      setHealthLoading(false);
    }
  };

  // --------------------------------------------------
  // RUN AI ANALYSIS
  // --------------------------------------------------
  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      setError("");

      // First get latest weather
      const weatherResponse = await fetch(`${API_URL}/api/weather`);

      if (!weatherResponse.ok) {
        throw new Error("Unable to fetch weather");
      }

      const weatherData = await weatherResponse.json();

      setWeather(weatherData);

      // Send weather records to ML model
      const predictionResponse = await fetch(`${API_URL}/api/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: weatherData.records,
        }),
      });

      if (!predictionResponse.ok) {
        throw new Error("AI prediction failed");
      }

      const predictionData = await predictionResponse.json();

      setResult(predictionData);

      // Refresh live sensor health
      await loadSensorHealth();

    } catch (err) {
      console.error("Analysis error:", err);
      setError("AI analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  // --------------------------------------------------
  // INITIAL LOAD
  // --------------------------------------------------
  useEffect(() => {
    loadWeather();
    loadSensorHealth();
  }, []);

  // --------------------------------------------------
  // WEATHER VALUES
  // --------------------------------------------------
  const latest = weather?.latest || {};

  const temperature =
    latest.Temperature_C !== undefined
      ? latest.Temperature_C
      : "--";

  const pressure =
    latest.Pressure_hPa !== undefined
      ? latest.Pressure_hPa
      : "--";

  const humidity =
    latest.Humidity_percent !== undefined
      ? latest.Humidity_percent
      : "--";

  const rain =
    latest.Rain_mm !== undefined
      ? latest.Rain_mm
      : "--";

  const wind =
    latest.WindSpeed_kmh !== undefined
      ? latest.WindSpeed_kmh
      : "--";

  const station =
    weather?.station || "AWS_COIMBATORE_TARGET";

  const updatedTime =
    latest.Timestamp || "Waiting for data...";

  // --------------------------------------------------
  // AI RESULT VALUES
  // --------------------------------------------------
  const recordsProcessed =
    result?.records_processed ?? 0;

  const anomaliesDetected =
    result?.anomalies_detected ?? 0;

  const anomalyPercentage =
    result?.anomaly_percentage ?? 0;

  const threshold =
    result?.threshold ?? 0;

  const latestPrediction =
    result?.latest_prediction || null;

  // --------------------------------------------------
  // SENSOR HEALTH VALUES
  // --------------------------------------------------
  const health =
    sensorHealth?.health || null;

  const healthScore =
    health?.health_score ?? 0;

  const healthStatus =
    health?.health_status || "Unknown";

  const healthAnomalyRate =
    health?.anomaly_rate ?? 0;

  const healthPersistence =
    health?.average_anomaly_persistence_hours ?? 0;

  const healthRecords =
    health?.records_processed ?? 0;

  const healthAnomalies =
    health?.anomalies_detected ?? 0;

  // --------------------------------------------------
  // HEALTH STATUS CLASS
  // --------------------------------------------------
  const getHealthClass = (status) => {
    if (status === "Healthy") return "healthy";
    if (status === "Good") return "good";
    if (status === "Warning") return "warning";
    if (status === "Critical") return "critical";

    return "unknown";
  };

  // --------------------------------------------------
  // AI STATUS
  // --------------------------------------------------
  const getAIStatus = () => {
    if (!result) {
      return {
        text: "Ready",
        className: "status-ready",
      };
    }

    if (anomaliesDetected === 0) {
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

  // --------------------------------------------------
  // LATEST ML DECISION
  // --------------------------------------------------
  const latestIsAnomaly =
    latestPrediction?.anomaly === true;

  const latestStatus =
    latestPrediction?.status ||
    "WAITING";

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <div className="app">

      {/* ==========================================
          HEADER
      ========================================== */}
      <header className="header">
        <div>
          <h1>🌦️ SkyGuard AI</h1>

          <p className="subtitle">
            Intelligent Anomaly Detection for Automatic Weather Stations
          </p>
        </div>

        <div className="header-status">
          <span className="online-dot"></span>
          Backend Online
        </div>
      </header>


      {/* ==========================================
          ERROR
      ========================================== */}
      {error && (
        <div className="error-box">
          ⚠️ {error}
        </div>
      )}


      {/* ==========================================
          STATION INFORMATION
      ========================================== */}
      <section className="station-section">

        <div>
          <span className="section-label">
            MONITORED STATION
          </span>

          <h2>{station}</h2>

          <p>
            Last updated: {updatedTime}
          </p>
        </div>

        <div className="station-badge">
          AWS
        </div>

      </section>


      {/* ==========================================
          LIVE WEATHER CARDS
      ========================================== */}
      <section className="weather-grid">

        <div className="weather-card">
          <div className="weather-icon">🌡️</div>

          <div>
            <p>Temperature</p>
            <h3>
              {loading ? "..." : `${temperature} °C`}
            </h3>
          </div>
        </div>


        <div className="weather-card">
          <div className="weather-icon">🌪️</div>

          <div>
            <p>Pressure</p>
            <h3>
              {loading ? "..." : `${pressure} hPa`}
            </h3>
          </div>
        </div>


        <div className="weather-card">
          <div className="weather-icon">💧</div>

          <div>
            <p>Humidity</p>
            <h3>
              {loading ? "..." : `${humidity} %`}
            </h3>
          </div>
        </div>


        <div className="weather-card">
          <div className="weather-icon">🌧️</div>

          <div>
            <p>Rain</p>
            <h3>
              {loading ? "..." : `${rain} mm`}
            </h3>
          </div>
        </div>


        <div className="weather-card">
          <div className="weather-icon">💨</div>

          <div>
            <p>Wind Speed</p>
            <h3>
              {loading ? "..." : `${wind} km/h`}
            </h3>
          </div>
        </div>

      </section>


      {/* ==========================================
          SENSOR HEALTH
      ========================================== */}
      <section className="health-section">

        <div className="section-heading">

          <div>
            <span className="section-label">
              SENSOR MONITORING
            </span>

            <h2>
              Sensor Health
            </h2>

            <p>
              Live engineering health assessment based on
              recent anomaly behaviour.
            </p>
          </div>

          <div
            className={`health-status ${getHealthClass(
              healthStatus
            )}`}
          >
            {healthStatus === "Healthy" && "🟢"}
            {healthStatus === "Good" && "🟢"}
            {healthStatus === "Warning" && "🟡"}
            {healthStatus === "Critical" && "🔴"}

            {" "}

            {healthStatus}
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
                : `${healthScore}/100`}
            </div>

            <div className="health-bar">
              <div
                className="health-bar-fill"
                style={{
                  width: `${Math.min(
                    Math.max(healthScore, 0),
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

            <span>📊</span>

            <div>
              <p>Anomaly Rate</p>

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

            <span>🚨</span>

            <div>
              <p>Anomalies Detected</p>

              <h3>
                {healthLoading
                  ? "..."
                  : healthAnomalies}
              </h3>
            </div>

          </div>


          {/* Records */}
          <div className="health-metric">

            <span>📡</span>

            <div>
              <p>Records Checked</p>

              <h3>
                {healthLoading
                  ? "..."
                  : healthRecords}
              </h3>
            </div>

          </div>


          {/* Persistence */}
          <div className="health-metric">

            <span>⏱️</span>

            <div>
              <p>Avg. Anomaly Persistence</p>

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


      {/* ==========================================
          AI ANALYSIS
      ========================================== */}
      <section className="analysis-section">

        <div className="analysis-header">

          <div>
            <span className="section-label">
              ARTIFICIAL INTELLIGENCE
            </span>

            <h2>
              AI Anomaly Analysis
            </h2>

            <p>
              Isolation Forest + engineered temporal features
            </p>
          </div>

          <div
            className={`ai-status ${aiStatus.className}`}
          >
            {aiStatus.text}
          </div>

        </div>


        {/* Run Button */}
        <button
          className="run-button"
          onClick={runAnalysis}
          disabled={analyzing}
        >
          {analyzing
            ? "⏳ Running AI Analysis..."
            : "🤖 Run AI Analysis"}
        </button>


        {/* ========================================
            AI SUMMARY CARDS
        ======================================== */}
        <div className="analysis-grid">

          <div className="analysis-card">
            <p>Records Processed</p>
            <h3>{recordsProcessed}</h3>
          </div>


          <div className="analysis-card">
            <p>Anomalies Detected</p>
            <h3>{anomaliesDetected}</h3>
          </div>


          <div className="analysis-card">
            <p>Anomaly Percentage</p>
            <h3>
              {Number(anomalyPercentage).toFixed(2)}%
            </h3>
          </div>


          <div className="analysis-card">
            <p>Detection Threshold</p>
            <h3>
              {Number(threshold).toFixed(4)}
            </h3>
          </div>

        </div>

      </section>


      {/* ==========================================
          LATEST ML DECISION
      ========================================== */}
      <section className="decision-section">

        <div className="section-heading">

          <div>
            <span className="section-label">
              LATEST MODEL DECISION
            </span>

            <h2>
              Current ML Classification
            </h2>
          </div>

        </div>


        <div
          className={`decision-card ${
            latestIsAnomaly
              ? "decision-alert"
              : "decision-normal"
          }`}
        >

          <div className="decision-icon">
            {latestIsAnomaly
              ? "🚨"
              : "✅"}
          </div>

          <div className="decision-content">

            <h3>
              {latestStatus}
            </h3>

            {latestPrediction ? (
              <p>
                Latest observation:
                {" "}
                {latestPrediction.Temperature_C} °C,
                {" "}
                {latestPrediction.Pressure_hPa} hPa,
                {" "}
                {latestPrediction.Humidity_percent}% RH
              </p>
            ) : (
              <p>
                Run AI Analysis to obtain the latest
                model decision.
              </p>
            )}

          </div>

        </div>

      </section>


      {/* ==========================================
          EXPLANATION
      ========================================== */}
      <section className="info-section">

        <div className="info-card">

          <h2>
            🧠 How SkyGuard AI Works
          </h2>

          <div className="pipeline">

            <div className="pipeline-step">
              <span>1</span>
              <strong>Ingest</strong>
              <p>
                Live weather data from Open-Meteo
              </p>
            </div>

            <div className="pipeline-arrow">
              →
            </div>

            <div className="pipeline-step">
              <span>2</span>
              <strong>Engineer</strong>
              <p>
                Temporal and missing-value features
              </p>
            </div>

            <div className="pipeline-arrow">
              →
            </div>

            <div className="pipeline-step">
              <span>3</span>
              <strong>Detect</strong>
              <p>
                Isolation Forest anomaly detection
              </p>
            </div>

            <div className="pipeline-arrow">
              →
            </div>

            <div className="pipeline-step">
              <span>4</span>
              <strong>Explain</strong>
              <p>
                Evidence and sensor health monitoring
              </p>
            </div>

            <div className="pipeline-arrow">
              →
            </div>

            <div className="pipeline-step">
              <span>5</span>
              <strong>Act</strong>
              <p>
                Alert and maintenance response
              </p>
            </div>

          </div>

        </div>

      </section>


      {/* ==========================================
          MODEL INFORMATION
      ========================================== */}
      <section className="model-section">

        <div className="model-card">

          <h2>
            ⚙️ Model Information
          </h2>

          <div className="model-grid">

            <div>
              <span>Model</span>
              <strong>
                Isolation Forest
              </strong>
            </div>

            <div>
              <span>Estimators</span>
              <strong>
                200
              </strong>
            </div>

            <div>
              <span>Features</span>
              <strong>
                15
              </strong>
            </div>

            <div>
              <span>Contamination</span>
              <strong>
                Auto
              </strong>
            </div>

            <div>
              <span>Threshold</span>
              <strong>
                0.0453
              </strong>
            </div>

            <div>
              <span>Architecture</span>
              <strong>
                Edge + Cloud
              </strong>
            </div>

          </div>

        </div>

      </section>


      {/* ==========================================
          FOOTER
      ========================================== */}
      <footer className="footer">

        <div>
          <strong>
            SkyGuard AI
          </strong>

          <span>
            {" "} | {" "}
            AI/ML-Based Intelligent Anomaly Detection
            for Automatic Weather Stations
          </span>
        </div>

        <div>
          SIH Prototype • v1.3.0
        </div>

      </footer>

    </div>
  );
}

export default App;
