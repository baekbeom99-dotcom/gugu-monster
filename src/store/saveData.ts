/** 저장 데이터 스키마 — 설계서 11-1 */
import { defaultCatalog } from '../data/defaultCatalog';
import { type AdminData, initialAdmin } from '../domain/admin';
import type { DexEntry } from '../domain/dex';
import { initialPet, normalizeSpecies, type PetData } from '../domain/pet';
import type { CatalogData } from '../domain/shop';
import { type EconomyData, initialEconomy, initialLearning, type LearningData, repairChallengeUnlock } from '../domain/progress';

export const SCHEMA_VERSION = 1;
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
    catalog: p.catalog?.items?.length ? p.catalog : initial.catalog,
    admin: { ...initial.admin, ...p.admin },
    dex: Array.isArray(p.dex) ? p.dex.map((e) => ({ ...e, species: normalizeSpecies(e.species) ?? 'cat', pet: e.pet && { ...e.pet, species: normalizeSpecies(e.pet.species) } })) : initial.dex,
  };
}
