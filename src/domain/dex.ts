/**
 * 펫 도감 — 다 자란 펫이 만족한 상태로 일정 기간(기본 2일)을 보내면 '졸업'해 도감에 들어가고, 새 알을 고른다.
 * 도감에 들어갈 때 함께한 동안의 기록으로 칭호를 붙인다. 예) '용감한 탐험가 냥냥이'
 * 칭호는 언제나 칭찬하는 말만 쓴다.
 */
import { localDateString } from './dates';
import { QUESTION_TYPES } from './questionGen';
import { affectionLevel, type LifeSnapshot, newEgg, type PetData, type Species, type Stage } from './pet';
import type { LearningData } from './progress';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const GRADUATION_DAYS_DEFAULT = 2;
export const GRADUATION_DAYS_RANGE = { min: 1, max: 14 } as const;

export interface DexEntry {
  id: string;
  species: Species;
  name: string;
  /** 수식어 (예: '용감한 탐험가') — 이름 앞에 붙인다 */
  title: string;
  stage: Exclude<Stage, 'egg'>;
  hatchedAt: string | null;
  leftAt: string;
  affectionLevel: number;
  /** 함께하는 동안 공부한 날·탐험 횟수 */
  studyDays: number;
  explorations: number;
  hat: string | null;
  /** graduated: 졸업, admin: 관리자가 새 펫을 시작 */
  reason: 'graduated' | 'admin';
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

/** 가장 많이 한 돌봄 (무료 돌봄 + 아이템 돌봄을 합쳐 센다) */
export function favoriteCare(counts: Record<string, number>): CareKind | null {
  const c = (k: string) => counts[k] ?? 0;
  const totals: [CareKind, number][] = [
    ['feed', c('feed') + c('item:food')],
    ['play', c('pet') + c('item:toy')],
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

export function graduationNeedMs(days: number): number {
  return days * DAY_MS;
}

/** 다 자란 펫이 행복한 시간을 (days)일 채웠는가 */
export function canGraduate(pet: PetData, days: number): boolean {
  return pet.stage === 'adult' && (pet.happyMs ?? 0) >= graduationNeedMs(days);
}

let seq = 0;
function entryId(now: number): string {
  seq += 1;
  return `dex_${now.toString(36)}_${seq}`;
}

/**
 * 지금 펫을 도감에 넣고 새 알(아직 종류를 고르지 않은 상태)로 바꾼다.
 * 학습 기록·별·가방·모자는 그대로다. 부화 전 알이면 도감에 넣지 않는다.
 */
export function sendToDex(
  pet: PetData,
  learning: LearningData,
  now: number,
  reason: DexEntry['reason'],
): { entry: DexEntry | null; nextPet: PetData } {
  const nextPet = newEgg(now, learning.totalExplorations);
  if (!pet.species || pet.stage === 'egg') return { entry: null, nextPet };
  const life = lifeDelta(pet, learning);
  return {
    entry: {
      id: entryId(now),
      species: pet.species,
      name: pet.name,
      title: makeTitle(pet, learning),
      stage: pet.stage,
      hatchedAt: pet.hatchedAt,
      leftAt: localDateString(now),
      affectionLevel: affectionLevel(pet.affection),
      studyDays: Math.max(0, life.studyDays),
      explorations: Math.max(0, life.explorations),
      hat: pet.equippedHat,
      reason,
    },
    nextPet,
  };
}
