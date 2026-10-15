/** 자체 제작 몬스터 SVG — 설계서 13-4. 몸 모양 6종 × 단 색 × 표정 4종 + 황금 몬스터 */
import type { ReactNode } from 'react';
import type { MonsterKind } from '../domain/battle';
import { GOLD, INK } from './colors';

export type MonsterMood = 'idle' | 'hit' | 'happy' | 'sleep';

export const MONSTER_NAMES: Record<MonsterKind, string> = {
  jelly: '젤리몬',
  cloud: '구름몬',
  mushroom: '버섯몬',
  pebble: '돌멩몬',
  ghost: '유령몬',
  fluff: '솜뭉치몬',
};

interface Props {
  kind: MonsterKind;
  color: string;
  mood: MonsterMood;
  golden?: boolean;
  size?: number;
  className?: string;
  /** 외곽선 색. 기본은 검정(네오브루탈리즘) */
  outline?: string;
}

const STROKE = 5;

/** 몸통 + 얼굴 위치(faceY) + 왕관 위치(topY) */
function body(kind: MonsterKind, fill: string, line: string): { shape: ReactNode; faceY: number; topY: number } {
  const p = { fill, stroke: line, strokeWidth: STROKE, strokeLinejoin: 'round' as const };
  switch (kind) {
    case 'jelly':
      return {
        faceY: 112,
        topY: 52,
        shape: (
          <>
            <path
              {...p}
              d="M38 158 Q34 62 100 56 Q166 62 162 158 Q150 146 138 160 Q125 146 112 160 Q100 146 88 160 Q75 146 62 160 Q50 146 38 158 Z"
            />
            <ellipse cx="72" cy="82" rx="12" ry="7" fill="#fff" opacity="0.55" transform="rotate(-30 72 82)" />
          </>
        ),
      };
    case 'cloud': {
      const puffs = [
        [100, 82, 40],
        [62, 110, 32],
        [138, 110, 32],
        [80, 138, 30],
        [120, 138, 30],
        [100, 118, 40],
      ];
      return {
        faceY: 112,
        topY: 46,
        shape: (
          <>
            {puffs.map(([cx, cy, r], i) => (
              <circle key={`o${i}`} cx={cx} cy={cy} r={r} fill={line} stroke={line} strokeWidth={STROKE * 2} />
            ))}
            {puffs.map(([cx, cy, r], i) => (
              <circle key={`f${i}`} cx={cx} cy={cy} r={r} fill={fill} />
            ))}
            <circle cx="84" cy="70" r="9" fill="#fff" opacity="0.6" />
          </>
        ),
      };
    }
    case 'mushroom':
      return {
        faceY: 128,
        topY: 30,
        shape: (
          <>
            <path {...p} fill="#fff4e0" d="M66 96 Q60 168 72 172 L128 172 Q140 168 134 96 Z" />
            <path {...p} d="M22 100 Q26 34 100 32 Q174 34 178 100 Q100 116 22 100 Z" />
            <circle cx="66" cy="66" r="11" fill="#fff" opacity="0.9" />
            <circle cx="108" cy="52" r="8" fill="#fff" opacity="0.9" />
            <circle cx="142" cy="78" r="10" fill="#fff" opacity="0.9" />
          </>
        ),
      };
    case 'pebble':
      return {
        faceY: 118,
        topY: 60,
        shape: (
          <>
            <path {...p} d="M30 136 Q24 84 66 68 Q104 54 144 70 Q180 88 172 136 Q166 168 100 168 Q36 168 30 136 Z" />
            <path d="M58 88 Q70 80 82 84" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.6" />
            <circle cx="148" cy="150" r="4" fill={line} opacity="0.35" />
            <circle cx="52" cy="148" r="3" fill={line} opacity="0.35" />
          </>
        ),
      };
    case 'ghost':
      return {
        faceY: 104,
        topY: 36,
        shape: (
          <>
            <path
              {...p}
              d="M44 170 L44 98 Q44 40 100 40 Q156 40 156 98 L156 170 Q142 156 128 170 Q114 156 100 170 Q86 156 72 170 Q58 156 44 170 Z"
            />
            <path {...p} d="M44 118 Q24 122 28 136 Q36 140 46 132" />
            <path {...p} d="M156 118 Q176 122 172 136 Q164 140 154 132" />
            <ellipse cx="74" cy="64" rx="10" ry="6" fill="#fff" opacity="0.6" transform="rotate(-35 74 64)" />
          </>
        ),
      };
    case 'fluff': {
      const bumps = 18;
      let d = '';
      for (let i = 0; i <= bumps; i++) {
        const a = (i / bumps) * Math.PI * 2;
        const r = i % 2 === 0 ? 66 : 56;
        const x = 100 + Math.cos(a) * r;
        const y = 112 + Math.sin(a) * r;
        d += i === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}` : ` Q${(100 + Math.cos(a - Math.PI / bumps) * 74).toFixed(1)} ${(112 + Math.sin(a - Math.PI / bumps) * 74).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      return {
        faceY: 112,
        topY: 40,
        shape: (
          <>
            <path {...p} d={`${d} Z`} />
            <circle cx="76" cy="80" r="8" fill="#fff" opacity="0.6" />
          </>
        ),
      };
    }
  }
}

function Face({ mood, y }: { mood: MonsterMood; y: number }) {
  const eye = (x: number) => {
    switch (mood) {
      case 'idle':
        return (
          <g key={x}>
            <ellipse cx={x} cy={y} rx="9" ry="11" fill={INK} />
            <circle cx={x + 3} cy={y - 4} r="3.5" fill="#fff" />
          </g>
        );
      case 'hit':
        return (
          <g key={x} stroke={INK} strokeWidth="5" strokeLinecap="round">
            <line x1={x - 8} y1={y - 8} x2={x + 8} y2={y + 8} />
            <line x1={x + 8} y1={y - 8} x2={x - 8} y2={y + 8} />
          </g>
        );
      case 'happy':
        return (
          <path key={x} d={`M${x - 10} ${y + 3} Q${x} ${y - 12} ${x + 10} ${y + 3}`} stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />
        );
      case 'sleep':
        return (
          <path key={x} d={`M${x - 10} ${y - 2} Q${x} ${y + 8} ${x + 10} ${y - 2}`} stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />
        );
    }
  };
  const mouth = {
    idle: <path d={`M90 ${y + 20} Q100 ${y + 28} 110 ${y + 20}`} stroke={INK} strokeWidth="4.5" fill="none" strokeLinecap="round" />,
    hit: <ellipse cx="100" cy={y + 24} rx="7" ry="8" fill={INK} />,
    happy: <path d={`M86 ${y + 16} Q100 ${y + 36} 114 ${y + 16} Z`} fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />,
    sleep: <ellipse cx="100" cy={y + 22} rx="5" ry="4" fill={INK} />,
  }[mood];
  return (
    <g>
      {eye(80)}
      {eye(120)}
      <ellipse cx="66" cy={y + 16} rx="9" ry="6" fill="#ff6b8b" opacity="0.35" />
      <ellipse cx="134" cy={y + 16} rx="9" ry="6" fill="#ff6b8b" opacity="0.35" />
      {mouth}
    </g>
  );
}

function Crown({ y }: { y: number }) {
  return (
    <g transform={`translate(100 ${y})`}>
      <path
        d="M-26 6 L-30 -22 L-14 -8 L0 -28 L14 -8 L30 -22 L26 6 Z"
        fill={GOLD}
        stroke={INK}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="0" cy="-6" r="4" fill="#ff6b8b" />
    </g>
  );
}

export function MonsterSprite({ kind, color, mood, golden = false, size = 200, className, outline }: Props) {
  const fill = golden ? GOLD : color;
  const line = outline ?? INK;
  const { shape, faceY, topY } = body(kind, fill, line);
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} role="img" aria-label="몬스터">
      <ellipse cx="100" cy="182" rx="56" ry="9" fill={INK} opacity="0.12" />
      {shape}
      <Face mood={mood} y={faceY} />
      {golden && (
        <>
          <Crown y={topY} />
          <path d="M168 50 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 Z" fill="#fff" stroke={GOLD} strokeWidth="2" className="sparkle" />
          <path d="M30 70 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 Z" fill="#fff" stroke={GOLD} strokeWidth="2" className="sparkle sparkle--late" />
        </>
      )}
      {mood === 'sleep' && (
        <text x="150" y="60" fontSize="26" fontWeight="800" fill={INK} opacity="0.7">
          Z<tspan fontSize="18" dy="-12">z</tspan>
        </text>
      )}
    </svg>
  );
}
