import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { defaultCatalog } from '../data/defaultCatalog';
import type { Dan } from '../domain/facts';
import type { AdminData } from '../domain/admin';
import { deleteItem, moveItem, restoreDefaults, setOnSale, upsertItem } from '../domain/catalogRules';
import { canGraduate, type DexEntry, lifeSnapshot, sendToDex, type SwapResult, swapWithDex } from '../domain/dex';
import { STAR_REWARDS } from '../domain/economy';
import {
  addAffection,
  addGrowthXp,
  affectionLevel,
  type CareAction,
  applyDecay,
  checkEvolution,
  chooseEgg,
  doCare,
  equipHat,
  EXPLORATION_AFFECTION,
  hatch,
  type PetData,
  type Species,
  type Stage,
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
import { createInitialSave, mergeSave, SAVE_KEY, type SaveData, SCHEMA_VERSION, type Settings } from './saveData';

export interface PetChange {
  evolvedTo: Stage | null;
  /** 친밀도 레벨이 올랐으면 새 레벨 */
  levelUp: number | null;
}

export type ExplorationOutcome = FinishOutcome & PetChange & { grantedHats: ItemId[] };

interface GameActions {
  updateSettings: (patch: Partial<Settings>) => void;
  /** 앱을 열 때: 펫 상태 감소·하루 첫 방문·오랜만의 방문 */
  openApp: (now: number) => { welcomeBack: boolean };
  /** 답 하나를 즉시 저장. 이번 답으로 얻은 별·XP와 극복 여부를 돌려준다. */
  recordAnswer: (input: AnswerInput) => { stars: number; xp: number; overcome: boolean };
  recordCapture: (golden: boolean) => number;
  finishExploration: (completed: boolean, now: number) => ExplorationOutcome;
  /** 단 도전을 끝까지 마쳤을 때: 기록·MASTER·보너스 */
  finishDanTrial: (dan: Dan, timeMs: number, mistakes: number, now: number) => TrialOutcome;
  chooseEgg: (species: Species) => void;
  hatchPet: (name: string, now: number) => void;
  care: (action: CareAction, now: number) => ({ ok: true } & PetChange) | { ok: false; reason: string };
  wakePet: () => void;
  buyItem: (id: ItemId) => { ok: true } | { ok: false; reason: string; need?: number };
  /** 먹이·위생용품·장난감을 펫에게 쓴다 */
  giveItem: (id: ItemId, now: number) => ({ ok: true } & PetChange) | { ok: false; reason: string };
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
        const v = visit(pet, lastSeenAt, now);
        set({ pet: v.pet, lastSeenAt: now });
        return { welcomeBack: v.welcomeBack };
      },
      recordAnswer: (input) => {
        const s = get();
        const r = recordAnswer(s.learning, s.economy, input);
        set({ learning: r.learning, economy: r.economy, pet: addGrowthXp(s.pet, r.xp), lastSeenAt: input.now });
        return { stars: r.stars, xp: r.xp, overcome: r.overcome };
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
        set({ learning: r.learning, economy: hats.economy, pet: settled.pet, lastSeenAt: now });
        return { ...r, economy: hats.economy, evolvedTo: settled.evolvedTo, levelUp: settled.levelUp, grantedHats: hats.granted };
      },
      finishDanTrial: (dan, timeMs, mistakes, now) => {
        const s = get();
        const r = finishDanTrial(s.learning, s.economy, { dan, timeMs, mistakes, now });
        set({ learning: r.learning, economy: r.economy });
        return r;
      },
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
        set({ pet: settled.pet, lastSeenAt: now });
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
        set({ pet: settled.pet, economy: r.economy, lastSeenAt: now });
        return { ok: true, evolvedTo: settled.evolvedTo, levelUp: settled.levelUp };
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
      replaceCatalog: (catalog) => set({ catalog }),
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
      }),
      merge: (persisted, current) => ({ ...current, ...mergeSave(createInitialSave(current.createdAt), persisted) }),
    },
  ),
);

if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
  void navigator.storage.persist().catch(() => undefined);
}
