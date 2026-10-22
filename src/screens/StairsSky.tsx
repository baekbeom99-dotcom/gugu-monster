/**
 * 무한의 계단 하늘 (v1.33): 10층마다 테마가 바뀌고 부드럽게 겹쳐 바뀐다.
 * 모든 테마 층을 깔아 두고 지금 테마만 보이게 한다 (그라데이션은 바로 전환이 안 되므로 겹쳐서 흐리게 바꾼다).
 */
import type { CSSProperties } from 'react';
import { STAIRS_SKIES, type StairsSkyId, stairsSkyIndex } from '../domain/stairs';

interface Deco {
  /** 꾸밈 종류 (sky-deco--종류) */
  k: string;
  /** 위치 % */
  x: number;
  y: number;
  /** 크기 배율 */
  s?: number;
  /** 애니메이션 시작 늦춤(초) */
  d?: number;
  /** 글자(이모지) 꾸밈 */
  t?: string;
}

const stars = (n: number, seed: number): Deco[] =>
  Array.from({ length: n }, (_, i) => ({
    k: 'star',
    x: (i * 37 + seed * 13) % 96,
    y: (i * 53 + seed * 29) % 70,
    s: 0.6 + ((i * 7) % 5) / 6,
    d: (i % 6) * 0.4,
  }));

const DECOS: Record<StairsSkyId, Deco[]> = {
  morning: [
    { k: 'sun', x: 76, y: 8 },
    { k: 'cloud', x: 6, y: 14, s: 1.1 },
    { k: 'cloud', x: 52, y: 30, s: 0.8, d: 3 },
    { k: 'cloud', x: 20, y: 52, s: 0.7, d: 6 },
  ],
  rainbow: [
    { k: 'rainbow', x: 18, y: 10 },
    { k: 'cloud', x: 4, y: 34, s: 0.9 },
    { k: 'cloud', x: 68, y: 30, s: 1, d: 2 },
    { k: 'emoji', x: 70, y: 8, t: '🐦', d: 0.5 },
    { k: 'emoji', x: 80, y: 16, s: 0.7, t: '🐦', d: 1.2 },
  ],
  balloon: [
    { k: 'balloon', x: 8, y: 30, t: '🎈' },
    { k: 'balloon', x: 30, y: 12, s: 0.8, t: '🎈', d: 1.5 },
    { k: 'balloon', x: 74, y: 22, s: 1.1, t: '🎈', d: 0.7 },
    { k: 'balloon', x: 88, y: 50, s: 0.7, t: '🎈', d: 2.2 },
    { k: 'cloud', x: 46, y: 46, s: 0.8, d: 4 },
  ],
  sunset: [
    { k: 'sun sky-deco--low', x: 70, y: 62, s: 1.4 },
    { k: 'cloud sky-deco--pink', x: 4, y: 20, s: 1.1 },
    { k: 'cloud sky-deco--pink', x: 62, y: 12, s: 0.9, d: 2 },
    { k: 'emoji', x: 80, y: 32, s: 0.8, t: '🕊️', d: 1 },
  ],
  dusk: [{ k: 'moon', x: 74, y: 8 }, ...stars(8, 1), { k: 'cloud sky-deco--dim', x: 6, y: 40, s: 1 }],
  night: [{ k: 'moon', x: 12, y: 8, s: 1.2 }, ...stars(20, 2), { k: 'shoot', x: 70, y: 6 }, { k: 'shoot', x: 30, y: 22, d: 3.5 }],
  aurora: [
    { k: 'aurora', x: -10, y: 4 },
    { k: 'aurora sky-deco--aurora2', x: -10, y: 22, d: 2 },
    ...stars(12, 3),
  ],
  space: [
    { k: 'planet', x: 68, y: 10, s: 1.2 },
    { k: 'planet sky-deco--planet2', x: 8, y: 40, s: 0.7 },
    { k: 'emoji', x: 40, y: 20, s: 1, t: '🚀', d: 1 },
    ...stars(18, 4),
  ],
  galaxy: [{ k: 'milky', x: -20, y: 0 }, ...stars(24, 5), { k: 'emoji', x: 76, y: 12, t: '🛸', d: 0.5 }],
  candy: [
    { k: 'emoji', x: 8, y: 12, s: 1.2, t: '🍭' },
    { k: 'emoji', x: 70, y: 8, t: '🍬', d: 0.8 },
    { k: 'emoji', x: 40, y: 32, s: 0.9, t: '🧁', d: 1.6 },
    { k: 'emoji', x: 84, y: 40, s: 0.8, t: '🍩', d: 2.2 },
    { k: 'emoji', x: 16, y: 50, s: 0.8, t: '🍪', d: 1.1 },
    { k: 'cloud sky-deco--cotton', x: 48, y: 4, s: 1 },
  ],
};

export function StairsSky({ steps }: { steps: number }) {
  const on = stairsSkyIndex(steps);
  return (
    <div className="sky" aria-hidden>
      {STAIRS_SKIES.map((sky, i) => (
        <div key={sky.id} className={`sky-layer sky-layer--${sky.id} ${i === on ? 'sky-layer--on' : ''}`}>
          {DECOS[sky.id].map((d, j) => (
            <span
              key={j}
              className={`sky-deco sky-deco--${d.k}`}
              style={{ left: `${d.x}%`, top: `${d.y}%`, '--s': d.s ?? 1, animationDelay: `${d.d ?? 0}s` } as CSSProperties}
            >
              {d.t}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
