/** 펫이 싼 똥 — 설계서 6-6. 굵은 테두리의 세 겹 똬리 + 냄새 줄. */
import { INK } from './colors';

const line = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

export function PoopSprite({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} className={className} role="img" aria-label="똥">
      <g className="poop-stink" fill="none" stroke="#7bc96f" strokeWidth="3.5" strokeLinecap="round">
        <path d="M24 18 q-4 -5 0 -10 q4 -5 0 -10" />
        <path d="M40 14 q-4 -5 0 -10 q4 -5 0 -10" />
        <path d="M56 18 q-4 -5 0 -10 q4 -5 0 -10" />
      </g>
      <ellipse cx="40" cy="74" rx="30" ry="4" fill={INK} opacity="0.15" />
      <path {...line} fill="#9a6440" d="M10 70 Q8 56 22 54 L58 54 Q72 56 70 70 Z" />
      <path {...line} fill="#a86e48" d="M18 56 Q16 42 30 40 L50 40 Q64 42 62 56 Z" />
      <path {...line} fill="#b57a50" d="M27 42 Q26 30 38 22 Q42 30 50 31 Q55 34 53 42 Z" />
      <ellipse cx="30" cy="47" rx="4" ry="2.5" fill="#fff" opacity="0.5" />
      <circle cx="33" cy="62" r="2.6" fill={INK} />
      <circle cx="47" cy="62" r="2.6" fill={INK} />
    </svg>
  );
}
