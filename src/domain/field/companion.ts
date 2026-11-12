/** 함께 다니는 구구몬 고르기 — 순수 계산(React 없음) */
import { MONSTER_KINDS } from '../battle';
import { LEGEND_SPECIES, type SpeciesId } from './creatures';
import { isFainted } from './wounds';

/** 종 목록 순서 (저장의 SPECIES_IDS와 같은 순서) — 마지막 동률을 가를 때 쓴다 */
const ORDER: readonly SpeciesId[] = [...MONSTER_KINDS, ...LEGEND_SPECIES];

type Pickable = { level: number; hp: number; firstCaughtAt: number };

/**
 * 구구몬이 쓰러졌을 때 대신 함께 다닐 종.
 * 도감에서 쓰러진 종을 뺀 체력 > 0인 종 중 레벨이 가장 높은 것 → 같으면 먼저 잡은 것 → 그래도 같으면 종 목록 순서.
 * 후보가 없으면 null.
 */
export function pickReplacement(species: Partial<Record<SpeciesId, Pickable>>, fainted: SpeciesId): SpeciesId | null {
  let best: SpeciesId | null = null;
  let bestEntry: Pickable | null = null;
  // 종 목록 순서로 돌면서 "더 나을 때만" 바꾸므로, 끝까지 같으면 목록에서 앞선 종이 남는다
  for (const id of ORDER) {
    if (id === fainted) continue;
    const e = species[id];
    if (!e || isFainted(e)) continue;
    if (!bestEntry || e.level > bestEntry.level || (e.level === bestEntry.level && e.firstCaughtAt < bestEntry.firstCaughtAt)) {
      best = id;
      bestEntry = e;
    }
  }
  return best;
}
