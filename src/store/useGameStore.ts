import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { defaultCatalog } from '../data/defaultCatalog';
import type { ArithKind } from '../domain/arith';
import { finishPractice, type PracticeRecord, recordPracticeAnswer } from '../domain/arithPractice';
import type { Dan } from '../domain/facts';
import type { AdminData } from '../domain/admin';
import { addMissingDefaults, deleteItem, moveItem, restoreDefaults, setOnSale, upsertItem } from '../domain/catalogRules';
import { canGraduate, type DexEntry, lifeSnapshot, sendToDex, type SwapResult, swapWithDex } from '../domain/dex';
import { STAR_REWARDS, TROUBLE_PRICE } from '../domain/economy';
import { finishStairs, type StairsRecord, stairsAffection } from '../domain/stairs';
import {
  addAffection,
  addGrowthXp,
  affectionLevel,
  type CareAction,
  applyDecay,
  checkEvolution,
  chooseEgg,
  cleanPoop,
  doCare,
  equipHat,
  EXPLORATION_AFFECTION,
  giveShot,
  hatch,
  type PetData,
  rollFoodPoisoning,
  rollTrouble,
  type Species,
  type Stage,
  type TroubleEvent,
  visit,
  wake,
} from '../domain/pet';
import {
  type AnswerInput,
  addStars,
  captureStars,
  finishDanTrial,
  finishExploration,
  type FinishOutcome,
  type TrialOutcome,
  recordAnswer,
} from '../domain/progress';
import { applyItem, buy, type CatalogData, canWearHat, findItem, grantMasterHats, type ItemCategory, type ItemDef, type ItemId } from '../domain/shop';
import { createInitialSave, mergeSave, migrateSave, SAVE_KEY, type SaveData, SCHEMA_VERSION, type Settings } from './saveData';

export interface PetChange {
  evolvedTo: Stage | null;
  /** 친밀도 레벨이 올랐으면 새 레벨 */
  levelUp: number | null;
}

/** 탐험을 마친 뒤 펫에게 생긴 일 (25% 똥, 10% 병) */
export type ExplorationOutcome = FinishOutcome & PetChange & { grantedHats: ItemId[]; troubles: TroubleEvent[] };

/** 밥·먹이를 먹고 5% 확률로 식중독에 걸렸는가 */
export type FeedChange = PetChange & { poisoned: boolean };

export type PracticeOutcome = PetChange & {
  stars: number;
  xp: number;
  newBest: boolean;
  record: PracticeRecord;
  mistakes: number | null;
  justMastered: boolean;
  bonus: number;
};

interface GameActions {
  updateSettings: (patch: Partial<Settings>) => void;
  /** 앱을 열 때: 펫 상태 감소·하루 첫 방문·오랜만의 방문 */
  openApp: (now: number) => { welcomeBack: boolean; troubles: TroubleEvent[] };
  /** 답 하나를 즉시 저장. 이번 답으로 얻은 별·XP와 극복 여부를 돌려준다. */
  recordAnswer: (input: AnswerInput) => { stars: number; baseStars: number; xp: number; overcome: boolean };
  recordCapture: (golden: boolean) => number;
  finishExploration: (completed: boolean, now: number) => ExplorationOutcome;
  /** 단 도전을 끝까지 마쳤을 때: 기록·MASTER·보너스 */
  finishDanTrial: (dan: Dan, timeMs: number, mistakes: number, now: number) => TrialOutcome;
  /** 셈 연습 답 하나: 별·XP·셈 연습 기록 (구구단 기록은 건드리지 않는다) */
  /** speedMs: 추천 탐험에 섞여 나온 셈 문제는 빠를수록 별을 더 준다 */
  recordPracticeAnswer: (kind: ArithKind, correct: boolean, now: number, speedMs?: number) => { stars: number; xp: number };
  /** 셈 연습을 끝까지 마쳤을 때: 완료 별·최고 기록·펫 친밀도 */
  finishPractice: (kind: ArithKind, timeMs: number, mistakes: number, now: number) => PracticeOutcome;
  /** 무한의 계단 한 판이 끝났을 때: 오른 계단만큼 별, 최고 기록 */
  finishStairs: (steps: number, now: number, challenges?: number) => { stars: number; newBest: boolean; record: StairsRecord; affection: number } & PetChange;
  /** 무한의 계단에 12·13단을 넣을지 */
  setStairsChallenge: (include: boolean) => void;
  chooseEgg: (species: Species) => void;
  hatchPet: (name: string, now: number) => void;
  care: (action: CareAction, now: number) => ({ ok: true } & FeedChange) | { ok: false; reason: string };
  /** 똥 치우기 (별 50개) */
  cleanPoop: (now: number) => ({ ok: true } & PetChange) | { ok: false; reason: string; need?: number };
  /** 주사 맞히기 (별 50개, 병이 낫는다) */
  giveShot: (now: number) => ({ ok: true } & PetChange) | { ok: false; reason: string; need?: number };
  wakePet: () => void;
  buyItem: (id: ItemId) => { ok: true } | { ok: false; reason: string; need?: number };
  /** 먹이·위생용품·장난감을 펫에게 쓴다 */
  giveItem: (id: ItemId, now: number) => ({ ok: true } & FeedChange) | { ok: false; reason: string };
  wearHat: (id: ItemId | null) => boolean;
  /** 친밀도 Lv10(아직 졸업 전)이면 도감에 넣고 새 알로. 넣은 기록을 돌려준다. */
  graduatePet: (now: number) => DexEntry | null;
  /** 도감의 펫과 자리 바꾸기: 지금 펫은 도감에서 쉬고 고른 펫과 다시 함께한다 */
  swapPet: (entryId: string, now: number) => SwapResult;

  // ── 관리자 모드 ──
  setAdmin: (admin: AdminData) => void;
  saveItem: (item: ItemDef) => { ok: true } | { ok: false; errors: string[] };
  setItemOnSale: (id: ItemId, onSale: boolean) => void;
  moveCatalogItem: (id: ItemId, dir: -1 | 1) => void;
  deleteCatalogItem: (id: ItemId) => void;
  restoreCatalog: (category?: ItemCategory) => void;
  replaceCatalog: (catalog: CatalogData) => void;
  /** 12·13단 도전 모드를 관리자가 열고 닫는다 (단 마스터로 열린 것은 닫지 않는다) */
  setChallengeByAdmin: (unlocked: boolean) => void;
  /** 백업 불러오기: 저장 데이터 전체를 바꾼다 (관리자 PIN은 이 기기 것을 유지) */
  replaceSave: (save: unknown) => void;
  /** 전체 초기화 */
  resetAll: () => void;
  /** 관리자: 지금 펫을 도감에 넣고 새 알을 고르게 한다 (학습 기록·별·가방은 그대로) */
  startNewPetByAdmin: (now: number) => DexEntry | null;
}

export type GameStore = SaveData & GameActions;

/**
 * localStorage가 막혀 있어도(사생활 보호 모드 등) 앱이 멈추지 않도록 감싼다.
 * 쓰기 전에 직전 정상본을 .bak으로 남긴다 (설계서 11-2).
 */
const safeStorage = {
  getItem: (name: string) => {
    try {
      return localStorage.getItem(name) ?? localStorage.getItem(`${name}.bak`);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      const prev = localStorage.getItem(name);
      if (prev) localStorage.setItem(`${name}.bak`, prev);
      localStorage.setItem(name, value);
    } catch {
      /* 저장 실패는 다음 저장 때 다시 시도된다 */
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* 무시 */
    }
  },
};

/** 똥·병·식중독 주사위. E2E 테스트는 window.__GUGU_E2E_CALM__ = true 로 꺼서 결과가 흔들리지 않게 한다. */
const troubleRng = () => ((globalThis as { __GUGU_E2E_CALM__?: boolean }).__GUGU_E2E_CALM__ ? 1 : Math.random());

/** 펫 변화 후 진화·친밀도 레벨업을 판정한다 (알은 부화로만 깨어난다). */
function settlePet(before: PetData, after: PetData, now: number): { pet: PetData } & PetChange {
  const evo =
    after.stage === 'egg' ? { pet: after, evolvedTo: null } : checkEvolution(after, now);
  const lvBefore = affectionLevel(before.affection);
  const lvAfter = affectionLevel(evo.pet.affection);
  return { pet: evo.pet, evolvedTo: evo.evolvedTo, levelUp: before.stage !== 'egg' && lvAfter > lvBefore ? lvAfter : null };
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...createInitialSave(Date.now()),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      openApp: (now) => {
        const { pet, lastSeenAt } = get();
        const v = visit(pet, lastSeenAt, now, troubleRng);
        set({ pet: v.pet, lastSeenAt: now });
        return { welcomeBack: v.welcomeBack, troubles: v.troubles };
      },
      recordAnswer: (input) => {
        const s = get();
        const r = recordAnswer(s.learning, s.economy, input);
        set({ learning: r.learning, economy: r.economy, pet: addGrowthXp(s.pet, r.xp), lastSeenAt: input.now });
        return { stars: r.stars, baseStars: r.baseStars, xp: r.xp, overcome: r.overcome };
      },
      recordCapture: (golden) => {
        const stars = captureStars(golden);
        set((s) => ({ economy: addStars(s.economy, stars) }));
        return stars;
      },
      finishExploration: (completed, now) => {
        const s = get();
        const r = finishExploration(s.learning, s.economy, { completed, now });
        // 단 마스터 보상 모자
        const hats = grantMasterHats(r.economy, s.catalog, r.newlyMastered);
        let pet = addGrowthXp(s.pet, r.xp);
        if (completed && pet.stage !== 'egg') pet = addAffection(pet, EXPLORATION_AFFECTION);
        const settled = settlePet(s.pet, pet, now);
        // 끝까지 마친 탐험 뒤에는 25% 똥, 10% 병
        const trouble = completed ? rollTrouble(settled.pet, now, 'exploration', troubleRng) : { pet: settled.pet, events: [] };
        set({ learning: r.learning, economy: hats.economy, pet: trouble.pet, lastSeenAt: now });
        return {
          ...r,
          economy: hats.economy,
          evolvedTo: settled.evolvedTo,
          levelUp: settled.levelUp,
          grantedHats: hats.granted,
          troubles: trouble.events,
        };
      },
      finishDanTrial: (dan, timeMs, mistakes, now) => {
        const s = get();
        const r = finishDanTrial(s.learning, s.economy, { dan, timeMs, mistakes, now });
        set({ learning: r.learning, economy: r.economy });
        return r;
      },
      recordPracticeAnswer: (kind, correct, now, speedMs) => {
        const s = get();
        const r = recordPracticeAnswer(s.practice, s.economy, kind, correct, speedMs);
        set({ practice: r.practice, economy: r.economy, pet: addGrowthXp(s.pet, r.xp), lastSeenAt: now });
        return { stars: r.stars, xp: r.xp };
      },
      finishPractice: (kind, timeMs, mistakes, now) => {
        const s = get();
        const r = finishPractice(s.practice, s.economy, kind, timeMs, { mistakes, now });
        let pet = addGrowthXp(s.pet, r.xp);
        if (pet.stage !== 'egg') pet = addAffection(pet, EXPLORATION_AFFECTION);
        const settled = settlePet(s.pet, pet, now);
        set({ practice: r.practice, economy: r.economy, pet: settled.pet, lastSeenAt: now });
        return {
          stars: r.stars,
          xp: r.xp,
          newBest: r.newBest,
          record: r.record,
          mistakes: r.mistakes,
          justMastered: r.justMastered,
          bonus: r.bonus,
          evolvedTo: settled.evolvedTo,
          levelUp: settled.levelUp,
        };
      },
      finishStairs: (steps, now, challenges = 0) => {
        const s = get();
        const r = finishStairs(s.stairs, s.economy, steps, now, challenges);
        // 10층을 지날 때마다 친밀도 +3 (알은 아직 친밀도가 없다)
        const affection = s.pet.stage === 'egg' ? 0 : stairsAffection(steps, challenges);
        const settled = settlePet(s.pet, affection > 0 ? addAffection(s.pet, affection) : s.pet, now);
        set({ stairs: r.record, economy: r.economy, pet: settled.pet, lastSeenAt: now });
        return { stars: r.stars, newBest: r.newBest, record: r.record, affection, evolvedTo: settled.evolvedTo, levelUp: settled.levelUp };
      },
      setStairsChallenge: (include) => set((s) => ({ stairs: { ...s.stairs, includeChallenge: include } })),
      chooseEgg: (species) => set((s) => ({ pet: chooseEgg(s.pet, species) })),
      hatchPet: (name, now) =>
        set((s) => ({
          pet: hatch(s.pet, name, now, lifeSnapshot(s.learning)),
          economy: addStars(s.economy, STAR_REWARDS.startGift),
        })),
      graduatePet: (now) => {
        const s = get();
        const pet = applyDecay(s.pet, now);
        if (!canGraduate(pet)) return null;
        const r = sendToDex(pet, s.learning, now, 'graduated');
        set({ pet: r.nextPet, dex: r.entry ? [...s.dex, r.entry] : s.dex });
        return r.entry;
      },
      care: (action, now) => {
        const s = get();
        const r = doCare(s.pet, action, now);
        if (!r.ok) return r;
        const settled = settlePet(s.pet, r.pet, now);
        // 밥을 먹으면 5% 식중독
        const food = action === 'feed' ? rollFoodPoisoning(settled.pet, now, troubleRng) : { pet: settled.pet, poisoned: false };
        set({ pet: food.pet, lastSeenAt: now });
        return { ok: true, evolvedTo: settled.evolvedTo, levelUp: settled.levelUp, poisoned: food.poisoned };
      },
      cleanPoop: (now) => {
        const s = get();
        const r = cleanPoop(s.pet, now);
        if (!r.ok) return r;
        if (s.economy.stars < TROUBLE_PRICE.clean) return { ok: false, reason: 'stars', need: TROUBLE_PRICE.clean - s.economy.stars };
        const settled = settlePet(s.pet, r.pet, now);
        set({ pet: settled.pet, economy: { ...s.economy, stars: s.economy.stars - TROUBLE_PRICE.clean }, lastSeenAt: now });
        return { ok: true, evolvedTo: settled.evolvedTo, levelUp: settled.levelUp };
      },
      giveShot: (now) => {
        const s = get();
        const r = giveShot(s.pet, now);
        if (!r.ok) return r;
        if (s.economy.stars < TROUBLE_PRICE.shot) return { ok: false, reason: 'stars', need: TROUBLE_PRICE.shot - s.economy.stars };
        const settled = settlePet(s.pet, r.pet, now);
        set({ pet: settled.pet, economy: { ...s.economy, stars: s.economy.stars - TROUBLE_PRICE.shot }, lastSeenAt: now });
        return { ok: true, evolvedTo: settled.evolvedTo, levelUp: settled.levelUp };
      },
      wakePet: () => set((s) => ({ pet: wake(s.pet) })),
      buyItem: (id) => {
        const s = get();
        const item = findItem(s.catalog, id);
        if (!item) return { ok: false, reason: 'missing' };
        const r = buy(s.economy, item);
        if (!r.ok) return r;
        set({ economy: r.economy });
        return { ok: true };
      },
      giveItem: (id, now) => {
        const s = get();
        const item = findItem(s.catalog, id);
        if (!item) return { ok: false, reason: 'missing' };
        const r = applyItem(s.pet, s.economy, item, now);
        if (!r.ok) return r;
        const settled = settlePet(s.pet, r.pet, now);
        // 먹이를 먹으면 5% 식중독
        const food = item.category === 'food' ? rollFoodPoisoning(settled.pet, now, troubleRng) : { pet: settled.pet, poisoned: false };
        set({ pet: food.pet, economy: r.economy, lastSeenAt: now });
        return { ok: true, evolvedTo: settled.evolvedTo, levelUp: settled.levelUp, poisoned: food.poisoned };
      },
      setAdmin: (admin) => set({ admin }),
      saveItem: (item) => {
        const r = upsertItem(get().catalog, item);
        if (!r.ok) return r;
        set({ catalog: r.catalog });
        return { ok: true };
      },
      setItemOnSale: (id, onSale) => set((s) => ({ catalog: setOnSale(s.catalog, id, onSale) })),
      moveCatalogItem: (id, dir) => set((s) => ({ catalog: moveItem(s.catalog, id, dir) })),
      deleteCatalogItem: (id) => set((s) => ({ catalog: deleteItem(s.catalog, s.economy, id) })),
      restoreCatalog: (category) => set((s) => ({ catalog: restoreDefaults(s.catalog, defaultCatalog(), category) })),
      // 예전 버전에서 만든 공유 코드여도 새 기본 아이템은 빠지지 않게
      replaceCatalog: (catalog) => set({ catalog: addMissingDefaults(catalog, defaultCatalog()) }),
      setChallengeByAdmin: (unlocked) =>
        set((s) => {
          if (s.learning.challengeUnlockedBy === 'mastery') return {};
          return { learning: { ...s.learning, challengeUnlocked: unlocked, challengeUnlockedBy: unlocked ? 'admin' : null } };
        }),
      replaceSave: (save) =>
        set((s) => {
          const merged = mergeSave(createInitialSave(Date.now()), save);
          return { ...merged, admin: s.admin, lastSeenAt: Date.now() };
        }),
      resetAll: () => set({ ...createInitialSave(Date.now()) }),
      swapPet: (entryId, now) => {
        const s = get();
        const r = swapWithDex(applyDecay(s.pet, now), s.dex, entryId, s.learning, now);
        if (r.ok) set({ pet: r.pet, dex: r.dex });
        return r;
      },
      startNewPetByAdmin: (now) => {
        const s = get();
        const r = sendToDex(applyDecay(s.pet, now), s.learning, now, 'admin');
        set({ pet: r.nextPet, dex: r.entry ? [...s.dex, r.entry] : s.dex });
        return r.entry;
      },
      wearHat: (id) => {
        const s = get();
        if (!canWearHat(s.economy, s.catalog, id)) return false;
        set({ pet: equipHat(s.pet, id) });
        return true;
      },
    }),
    {
      name: SAVE_KEY,
      version: SCHEMA_VERSION,
      migrate: (persisted, version) => migrateSave(persisted, version) as SaveData,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s): SaveData => ({
        schemaVersion: s.schemaVersion,
        createdAt: s.createdAt,
        lastSeenAt: s.lastSeenAt,
        settings: s.settings,
        learning: s.learning,
        economy: s.economy,
        pet: s.pet,
        catalog: s.catalog,
        admin: s.admin,
        dex: s.dex,
        practice: s.practice,
        catalogPriceScale: s.catalogPriceScale,
        stairs: s.stairs,
      }),
      merge: (persisted, current) => ({ ...current, ...mergeSave(createInitialSave(current.createdAt), persisted) }),
    },
  ),
);

if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
  void navigator.storage.persist().catch(() => undefined);
}
