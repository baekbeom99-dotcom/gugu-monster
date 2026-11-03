/** 필드 모험 입구 (자리만 — 다음 작업에서 채운다) */
import { useNavigate } from 'react-router-dom';
import './title.css';

export function FieldEntry() {
  const navigate = useNavigate();
  return (
    <section className="field-soon">
      <p>필드 모험 준비 중</p>
      <button type="button" className="btn btn--ghost" onClick={() => navigate('/')}>
        처음 화면
      </button>
    </section>
  );
}
