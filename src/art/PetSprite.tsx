/**
 * 자체 제작 펫 SVG — 설계서 13-2, 13-3 (몰랑이/치이카와풍 + 네오 브루탈리즘 팝 UI 매칭 개선판).
 * 11종 × 성장 3단계(아기·어린이·다 자람) × 표정 9종(아픈·화난 표정 포함). 알은 EggSprite.
 * 굵은 검은 테두리, 볼살이 통통한 찹쌀떡 헤드, 물방울 모찌 몸통, 초롱초롱한 눈망울과 입체 하이라이트/명암.
 */
import { type ReactNode, useId } from 'react';
import type { Species, Stage } from '../domain/pet';
import { INK } from './colors';
import { type HatArt, HatShapeG } from './HatSprite';

export type PetExpression = 'idle' | 'happy' | 'excited' | 'cheer' | 'sleep' | 'request' | 'eat' | 'sick' | 'angry';
type GrownStage = Exclude<Stage, 'egg'>;

const STROKE = 5;
const CX = 100;

interface Oval {
  cy: number;
  rx: number;
  ry: number;
}
interface Geo {
  head: Oval;
  body: Oval;
}

const GEO: Record<GrownStage, Geo> = {
  baby: { head: { cy: 105, rx: 60, ry: 49 }, body: { cy: 158, rx: 39, ry: 24 } },
  child: { head: { cy: 87, rx: 57, ry: 46 }, body: { cy: 147, rx: 38, ry: 31 } },
  adult: { head: { cy: 68, rx: 57, ry: 46 }, body: { cy: 138, rx: 43, ry: 44 } },
};

const GROW: Record<GrownStage, 0 | 1 | 2> = { baby: 0, child: 1, adult: 2 };

/** 좌표 소수점 2자리 반올림 헬퍼 (Parametric SVG 규칙 준수) */
const n = (v: number): number => Number(v.toFixed(2));

/** 모자를 씌울 머리 위 기준점 (M5 꾸미기에서 사용) */
export function hatAnchor(stage: GrownStage, species?: Species): { x: number; y: number; scale: number } {
  const h = species === 'hedgehog' ? HEDGE[stage] : GEO[stage].head;
  return { x: CX, y: n(h.cy - h.ry + (species === 'hedgehog' ? 2 : 6)), scale: stage === 'baby' ? 1.02 : 0.98 };
}

/** 고슴도치: 머리와 몸이 하나인 동그란 몸 */
const HEDGE: Record<GrownStage, Oval> = {
  baby: { cy: 128, rx: 56, ry: 49 },
  child: { cy: 117, rx: 60, ry: 58 },
  adult: { cy: 109, rx: 64, ry: 66 },
};

interface Palette {
  body: string;
  belly: string;
  mark: string;
  inner: string;
  blush: string;
}

const COLORS: Record<Species, Palette> = {
  tiger: { body: '#ffaa45', belly: '#fff0d6', mark: '#d96b18', inner: '#ffd199', blush: '#ff8566' },
  cat: { body: '#ffffff', belly: '#fff7f8', mark: '#9496a1', inner: '#ffb8c9', blush: '#ff9eb5' },
  bunny: { body: '#ffe3e8', belly: '#fff9fa', mark: '#ffb8c6', inner: '#ff9eb3', blush: '#ff8da6' },
  hedgehog: { body: '#9c6644', belly: '#fff3e2', mark: '#73482b', inner: '#f4b8c4', blush: '#ff968a' },
  cheese: { body: '#ffd699', belly: '#fff8eb', mark: '#eb9c46', inner: '#ffb8c6', blush: '#ff967d' },
  pig: { body: '#ffc9d6', belly: '#ffeef2', mark: '#ff94b2', inner: '#ff9eb8', blush: '#ff809e' },
  cow: { body: '#ffffff', belly: '#fff5f7', mark: '#393942', inner: '#ffb8c9', blush: '#ff9eb5' },
  dog: { body: '#fce4be', belly: '#fff8ec', mark: '#b57242', inner: '#f2b199', blush: '#ff967d' },
  panda: { body: '#ffffff', belly: '#ffffff', mark: '#2d2d35', inner: '#ffadc2', blush: '#ff9eb5' },
  fox: { body: '#ff9340', belly: '#fff8f0', mark: '#543525', inner: '#ffe3cc', blush: '#ff7d66' },
  penguin: { body: '#466899', belly: '#ffffff', mark: '#ffca3a', inner: '#ffb8c9', blush: '#ff9bb0' },
};

const line = { stroke: INK, strokeWidth: STROKE, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

function star(cx: number, cy: number, r: number, fill: string, key?: string) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.48;
    return `${n(cx + Math.cos(a) * rr)},${n(cy + Math.sin(a) * rr)}`;
  }).join(' ');
  return <polygon key={key} points={pts} fill={fill} stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />;
}

/** 아래쪽 볼살이 말랑하게 퍼지는 4구간 연속 베지어 찹쌀떡 헤드 */
function mochi(o: Oval): string {
  const top = n(o.cy - o.ry);
  const bot = n(o.cy + o.ry);
  const cheekY = n(o.cy + o.ry * 0.16);
  const rxCheek = n(o.rx * 1.04);
  const lx = n(CX - rxCheek);
  const rx = n(CX + rxCheek);
  const dxTop = n(o.rx * 0.64);
  const dxBot = n(o.rx * 0.72);
  const dyUp = n(o.ry * 0.68);
  const dyDown = n(o.ry * 0.52);
  return [
    `M ${CX} ${top}`,
    `C ${n(CX + dxTop)} ${top}, ${rx} ${n(cheekY - dyUp)}, ${rx} ${cheekY}`,
    `C ${rx} ${n(cheekY + dyDown)}, ${n(CX + dxBot)} ${bot}, ${CX} ${bot}`,
    `C ${n(CX - dxBot)} ${bot}, ${lx} ${n(cheekY + dyDown)}, ${lx} ${cheekY}`,
    `C ${lx} ${n(cheekY - dyUp)}, ${n(CX - dxTop)} ${top}, ${CX} ${top}`,
    'Z',
  ].join(' ');
}

/** 어깨는 좁고 아랫배가 통통해 안정감 있는 물방울 모찌 몸통 */
function plumpBody(b: Oval): string {
  const top = n(b.cy - b.ry);
  const bot = n(b.cy + b.ry);
  const hipY = n(b.cy + b.ry * 0.22);
  const rxHip = n(b.rx * 1.03);
  const lx = n(CX - rxHip);
  const rx = n(CX + rxHip);
  const dxTop = n(b.rx * 0.54);
  const dxBot = n(b.rx * 0.76);
  const dyUp = n(b.ry * 0.72);
  const dyDown = n(b.ry * 0.48);
  return [
    `M ${CX} ${top}`,
    `C ${n(CX + dxTop)} ${top}, ${rx} ${n(hipY - dyUp)}, ${rx} ${hipY}`,
    `C ${rx} ${n(hipY + dyDown)}, ${n(CX + dxBot)} ${bot}, ${CX} ${bot}`,
    `C ${n(CX - dxBot)} ${bot}, ${lx} ${n(hipY + dyDown)}, ${lx} ${hipY}`,
    `C ${lx} ${n(hipY - dyUp)}, ${n(CX - dxTop)} ${top}, ${CX} ${top}`,
    'Z',
  ].join(' ');
}

/** 테두리가 있는 굵은 팔다리·꼬리 (검은 굵은 선 위에 색 선을 겹친다) */
function limb(d: string, fill: string, width: number, key?: string, stripes?: string) {
  return (
    <g key={key}>
      <path d={d} fill="none" stroke={INK} strokeWidth={width + STROKE * 2} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={fill} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      {stripes && <path d={d} fill="none" stroke={stripes} strokeWidth={width} strokeDasharray="5 9" strokeDashoffset="-6" strokeLinecap="round" />}
    </g>
  );
}

/** 고슴도치 가시 (날카로운 톱니 대신 폭신하고 둥근 밤송이/구름 컬 실루엣) */
function spikes(h: Oval, grow: number, fill: string) {
  const count = 14 + grow * 2;
  const rxOut = h.rx * (1.16 + grow * 0.04);
  const ryOut = h.ry * (1.14 + grow * 0.04);
  const rxIn = h.rx * 0.98;
  const ryIn = h.ry * 0.98;
  const segments: string[] = [];
  for (let i = 0; i < count; i++) {
    const a1 = (i * 2 * Math.PI) / count;
    const aMid = ((i + 0.5) * 2 * Math.PI) / count;
    const a2 = ((i + 1) * 2 * Math.PI) / count;
    const x1 = n(CX + Math.cos(a1) * rxIn);
    const y1 = n(h.cy + Math.sin(a1) * ryIn);
    const xm = n(CX + Math.cos(aMid) * rxOut);
    const ym = n(h.cy + Math.sin(aMid) * ryOut);
    const x2 = n(CX + Math.cos(a2) * rxIn);
    const y2 = n(h.cy + Math.sin(a2) * ryIn);
    if (i === 0) segments.push(`M ${x1} ${y1}`);
    segments.push(`Q ${xm} ${ym} ${x2} ${y2}`);
  }
  segments.push('Z');
  return <path {...line} strokeWidth="4.5" d={segments.join(' ')} fill={fill} />;
}

/** 머리·몸 뒤: 꼬리와 귀 */
function behind(species: Species, stage: GrownStage, g: Geo, c: Palette): ReactNode {
  const { head: h, body: b } = g;
  const grow = GROW[stage];
  const top = h.cy - h.ry;
  const tailBase = { x: n(CX - b.rx + 8), y: n(b.cy + b.ry * 0.42) };
  const curl = (len: number) =>
    `M${tailBase.x} ${tailBase.y} Q${n(tailBase.x - len)} ${n(tailBase.y + 4)} ${n(tailBase.x - len * 0.88)} ${n(tailBase.y - len * 0.68)} Q${n(tailBase.x - len * 0.72)} ${n(tailBase.y - len * 0.98)} ${n(tailBase.x - len * 0.42)} ${n(tailBase.y - len * 0.88)}`;

  const catEar = (dir: 1 | -1, fill: string, inner: string) => {
    const bx = n(CX + dir * h.rx * 0.34);
    const ox = n(CX + dir * h.rx * 0.86);
    const tipX = n(CX + dir * h.rx * (0.74 + grow * 0.03));
    const tipY = n(top - 14 - grow * 4);
    return (
      <g key={dir}>
        <path
          {...line}
          fill={fill}
          d={`M${bx} ${n(top + 16)} C${n(bx + dir * 6)} ${n(top - 4)}, ${n(tipX - dir * 10)} ${n(tipY - 2)}, ${tipX} ${tipY} C${n(tipX + dir * 10)} ${n(tipY + 2)}, ${n(ox + dir * 4)} ${n(top + 8)}, ${ox} ${n(top + 30)} Z`}
        />
        <path
          fill={inner}
          d={`M${n(bx + dir * 9)} ${n(top + 16)} Q${n(tipX - dir * 3)} ${n(tipY + 7)} ${n(tipX - dir * 1)} ${n(tipY + 11)} Q${n(ox - dir * 3)} ${n(top + 14)} ${n(ox - dir * 7)} ${n(top + 25)} Z`}
        />
      </g>
    );
  };

  switch (species) {
    case 'tiger': {
      const ear = (dir: 1 | -1) => {
        const x = n(CX + dir * h.rx * 0.64);
        const y = n(top + 10);
        const r = 15 + grow;
        return (
          <g key={dir}>
            <circle {...line} cx={x} cy={y} r={r} fill={c.body} />
            <circle cx={x} cy={y + 2} r={n(r * 0.52)} fill={c.inner} />
          </g>
        );
      };
      return (
        <>
          {stage === 'baby'
            ? limb(`M${tailBase.x} ${tailBase.y} Q${n(tailBase.x - 20)} ${n(tailBase.y + 2)} ${n(tailBase.x - 22)} ${n(tailBase.y - 12)}`, c.body, 11)
            : limb(curl(24 + grow * 6), c.body, 12 + grow * 2, undefined, c.mark)}
          {ear(-1)}
          {ear(1)}
        </>
      );
    }
    case 'cat':
      return (
        <>
          {stage === 'baby'
            ? limb(`M${tailBase.x} ${tailBase.y} Q${n(tailBase.x - 20)} ${n(tailBase.y + 2)} ${n(tailBase.x - 22)} ${n(tailBase.y - 12)}`, c.mark, 11)
            : limb(curl(24 + grow * 6), c.mark, 11 + grow * 2)}
          {catEar(-1, c.mark, c.inner)}
          {catEar(1, c.body, c.inner)}
        </>
      );
    case 'cheese':
      return (
        <>
          {stage === 'baby'
            ? limb(`M${tailBase.x} ${tailBase.y} Q${n(tailBase.x - 20)} ${n(tailBase.y + 2)} ${n(tailBase.x - 22)} ${n(tailBase.y - 12)}`, c.body, 11, undefined, c.mark)
            : limb(curl(24 + grow * 6), c.body, 11 + grow * 2, undefined, c.mark)}
          {catEar(-1, c.body, c.inner)}
          {catEar(1, c.body, c.inner)}
        </>
      );
    case 'bunny': {
      const len = 28 + grow * 8;
      const ear = (dir: 1 | -1) => {
        const tilt = dir * (9 + grow * 2) + (stage === 'adult' && dir === 1 ? 22 : 0);
        const x = n(CX + dir * h.rx * 0.35);
        const y = n(top + 6 - len / 2);
        return (
          <g key={dir} transform={`rotate(${tilt} ${x} ${n(top + 12)})`}>
            <ellipse {...line} cx={x} cy={y} rx={13.5 + grow} ry={n(len / 2 + 8)} fill={c.body} />
            <ellipse cx={x} cy={n(y + 4)} rx={n(6.5 + grow * 0.5)} ry={n(len / 2 - 2)} fill={c.inner} />
          </g>
        );
      };
      return (
        <>
          <circle {...line} cx={n(CX - b.rx + 2)} cy={n(b.cy + b.ry * 0.35)} r={10 + grow * 2} fill={c.belly} />
          {ear(-1)}
          {ear(1)}
        </>
      );
    }
    case 'hedgehog':
    case 'penguin':
      return null;
    case 'pig': {
      const ear = (dir: 1 | -1) => (
        <g key={dir}>
          <path
            {...line}
            fill={c.body}
            d={`M${n(CX + dir * h.rx * 0.32)} ${n(top + 12)} Q${n(CX + dir * h.rx * 0.68)} ${n(top - 14 - grow * 3)} ${n(CX + dir * h.rx * 0.96)} ${n(top - 2 - grow * 2)} Q${n(CX + dir * h.rx * 0.92)} ${n(top + 18)} ${n(CX + dir * h.rx * 0.8)} ${n(top + 28)} Z`}
          />
          <path
            fill={c.inner}
            d={`M${n(CX + dir * h.rx * 0.45)} ${n(top + 12)} Q${n(CX + dir * h.rx * 0.68)} ${n(top - 5 - grow * 2)} ${n(CX + dir * h.rx * 0.86)} ${n(top + 3 - grow * 2)} Q${n(CX + dir * h.rx * 0.84)} ${n(top + 16)} ${n(CX + dir * h.rx * 0.76)} ${n(top + 22)} Z`}
          />
        </g>
      );
      const tx = tailBase.x;
      const ty = n(tailBase.y - 4);
      return (
        <>
          {limb(`M${tx} ${ty} c-12 0 -16 -12 -8 -15 c7 -2 8 8 1 8`, c.body, 6)}
          {ear(-1)}
          {ear(1)}
        </>
      );
    }
    case 'cow': {
      const horn = (dir: 1 | -1) => (
        <path
          key={`h${dir}`}
          {...line}
          strokeWidth="4.5"
          fill="#ffefb8"
          d={`M${n(CX + dir * h.rx * 0.3)} ${n(top + 10)} Q${n(CX + dir * h.rx * 0.36)} ${n(top - 13 - grow * 3)} ${n(CX + dir * h.rx * 0.48)} ${n(top - 9 - grow * 3)} Q${n(CX + dir * h.rx * 0.52)} ${n(top + 3)} ${n(CX + dir * h.rx * 0.48)} ${n(top + 12)} Z`}
        />
      );
      const ear = (dir: 1 | -1) => {
        const x = n(CX + dir * h.rx * 0.94);
        const y = n(h.cy - h.ry * 0.32);
        return (
          <g key={`e${dir}`} transform={`rotate(${dir * 20} ${x} ${y})`}>
            <ellipse {...line} cx={x} cy={y} rx={16} ry={9.5} fill={dir === 1 ? c.mark : c.body} />
            <ellipse cx={n(x + dir * 2)} cy={y} rx={8.5} ry={4.5} fill={c.inner} />
          </g>
        );
      };
      const tx = tailBase.x;
      const ty = tailBase.y;
      return (
        <>
          {limb(`M${tx} ${ty} Q${n(tx - 18)} ${n(ty + 4)} ${n(tx - 20)} ${n(ty - 16 - grow * 5)}`, c.body, 6)}
          <ellipse {...line} strokeWidth="4" cx={n(tx - 20)} cy={n(ty - 20 - grow * 5)} rx="6" ry="8" fill={c.mark} />
          {horn(-1)}
          {horn(1)}
          {ear(-1)}
          {ear(1)}
        </>
      );
    }
    case 'dog':
      return limb(`M${tailBase.x} ${tailBase.y} Q${n(tailBase.x - 20)} ${n(tailBase.y - 2)} ${n(tailBase.x - 20 - grow * 3)} ${n(tailBase.y - 20 - grow * 5)}`, c.body, 11 + grow);
    case 'panda': {
      const ear = (dir: 1 | -1) => <circle key={dir} {...line} cx={n(CX + dir * h.rx * 0.65)} cy={n(top + 10)} r={15 + grow} fill={c.mark} />;
      return (
        <>
          {ear(-1)}
          {ear(1)}
        </>
      );
    }
    case 'fox': {
      const len = 26 + grow * 7;
      const w = 17 + grow * 4;
      const end = { x: n(tailBase.x - len * 0.95), y: n(tailBase.y - len * 0.8) };
      return (
        <>
          {stage === 'baby'
            ? limb(`M${tailBase.x} ${tailBase.y} Q${n(tailBase.x - 22)} ${n(tailBase.y + 2)} ${n(tailBase.x - 24)} ${n(tailBase.y - 15)}`, c.body, 16)
            : limb(`M${tailBase.x} ${tailBase.y} Q${n(tailBase.x - len * 1.05)} ${n(tailBase.y + 4)} ${end.x} ${end.y}`, c.body, w)}
          {stage === 'baby' ? (
            <circle {...line} strokeWidth="4.5" cx={n(tailBase.x - 24)} cy={n(tailBase.y - 17)} r="8.5" fill={c.belly} />
          ) : (
            <circle {...line} strokeWidth="4.5" cx={end.x} cy={end.y} r={n(w * 0.45)} fill={c.belly} />
          )}
          {catEar(-1, c.body, c.mark)}
          {catEar(1, c.body, c.mark)}
        </>
      );
    }
  }
}

/** 머리 앞에 늘어뜨린 귀 (강아지) */
function frontEars(species: Species, stage: GrownStage, h: Oval, c: Palette): ReactNode {
  if (species !== 'dog') return null;
  const grow = GROW[stage];
  return [-1, 1].map((dir) => {
    const x = n(CX + dir * h.rx * 0.86);
    const y = n(h.cy - h.ry * 0.16 + grow * 2);
    return (
      <g key={dir} transform={`rotate(${dir * -14} ${x} ${n(y - 18)})`}>
        <ellipse {...line} cx={x} cy={y} rx={13.5 + grow} ry={22 + grow * 3} fill={c.mark} />
        <ellipse cx={n(x - dir * 2)} cy={n(y - 4)} rx={5} ry={9} fill="#ffffff" opacity="0.22" />
      </g>
    );
  });
}

/** 몸 앞: 물방울 모찌 몸통, 배, 발(젤리 발바닥), 통통한 모찌 팔 */
function bodyParts(species: Species, stage: GrownStage, g: Geo, c: Palette, bodyClipId: string): ReactNode {
  const b = g.body;
  const bottom = b.cy + b.ry;
  const grow = GROW[stage];
  const bodyFill = species === 'hedgehog' ? c.belly : c.body;
  const footFill = species === 'panda' || species === 'penguin' ? c.mark : bodyFill;
  const armFill = species === 'panda' ? c.mark : bodyFill;
  const plainBelly = species === 'hedgehog' || species === 'cat' || species === 'cow' || species === 'panda';
  const bPath = plumpBody(b);

  return (
    <>
      <path d={bPath} fill={bodyFill} />
      <g clipPath={`url(#${bodyClipId})`}>
        {!plainBelly && (
          <ellipse
            cx={CX}
            cy={n(b.cy + b.ry * (species === 'penguin' ? 0.12 : 0.22))}
            rx={n(b.rx * (species === 'penguin' ? 0.74 : 0.62))}
            ry={n(b.ry * (species === 'penguin' ? 0.82 : 0.62))}
            fill={c.belly}
          />
        )}
        {(species === 'cat' || species === 'cow') && stage !== 'baby' && (
          <ellipse cx={n(CX + b.rx * 0.48)} cy={n(b.cy + b.ry * 0.05)} rx={n(b.rx * 0.3)} ry={n(b.ry * 0.3)} fill={c.mark} />
        )}
        {species === 'cow' && stage !== 'baby' && (
          <ellipse cx={n(CX - b.rx * 0.52)} cy={n(b.cy + b.ry * 0.42)} rx={n(b.rx * 0.24)} ry={n(b.ry * 0.22)} fill={c.mark} />
        )}
        {species === 'tiger' &&
          stage === 'adult' &&
          [-1, 1].map((dir) => (
            <path key={dir} d={`M${n(CX + dir * b.rx)} ${n(b.cy - 4)} q${-dir * 12} 4 ${-dir * 14} 12`} stroke={c.mark} strokeWidth="5" fill="none" strokeLinecap="round" />
          ))}
        {/* 머리 아래 자연스러운 목 입체 그림자 */}
        <ellipse cx={CX} cy={n(b.cy - b.ry + 4)} rx={n(b.rx * 0.75)} ry={10} fill={INK} opacity="0.08" />
      </g>
      <path d={bPath} fill="none" {...line} />

      {/* 살짝 바깥을 향한 통통한 발 + 젤리 발바닥 포인트 */}
      {[-1, 1].map((dir) => {
        const fx = n(CX + dir * b.rx * 0.44);
        const fy = n(bottom - 2);
        return (
          <g key={`f${dir}`} transform={`rotate(${dir * 8} ${fx} ${fy})`}>
            <ellipse {...line} cx={fx} cy={fy} rx={13.5} ry={8.5} fill={footFill} />
            {grow > 0 && species !== 'penguin' && <ellipse cx={fx} cy={n(fy + 1)} rx={5.5} ry={3.2} fill={c.inner} opacity="0.85" />}
          </g>
        );
      })}

      {/* 팔: 펭귄은 날개, 아기부터 성체까지 볼륨감 있는 모찌 손 */}
      {species === 'penguin'
        ? [-1, 1].map((dir) =>
            limb(
              `M${n(CX + dir * b.rx * 0.78)} ${n(b.cy - b.ry * 0.42)} Q${n(CX + dir * (b.rx + 11))} ${b.cy} ${n(CX + dir * (b.rx + 5))} ${n(b.cy + b.ry * 0.36)}`,
              c.body,
              10 + grow * 2,
              String(dir),
            ),
          )
        : stage === 'baby'
          ? [-1, 1].map((dir) =>
              limb(
                `M${n(CX + dir * b.rx * 0.72)} ${n(b.cy - b.ry * 0.25)} Q${n(CX + dir * b.rx * 0.82)} ${n(b.cy + b.ry * 0.08)} ${n(CX + dir * b.rx * 0.48)} ${n(b.cy + b.ry * 0.16)}`,
                armFill,
                10.5,
                String(dir),
              ),
            )
          : [-1, 1].map((dir) =>
              limb(
                `M${n(CX + dir * b.rx * 0.76)} ${n(b.cy - b.ry * 0.38)} Q${n(CX + dir * b.rx * 0.9)} ${n(b.cy + b.ry * 0.08)} ${n(CX + dir * b.rx * 0.44)} ${n(b.cy + b.ry * 0.18)}`,
                armFill,
                12.5,
                String(dir),
              ),
            )}
    </>
  );
}

/** 머리 위 무늬 (머리 모양으로 잘라 그린다) */
function headMarks(species: Species, stage: GrownStage, g: Geo, c: Palette): ReactNode {
  const h = g.head;
  const top = h.cy - h.ry;
  const grow = GROW[stage];
  const stripe = (x: number, y: number, len: number, key: number, w = 5) => (
    <path key={key} d={`M${n(x)} ${n(y)} l0 ${n(len)}`} stroke={c.mark} strokeWidth={w} strokeLinecap="round" />
  );
  switch (species) {
    case 'tiger':
      return (
        <>
          {[-12, 0, 12].map((dx, i) => stripe(CX + dx, top + 2, (i === 1 ? 15 : 10) + grow * 3, i, 5 + grow))}
          {grow > 0 &&
            [-1, 1].map((dir) => (
              <g key={dir} stroke={c.mark} strokeWidth={4 + grow} strokeLinecap="round" fill="none">
                <path d={`M${n(CX + dir * h.rx * 1.02)} ${n(h.cy - 6)} l${-dir * 13} 3`} />
                <path d={`M${n(CX + dir * h.rx * 1.02)} ${n(h.cy + 5)} l${-dir * 10} 2`} />
              </g>
            ))}
        </>
      );
    case 'cat':
      return (
        <>
          <ellipse cx={n(CX - h.rx * 0.56)} cy={n(top + h.ry * 0.28)} rx={n(h.rx * 0.58)} ry={n(h.ry * 0.58)} fill={c.mark} />
          {grow > 0 && <ellipse cx={n(CX + h.rx * 0.76)} cy={n(top + h.ry * 0.16)} rx={n(h.rx * 0.32)} ry={n(h.ry * 0.32)} fill="#ffaa5c" />}
        </>
      );
    case 'cheese':
      return [-10, 0, 10].map((dx, i) => stripe(CX + dx, top + 2, (i === 1 ? 13 : 9) + grow * 3, i, 4.5 + grow));
    case 'cow':
      return (
        <>
          <ellipse cx={n(CX + h.rx * 0.58)} cy={n(top + h.ry * 0.3)} rx={n(h.rx * 0.48)} ry={n(h.ry * 0.52)} fill={c.mark} />
          {grow > 0 && <ellipse cx={n(CX - h.rx * 0.9)} cy={n(h.cy + h.ry * 0.12)} rx={n(h.rx * 0.28)} ry={n(h.ry * 0.36)} fill={c.mark} />}
        </>
      );
    case 'dog':
      return <ellipse cx={n(CX - h.rx * 0.36)} cy={n(h.cy + h.ry * 0.04)} rx={n(h.rx * 0.27)} ry={n(h.ry * 0.32)} fill={c.mark} opacity="0.88" />;
    case 'panda':
      return [-1, 1].map((dir) => (
        <ellipse
          key={dir}
          cx={n(CX + dir * h.rx * 0.36)}
          cy={n(h.cy + h.ry * 0.14)}
          rx="13.5"
          ry="16.5"
          fill={c.mark}
          transform={`rotate(${dir * -26} ${n(CX + dir * h.rx * 0.36)} ${n(h.cy + h.ry * 0.14)})`}
        />
      ));
    case 'fox':
      return [-1, 1].map((dir) => (
        <ellipse key={dir} cx={n(CX + dir * h.rx * 0.48)} cy={n(h.cy + h.ry * 0.62)} rx={n(h.rx * 0.58)} ry={n(h.ry * 0.5)} fill={c.belly} />
      ));
    case 'penguin':
      return (
        <>
          {[-1, 1].map((dir) => (
            <ellipse key={dir} cx={n(CX + dir * h.rx * 0.28)} cy={n(h.cy + h.ry * 0.22)} rx={n(h.rx * 0.46)} ry={n(h.ry * 0.64)} fill={c.belly} />
          ))}
          <ellipse cx={CX} cy={n(h.cy + h.ry * 0.45)} rx={n(h.rx * 0.66)} ry={n(h.ry * 0.52)} fill={c.belly} />
        </>
      );
    case 'bunny':
    case 'hedgehog':
    case 'pig':
      return null;
  }
}

/** 다 자란 펫의 장신구 (머리 앞) */
function adornment(species: Species, stage: GrownStage, g: Geo): ReactNode {
  if (stage !== 'adult') return null;
  const neckY = n(g.head.cy + g.head.ry * 0.94);
  const scarf = (fill: string) => (
    <g {...line} strokeWidth="4" fill={fill}>
      <path d={`M${CX - 34} ${n(neckY - 4)} Q${CX} ${n(neckY + 12)} ${CX + 34} ${n(neckY - 4)} L${CX + 32} ${n(neckY + 8)} Q${CX} ${n(neckY + 22)} ${CX - 32} ${n(neckY + 8)} Z`} />
      <path d={`M${CX - 20} ${n(neckY + 10)} L${CX - 26} ${n(neckY + 32)} L${CX - 10} ${n(neckY + 28)} L${CX - 8} ${n(neckY + 12)} Z`} />
    </g>
  );
  switch (species) {
    case 'tiger':
      return scarf('#ff4d6d');
    case 'cheese':
      return scarf('#4dabf7');
    case 'cat':
      return (
        <g>
          <path {...line} strokeWidth="4" fill="#ff6b6b" d={`M${CX - 30} ${n(neckY - 2)} Q${CX} ${n(neckY + 10)} ${CX + 30} ${n(neckY - 2)} L${CX + 30} ${n(neckY + 6)} Q${CX} ${n(neckY + 18)} ${CX - 30} ${n(neckY + 6)} Z`} />
          <circle {...line} strokeWidth="3.5" cx={CX} cy={n(neckY + 17)} r="8" fill="#ffd43b" />
          <path d={`M${CX - 6} ${n(neckY + 17)} L${CX + 6} ${n(neckY + 17)}`} stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case 'bunny': {
      const x = CX + 28;
      const y = n(g.head.cy - g.head.ry + 6);
      return (
        <g>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle
              key={a}
              {...line}
              strokeWidth="3"
              cx={n(x + Math.cos((a * Math.PI) / 180) * 7.5)}
              cy={n(y + Math.sin((a * Math.PI) / 180) * 7.5)}
              r="6"
              fill="#fff3bf"
            />
          ))}
          <circle {...line} strokeWidth="3" cx={x} cy={y} r="4.8" fill="#ff922b" />
        </g>
      );
    }
    case 'hedgehog':
      return null;
    case 'fox':
      return scarf('#ffd43b');
    case 'penguin': {
      const top = g.head.cy - g.head.ry;
      return (
        <>
          <path {...line} strokeWidth="3.5" fill="#ffc53d" d={`M${CX - 4} ${n(top + 6)} Q${CX - 14} ${n(top - 16)} ${CX - 2} ${n(top - 20)} Q${CX + 2} ${n(top - 8)} ${CX + 4} ${n(top + 6)} Z`} />
          <path {...line} strokeWidth="3.5" fill="#ffc53d" d={`M${CX + 2} ${n(top + 6)} Q${CX + 6} ${n(top - 12)} ${CX + 17} ${n(top - 12)} Q${CX + 12} ${n(top - 2)} ${CX + 8} ${n(top + 8)} Z`} />
          {scarf('#ff6b6b')}
        </>
      );
    }
    case 'pig': {
      const x = n(CX - g.head.rx * 0.42);
      const y = n(g.head.cy - g.head.ry + 8);
      return (
        <g {...line} strokeWidth="3.5" fill="#ff5c7a">
          <path d={`M${x} ${y} L${n(x - 15)} ${n(y - 9)} L${n(x - 15)} ${n(y + 9)} Z`} />
          <path d={`M${x} ${y} L${n(x + 15)} ${n(y - 9)} L${n(x + 15)} ${n(y + 9)} Z`} />
          <circle cx={x} cy={y} r="4.8" />
        </g>
      );
    }
    case 'cow':
      return (
        <g>
          <path {...line} strokeWidth="4" fill="#4dabf7" d={`M${CX - 30} ${n(neckY - 2)} Q${CX} ${n(neckY + 10)} ${CX + 30} ${n(neckY - 2)} L${CX + 30} ${n(neckY + 6)} Q${CX} ${n(neckY + 18)} ${CX - 30} ${n(neckY + 6)} Z`} />
          <path {...line} strokeWidth="3.5" fill="#ffd43b" d={`M${CX - 7} ${n(neckY + 10)} L${CX + 7} ${n(neckY + 10)} L${CX + 10} ${n(neckY + 26)} L${CX - 10} ${n(neckY + 26)} Z`} />
          <circle cx={CX} cy={n(neckY + 28)} r="3" fill={INK} />
        </g>
      );
    case 'dog':
      return (
        <g>
          <path {...line} strokeWidth="4" fill="#ff6b6b" d={`M${CX - 30} ${n(neckY - 2)} Q${CX} ${n(neckY + 10)} ${CX + 30} ${n(neckY - 2)} L${CX + 30} ${n(neckY + 6)} Q${CX} ${n(neckY + 18)} ${CX - 30} ${n(neckY + 6)} Z`} />
          <g {...line} strokeWidth="3" fill="#ffe8a3">
            <circle cx={CX - 9} cy={n(neckY + 16)} r="4.5" />
            <circle cx={CX - 9} cy={n(neckY + 24)} r="4.5" />
            <circle cx={CX + 9} cy={n(neckY + 16)} r="4.5" />
            <circle cx={CX + 9} cy={n(neckY + 24)} r="4.5" />
            <rect x={CX - 9} y={n(neckY + 15)} width="18" height="10" stroke="none" />
            <path d={`M${CX - 7} ${n(neckY + 14.5)} L${CX + 7} ${n(neckY + 14.5)} M${CX - 7} ${n(neckY + 25.5)} L${CX + 7} ${n(neckY + 25.5)}`} fill="none" />
          </g>
        </g>
      );
    case 'panda': {
      // 몸 오른쪽 아래에서 머리 옆(얼굴 바깥)으로 비스듬히 세운 대나무
      const bx = n(CX + g.body.rx * 0.36);
      const by = n(g.body.cy + g.body.ry * 0.58);
      const ex = n(CX + g.head.rx + 20);
      const ey = n(g.head.cy + g.head.ry * 0.05);
      const dx = ex - bx;
      const dy = ey - by;
      const at = (t: number) => `${n(bx + dx * t)} ${n(by + dy * t)}`;
      return (
        <g>
          {limb(`M${bx} ${by} L${ex} ${ey}`, '#7bd36b', 8)}
          <path d={`M${at(0.35)} l6 3 M${at(0.68)} l6 3`} stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path {...line} strokeWidth="3" fill="#69db7c" d={`M${ex} ${ey} q15 -10 22 2 q-13 6 -22 -2 Z`} />
          <path {...line} strokeWidth="3" fill="#69db7c" d={`M${at(0.9)} q12 -14 4 -24 q-10 10 -4 24 Z`} />
          <circle {...line} strokeWidth="4" cx={n(CX + g.body.rx * 0.44)} cy={n(g.body.cy + g.body.ry * 0.18)} r="8.5" fill="#2d2d35" />
        </g>
      );
    }
  }
}

/** 고슴도치 한 덩어리 몸 (폭신한 밤송이 가시·귀·크림색 얼굴과 배·발·배 위에 모은 손·장식) */
function hedgehogBody(stage: GrownStage, c: Palette): ReactNode {
  const o = HEDGE[stage];
  const grow = GROW[stage];
  const L = n(CX - o.rx * 0.82);
  const R = n(CX + o.rx * 0.82);
  const top = n(o.cy - o.ry * 0.58);
  const mid = n(o.cy + o.ry * 0.08);
  const bottom = n(o.cy + o.ry * 1.08);
  const hand = (dir: 1 | -1) =>
    limb(
      `M${n(CX + dir * o.rx * 0.58)} ${n(o.cy + o.ry * 0.38)} Q${n(CX + dir * o.rx * 0.5)} ${n(o.cy + o.ry * 0.52)} ${n(CX + dir * o.rx * 0.32)} ${n(o.cy + o.ry * 0.48)}`,
      c.belly,
      12.5,
      String(dir),
    );
  const ax = n(CX + o.rx * 0.58);
  const ay = n(o.cy - o.ry * 0.94);
  return (
    <>
      {spikes(o, grow, c.body)}
      {[-1, 1].map((dir) => (
        <g key={dir}>
          <circle {...line} cx={n(CX + dir * o.rx * 0.56)} cy={n(o.cy - o.ry * 0.74)} r="10.5" fill={c.body} />
          <circle cx={n(CX + dir * o.rx * 0.56)} cy={n(o.cy - o.ry * 0.72)} r="5" fill={c.inner} />
        </g>
      ))}
      <ellipse {...line} cx={CX} cy={o.cy} rx={o.rx} ry={o.ry} fill={c.body} />
      <path
        {...line}
        strokeWidth="3.8"
        fill={c.belly}
        d={`M${L} ${mid} C${L} ${top} ${n(CX - 12)} ${n(top - 4)} ${CX} ${n(top + 9)} C${n(CX + 12)} ${n(top - 4)} ${R} ${top} ${R} ${mid} C${R} ${bottom} ${L} ${bottom} ${L} ${mid} Z`}
      />
      <ellipse {...line} cx={n(CX - o.rx * 0.36)} cy={n(o.cy + o.ry - 2)} rx="14" ry="8.5" fill={c.belly} />
      <ellipse {...line} cx={n(CX + o.rx * 0.36)} cy={n(o.cy + o.ry - 2)} rx="14" ry="8.5" fill={c.belly} />
      {grow > 0 && hand(-1)}
      {grow > 0 && hand(1)}
      {grow === 1 && <path {...line} strokeWidth="3.2" fill="#69db7c" d={`M${n(CX + 6)} ${n(o.cy - o.ry - 4)} q12 -14 24 -6 q-10 12 -24 6 Z`} />}
      {grow === 2 && (
        <g>
          <circle {...line} strokeWidth="4" cx={ax} cy={ay} r="14" fill="#ff5c5c" />
          <path d={`M${ax} ${n(ay - 13)} l2 -8`} stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <path {...line} strokeWidth="3" fill="#69db7c" d={`M${n(ax + 2)} ${n(ay - 17)} q10 -8 16 -2 q-8 8 -16 2 Z`} />
          <ellipse cx={n(ax - 5)} cy={n(ay - 4)} rx="3" ry="4.5" fill="#fff" opacity="0.75" />
        </g>
      )}
    </>
  );
}

function whiskers(species: Species, g: Geo): ReactNode {
  if (species !== 'cat' && species !== 'cheese' && species !== 'bunny') return null;
  const h = g.head;
  const y = n(h.cy + h.ry * 0.28);
  const from = n(h.rx - 5);
  return (
    <g stroke={INK} strokeWidth="2.6" strokeLinecap="round">
      {[-1, 1].map((dir) => (
        <g key={dir}>
          <line x1={n(CX + dir * from)} y1={n(y - 3)} x2={n(CX + dir * (from + 15))} y2={n(y - 6)} />
          <line x1={n(CX + dir * from)} y1={n(y + 4)} x2={n(CX + dir * (from + 15))} y2={n(y + 6)} />
        </g>
      ))}
    </g>
  );
}

/** 화난 표시(💢)의 한 조각 */
const ANGER_PIECE = (() => {
  const g = 1.4;
  const l = 13;
  const te = 7.5;
  const tc = 1.5;
  return `M${g} ${-l} L${g + te} ${-l} Q${g + tc} ${-(g + tc)} ${l} ${-(g + te)} L${l} ${-g} Q${g} ${-g} ${g} ${-l} Z`;
})();

/** 얼굴 가운데 코 모양 */
type Nose = 'none' | 'tiny' | 'dot' | 'pig' | 'cow' | 'beak';
const NOSE: Partial<Record<Species, Nose>> = {
  cat: 'tiny',
  tiger: 'tiny',
  bunny: 'tiny',
  cheese: 'tiny',
  hedgehog: 'dot',
  dog: 'dot',
  panda: 'dot',
  fox: 'dot',
  pig: 'pig',
  cow: 'cow',
  penguin: 'beak',
};

function Face({ expression, g, species, c }: { expression: PetExpression; g: Geo; species: Species; c: Palette }) {
  const h = g.head;
  const big = species === 'hedgehog';
  const nose = NOSE[species] ?? 'none';
  const snout = nose === 'pig' || nose === 'cow';
  // 몰랑이/치이카와풍 황금비율: 눈 위치를 살짝 낮추고 코·입을 눈 사이에 오밀조밀하게 배치
  const y = n(h.cy + h.ry * (big ? 0.14 : snout ? 0.02 : 0.12));
  const spread = n(h.rx * (big ? 0.33 : 0.35));
  const L = n(CX - spread);
  const R = n(CX + spread);
  const er = big ? { rx: 8.5, ry: 9.8 } : { rx: 6.8, ry: 7.8 };
  const fg = species === 'panda' ? '#ffffff' : INK;
  const hl = species === 'panda' ? INK : '#ffffff';

  const eyes = (() => {
    switch (expression) {
      case 'idle':
        return (
          <g className="pet-eyes" style={{ transformOrigin: `${CX}px ${y}px` }}>
            {[L, R].map((x) => (
              <g key={x}>
                <ellipse cx={x} cy={y} rx={er.rx} ry={er.ry} fill={fg} />
                <circle cx={n(x - er.rx * 0.28)} cy={n(y - er.ry * 0.32)} r={big ? 3.2 : 2.6} fill={hl} />
                <circle cx={n(x + er.rx * 0.32)} cy={n(y + er.ry * 0.3)} r={big ? 1.6 : 1.3} fill={hl} />
              </g>
            ))}
          </g>
        );
      case 'happy':
      case 'eat':
        return [L, R].map((x) => (
          <path key={x} d={`M${n(x - 8.5)} ${n(y + 2.5)} Q${x} ${n(y - 8.5)} ${n(x + 8.5)} ${n(y + 2.5)}`} stroke={fg} strokeWidth="4.5" fill="none" strokeLinecap="round" />
        ));
      case 'excited':
        return [L, R].map((x) => <g key={x}>{star(x, y, big ? 11 : 9.5, species === 'panda' ? '#ffe14d' : '#ffca3a')}</g>);
      case 'cheer':
        return [L, R].map((x, i) => (
          <g key={x}>
            <ellipse cx={x} cy={n(y + 1.5)} rx={er.rx} ry={er.ry} fill={fg} />
            <circle cx={n(x - 2)} cy={n(y - 1.5)} r="2.5" fill={hl} />
            <circle cx={n(x + 2.2)} cy={n(y + 3)} r="1.2" fill={hl} />
            <path d={i === 0 ? `M${n(x - 8)} ${n(y - 12)} L${n(x + 7)} ${n(y - 8)}` : `M${n(x - 7)} ${n(y - 8)} L${n(x + 8)} ${n(y - 12)}`} stroke={INK} strokeWidth="4" strokeLinecap="round" />
          </g>
        ));
      case 'sleep':
        return [L, R].map((x) => (
          <path key={x} d={`M${n(x - 8)} ${y} Q${x} ${n(y + 6.5)} ${n(x + 8)} ${y}`} stroke={fg} strokeWidth="4.2" fill="none" strokeLinecap="round" />
        ));
      case 'sick':
        return [L, R].map((x, i) => (
          <g key={x}>
            <path d={`M${n(x - 8)} ${n(y - 0.5)} Q${x} ${n(y + 4.5)} ${n(x + 8)} ${n(y - 0.5)}`} stroke={fg} strokeWidth="4.2" fill="none" strokeLinecap="round" />
            <path d={`M${n(x - 5.5)} ${n(y + 5.5)} Q${x} ${n(y + 8)} ${n(x + 5.5)} ${n(y + 5.5)}`} stroke="#8478ff" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.8" />
            <path d={i === 0 ? `M${n(x - 8)} ${n(y - 9)} L${n(x + 6)} ${n(y - 13)}` : `M${n(x - 6)} ${n(y - 13)} L${n(x + 8)} ${n(y - 9)}`} stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
          </g>
        ));
      case 'angry':
        return [L, R].map((x, i) => (
          <g key={x}>
            <ellipse cx={x} cy={n(y + 1)} rx={er.rx} ry={n(er.ry - 0.8)} fill={fg} />
            <circle cx={n(x - 1.8)} cy={n(y - 1.5)} r="2.2" fill={hl} />
            <path d={i === 0 ? `M${n(x - 9)} ${n(y - 13)} L${n(x + 7)} ${n(y - 6)}` : `M${n(x - 7)} ${n(y - 6)} L${n(x + 9)} ${n(y - 13)}`} stroke={INK} strokeWidth="4.6" strokeLinecap="round" />
          </g>
        ));
      case 'request':
        return [L, R].map((x) => (
          <g key={x}>
            <circle cx={x} cy={y} r={big ? 10.5 : 8.8} fill={fg} />
            <circle cx={n(x - 2.6)} cy={n(y - 2.8)} r={big ? 4.2 : 3.5} fill={hl} />
            <circle cx={n(x + 2.8)} cy={n(y + 2.8)} r={big ? 2.1 : 1.8} fill={hl} />
            <circle cx={n(x - 3)} cy={n(y + 3.2)} r="1.1" fill={hl} />
          </g>
        ));
    }
  })();

  const open = expression === 'happy' || expression === 'excited' || expression === 'eat' || expression === 'cheer';
  const my = n(y + (big ? 14 : nose === 'pig' ? 24 : nose === 'cow' ? 22 : nose === 'dot' ? 12 : 9));

  const mouth =
    nose === 'beak' ? (
      open ? (
        <g {...line} strokeWidth="3">
          <path fill={c.mark} d={`M${CX - 8.5} ${n(y + 6)} Q${CX} ${y} ${CX + 8.5} ${n(y + 6)} Z`} />
          <path fill="#ff7b95" d={`M${CX - 6.5} ${n(y + 6)} Q${CX} ${n(y + 16)} ${CX + 6.5} ${n(y + 6)} Z`} />
        </g>
      ) : (
        <path {...line} strokeWidth="3" fill={c.mark} d={`M${CX - 8.5} ${n(y + 5)} Q${CX} ${n(y + 1.5)} ${CX + 8.5} ${n(y + 5)} Q${CX} ${n(y + 15)} ${CX - 8.5} ${n(y + 5)} Z`} />
      )
    ) : expression === 'sick' ? (
      <path d={`M${CX - 7} ${my} Q${CX - 3.5} ${n(my - 3)} ${CX} ${my} Q${CX + 3.5} ${n(my + 3)} ${CX + 7} ${my}`} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
    ) : expression === 'angry' ? (
      <path d={`M${CX - 6} ${n(my + 2.5)} Q${CX} ${n(my - 4.5)} ${CX + 6} ${n(my + 2.5)}`} stroke={INK} strokeWidth="3.4" fill="none" strokeLinecap="round" />
    ) : expression === 'eat' ? (
      <g>
        <path d={`M${CX - 7.5} ${n(my - 2)} C${CX - 8} ${n(my + 9)}, ${CX + 8} ${n(my + 9)}, ${CX + 7.5} ${n(my - 2)} Z`} fill="#ff6b8b" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d={`M${CX - 5} ${n(my - 2)} Q${CX} ${n(my + 2)} ${CX + 5} ${n(my - 2)}`} stroke={INK} strokeWidth="2.5" fill="none" />
      </g>
    ) : open ? (
      <g>
        <path d={`M${CX - 6.5} ${n(my - 2)} C${CX - 6.5} ${n(my + 9)}, ${CX + 6.5} ${n(my + 9)}, ${CX + 6.5} ${n(my - 2)} Z`} fill={INK} stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
        <ellipse cx={CX} cy={n(my + 3.8)} rx="3.8" ry="2.4" fill="#ff7b95" />
      </g>
    ) : expression === 'request' ? (
      <path
        d={`M${CX - 5.5} ${n(my + 1)} Q${CX - 2.5} ${n(my - 2)} ${CX} ${n(my - 2)} Q${CX + 2.5} ${n(my - 2)} ${CX + 5.5} ${n(my + 1)} Q${CX} ${n(my + 6.5)} ${CX - 5.5} ${n(my + 1)} Z`}
        fill="#ff85a2"
        stroke={INK}
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
    ) : expression === 'sleep' ? (
      <g>
        <circle cx={CX} cy={n(my + 1)} r="2.8" fill={INK} />
        <circle cx={n(R + 10)} cy={n(y - 2)} r="6.5" fill="#d0f0ff" fillOpacity="0.75" stroke={INK} strokeWidth="2.4" />
        <circle cx={n(R + 8)} cy={n(y - 4.5)} r="1.8" fill="#ffffff" />
      </g>
    ) : (
      <path d={`M${CX - 6.5} ${n(my - 1)} Q${CX - 3.2} ${n(my + 4)} ${CX} ${n(my - 0.5)} Q${CX + 3.2} ${n(my + 4)} ${CX + 6.5} ${n(my - 1)}`} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    );

  const noseMark =
    nose === 'dot' ? (
      <ellipse cx={CX} cy={n(y + 4.5)} rx="4.2" ry="3.1" fill={INK} />
    ) : nose === 'tiny' ? (
      <ellipse cx={CX} cy={n(y + 3.5)} rx="3.2" ry="2.3" fill={c.inner === '#ffffff' ? INK : '#ff85a2'} stroke={INK} strokeWidth="2.2" />
    ) : nose === 'pig' ? (
      <g>
        <ellipse {...line} strokeWidth="3.5" cx={CX} cy={n(y + 11)} rx="13.5" ry="9" fill={c.mark} />
        <ellipse cx={n(CX - 4.2)} cy={n(y + 11)} rx="2.1" ry="3.1" fill={INK} />
        <ellipse cx={n(CX + 4.2)} cy={n(y + 11)} rx="2.1" ry="3.1" fill={INK} />
      </g>
    ) : nose === 'cow' ? (
      <g>
        <ellipse {...line} strokeWidth="3.5" cx={CX} cy={n(y + 14)} rx="22" ry="12" fill="#ffd4dc" />
        <ellipse cx={n(CX - 7.5)} cy={n(y + 11)} rx="2.3" ry="3.2" fill={INK} />
        <ellipse cx={n(CX + 7.5)} cy={n(y + 11)} rx="2.3" ry="3.2" fill={INK} />
      </g>
    ) : null;

  const blush = expression === 'sick' ? '#b8e0a6' : expression === 'angry' ? '#ff5c5c' : c.blush;
  // 판다는 검은 눈 무늬 아래쪽 바깥에 볼터치 (무늬 위에 겹치면 지저분해 보인다)
  const panda = species === 'panda';
  const bxL = n(L - (panda ? 15 : 12.5));
  const bxR = n(R + (panda ? 15 : 12.5));
  const by = n(y + (panda ? 21 : 9.5));

  return (
    <g>
      <ellipse cx={bxL} cy={by} rx="12.5" ry="7.2" fill={blush} opacity="0.78" />
      <ellipse cx={bxR} cy={by} rx="12.5" ry="7.2" fill={blush} opacity="0.78" />
      {expression !== 'sick' && (
        <g stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.65">
          <line x1={n(bxL - 3)} y1={n(by - 2)} x2={n(bxL - 1)} y2={n(by + 2)} />
          <line x1={n(bxL + 2)} y1={n(by - 2)} x2={n(bxL + 4)} y2={n(by + 2)} />
          <line x1={n(bxR - 3)} y1={n(by - 2)} x2={n(bxR - 1)} y2={n(by + 2)} />
          <line x1={n(bxR + 2)} y1={n(by - 2)} x2={n(bxR + 4)} y2={n(by + 2)} />
        </g>
      )}
      {expression === 'sick' && (
        <g className="pet-sick-marks">
          {[-12, 0, 12].map((dx) => (
            <path key={dx} d={`M${CX + dx} ${n(y - 32)} l0 9`} stroke="#7c8cff" strokeWidth="3.2" strokeLinecap="round" opacity="0.75" />
          ))}
          <path d={`M${n(R + 19)} ${n(y - 16)} q-6 9 0 12 q6 -3 0 -12 Z`} fill="#8fd3ff" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        </g>
      )}
      {expression === 'angry' && (
        <g transform={`translate(${n(R + 15)} ${n(y - 28)}) rotate(-10)`}>
          <g className="pet-angry-mark">
            {[0, 90, 180, 270].map((deg) => (
              <path key={deg} d={ANGER_PIECE} transform={`rotate(${deg})`} fill="#ff3b3b" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
            ))}
          </g>
        </g>
      )}
      {eyes}
      {noseMark}
      {mouth}
    </g>
  );
}

interface Props {
  species: Species;
  stage: GrownStage;
  expression?: PetExpression;
  size?: number;
  className?: string;
  /** 머리 위에 씌울 모자 */
  hat?: HatArt | null;
}

export function PetSprite({ species, stage, expression = 'idle', size = 200, className, hat }: Props) {
  const uid = useId().replace(/:/g, '');
  const headClipId = `pet-head-${uid}`;
  const bodyClipId = `pet-body-${uid}`;
  const hedgehog = species === 'hedgehog';
  const c = COLORS[species] ?? COLORS.cat;
  const ho = HEDGE[stage];
  const g: Geo = hedgehog ? { head: { cy: n(ho.cy - ho.ry * 0.28), rx: n(ho.rx * 0.8), ry: n(ho.ry * 0.5) }, body: ho } : GEO[stage];
  const h = g.head;
  const top = hedgehog ? ho.cy - ho.ry : h.cy - h.ry;
  const head = mochi(h);
  const ground = g.body.cy + g.body.ry;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-18 -46 236 246" width={size} height={size} className={className} role="img" aria-label="펫">
      <defs>
        <clipPath id={headClipId}>
          <path d={head} />
        </clipPath>
        {!hedgehog && (
          <clipPath id={bodyClipId}>
            <path d={plumpBody(g.body)} />
          </clipPath>
        )}
      </defs>
      <ellipse cx={CX} cy={n(ground + 6)} rx="54" ry="7.5" fill={INK} opacity="0.16" />
      {hedgehog ? (
        hedgehogBody(stage, c)
      ) : (
        <>
          {behind(species, stage, g, c)}
          {bodyParts(species, stage, g, c, bodyClipId)}
          <path d={head} fill={c.body} />
          <g clipPath={`url(#${headClipId})`}>
            {headMarks(species, stage, g, c)}
            {/* 이마 상단 윤기 하이라이트 & 턱 아래 은은한 입체 셀 셰이딩 */}
            <ellipse
              cx={n(CX - h.rx * 0.25)}
              cy={n(h.cy - h.ry * 0.68)}
              rx={n(h.rx * 0.45)}
              ry={n(h.ry * 0.2)}
              fill="#ffffff"
              opacity="0.35"
              transform={`rotate(-12 ${n(CX - h.rx * 0.25)} ${n(h.cy - h.ry * 0.68)})`}
            />
            <path
              d={`M${n(CX - h.rx * 1.1)} ${n(h.cy + h.ry * 0.55)} Q${CX} ${n(h.cy + h.ry * 1.05)} ${n(CX + h.rx * 1.1)} ${n(h.cy + h.ry * 0.55)} L${n(CX + h.rx * 1.1)} ${n(h.cy + h.ry * 1.2)} L${n(CX - h.rx * 1.1)} ${n(h.cy + h.ry * 1.2)} Z`}
              fill={INK}
              opacity="0.06"
            />
          </g>
          <path d={head} fill="none" {...line} />
          {frontEars(species, stage, h, c)}
          {whiskers(species, g)}
        </>
      )}
      <Face expression={expression} g={g} species={species} c={c} />
      {adornment(species, stage, g)}
      {expression === 'sleep' && (
        <text x="148" y={n(top - 2)} fontSize="26" fontWeight="900" fill={INK}>
          Z<tspan fontSize="18" dy="-11">z</tspan>
        </text>
      )}
      {expression === 'excited' && (
        <>
          {star(22, top + 16, 9, '#ffe14d')}
          {star(182, top + 6, 7, '#ff8fc1')}
        </>
      )}
      {hat &&
        (() => {
          const a = hatAnchor(stage, species);
          return (
            <g transform={`translate(${a.x} ${a.y}) scale(${a.scale})`}>
              <HatShapeG {...hat} />
            </g>
          );
        })()}
    </svg>
  );
}

// ── 알 ─────────────────────────────────────────

const EGG_PATH = 'M100 28 C144 28 164 92 164 124 C164 162 136 180 100 180 C64 180 36 162 36 124 C36 92 56 28 100 28 Z';

const EGG_STYLE: Record<Exclude<Species, keyof typeof EGG_EXTRA>, { fill: string; pattern: ReactNode }> = {
  tiger: {
    fill: '#ffaa45',
    pattern: (
      <g stroke="#d96b18" strokeWidth="9" strokeLinecap="round" fill="none">
        <path d="M40 92 Q70 102 78 96" />
        <path d="M42 130 Q68 138 76 132" />
        <path d="M160 92 Q130 102 122 96" />
        <path d="M158 130 Q132 138 124 132" />
        <path d="M88 30 L94 54" />
        <path d="M112 30 L106 54" />
      </g>
    ),
  },
  cat: {
    fill: '#ffffff',
    pattern: (
      <>
        <ellipse cx="70" cy="70" rx="30" ry="26" fill="#9496a1" />
        <ellipse cx="134" cy="136" rx="23" ry="19" fill="#ffaa5c" />
        <ellipse cx="76" cy="150" rx="13" ry="10" fill="#9496a1" />
      </>
    ),
  },
  bunny: {
    fill: '#ffe3e8',
    pattern: (
      <g fill="#ff9eb3" stroke={INK} strokeWidth="3" strokeLinejoin="round">
        {[
          [78, 82, 1],
          [124, 118, 1.25],
          [86, 148, 0.9],
        ].map(([x, y, s]) => (
          <path
            key={x}
            transform={`translate(${x} ${y}) scale(${s})`}
            d="M0 10 C-14 0 -12 -10 -5 -10 C-2 -10 0 -7 0 -5 C0 -7 2 -10 5 -10 C12 -10 14 0 0 10 Z"
          />
        ))}
      </g>
    ),
  },
  hedgehog: {
    fill: '#fff3e2',
    pattern: (
      <path
        fill="#9c6644"
        d="M30 112 Q42 92 52 106 Q62 82 74 98 Q86 72 98 94 Q108 68 120 92 Q132 74 144 98 Q156 82 168 106 L170 40 L30 40 Z"
      />
    ),
  },
  cheese: {
    fill: '#ffd699',
    pattern: (
      <g stroke="#eb9c46" strokeWidth="10" strokeLinecap="round" fill="none">
        <path d="M60 70 Q100 82 140 70" />
        <path d="M44 112 Q100 126 156 112" />
        <path d="M52 150 Q100 162 148 150" />
      </g>
    ),
  },
};

const EGG_EXTRA: Record<'pig' | 'cow' | 'dog' | 'panda' | 'fox' | 'penguin', { fill: string; pattern: ReactNode }> = {
  pig: {
    fill: '#ffc9d6',
    pattern: (
      <g fill="#ff94b2">
        <circle cx="72" cy="78" r="9.5" />
        <circle cx="128" cy="96" r="12.5" />
        <circle cx="84" cy="138" r="11" />
        <circle cx="134" cy="150" r="7.5" />
        <circle cx="104" cy="56" r="6.5" />
      </g>
    ),
  },
  cow: {
    fill: '#ffffff',
    pattern: (
      <g fill="#393942">
        <path d="M40 70 Q70 52 84 78 Q78 104 52 98 Q36 88 40 70 Z" />
        <path d="M118 112 Q148 100 160 126 Q156 152 128 148 Q108 132 118 112 Z" />
        <ellipse cx="86" cy="160" rx="12" ry="9" />
      </g>
    ),
  },
  dog: {
    fill: '#fce4be',
    pattern: (
      <g fill="#b57242">
        <ellipse cx="128" cy="76" rx="22" ry="18" />
        <ellipse cx="70" cy="130" rx="16" ry="13" />
        <g transform="translate(118 140)">
          <circle cx="0" cy="6" r="7" />
          <circle cx="-9" cy="-4" r="3.5" />
          <circle cx="-3" cy="-9" r="3.5" />
          <circle cx="4" cy="-9" r="3.5" />
          <circle cx="10" cy="-4" r="3.5" />
        </g>
      </g>
    ),
  },
  panda: {
    fill: '#ffffff',
    pattern: (
      <>
        <ellipse cx="64" cy="58" rx="24" ry="20" fill="#2d2d35" />
        <ellipse cx="136" cy="58" rx="24" ry="20" fill="#2d2d35" />
        <g fill="#69db7c" stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M80 130 Q100 108 118 128 Q100 146 80 130 Z" />
          <path d="M104 152 Q126 138 138 156 Q120 170 104 152 Z" />
        </g>
      </>
    ),
  },
  fox: {
    fill: '#ff9340',
    pattern: <path fill="#fff8f0" d="M20 130 Q60 112 100 136 Q140 112 180 130 L180 200 L20 200 Z" />,
  },
  penguin: {
    fill: '#cfe8ff',
    pattern: (
      <g stroke="#ffffff" strokeWidth="4" strokeLinecap="round">
        {[
          [70, 74],
          [130, 104],
          [84, 146],
        ].map(([x, y]) => (
          <g key={x}>
            <path d={`M${x - 10} ${y} L${x + 10} ${y}`} />
            <path d={`M${x - 5} ${y - 9} L${x + 5} ${y + 9}`} />
            <path d={`M${x + 5} ${y - 9} L${x - 5} ${y + 9}`} />
          </g>
        ))}
      </g>
    ),
  },
};

const CRACKS = [
  'M70 104 L82 112 L76 122 L90 128',
  'M128 92 L118 104 L130 112 L120 124',
  'M88 150 L100 140 L108 152 L118 144',
];

export function EggSprite({ species, cracks = 0, size = 200, className }: { species: Species; cracks?: 0 | 1 | 2 | 3; size?: number; className?: string }) {
  const s = (EGG_STYLE as Record<string, { fill: string; pattern: ReactNode }>)[species] ?? EGG_EXTRA[species as keyof typeof EGG_EXTRA] ?? EGG_STYLE.cat;
  const clip = `egg-clip-${useId().replace(/:/g, '')}`;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width={size} height={size} className={className} role="img" aria-label="알">
      <defs>
        <clipPath id={clip}>
          <path d={EGG_PATH} />
        </clipPath>
      </defs>
      <ellipse cx="100" cy="186" rx="52" ry="8" fill={INK} opacity="0.16" />
      <path d={EGG_PATH} fill={s.fill} />
      <g clipPath={`url(#${clip})`}>
        {s.pattern}
        <path d="M30 142 Q100 166 170 142 L170 190 L30 190 Z" fill={INK} opacity="0.07" />
      </g>
      <path d={EGG_PATH} fill="none" stroke={INK} strokeWidth={STROKE} />
      <ellipse cx="74" cy="60" rx="9" ry="15" fill="#fff" opacity="0.68" transform="rotate(25 74 60)" />
      <circle cx="66" cy="80" r="4" fill="#fff" opacity="0.62" />
      {CRACKS.slice(0, cracks).map((d) => (
        <path key={d} d={d} fill="none" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
      ))}
    </svg>
  );
}
