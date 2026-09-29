import React from "react";
import { useState } from "react";

const API_URL = "https://skyguard-ai-1-4rqi.onrender.com";

function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runAnalysis = async () => {
    setLoading(true);
    setError("");

    const readings = [
      [0, 24.1, 962.1, 82, 8],
      [1, 23.8, 962.2, 84, 7],
      [2, 23.5, 962.3, 85, 7],
      [3, 23.2, 962.4, 86, 6],
      [4, 22.9, 962.5, 87, 6],
      [5, 22.7, 962.6, 88, 6],
      [6, 22.8, 962.5, 87, 7],
      [7, 23.4, 962.4, 84, 8],
      [8, 24.6, 962.3, 80, 9],
      [9, 26.0, 962.2, 76, 10],
      [10, 27.4, 962.1, 71, 11],
      [11, 28.5, 962.0, 67, 12],
      [12, 29.4, 961.9, 63, 13],
      [13, 30.1, 961.8, 60, 14],
      [14, 30.5, 961.7, 58, 15],
      [15, 30.2, 961.8, 60, 14],
      [16, 29.7, 961.9, 63, 13],
      [17, 28.8, 962.0, 67, 12],
      [18, 27.6, 962.1, 71, 10],
      [19, 26.5, 962.2, 75, 9],
      [20, 25.7, 962.3, 78, 8],
      [21, 25.1, 962.4, 80, 8],
      [22, 24.7, 962.5, 82, 7],
      [23, 24.4, 962.6, 83, 7]
    ];

    const data = readings.map(
      ([hour, temp, pressure, humidity, wind]) => ({
        Timestamp: `2026-09-26T${String(hour).padStart(2, "0")}:00:00`,
        Temperature_C: temp,
        Pressure_hPa: pressure,
        Humidity_percent: humidity,
        Rain_mm: 0,
        WindSpeed_kmh: wind
      })
    );

    try {
      const response = await fetch(`${API_URL}/api/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          readings: data
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const json = await response.json();
      setResult(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1>🛡️ SkyGuard AI</h1>
        <p>
          AI/ML-Based Intelligent Anomaly Detection for Automatic Weather
          Stations
        </p>
      </header>

      <main style={styles.container}>
        <section style={styles.hero}>
          <h2>Weather Station Dashboard</h2>
          <p>
            Monitor weather sensor data and detect abnormal readings using
            Isolation Forest.
          </p>

          <button
            onClick={runAnalysis}
            disabled={loading}
            style={styles.button}
          >
            {loading ? "Analyzing..." : "Run AI Analysis"}
          </button>
        </section>

        {error && (
          <div style={styles.error}>
            ❌ {error}
          </div>
        )}

        {result && (
          <>
            <section
              style={{
                ...styles.status,
                background:
                  result.anomalies_detected > 0 ? "#fee2e2" : "#dcfce7"
              }}
            >
              <div style={{ fontSize: "40px" }}>
                {result.anomalies_detected > 0 ? "🚨" : "✅"}
              </div>

              <div>
                <h2>
                  {result.anomalies_detected > 0
                    ? "ANOMALY DETECTED"
                    : "NORMAL WEATHER"}
                </h2>

                <p>
                  {result.anomalies_detected > 0
                    ? "The AI model detected unusual sensor readings."
                    : "No anomaly detected in the analyzed records."}
                </p>
              </div>
            </section>

            <section style={styles.grid}>
              <div style={styles.card}>
                <span>🌡️ Temperature</span>
                <strong>
                  {result.latest_prediction?.Temperature_C} °C
                </strong>
              </div>

              <div style={styles.card}>
                <span>🌬️ Pressure</span>
                <strong>
                  {result.latest_prediction?.Pressure_hPa} hPa
                </strong>
              </div>

              <div style={styles.card}>
                <span>💧 Humidity</span>
                <strong>
                  {result.latest_prediction?.Humidity_percent} %
                </strong>
              </div>

              <div style={styles.card}>
                <span>🚨 Anomalies</span>
                <strong>{result.anomalies_detected}</strong>
              </div>
            </section>

            <section style={styles.details}>
              <h2>AI Analysis Result</h2>

              <p>
                <b>Records Processed:</b> {result.records_processed}
              </p>

              <p>
                <b>Normal Records:</b> {result.normal_records}
              </p>

              <p>
                <b>Anomaly Percentage:</b> {result.anomaly_percentage}%
              </p>

              <p>
                <b>Latest Status:</b>{" "}
                {result.latest_prediction?.status}
              </p>

              <p>
                <b>Anomaly Score:</b>{" "}
                {result.latest_prediction?.anomaly_score?.toFixed(4)}
              </p>

              <p>
                <b>Detection Threshold:</b>{" "}
                {result.threshold?.toFixed(4)}
              </p>
            </section>
          </>
        )}
      </main>

      <footer style={styles.footer}>
        SkyGuard AI • Smart India Hackathon Project
      </footer>
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    background: "#f4f7fb",
    fontFamily: "Arial, sans-serif",
    color: "#172033"
  },

  header: {
    background: "#101827",
    color: "white",
    padding: "30px 7%"
  },

  container: {
    width: "86%",
    maxWidth: "1200px",
    margin: "40px auto"
  },

  hero: {
    background: "white",
    padding: "30px",
    borderRadius: "16px",
    marginBottom: "25px"
  },

  button: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "14px 24px",
    borderRadius: "8px",
    fontSize: "16px",
    cursor: "pointer",
    marginTop: "15px"
  },

  status: {
    padding: "25px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    gap: "20px",
    marginBottom: "25px"
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "18px"
  },

  card: {
    background: "white",
    padding: "25px",
    borderRadius: "15px"
  },

  details: {
    background: "white",
    padding: "30px",
    borderRadius: "16px",
    marginTop: "25px"
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "20px"
  },

  footer: {
    textAlign: "center",
    padding: "30px",
    color: "#667085"
  }
};

export default App;
