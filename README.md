# Mental Health Risk Analysis

표준 정신건강 설문 응답을 기반으로 우울, 불안, 스트레스와 자살 위험 신호를 분석하는 머신러닝 기반 서비스입니다.

> 본 프로젝트는 의료 진단이 아닌 위험 신호 탐지와 행동 안내를 목적으로 제작한 프로토타입입니다.

## 주요 기능

* PHQ-9, GAD-7, K10, ASQ 설문 통합
* 정신건강 위험 확률과 등급 제공
* 위험 판정 근거 및 행동 안내 생성
* 고위험 응답에 대한 안전 규칙 우선 처리
* 지역별 통계와 연도별 변화 시각화

## 기술 스택

* **Frontend:** React, Vite, Chart.js
* **Backend:** FastAPI, Python, Pydantic
* **Machine Learning:** scikit-learn
* **Visualization:** Folium

## 핵심 구현

* Logistic Regression과 Random Forest 모델을 학습하고 성능을 비교했습니다.
* 데이터 불균형을 고려해 PR-AUC를 중심으로 모델을 평가했습니다.
* 모델의 예측 확률을 위험 등급과 판정 근거로 변환하는 로직을 구현했습니다.
* 고위험 문항이 감지되면 모델 예측보다 안전 안내가 우선 적용되도록 구성했습니다.
* 입력 범위와 특성 순서를 검증해 잘못된 요청과 모델 입력 오류를 방지했습니다.
