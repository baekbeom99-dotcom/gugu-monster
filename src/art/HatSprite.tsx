/**
 * 자체 제작 모자 SVG — 설계서 13-4. 모양 9종(리본·밀짚·고깔·마법사·왕관·베레모·헤어밴드·꽃·마스터 모자) × 색.
 * 좌표 원점(0,0)이 머리 꼭대기 가운데다. 펫은 hatAnchor 위치로 옮겨 씌운다.
 */
import type { HatShape, ItemDef } from '../domain/shop';
import { INK } from './colors';

export interface HatArt {
  shape: HatShape;
  color: string;
  badge?: string;
}

const s = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

function Badge({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <g>
      <circle {...s} strokeWidth={3} cx={x} cy={y} r={11} fill="#fffdf5" />
      <text x={x} y={y + 5} textAnchor="middle" fontSize={text.length > 1 ? 12 : 15} fontWeight="900" fill={INK} fontFamily="'Black Han Sans', sans-serif">
        {text}
      </text>
    </g>
  );
}

/** 머리 꼭대기 기준 좌표의 모자 그림 (<g>) */
export function HatShapeG({ shape, color, badge }: HatArt) {
  switch (shape) {
    case 'ribbon':
      return (
        <g transform="translate(24 -4)">
          <path {...s} fill={color} d="M0 0 L-20 -14 L-20 14 Z" />
          <path {...s} fill={color} d="M0 0 L20 -14 L20 14 Z" />
          <circle {...s} cx="0" cy="0" r="7" fill={color} />
        </g>
      );
    case 'straw':
      return (
        <g>
          <ellipse {...s} cx="0" cy="-2" rx="50" ry="11" fill={color} />
          <path {...s} fill={color} d="M-26 -4 Q-26 -38 0 -38 Q26 -38 26 -4 Z" />
          <path {...s} strokeWidth={3} fill="#ff8fc1" d="M-26 -14 L26 -14 L26 -6 L-26 -6 Z" />
        </g>
      );
    case 'party':
      return (
        <g>
          <path {...s} fill={color} d="M-22 2 L0 -56 L22 2 Z" />
          <path stroke={INK} strokeWidth="3" fill="none" d="M-14 -16 L8 -6 M-8 -34 L6 -28" />
          <circle {...s} cx="0" cy="-58" r="7" fill="#fffdf5" />
          {badge && <Badge x={0} y={-16} text={badge} />}
        </g>
      );
    case 'wizard':
      return (
        <g>
          <ellipse {...s} cx="0" cy="0" rx="42" ry="9" fill={color} />
          <path {...s} fill={color} d="M-24 -3 Q-10 -40 16 -70 Q8 -36 24 -3 Z" />
          <path fill="#ffe14d" stroke={INK} strokeWidth="2.5" d="M0 -34 l3 7 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1 Z" />
          {badge && <Badge x={0} y={-14} text={badge} />}
        </g>
      );
    case 'crown':
      return (
        <g>
          <path {...s} fill={color} d="M-30 2 L-34 -34 L-15 -18 L0 -42 L15 -18 L34 -34 L30 2 Z" />
          <circle {...s} strokeWidth={2.5} cx="-34" cy="-36" r="4" fill="#ff8fc1" />
          <circle {...s} strokeWidth={2.5} cx="0" cy="-44" r="4" fill="#6fd3ff" />
          <circle {...s} strokeWidth={2.5} cx="34" cy="-36" r="4" fill="#ff8fc1" />
          {badge ? <Badge x={0} y={-14} text={badge} /> : <circle {...s} strokeWidth={2.5} cx="0" cy="-12" r="6" fill="#ff6b6b" />}
        </g>
      );
    case 'beret':
      return (
        <g>
          <ellipse {...s} cx="-4" cy="-10" rx="38" ry="15" fill={color} transform="rotate(-8 -4 -10)" />
          <circle {...s} cx="4" cy="-26" r="5" fill={color} />
        </g>
      );
    case 'headband':
      return (
        <g>
          <path d="M-48 14 Q0 -24 48 14" fill="none" stroke={INK} strokeWidth="15" strokeLinecap="round" />
          <path d="M-48 14 Q0 -24 48 14" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
          <g transform="translate(-26 -4)">
            <path {...s} strokeWidth={3} fill={color} d="M0 0 L-11 -8 L-11 8 Z M0 0 L11 -8 L11 8 Z" />
          </g>
        </g>
      );
    case 'flower':
      return (
        <g transform="translate(22 -6)">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} {...s} strokeWidth={3} cx="0" cy="-11" rx="7" ry="10" fill={color} transform={`rotate(${a})`} />
          ))}
          <circle {...s} strokeWidth={3} cx="0" cy="0" r="7" fill="#ffe14d" />
        </g>
      );
    case 'cap':
      return (
        <g>
          <ellipse {...s} cx="26" cy="-2" rx="24" ry="7" fill={color} />
          <path {...s} fill={color} d="M-32 0 Q-32 -38 0 -38 Q32 -38 32 0 Z" />
          <circle {...s} strokeWidth={3} cx="0" cy="-40" r="4" fill={color} />
          {badge && <Badge x={0} y={-18} text={badge} />}
        </g>
      );
  }
}

/** 상점·서랍에 쓰는 모자 단독 그림 */
export function HatIcon({ art, size = 64 }: { art: HatArt; size?: number }) {
  return (
    <svg viewBox="-56 -76 112 92" width={size} height={size * (92 / 112)} aria-hidden>
      <HatShapeG {...art} />
    </svg>
  );
}

/** 모자 아이템 → 그림 정보 (모자가 아니면 null) */
export function hatArtOf(item: ItemDef | undefined): HatArt | null {
  if (!item || item.category !== 'hat' || !item.art.hatShape) return null;
  return { shape: item.art.hatShape, color: item.art.hatColor ?? '#ff8fc1', badge: item.art.hatBadge };
}
