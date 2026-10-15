/** 0 이상 1 미만의 난수를 돌려주는 함수. 테스트에서 시드를 고정할 수 있도록 주입받는다. */
export type Rng = () => number;

/** 시드 고정 난수 생성기 (mulberry32). */
export function seededRng(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(rng: Rng, minInclusive: number, maxInclusive: number): number {
  return minInclusive + Math.floor(rng() * (maxInclusive - minInclusive + 1));
}

export function pickOne<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pickOne: 빈 배열');
  return items[Math.floor(rng() * items.length)];
}

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 가중치에 비례해 하나를 고른다. 가중치 합이 0이면 null. */
export function weightedPick<T>(rng: Rng, items: readonly T[], weightOf: (item: T) => number): T | null {
  let total = 0;
  for (const item of items) total += Math.max(0, weightOf(item));
  if (total <= 0) return null;
  let r = rng() * total;
  for (const item of items) {
    r -= Math.max(0, weightOf(item));
    if (r < 0) return item;
  }
  return items[items.length - 1];
}
