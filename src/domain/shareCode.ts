/**
 * 상점 설정 공유 — 설계서 10-4. 학생마다 자기 기기를 쓰므로, 한 기기에서 만든 상점 설정을
 * 파일이나 복사용 코드로 다른 기기에 옮긴다. 학습 기록·별·펫은 들어가지 않는다.
 */
import { CATALOG_PRICE_SCALE, scaleItemPrices, validateItem } from './catalogRules';
import type { CatalogData, ItemDef } from './shop';

export const SHOP_FORMAT = 'gugu-monster/shop';
export const CODE_PREFIX = 'GUGU1-';

interface ShopSettingsFile {
  format: typeof SHOP_FORMAT;
  /** 1: v1.19까지(가격 1배), 2: v1.20부터(가격 2배) */
  version: 1 | 2;
  exportedAt: string;
  items: ItemDef[];
}

/** 보상 모자는 기기마다 똑같으므로 빼고 내보낸다 */
export function exportShopSettings(catalog: CatalogData, now: number): ShopSettingsFile {
  return {
    format: SHOP_FORMAT,
    version: 2,
    exportedAt: new Date(now).toISOString(),
    items: catalog.items.filter((i) => i.source !== 'reward'),
  };
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): string {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeShopCode(file: ShopSettingsFile): string {
  return CODE_PREFIX + toBase64Url(JSON.stringify(file));
}

export interface ImportPreview {
  /** 그대로 적용할 수 있는 아이템 */
  valid: ItemDef[];
  /** 검사에 걸려 건너뛸 아이템 이름 */
  skipped: string[];
  added: number;
  priceChanged: number;
  saleChanged: number;
  otherChanged: number;
}

export type ParseResult = { ok: true; preview: ImportPreview } | { ok: false; error: string };

/** 파일 내용(JSON) 또는 복사 코드(GUGU1-…)를 읽어 무엇이 바뀌는지 미리 보여준다. 현재 설정은 건드리지 않는다. */
export function parseShopSettings(input: string, current: CatalogData): ParseResult {
  const text = input.trim();
  let data: unknown;
  try {
    data = JSON.parse(text.startsWith(CODE_PREFIX) ? fromBase64Url(text.slice(CODE_PREFIX.length)) : text);
  } catch {
    return { ok: false, error: '상점 설정 코드나 파일이 아니에요.' };
  }
  const file = data as Partial<ShopSettingsFile>;
  if (file?.format !== SHOP_FORMAT || !Array.isArray(file.items)) return { ok: false, error: '상점 설정 코드나 파일이 아니에요.' };

  const preview: ImportPreview = { valid: [], skipped: [], added: 0, priceChanged: 0, saleChanged: 0, otherChanged: 0 };
  // 예전 버전에서 만든 코드는 가격이 절반이라 지금 배율로 맞춘다
  const incoming = file.version === 2 ? file.items : scaleItemPrices(file.items as ItemDef[], CATALOG_PRICE_SCALE);
  for (const raw of incoming) {
    const item = raw as ItemDef;
    const mine = current.items.find((i) => i.id === item?.id);
    if (!item || typeof item.id !== 'string' || item.source === 'reward' || mine?.source === 'reward' || validateItem(item).length > 0) {
      preview.skipped.push(typeof item?.name === 'string' && item.name ? item.name : '(이름 없음)');
      continue;
    }
    preview.valid.push(item);
    if (!mine) preview.added += 1;
    else {
      if (mine.price !== item.price) preview.priceChanged += 1;
      if (mine.onSale !== item.onSale) preview.saleChanged += 1;
      const { price: _p, onSale: _s, ...a } = mine;
      const { price: _p2, onSale: _s2, ...b } = item;
      if (JSON.stringify(a) !== JSON.stringify(b)) preview.otherChanged += 1;
    }
  }
  if (preview.valid.length === 0) return { ok: false, error: '적용할 수 있는 아이템이 없어요.' };
  return { ok: true, preview };
}

/** 미리 본 아이템을 적용: 같은 ID는 바꾸고, 새 ID는 더한다. 여기에 없는 아이템은 그대로 둔다. */
export function applyShopSettings(current: CatalogData, valid: ItemDef[]): CatalogData {
  const incoming = new Map(valid.map((i) => [i.id, i]));
  const items = current.items.map((i) => incoming.get(i.id) ?? i);
  for (const item of valid) if (!current.items.some((i) => i.id === item.id)) items.push(item);
  return { ...current, version: current.version + 1, items };
}

// ── 전체 백업 (설계서 11-2) ─────────────────────

export const BACKUP_FORMAT = 'gugu-monster/backup';

export function exportBackup(save: object, now: number): string {
  return JSON.stringify({ format: BACKUP_FORMAT, exportedAt: new Date(now).toISOString(), save }, null, 1);
}

export interface BackupSummary {
  petName: string;
  stars: number;
  explorations: number;
  studyDays: number;
}

/** 백업 파일을 읽는다. 모양이 맞지 않으면 아무것도 바꾸지 않도록 오류를 돌려준다. */
export function parseBackup(text: string): { ok: true; save: Record<string, unknown>; summary: BackupSummary } | { ok: false; error: string } {
  let data: { format?: string; save?: Record<string, unknown> };
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: '백업 파일을 읽을 수 없어요.' };
  }
  const save = data?.save as
    | { learning?: { facts?: object; totalExplorations?: number; studyDays?: unknown[] }; economy?: { stars?: number }; pet?: { name?: string } }
    | undefined;
  if (data?.format !== BACKUP_FORMAT || !save?.learning?.facts || typeof save.economy?.stars !== 'number') {
    return { ok: false, error: '구구단 몬스터 탐험대 백업 파일이 아니에요.' };
  }
  return {
    ok: true,
    save: save as Record<string, unknown>,
    summary: {
      petName: save.pet?.name || '(아직 없음)',
      stars: save.economy.stars,
      explorations: save.learning.totalExplorations ?? 0,
      studyDays: save.learning.studyDays?.length ?? 0,
    },
  };
}
