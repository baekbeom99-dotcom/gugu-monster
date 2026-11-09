/** 처음 화면: 퀴즈 모험과 필드 모험 중에서 고른다. 뒤에는 작은 필드 그림 */
import { useNavigate } from 'react-router-dom';
import { DAN_COLORS } from '../art/colors';
import { MonsterSprite } from '../art/MonsterSprite';
import { PixelSprite } from '../field/PixelSprite';
import { HERO_SPRITES } from '../field/pixelArt';
import './title.css';

export function TitleScreen() {
  const navigate = useNavigate();
  return (
    <section className="title">
      <div className="title__scene" aria-hidden>
        <span className="title__sun" />
        <span className="title__cloud title__cloud--a" />
        <span className="title__cloud title__cloud--b" />
        <span className="title__hill title__hill--back" />
        <span className="title__hill title__hill--front" />
        <span className="title__path" />
        <div className="title__cast">
          <MonsterSprite kind="cloud" color={DAN_COLORS[5]} mood="happy" size={112} className="title__mon title__mon--a" />
          <PixelSprite art={HERO_SPRITES.down[0]} size={64} className="title__hero" />
          <MonsterSprite kind="jelly" color={DAN_COLORS[8]} mood="idle" size={100} className="title__mon title__mon--b" />
        </div>
      </div>
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
