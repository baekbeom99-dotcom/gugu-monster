/** 우리 캡슐: 둥근 가챠 캡슐 — 위 투명 하늘색, 아래 노랑, 가운데 이음선에 별 스티커 */
export function GachaCapsule({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden focusable="false">
      <defs>
        <clipPath id="gacha-clip">
          <circle cx="32" cy="32" r="27" />
        </clipPath>
      </defs>
      <g clipPath="url(#gacha-clip)">
        <rect x="0" y="0" width="64" height="32" fill="#8fd8ff" fillOpacity="0.75" />
        <rect x="0" y="32" width="64" height="32" fill="#ffd84d" />
      </g>
      <ellipse cx="20" cy="17" rx="6" ry="3.5" fill="#fff" transform="rotate(-30 20 17)" />
      <line x1="5" y1="32" x2="59" y2="32" stroke="#111" strokeWidth="3" />
      <circle cx="32" cy="32" r="27" fill="none" stroke="#111" strokeWidth="5" />
      <polygon
        points="32,24 34.4,29.6 40.4,30 35.8,33.8 37.3,39.6 32,36.4 26.7,39.6 28.2,33.8 23.6,30 29.6,29.6"
        fill="#ff8fb1"
        stroke="#111"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
