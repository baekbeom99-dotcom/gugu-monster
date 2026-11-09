/** 우리 캡슐: 노란 별 모양에 굵은 검정 테두리와 띠 */
export function StarCapsule({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden focusable="false">
      <polygon
        points="32,4 40,24 61,25 44,38 50,59 32,47 14,59 20,38 3,25 24,24"
        fill="#ffd84d"
        stroke="#111"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <rect x="14" y="29" width="36" height="8" rx="4" fill="#ff8fb1" stroke="#111" strokeWidth="3" />
      <circle cx="32" cy="33" r="3" fill="#fff" stroke="#111" strokeWidth="2" />
    </svg>
  );
}
