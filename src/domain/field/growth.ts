/** 구구몬 경험치·레벨·진화 규칙 — 설계서 6-2. 순수 계산(React 없음) */
import type { SpeciesEntry } from '../../store/fieldData';
import { speciesDef, type SpeciesId } from './creatures';
import { EVOLVE_LEVELS, EXP_BASE, EXP_PER_LEVEL, MAX_LEVEL } from './tuning';

// 수치는 tuning.ts에서 정한다 (예전 import 자리 유지용으로 다시 내보냄)
export { CORRECT_EXP, DUPLICATE_EXP, EVOLVE_LEVELS, MAX_LEVEL, PARTICIPATION_EXP } from './tuning';

/** 다음 레벨까지 필요한 경험치 */
export function expToNext(level: number): number {
  return EXP_BASE + level * EXP_PER_LEVEL;
}

function stageForLevel(level: number): 1 | 2 | 3 {
  if (level >= EVOLVE_LEVELS[3]) return 3;
  if (level >= EVOLVE_LEVELS[2]) return 2;
  return 1;
}

export interface AddExpResult {
  entry: SpeciesEntry;
  levelsGained: number;
  /** 이번에 도달한 가장 높은 진화 단계 (진화하지 않았으면 null) */
  evolvedTo: 2 | 3 | null;
}

/** 경험치를 더한다. 여러 레벨이 한 번에 오를 수 있고, Lv30에서 멈추며(경험치 0), 레전드는 진화하지 않는다 */
export function addExp(e: SpeciesEntry, exp: number, legend: boolean): AddExpResult {
  let level = e.level;
  let have = e.exp + Math.max(0, exp);
  while (level < MAX_LEVEL && have >= expToNext(level)) {
    have -= expToNext(level);
    level += 1;
  }
  if (level >= MAX_LEVEL) {
    level = MAX_LEVEL;
    have = 0;
  }
  const target = legend ? e.stage : Math.max(e.stage, stageForLevel(level)) as 1 | 2 | 3;
  const evolvedTo = target > e.stage ? (target as 2 | 3) : null;
  return { entry: { ...e, level, exp: have, stage: target }, levelsGained: level - e.level, evolvedTo };
}

/** 화면에 쓰는 이름: 2단계 "젤리몬 ★★", 3단계 "젤리몬 ★★★" */
export function displayName(id: SpeciesId, stage: 1 | 2 | 3): string {
  const name = speciesDef(id).name;
  return stage === 1 ? name : `${name} ${'★'.repeat(stage)}`;
}
