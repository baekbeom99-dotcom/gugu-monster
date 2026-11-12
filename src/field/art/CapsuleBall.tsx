import { useId } from 'react';
import type { CapsuleType } from '../../domain/field/capsules';

/** 캡슐 윗반쪽 색 — 필드마다 다르다 (설계서 4절) */
export const CAPSULE_COLORS: Record<CapsuleType, string> = {
  meadow: '#4caf50',
  waterside: '#2f8fe0',
  desert: '#f08a24',
  legend: '#f2c230',
};

const DARK = '#1f2430';

/** 우리 캡슐: 둥근 공 — 위 반쪽은 필드 색, 아래 반쪽은 흰색, 가운데 어두운 띠와 둥근 단추 */
export function CapsuleBall({ type, size = 64 }: { type: CapsuleType; size?: number }) {
  // useId의 ':'는 url(#...)에서 깨질 수 있어 바꾼다
  const clipId = `capsule-clip-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  const color = CAPSULE_COLORS[type];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden focusable="false">
      <defs>
        <clipPath id={clipId}>
          <circle cx="32" cy="32" r="27" />
        </clipPath>
      </defs>
      <ellipse cx="32" cy="60" rx="17" ry="3" fill="#000" fillOpacity="0.18" />
      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="0" width="64" height="32" fill={color} />
        <rect x="0" y="32" width="64" height="32" fill="#f4f6f8" />
        <path d="M8 46 Q32 66 56 46 L56 64 L8 64 Z" fill="#c9d0d8" fillOpacity="0.7" />
      </g>
      <ellipse cx="21" cy="17" rx="6" ry="3.5" fill="#fff" fillOpacity="0.85" transform="rotate(-35 21 17)" />
      <line x1="5" y1="32" x2="59" y2="32" stroke={DARK} strokeWidth="5" />
      <circle cx="32" cy="32" r="27" fill="none" stroke={DARK} strokeWidth="5" />
      <circle cx="32" cy="32" r="8" fill="#f4f6f8" stroke={DARK} strokeWidth="4" />
      <circle cx="32" cy="32" r="3" fill={type === 'legend' ? color : '#d5dbe2'} />
      {type === 'legend' && (
        <polygon
          points="47,9 48.6,12.4 52,13 49.5,15.4 50.1,19 47,17.2 43.9,19 44.5,15.4 42,13 45.4,12.4"
          fill="#fff6c2"
          stroke={DARK}
          strokeWidth="1"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
