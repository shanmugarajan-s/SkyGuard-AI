import React, { useState } from "react";

const API_URL = "https://skyguard-ai-1-4rqi.onrender.com";

function App() {
  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState({
    status: "NORMAL",
    anomaly: false,
    temperature: 24.4,
    pressure: 962.6,
    humidity: 83,
    rain: 0,
    wind: 10.2,
    anomalies: 0,
    records: 24,
    anomalyPercentage: 0,
    anomalyScore: -0.0797,
    threshold: 0.0453,
    rootCause: "No anomaly detected",
    severity: "Normal",
    confidence: 0,
    action: "Continue normal monitoring"
  });

  const sampleWeatherData = [
    {
      Timestamp: "2026-09-26T00:00:00",
      Temperature_C: 24.1,
      Pressure_hPa: 962.1,
      Humidity_percent: 82,
      Rain_mm: 0,
      WindSpeed_kmh: 7.2
    },
    {
      Timestamp: "2026-09-26T01:00:00",
      Temperature_C: 23.8,
      Pressure_hPa: 962.4,
      Humidity_percent: 84,
      Rain_mm: 0,
      WindSpeed_kmh: 6.8
    },
    {
      Timestamp: "2026-09-26T02:00:00",
      Temperature_C: 23.5,
      Pressure_hPa: 962.2,
      Humidity_percent: 86,
      Rain_mm: 0,
      WindSpeed_kmh: 6.5
    },
    {
      Timestamp: "2026-09-26T03:00:00",
      Temperature_C: 23.2,
      Pressure_hPa: 962.0,
      Humidity_percent: 87,
      Rain_mm: 0,
      WindSpeed_kmh: 6.2
    },
    {
      Timestamp: "2026-09-26T04:00:00",
      Temperature_C: 22.9,
      Pressure_hPa: 961.8,
      Humidity_percent: 88,
      Rain_mm: 0,
      WindSpeed_kmh: 6.0
    },
    {
      Timestamp: "2026-09-26T05:00:00",
      Temperature_C: 22.7,
      Pressure_hPa: 962.1,
      Humidity_percent: 87,
      Rain_mm: 0,
      WindSpeed_kmh: 6.4
    },
    {
      Timestamp: "2026-09-26T06:00:00",
      Temperature_C: 23.1,
      Pressure_hPa: 962.5,
      Humidity_percent: 84,
      Rain_mm: 0,
      WindSpeed_kmh: 7.1
    },
    {
      Timestamp: "2026-09-26T07:00:00",
      Temperature_C: 24.3,
      Pressure_hPa: 962.7,
      Humidity_percent: 80,
      Rain_mm: 0,
      WindSpeed_kmh: 8.0
    },
    {
      Timestamp: "2026-09-26T08:00:00",
      Temperature_C: 25.8,
      Pressure_hPa: 962.9,
      Humidity_percent: 75,
      Rain_mm: 0,
      WindSpeed_kmh: 9.1
    },
    {
      Timestamp: "2026-09-26T09:00:00",
      Temperature_C: 27.2,
      Pressure_hPa: 963.1,
      Humidity_percent: 70,
      Rain_mm: 0,
      WindSpeed_kmh: 10.2
    },
    {
      Timestamp: "2026-09-26T10:00:00",
      Temperature_C: 28.6,
      Pressure_hPa: 963.0,
      Humidity_percent: 66,
      Rain_mm: 0,
      WindSpeed_kmh: 11.0
    },
    {
      Timestamp: "2026-09-26T11:00:00",
      Temperature_C: 29.4,
      Pressure_hPa: 962.8,
      Humidity_percent: 62,
      Rain_mm: 0,
      WindSpeed_kmh: 12.0
    },
    {
      Timestamp: "2026-09-26T12:00:00",
      Temperature_C: 30.5,
      Pressure_hPa: 962.6,
      Humidity_percent: 58,
      Rain_mm: 0,
      WindSpeed_kmh: 13.2
    },
    {
      Timestamp: "2026-09-26T13:00:00",
      Temperature_C: 30.1,
      Pressure_hPa: 962.4,
      Humidity_percent: 60,
      Rain_mm: 0,
      WindSpeed_kmh: 14.0
    },
    {
      Timestamp: "2026-09-26T14:00:00",
      Temperature_C: 29.7,
      Pressure_hPa: 962.2,
      Humidity_percent: 63,
      Rain_mm: 0,
      WindSpeed_kmh: 14.5
    },
    {
      Timestamp: "2026-09-26T15:00:00",
      Temperature_C: 29.1,
      Pressure_hPa: 961.9,
      Humidity_percent: 67,
      Rain_mm: 0,
      WindSpeed_kmh: 15.0
    },
    {
      Timestamp: "2026-09-26T16:00:00",
      Temperature_C: 28.4,
      Pressure_hPa: 961.7,
      Humidity_percent: 71,
      Rain_mm: 0,
      WindSpeed_kmh: 14.2
    },
    {
      Timestamp: "2026-09-26T17:00:00",
      Temperature_C: 27.8,
      Pressure_hPa: 961.8,
      Humidity_percent: 74,
      Rain_mm: 0,
      WindSpeed_kmh: 13.4
    },
    {
      Timestamp: "2026-09-26T18:00:00",
      Temperature_C: 27.1,
      Pressure_hPa: 962.0,
      Humidity_percent: 77,
      Rain_mm: 0,
      WindSpeed_kmh: 12.1
    },
    {
      Timestamp: "2026-09-26T19:00:00",
      Temperature_C: 26.3,
      Pressure_hPa: 962.2,
      Humidity_percent: 79,
      Rain_mm: 0,
      WindSpeed_kmh: 11.2
    },
    {
      Timestamp: "2026-09-26T20:00:00",
      Temperature_C: 25.7,
      Pressure_hPa: 962.4,
      Humidity_percent: 81,
      Rain_mm: 0,
      WindSpeed_kmh: 10.5
    },
    {
      Timestamp: "2026-09-26T21:00:00",
      Temperature_C: 25.1,
      Pressure_hPa: 962.5,
      Humidity_percent: 82,
      Rain_mm: 0,
      WindSpeed_kmh: 9.6
    },
    {
      Timestamp: "2026-09-26T22:00:00",
      Temperature_C: 24.7,
      Pressure_hPa: 962.5,
      Humidity_percent: 83,
      Rain_mm: 0,
      WindSpeed_kmh: 8.8
    },
    {
      Timestamp: "2026-09-26T23:00:00",
      Temperature_C: 24.4,
      Pressure_hPa: 962.6,
      Humidity_percent: 83,
      Rain_mm: 0,
      WindSpeed_kmh: 8.1
    }
  ];

  const runAnalysis = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          records: sampleWeatherData
        })
      });

      if (!response.ok) {
        throw new Error("Backend request failed");
      }

      const data = await response.json();

      const latest = data.latest_prediction || {};

      setResult({
        status: latest.status || "NORMAL",
        anomaly: latest.anomaly || false,
        temperature: latest.Temperature_C ?? 0,
        pressure: latest.Pressure_hPa ?? 0,
        humidity: latest.Humidity_percent ?? 0,
        rain: 0,
        wind: 8.1,
        anomalies: data.anomalies_detected ?? 0,
        records: data.records_processed ?? 0,
        anomalyPercentage: data.anomaly_percentage ?? 0,
        anomalyScore: latest.anomaly_score ?? 0,
        threshold: data.threshold ?? 0,
        rootCause: latest.anomaly
          ? "AI detected abnormal sensor behaviour"
          : "No anomaly detected",
        severity: latest.anomaly ? "Medium" : "Normal",
        confidence: latest.anomaly ? 70 : 0,
        action: latest.anomaly
          ? "Inspect station sensors and verify readings"
          : "Continue normal monitoring"
      });
    } catch (error) {
      console.error(error);

      alert(
        "Unable to connect to SkyGuard AI backend. Please check the Render backend."
      );
    } finally {
      setLoading(false);
    }
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
            Monitor weather sensor data and detect abnormal readings using
            Isolation Forest machine learning.
          </p>
        </div>

        <button
          className="analyze-button"
          onClick={runAnalysis}
          disabled={loading}
        >
          {loading ? "⏳ Analyzing..." : "🚀 Run AI Analysis"}
        </button>

      </section>

      {/* WEATHER CARDS */}

      <section className="section">

        <h2>🌦️ Current Weather</h2>

        <div className="cards">

          <div className="card">
            <div className="card-icon">🌡️</div>
            <p>Temperature</p>
            <h3>{result.temperature} °C</h3>
          </div>

          <div className="card">
            <div className="card-icon">🔵</div>
            <p>Pressure</p>
            <h3>{result.pressure} hPa</h3>
          </div>

          <div className="card">
            <div className="card-icon">💧</div>
            <p>Humidity</p>
            <h3>{result.humidity} %</h3>
          </div>

          <div className="card">
            <div className="card-icon">🌧️</div>
            <p>Rain</p>
            <h3>{result.rain} mm</h3>
          </div>

          <div className="card">
            <div className="card-icon">💨</div>
            <p>Wind Speed</p>
            <h3>{result.wind} km/h</h3>
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
            {result.anomaly ? "⚠️" : "✅"}
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
            <span>Records Processed</span>
            <strong>{result.records}</strong>
          </div>

          <div className="stat">
            <span>Anomalies Detected</span>
            <strong>{result.anomalies}</strong>
          </div>

          <div className="stat">
            <span>Anomaly Percentage</span>
            <strong>{result.anomalyPercentage}%</strong>
          </div>

          <div className="stat">
            <span>Detection Threshold</span>
            <strong>{Number(result.threshold).toFixed(4)}</strong>
          </div>

        </div>

      </section>

      {/* AI EXPLANATION */}

      <section className="section">

        <h2>🧠 AI Explanation</h2>

        <div className="explanation">

          <div>
            <span>Root Cause</span>
            <strong>{result.rootCause}</strong>
          </div>

          <div>
            <span>Severity</span>
            <strong>{result.severity}</strong>
          </div>

          <div>
            <span>Confidence Score</span>
            <strong>
              {result.confidence}%
            </strong>
          </div>

          <div>
            <span>Recommended Action</span>
            <strong>{result.action}</strong>
          </div>

        </div>

      </section>

      {/* MODEL INFORMATION */}

      <section className="section">

        <h2>⚙️ AI Model</h2>

        <div className="model-box">

          <div>
            <span>Model</span>
            <strong>Isolation Forest</strong>
          </div>

          <div>
            <span>Estimators</span>
            <strong>200</strong>
          </div>

          <div>
            <span>Contamination</span>
            <strong>Auto</strong>
          </div>

          <div>
            <span>Features</span>
            <strong>15</strong>
          </div>

        </div>

      </section>

      {/* PROJECT PIPELINE */}

      <section className="section">

        <h2>🔄 SkyGuard AI Pipeline</h2>

        <div className="pipeline">

          <div>🌦️<span>Weather Data</span></div>

          <div>↓</div>

          <div>🧹<span>Preprocessing</span></div>

          <div>↓</div>

          <div>🤖<span>ML Detection</span></div>

          <div>↓</div>

          <div>🧠<span>Explain</span></div>

          <div>↓</div>

          <div>🚨<span>Alert / Action</span></div>

        </div>

      </section>

      {/* FOOTER */}

      <footer>

        <p>
          SkyGuard AI • SIH Project • AI/ML-Based Intelligent Anomaly
          Detection for Automatic Weather Stations
        </p>

      </footer>

    </div>
  );
}

export default App;
