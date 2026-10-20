/**
 * 몬스터를 맞혔을 때의 타격 연출 — 설계서 4-1.
 * 톱니 모양 폭발 + "퍽!" 글자 + 사방으로 튀는 별 조각. 크리티컬·포획은 더 크고 화려하게.
 */
import { INK } from '../art/colors';

const WORDS = ['퍽!', '팡!', '쾅!', '뿅!'];

/** 톱니 모양 폭발 (points개 뾰족) */
function burstPoints(points: number, outer: number, inner: number): string {
  return Array.from({ length: points * 2 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const r = i % 2 === 0 ? outer : inner;
    return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');
}

export function HitBurst({ seed, strong, capture }: { seed: number; strong?: boolean; capture?: boolean }) {
  const word = capture ? '잡았다!' : WORDS[seed % WORDS.length];
  const big = strong || capture;
  const fill = capture ? '#b8f25c' : strong ? '#ff5c5c' : '#ffe14d';
  const particles = big ? 12 : 8;
  return (
    <div className={`hit-burst ${big ? 'hit-burst--big' : ''} ${capture ? 'hit-burst--capture' : ''}`} aria-hidden>
      <svg className="hit-burst__star" viewBox="-60 -60 120 120">
        <polygon points={burstPoints(12, 56, 34)} fill={fill} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <polygon points={burstPoints(12, 40, 26)} fill="#fffdf5" opacity="0.9" />
      </svg>
      <span className="hit-burst__word">{word}</span>
      {Array.from({ length: particles }, (_, i) => {
        const angle = (360 / particles) * i + (seed % 30);
        const dist = (big ? 120 : 90) + ((seed + i * 17) % 30);
        return (
          <span
            key={i}
            className="hit-burst__bit"
            style={{ '--a': `${angle}deg`, '--d': `${dist}px`, animationDelay: `${(i % 3) * 0.03}s` } as React.CSSProperties}
          >
            {i % 3 === 0 ? '★' : i % 3 === 1 ? '✦' : '●'}
          </span>
        );
      })}
    </div>
  );
}

/** 체력이 줄수록 몬스터가 작아진다: 가득 1배 → 한 칸 남으면 약 0.73배 (잡히는 순간 0.6배) */
export function monsterScale(hp: number, maxHp: number): number {
  if (maxHp <= 0) return 1;
  return Number((0.6 + 0.4 * Math.max(0, Math.min(hp, maxHp)) / maxHp).toFixed(3));
}
