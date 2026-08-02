import { useCallback, useMemo, useState } from "react";
import { API_BASE, PHQ9A_ITEMS, GAD7_ITEMS, K10_ITEMS, PHQ_GAD_CHOICES, K10_CHOICES } from "./data/survey.js";
import { sum, bandPHQ9, bandGAD7, bandK10, phqBandLabel, gadBandLabel, k10BandLabel } from "./utils/scoring.js";
import { Header, Hero, StepPanel, PageFooter } from "./components/Layout.jsx";
import { STEPS } from "./data/steps.js";
import { RegionStep, IntroStep, ScaleStep, SafetyStep } from "./components/SurveySteps.jsx";
import CrisisModal from "./components/CrisisModal.jsx";

const REGIONS = ["서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시", "대전광역시", "울산광역시", "세종특별자치시", "경기도", "강원특별자치도", "충청북도", "충청남도", "전북특별자치도", "전라남도", "경상북도", "경상남도", "제주특별자치도"];
const initialAnswers = () => ({ phq: Array(9).fill(null), gad: Array(7).fill(null), k10: Array(10).fill(null), asq: Array(4).fill(null) });

export default function App() {
  const [step, setStep] = useState(0); const [region, setRegion] = useState(""); const [answers, setAnswers] = useState(initialAnswers); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [crisisOpen, setCrisisOpen] = useState(false);
  const scores = useMemo(() => ({ phq: sum(answers.phq), gad: sum(answers.gad), k10: sum(answers.k10), item9: answers.phq[8] ?? 0 }), [answers]);
  const completion = useMemo(() => { if (step === 0) return region ? 1 : 0; if (step === 1) return 1; const key = [null, null, "phq", "gad", "k10", "asq"][step]; return answers[key].filter(value => value !== null).length / answers[key].length; }, [step, region, answers]);
  const updateAnswer = useCallback((scale, index, value) => { setAnswers(current => ({ ...current, [scale]: current[scale].map((answer, i) => i === index ? value : answer) })); if ((scale === "phq" && index === 8 && value > 0) || (scale === "asq" && value === true)) setCrisisOpen(true); setResult(null); }, []);
  const restart = () => { setStep(0); setRegion(""); setAnswers(initialAnswers()); setResult(null); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const submit = async () => { setLoading(true); setError(""); setResult(null); try { const response = await fetch(`${API_BASE}/predict`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phq_total: scores.phq, gad_total: scores.gad, k10_total: scores.k10, phq_item9: scores.item9, asq_any_yes: answers.asq.some(Boolean) }) }); const data = await response.json(); if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail)); setResult(data); } catch (requestError) { setError(`결과를 불러오지 못했습니다. API 서버 상태를 확인해 주세요.\n${requestError.message}`); } finally { setLoading(false); } };
  const next = () => { if (completion !== 1 || loading) return; if (step < STEPS.length - 1) { setStep(current => current + 1); window.scrollTo({ top: 0, behavior: "smooth" }); } else submit(); };
  const previous = () => { if (step === 0 || loading) return; setStep(current => current - 1); setResult(null); window.scrollTo({ top: 0, behavior: "smooth" }); };
  let content;
  if (step === 0) content = <RegionStep regions={REGIONS} value={region} onChange={setRegion} />;
  else if (step === 1) content = <IntroStep />;
  else if (step === 2) content = <ScaleStep kicker="STEP 03 · PHQ-9" title="지난 2주간의 우울 신호" description="각 문항이 얼마나 자주 있었는지 선택해 주세요." items={PHQ9A_ITEMS} answers={answers.phq} choices={PHQ_GAD_CHOICES} max={27} bandLabel={phqBandLabel(bandPHQ9(scores.phq))} onAnswer={(i, v) => updateAnswer("phq", i, v)} />;
  else if (step === 3) content = <ScaleStep kicker="STEP 04 · GAD-7" title="지난 2주간의 불안 신호" description="평균적인 상태와 가장 가까운 응답을 선택해 주세요." items={GAD7_ITEMS} answers={answers.gad} choices={PHQ_GAD_CHOICES} max={21} bandLabel={gadBandLabel(bandGAD7(scores.gad))} onAnswer={(i, v) => updateAnswer("gad", i, v)} />;
  else if (step === 4) content = <ScaleStep kicker="STEP 05 · K10" title="지난 4주간의 스트레스 신호" description="각 감정을 얼마나 자주 경험했는지 선택해 주세요." items={K10_ITEMS} answers={answers.k10} choices={K10_CHOICES} max={50} bandLabel={k10BandLabel(bandK10(scores.k10))} onAnswer={(i, v) => updateAnswer("k10", i, v)} />;
  else content = <SafetyStep answers={answers.asq} onAnswer={(i, v) => updateAnswer("asq", i, v)} scores={scores} result={result} loading={loading} error={error} region={region} onRestart={restart} />;
  return <><Header /><main id="survey-content" className="page-shell"><Hero /><section className="survey-layout"><StepPanel step={step} /><div className="survey-main"><div className="sr-only" aria-live="polite">{result ? "위험 신호 분석이 완료되었습니다." : ""}</div><section className="content-card" aria-live="polite">{content}</section><div className="survey-actions"><button className="button button-secondary" type="button" disabled={step === 0 || loading} onClick={previous}>이전</button><p className="answer-status">{step > 1 && step < 5 ? `현재 단계 ${Math.round(completion * 100)}% 응답 완료` : ""}</p><button className="button button-primary" type="button" disabled={completion !== 1 || loading} onClick={next}>{step === 5 ? loading ? "분석 중…" : "결과 분석하기 →" : "다음 단계 →"}</button></div></div></section></main><PageFooter /><CrisisModal open={crisisOpen} onClose={() => setCrisisOpen(false)} /></>;
}
