import React, { useEffect, useState } from "react";

const API_URL = "https://skyguard-ai-1-4rqi.onrender.com";

const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast";

const WEATHER_PARAMS = {
  latitude: 11.001758,
  longitude: 76.99468,
  hourly:
    "temperature_2m,relativehumidity_2m,surface_pressure,rain,windspeed_10m",
  past_days: 2,
  forecast_days: 1,
  timezone: "Asia/Kolkata",
};

function App() {
  const [weather, setWeather] = useState({
    temperature: 0,
    pressure: 0,
    humidity: 0,
    rain: 0,
    wind: 0,
    timestamp: "--",
    station: "AWS_COIMBATORE_TARGET",
  });

  const [records, setRecords] = useState([]);

  const [result, setResult] = useState({
    anomalies_detected: 0,
    normal_records: 0,
    records_processed: 0,
    anomaly_percentage: 0,
    latest_prediction: {
      status: "NORMAL",
      anomaly: false,
      anomaly_score: 0,
      threshold: 0.045255535895246286,
      Temperature_C: 0,
      Pressure_hPa: 0,
      Humidity_percent: 0,
    },
  });

  const [sensorHealth, setSensorHealth] = useState({
    health_score: 0,
    health_status: "Loading",
    anomaly_rate: 0,
    average_anomaly_persistence_hours: 0,
    records_processed: 0,
    anomalies_detected: 0,
  });

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  // ==========================================================
  // FETCH OPEN-METEO DIRECTLY FROM BROWSER
  // ==========================================================

  const loadWeather = async () => {
    try {
      setError("");

      const query = new URLSearchParams(
        WEATHER_PARAMS
      );

      const response = await fetch(
        `${WEATHER_URL}?${query.toString()}`
      );

      if (!response.ok) {
        throw new Error(
          `Weather API error: ${response.status}`
        );
      }

      const data = await response.json();

      if (!data.hourly) {
        throw new Error(
          "Weather API returned no hourly data."
        );
      }

      const hourly = data.hourly;

      const weatherRecords = hourly.time.map(
        (timestamp, index) => ({
          Timestamp: timestamp,

          Temperature_C:
            hourly.temperature_2m[index],

          Pressure_hPa:
            hourly.surface_pressure[index],

          Humidity_percent:
            hourly.relativehumidity_2m[index],

          Rain_mm:
            hourly.rain[index] ?? 0,

          WindSpeed_kmh:
            hourly.windspeed_10m[index] ?? 0,
        })
      );

      setRecords(weatherRecords);

      const latestIndex =
        weatherRecords.length - 1;

      const latest =
        weatherRecords[latestIndex];

      setWeather({
        temperature:
          latest.Temperature_C,

        pressure:
          latest.Pressure_hPa,

        humidity:
          latest.Humidity_percent,

        rain:
          latest.Rain_mm,

        wind:
          latest.WindSpeed_kmh,

        timestamp:
          latest.Timestamp,

        station:
          "AWS_COIMBATORE_TARGET",
      });

      return weatherRecords;

    } catch (err) {

      console.error(
        "Weather loading failed:",
        err
      );

      setError(
        `Weather loading failed: ${err.message}`
      );

      throw err;
    }
  };


  // ==========================================================
  // RUN ML ANALYSIS
  // ==========================================================

  const runAnalysis = async (
    weatherRecords = records
  ) => {

    try {

      setAnalyzing(true);
      setError("");

      if (
        !weatherRecords ||
        weatherRecords.length === 0
      ) {

        throw new Error(
          "No weather records available."
        );
      }


      const response = await fetch(
        `${API_URL}/api/predict`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            records:
              weatherRecords,
          }),
        }
      );


      if (!response.ok) {

        const errorText =
          await response.text();

        throw new Error(
          `AI API error ${response.status}: ${errorText}`
        );
      }


      const prediction =
        await response.json();


      setResult(prediction);


      // ------------------------------------------------------
      // SENSOR HEALTH
      // ------------------------------------------------------

      const healthResponse =
        await fetch(
          `${API_URL}/api/sensor-health`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              records:
                weatherRecords,
            }),
          }
        );


      if (
        healthResponse.ok
      ) {

        const healthData =
          await healthResponse.json();

        setSensorHealth(
          healthData.health
        );
      }


      return prediction;

    } catch (err) {

      console.error(
        "AI analysis failed:",
        err
      );

      setError(
        `AI analysis failed: ${err.message}`
      );

      throw err;

    } finally {

      setAnalyzing(false);
    }
  };


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {

    const initialize =
      async () => {

        try {

          setLoading(true);

          const weatherRecords =
            await loadWeather();

          await runAnalysis(
            weatherRecords
          );

        } catch (err) {

          console.error(
            "Initialization failed:",
            err
          );

        } finally {

          setLoading(false);
        }
      };


    initialize();

  }, []);


  // ==========================================================
  // MANUAL ANALYSIS
  // ==========================================================

  const handleAnalyze = async () => {

    try {

      const latestRecords =
        await loadWeather();

      await runAnalysis(
        latestRecords
      );

    } catch (err) {

      console.error(err);
    }
  };


  // ==========================================================
  // STATUS
  // ==========================================================

  const isAnomaly =
    result?.latest_prediction?.anomaly;


  const anomalyCount =
    result?.anomalies_detected ?? 0;


  const normalCount =
    result?.normal_records ?? 0;


  const processedCount =
    result?.records_processed ?? 0;


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="app">

      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <header className="header">

        <div className="header-inner">

          <div className="brand">

            <div className="brand-icon">
              ☁
            </div>

            <div>
              <h1>
                SkyGuard AI
              </h1>

              <p>
                Intelligent AWS Anomaly Detection
              </p>
            </div>

          </div>


          <div className="header-status">

            <span className="status-dot"></span>

            Live Monitoring

          </div>

        </div>

      </header>


      {/* ================================================== */}
      {/* MAIN */}
      {/* ================================================== */}

      <main className="container">

        {/* ================================================= */}
        {/* ERROR */}
        {/* ================================================= */}

        {error && (

          <div className="error-box">

            ⚠️ {error}

          </div>

        )}


        {/* ================================================= */}
        {/* HERO */}
        {/* ================================================= */}

        <section className="hero">

          <div>

            <span className="hero-badge">
              AI POWERED
            </span>

            <h2>
              Automatic Weather Station
              Intelligence
            </h2>

            <p>
              Detect → Verify → Explain → Act
            </p>

          </div>


          <button
            className="analyze-button"
            onClick={handleAnalyze}
            disabled={
              analyzing ||
              loading
            }
          >

            {analyzing
              ? "Analyzing..."
              : "Run AI Analysis"}

          </button>

        </section>


        {/* ================================================= */}
        {/* WEATHER */}
        {/* ================================================= */}

        <section className="section">

          <div className="section-heading">

            <div>

              <h2>
                Live Weather
              </h2>

              <p>
                Open-Meteo real-time weather feed
              </p>

            </div>

            <span className="live-badge">
              ● LIVE
            </span>

          </div>


          <div className="weather-grid">

            <div className="weather-card">

              <span>
                Temperature
              </span>

              <strong>
                {weather.temperature}
                °C
              </strong>

            </div>


            <div className="weather-card">

              <span>
                Pressure
              </span>

              <strong>
                {weather.pressure}
                <small> hPa</small>
              </strong>

            </div>


            <div className="weather-card">

              <span>
                Humidity
              </span>

              <strong>
                {weather.humidity}
                %
              </strong>

            </div>


            <div className="weather-card">

              <span>
                Rain
              </span>

              <strong>
                {weather.rain}
                <small> mm</small>
              </strong>

            </div>


            <div className="weather-card">

              <span>
                Wind
              </span>

              <strong>
                {weather.wind}
                <small> km/h</small>
              </strong>

            </div>

          </div>


          <div className="weather-meta">

            <span>
              Station:
              {" "}
              {weather.station}
            </span>

            <span>
              Updated:
              {" "}
              {weather.timestamp}
            </span>

          </div>

        </section>


        {/* ================================================= */}
        {/* AI DETECTION */}
        {/* ================================================= */}

        <section className="section">

          <div className="section-heading">

            <div>

              <h2>
                AI Detection
              </h2>

              <p>
                Isolation Forest anomaly analysis
              </p>

            </div>

          </div>


          <div
            className={
              `detection-card ${
                isAnomaly
                  ? "danger"
                  : "safe"
              }`
            }
          >

            <div className="detection-icon">

              {isAnomaly
                ? "⚠"
                : "✓"}

            </div>


            <div>

              <span className="detection-label">

                Latest ML Decision

              </span>

              <h3>

                {isAnomaly
                  ? "ANOMALY DETECTED"
                  : "NORMAL"}

              </h3>

              <p>

                {isAnomaly
                  ? "The latest weather observation requires investigation."
                  : "The latest weather observation is within the learned normal pattern."}

              </p>

            </div>

          </div>

        </section>


        {/* ================================================= */}
        {/* ANALYSIS SUMMARY */}
        {/* ================================================= */}

        <section className="section">

          <div className="section-heading">

            <div>

              <h2>
                Analysis Summary
              </h2>

              <p>
                Current weather dataset processed by AI
              </p>

            </div>

          </div>


          <div className="analysis-grid">

            <div className="analysis-card">

              <span>
                Records Processed
              </span>

              <strong>
                {processedCount}
              </strong>

            </div>


            <div className="analysis-card anomaly-stat">

              <span>
                Anomalies Detected
              </span>

              <strong>
                {anomalyCount}
              </strong>

            </div>


            <div className="analysis-card">

              <span>
                Normal Records
              </span>

              <strong>
                {normalCount}
              </strong>

            </div>


            <div className="analysis-card">

              <span>
                Anomaly Rate
              </span>

              <strong>
                {result?.anomaly_percentage ?? 0}
                %
              </strong>

            </div>

          </div>

        </section>


        {/* ================================================= */}
        {/* SENSOR HEALTH */}
        {/* ================================================= */}

        <section className="section">

          <div className="section-heading">

            <div>

              <h2>
                Sensor Health
              </h2>

              <p>
                Engineering health assessment
              </p>

            </div>

            <span className="health-status">
              {sensorHealth.health_status}
            </span>

          </div>


          <div className="health-grid">

            <div className="health-score">

              <div className="score-circle">

                <strong>
                  {sensorHealth.health_score}
                </strong>

                <span>
                  /100
                </span>

              </div>

              <p>
                Sensor Health Score
              </p>

            </div>


            <div className="health-metrics">

              <div>

                <span>
                  Anomaly Rate
                </span>

                <strong>
                  {sensorHealth.anomaly_rate}%
                </strong>

              </div>


              <div>

                <span>
                  Avg. Persistence
                </span>

                <strong>
                  {
                    sensorHealth
                      .average_anomaly_persistence_hours
                  }
                  h
                </strong>

              </div>


              <div>

                <span>
                  Records
                </span>

                <strong>
                  {
                    sensorHealth
                      .records_processed
                  }
                </strong>

              </div>


              <div>

                <span>
                  Anomalies
                </span>

                <strong>
                  {
                    sensorHealth
                      .anomalies_detected
                  }
                </strong>

              </div>

            </div>

          </div>


          <div className="health-note">

            ℹ️ Sensor Health Score is an engineering
            dashboard score, not a calibrated probability.

          </div>

        </section>


        {/* ================================================= */}
        {/* AI EXPLANATION */}
        {/* ================================================= */}

        <section className="section">

          <div className="explanation-card">

            <div className="explanation-icon">
              🧠
            </div>

            <div>

              <h2>
                AI Explanation
              </h2>

              <p>

                SkyGuard AI analyzes temperature,
                pressure and humidity using temporal
                features such as changes and 24-hour
                rolling statistics.

              </p>

              <p>

                The Isolation Forest model identifies
                observations that differ from the learned
                normal weather pattern.

              </p>

            </div>

          </div>

        </section>


        {/* ================================================= */}
        {/* MODEL */}
        {/* ================================================= */}

        <section className="section">

          <div className="model-card">

            <h2>
              AI Model
            </h2>

            <div className="model-grid">

              <div>

                <span>
                  Algorithm
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
                  Threshold
                </span>

                <strong>
                  0.0453
                </strong>

              </div>


              <div>

                <span>
                  Core Variables
                </span>

                <strong>
                  T / P / RH
                </strong>

              </div>

            </div>

          </div>

        </section>


        {/* ================================================= */}
        {/* PIPELINE */}
        {/* ================================================= */}

        <section className="section">

          <div className="pipeline-card">

            <h2>
              SkyGuard AI Pipeline
            </h2>

            <div className="pipeline">

              <div>
                <span>1</span>
                Detect
              </div>

              <div className="arrow">
                →
              </div>

              <div>
                <span>2</span>
                Verify
              </div>

              <div className="arrow">
                →
              </div>

              <div>
                <span>3</span>
                Explain
              </div>

              <div className="arrow">
                →
              </div>

              <div>
                <span>4</span>
                Act
              </div>

            </div>

          </div>

        </section>


      </main>


      {/* ================================================== */}
      {/* FOOTER */}
      {/* ================================================== */}

      <footer className="footer">

        <p>
          SkyGuard AI — Intelligent AWS Anomaly
          Detection
        </p>

        <span>
          SIH Prototype • Coimbatore AWS
        </span>

      </footer>

    </div>
  );
}


export default App;
