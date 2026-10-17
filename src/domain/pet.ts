/** 펫 상태·돌봄·성장 규칙 — 설계서 6장, 7장. 펫은 죽거나 벌받지 않는다. */
import { localDateString } from './dates';

export type Species = 'tiger' | 'cat' | 'bunny' | 'hedgehog' | 'cheese';
export type Stage = 'egg' | 'baby' | 'child' | 'adult';
export type StatKey = 'fullness' | 'mood' | 'cleanliness';
export type CareAction = 'feed' | 'pet' | 'walk' | 'wash' | 'sleep';

export const SPECIES: readonly Species[] = ['tiger', 'cat', 'bunny', 'hedgehog', 'cheese'];
export const STAGES: readonly Stage[] = ['egg', 'baby', 'child', 'adult'];

export const SPECIES_INFO: Record<Species, { egg: string; name: string; desc: string }> = {
  tiger: { egg: '줄무늬 알', name: '어흥이', desc: '씩씩하게 손 흔드는 아기 호랑이' },
  cat: { egg: '얼룩 알', name: '얼룩이', desc: '회색 얼룩이 매력인 고양이' },
  bunny: { egg: '하트 알', name: '토실이', desc: '분홍 볼이 말랑한 토끼' },
  hedgehog: { egg: '밤송이 알', name: '도치', desc: '눈이 반짝반짝한 고슴도치' },
  cheese: { egg: '치즈 알', name: '치즈', desc: '부드러운 치즈색 고양이' },
};

/** 예전 펫 종류 → 새 종류 (저장 데이터 이어받기) */
export const LEGACY_SPECIES: Record<string, Species> = { penguin: 'bunny', dino: 'tiger' };
export function normalizeSpecies(s: unknown): Species | null {
  if (typeof s !== 'string') return null;
  if ((SPECIES as readonly string[]).includes(s)) return s as Species;
  return LEGACY_SPECIES[s] ?? 'cat';
}

export const STAGE_LABELS: Record<Stage, string> = { egg: '알', baby: '아기', child: '어린이', adult: '다 자란 펫' };

export interface PetData {
  species: Species | null;
  name: string;
  stage: Stage;
  fullness: number;
  mood: number;
  cleanliness: number;
  /** 친밀도 — 줄지 않는다 */
  affection: number;
  /** 성장 경험치 — 줄지 않는다 */
  growthXp: number;
  careXpToday: { date: string; xp: number };
  equippedHat: string | null;
  /** 행동·장난감별 다음 사용 가능 시각 (키: 돌봄 행동 또는 아이템 ID) */
  cooldowns: Record<string, number>;
  sleepingUntil: number | null;
  /** 상태 감소 계산 기준 시각 */
  statsUpdatedAt: number;
  /** 하루 첫 방문 친밀도 보너스를 받은 날 */
  lastVisitDate: string | null;
  evolutionCards: { stage: Stage; date: string }[];
  /** 이미 친밀도 Lv10으로 졸업해 새 알을 받은 펫인가 (졸업은 한 번만) */
  graduated: boolean;
  /** 졸업할 때 받은 칭호 (예: '용감한 탐험가') */
  title: string | null;
  /** 돌봄 종류별 횟수 (도감 칭호를 정할 때 쓴다) */
  careCounts: Record<string, number>;
  /** 부화할 때의 학습 기록 (이 펫과 함께한 동안의 기록을 계산하는 기준) */
  lifeStart: LifeSnapshot | null;
  /** 이 알을 고를 때까지의 탐험 횟수. 그보다 많아지면(탐험 1번 더) 부화한다. */
  eggBaseExplorations: number;
  hatchedAt: string | null;
}

export interface LifeSnapshot {
  explorations: number;
  attempts: number;
  correct: number;
  overcome: number;
  mastered: number;
  studyDays: number;
}

export const STAT_MIN = 30;
export const STAT_MAX = 100;
export const DECAY_PER_HOUR: Record<StatKey, number> = { fullness: 3, mood: 2, cleanliness: 1.5 };
/** 아무리 오래 쉬어도 이 시간만큼만 줄어든다 */
export const MAX_DECAY_HOURS = 24;
const HOUR_MS = 3_600_000;
const MIN_MS = 60_000;

/** 놀기(쓰다듬기·산책·장난감)를 하면 배부름·깨끗함이 30 줄어든다 */
export const PLAY_COST: Partial<Record<StatKey, number>> = { fullness: -30, cleanliness: -30 };

/** 무료 기본 돌봄 (설계서 6-3). 아이템 돌봄은 M5 상점에서 추가된다. */
export const CARE: Record<CareAction, { label: string; cooldownMin: number; effects: Partial<Record<StatKey, number>>; affection: number }> = {
  feed: { label: '기본 사료', cooldownMin: 120, effects: { fullness: 20 }, affection: 1 },
  // 놀고 나면 배고파지고 더러워진다 (하한 30은 그대로)
  pet: { label: '쓰다듬기', cooldownMin: 10, effects: { mood: 5, ...PLAY_COST }, affection: 1 },
  walk: { label: '산책하기', cooldownMin: 60, effects: { mood: 15, ...PLAY_COST }, affection: 2 },
  wash: { label: '물로 씻기', cooldownMin: 120, effects: { cleanliness: 20 }, affection: 1 },
  // 자고 일어나면 배가 고프다
  sleep: { label: '잠재우기', cooldownMin: 240, effects: { mood: 10, fullness: -50 }, affection: 1 },
};
export const SLEEP_MINUTES = 30;
export const CARE_XP_PER_ACTION = 1;
export const CARE_XP_DAILY_CAP = 10;
export const DAILY_VISIT_AFFECTION = 3;
export const EXPLORATION_AFFECTION = 3;
export const WELCOME_BACK_HOURS = 24;

/** 친밀도 Lv2~Lv10에 필요한 누적 친밀도 (설계서 6-4) */
export const AFFECTION_THRESHOLDS = [10, 25, 45, 70, 100, 140, 190, 250, 320];
/** 친밀도 레벨로 열리는 반응 */
export const AFFECTION_UNLOCKS: { level: number; label: string }[] = [
  { level: 3, label: '하이파이브' },
  { level: 5, label: '춤추기' },
  { level: 7, label: '특별 응원' },
];

/** 친밀도 레벨이 이만큼 되면 진화한다 (아기 → 어린이 Lv3, 어린이 → 다 자람 Lv6) */
export const EVOLUTION_LEVELS: Record<'child' | 'adult', number> = { child: 3, adult: 6 };

export function initialPet(now: number): PetData {
  return {
    species: null,
    name: '',
    stage: 'egg',
    fullness: 80,
    mood: 80,
    cleanliness: 80,
    affection: 0,
    growthXp: 0,
    careXpToday: { date: '', xp: 0 },
    equippedHat: null,
    cooldowns: {},
    sleepingUntil: null,
    statsUpdatedAt: now,
    lastVisitDate: null,
    evolutionCards: [],
    graduated: false,
    title: null,
    careCounts: {},
    lifeStart: null,
    eggBaseExplorations: 0,
    hatchedAt: null,
  };
}

/** 새 알: 지금까지의 탐험 횟수를 기준으로, 탐험을 한 번 더 하면 깨어난다 */
export function newEgg(now: number, baseExplorations: number): PetData {
  return { ...initialPet(now), eggBaseExplorations: baseExplorations };
}

/** 고른 알이 부화할 차례인가 (그 알을 고른 뒤 탐험을 한 번 이상 마쳤다) */
export function needsHatch(pet: PetData, explorations: number): boolean {
  return pet.stage === 'egg' && !!pet.species && explorations > (pet.eggBaseExplorations ?? 0);
}

const clampStat = (v: number) => Math.min(STAT_MAX, Math.max(STAT_MIN, v));

/**
 * 지난 시간만큼 상태를 줄인다. 하한 30, 최대 24시간분.
 * 기기 시간이 뒤로 갔으면 아무것도 바꾸지 않는다. 알일 때는 줄지 않는다.
 */
export function applyDecay(pet: PetData, now: number): PetData {
  if (now <= pet.statsUpdatedAt) return pet;
  if (pet.stage === 'egg') return { ...pet, statsUpdatedAt: now };
  const hours = Math.min(MAX_DECAY_HOURS, (now - pet.statsUpdatedAt) / HOUR_MS);
  const decay = (key: StatKey) => (pet[key] < STAT_MIN ? pet[key] : clampStat(pet[key] - DECAY_PER_HOUR[key] * hours));
  return {
    ...pet,
    fullness: decay('fullness'),
    mood: decay('mood'),
    cleanliness: decay('cleanliness'),
    statsUpdatedAt: now,
  };
}

export function isSleeping(pet: PetData, now: number): boolean {
  return pet.sleepingUntil !== null && now < pet.sleepingUntil;
}

/** 남은 대기 시간(ms). 0이면 바로 할 수 있다. */
export function cooldownLeft(pet: PetData, key: string, now: number): number {
  return Math.max(0, (pet.cooldowns[key] ?? 0) - now);
}

export function cooldownMinutesLabel(ms: number): string {
  // 반올림: 방금 시작한 2시간 대기가 '2시간 1분'으로 보이지 않게 (최소 1분)
  const min = Math.max(1, Math.round(ms / MIN_MS));
  return min >= 60 ? `${Math.floor(min / 60)}시간${min % 60 ? ` ${min % 60}분` : ''}` : `${min}분`;
}

/** 돌봄 성장 XP는 하루 10까지 */
function addCareXp(pet: PetData, now: number): PetData {
  const today = localDateString(now);
  const used = pet.careXpToday.date === today ? pet.careXpToday.xp : 0;
  const gain = Math.min(CARE_XP_PER_ACTION, CARE_XP_DAILY_CAP - used);
  if (gain <= 0) return { ...pet, careXpToday: { date: today, xp: used } };
  return { ...pet, growthXp: pet.growthXp + gain, careXpToday: { date: today, xp: used + gain } };
}

export type CareFailure = 'cooldown' | 'sleeping' | 'egg' | 'full';
export type CareResult = { ok: true; pet: PetData } | { ok: false; reason: CareFailure };

export interface CareSpec {
  effects: Partial<Record<StatKey, number>>;
  affection: number;
  /** 대기 시간 키 (없으면 대기 없음 — 소모품) */
  cooldownKey?: string;
  cooldownMin?: number;
  /** 이미 가득 찼으면 쓰지 않는다 (아끼는 별로 산 소모품 보호) */
  refuseWhenFull?: boolean;
  /** 돌봄 종류별 횟수에 더할 키 (도감 칭호용) */
  countKeys?: string[];
}

/** 돌봄 한 번: 무료 행동과 아이템이 함께 쓴다. 성장 XP는 하루 10까지. */
export function applyCare(pet: PetData, spec: CareSpec, now: number): CareResult {
  if (pet.stage === 'egg' || !pet.species) return { ok: false, reason: 'egg' };
  let next = applyDecay(pet, now);
  if (isSleeping(next, now)) return { ok: false, reason: 'sleeping' };
  if (spec.cooldownKey && cooldownLeft(next, spec.cooldownKey, now) > 0) return { ok: false, reason: 'cooldown' };
  const stats = Object.keys(spec.effects) as StatKey[];
  if (spec.refuseWhenFull && stats.length > 0 && stats.every((k) => next[k] >= STAT_MAX)) return { ok: false, reason: 'full' };

  next = { ...next };
  for (const [key, amount] of Object.entries(spec.effects) as [StatKey, number][]) {
    next[key] = clampStat(next[key] + amount);
  }
  next.affection += spec.affection;
  if (spec.countKeys?.length) {
    const counts = { ...(next.careCounts ?? {}) };
    for (const k of spec.countKeys) counts[k] = (counts[k] ?? 0) + 1;
    next.careCounts = counts;
  }
  if (spec.cooldownKey && spec.cooldownMin) {
    next.cooldowns = { ...next.cooldowns, [spec.cooldownKey]: now + spec.cooldownMin * MIN_MS };
  }
  return { ok: true, pet: addCareXp(next, now) };
}

export function doCare(pet: PetData, action: CareAction, now: number): CareResult {
  const care = CARE[action];
  const r = applyCare(
    pet,
    { effects: care.effects, affection: care.affection, cooldownKey: action, cooldownMin: care.cooldownMin, countKeys: [action] },
    now,
  );
  if (r.ok && action === 'sleep') return { ok: true, pet: { ...r.pet, sleepingUntil: now + SLEEP_MINUTES * MIN_MS } };
  return r;
}

/** 모자 쓰기·벗기 (null이면 벗기) */
export function equipHat(pet: PetData, hatId: string | null): PetData {
  return { ...pet, equippedHat: hatId };
}

/** 언제든 깨울 수 있다. 불이익 없음. */
export function wake(pet: PetData): PetData {
  return pet.sleepingUntil === null ? pet : { ...pet, sleepingUntil: null };
}

export interface VisitResult {
  pet: PetData;
  /** 오늘 첫 방문이라 친밀도를 받았는가 */
  firstVisitToday: boolean;
  /** 24시간 넘게 쉬다 돌아왔는가 (반겨주는 연출) */
  welcomeBack: boolean;
}

/** 앱을 열 때: 상태 감소 반영 + 하루 첫 방문 친밀도 + 오랜만의 방문 판정 */
export function visit(pet: PetData, lastSeenAt: number, now: number): VisitResult {
  let next = applyDecay(pet, now);
  const today = localDateString(now);
  const firstVisitToday = next.stage !== 'egg' && next.lastVisitDate !== today;
  if (firstVisitToday) next = { ...next, affection: next.affection + DAILY_VISIT_AFFECTION, lastVisitDate: today };
  const welcomeBack = next.stage !== 'egg' && now - lastSeenAt >= WELCOME_BACK_HOURS * HOUR_MS;
  return { pet: next, firstVisitToday, welcomeBack };
}

/** Lv10 다음부터는 레벨마다 친밀도 80씩 더 (레벨은 끝없이 오른다) */
export const AFFECTION_STEP_AFTER_10 = 80;

/** 이 레벨이 되는 데 필요한 누적 친밀도 (Lv1 = 0) */
export function affectionForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= AFFECTION_THRESHOLDS.length + 1) return AFFECTION_THRESHOLDS[level - 2];
  const last = AFFECTION_THRESHOLDS[AFFECTION_THRESHOLDS.length - 1];
  return last + (level - (AFFECTION_THRESHOLDS.length + 1)) * AFFECTION_STEP_AFTER_10;
}

export function affectionLevel(affection: number): number {
  const base = 1 + AFFECTION_THRESHOLDS.filter((t) => affection >= t).length;
  if (base <= AFFECTION_THRESHOLDS.length) return base;
  return base + Math.floor((affection - AFFECTION_THRESHOLDS[AFFECTION_THRESHOLDS.length - 1]) / AFFECTION_STEP_AFTER_10);
}

/** 다음 레벨까지 진행률 0~1 */
export function affectionProgress(affection: number): number {
  const lv = affectionLevel(affection);
  const prev = affectionForLevel(lv);
  const next = affectionForLevel(lv + 1);
  return (affection - prev) / (next - prev);
}

export function addGrowthXp(pet: PetData, xp: number): PetData {
  return xp > 0 ? { ...pet, growthXp: pet.growthXp + xp } : pet;
}

export function addAffection(pet: PetData, amount: number): PetData {
  return { ...pet, affection: pet.affection + amount };
}

export function nextStage(stage: Stage): Stage | null {
  const i = STAGES.indexOf(stage);
  return i < STAGES.length - 1 ? STAGES[i + 1] : null;
}

export interface GrowthProgress {
  next: 'child' | 'adult' | null;
  level: { have: number; need: number };
}

/** 다음 진화까지 친밀도 레벨이 얼마나 남았나 */
export function growthProgress(pet: PetData): GrowthProgress {
  const next = pet.stage === 'baby' ? 'child' : pet.stage === 'child' ? 'adult' : null;
  return { next, level: { have: affectionLevel(pet.affection), need: next ? EVOLUTION_LEVELS[next] : 0 } };
}

/** 친밀도 레벨이 오르면 맞는 단계까지 자란다 (한 번에 두 단계도). 알은 부화로만 깨어나고, 자란 펫은 작아지지 않는다. */
export function checkEvolution(pet: PetData, now: number): { pet: PetData; evolvedTo: Stage | null } {
  let p = pet;
  let evolvedTo: Stage | null = null;
  for (let g = growthProgress(p); g.next && g.level.have >= g.level.need; g = growthProgress(p)) {
    evolvedTo = g.next;
    p = { ...p, stage: g.next, evolutionCards: [...p.evolutionCards, { stage: g.next, date: localDateString(now) }] };
  }
  return { pet: p, evolvedTo };
}

export function chooseEgg(pet: PetData, species: Species): PetData {
  return { ...pet, species };
}

/** 부화: 아기 단계 + 이름. 상태를 가득 채우고 기념 카드를 남긴다. lifeStart는 이 펫과 함께한 기록의 기준점. */
export function hatch(pet: PetData, name: string, now: number, lifeStart: LifeSnapshot | null = null): PetData {
  return {
    ...pet,
    lifeStart,
    hatchedAt: localDateString(now),
    stage: 'baby',
    name,
    fullness: 70,
    mood: 90,
    cleanliness: 90,
    statsUpdatedAt: now,
    lastVisitDate: localDateString(now),
    evolutionCards: [...pet.evolutionCards, { stage: 'baby', date: localDateString(now) }],
  };
}

export const NAME_MAX = 8;
const BLOCKED_WORDS = ['씨발', '시발', 'ㅅㅂ', '병신', 'ㅂㅅ', '개새', '좆', '존나', '닥쳐', '꺼져', '죽어', '미친'];

export type NameCheck = { ok: true; name: string } | { ok: false; reason: 'empty' | 'long' | 'blocked' };

/** 이름 검사: 앞뒤 공백 제거, 1~8자, 기본 금칙어 */
export function checkName(raw: string): NameCheck {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return { ok: false, reason: 'empty' };
  if ([...name].length > NAME_MAX) return { ok: false, reason: 'long' };
  const compact = name.replace(/\s/g, '');
  if (BLOCKED_WORDS.some((w) => compact.includes(w))) return { ok: false, reason: 'blocked' };
  return { ok: true, name };
}

/** 표정·대사를 고르기 위한 '가장 필요한 것' (없으면 null) */
export function neediest(pet: PetData): StatKey | null {
  const low = (['fullness', 'cleanliness', 'mood'] as StatKey[]).filter((k) => pet[k] < 50);
  if (low.length === 0) return null;
  return low.reduce((a, b) => (pet[a] <= pet[b] ? a : b));
}
