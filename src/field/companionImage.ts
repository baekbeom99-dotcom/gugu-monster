/** 동행 그림을 작은 이미지로 한 번 구워 캔버스에 그린다 (SVG → data URL → Image) */
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { SpeciesId } from '../domain/field/creatures';
import { MonsterSprite } from '../art/MonsterSprite';
import { speciesDef } from '../domain/field/creatures';
import { speciesColor } from './creatureSprite';

const cache = new Map<string, HTMLImageElement>();

/** 구운 이미지를 돌려준다. 아직 읽는 중이어도 이미지를 돌려주고, 다 읽기 전에는 그리지 않는 쪽이 알아서 건너뛴다 */
export function companionImage(id: SpeciesId, size = 96): HTMLImageElement | null {
  const key = `${id}:${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const def = speciesDef(id);
    const host = document.createElement('div');
    const root = createRoot(host);
    flushSync(() => {
      root.render(createElement(MonsterSprite, { kind: def.kind, color: speciesColor(id), golden: def.legend, mood: 'idle', size }));
    });
    const svg = host.innerHTML;
    root.unmount();
    if (!svg.startsWith('<svg')) return null;
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    cache.set(key, img);
    return img;
  } catch {
    return null;
  }
}
