/** 마을 서식지에서 잡은 구구몬이 돌아다니는 규칙 (화면 없음) */
import { type Rng, pickOne, randomInt, weightedPick } from '../random';
import { type SpeciesId, speciesDef } from './creatures';
import type { FieldId } from './fields';
import { DIR_DELTA, type Dir, type FieldMap, type Pos } from './movement';
import { ROAM_IDLE_MAX_MS, ROAM_IDLE_MIN_MS, ROAM_JUMP_MS, ROAM_MOVE_MS, ROAM_SLEEP_MS, ROAM_WEIGHTS } from './tuning';

export type RoamMotion = 'idle' | 'move' | 'jump' | 'sleep';

export interface Roamer {
  species: SpeciesId;
  x: number;
  y: number;
  /** 걷는 중이면 떠난 칸 */
  fromX: number;
  fromY: number;
  facing: Dir;
  motion: RoamMotion;
  since: number;
  until: number;
  fainted: boolean;
}

const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];

/** 노는 서식지: 레전드는 기본 종의 필드 */
export function habitatOf(id: SpeciesId): FieldId {
  const def = speciesDef(id);
  return def.field === 'legend' ? (speciesDef(def.kind).field as FieldId) : def.field;
}

const idleMs = (rng: Rng) => randomInt(rng, ROAM_IDLE_MIN_MS, ROAM_IDLE_MAX_MS);

function make(species: SpeciesId, p: Pos, motion: RoamMotion, now: number, until: number, fainted: boolean, facing: Dir = 'down'): Roamer {
  return { species, x: p.x, y: p.y, fromX: p.x, fromY: p.y, facing, motion, since: now, until, fainted };
}

/** 종마다 한 마리, 자기 서식지 칸 중 서로 겹치지 않는 칸에 세운다 (서식지에 빈 칸이 없으면 그 종은 빠진다) */
export function createRoamers(map: FieldMap, list: { species: SpeciesId; fainted: boolean }[], rng: Rng, now: number): Roamer[] {
  const taken = new Set<string>();
  const out: Roamer[] = [];
  for (const { species, fainted } of list) {
    const free = (map.zones[habitatOf(species)] ?? []).filter((p) => !taken.has(`${p.x},${p.y}`));
    if (free.length === 0) continue;
    const p = pickOne(rng, free);
    taken.add(`${p.x},${p.y}`);
    out.push(fainted ? make(species, p, 'sleep', now, now + ROAM_SLEEP_MS, true) : make(species, p, 'idle', now, now + idleMs(rng), false));
  }
  return out;
}

/** 시간이 지났으면 다음 모션을 고른다. 쓰러진 종은 계속 잔다. */
export function stepRoamer(r: Roamer, now: number, rng: Rng, canStand: (p: Pos) => boolean): Roamer {
  if (now < r.until) return r;
  const here = { x: r.x, y: r.y };
  if (r.fainted) return make(r.species, here, 'sleep', now, now + ROAM_SLEEP_MS, true, r.facing);
  const motion = weightedPick(rng, ['move', 'idle', 'jump', 'sleep'] as const, (m) => ROAM_WEIGHTS[m]) ?? 'idle';
  if (motion === 'move') {
    const open = DIRS.filter((d) => canStand({ x: r.x + DIR_DELTA[d].x, y: r.y + DIR_DELTA[d].y }));
    if (open.length > 0) {
      const d = pickOne(rng, open);
      return { ...r, x: r.x + DIR_DELTA[d].x, y: r.y + DIR_DELTA[d].y, fromX: r.x, fromY: r.y, facing: d, motion: 'move', since: now, until: now + ROAM_MOVE_MS };
    }
    return make(r.species, here, 'idle', now, now + idleMs(rng), false, r.facing);
  }
  if (motion === 'jump') return make(r.species, here, 'jump', now, now + ROAM_JUMP_MS, false, r.facing);
  if (motion === 'sleep') return make(r.species, here, 'sleep', now, now + ROAM_SLEEP_MS, false, r.facing);
  return make(r.species, here, 'idle', now, now + idleMs(rng), false, r.facing);
}

/** 부딪히거나 탭하면 깨어나 점프한다. 쓰러졌으면 계속 잔다. */
export function pokeRoamer(r: Roamer, now: number): Roamer {
  if (r.fainted) return r;
  return make(r.species, { x: r.x, y: r.y }, 'jump', now, now + ROAM_JUMP_MS, false, r.facing);
}
