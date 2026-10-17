/**
 * 자체 제작 펫 SVG — 설계서 13-2, 13-3.
 * 5종 × 성장 3단계(아기·어린이·다 자람) × 표정 7종. 알은 EggSprite.
 * 굵은 검은 테두리, 큰 머리, 발그레한 볼. 어린이부터 좌우 똑같은 짧은 팔을 배 위에 모으고,
 * 다 자라면 머리 모양은 어린이와 같고 몸이 길어져 키가 크며, 무늬가 짙어지고 종마다 장신구(스카프·방울·꽃·사과)가 생긴다.
 * 고슴도치는 머리와 몸이 하나인 동그란 몸에 가시 테두리, 두 손을 배 위에 모은다.
 */
import { type ReactNode, useId } from 'react';
import type { Species, Stage } from '../domain/pet';
import { INK } from './colors';
import { type HatArt, HatShapeG } from './HatSprite';

export type PetExpression = 'idle' | 'happy' | 'excited' | 'cheer' | 'sleep' | 'request' | 'eat';
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
  baby: { head: { cy: 106, rx: 62, ry: 50 }, body: { cy: 158, rx: 40, ry: 24 } },
  child: { head: { cy: 86, rx: 58, ry: 46 }, body: { cy: 148, rx: 36, ry: 32 } },
  adult: { head: { cy: 66, rx: 58, ry: 46 }, body: { cy: 138, rx: 42, ry: 46 } },
};

const GROW: Record<GrownStage, 0 | 1 | 2> = { baby: 0, child: 1, adult: 2 };

/** 모자를 씌울 머리 위 기준점 (M5 꾸미기에서 사용) */
export function hatAnchor(stage: GrownStage, species?: Species): { x: number; y: number; scale: number } {
  const h = species === 'hedgehog' ? HEDGE[stage] : GEO[stage].head;
  return { x: CX, y: h.cy - h.ry + (species === 'hedgehog' ? 2 : 6), scale: stage === 'baby' ? 0.9 : 0.95 };
}

/** 고슴도치: 머리와 몸이 하나인 동그란 몸 */
const HEDGE: Record<GrownStage, Oval> = {
  baby: { cy: 130, rx: 56, ry: 50 },
  child: { cy: 118, rx: 60, ry: 60 },
  adult: { cy: 110, rx: 64, ry: 68 },
};

interface Palette {
  body: string;
  belly: string;
  mark: string;
  inner: string;
  blush: string;
}

const COLORS: Record<Species, Palette> = {
  tiger: { body: '#f7a23e', belly: '#ffe6c2', mark: '#e0781f', inner: '#ffc98a', blush: '#ff8a5c' },
  cat: { body: '#ffffff', belly: '#ffffff', mark: '#a3a3ab', inner: '#ffc2cf', blush: '#ffadbd' },
  bunny: { body: '#ffdfe2', belly: '#fff3f4', mark: '#ffbfc7', inner: '#ffadbb', blush: '#ff9eab' },
  hedgehog: { body: '#94603d', belly: '#fdeed8', mark: '#6f4428', inner: '#cf9a70', blush: '#ffa79a' },
  cheese: { body: '#fcd39e', belly: '#fff2df', mark: '#f0a95e', inner: '#ffbfb0', blush: '#ffa58c' },
};

const line = { stroke: INK, strokeWidth: STROKE, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

function star(cx: number, cy: number, r: number, fill: string, key?: string) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
  }).join(' ');
  return <polygon key={key} points={pts} fill={fill} stroke={INK} strokeWidth="3" strokeLinejoin="round" />;
}

/** 옆이 살짝 각진 찹쌀떡 모양 (머리) */
function mochi(o: Oval): string {
  const l = CX - o.rx;
  const r = CX + o.rx;
  const mid = o.cy + o.ry * 0.05;
  return `M${l} ${mid} C${l} ${o.cy - o.ry * 1.33} ${r} ${o.cy - o.ry * 1.33} ${r} ${mid} C${r} ${o.cy + o.ry * 1.25} ${l} ${o.cy + o.ry * 1.25} ${l} ${mid} Z`;
}

/** 테두리가 있는 굵은 팔다리·꼬리 (검은 굵은 선 위에 색 선을 겹친다) */
function limb(d: string, fill: string, width: number, key?: string, stripes?: string) {
  return (
    <g key={key}>
      <path d={d} fill="none" stroke={INK} strokeWidth={width + STROKE * 2} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={fill} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      {stripes && <path d={d} fill="none" stroke={stripes} strokeWidth={width} strokeDasharray="5 9" strokeDashoffset="-6" />}
    </g>
  );
}

/** 고슴도치 가시 (머리 둘레 톱니) */
function spikes(h: Oval, grow: number, fill: string) {
  const n = 16 + grow * 2;
  const out = 1.18 + grow * 0.05;
  const pts = Array.from({ length: n * 2 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const k = i % 2 === 0 ? out : 0.98;
    return `${(CX + Math.cos(a) * h.rx * k).toFixed(1)},${(h.cy + Math.sin(a) * h.ry * k).toFixed(1)}`;
  }).join(' ');
  return <polygon {...line} strokeWidth="4" points={pts} fill={fill} />;
}

/** 머리·몸 뒤: 꼬리와 귀 */
function behind(species: Species, stage: GrownStage, g: Geo, c: Palette): ReactNode {
  const { head: h, body: b } = g;
  const grow = GROW[stage];
  const top = h.cy - h.ry;
  // 꼬리는 왼쪽 (오른손을 흔드니까)
  const tailBase = { x: CX - b.rx + 8, y: b.cy + b.ry * 0.45 };
  const curl = (len: number) =>
    `M${tailBase.x} ${tailBase.y} Q${tailBase.x - len} ${tailBase.y + 6} ${tailBase.x - len * 0.9} ${tailBase.y - len * 0.75} Q${tailBase.x - len * 0.75} ${tailBase.y - len * 1.05} ${tailBase.x - len * 0.45} ${tailBase.y - len * 0.95}`;
  const catEar = (dir: 1 | -1, fill: string, inner: string) => {
    const bx = CX + dir * h.rx * 0.42;
    const ox = CX + dir * h.rx * 0.92;
    const tipX = CX + dir * h.rx * (0.78 + grow * 0.03);
    const tipY = top - 18 - grow * 5;
    return (
      <g key={dir}>
        <path {...line} fill={fill} d={`M${bx} ${top + 12} Q${tipX - dir * 10} ${tipY - 4} ${tipX} ${tipY} Q${ox + dir * 6} ${top + 2} ${ox} ${top + 28} Z`} />
        <path fill={inner} d={`M${bx + dir * 10} ${top + 14} Q${tipX - dir * 6} ${tipY + 8} ${tipX - dir * 1} ${tipY + 12} Q${ox - dir * 2} ${top + 12} ${ox - dir * 6} ${top + 24} Z`} />
      </g>
    );
  };

  switch (species) {
    case 'tiger': {
      const ear = (dir: 1 | -1) => {
        const x = CX + dir * h.rx * 0.66;
        const y = top + 8;
        const r = 15 + grow;
        return (
          <g key={dir}>
            <circle {...line} cx={x} cy={y} r={r} fill={c.body} />
            <circle cx={x} cy={y + 2} r={r * 0.5} fill={c.mark} opacity="0.55" />
          </g>
        );
      };
      return (
        <>
          {stage === 'baby'
            ? limb(`M${tailBase.x} ${tailBase.y} Q${tailBase.x - 22} ${tailBase.y + 2} ${tailBase.x - 24} ${tailBase.y - 14}`, c.body, 12)
            : limb(curl(26 + grow * 6), c.body, 13 + grow * 2, undefined, c.mark)}
          {ear(-1)}
          {ear(1)}
        </>
      );
    }
    case 'cat':
      return (
        <>
          {stage === 'baby'
            ? limb(`M${tailBase.x} ${tailBase.y} Q${tailBase.x - 22} ${tailBase.y + 2} ${tailBase.x - 24} ${tailBase.y - 14}`, c.mark, 11)
            : limb(curl(26 + grow * 7), c.mark, 11 + grow * 2)}
          {catEar(-1, c.mark, c.inner)}
          {catEar(1, c.body, c.inner)}
        </>
      );
    case 'cheese':
      return (
        <>
          {stage === 'baby'
            ? limb(`M${tailBase.x} ${tailBase.y} Q${tailBase.x - 22} ${tailBase.y + 2} ${tailBase.x - 24} ${tailBase.y - 14}`, c.body, 11, undefined, c.mark)
            : limb(curl(26 + grow * 7), c.body, 11 + grow * 2, undefined, c.mark)}
          {catEar(-1, c.body, c.inner)}
          {catEar(1, c.body, c.inner)}
        </>
      );
    case 'bunny': {
      const len = 30 + grow * 9;
      const ear = (dir: 1 | -1) => {
        // 다 자라면 한쪽 귀가 살짝 접힌다
        const tilt = dir * (8 + grow * 2) + (stage === 'adult' && dir === 1 ? 26 : 0);
        const x = CX + dir * h.rx * 0.36;
        const y = top + 6 - len / 2;
        return (
          <g key={dir} transform={`rotate(${tilt} ${x} ${top + 10})`}>
            <ellipse {...line} cx={x} cy={y} rx={13 + grow} ry={len / 2 + 8} fill={c.body} />
            <ellipse cx={x} cy={y + 4} rx={6 + grow * 0.5} ry={len / 2 - 2} fill={c.inner} />
          </g>
        );
      };
      return (
        <>
          <circle {...line} cx={CX - b.rx + 2} cy={b.cy + b.ry * 0.35} r={10 + grow * 2} fill={c.belly} />
          {ear(-1)}
          {ear(1)}
        </>
      );
    }
    case 'hedgehog':
      return null;
  }
}

/** 몸 앞: 배, 발, 팔 선 */
function bodyParts(species: Species, stage: GrownStage, g: Geo, c: Palette): ReactNode {
  const b = g.body;
  const bottom = b.cy + b.ry;
  const bodyFill = species === 'hedgehog' ? c.belly : c.body;
  const footFill = species === 'cat' ? c.body : bodyFill;
  const armCurve = (dir: 1 | -1) =>
    `M${CX + dir * (b.rx - 7)} ${b.cy - b.ry * 0.35} Q${CX + dir * (b.rx - 2)} ${b.cy + b.ry * 0.25} ${CX + dir * (b.rx - 16)} ${b.cy + b.ry * 0.32}`;
  return (
    <>
      <ellipse {...line} cx={CX} cy={b.cy} rx={b.rx} ry={b.ry} fill={bodyFill} />
      {species !== 'hedgehog' && species !== 'cat' && (
        <ellipse cx={CX} cy={b.cy + b.ry * 0.2} rx={b.rx * 0.55} ry={b.ry * 0.55} fill={c.belly} />
      )}
      {species === 'cat' && stage !== 'baby' && <ellipse cx={CX + b.rx * 0.45} cy={b.cy + b.ry * 0.05} rx={b.rx * 0.28} ry={b.ry * 0.3} fill={c.mark} />}
      {species === 'tiger' &&
        stage === 'adult' &&
        [-1, 1].map((dir) => (
          <path key={dir} d={`M${CX + dir * b.rx} ${b.cy - 4} q${-dir * 12} 4 ${-dir * 14} 12`} stroke={c.mark} strokeWidth="5" fill="none" strokeLinecap="round" />
        ))}
      <ellipse {...line} cx={CX - b.rx * 0.42} cy={bottom - 3} rx={13} ry={8} fill={footFill} />
      <ellipse {...line} cx={CX + b.rx * 0.42} cy={bottom - 3} rx={13} ry={8} fill={footFill} />
      {stage === 'baby'
        ? [-1, 1].map((dir) => <path key={dir} d={armCurve(dir as 1 | -1)} {...line} strokeWidth="4" fill="none" />)
        : // 어린이부터: 좌우 똑같은 짧은 팔, 동그란 손을 배 위에 모은다
          [-1, 1].map((dir) =>
            limb(
              `M${CX + dir * b.rx * 0.8} ${b.cy - b.ry * 0.42} Q${CX + dir * b.rx * 0.92} ${b.cy + b.ry * 0.08} ${CX + dir * b.rx * 0.48} ${b.cy + b.ry * 0.2}`,
              footFill,
              13,
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
    <path key={key} d={`M${x} ${y} l0 ${len}`} stroke={c.mark} strokeWidth={w} strokeLinecap="round" />
  );
  switch (species) {
    case 'tiger':
      return (
        <>
          {[-12, 0, 12].map((dx, i) => stripe(CX + dx, top + 2, (i === 1 ? 16 : 11) + grow * 3, i, 5 + grow))}
          {grow > 0 &&
            [-1, 1].map((dir) => (
              <g key={dir} stroke={c.mark} strokeWidth={4 + grow} strokeLinecap="round" fill="none">
                <path d={`M${CX + dir * h.rx} ${h.cy - 8} l${-dir * 14} 3`} />
                <path d={`M${CX + dir * h.rx} ${h.cy + 4} l${-dir * 11} 2`} />
              </g>
            ))}
        </>
      );
    case 'cat':
      return (
        <>
          <ellipse cx={CX - h.rx * 0.62} cy={top + h.ry * 0.25} rx={h.rx * 0.6} ry={h.ry * 0.62} fill={c.mark} />
          {grow > 0 && <ellipse cx={CX + h.rx * 0.82} cy={top + h.ry * 0.1} rx={h.rx * 0.3} ry={h.ry * 0.3} fill="#f6a35a" />}
        </>
      );
    case 'cheese':
      return [-10, 0, 10].map((dx, i) => stripe(CX + dx, top + 2, (i === 1 ? 13 : 9) + grow * 3, i, 4 + grow));
    case 'bunny':
      return null;
    case 'hedgehog':
      return null;
  }
}

/** 다 자란 펫의 장신구 (머리 앞) */
function adornment(species: Species, stage: GrownStage, g: Geo): ReactNode {
  if (stage !== 'adult') return null;
  const neckY = g.head.cy + g.head.ry * 0.95;
  const scarf = (fill: string) => (
    <g {...line} strokeWidth="4" fill={fill}>
      <path d={`M${CX - 34} ${neckY - 4} Q${CX} ${neckY + 12} ${CX + 34} ${neckY - 4} L${CX + 32} ${neckY + 8} Q${CX} ${neckY + 22} ${CX - 32} ${neckY + 8} Z`} />
      <path d={`M${CX - 20} ${neckY + 10} L${CX - 26} ${neckY + 34} L${CX - 10} ${neckY + 30} L${CX - 8} ${neckY + 12} Z`} />
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
          <path {...line} strokeWidth="4" fill="#ff6b6b" d={`M${CX - 30} ${neckY - 2} Q${CX} ${neckY + 10} ${CX + 30} ${neckY - 2} L${CX + 30} ${neckY + 6} Q${CX} ${neckY + 18} ${CX - 30} ${neckY + 6} Z`} />
          <circle {...line} strokeWidth="3.5" cx={CX} cy={neckY + 18} r="8" fill="#ffd43b" />
          <path d={`M${CX - 7} ${neckY + 18} L${CX + 7} ${neckY + 18}`} stroke={INK} strokeWidth="2.5" />
        </g>
      );
    case 'bunny': {
      // 귀에 꽂은 꽃
      const x = CX + 30;
      const y = g.head.cy - g.head.ry + 4;
      return (
        <g>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle
              key={a}
              {...line}
              strokeWidth="3"
              cx={x + Math.cos((a * Math.PI) / 180) * 8}
              cy={y + Math.sin((a * Math.PI) / 180) * 8}
              r="6.5"
              fill="#fff59d"
            />
          ))}
          <circle {...line} strokeWidth="3" cx={x} cy={y} r="5" fill="#ff922b" />
        </g>
      );
    }
    case 'hedgehog':
      return null;
  }
}

/** 고슴도치 한 덩어리 몸 (가시·귀·크림색 얼굴과 배·발·배 위에 모은 손·장식) */
function hedgehogBody(stage: GrownStage, c: Palette): ReactNode {
  const o = HEDGE[stage];
  const grow = GROW[stage];
  const L = CX - o.rx * 0.8;
  const R = CX + o.rx * 0.8;
  const top = o.cy - o.ry * 0.62;
  const mid = o.cy + o.ry * 0.05;
  const bottom = o.cy + o.ry * 1.1;
  const hand = (dir: 1 | -1) =>
    limb(
      `M${CX + dir * o.rx * 0.6} ${o.cy + o.ry * 0.42} L${CX + dir * o.rx * 0.36} ${o.cy + o.ry * 0.54}`,
      c.belly,
      13,
      String(dir),
    );
  const ax = CX + o.rx * 0.62;
  const ay = o.cy - o.ry * 0.98;
  return (
    <>
      {spikes(o, grow, c.body)}
      {[-1, 1].map((dir) => (
        <g key={dir}>
          <circle {...line} cx={CX + dir * o.rx * 0.55} cy={o.cy - o.ry * 0.78} r="10" fill={c.body} />
          <circle cx={CX + dir * o.rx * 0.55} cy={o.cy - o.ry * 0.76} r="4.5" fill={c.inner} />
        </g>
      ))}
      <ellipse {...line} cx={CX} cy={o.cy} rx={o.rx} ry={o.ry} fill={c.body} />
      <path
        {...line}
        strokeWidth="3.5"
        fill={c.belly}
        d={`M${L} ${mid} C${L} ${top} ${CX - 14} ${top - 6} ${CX} ${top + 8} C${CX + 14} ${top - 6} ${R} ${top} ${R} ${mid} C${R} ${bottom} ${L} ${bottom} ${L} ${mid} Z`}
      />
      <ellipse {...line} cx={CX - o.rx * 0.36} cy={o.cy + o.ry - 2} rx="14" ry="9" fill={c.belly} />
      <ellipse {...line} cx={CX + o.rx * 0.36} cy={o.cy + o.ry - 2} rx="14" ry="9" fill={c.belly} />
      {grow > 0 && hand(-1)}
      {grow > 0 && hand(1)}
      {grow === 1 && <path {...line} strokeWidth="3" fill="#69db7c" d={`M${CX + 6} ${o.cy - o.ry - 6} q12 -14 24 -6 q-10 12 -24 6 Z`} />}
      {grow === 2 && (
        <g>
          <circle {...line} strokeWidth="4" cx={ax} cy={ay} r="14" fill="#ff5c5c" />
          <path d={`M${ax} ${ay - 13} l2 -8`} stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <path {...line} strokeWidth="3" fill="#69db7c" d={`M${ax + 2} ${ay - 17} q10 -8 16 -2 q-8 8 -16 2 Z`} />
          <ellipse cx={ax - 5} cy={ay - 4} rx="3" ry="4.5" fill="#fff" opacity="0.7" />
        </g>
      )}
    </>
  );
}

function whiskers(species: Species, g: Geo): ReactNode {
  if (species !== 'cat' && species !== 'cheese' && species !== 'bunny') return null;
  const h = g.head;
  const y = h.cy + h.ry * 0.3;
  const from = h.rx - 8;
  return (
    <g stroke={INK} strokeWidth="2.5" strokeLinecap="round">
      {[-1, 1].map((dir) => (
        <g key={dir}>
          <line x1={CX + dir * from} y1={y - 4} x2={CX + dir * (from + 18)} y2={y - 8} />
          <line x1={CX + dir * from} y1={y + 3} x2={CX + dir * (from + 18)} y2={y + 5} />
        </g>
      ))}
    </g>
  );
}

function Face({ expression, g, species, blush }: { expression: PetExpression; g: Geo; species: Species; blush: string }) {
  const h = g.head;
  const big = species === 'hedgehog';
  const y = h.cy + h.ry * (big ? 0.12 : 0.05);
  const spread = h.rx * (big ? 0.34 : 0.38);
  const L = CX - spread;
  const R = CX + spread;
  const er = big ? { rx: 9, ry: 10.5 } : { rx: 6, ry: 7.5 };
  const eyes = (() => {
    switch (expression) {
      case 'idle':
        return (
          <g className="pet-eyes" style={{ transformOrigin: `${CX}px ${y}px` }}>
            {[L, R].map((x) => (
              <g key={x}>
                <ellipse cx={x} cy={y} rx={er.rx} ry={er.ry} fill={INK} />
                {big ? (
                  <>
                    <circle cx={x + 3} cy={y - 4} r="3.5" fill="#fff" />
                    <circle cx={x - 3} cy={y + 4} r="1.8" fill="#fff" />
                  </>
                ) : (
                  <circle cx={x + 2} cy={y - 3} r="2" fill="#fff" />
                )}
              </g>
            ))}
          </g>
        );
      case 'happy':
      case 'eat':
        return [L, R].map((x) => (
          <path key={x} d={`M${x - 8} ${y + 3} Q${x} ${y - 8} ${x + 8} ${y + 3}`} stroke={INK} strokeWidth="4.5" fill="none" strokeLinecap="round" />
        ));
      case 'excited':
        return [L, R].map((x) => <g key={x}>{star(x, y, big ? 11 : 9, INK)}</g>);
      case 'cheer':
        return [L, R].map((x, i) => (
          <g key={x}>
            <ellipse cx={x} cy={y + 2} rx={er.rx} ry={er.ry} fill={INK} />
            <circle cx={x + 1.5} cy={y - 1} r="1.8" fill="#fff" />
            <path d={i === 0 ? `M${x - 9} ${y - 13} L${x + 7} ${y - 9}` : `M${x - 7} ${y - 9} L${x + 9} ${y - 13}`} stroke={INK} strokeWidth="4" strokeLinecap="round" />
          </g>
        ));
      case 'sleep':
        return [L, R].map((x) => (
          <path key={x} d={`M${x - 8} ${y} Q${x} ${y + 7} ${x + 8} ${y}`} stroke={INK} strokeWidth="4.5" fill="none" strokeLinecap="round" />
        ));
      case 'request':
        return [L, R].map((x) => (
          <g key={x}>
            <circle cx={x} cy={y} r={big ? 12 : 9} fill={INK} />
            <circle cx={x + 3} cy={y - 3} r={big ? 4.5 : 3.5} fill="#fff" />
            <circle cx={x - 3} cy={y + 4} r="2" fill="#fff" />
          </g>
        ));
    }
  })();

  const open = expression === 'happy' || expression === 'excited' || expression === 'eat' || expression === 'cheer';
  const my = y + (big ? 20 : 14);
  const mouth =
    expression === 'eat' ? (
      <g>
        <circle cx={CX} cy={my + 2} r="7.5" fill={INK} />
        <ellipse cx={CX} cy={my + 6} rx="4.5" ry="2.5" fill="#ff6b8b" />
      </g>
    ) : open ? (
      <g>
        <path d={`M${CX - 7} ${my - 2} Q${CX} ${my + 12} ${CX + 7} ${my - 2} Z`} fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <ellipse cx={CX} cy={my + 5} rx="3.5" ry="2.2" fill="#ff7b95" />
      </g>
    ) : expression === 'request' || expression === 'sleep' ? (
      <ellipse cx={CX} cy={my + 1} rx="3.5" ry="3" fill={INK} />
    ) : (
      <path d={`M${CX - 6.5} ${my - 2} Q${CX - 3.2} ${my + 3.5} ${CX} ${my - 0.5} Q${CX + 3.2} ${my + 3.5} ${CX + 6.5} ${my - 2}`} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    );

  return (
    <g>
      <ellipse cx={L - 13} cy={y + 12} rx="12" ry="7.5" fill={blush} opacity="0.8" />
      <ellipse cx={R + 13} cy={y + 12} rx="12" ry="7.5" fill={blush} opacity="0.8" />
      {eyes}
      {big && <ellipse cx={CX} cy={y + 9} rx="5" ry="3.8" fill={INK} />}
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
  const clip = `pet-head-${useId().replace(/:/g, '')}`;
  const hedgehog = species === 'hedgehog';
  const c = COLORS[species] ?? COLORS.cat;
  const ho = HEDGE[stage];
  // 고슴도치는 몸 위쪽을 '머리'로 보고 얼굴을 그린다
  const g: Geo = hedgehog ? { head: { cy: ho.cy - ho.ry * 0.3, rx: ho.rx * 0.8, ry: ho.ry * 0.5 }, body: ho } : GEO[stage];
  const h = g.head;
  const top = hedgehog ? ho.cy - ho.ry : h.cy - h.ry;
  const head = mochi(h);
  const ground = g.body.cy + g.body.ry;
  return (
    <svg viewBox="-10 -14 220 214" width={size} height={size} className={className} role="img" aria-label="펫">
      <defs>
        <clipPath id={clip}>
          <path d={head} />
        </clipPath>
      </defs>
      <ellipse cx={CX} cy={ground + 6} rx="56" ry="7" fill={INK} opacity="0.15" />
      {hedgehog ? (
        hedgehogBody(stage, c)
      ) : (
        <>
          {behind(species, stage, g, c)}
          {bodyParts(species, stage, g, c)}
          <path d={head} fill={c.body} />
          <g clipPath={`url(#${clip})`}>{headMarks(species, stage, g, c)}</g>
          <path d={head} fill="none" {...line} />
          {whiskers(species, g)}
        </>
      )}
      <Face expression={expression} g={g} species={species} blush={c.blush} />
      {adornment(species, stage, g)}
      {expression === 'sleep' && (
        <text x="150" y={top - 2} fontSize="28" fontWeight="900" fill={INK}>
          Z<tspan fontSize="20" dy="-12">z</tspan>
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

const EGG_PATH = 'M100 26 C142 26 162 92 162 122 C162 160 134 180 100 180 C66 180 38 160 38 122 C38 92 58 26 100 26 Z';

const EGG_STYLE: Record<Species, { fill: string; pattern: ReactNode }> = {
  tiger: {
    fill: '#f7a23e',
    pattern: (
      <g stroke="#e0781f" strokeWidth="9" strokeLinecap="round" fill="none">
        <path d="M40 92 L70 100" />
        <path d="M40 130 L66 134" />
        <path d="M160 92 L130 100" />
        <path d="M160 130 L134 134" />
        <path d="M88 30 L94 54" />
        <path d="M112 30 L106 54" />
      </g>
    ),
  },
  cat: {
    fill: '#ffffff',
    pattern: (
      <>
        <ellipse cx="72" cy="70" rx="30" ry="26" fill="#a3a3ab" />
        <ellipse cx="132" cy="138" rx="22" ry="18" fill="#f6a35a" />
        <ellipse cx="78" cy="150" rx="12" ry="10" fill="#a3a3ab" />
      </>
    ),
  },
  bunny: {
    fill: '#ffdfe2',
    pattern: (
      <g fill="#ffadbb" stroke={INK} strokeWidth="3" strokeLinejoin="round">
        {[
          [78, 82, 1],
          [124, 118, 1.3],
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
    fill: '#fdeed8',
    pattern: (
      <path
        fill="#94603d"
        d="M30 112 L44 92 L52 106 L62 80 L72 98 L84 70 L94 92 L104 64 L112 90 L124 70 L132 96 L144 80 L150 104 L162 96 L170 40 L30 40 Z"
      />
    ),
  },
  cheese: {
    fill: '#fcd39e',
    pattern: (
      <g stroke="#f0a95e" strokeWidth="10" strokeLinecap="round" fill="none">
        <path d="M60 70 Q100 82 140 70" />
        <path d="M44 112 Q100 126 156 112" />
        <path d="M52 150 Q100 162 148 150" />
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
  const s = EGG_STYLE[species] ?? EGG_STYLE.cat;
  const clip = `egg-clip-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} role="img" aria-label="알">
      <defs>
        <clipPath id={clip}>
          <path d={EGG_PATH} />
        </clipPath>
      </defs>
      <ellipse cx="100" cy="186" rx="52" ry="8" fill={INK} opacity="0.15" />
      <path d={EGG_PATH} fill={s.fill} />
      <g clipPath={`url(#${clip})`}>{s.pattern}</g>
      <path d={EGG_PATH} fill="none" stroke={INK} strokeWidth={STROKE} />
      <ellipse cx="74" cy="60" rx="9" ry="14" fill="#fff" opacity="0.6" transform="rotate(25 74 60)" />
      {CRACKS.slice(0, cracks).map((d) => (
        <path key={d} d={d} fill="none" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
      ))}
    </svg>
  );
}
