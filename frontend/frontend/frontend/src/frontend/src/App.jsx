import { useState } from "react";

const API_URL = "https://skyguard-ai-1-4rqi.onrender.com";

function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const testNormalWeather = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          readings: [
            {
              Timestamp: "2026-09-26T00:00:00",
              Temperature_C: 24.1,
              Pressure_hPa: 962.1,
              Humidity_percent: 82,
              Rain_mm: 0,
              WindSpeed_kmh: 8
            },
            {
              Timestamp: "2026-09-26T01:00:00",
              Temperature_C: 23.8,
              Pressure_hPa: 962.2,
              Humidity_percent: 84,
              Rain_mm: 0,
              WindSpeed_kmh: 7
            },
            {
              Timestamp: "2026-09-26T02:00:00",
              Temperature_C: 23.5,
              Pressure_hPa: 962.3,
              Humidity_percent: 85,
              Rain_mm: 0,
              WindSpeed_kmh: 7
            },
            {
              Timestamp: "2026-09-26T03:00:00",
              Temperature_C: 23.2,
              Pressure_hPa: 962.4,
              Humidity_percent: 86,
              Rain_mm: 0,
              WindSpeed_kmh: 6
            },
            {
              Timestamp: "2026-09-26T04:00:00",
              Temperature_C: 22.9,
              Pressure_hPa: 962.5,
              Humidity_percent: 87,
              Rain_mm: 0,
              WindSpeed_kmh: 6
            },
            {
              Timestamp: "2026-09-26T05:00:00",
              Temperature_C: 22.7,
              Pressure_hPa: 962.6,
              Humidity_percent: 88,
              Rain_mm: 0,
              WindSpeed_kmh: 6
            },
            {
              Timestamp: "2026-09-26T06:00:00",
              Temperature_C: 22.8,
              Pressure_hPa: 962.5,
              Humidity_percent: 87,
              Rain_mm: 0,
              WindSpeed_kmh: 7
            },
            {
              Timestamp: "2026-09-26T07:00:00",
              Temperature_C: 23.4,
              Pressure_hPa: 962.4,
              Humidity_percent: 84,
              Rain_mm: 0,
              WindSpeed_kmh: 8
            },
            {
              Timestamp: "2026-09-26T08:00:00",
              Temperature_C: 24.6,
              Pressure_hPa: 962.3,
              Humidity_percent: 80,
              Rain_mm: 0,
              WindSpeed_kmh: 9
            },
            {
              Timestamp: "2026-09-26T09:00:00",
              Temperature_C: 26.0,
              Pressure_hPa: 962.2,
              Humidity_percent: 76,
              Rain_mm: 0,
              WindSpeed_kmh: 10
            },
            {
              Timestamp: "2026-09-26T10:00:00",
              Temperature_C: 27.4,
              Pressure_hPa: 962.1,
              Humidity_percent: 71,
              Rain_mm: 0,
              WindSpeed_kmh: 11
            },
            {
              Timestamp: "2026-09-26T11:00:00",
              Temperature_C: 28.5,
              Pressure_hPa: 962.0,
              Humidity_percent: 67,
              Rain_mm: 0,
              WindSpeed_kmh: 12
            },
            {
              Timestamp: "2026-09-26T12:00:00",
              Temperature_C: 29.4,
              Pressure_hPa: 961.9,
              Humidity_percent: 63,
              Rain_mm: 0,
              WindSpeed_kmh: 13
            },
            {
              Timestamp: "2026-09-26T13:00:00",
              Temperature_C: 30.1,
              Pressure_hPa: 961.8,
              Humidity_percent: 60,
              Rain_mm: 0,
              WindSpeed_kmh: 14
            },
            {
              Timestamp: "2026-09-26T14:00:00",
              Temperature_C: 30.5,
              Pressure_hPa: 961.7,
              Humidity_percent: 58,
              Rain_mm: 0,
              WindSpeed_kmh: 15
            },
            {
              Timestamp: "2026-09-26T15:00:00",
              Temperature_C: 30.2,
              Pressure_hPa: 961.8,
              Humidity_percent: 60,
              Rain_mm: 0,
              WindSpeed_kmh: 14
            },
            {
              Timestamp: "2026-09-26T16:00:00",
              Temperature_C: 29.7,
              Pressure_hPa: 961.9,
              Humidity_percent: 63,
              Rain_mm: 0,
              WindSpeed_kmh: 13
            },
            {
              Timestamp: "2026-09-26T17:00:00",
              Temperature_C: 28.8,
              Pressure_hPa: 962.0,
              Humidity_percent: 67,
              Rain_mm: 0,
              WindSpeed_kmh: 12
            },
            {
              Timestamp: "2026-09-26T18:00:00",
              Temperature_C: 27.6,
              Pressure_hPa: 962.1,
              Humidity_percent: 71,
              Rain_mm: 0,
              WindSpeed_kmh: 10
            },
            {
              Timestamp: "2026-09-26T19:00:00",
              Temperature_C: 26.5,
              Pressure_hPa: 962.2,
              Humidity_percent: 75,
              Rain_mm: 0,
              WindSpeed_kmh: 9
            },
            {
              Timestamp: "2026-09-26T20:00:00",
              Temperature_C: 25.7,
              Pressure_hPa: 962.3,
              Humidity_percent: 78,
              Rain_mm: 0,
              WindSpeed_kmh: 8
            },
            {
              Timestamp: "2026-09-26T21:00:00",
              Temperature_C: 25.1,
              Pressure_hPa: 962.4,
              Humidity_percent: 80,
              Rain_mm: 0,
              WindSpeed_kmh: 8
            },
            {
              Timestamp: "2026-09-26T22:00:00",
              Temperature_C: 24.7,
              Pressure_hPa: 962.5,
              Humidity_percent: 82,
              Rain_mm: 0,
              WindSpeed_kmh: 7
            },
            {
              Timestamp: "2026-09-26T23:00:00",
              Temperature_C: 24.4,
              Pressure_hPa: 962.6,
              Humidity_percent: 83,
              Rain_mm: 0,
              WindSpeed_kmh: 7
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header>
        <div>
          <h1>🛡️ SkyGuard AI</h1>
          <p>Intelligent Anomaly Detection for Automatic Weather Stations</p>
        </div>

        <div className="live">
          <span></span>
          Backend Connected
        </div>
      </header>

      <main>
        <section className="hero">
          <h2>Weather Station Monitoring</h2>
          <p>
            AI-powered detection of abnormal weather sensor readings.
          </p>

          <button onClick={testNormalWeather} disabled={loading}>
            {loading ? "Analyzing..." : "Run AI Analysis"}
          </button>
        </section>

        {error && (
          <div className="error">
            ❌ {error}
          </div>
        )}

        {result && (
          <>
            <section className="status-card">
              {result.anomalies_detected > 0 ? (
                <>
                  <div className="status-icon danger">⚠️</div>
                  <div>
                    <h2>ANOMALY DETECTED</h2>
                    <p>
                      The AI model detected unusual weather sensor readings.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="status-icon safe">✓</div>
                  <div>
                    <h2>NORMAL WEATHER</h2>
                    <p>No anomaly detected in the analyzed records.</p>
                  </div>
                </>
              )}
            </section>

            <section className="cards">
              <div className="card">
                <span>🌡️ Temperature</span>
                <strong>
                  {result.latest_prediction?.Temperature_C ?? "--"} °C
                </strong>
              </div>

              <div className="card">
                <span>🌬️ Pressure</span>
                <strong>
                  {result.latest_prediction?.Pressure_hPa ?? "--"} hPa
                </strong>
              </div>

              <div className="card">
                <span>💧 Humidity</span>
                <strong>
                  {result.latest_prediction?.Humidity_percent ?? "--"} %
                </strong>
              </div>

              <div className="card">
                <span>🚨 Anomalies</span>
                <strong>{result.anomalies_detected}</strong>
              </div>
            </section>

            <section className="details">
              <h2>AI Analysis Result</h2>

              <div className="row">
                <span>Records processed</span>
                <b>{result.records_processed}</b>
              </div>

              <div className="row">
                <span>Normal records</span>
                <b>{result.normal_records}</b>
              </div>

              <div className="row">
                <span>Anomaly percentage</span>
                <b>{result.anomaly_percentage}%</b>
              </div>

              <div className="row">
                <span>Latest status</span>
                <b>
                  {result.latest_prediction?.status ?? "--"}
                </b>
              </div>

              <div className="row">
                <span>Anomaly score</span>
                <b>
                  {result.latest_prediction?.anomaly_score?.toFixed(4) ?? "--"}
                </b>
              </div>

              <div className="row">
                <span>Detection threshold</span>
                <b>{result.threshold.toFixed(4)}</b>
              </div>
            </section>
          </>
        )}
      </main>

      <footer>
        <p>SkyGuard AI • SIH AWS Anomaly Detection System</p>
      </footer>
    </div>
  );
}

export default App;
