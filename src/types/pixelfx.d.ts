// pixelfx(MIT)는 타입 없는 JS라서, 우리가 쓰는 만큼만 적어 둔다
declare module 'pixelfx' {
  export interface Frame {
    w: number;
    h: number;
    ox: number;
    oy: number;
    color: Uint32Array;
    light: Uint32Array;
  }
  export interface FxModule {
    meta?: { duration?: number; loop?: boolean; [k: string]: unknown };
    create?: (o: Record<string, unknown>) => unknown;
  }
  export interface FxInstance {
    readonly t: number;
    update(dt: number): void;
    draw(frame: Frame, layer?: 'back' | 'front'): void;
    stop(): void;
    done(): boolean;
  }
  export function createFrame(w: number, h: number, ox?: number, oy?: number): Frame;
  export function clearFrame(f: Frame): Frame;
  export function createFx(mod: FxModule, o?: Record<string, unknown>): FxInstance;
  export function composite(f: Frame, out: Uint8ClampedArray, bg?: number | Uint32Array | null, lightK?: number): void;
}

declare module 'pixelfx/fx/*' {
  export const meta: { duration?: number; loop?: boolean; [k: string]: unknown };
  export function create(o: Record<string, unknown>): unknown;
}
