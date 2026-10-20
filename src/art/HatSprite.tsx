/**
 * 자체 제작 모자 SVG — 설계서 13-4 (몰랑이/치이카와풍 + 네오 브루탈리즘 팝 UI 매칭 개선판).
 * 기본 9종(리본·밀짚·고깔·마법사·왕관·베레모·헤어밴드·꽃·마스터 모자) +
 * 남아/남성 인기 6종(용사 투구·해적 선장·바이킹 뿔투구·공룡 후드·게이밍 헤드셋·파일럿 비행모) = 총 15종.
 * 좌표 원점(0,0)이 머리 꼭대기 가운데다. 펫은 hatAnchor 위치로 옮겨 씌운다.
 */
import { useId } from 'react';
import type { HatShape, ItemDef } from '../domain/shop';
import { INK } from './colors';

export type ExtendedHatShape =
  | HatShape
  | 'helmet'
  | 'pirate'
  | 'viking'
  | 'dino'
  | 'headset'
  | 'aviator';

export interface HatArt {
  shape: ExtendedHatShape;
  color: string;
  badge?: string;
}

const s = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/** 좌표 소수점 2자리 반올림 헬퍼 (Parametric SVG 규칙 준수) */
const n = (v: number): number => Number(v.toFixed(2));

/** 정다각형/별 좌표 생성 헬퍼 */
function starPath(cx: number, cy: number, outerR: number, innerR: number, points = 5): string {
  return (
    Array.from({ length: points * 2 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / points;
      const r = i % 2 === 0 ? outerR : innerR;
      return `${i === 0 ? 'M' : 'L'}${n(cx + Math.cos(a) * r)} ${n(cy + Math.sin(a) * r)}`;
    }).join(' ') + ' Z'
  );
}

/** 폭신한 구름/폼폼(Pom-pom) 실루엣 생성 헬퍼 */
function pomPomPath(cx: number, cy: number, r: number, puffs = 6): string {
  const rIn = r * 0.78;
  const rOut = r * 1.18;
  const segs: string[] = [];
  for (let i = 0; i < puffs; i++) {
    const a1 = (i * 2 * Math.PI) / puffs;
    const aMid = ((i + 0.5) * 2 * Math.PI) / puffs;
    const a2 = ((i + 1) * 2 * Math.PI) / puffs;
    const x1 = n(cx + Math.cos(a1) * rIn);
    const y1 = n(cy + Math.sin(a1) * rIn);
    const xm = n(cx + Math.cos(aMid) * rOut);
    const ym = n(cy + Math.sin(aMid) * rOut);
    const x2 = n(cx + Math.cos(a2) * rIn);
    const y2 = n(cy + Math.sin(a2) * rIn);
    if (i === 0) segs.push(`M ${x1} ${y1}`);
    segs.push(`Q ${xm} ${ym} ${x2} ${y2}`);
  }
  segs.push('Z');
  return segs.join(' ');
}

function Badge({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <g id="hat-badge">
      <circle cx={x} cy={y + 1.5} r={11.5} fill={INK} opacity="0.16" />
      <circle {...s} strokeWidth={3.2} cx={x} cy={y} r={11.5} fill="#fffdf5" />
      <ellipse cx={n(x - 3.5)} cy={n(y - 5.5)} rx="4" ry="2" fill="#ffffff" transform={`rotate(-25 ${n(x - 3.5)} ${n(y - 5.5)})`} />
      <text
        x={x}
        y={y + 4.5}
        textAnchor="middle"
        fontSize={text.length > 1 ? 11.5 : 14.5}
        fontWeight="900"
        fill={INK}
        fontFamily="'Jua', 'Black Han Sans', sans-serif"
      >
        {text}
      </text>
    </g>
  );
}

/** 머리 꼭대기 기준 좌표의 모자 그림 (<g>) */
export function HatShapeG({ shape, color, badge }: HatArt) {
  const uid = useId().replace(/:/g, '');
  const clipId = `hat-clip-${uid}`;

  switch (shape) {
    case 'ribbon':
      return (
        <g id="hat-ribbon" transform="translate(24 -4)">
          <ellipse cx="0" cy="11" rx="20" ry="4.5" fill={INK} opacity="0.14" />
          <path {...s} strokeWidth={3.5} fill={color} d="M-2 3 Q-9 15 -14 19 L-6 18 Q-2 12 0 4 Z" />
          <path {...s} strokeWidth={3.5} fill={color} d="M2 3 Q9 15 14 19 L6 18 Q2 12 0 4 Z" />
          <path {...s} fill={color} d="M0 0 C-7 -15 -24 -18 -25 -4 C-26 9 -10 16 0 2 Z" />
          <path {...s} fill={color} d="M0 0 C7 -15 24 -18 25 -4 C26 9 10 16 0 2 Z" />
          <ellipse cx="-14" cy="-7" rx="5.5" ry="2.6" fill="#ffffff" opacity="0.42" transform="rotate(-18 -14 -7)" />
          <ellipse cx="13" cy="-7" rx="5.5" ry="2.6" fill="#ffffff" opacity="0.42" transform="rotate(18 13 -7)" />
          <path d="M-6 -1 Q-12 -2 -15 2 M6 -1 Q12 -2 15 2" stroke={INK} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <ellipse {...s} cx="0" cy="0.5" rx="7" ry="8" fill={color} />
          <ellipse cx="-2" cy="-2.5" rx="2.5" ry="3" fill="#ffffff" opacity="0.48" />
        </g>
      );

    case 'straw': {
      const crownPath = 'M-28 -3 C-29 -32 -16 -39 0 -39 C16 -39 29 -32 28 -3 Q0 3 -28 -3 Z';
      return (
        <g id="hat-straw">
          <defs>
            <clipPath id={clipId}>
              <path d={crownPath} />
            </clipPath>
          </defs>
          <ellipse cx="0" cy="3" rx="48" ry="10" fill={INK} opacity="0.15" />
          <path {...s} fill={color} d="M-50 -1 C-50 -13 50 -13 50 -1 C50 11 -50 11 -50 -1 Z" />
          <path d="M-43 1 Q0 9 43 1" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.4" />
          <path d={crownPath} fill={color} />
          <g clipPath={`url(#${clipId})`}>
            <ellipse cx="-8" cy="-29" rx="14" ry="6" fill="#ffffff" opacity="0.38" transform="rotate(-12 -8 -29)" />
            <g stroke="#b87d28" strokeWidth="2" strokeLinecap="round" opacity="0.35">
              <path d="M-18 -24 l6 6 M-12 -24 l-6 6" />
              <path d="M12 -22 l6 6 M18 -22 l-6 6" />
              <path d="M-2 -31 l5 5 M3 -31 l-5 5" />
            </g>
            <path d="M-30 -13 Q0 -7 30 -13 L30 -4 Q0 2 -30 -4 Z" fill="#ff85a2" stroke={INK} strokeWidth="3.2" strokeLinejoin="round" />
          </g>
          <path {...s} d={crownPath} fill="none" />
          <g transform="translate(23 -8) rotate(12)">
            <ellipse {...s} strokeWidth={2.8} cx="-6" cy="0" rx="5.5" ry="4" fill="#ff85a2" />
            <ellipse {...s} strokeWidth={2.8} cx="6" cy="0" rx="5.5" ry="4" fill="#ff85a2" />
            <circle {...s} strokeWidth={2.8} cx="0" cy="0" r="3" fill="#ff5c8a" />
          </g>
        </g>
      );
    }

    case 'party': {
      const conePath = 'M-23 2 Q-12 -27 0 -55 Q12 -27 23 2 Q0 8 -23 2 Z';
      return (
        <g id="hat-party">
          <defs>
            <clipPath id={clipId}>
              <path d={conePath} />
            </clipPath>
          </defs>
          <ellipse cx="0" cy="5" rx="22" ry="5" fill={INK} opacity="0.15" />
          <path d={conePath} fill={color} />
          <g clipPath={`url(#${clipId})`}>
            <path d="M-24 -10 Q0 -2 24 -18" stroke="#ffffff" strokeWidth="6" fill="none" opacity="0.55" />
            <path d="M-20 -30 Q0 -24 20 -38" stroke="#ffe14d" strokeWidth="5.5" fill="none" opacity="0.85" />
            <path d="M-16 0 L-2 -52" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.35" />
            <circle cx="-8" cy="-18" r="3" fill="#fffdf5" opacity="0.85" />
            <circle cx="9" cy="-10" r="2.8" fill="#ffe14d" opacity="0.9" />
          </g>
          <path {...s} d={conePath} fill="none" />
          <path {...s} strokeWidth={3.5} d={pomPomPath(0, -57, 7.5, 6)} fill="#fffdf5" />
          <circle cx="-2" cy="-59" r="2.5" fill="#ffffff" />
          {badge && <Badge x={0} y={-15} text={badge} />}
        </g>
      );
    }

    case 'wizard': {
      const conePath = 'M-25 -2 C-20 -28 -8 -54 15 -68 C22 -64 18 -46 12 -36 C17 -24 21 -12 25 -2 Q0 4 -25 -2 Z';
      return (
        <g id="hat-wizard">
          <defs>
            <clipPath id={clipId}>
              <path d={conePath} />
            </clipPath>
          </defs>
          <ellipse cx="0" cy="4" rx="42" ry="8" fill={INK} opacity="0.16" />
          <path {...s} fill={color} d="M-44 0 C-44 -10 44 -10 44 0 C44 10 -44 10 -44 0 Z" />
          <path d={conePath} fill={color} />
          <g clipPath={`url(#${clipId})`}>
            <path d="M-18 -8 Q-10 -34 4 -54" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" fill="none" opacity="0.3" />
            <path d="M-28 -10 Q0 -4 28 -10 L28 -1 Q0 5 -28 -1 Z" fill="#ffd43b" stroke={INK} strokeWidth="3" />
          </g>
          <path {...s} d={conePath} fill="none" />
          <path d={starPath(-2, -29, 8.5, 4.2, 5)} fill="#ffe14d" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
          <circle cx="10" cy="-42" r="2" fill="#ffe14d" />
          <circle cx="-11" cy="-18" r="1.8" fill="#ffffff" opacity="0.8" />
          {badge && <Badge x={0} y={-13} text={badge} />}
        </g>
      );
    }

    case 'crown': {
      const crownBody = 'M-29 2 L-34 -31 Q-22 -14 -15 -16 L0 -41 L15 -16 Q22 -14 34 -31 L29 2 Q0 8 -29 2 Z';
      return (
        <g id="hat-crown">
          <ellipse cx="0" cy="5" rx="28" ry="5.5" fill={INK} opacity="0.15" />
          <path {...s} fill={color} d={crownBody} />
          <path d="M-24 -6 L-27 -23" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" opacity="0.45" />
          <path d="M-28 -3 Q0 3 28 -3" stroke={INK} strokeWidth="2.8" fill="none" opacity="0.25" />
          <circle {...s} strokeWidth={2.8} cx="-34" cy="-34" r="4.8" fill="#ff8fc1" />
          <circle cx="-35.5" cy="-35.5" r="1.5" fill="#ffffff" />
          <circle {...s} strokeWidth={2.8} cx="0" cy="-43" r="5.2" fill="#6fd3ff" />
          <circle cx="-1.5" cy="-44.5" r="1.6" fill="#ffffff" />
          <circle {...s} strokeWidth={2.8} cx="34" cy="-34" r="4.8" fill="#ff8fc1" />
          <circle cx="32.5" cy="-35.5" r="1.5" fill="#ffffff" />
          {badge ? (
            <Badge x={0} y={-13} text={badge} />
          ) : (
            <g>
              <ellipse {...s} strokeWidth={2.8} cx="0" cy="-13" rx="6" ry="7" fill="#ff5c7a" />
              <circle cx="-2" cy="-15.5" r="2" fill="#ffffff" opacity="0.85" />
            </g>
          )}
        </g>
      );
    }

    case 'beret':
      return (
        <g id="hat-beret">
          <ellipse cx="-2" cy="1" rx="32" ry="6" fill={INK} opacity="0.14" />
          <path {...s} strokeWidth={3.5} fill={INK} d="M-26 0 Q0 5 24 -3 L23 -8 Q0 -3 -26 -5 Z" />
          <g transform="rotate(-8 -4 -10)">
            <path {...s} fill={color} d="M-38 -7 C-42 -26 -18 -33 2 -32 C22 -31 37 -20 34 -6 C32 4 -35 5 -38 -7 Z" />
            <ellipse cx="-12" cy="-21" rx="15" ry="5.5" fill="#ffffff" opacity="0.38" transform="rotate(-10 -12 -21)" />
            <path {...s} strokeWidth={3.5} fill={color} d="M0 -31 Q2 -39 7 -37 Q5 -30 2 -30 Z" />
          </g>
        </g>
      );

    case 'headband':
      return (
        <g id="hat-headband">
          <path d="M-47 14 Q0 -25 47 14" fill="none" stroke={INK} strokeWidth="15.5" strokeLinecap="round" />
          <path d="M-47 14 Q0 -25 47 14" fill="none" stroke={color} strokeWidth="8.5" strokeLinecap="round" />
          <path d="M-34 2 Q-6 -16 24 -4" fill="none" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" opacity="0.45" />
          <g transform="translate(-26 -4) rotate(-20)">
            <path {...s} strokeWidth={3.2} fill={color} d="M0 0 C-5 -10 -16 -12 -17 -2 C-17 6 -6 10 0 1 Z" />
            <path {...s} strokeWidth={3.2} fill={color} d="M0 0 C5 -10 16 -12 17 -2 C17 6 6 10 0 1 Z" />
            <ellipse cx="-9" cy="-4" rx="3.5" ry="1.8" fill="#ffffff" opacity="0.45" />
            <ellipse {...s} strokeWidth={3} cx="0" cy="0" rx="4.5" ry="5.2" fill={color} />
          </g>
        </g>
      );

    case 'flower':
      return (
        <g id="hat-flower" transform="translate(22 -6)">
          <ellipse cx="0" cy="11" rx="14" ry="4" fill={INK} opacity="0.14" />
          <path {...s} strokeWidth={3} fill="#69db7c" d="M-8 4 Q-24 2 -22 -8 Q-10 -10 -6 0 Z" />
          <path {...s} strokeWidth={3} fill="#51cf66" d="M8 4 Q23 5 22 -5 Q12 -8 6 0 Z" />
          {[0, 72, 144, 216, 288].map((a) => (
            <g key={a} transform={`rotate(${a})`}>
              <ellipse {...s} strokeWidth={3.2} cx="0" cy="-11" rx="7.8" ry="10.5" fill={color} />
              <ellipse cx="-1.5" cy="-13" rx="2.8" ry="4.5" fill="#ffffff" opacity="0.35" />
            </g>
          ))}
          <circle {...s} strokeWidth={3.2} cx="0" cy="0" r="7.8" fill="#ffe14d" />
          <ellipse cx="-2.2" cy="-2.5" rx="2.8" ry="2" fill="#ffffff" opacity="0.7" transform="rotate(-20 -2.2 -2.5)" />
        </g>
      );

    case 'cap': {
      const capCrown = 'M-32 0 C-33 -38 33 -38 32 0 Q0 5 -32 0 Z';
      return (
        <g id="hat-cap">
          <defs>
            <clipPath id={clipId}>
              <path d={capCrown} />
            </clipPath>
          </defs>
          <ellipse cx="6" cy="4" rx="36" ry="6" fill={INK} opacity="0.15" />
          <path d={capCrown} fill={color} />
          <g clipPath={`url(#${clipId})`}>
            <ellipse cx="-10" cy="-24" rx="14" ry="6" fill="#ffffff" opacity="0.36" transform="rotate(-18 -10 -24)" />
            <path d="M0 -36 Q-14 -18 -14 4 M0 -36 Q14 -18 14 4" stroke={INK} strokeWidth="2.2" fill="none" opacity="0.2" />
          </g>
          <path {...s} d={capCrown} fill="none" />
          <path {...s} fill={color} d="M4 -3 C22 -9 48 -6 49 2 C49 9 22 9 -6 2 Z" />
          <path d="M12 -2 Q30 -4 41 1" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.45" />
          <ellipse {...s} strokeWidth={3} cx="0" cy="-35" rx="5" ry="3.8" fill={color} />
          {badge && <Badge x={-2} y={-16} text={badge} />}
        </g>
      );
    }

    // ── 신규 남아/남성 인기 모자 6종 (머리 전체에 딱 맞게 약 2배 확대한 풀사이즈 버전) ────────

    case 'helmet': {
      // 펫 머리(폭 약 116~124)를 감싸는 큼직한 용사 투구 (폭 120, 이마 y=20까지 내려옴)
      const domePath = 'M-58 20 C-62 -46 62 -46 58 20 Q0 28 -58 20 Z';
      return (
        <g id="hat-helmet">
          <defs>
            <clipPath id={clipId}>
              <path d={domePath} />
            </clipPath>
          </defs>
          <ellipse cx="0" cy="24" rx="58" ry="9" fill={INK} opacity="0.16" />
          {/* 꼭대기 대형 용사 붉은 깃털(Plume) 장식 */}
          <path
            {...s}
            strokeWidth={4.5}
            fill="#ff5c7a"
            d="M-4 -42 C-24 -76 28 -90 50 -56 C56 -38 34 -20 6 -32 Z"
          />
          <path d="M6 -62 Q24 -70 36 -50" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.55" />
          <path d="M-2 -48 Q16 -52 28 -36" stroke="#ff2e55" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.45" />
          {/* 깃털 고정 황금 크레스트 홀더 */}
          <path {...s} strokeWidth={3.8} fill="#ffd43b" d="M-11 -34 L-7 -49 L7 -49 L11 -34 Z" />
          {/* 양옆 볼/관자놀이 보호 가드 (Cheek guards) */}
          <path {...s} strokeWidth={4} fill={color} d="M-56 14 C-64 22 -62 36 -52 38 C-46 38 -46 24 -48 16 Z" />
          <path {...s} strokeWidth={4} fill={color} d="M56 14 C64 22 62 36 52 38 C46 38 46 24 48 16 Z" />
          {/* 투구 본체 */}
          <path d={domePath} fill={color} />
          <g clipPath={`url(#${clipId})`}>
            <ellipse cx="-22" cy="-20" rx="22" ry="10" fill="#ffffff" opacity="0.42" transform="rotate(-22 -22 -20)" />
            <path d="M0 -44 L0 26" stroke="#ffd43b" strokeWidth="11" />
            <path d="M-5.5 -44 L-5.5 26 M5.5 -44 L5.5 26" stroke={INK} strokeWidth="2.8" />
          </g>
          <path {...s} strokeWidth={4.5} d={domePath} fill="none" />
          {/* 이마 위로 큼직하게 올려 쓴 기사 바이저(Visor) */}
          <path
            {...s}
            strokeWidth={4.2}
            fill="#dee2e6"
            d="M-62 15 L-52 -14 L0 -2 L52 -14 L62 15 Q0 27 -62 15 Z"
          />
          <path d="M-44 0 L-16 6 M44 0 L16 6" stroke={INK} strokeWidth="4.2" strokeLinecap="round" />
          <path d="M-42 -5 L-18 1 M42 -5 L18 1" stroke={INK} strokeWidth="3.2" strokeLinecap="round" opacity="0.7" />
          <circle cx="-51" cy="7" r="3.2" fill={INK} />
          <circle cx="51" cy="7" r="3.2" fill={INK} />
          <circle cx="0" cy="11" r="4" fill="#ffd43b" stroke={INK} strokeWidth="2.5" />
          {badge && <Badge x={0} y={-20} text={badge} />}
        </g>
      );
    }

    case 'pirate': {
      // 머리 전체를 덮는 대형 해적 선장 삼각모 (폭 156, 이마 반다나 포함)
      const tricornPath = 'M-76 6 C-84 -28 -38 -60 0 -60 C38 -60 84 -28 76 6 C62 18 32 18 0 18 C-32 18 -62 18 -76 6 Z';
      return (
        <g id="hat-pirate">
          <ellipse cx="0" cy="22" rx="62" ry="9" fill={INK} opacity="0.16" />
          {/* 반다나 매듭 꼬리 (왼쪽 옆으로 나부낌) */}
          <path {...s} strokeWidth={3.8} fill="#ff5c7a" d="M-54 14 C-68 10 -78 18 -74 28 C-66 30 -58 24 -52 20 Z" />
          <path {...s} strokeWidth={3.8} fill="#ff5c7a" d="M-52 18 C-64 22 -72 34 -64 40 C-56 38 -52 28 -48 22 Z" />
          {/* 측면 화려한 대형 붉은 깃털 장식 */}
          <path {...s} strokeWidth={4} fill="#ff5c7a" d="M34 -26 C56 -66 84 -54 72 -20 C66 -4 44 -4 30 -14 Z" />
          <path d="M44 -30 Q62 -48 64 -24" stroke="#ffd43b" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          {/* 이마를 넓게 감싸는 해적 레드 반다나 */}
          <path {...s} strokeWidth={4.2} fill="#ff5c7a" d="M-58 17 Q0 28 58 17 L56 4 Q0 14 -56 4 Z" />
          <circle cx="-36" cy="14" r="2.2" fill="#ffffff" opacity="0.55" />
          <circle cx="36" cy="14" r="2.2" fill="#ffffff" opacity="0.55" />
          {/* 해적 삼각모 본체 */}
          <path {...s} strokeWidth={4.5} fill={color} d={tricornPath} />
          <ellipse cx="-26" cy="-34" rx="20" ry="8" fill="#ffffff" opacity="0.22" transform="rotate(-18 -26 -34)" />
          {/* 황금 테두리 라인 */}
          <path
            d="M-70 1 C-75 -24 -34 -51 0 -51 C34 -51 75 -24 70 1"
            fill="none"
            stroke="#ffd43b"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          {/* 중앙 큼직한 귀여운 해골 마크 또는 뱃지 */}
          {badge ? (
            <Badge x={0} y={-20} text={badge} />
          ) : (
            <g transform="translate(0 -21)">
              <path d="M-19 -10 L19 10 M-19 10 L19 -10" stroke={INK} strokeWidth="9" strokeLinecap="round" />
              <path d="M-19 -10 L19 10 M-19 10 L19 -10" stroke="#fffdf5" strokeWidth="4.8" strokeLinecap="round" />
              <circle {...s} strokeWidth={3.6} cx="0" cy="-2" r="13.5" fill="#fffdf5" />
              <circle cx="-5" cy="-2.5" r="3.5" fill={INK} />
              <circle cx="5" cy="-2.5" r="3.5" fill={INK} />
              <circle cx="-6" cy="-3.8" r="1.2" fill="#ffffff" />
              <circle cx="4" cy="-3.8" r="1.2" fill="#ffffff" />
              <path d="M-4 7.5 L-4 11.5 M0 7.5 L0 11.5 M4 7.5 L4 11.5" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
            </g>
          )}
        </g>
      );
    }

    case 'viking': {
      // 머리를 감싸는 대형 바이킹 뿔투구 (돔 폭 116, 양쪽 뿔 포함 전체 폭 172)
      const domePath = 'M-58 18 C-60 -44 60 -44 58 18 Q0 26 -58 18 Z';
      return (
        <g id="hat-viking">
          <ellipse cx="0" cy="22" rx="58" ry="9" fill={INK} opacity="0.16" />
          {/* 양옆으로 거대하게 솟은 용맹한 바이킹 뿔 */}
          <path
            {...s}
            strokeWidth={4.5}
            fill="#fff3cf"
            d="M-48 0 C-78 -4 -90 -34 -76 -62 C-66 -40 -56 -24 -38 -20 Z"
          />
          <path
            {...s}
            strokeWidth={4.5}
            fill="#fff3cf"
            d="M48 0 C78 -4 90 -34 76 -62 C66 -40 56 -24 38 -20 Z"
          />
          {/* 뿔 고정 황금 링 밴드 */}
          <path {...s} strokeWidth={3.5} fill="#ffd43b" d="M-50 2 C-54 -8 -48 -18 -40 -22 L-35 -18 C-42 -14 -46 -5 -44 4 Z" />
          <path {...s} strokeWidth={3.5} fill="#ffd43b" d="M50 2 C54 -8 48 -18 40 -22 L35 -18 C42 -14 46 -5 44 4 Z" />
          {/* 투구 돔 본체 */}
          <path {...s} strokeWidth={4.5} fill={color} d={domePath} />
          <ellipse cx="-20" cy="-18" rx="20" ry="9" fill="#ffffff" opacity="0.38" transform="rotate(-18 -20 -18)" />
          {/* 철제 세로 스트립 & 이마 리벳 밴드 + 코 보호대(Nose guard) */}
          <path {...s} strokeWidth={3.8} fill="#ffd43b" d="M-7 -40 L7 -40 L6 18 L-6 18 Z" />
          <path {...s} strokeWidth={4.2} fill="#dee2e6" d="M-60 8 Q0 18 60 8 L58 20 Q0 30 -58 20 Z" />
          <path {...s} strokeWidth={3.8} fill="#dee2e6" d="M-6 14 L6 14 L4 29 Q0 32 -4 29 Z" />
          {[-42, -24, 24, 42].map((rx) => (
            <circle key={rx} cx={rx} cy="15" r="3" fill={INK} />
          ))}
          {badge && <Badge x={0} y={-14} text={badge} />}
        </g>
      );
    }

    case 'dino': {
      // 머리와 양볼 위쪽을 포근하게 덮는 대형 공룡 후드 코스튬 (폭 122)
      const hoodPath = 'M-60 20 C-64 -46 64 -46 60 20 C48 12 30 8 0 8 C-30 8 -48 12 -60 20 Z';
      return (
        <g id="hat-dino">
          <ellipse cx="0" cy="22" rx="58" ry="9" fill={INK} opacity="0.15" />
          {/* 등 지느러미 대형 뿔 3개 */}
          <path {...s} strokeWidth={3.8} fill="#ffd43b" d="M-40 -26 Q-46 -54 -20 -38 Z" />
          <path {...s} strokeWidth={4} fill="#ff922b" d="M-13 -39 Q0 -70 13 -39 Z" />
          <path {...s} strokeWidth={3.8} fill="#ffd43b" d="M40 -26 Q46 -54 20 -38 Z" />
          {/* 양옆 볼을 감싸는 후드 옆날개 */}
          <path {...s} strokeWidth={4} fill={color} d="M-58 14 C-65 24 -62 38 -51 39 C-44 38 -45 22 -48 12 Z" />
          <path {...s} strokeWidth={4} fill={color} d="M58 14 C65 24 62 38 51 39 C44 38 45 22 48 12 Z" />
          {/* 이마 위로 내려오는 큼직한 공룡 이빨 6개 */}
          {[-38, -23, -8, 8, 23, 38].map((tx) => (
            <path
              key={tx}
              {...s}
              strokeWidth={3.4}
              fill="#fffdf5"
              d={`M${tx - 7} 9 L${tx} 24 L${tx + 7} 9 Z`}
            />
          ))}
          {/* 공룡 후드 본체 */}
          <path {...s} strokeWidth={4.5} fill={color} d={hoodPath} />
          <ellipse cx="-22" cy="-22" rx="20" ry="8.5" fill="#ffffff" opacity="0.35" transform="rotate(-15 -22 -22)" />
          {/* 공룡 볼 얼룩무늬 */}
          <circle cx="-42" cy="-2" r="6" fill="#ffffff" opacity="0.28" />
          <circle cx="-32" cy="4" r="3.5" fill="#ffffff" opacity="0.28" />
          <circle cx="42" cy="-2" r="6" fill="#ffffff" opacity="0.28" />
          <circle cx="32" cy="4" r="3.5" fill="#ffffff" opacity="0.28" />
          {/* 큼직한 공룡 눈 & 콧구멍 */}
          {[-28, 28].map((ex) => (
            <g key={ex}>
              <circle {...s} strokeWidth={3.5} cx={ex} cy="-14" r="9.5" fill="#fffdf5" />
              <circle cx={ex} cy="-14" r="4.8" fill={INK} />
              <circle cx={ex - 1.8} cy="-16.5" r="2" fill="#ffffff" />
            </g>
          ))}
          <ellipse cx="-7" cy="-1" rx="3" ry="2.2" fill={INK} opacity="0.7" />
          <ellipse cx="7" cy="-1" rx="3" ry="2.2" fill={INK} opacity="0.7" />
        </g>
      );
    }

    case 'headset':
      // 펫의 통통한 볼/귀 옆면(x = ±64, y = 36)에 정확히 밀착되는 풀사이즈 게이밍 헤드셋
      return (
        <g id="hat-headset">
          {/* 헤드셋 상단 사이버 캣이어/윙 포인트 */}
          <path {...s} strokeWidth={3.6} fill={color} d="M-44 -10 L-52 -28 L-30 -18 Z" />
          <path {...s} strokeWidth={3.6} fill={color} d="M44 -10 L52 -28 L30 -18 Z" />
          <path fill="#00f5d4" d="M-42 -13 L-47 -23 L-34 -17 Z" />
          <path fill="#00f5d4" d="M42 -13 L47 -23 L34 -17 Z" />
          {/* 헤드셋 대형 아치 밴드 (머리 전체를 감쌈) */}
          <path d="M-64 34 C-66 -32 66 -32 64 34" fill="none" stroke={INK} strokeWidth="18" strokeLinecap="round" />
          <path d="M-64 34 C-66 -32 66 -32 64 34" fill="none" stroke={color} strokeWidth="10.5" strokeLinecap="round" />
          <path d="M-44 -4 C-20 -22 20 -22 44 -4" fill="none" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" opacity="0.5" />
          {/* 정수리 소프트 헤드패드 */}
          <path {...s} strokeWidth={3.6} fill="#fffdf5" d="M-26 -14 Q0 -22 26 -14 Q26 -6 0 -10 Q-26 -6 -26 -14 Z" />
          {/* 붐 마이크 (왼쪽 이어컵에서 입가로 자연스럽게 연결) */}
          <path d="M-62 46 Q-46 62 -22 56" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
          <ellipse {...s} strokeWidth={3.2} cx="-19" cy="56" rx="7.5" ry="5.2" fill={color} />
          <circle cx="-17" cy="55" r="2.2" fill="#00f5d4" />
          {/* 양옆 대형 게이밍 이어컵 + 네온 링 */}
          {[-1, 1].map((dir) => (
            <g key={dir} transform={`translate(${dir * 64} 36) rotate(${dir * -6})`}>
              <rect {...s} strokeWidth={3.8} x="-7" y="-20" width="14" height="40" rx="7" fill="#343a40" transform={`translate(${dir * -5} 0)`} />
              <rect {...s} strokeWidth={4} x="-13" y="-22" width="26" height="44" rx="13" fill={color} />
              <ellipse cx="0" cy="0" rx="6.8" ry="12.5" fill="#00f5d4" stroke={INK} strokeWidth="3" />
              <ellipse cx="-3" cy="-8" rx="2.5" ry="4.5" fill="#ffffff" opacity="0.75" />
            </g>
          ))}
        </g>
      );

    case 'aviator': {
      // 머리 전체를 감싸는 대형 파일럿 비행모 + 큼직한 귀덮개 & 고글 (폭 120~140)
      const capPath = 'M-58 18 C-60 -44 60 -44 58 18 Q0 26 -58 18 Z';
      return (
        <g id="hat-aviator">
          {/* 양옆 큼직한 가죽 귀덮개 (Earflaps) & 버클 스트랩 */}
          {[-1, 1].map((dir) => (
            <g key={dir}>
              <path
                {...s}
                strokeWidth={4.2}
                fill="#fff3e2"
                d={`M${dir * 46} 12 C${dir * 64} 14 ${dir * 68} 42 ${dir * 54} 48 C${dir * 42} 50 ${dir * 40} 26 ${dir * 44} 14 Z`}
              />
              <path
                {...s}
                strokeWidth={4.2}
                fill={color}
                d={`M${dir * 50} 10 C${dir * 68} 12 ${dir * 72} 40 ${dir * 58} 46 C${dir * 48} 48 ${dir * 46} 24 ${dir * 48} 12 Z`}
              />
              <circle {...s} strokeWidth={2.8} cx={dir * 57} cy="36" r="4" fill="#ffd43b" />
            </g>
          ))}
          {/* 비행모 돔 본체 */}
          <path {...s} strokeWidth={4.5} fill={color} d={capPath} />
          <ellipse cx="-20" cy="-20" rx="20" ry="8.5" fill="#ffffff" opacity="0.32" transform="rotate(-16 -20 -20)" />
          {/* 이마 폭신한 보아털(Fleece) 안감 패드 */}
          <path {...s} strokeWidth={4} fill="#fff3e2" d="M-52 20 C-52 3 52 3 52 20 C36 26 -36 26 -52 20 Z" />
          {/* 대형 파일럿 고글 스트랩 & 트윈 렌즈 */}
          <path d="M-59 -8 L59 -8" stroke={INK} strokeWidth="9" strokeLinecap="round" />
          <path d="M-59 -8 L59 -8" stroke="#495057" strokeWidth="4" strokeLinecap="round" />
          {[-22, 22].map((gx) => (
            <g key={gx}>
              <ellipse {...s} strokeWidth={4} cx={gx} cy="-9" rx="20" ry="15.5" fill="#dee2e6" />
              <ellipse {...s} strokeWidth={3.2} cx={gx} cy="-9" rx="14.5" ry="11" fill="#4dabf7" />
              <ellipse cx={gx - 4.5} cy="-12.5" rx="5.5" ry="3" fill="#ffffff" opacity="0.85" transform={`rotate(-20 ${gx - 4.5} -12.5)`} />
              <circle cx={gx + 5} cy="-5" r="2" fill="#ffffff" opacity="0.6" />
            </g>
          ))}
          {/* 고글 브릿지 */}
          <rect {...s} strokeWidth={3} x="-5" y="-13" width="10" height="7" rx="2" fill="#ffd43b" />
          {badge && <Badge x={0} y={-32} text={badge} />}
        </g>
      );
    }
  }
}

/** 상점·서랍에 쓰는 모자 단독 그림 */
export function HatIcon({ art, size = 64 }: { art: HatArt; size?: number }) {
  const isLargeBoyHat =
    art.shape === 'helmet' ||
    art.shape === 'pirate' ||
    art.shape === 'viking' ||
    art.shape === 'dino' ||
    art.shape === 'headset' ||
    art.shape === 'aviator';
  const vb = isLargeBoyHat ? '-92 -86 184 156' : '-60 -76 120 112';
  const ratio = isLargeBoyHat ? 156 / 184 : 112 / 120;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={vb} width={size} height={n(size * ratio)} aria-hidden="true" focusable="false">
      <HatShapeG {...art} />
    </svg>
  );
}

/** 모자 아이템 → 그림 정보 (모자가 아니면 null) */
export function hatArtOf(item: ItemDef | undefined): HatArt | null {
  if (!item || item.category !== 'hat' || !item.art.hatShape) return null;
  return { shape: item.art.hatShape as ExtendedHatShape, color: item.art.hatColor ?? '#ff8fc1', badge: item.art.hatBadge };
}
