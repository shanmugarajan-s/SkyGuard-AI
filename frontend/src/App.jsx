import React, { useEffect, useState } from "react";

const API_URL = "https://skyguard-ai-1-4rqi.onrender.com";

function App() {
  const [loading, setLoading] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [error, setError] = useState("");

  const [weather, setWeather] = useState({
    temperature: 0,
    pressure: 0,
    humidity: 0,
    rain: 0,
    wind: 0,
    timestamp: "--"
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
    action: "Run AI analysis"
  });

  // --------------------------------------------------
  // LOAD LIVE WEATHER
  // --------------------------------------------------

  const loadWeather = async () => {
    setWeatherLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/weather`);

      if (!response.ok) {
        throw new Error("Weather API request failed");
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
        timestamp: latest.Timestamp || "--"
      });

      // Also update weather cards immediately
      setResult((previous) => ({
        ...previous,
        temperature: latest.Temperature_C ?? 0,
        pressure: latest.Pressure_hPa ?? 0,
        humidity: latest.Humidity_percent ?? 0,
        rain: latest.Rain_mm ?? 0,
        wind: latest.WindSpeed_kmh ?? 0
      }));
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load live weather data. Please check the backend."
      );
    } finally {
      setWeatherLoading(false);
    }
  };

  // --------------------------------------------------
  // RUN AI ANALYSIS USING LIVE WEATHER DATA
  // --------------------------------------------------

  const runAnalysis = async () => {
    setLoading(true);
    setError("");

    try {
      // Step 1: Get live weather records
      const weatherResponse = await fetch(`${API_URL}/api/weather`);

      if (!weatherResponse.ok) {
        throw new Error("Unable to fetch weather data");
      }

      const weatherData = await weatherResponse.json();

      if (
        weatherData.status !== "success" ||
        !weatherData.records ||
        weatherData.records.length === 0
      ) {
        throw new Error("No weather records received");
      }

      const records = weatherData.records;

      // Step 2: Send live records to ML model
      const predictionResponse = await fetch(`${API_URL}/api/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          records: records
        })
      });

      if (!predictionResponse.ok) {
        throw new Error("Prediction request failed");
      }

      const data = await predictionResponse.json();

      const latest = data.latest_prediction || {};
      const latestWeather = weatherData.latest || {};

      const anomalyDetected = Boolean(latest.anomaly);

      setWeather({
        temperature: latestWeather.Temperature_C ?? 0,
        pressure: latestWeather.Pressure_hPa ?? 0,
        humidity: latestWeather.Humidity_percent ?? 0,
        rain: latestWeather.Rain_mm ?? 0,
        wind: latestWeather.WindSpeed_kmh ?? 0,
        timestamp: latestWeather.Timestamp || "--"
      });

      setResult({
        status: latest.status || "NORMAL",

        anomaly: anomalyDetected,

        temperature: latestWeather.Temperature_C ?? 0,
        pressure: latestWeather.Pressure_hPa ?? 0,
        humidity: latestWeather.Humidity_percent ?? 0,
        rain: latestWeather.Rain_mm ?? 0,
        wind: latestWeather.WindSpeed_kmh ?? 0,

        anomalies: data.anomalies_detected ?? 0,
        records: data.records_processed ?? records.length,

        anomalyPercentage:
          Number(data.anomaly_percentage ?? 0).toFixed(2),

        anomalyScore: latest.anomaly_score ?? 0,

        threshold: data.threshold ?? 0,

        rootCause: anomalyDetected
          ? "AI detected abnormal sensor behaviour"
          : "No anomaly detected",

        severity: anomalyDetected ? "Medium" : "Normal",

        // Heuristic dashboard score — not calibrated probability
        confidence: anomalyDetected ? 70 : 0,

        action: anomalyDetected
          ? "Inspect station sensors and verify readings"
          : "Continue normal monitoring"
      });
    } catch (err) {
      console.error(err);

      setError(
        "Unable to connect to SkyGuard AI backend. Please check the Render backend."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // LOAD WEATHER WHEN PAGE OPENS
  // --------------------------------------------------

  useEffect(() => {
    loadWeather();
  }, []);

  // --------------------------------------------------
  // FORMAT TIMESTAMP
  // --------------------------------------------------

  const formatTimestamp = (timestamp) => {
    if (!timestamp || timestamp === "--") {
      return "--";
    }

    return timestamp.replace("T", " ");
  };

  return (
    <div className="app">

      {/* HEADER */}

      <header className="header">

        <div>
          <h1>🛡️ SkyGuard AI</h1>

          <p>
            Intelligent Anomaly Detection for Automatic Weather Stations
          </p>
        </div>

        <div className="system-status">

          <span className="status-dot"></span>

          Backend Online

        </div>

      </header>


      {/* HERO */}

      <section className="hero">

        <div>

          <h2>Weather Station Intelligence Dashboard</h2>

          <p>
            Monitor live weather sensor data and detect abnormal
            readings using Isolation Forest machine learning.
          </p>

          <small>
            Station: AWS_COIMBATORE_TARGET
          </small>

        </div>

        <button
          className="analyze-button"
          onClick={runAnalysis}
          disabled={loading || weatherLoading}
        >

          {loading
            ? "⏳ Analyzing..."
            : "🚀 Run AI Analysis"}

        </button>

      </section>


      {/* ERROR MESSAGE */}

      {error && (

        <section className="section">

          <div className="detection anomaly">

            <div className="detection-icon">
              ⚠️
            </div>

            <div>

              <h2>Connection Problem</h2>

              <p>{error}</p>

            </div>

          </div>

        </section>

      )}


      {/* WEATHER */}

      <section className="section">

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap"
          }}
        >

          <h2>🌦️ Current Weather</h2>

          <span>
            {weatherLoading
              ? "Loading live data..."
              : `Updated: ${formatTimestamp(weather.timestamp)}`}
          </span>

        </div>


        <div className="cards">

          <div className="card">

            <div className="card-icon">
              🌡️
            </div>

            <p>Temperature</p>

            <h3>
              {Number(weather.temperature).toFixed(1)} °C
            </h3>

          </div>


          <div className="card">

            <div className="card-icon">
              🔵
            </div>

            <p>Pressure</p>

            <h3>
              {Number(weather.pressure).toFixed(1)} hPa
            </h3>

          </div>


          <div className="card">

            <div className="card-icon">
              💧
            </div>

            <p>Humidity</p>

            <h3>
              {Number(weather.humidity).toFixed(0)} %
            </h3>

          </div>


          <div className="card">

            <div className="card-icon">
              🌧️
            </div>

            <p>Rain</p>

            <h3>
              {Number(weather.rain).toFixed(1)} mm
            </h3>

          </div>


          <div className="card">

            <div className="card-icon">
              💨
            </div>

            <p>Wind Speed</p>

            <h3>
              {Number(weather.wind).toFixed(1)} km/h
            </h3>

          </div>

        </div>

      </section>


      {/* AI STATUS */}

      <section className="section">

        <h2>🤖 AI Detection Status</h2>

        <div
          className={`detection ${
            result.anomaly ? "anomaly" : "normal"
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
                : "NORMAL WEATHER"}

            </h2>


            <p>

              {result.anomaly
                ? "The AI model detected abnormal sensor behaviour."
                : "No anomaly detected in the analyzed records."}

            </p>

          </div>

        </div>

      </section>


      {/* STATISTICS */}

      <section className="section">

        <h2>📊 Analysis Summary</h2>

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
              {result.anomalyPercentage}%
            </strong>

          </div>


          <div className="stat">

            <span>
              Detection Threshold
            </span>

            <strong>
              {Number(result.threshold).toFixed(4)}
            </strong>

          </div>

        </div>

      </section>


      {/* AI EXPLANATION */}

      <section className="section">

        <h2>🧠 AI Explanation</h2>

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


      {/* ML SCORE */}

      <section className="section">

        <h2>📈 Latest ML Decision</h2>

        <div className="model-box">

          <div>

            <span>
              Latest Status
            </span>

            <strong>
              {result.status}
            </strong>

          </div>


          <div>

            <span>
              Anomaly Score
            </span>

            <strong>
              {Number(result.anomalyScore).toFixed(4)}
            </strong>

          </div>


          <div>

            <span>
              Detection Threshold
            </span>

            <strong>
              {Number(result.threshold).toFixed(4)}
            </strong>

          </div>


          <div>

            <span>
              Decision
            </span>

            <strong>
              {result.anomaly
                ? "ANOMALY"
                : "NORMAL"}
            </strong>

          </div>

        </div>

      </section>


      {/* MODEL INFORMATION */}

      <section className="section">

        <h2>⚙️ AI Model</h2>

        <div className="model-box">

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
              Contamination
            </span>

            <strong>
              Auto
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

        </div>

      </section>


      {/* PIPELINE */}

      <section className="section">

        <h2>🔄 SkyGuard AI Pipeline</h2>

        <div className="pipeline">

          <div>
            🌦️
            <span>Live Weather Data</span>
          </div>

          <div>↓</div>

          <div>
            🧹
            <span>Preprocessing</span>
          </div>

          <div>↓</div>

          <div>
            🤖
            <span>ML Detection</span>
          </div>

          <div>↓</div>

          <div>
            🧠
            <span>Explain</span>
          </div>

          <div>↓</div>

          <div>
            🚨
            <span>Alert / Action</span>
          </div>

        </div>

      </section>


      {/* FOOTER */}

      <footer>

        <p>
          SkyGuard AI • SIH Project • AI/ML-Based Intelligent
          Anomaly Detection for Automatic Weather Stations
        </p>

      </footer>

    </div>
  );
}

export default App;
