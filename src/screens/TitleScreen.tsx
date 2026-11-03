/** 처음 화면: 퀴즈 모험과 필드 모험 중에서 고른다 */
import { useNavigate } from 'react-router-dom';
import './title.css';

export function TitleScreen() {
  const navigate = useNavigate();
  return (
    <section className="title">
      <h1 className="title__name">구구단 몬스터 탐험대</h1>
      <div className="title__buttons">
        <button type="button" className="btn btn--primary title__btn" onClick={() => navigate('/pet')}>
          퀴즈 모험
        </button>
        <button type="button" className="btn btn--ghost title__btn" onClick={() => navigate('/field')}>
          필드 모험
        </button>
      </div>
    </section>
  );
}
