import { useEffect, useRef } from "react";

export default function CrisisModal({ open, onClose }) {
  const closeButton = useRef(null);
  useEffect(() => { if (!open) return; const previous = document.activeElement; document.body.style.overflow = "hidden"; closeButton.current?.focus(); const escape = event => event.key === "Escape" && onClose(); document.addEventListener("keydown", escape); return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", escape); previous?.focus?.(); }; }, [open, onClose]);
  if (!open) return null;
  return <div className="modal"><button className="modal-backdrop" onClick={onClose} aria-label="안내 닫기" /><section className="modal-dialog" role="alertdialog" aria-modal="true" aria-labelledby="crisis-title" aria-describedby="crisis-description"><span className="modal-symbol" aria-hidden="true">♡</span><p className="eyebrow danger">IMMEDIATE SUPPORT</p><h2 id="crisis-title">지금 혼자 견디지 않아도 됩니다.</h2><p id="crisis-description">응답에서 안전과 관련된 신호가 확인되었습니다. 즉각적인 위험이 있다면 112 또는 119에 연락하고, 가까운 사람에게 현재 상황을 알려주세요.</p><div className="hotline-card"><span>24시간 자살예방 상담전화</span><a href="tel:109">109 연결하기</a></div><div className="modal-actions"><button ref={closeButton} className="button button-secondary" type="button" onClick={onClose}>설문 계속하기</button><a className="button button-danger" href="tel:109">상담전화 연결</a></div><p className="modal-footnote">이 안내는 진단이 아니라 안전을 우선하기 위한 조치입니다.</p></section></div>;
}
