/** 체력이 줄수록 몬스터가 작아진다: 가득 1배 → 한 칸 남으면 약 0.73배 (잡히는 순간 0.6배) */
export function monsterScale(hp: number, maxHp: number): number {
  if (maxHp <= 0) return 1;
  return Number((0.6 + 0.4 * Math.max(0, Math.min(hp, maxHp)) / maxHp).toFixed(3));
}
