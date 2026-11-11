/**
 * 개발 전용 필드 모험 검수 화면 (#/dev/field) — 배포 빌드에는 라우트가 없다.
 * 그림 교체·효과 추가·수치 조정을 한 뒤 여기서 바로 본다: 구구몬 그림(앞·뒤·진화·동행), 주인공 네 방향, 효과, 디버그 스위치.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DAN_COLORS } from '../art/colors';
import type { MonsterMood } from '../art/MonsterSprite';
import { SPECIES } from '../domain/field/creatures';
import { displayName } from '../domain/field/growth';
import { companionImage } from './art/companionImage';
import { creatureArt } from './art/creatureArt';
import { creatureSprite, speciesColor } from './art/creatureSprite';
import { CapsuleBall } from './art/CapsuleBall';
import { CAPSULE_NAMES, CAPSULE_TYPES } from '../domain/field/capsules';
import { HERO_DIRS, HERO_SPRITES } from './art/hero';
import { PixelSprite } from './art/PixelSprite';
import { debugFlags, setDebugFlag } from './debugFlags';
import { ELEMENT_FX, ELEMENT_NAMES, type Element } from '../domain/field/elements';
import { EFFECTS, type FxName, type FxSpec } from './fx/effects';
import { playFx } from './fx/playFx';

const MOODS: MonsterMood[] = ['idle', 'hit', 'happy', 'sleep'];
const STAGES = [1, 2, 3] as const;
const row = { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' } as const;
const box = { background: '#f3f0e8', borderRadius: 8, padding: 8 } as const;

function DebugSwitches() {
  const [flags, setFlags] = useState(debugFlags);
  const toggle = (name: 'encounter' | 'path' | 'legend') => {
    setDebugFlag(name, !flags[name]);
    setFlags(debugFlags());
  };
  return (
    <section>
      <h2>디버그 스위치 (새로고침하면 꺼짐)</h2>
      <label style={{ display: 'block' }}>
        <input type="checkbox" checked={flags.encounter} onChange={() => toggle('encounter')} /> 풀숲 걸음마다 만남 · 캡슐 100%
      </label>
      <label style={{ display: 'block' }}>
        <input type="checkbox" checked={flags.path} onChange={() => toggle('path')} /> 길 걸음마다 만남 100%
      </label>
      <label style={{ display: 'block' }}>
        <input type="checkbox" checked={flags.legend} onChange={() => toggle('legend')} /> 만남이 레전드 (12단이 열려 있을 때)
      </label>
      <p>
        <Link to="/field">필드로 가기</Link> · <Link to="/">처음 화면</Link>
      </p>
    </section>
  );
}

function EffectButtons() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gold, setGold] = useState(false);
  const [mirror, setMirror] = useState(false);
  const play = (name: FxName) => {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    const r = c.getBoundingClientRect();
    const spec: FxSpec = EFFECTS[name];
    const anchor = spec.anchor ?? 'ground';
    void playFx(c, name, { x: r.width / 2, y: r.height * (anchor === 'center' ? 0.45 : 0.6) }, { gold, mirror });
  };
  const button = (n: FxName) => (
    <button key={n} type="button" className="btn btn--ghost" onClick={() => play(n)} title={EFFECTS[n].note}>
      {n}
    </button>
  );
  return (
    <section>
      <h2>효과 (fx/effects.ts) — 동작 줄이기를 켠 기기에서는 안 보임</h2>
      <div style={row}>
        {(['enter', 'hit', 'catch'] as const).map(button)}
      </div>
      <label style={{ display: 'block' }}>
        <input type="checkbox" checked={gold} onChange={() => setGold(!gold)} /> 금색 (황금 구구몬)
      </label>
      <label style={{ display: 'block' }}>
        <input type="checkbox" checked={mirror} onChange={() => setMirror(!mirror)} /> 뒤집기 (적이 쏠 때)
      </label>
      {(Object.keys(ELEMENT_FX) as Element[]).map((el) => (
        <div key={el} style={{ marginTop: 4 }}>
          <strong>{ELEMENT_NAMES[el]}</strong>
          <div style={row}>{ELEMENT_FX[el].map(button)}</div>
        </div>
      ))}
      <div style={{ ...box, position: 'relative', width: 320, height: 180, marginTop: 8, background: '#7cc06b' }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', imageRendering: 'pixelated' }} />
      </div>
    </section>
  );
}

function CompanionPreview({ id }: { id: (typeof SPECIES)[number]['id'] }) {
  // companionImage는 React를 따로 그려 굽기 때문에 React가 그리는 중(렌더·effect)에는 부르면 안 된다 → 다음 차례로 미룬다 (필드에서는 rAF 안)
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => setImg(companionImage(id)));
    return () => clearTimeout(t);
  }, [id]);
  const art = creatureArt(id);
  const tile = 48;
  const size = Math.round(tile * art.fill);
  return (
    <div style={{ position: 'relative', width: tile, height: tile, background: '#d9b382', outline: '1px dashed #8d5a2b' }} title="필드 동행: 점선이 한 칸">
      {img && <img src={img.src} alt="" width={size} height={size} style={{ position: 'absolute', left: (tile - size) / 2, top: tile - size * art.foot }} />}
    </div>
  );
}

export function DevFieldGallery() {
  return (
    <div style={{ padding: 16, overflowY: 'auto', height: '100%' }}>
      <h1>필드 모험 검수</h1>
      <DebugSwitches />
      <EffectButtons />

      <section>
        <h2>주인공 (art/hero.ts)</h2>
        <div style={row}>
          {HERO_DIRS.flatMap((d) =>
            HERO_SPRITES[d].map((art, i) => (
              <figure key={d + i} style={{ ...box, margin: 0, textAlign: 'center' }}>
                <PixelSprite art={art} size={64} />
                <figcaption>
                  {d} {i}
                </figcaption>
              </figure>
            )),
          )}
          {CAPSULE_TYPES.map((t) => (
            <figure key={t} style={{ ...box, margin: 0, textAlign: 'center' }}>
              <CapsuleBall type={t} size={64} />
              <figcaption>{CAPSULE_NAMES[t]}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section>
        <h2>구구몬 (art/creatureArt.ts)</h2>
        {SPECIES.map((s) => (
          <div key={s.id} style={{ ...box, marginBottom: 8 }}>
            <strong>
              {s.name} <small>({s.id} · {creatureArt(s.id).type === 'image' ? '이미지' : '몬스터 SVG'} · 기술: {s.moves.join(' / ')})</small>
            </strong>
            <div style={row}>
              {MOODS.map((m) => (
                <span key={m} title={`앞모습 ${m}`}>
                  {creatureSprite(s.id, { view: 'front', mood: m, color: DAN_COLORS[7], size: 72 })}
                </span>
              ))}
              {STAGES.map((st) => (
                <span key={st} title={displayName(s.id, st)}>
                  {creatureSprite(s.id, { view: 'back', stage: st, color: DAN_COLORS[5], size: 72 })}
                </span>
              ))}
              {creatureSprite(s.id, { view: 'mini', color: speciesColor(s.id), size: 40 })}
              <CompanionPreview id={s.id} />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
