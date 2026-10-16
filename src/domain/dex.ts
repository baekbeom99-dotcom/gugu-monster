/**
 * 펫 도감 — 친밀도 Lv10이 된 펫은 칭호를 받고 '졸업'해 도감에 들어가고, 새 알을 고른다.
 * 도감의 펫을 고르면 지금 펫과 자리를 바꿔 다시 함께 탐험한다 (레벨은 10을 넘어 계속 오른다).
 * 새 알은 아직 졸업하지 않은 펫이 Lv10이 되었을 때만 받는다 (졸업은 펫마다 한 번).
 * 칭호는 언제나 칭찬하는 말만 쓴다. 예) '용감한 탐험가 냥냥이'
 */
import { localDateString } from './dates';
import { QUESTION_TYPES } from './questionGen';
import {
  affectionForLevel,
  affectionLevel,
  initialPet,
  type LifeSnapshot,
  newEgg,
  type PetData,
  type Species,
  type Stage,
} from './pet';
import type { LearningData } from './progress';

/** 이 레벨이 되면 졸업 */
export const GRADUATION_LEVEL = 10;

export interface DexEntry {
  id: string;
  species: Species;
  name: string;
  /** 졸업 칭호 (예: '용감한 탐험가') — 아직 졸업 전이면 null */
  title: string | null;
  stage: Exclude<Stage, 'egg'>;
  hatchedAt: string | null;
  leftAt: string;
  /** 도감에 들어갈 때의 친밀도 레벨 */
  affectionLevel: number;
  /** 함께하는 동안 공부한 날·탐험 횟수 */
  studyDays: number;
  explorations: number;
  hat: string | null;
  /** graduated: Lv10 졸업, admin: 관리자가 새 펫 시작, resting: 다른 펫과 자리를 바꿔 쉬는 중 */
  reason: 'graduated' | 'admin' | 'resting';
  /** 다시 데려올 때 쓰는 펫 전체 상태 (예전 버전 기록에는 없을 수 있다) */
  pet?: PetData;
}

export function lifeSnapshot(learning: LearningData): LifeSnapshot {
  return {
    explorations: learning.totalExplorations,
    attempts: learning.totalAttempts,
    correct: QUESTION_TYPES.reduce((sum, t) => sum + (learning.typeStats[t]?.correct ?? 0), 0),
    overcome: learning.totalOvercome ?? 0,
    mastered: learning.masteredDans.length,
    studyDays: learning.studyDays.length,
  };
}

/** 이 펫과 함께한 동안의 기록 = 지금 기록 − 부화할 때 기록 */
export function lifeDelta(pet: PetData, learning: LearningData): LifeSnapshot {
  const now = lifeSnapshot(learning);
  const start = pet.lifeStart ?? { explorations: 0, attempts: 0, correct: 0, overcome: 0, mastered: 0, studyDays: 0 };
  return {
    explorations: now.explorations - start.explorations,
    attempts: now.attempts - start.attempts,
    correct: now.correct - start.correct,
    overcome: now.overcome - start.overcome,
    mastered: now.mastered - start.mastered,
    studyDays: now.studyDays - start.studyDays,
  };
}

/** 같은 펫이면 같은 칭호가 나오도록 이름·부화일로 정하는 간단한 수 */
function seedOf(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

type CareKind = 'feed' | 'play' | 'wash' | 'sleep';

/** 가장 많이 한 돌봄 (무료 돌봄 + 아이템 돌봄을 합쳐 센다. 산책은 놀기) */
export function favoriteCare(counts: Record<string, number>): CareKind | null {
  const c = (k: string) => counts[k] ?? 0;
  const totals: [CareKind, number][] = [
    ['feed', c('feed') + c('item:food')],
    ['play', c('pet') + c('walk') + c('item:toy')],
    ['wash', c('wash') + c('item:hygiene')],
    ['sleep', c('sleep')],
  ];
  const best = totals.reduce((a, b) => (b[1] > a[1] ? b : a));
  return best[1] > 0 ? best[0] : null;
}

const CARE_ADJECTIVE: Record<CareKind, string> = { feed: '든든한', play: '명랑한', wash: '깔끔한', sleep: '포근한' };
const CARE_NOUN: Record<CareKind, string> = { feed: '요리사', play: '놀이 대장', wash: '의사', sleep: '꿈나라 여행자' };
const DEFAULT_ADJECTIVES = ['씩씩한', '멋진', '상냥한', '반짝이는'];
const DEFAULT_NOUNS = ['모험가', '꼬마 영웅', '친구', '탐험대원'];

/**
 * 칭호 = 수식어(어떻게 돌봐 주었나) + 이름표(무엇을 해냈나).
 * 해당하는 것이 여러 개면 앞의 것(더 특별한 것)을 고른다.
 */
export function makeTitle(pet: PetData, learning: LearningData): string {
  const life = lifeDelta(pet, learning);
  const accuracy = life.attempts > 0 ? life.correct / life.attempts : 0;
  const smart = life.attempts >= 50 && accuracy >= 0.9;
  const care = favoriteCare(pet.careCounts ?? {});
  const seed = seedOf(`${pet.name}|${pet.hatchedAt ?? ''}|${pet.species ?? ''}`);

  const adjectives = [
    life.overcome >= 5 && '용감한',
    affectionLevel(pet.affection) >= 8 && '따뜻한',
    smart && '똑똑한',
    (pet.careCounts?.special ?? 0) >= 3 && '행복한',
    care && CARE_ADJECTIVE[care],
  ].filter(Boolean) as string[];

  const nouns = [
    life.mastered >= 1 && '구구단 박사',
    life.overcome >= 8 && '해결사',
    smart && '수학 천재',
    life.explorations >= 20 && '탐험가',
    care && CARE_NOUN[care],
  ].filter(Boolean) as string[];

  const adjective = adjectives[0] ?? DEFAULT_ADJECTIVES[seed % DEFAULT_ADJECTIVES.length];
  const noun = nouns[0] ?? DEFAULT_NOUNS[(seed >>> 3) % DEFAULT_NOUNS.length];
  return `${adjective} ${noun}`;
}

/** 아직 졸업하지 않은 펫이 친밀도 Lv10이 되었는가 */
export function canGraduate(pet: PetData): boolean {
  return !!pet.species && pet.stage !== 'egg' && !pet.graduated && affectionLevel(pet.affection) >= GRADUATION_LEVEL;
}

let seq = 0;
function entryId(now: number): string {
  seq += 1;
  return `dex_${now.toString(36)}_${seq}`;
}

/** 지금 펫으로 도감 기록을 만든다 (펫 전체 상태를 함께 넣어 나중에 다시 데려올 수 있게) */
export function makeEntry(pet: PetData, learning: LearningData, now: number, reason: DexEntry['reason']): DexEntry | null {
  if (!pet.species || pet.stage === 'egg') return null;
  const graduating = reason !== 'resting';
  // 졸업(또는 관리자의 새 펫)이면 칭호를 정하고 '졸업한 펫'으로 표시한다
  const title = pet.title ?? (graduating ? makeTitle(pet, learning) : null);
  const saved: PetData = { ...pet, title, graduated: pet.graduated || graduating, sleepingUntil: null };
  const life = lifeDelta(pet, learning);
  return {
    id: entryId(now),
    species: pet.species,
    name: pet.name,
    title,
    stage: pet.stage,
    hatchedAt: pet.hatchedAt,
    leftAt: localDateString(now),
    affectionLevel: affectionLevel(pet.affection),
    studyDays: Math.max(0, life.studyDays),
    explorations: Math.max(0, life.explorations),
    hat: pet.equippedHat,
    reason,
    pet: saved,
  };
}

/**
 * 졸업 또는 관리자의 새 펫 시작: 지금 펫을 도감에 넣고 새 알(아직 종류를 고르지 않은 상태)로 바꾼다.
 * 학습 기록·별·가방·모자는 그대로다. 부화 전 알이면 도감에 넣지 않는다.
 */
export function sendToDex(
  pet: PetData,
  learning: LearningData,
  now: number,
  reason: 'graduated' | 'admin',
): { entry: DexEntry | null; nextPet: PetData } {
  return { entry: makeEntry(pet, learning, now, reason), nextPet: newEgg(now, learning.totalExplorations) };
}

/** 도감 기록에서 펫을 다시 데려온다. 예전 기록(펫 상태 없음)은 이름·모습·레벨·모자로 다시 만든다. */
export function restorePet(entry: DexEntry, now: number): PetData {
  if (entry.pet) {
    return { ...entry.pet, statsUpdatedAt: now, sleepingUntil: null, cooldowns: {} };
  }
  return {
    ...initialPet(now),
    species: entry.species,
    name: entry.name,
    stage: entry.stage,
    affection: affectionForLevel(entry.affectionLevel),
    equippedHat: entry.hat,
    hatchedAt: entry.hatchedAt,
    title: entry.title,
    graduated: entry.reason !== 'resting',
    lastVisitDate: localDateString(now),
  };
}

export type SwapResult = { ok: true; pet: PetData; dex: DexEntry[] } | { ok: false; reason: 'egg' | 'missing' };

/**
 * 도감의 펫과 자리 바꾸기: 지금 펫은 도감에서 쉬고, 고른 펫이 다시 함께한다.
 * 지금 펫이 아직 알이면 알을 잃지 않도록 바꾸지 않는다 (먼저 부화시킨다).
 */
export function swapWithDex(current: PetData, dex: DexEntry[], entryId: string, learning: LearningData, now: number): SwapResult {
  const target = dex.find((e) => e.id === entryId);
  if (!target) return { ok: false, reason: 'missing' };
  if (!current.species || current.stage === 'egg') return { ok: false, reason: 'egg' };
  const resting = makeEntry(current, learning, now, 'resting')!;
  return {
    ok: true,
    pet: restorePet(target, now),
    dex: [...dex.filter((e) => e.id !== entryId), resting],
  };
}
