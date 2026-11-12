/** 동행 그림을 작은 이미지로 한 번 구워 캔버스에 그린다 (이미지 그림은 그대로, 몬스터 SVG는 SVG → data URL → Image) */
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { MonsterSprite } from '../../art/MonsterSprite';
import type { SpeciesId } from '../../domain/field/creatures';
import { creatureArt } from './creatureArt';
import { speciesColor } from './creatureSprite';

const cache = new Map<string, HTMLImageElement>();

/**
 * 구운 이미지를 돌려준다. 아직 읽는 중이어도 이미지를 돌려주고, 다 읽기 전에는 그리지 않는 쪽이 알아서 건너뛴다.
 * 주의: React가 그리는 중(컴포넌트 본문·useEffect 안)에 부르면 몬스터 SVG를 굽지 못해 null — rAF·setTimeout 안에서 부른다.
 */
/** mood: 'sleep'이면 눈 감은 얼굴로 구운 그림(이미지 그림 종은 mood 없이 같은 그림) */
export function companionImage(id: SpeciesId, size = 96, mood: 'idle' | 'sleep' = 'idle'): HTMLImageElement | null {
  const key = `${id}:${size}:${mood}`;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const art = creatureArt(id);
    let src: string;
    if (art.type === 'image') src = art.front;
    else {
      const host = document.createElement('div');
      const root = createRoot(host);
      flushSync(() => {
        root.render(createElement(MonsterSprite, { kind: art.kind, color: speciesColor(id), golden: art.golden, mood, size }));
      });
      const svg = host.innerHTML;
      root.unmount();
      if (!svg.startsWith('<svg')) return null;
      src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }
    const img = new Image();
    img.src = src;
    cache.set(key, img);
    return img;
  } catch {
    return null;
  }
}
