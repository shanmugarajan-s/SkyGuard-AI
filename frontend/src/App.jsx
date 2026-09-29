import React, { useEffect, useMemo, useState } from "react";

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


// ==========================================================
// SMALL CHART COMPONENT
// ==========================================================

function WeatherChart({
  title,
  unit,
  records,
  valueKey,
  anomalyTimestamps,
  formatValue = (value) => value,
}) {
  const width = 900;
  const height = 280;

  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 35;
  const paddingBottom = 45;

  const chartWidth =
    width - paddingLeft - paddingRight;

  const chartHeight =
    height - paddingTop - paddingBottom;

  const values = records
    .map((record) => Number(record[valueKey]))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return (
      <div className="chart-card">
        <h3>{title}</h3>
        <p>No chart data available.</p>
      </div>
    );
  }

  let minValue = Math.min(...values);
  let maxValue = Math.max(...values);

  if (minValue === maxValue) {
    minValue -= 1;
    maxValue += 1;
  }

  const range = maxValue - minValue;

  const extra = range * 0.12;

  minValue -= extra;
  maxValue += extra;

  const getX = (index) => {
    if (records.length === 1) {
      return paddingLeft;
    }

    return (
      paddingLeft +
      (index / (records.length - 1)) *
        chartWidth
    );
  };

  const getY = (value) => {
    return (
      paddingTop +
      ((maxValue - value) /
        (maxValue - minValue)) *
        chartHeight
    );
  };

  const points = records
    .map((record, index) => {
      const value = Number(record[valueKey]);

      if (!Number.isFinite(value)) {
        return null;
      }

      return `${getX(index)},${getY(value)}`;
    })
    .filter(Boolean)
    .join(" ");

  const anomalySet = new Set(
    anomalyTimestamps || []
  );

  const anomalyPoints = records
    .map((record, index) => ({
      record,
      index,
    }))
    .filter(({ record }) =>
      anomalySet.has(record.Timestamp)
    );

  const formatAxis = (value) =>
    Number(value).toFixed(
      Number.isInteger(value) ? 0 : 1
    );

  return (
    <div className="chart-card">

      <div className="chart-header">

        <div>
          <h3>{title}</h3>

          <p>
            Last {records.length} observations
          </p>
        </div>

        <span className="chart-unit">
          {unit}
        </span>

      </div>

      <div className="chart-wrapper">

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="weather-chart"
          preserveAspectRatio="none"
        >

          {/* GRID */}

          {[0, 0.25, 0.5, 0.75, 1].map(
            (position) => {

              const y =
                paddingTop +
                position * chartHeight;

              const value =
                maxValue -
                position *
                  (maxValue - minValue);

              return (
                <g key={position}>

                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={
                      width -
                      paddingRight
                    }
                    y2={y}
                    className="chart-grid-line"
                  />

                  <text
                    x={paddingLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="chart-axis-label"
                  >
                    {formatAxis(value)}
                  </text>

                </g>
              );
            }
          )}

          {/* LINE */}

          <polyline
            points={points}
            fill="none"
            className="chart-line"
          />

          {/* ANOMALY POINTS */}

          {anomalyPoints.map(
            ({ record, index }) => {

              const value =
                Number(record[valueKey]);

              if (!Number.isFinite(value)) {
                return null;
              }

              return (
                <g
                  key={`${record.Timestamp}-${valueKey}`}
                >

                  <circle
                    cx={getX(index)}
                    cy={getY(value)}
                    r="7"
                    className="anomaly-point"
                  />

                  <circle
                    cx={getX(index)}
                    cy={getY(value)}
                    r="11"
                    className="anomaly-ring"
                  />

                </g>
              );
            }
          )}

          {/* START LABEL */}

          <text
            x={paddingLeft}
            y={height - 15}
            className="chart-time-label"
          >
            {records[0]?.Timestamp
              ?.replace("T", " ")
              ?.slice(5, 16)}
          </text>

          {/* END LABEL */}

          <text
            x={
              width -
              paddingRight
            }
            y={height - 15}
            textAnchor="end"
            className="chart-time-label"
          >
            {records[
              records.length - 1
            ]?.Timestamp
              ?.replace("T", " ")
              ?.slice(5, 16)}
          </text>

        </svg>

      </div>

      <div className="chart-footer">

        <span>
          Min:{" "}
          <strong>
            {formatValue(
              Math.min(...values)
            )}
            {unit}
          </strong>
        </span>

        <span>
          Max:{" "}
          <strong>
            {formatValue(
              Math.max(...values)
            )}
            {unit}
          </strong>
        </span>

        <span className="anomaly-legend">
          <i></i>
          AI anomaly
        </span>

      </div>

    </div>
  );
}


// ==========================================================
// MAIN APP
// ==========================================================

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

  const [anomalyRecords, setAnomalyRecords] =
    useState([]);

  const [result, setResult] = useState({
    anomalies_detected: 0,
    normal_records: 0,
    records_processed: 0,
    anomaly_percentage: 0,

    latest_prediction: {
      status: "NORMAL",
      anomaly: false,
      anomaly_score: 0,
      threshold:
        0.045255535895246286,
      Temperature_C: 0,
      Pressure_hPa: 0,
      Humidity_percent: 0,
    },
  });

  const [sensorHealth, setSensorHealth] =
    useState({
      health_score: 0,
      health_status: "Loading",
      anomaly_rate: 0,
      average_anomaly_persistence_hours: 0,
      records_processed: 0,
      anomalies_detected: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [analyzing, setAnalyzing] =
    useState(false);

  const [error, setError] =
    useState("");


  // ==========================================================
  // FETCH WEATHER
  // ==========================================================

  const loadWeather = async () => {

    try {

      setError("");

      const query =
        new URLSearchParams(
          WEATHER_PARAMS
        );

      const response =
        await fetch(
          `${WEATHER_URL}?${query.toString()}`
        );

      if (!response.ok) {

        throw new Error(
          `Weather API error: ${response.status}`
        );
      }

      const data =
        await response.json();

      if (!data.hourly) {

        throw new Error(
          "Weather API returned no hourly data."
        );
      }

      const hourly =
        data.hourly;

      const weatherRecords =
        hourly.time.map(
          (timestamp, index) => ({

            Timestamp:
              timestamp,

            Temperature_C:
              hourly
                .temperature_2m[
                  index
                ],

            Pressure_hPa:
              hourly
                .surface_pressure[
                  index
                ],

            Humidity_percent:
              hourly
                .relativehumidity_2m[
                  index
                ],

            Rain_mm:
              hourly.rain[index] ??
              0,

            WindSpeed_kmh:
              hourly
                .windspeed_10m[
                  index
                ] ?? 0,
          })
        );

      setRecords(
        weatherRecords
      );

      const latestIndex =
        weatherRecords.length - 1;

      const latest =
        weatherRecords[
          latestIndex
        ];

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
  // FETCH ANOMALY DETAILS
  // ==========================================================

  const loadAnomalies = async (
    weatherRecords
  ) => {

    try {

      const response =
        await fetch(
          `${API_URL}/api/anomalies`,
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

        console.warn(
          "Anomaly details endpoint returned:",
          response.status
        );

        return;
      }

      const data =
        await response.json();

      /*
       * The backend may return the anomaly
       * list under different names depending
       * on the response structure.
       */

      const possibleLists = [

        data.anomalies,

        data.records,

        data.anomaly_records,

        data.data,

        data.results,

      ];

      let list = null;

      for (
        const candidate of
        possibleLists
      ) {

        if (
          Array.isArray(candidate)
        ) {

          list = candidate;
          break;
        }
      }

      if (!list) {

        setAnomalyRecords([]);

        return;
      }

      /*
       * Convert backend anomaly records
       * into timestamps that match the
       * Open-Meteo records.
       */

      const timestamps =
        list
          .map(
            (item) =>
              item.Timestamp ??
              item.timestamp ??
              item.DateTime ??
              item.datetime
          )
          .filter(Boolean);

      const matched =
        weatherRecords.filter(
          (record) =>
            timestamps.includes(
              record.Timestamp
            )
        );

      setAnomalyRecords(
        matched
      );

    } catch (err) {

      console.warn(
        "Could not load anomaly details:",
        err
      );

      /*
       * This should NOT break the
       * main dashboard.
       */

      setAnomalyRecords([]);
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


      // ------------------------------------------------------
      // PREDICTION
      // ------------------------------------------------------

      const response =
        await fetch(
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

      setResult(
        prediction
      );


      // ------------------------------------------------------
      // ANOMALY DETAILS
      // ------------------------------------------------------

      await loadAnomalies(
        weatherRecords
      );


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

        if (
          healthData.health
        ) {

          setSensorHealth(
            healthData.health
          );
        }
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

  const handleAnalyze =
    async () => {

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
  // DERIVED DATA
  // ==========================================================

  const isAnomaly =
    result?.latest_prediction?.anomaly;

  const anomalyCount =
    result?.anomalies_detected ?? 0;

  const normalCount =
    result?.normal_records ?? 0;

  const processedCount =
    result?.records_processed ?? 0;


  /*
   * Timestamp set used by charts.
   */

  const anomalyTimestamps =
    useMemo(
      () =>
        anomalyRecords.map(
          (record) =>
            record.Timestamp
        ),
      [anomalyRecords]
    );


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

        {/* ERROR */}

        {error && (

          <div className="error-box">

            ⚠️ {error}

          </div>

        )}


        {/* HERO */}

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
        {/* LIVE WEATHER */}
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
                <small>
                  {" "}hPa
                </small>
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
                <small>
                  {" "}mm
                </small>
              </strong>

            </div>


            <div className="weather-card">

              <span>
                Wind
              </span>

              <strong>
                {weather.wind}
                <small>
                  {" "}km/h
                </small>
              </strong>

            </div>

          </div>


          <div className="weather-meta">

  <span>
    Station: <strong>{weather.station}</strong>
  </span>

  <span>
    Updated: <strong>{weather.timestamp}</strong>
  </span>

</div>
