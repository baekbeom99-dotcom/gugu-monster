/** 펫 방 위에 겹쳐 그리는 놀기 장면 (산책 풍경, 장난감 소품, 하트·음표) */
import type { PlayStyle } from '../data/playStyles';

export function PlayEffect({ style, glyph }: { style: PlayStyle; glyph: string }) {
  switch (style) {
    case 'walk':
      return (
        <div className="play play--walk" aria-hidden>
          <span className="walk-sun">☀️</span>
          <div className="walk-track">
            {['🌳', '🌼', '🌲', '🌷', '🌳', '🍄', '🌲', '🌼'].map((g, i) => (
              <span key={i} className="walk-thing" style={{ left: `${i * 18}%` }}>
                {g}
              </span>
            ))}
          </div>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="walk-step" style={{ animationDelay: `${0.35 + i * 0.45}s`, left: `${30 + i * 8}%` }}>
              🐾
            </span>
          ))}
        </div>
      );
    case 'pat':
      return (
        <div className="play" aria-hidden>
          <span className="play-heart" style={{ left: '40%' }}>💗</span>
          <span className="play-heart" style={{ left: '58%', animationDelay: '0.3s' }}>💗</span>
        </div>
      );
    case 'float':
      return (
        <div className="play" aria-hidden>
          {[12, 30, 50, 68, 84].map((x, i) => (
            <span key={i} className="play-prop play-prop--float" style={{ left: `${x}%`, animationDelay: `${i * 0.25}s` }}>
              {glyph}
            </span>
          ))}
        </div>
      );
    case 'hug':
      return (
        <div className="play" aria-hidden>
          <span className="play-prop play-prop--hug">{glyph}</span>
          {[42, 52, 62].map((x, i) => (
            <span key={i} className="play-heart" style={{ left: `${x}%`, animationDelay: `${0.5 + i * 0.3}s` }}>
              ❤️
            </span>
          ))}
        </div>
      );
    case 'stack':
      return (
        <div className="play" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="play-prop play-prop--stack" style={{ bottom: `${24 + i * 34}px`, animationDelay: `${i * 0.5}s` }}>
              {glyph}
            </span>
          ))}
        </div>
      );
    case 'beat':
      return (
        <div className="play" aria-hidden>
          <span className="play-prop play-prop--beat">{glyph}</span>
          {['♪', '♫', '♪', '♬'].map((n, i) => (
            <span key={i} className="play-note" style={{ left: `${22 + i * 16}%`, animationDelay: `${i * 0.35}s` }}>
              {n}
            </span>
          ))}
        </div>
      );
    default:
      // bounce, fly, spin, drive: 소품 하나가 각자의 길로 움직인다
      return (
        <div className="play" aria-hidden>
          <span className={`play-prop play-prop--${style}`}>{glyph}</span>
          {style === 'fly' && <span className="play-trail">✨</span>}
        </div>
      );
  }
}
