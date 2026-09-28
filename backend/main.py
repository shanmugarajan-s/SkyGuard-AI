from fastapi import FastAPI

app = FastAPI(
    title="SkyGuard AI",
    description="AI/ML-Based Intelligent Anomaly Detection for Automatic Weather Stations",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "project": "SkyGuard AI",
        "status": "Backend is running",
        "message": "AWS Anomaly Detection API"
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy"
    }
