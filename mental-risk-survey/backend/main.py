from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator

PROJECT_ROOT = Path(__file__).resolve().parents[1]
MODELS_DIR = PROJECT_ROOT / "models"
FEATURE_ORDER = ["phq_total", "gad_total", "k10_total", "phq_item9", "asq_any_yes"]
MODEL_FILES = {
    "suicidal": MODELS_DIR / "suicidal_model.joblib",
    "depression": MODELS_DIR / "depression_model.joblib",
    "stress": MODELS_DIR / "stress_model.joblib",
}
models: dict[str, object] = {}


def load_models() -> None:
    missing = [str(path) for path in MODEL_FILES.values() if not path.exists()]
    if missing:
        raise RuntimeError(f"Model files are missing: {', '.join(missing)}")
    saved_order_path = MODELS_DIR / "feature_order.joblib"
    if saved_order_path.exists() and list(joblib.load(saved_order_path)) != FEATURE_ORDER:
        raise RuntimeError("Saved feature order does not match the API schema")
    models.update({name: joblib.load(path) for name, path in MODEL_FILES.items()})


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        load_models()
    except Exception as exc:
        print(f"[models] load failed: {exc}")
    yield
    models.clear()


app = FastAPI(
    title="MentalSurvey Risk Screening API",
    description="합성 데이터 기반 정신건강 위험 신호 ML 데모 API",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class RiskInput(BaseModel):
    phq_total: int = Field(ge=0, le=27, description="PHQ-9 total score")
    gad_total: int = Field(ge=0, le=21, description="GAD-7 total score")
    k10_total: int = Field(ge=10, le=50, description="K10 total score")
    phq_item9: int = Field(ge=0, le=3, description="PHQ-9 item 9 score")
    asq_any_yes: bool

    @model_validator(mode="after")
    def validate_consistency(self):
        if self.phq_item9 > self.phq_total:
            raise ValueError("phq_item9 cannot exceed phq_total")
        return self


class PredictionItem(BaseModel):
    label: str
    probability: float
    probability_pct: float
    level: Literal["low", "moderate", "high"]
    level_label: str


class PredictionSet(BaseModel):
    suicidal: PredictionItem
    depression: PredictionItem
    stress: PredictionItem


class RiskOutput(BaseModel):
    predictions: PredictionSet
    overall_level: Literal["low", "moderate", "high"]
    summary: str
    recommendation: str
    reasons: list[str]
    model_version: str = "synthetic-demo-1.0"
    disclaimer: str = "합성 데이터 기반 선별 데모이며 의학적 진단이 아닙니다."


class LegacyRiskOutput(BaseModel):
    suicidal_signal_pct: float
    depression_risk_pct: float
    stress_risk_pct: float


def predict_probability(model: object, features: np.ndarray) -> float:
    return float(np.clip(model.predict_proba(features)[0, 1], 0.0, 1.0))


def level_for(probability: float) -> tuple[str, str]:
    # 데모 모델의 표시용 임계값이며 임상 기준이 아니다.
    if probability >= 0.67:
        return "high", "높음"
    if probability >= 0.34:
        return "moderate", "주의"
    return "low", "낮음"


def make_item(label: str, probability: float) -> PredictionItem:
    level, level_label = level_for(probability)
    return PredictionItem(label=label, probability=round(probability, 4), probability_pct=round(probability * 100, 1), level=level, level_label=level_label)


def run_prediction(payload: RiskInput) -> RiskOutput:
    if len(models) != len(MODEL_FILES):
        raise HTTPException(status_code=503, detail="Prediction models are not available")
    values = payload.model_dump()
    features = np.array([[int(values[name]) for name in FEATURE_ORDER]], dtype=float)
    probabilities = {name: predict_probability(model, features) for name, model in models.items()}
    reasons: list[str] = []
    if payload.asq_any_yes:
        reasons.append("안전 확인 문항에서 주의 응답이 확인됨")
    if payload.phq_item9 > 0:
        reasons.append("PHQ-9 안전 관련 문항에서 신호가 확인됨")
    if payload.phq_total >= 15:
        reasons.append("PHQ-9 점수가 중등도-중증 이상 구간임")
    if payload.gad_total >= 15:
        reasons.append("GAD-7 점수가 중증 구간임")
    if payload.k10_total >= 30:
        reasons.append("K10 점수가 매우 높은 구간임")
    model_level = max((level_for(p)[0] for p in probabilities.values()), key={"low": 0, "moderate": 1, "high": 2}.get)
    overall = "high" if payload.asq_any_yes or payload.phq_item9 > 0 else model_level
    copy = {
        "low": ("현재 뚜렷한 고위험 신호는 낮아요.", "상태 변화를 지켜보고 규칙적인 수면과 휴식을 유지해 보세요."),
        "moderate": ("주의 깊게 살펴볼 신호가 있어요.", "증상이 이어지거나 일상에 영향을 준다면 정신건강 전문가와 상담해 보세요."),
        "high": ("안전을 위해 빠른 도움을 권장해요.", "혼자 머물지 말고 신뢰하는 사람에게 알린 뒤, 즉각적인 위험이 있다면 112·119 또는 자살예방상담전화 109에 연락하세요."),
    }
    summary, recommendation = copy[overall]
    return RiskOutput(
        predictions=PredictionSet(
            suicidal=make_item("자살 관련 위험 신호", probabilities["suicidal"]),
            depression=make_item("우울 위험 신호", probabilities["depression"]),
            stress=make_item("스트레스 위험 신호", probabilities["stress"]),
        ), overall_level=overall, summary=summary, recommendation=recommendation, reasons=reasons,
    )


@app.post("/predict", response_model=RiskOutput)
def predict(payload: RiskInput) -> RiskOutput:
    return run_prediction(payload)


@app.post("/predict_risk", response_model=LegacyRiskOutput, deprecated=True)
def predict_legacy(payload: RiskInput) -> LegacyRiskOutput:
    result = run_prediction(payload).predictions
    return LegacyRiskOutput(suicidal_signal_pct=result.suicidal.probability_pct, depression_risk_pct=result.depression.probability_pct, stress_risk_pct=result.stress.probability_pct)


@app.get("/health")
def health():
    return {"status": "ok" if len(models) == len(MODEL_FILES) else "degraded", "models_loaded": sorted(models), "version": app.version}


@app.get("/")
def root():
    return {"name": app.title, "docs": "/docs", "health": "/health"}
