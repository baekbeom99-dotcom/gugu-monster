/** 저장 데이터 스키마 — 설계서 11-1 */
import { defaultCatalog } from '../data/defaultCatalog';
import { addMissingDefaults, CATALOG_PRICE_SCALE, scaleItemPrices } from '../domain/catalogRules';
import { type AdminData, initialAdmin } from '../domain/admin';
import type { PracticeData } from '../domain/arithPractice';
import type { DexEntry } from '../domain/dex';
import { initialPet, normalizeSpecies, type PetData } from '../domain/pet';
import type { CatalogData } from '../domain/shop';
import { type EconomyData, initialEconomy, initialLearning, type LearningData, repairChallengeUnlock } from '../domain/progress';

/**
 * 저장 형식 버전. 올릴 때는 useGameStore의 persist migrate가 옛 저장본을 그대로 넘겨
 * mergeSave가 새 칸만 채우게 한다 (migrate가 없으면 zustand가 옛 저장본을 버려 별이 사라진다).
 * 1 → 2: 셈 연습 기록(practice) 추가
 */
export const SCHEMA_VERSION = 2;
export const SAVE_KEY = 'gugu-monster:save';

export interface Settings {
  /** 효과음 — 기본 켬 */
  sound: boolean;
  /** 0~1 */
  volume: number;
  inputMode: 'auto' | 'choice';
}

export interface SaveData {
  schemaVersion: typeof SCHEMA_VERSION;
  createdAt: number;
  lastSeenAt: number;
  settings: Settings;
  learning: LearningData;
  economy: EconomyData;
  pet: PetData;
  /** 상점 아이템 목록 (관리자가 편집할 수 있다) */
  catalog: CatalogData;
  admin: AdminData;
  /** 펫 도감: 졸업했거나, 관리자가 새 펫을 시작했거나, 다른 펫과 자리를 바꿔 쉬는 펫들 */
  dex: DexEntry[];
  /** 셈 연습(덧셈·뺄셈·보수) 기록 — 구구단 학습 기록과 따로 둔다 */
  practice: PracticeData;
  /** 저장된 상점 가격에 적용된 배율 (없으면 1 = v1.19까지의 가격). 불러올 때 CATALOG_PRICE_SCALE로 맞춘다. */
  catalogPriceScale: number;
}

export function createInitialSave(now: number): SaveData {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    lastSeenAt: now,
    settings: { sound: true, volume: 0.7, inputMode: 'auto' },
    learning: initialLearning(),
    economy: initialEconomy(),
    pet: initialPet(now),
    catalog: defaultCatalog(),
    admin: initialAdmin(),
    dex: [],
    practice: {},
    catalogPriceScale: CATALOG_PRICE_SCALE,
  };
}

/**
 * 저장본을 기본값 위에 섹션 단위로 덮어쓴다.
 * 나중에 섹션에 필드가 추가돼도 옛 저장본에서 그 필드가 비지 않는다.
 */
export function mergeSave(initial: SaveData, persisted: unknown): SaveData {
  if (!persisted || typeof persisted !== 'object') return initial;
  const p = persisted as Partial<SaveData>;
  return {
    ...initial,
    ...p,
    schemaVersion: SCHEMA_VERSION,
    settings: { ...initial.settings, ...p.settings },
    // 조건을 채웠는데 닫혀 있던 12·13단 도전 모드는 불러올 때 연다
    learning: repairChallengeUnlock({
      ...initial.learning,
      ...p.learning,
      facts: { ...initial.learning.facts, ...p.learning?.facts },
      typeStats: { ...initial.learning.typeStats, ...p.learning?.typeStats },
    }),
    economy: { ...initial.economy, ...p.economy },
    // 예전 펫 종류(펭귄·공룡)는 새 종류로 이어받는다
    pet: { ...initial.pet, ...p.pet, species: p.pet?.species ? normalizeSpecies(p.pet.species) : initial.pet.species },
    // 저장된 상점은 그대로 두고, 가격은 한 번만 새 배율(2배)로 맞추고, 새 버전에서 늘어난 기본 아이템만 더한다
    catalog: p.catalog?.items?.length
      ? addMissingDefaults(
          { ...p.catalog, items: scaleItemPrices(p.catalog.items, CATALOG_PRICE_SCALE / (p.catalogPriceScale ?? 1)) },
          initial.catalog,
        )
      : initial.catalog,
    catalogPriceScale: CATALOG_PRICE_SCALE,
    admin: { ...initial.admin, ...p.admin },
    practice: p.practice && typeof p.practice === 'object' ? { ...initial.practice, ...p.practice } : initial.practice,
    dex: Array.isArray(p.dex) ? p.dex.map((e) => ({ ...e, species: normalizeSpecies(e.species) ?? 'cat', pet: e.pet && { ...e.pet, species: normalizeSpecies(e.pet.species) } })) : initial.dex,
  };
}

/**
 * persist migrate: 옛 버전 저장본을 지금 버전으로. 지금까지의 변경은 모두 칸을 더한 것뿐이라
 * 저장본을 그대로 돌려주고, 빠진 칸은 불러올 때 mergeSave가 기본값으로 채운다.
 * 별·펫·가방·구구단 기록은 손대지 않는다.
 */
export function migrateSave(persisted: unknown, _fromVersion: number): unknown {
  return persisted && typeof persisted === 'object' ? persisted : {};
}
