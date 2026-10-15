import type { Dan } from '../domain/facts';

/** 단별 대표 색 (몬스터 몸 색) */
export const DAN_COLORS: Record<Dan, string> = {
  2: '#ff9ebb',
  3: '#ffb066',
  4: '#ffd84d',
  5: '#b5e655',
  6: '#6ee0c0',
  7: '#b9a2ff',
  8: '#7cc6ff',
  9: '#ff8f8f',
  12: '#ffcc33',
  13: '#ffbf1f',
};

export const GOLD = '#ffcf3a';
export const INK = '#111111';

/** hex 색을 amount(−1~1)만큼 어둡게(−)/밝게(+) */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const c = (n >> shift) & 0xff;
    const v = amount < 0 ? c * (1 + amount) : c + (255 - c) * amount;
    return Math.round(Math.min(255, Math.max(0, v)));
  };
  return `#${[16, 8, 0].map((s) => channel(s).toString(16).padStart(2, '0')).join('')}`;
}
