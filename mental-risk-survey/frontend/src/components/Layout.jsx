import { STEPS } from "../data/steps.js";

export function Header() {
  return <><a className="skip-link" href="#survey-content">본문으로 건너뛰기</a><header className="site-header"><a className="brand" href="/" aria-label="MindScope 홈"><span className="brand-mark" aria-hidden="true">M</span><span>MindScope</span></a><nav className="header-nav" aria-label="주요 메뉴"><span className="status-pill"><i /> ML 데모</span><a href="/map/지역_위험_지도.html" target="_blank" rel="noreferrer">지역 인사이트</a></nav></header></>;
}

export function Hero() {
  return <section className="hero" aria-labelledby="page-title"><div><p className="eyebrow">MENTAL HEALTH SCREENING</p><h1 id="page-title">내 마음의 신호를<br /><em>차분하게 확인해 보세요.</em></h1><p className="hero-copy">표준 선별 척도와 머신러닝 데모를 활용해 현재 상태를 이해하기 쉬운 결과로 정리합니다.</p></div><div className="privacy-card"><span className="privacy-icon" aria-hidden="true">✓</span><div><strong>응답은 저장하지 않아요</strong><p>입력값은 현재 결과 계산에만 사용됩니다.</p></div></div></section>;
}

export function StepPanel({ step }) {
  const percent = Math.round(((step + 1) / STEPS.length) * 100);
  return <aside className="step-panel" aria-label="설문 진행 단계"><div className="progress-summary"><div><span>진행률</span><strong>{percent}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${percent}%` }} /></div><p>{step + 1} / {STEPS.length} 단계</p></div><ol className="step-list">{STEPS.map((name, index) => <li key={name} className={`step-item ${index === step ? "active" : index < step ? "done" : ""}`}><span className="step-number">{index < step ? "✓" : index + 1}</span><span className="step-name">{name}</span></li>)}</ol><div className="support-note"><span aria-hidden="true">♡</span><p><strong>잠시 쉬어가도 괜찮아요.</strong><br />불편한 감정이 들면 언제든 설문을 멈출 수 있습니다.</p></div></aside>;
}

export function PageFooter() { return <footer><p>MindScope는 학습용 ML 데모이며 의료인의 진단을 대체하지 않습니다.</p></footer>; }
