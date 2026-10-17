/**
 * 자체 제작 펫 SVG — 설계서 13-2, 13-3.
 * 11종 × 성장 3단계(아기·어린이·다 자람) × 표정 7종. 알은 EggSprite.
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
  pig: { body: '#ffc7d1', belly: '#ffe3e8', mark: '#ff9fb3', inner: '#ff9fb3', blush: '#ff8fa6' },
  cow: { body: '#ffffff', belly: '#ffffff', mark: '#3b3b40', inner: '#ffc2cf', blush: '#ffadbd' },
  dog: { body: '#fbe3bf', belly: '#fff4e2', mark: '#b9784a', inner: '#e7a77a', blush: '#ffa58c' },
  panda: { body: '#ffffff', belly: '#ffffff', mark: '#2e2e33', inner: '#2e2e33', blush: '#ffadbd' },
  fox: { body: '#f6913e', belly: '#fff6ea', mark: '#5b3a29', inner: '#ffe0c7', blush: '#ff7f6a' },
  penguin: { body: '#3f5f8f', belly: '#ffffff', mark: '#ffc53d', inner: '#ffffff', blush: '#ff9eb0' },
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
    case 'penguin':
      return null;
    case 'pig': {
      // 바깥으로 살짝 접힌 세모 귀, 돌돌 말린 꼬리
      const ear = (dir: 1 | -1) => (
        <g key={dir}>
          <path {...line} fill={c.body} d={`M${CX + dir * h.rx * 0.3} ${top + 10} Q${CX + dir * h.rx * 0.7} ${top - 16 - grow * 3} ${CX + dir * h.rx * 1.02} ${top - 4 - grow * 3} Q${CX + dir * h.rx * 0.96} ${top + 16} ${CX + dir * h.rx * 0.84} ${top + 28} Z`} />
          <path fill={c.inner} d={`M${CX + dir * h.rx * 0.45} ${top + 10} Q${CX + dir * h.rx * 0.72} ${top - 6 - grow * 3} ${CX + dir * h.rx * 0.92} ${top + 2 - grow * 3} Q${CX + dir * h.rx * 0.88} ${top + 16} ${CX + dir * h.rx * 0.8} ${top + 22} Z`} />
        </g>
      );
      const tx = tailBase.x;
      const ty = tailBase.y - 4;
      return (
        <>
          {limb(`M${tx} ${ty} c-12 0 -16 -12 -8 -15 c7 -2 8 8 1 8`, c.body, 6)}
          {ear(-1)}
          {ear(1)}
        </>
      );
    }
    case 'cow': {
      // 작은 뿔 + 옆으로 뻗은 귀, 끝에 술이 달린 꼬리
      const horn = (dir: 1 | -1) => (
        <path key={`h${dir}`} {...line} strokeWidth="4" fill="#fff1c9" d={`M${CX + dir * h.rx * 0.28} ${top + 8} Q${CX + dir * h.rx * 0.34} ${top - 14 - grow * 4} ${CX + dir * h.rx * 0.48} ${top - 10 - grow * 4} Q${CX + dir * h.rx * 0.5} ${top + 2} ${CX + dir * h.rx * 0.48} ${top + 10} Z`} />
      );
      const ear = (dir: 1 | -1) => {
        const x = CX + dir * h.rx * 0.98;
        const y = h.cy - h.ry * 0.38;
        return (
          <g key={`e${dir}`} transform={`rotate(${dir * 22} ${x} ${y})`}>
            <ellipse {...line} cx={x} cy={y} rx={17} ry={9} fill={dir === 1 ? c.mark : c.body} />
            <ellipse cx={x + dir * 2} cy={y} rx={9} ry={4} fill={c.inner} />
          </g>
        );
      };
      const tx = tailBase.x;
      const ty = tailBase.y;
      return (
        <>
          {limb(`M${tx} ${ty} Q${tx - 20} ${ty + 4} ${tx - 22} ${ty - 18 - grow * 6}`, c.body, 6)}
          <ellipse {...line} strokeWidth="4" cx={tx - 22} cy={ty - 22 - grow * 6} rx="6" ry="8" fill={c.mark} />
          {horn(-1)}
          {horn(1)}
          {ear(-1)}
          {ear(1)}
        </>
      );
    }
    case 'dog':
      // 귀는 머리 앞에 늘어뜨린다 (frontEars). 꼬리는 위로 살랑.
      return limb(`M${tailBase.x} ${tailBase.y} Q${tailBase.x - 22} ${tailBase.y - 2} ${tailBase.x - 22 - grow * 3} ${tailBase.y - 22 - grow * 6}`, c.body, 11 + grow);
    case 'panda': {
      const ear = (dir: 1 | -1) => <circle key={dir} {...line} cx={CX + dir * h.rx * 0.68} cy={top + 8} r={15 + grow} fill={c.mark} />;
      return (
        <>
          {ear(-1)}
          {ear(1)}
        </>
      );
    }
    case 'fox': {
      // 크고 뾰족한 귀(끝이 짙은 갈색), 끝이 하얀 풍성한 꼬리
      const len = 28 + grow * 8;
      const w = 18 + grow * 5;
      const end = { x: tailBase.x - len * 0.45, y: tailBase.y - len * 0.95 };
      return (
        <>
          {stage === 'baby'
            ? limb(`M${tailBase.x} ${tailBase.y} Q${tailBase.x - 24} ${tailBase.y + 2} ${tailBase.x - 26} ${tailBase.y - 16}`, c.body, 16)
            : limb(curl(len), c.body, w)}
          {stage === 'baby' ? (
            <circle {...line} cx={tailBase.x - 26} cy={tailBase.y - 18} r="9" fill={c.belly} />
          ) : (
            <circle {...line} cx={end.x} cy={end.y} r={w * 0.45} fill={c.belly} />
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
    const x = CX + dir * h.rx * 0.86;
    const y = h.cy - h.ry * 0.25 + grow * 2;
    return (
      <ellipse
        key={dir}
        {...line}
        cx={x}
        cy={y}
        rx={13 + grow}
        ry={24 + grow * 3}
        fill={c.mark}
        transform={`rotate(${dir * -14} ${x} ${y - 20})`}
      />
    );
  });
}

/** 몸 앞: 배, 발, 팔 선 */
function bodyParts(species: Species, stage: GrownStage, g: Geo, c: Palette): ReactNode {
  const b = g.body;
  const bottom = b.cy + b.ry;
  const bodyFill = species === 'hedgehog' ? c.belly : c.body;
  // 판다는 팔다리가 까맣고, 펭귄은 발이 노랗다
  const footFill = species === 'panda' || species === 'penguin' ? c.mark : bodyFill;
  const armFill = species === 'panda' ? c.mark : bodyFill;
  const plainBelly = species === 'hedgehog' || species === 'cat' || species === 'cow' || species === 'panda';
  const armCurve = (dir: 1 | -1) =>
    `M${CX + dir * (b.rx - 7)} ${b.cy - b.ry * 0.35} Q${CX + dir * (b.rx - 2)} ${b.cy + b.ry * 0.25} ${CX + dir * (b.rx - 16)} ${b.cy + b.ry * 0.32}`;
  return (
    <>
      <ellipse {...line} cx={CX} cy={b.cy} rx={b.rx} ry={b.ry} fill={bodyFill} />
      {!plainBelly && (
        <ellipse
          cx={CX}
          cy={b.cy + b.ry * (species === 'penguin' ? 0.1 : 0.2)}
          rx={b.rx * (species === 'penguin' ? 0.74 : 0.55)}
          ry={b.ry * (species === 'penguin' ? 0.78 : 0.55)}
          fill={c.belly}
        />
      )}
      {(species === 'cat' || species === 'cow') && stage !== 'baby' && (
        <ellipse cx={CX + b.rx * 0.45} cy={b.cy + b.ry * 0.05} rx={b.rx * 0.28} ry={b.ry * 0.3} fill={species === 'cow' ? c.mark : c.mark} />
      )}
      {species === 'cow' && stage !== 'baby' && <ellipse cx={CX - b.rx * 0.5} cy={b.cy + b.ry * 0.45} rx={b.rx * 0.22} ry={b.ry * 0.2} fill={c.mark} />}
      {species === 'tiger' &&
        stage === 'adult' &&
        [-1, 1].map((dir) => (
          <path key={dir} d={`M${CX + dir * b.rx} ${b.cy - 4} q${-dir * 12} 4 ${-dir * 14} 12`} stroke={c.mark} strokeWidth="5" fill="none" strokeLinecap="round" />
        ))}
      <ellipse {...line} cx={CX - b.rx * 0.42} cy={bottom - 3} rx={13} ry={8} fill={footFill} />
      <ellipse {...line} cx={CX + b.rx * 0.42} cy={bottom - 3} rx={13} ry={8} fill={footFill} />
      {species === 'penguin'
        ? // 펭귄: 양옆으로 내린 날개
          [-1, 1].map((dir) =>
            limb(
              `M${CX + dir * b.rx * 0.82} ${b.cy - b.ry * 0.45} Q${CX + dir * (b.rx + 12)} ${b.cy} ${CX + dir * (b.rx + 6)} ${b.cy + b.ry * 0.38}`,
              c.body,
              10 + GROW[stage] * 2,
              String(dir),
            ),
          )
        : stage === 'baby'
          ? [-1, 1].map((dir) => <path key={dir} d={armCurve(dir as 1 | -1)} {...line} strokeWidth="4" fill="none" />)
          : // 어린이부터: 좌우 똑같은 짧은 팔, 동그란 손을 배 위에 모은다
            [-1, 1].map((dir) =>
              limb(
                `M${CX + dir * b.rx * 0.8} ${b.cy - b.ry * 0.42} Q${CX + dir * b.rx * 0.92} ${b.cy + b.ry * 0.08} ${CX + dir * b.rx * 0.48} ${b.cy + b.ry * 0.2}`,
                armFill,
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
    case 'cow':
      return (
        <>
          <ellipse cx={CX + h.rx * 0.62} cy={top + h.ry * 0.3} rx={h.rx * 0.48} ry={h.ry * 0.52} fill={c.mark} />
          {grow > 0 && <ellipse cx={CX - h.rx * 0.95} cy={h.cy + h.ry * 0.1} rx={h.rx * 0.28} ry={h.ry * 0.36} fill={c.mark} />}
        </>
      );
    case 'dog':
      return <ellipse cx={CX - h.rx * 0.4} cy={h.cy - h.ry * 0.02} rx={h.rx * 0.26} ry={h.ry * 0.32} fill={c.mark} />;
    case 'panda':
      return [-1, 1].map((dir) => (
        <ellipse
          key={dir}
          cx={CX + dir * h.rx * 0.39}
          cy={h.cy + h.ry * 0.1}
          rx="13"
          ry="17"
          fill={c.mark}
          transform={`rotate(${dir * -32} ${CX + dir * h.rx * 0.39} ${h.cy + h.ry * 0.1})`}
        />
      ));
    case 'fox':
      return [-1, 1].map((dir) => (
        <ellipse key={dir} cx={CX + dir * h.rx * 0.5} cy={h.cy + h.ry * 0.62} rx={h.rx * 0.56} ry={h.ry * 0.48} fill={c.belly} />
      ));
    case 'penguin':
      // 하트 모양 흰 얼굴
      return [-1, 1].map((dir) => (
        <ellipse key={dir} cx={CX + dir * h.rx * 0.3} cy={h.cy + h.ry * 0.2} rx={h.rx * 0.44} ry={h.ry * 0.62} fill={c.belly} />
      ));
    case 'bunny':
    case 'hedgehog':
    case 'pig':
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
    case 'fox':
      return scarf('#ffd43b');
    case 'penguin': {
      // 머리 위 노란 깃털 + 빨간 목도리
      const top = g.head.cy - g.head.ry;
      return (
        <>
          <path {...line} strokeWidth="3.5" fill="#ffc53d" d={`M${CX - 4} ${top + 6} Q${CX - 14} ${top - 18} ${CX - 2} ${top - 22} Q${CX + 2} ${top - 8} ${CX + 4} ${top + 6} Z`} />
          <path {...line} strokeWidth="3.5" fill="#ffc53d" d={`M${CX + 2} ${top + 6} Q${CX + 6} ${top - 14} ${CX + 18} ${top - 14} Q${CX + 12} ${top - 2} ${CX + 8} ${top + 8} Z`} />
          {scarf('#ff6b6b')}
        </>
      );
    }
    case 'pig': {
      // 머리에 단 빨간 리본
      const x = CX - g.head.rx * 0.42;
      const y = g.head.cy - g.head.ry + 8;
      return (
        <g {...line} strokeWidth="3.5" fill="#ff5c7a">
          <path d={`M${x} ${y} L${x - 16} ${y - 10} L${x - 16} ${y + 10} Z`} />
          <path d={`M${x} ${y} L${x + 16} ${y - 10} L${x + 16} ${y + 10} Z`} />
          <circle cx={x} cy={y} r="5" />
        </g>
      );
    }
    case 'cow':
      // 파란 목줄에 큰 워낭
      return (
        <g>
          <path {...line} strokeWidth="4" fill="#4dabf7" d={`M${CX - 30} ${neckY - 2} Q${CX} ${neckY + 10} ${CX + 30} ${neckY - 2} L${CX + 30} ${neckY + 6} Q${CX} ${neckY + 18} ${CX - 30} ${neckY + 6} Z`} />
          <path {...line} strokeWidth="3.5" fill="#ffd43b" d={`M${CX - 7} ${neckY + 10} L${CX + 7} ${neckY + 10} L${CX + 11} ${neckY + 28} L${CX - 11} ${neckY + 28} Z`} />
          <circle cx={CX} cy={neckY + 30} r="3" fill={INK} />
        </g>
      );
    case 'dog':
      // 빨간 목줄에 뼈다귀 이름표
      return (
        <g>
          <path {...line} strokeWidth="4" fill="#ff6b6b" d={`M${CX - 30} ${neckY - 2} Q${CX} ${neckY + 10} ${CX + 30} ${neckY - 2} L${CX + 30} ${neckY + 6} Q${CX} ${neckY + 18} ${CX - 30} ${neckY + 6} Z`} />
          <g {...line} strokeWidth="3" fill="#ffe8a3">
            <circle cx={CX - 9} cy={neckY + 16} r="4.5" />
            <circle cx={CX - 9} cy={neckY + 24} r="4.5" />
            <circle cx={CX + 9} cy={neckY + 16} r="4.5" />
            <circle cx={CX + 9} cy={neckY + 24} r="4.5" />
            <rect x={CX - 9} y={neckY + 15} width="18" height="10" stroke="none" />
            <path d={`M${CX - 7} ${neckY + 14.5} L${CX + 7} ${neckY + 14.5} M${CX - 7} ${neckY + 25.5} L${CX + 7} ${neckY + 25.5}`} fill="none" />
          </g>
        </g>
      );
    case 'panda': {
      // 대나무를 하나 들고 있다
      const bx = CX + g.body.rx * 0.2;
      const by = g.body.cy + g.body.ry * 0.5;
      return (
        <g>
          {limb(`M${bx} ${by} L${bx + 44} ${by - 86}`, '#7bd36b', 8)}
          <path d={`M${bx + 14} ${by - 27} l6 3 M${bx + 29} ${by - 56} l6 3`} stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path {...line} strokeWidth="3" fill="#69db7c" d={`M${bx + 40} ${by - 80} q16 -10 24 2 q-14 6 -24 -2 Z`} />
          <path {...line} strokeWidth="3" fill="#69db7c" d={`M${bx + 38} ${by - 72} q-4 -18 -18 -16 q2 14 18 16 Z`} />
          <circle {...line} strokeWidth="4" cx={CX + g.body.rx * 0.48} cy={g.body.cy + g.body.ry * 0.2} r="9" fill={'#2e2e33'} />
        </g>
      );
    }
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

/** 얼굴 가운데 코 모양 */
type Nose = 'none' | 'dot' | 'pig' | 'cow' | 'beak';
const NOSE: Partial<Record<Species, Nose>> = { hedgehog: 'dot', dog: 'dot', panda: 'dot', fox: 'dot', pig: 'pig', cow: 'cow', penguin: 'beak' };

function Face({ expression, g, species, c }: { expression: PetExpression; g: Geo; species: Species; c: Palette }) {
  const h = g.head;
  const big = species === 'hedgehog';
  const nose = NOSE[species] ?? 'none';
  const snout = nose === 'pig' || nose === 'cow';
  const y = h.cy + h.ry * (big ? 0.12 : snout ? -0.02 : 0.05);
  const spread = h.rx * (big ? 0.34 : 0.38);
  const L = CX - spread;
  const R = CX + spread;
  const er = big ? { rx: 9, ry: 10.5 } : { rx: 6, ry: 7.5 };
  // 판다는 까만 눈 무늬 위라서 눈을 하얗게 그린다
  const fg = species === 'panda' ? '#fff' : INK;
  const hl = species === 'panda' ? INK : '#fff';
  const eyes = (() => {
    switch (expression) {
      case 'idle':
        return (
          <g className="pet-eyes" style={{ transformOrigin: `${CX}px ${y}px` }}>
            {[L, R].map((x) => (
              <g key={x}>
                <ellipse cx={x} cy={y} rx={er.rx} ry={er.ry} fill={fg} />
                {big ? (
                  <>
                    <circle cx={x + 3} cy={y - 4} r="3.5" fill={hl} />
                    <circle cx={x - 3} cy={y + 4} r="1.8" fill={hl} />
                  </>
                ) : (
                  <circle cx={x + 2} cy={y - 3} r={species === 'panda' ? 3.2 : 2} fill={hl} />
                )}
              </g>
            ))}
          </g>
        );
      case 'happy':
      case 'eat':
        return [L, R].map((x) => (
          <path key={x} d={`M${x - 8} ${y + 3} Q${x} ${y - 8} ${x + 8} ${y + 3}`} stroke={fg} strokeWidth="4.5" fill="none" strokeLinecap="round" />
        ));
      case 'excited':
        return [L, R].map((x) => <g key={x}>{star(x, y, big ? 11 : 9, species === 'panda' ? '#ffe14d' : INK)}</g>);
      case 'cheer':
        return [L, R].map((x, i) => (
          <g key={x}>
            <ellipse cx={x} cy={y + 2} rx={er.rx} ry={er.ry} fill={fg} />
            <circle cx={x + 1.5} cy={y - 1} r="1.8" fill={hl} />
            <path d={i === 0 ? `M${x - 9} ${y - 13} L${x + 7} ${y - 9}` : `M${x - 7} ${y - 9} L${x + 9} ${y - 13}`} stroke={INK} strokeWidth="4" strokeLinecap="round" />
          </g>
        ));
      case 'sleep':
        return [L, R].map((x) => (
          <path key={x} d={`M${x - 8} ${y} Q${x} ${y + 7} ${x + 8} ${y}`} stroke={fg} strokeWidth="4.5" fill="none" strokeLinecap="round" />
        ));
      case 'request':
        return [L, R].map((x) => (
          <g key={x}>
            <circle cx={x} cy={y} r={big ? 12 : 9} fill={fg} />
            <circle cx={x + 3} cy={y - 3} r={big ? 4.5 : 3.5} fill={hl} />
            <circle cx={x - 3} cy={y + 4} r="2" fill={hl} />
          </g>
        ));
    }
  })();

  const open = expression === 'happy' || expression === 'excited' || expression === 'eat' || expression === 'cheer';
  const my = y + (big ? 20 : nose === 'pig' ? 30 : nose === 'cow' ? 25 : nose === 'dot' ? 18 : 14);
  const mouth =
    nose === 'beak' ? (
      open ? (
        <g {...line} strokeWidth="3">
          <path fill={c.mark} d={`M${CX - 9} ${y + 9} L${CX + 9} ${y + 9} L${CX} ${y + 3} Z`} />
          <path fill={c.mark} d={`M${CX - 8} ${y + 14} L${CX + 8} ${y + 14} L${CX} ${y + 22} Z`} />
        </g>
      ) : (
        <path {...line} strokeWidth="3" fill={c.mark} d={`M${CX - 9} ${y + 9} L${CX + 9} ${y + 9} L${CX} ${y + 19} Z`} />
      )
    ) : expression === 'eat' ? (
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

  const noseMark =
    nose === 'dot' ? (
      <ellipse cx={CX} cy={y + (big ? 9 : 10)} rx="5" ry="3.8" fill={INK} />
    ) : nose === 'pig' ? (
      <g>
        <ellipse {...line} strokeWidth="3.5" cx={CX} cy={y + 16} rx="14" ry="9.5" fill={c.mark} />
        <ellipse cx={CX - 4.5} cy={y + 16} rx="2.3" ry="3.4" fill={INK} />
        <ellipse cx={CX + 4.5} cy={y + 16} rx="2.3" ry="3.4" fill={INK} />
      </g>
    ) : nose === 'cow' ? (
      <g>
        <ellipse {...line} strokeWidth="3.5" cx={CX} cy={y + 19} rx="25" ry="14" fill="#ffd0d8" />
        <ellipse cx={CX - 9} cy={y + 14} rx="2.6" ry="3.6" fill={INK} />
        <ellipse cx={CX + 9} cy={y + 14} rx="2.6" ry="3.6" fill={INK} />
      </g>
    ) : null;

  return (
    <g>
      <ellipse cx={L - 13} cy={y + 12} rx="12" ry="7.5" fill={c.blush} opacity="0.8" />
      <ellipse cx={R + 13} cy={y + 12} rx="12" ry="7.5" fill={c.blush} opacity="0.8" />
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
          {frontEars(species, stage, h, c)}
          {whiskers(species, g)}
        </>
      )}
      <Face expression={expression} g={g} species={species} c={c} />
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

const EGG_STYLE: Record<Exclude<Species, keyof typeof EGG_EXTRA>, { fill: string; pattern: ReactNode }> = {
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

const EGG_EXTRA: Record<'pig' | 'cow' | 'dog' | 'panda' | 'fox' | 'penguin', { fill: string; pattern: ReactNode }> = {
  pig: {
    fill: '#ffc7d1',
    pattern: (
      <g fill="#ff9fb3">
        <circle cx="72" cy="78" r="9" />
        <circle cx="128" cy="96" r="12" />
        <circle cx="84" cy="138" r="11" />
        <circle cx="134" cy="150" r="7" />
        <circle cx="104" cy="56" r="6" />
      </g>
    ),
  },
  cow: {
    fill: '#ffffff',
    pattern: (
      <g fill="#3b3b40">
        <path d="M40 70 Q70 52 84 78 Q78 104 52 98 Q36 88 40 70 Z" />
        <path d="M118 112 Q148 100 160 126 Q156 152 128 148 Q108 132 118 112 Z" />
        <ellipse cx="86" cy="160" rx="12" ry="9" />
      </g>
    ),
  },
  dog: {
    fill: '#fbe3bf',
    pattern: (
      <g fill="#b9784a">
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
        <ellipse cx="64" cy="58" rx="24" ry="20" fill="#2e2e33" />
        <ellipse cx="136" cy="58" rx="24" ry="20" fill="#2e2e33" />
        <g fill="#69db7c" stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M80 130 Q100 108 118 128 Q100 146 80 130 Z" />
          <path d="M104 152 Q126 138 138 156 Q120 170 104 152 Z" />
        </g>
      </>
    ),
  },
  fox: {
    fill: '#f6913e',
    pattern: <path fill="#fff6ea" d="M20 130 Q60 112 100 136 Q140 112 180 130 L180 200 L20 200 Z" />,
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
