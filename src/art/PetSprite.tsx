/**
 * 자체 제작 펫 SVG — 설계서 13-2, 13-3.
 * 3종 × 성장 3단계(아기·어린이·다 자람) × 표정 7종. 알은 EggSprite.
 * 몸은 말랑한 한 덩어리이고, 단계가 오를수록 키가 크고 귀·꼬리·무늬가 자란다.
 */
import type { ReactNode } from 'react';
import type { Species, Stage } from '../domain/pet';
import { INK } from './colors';
import { type HatArt, HatShapeG } from './HatSprite';

export type PetExpression = 'idle' | 'happy' | 'excited' | 'cheer' | 'sleep' | 'request' | 'eat';
type GrownStage = Exclude<Stage, 'egg'>;

const STROKE = 5;

interface Geo {
  cy: number;
  rx: number;
  ry: number;
  faceY: number;
}

const GEO: Record<GrownStage, Geo> = {
  baby: { cy: 132, rx: 58, ry: 48, faceY: 128 },
  child: { cy: 120, rx: 54, ry: 56, faceY: 108 },
  adult: { cy: 112, rx: 56, ry: 64, faceY: 96 },
};

/** 모자를 씌울 머리 위 기준점 (M5 꾸미기에서 사용) */
export function hatAnchor(stage: GrownStage): { x: number; y: number; scale: number } {
  const g = GEO[stage];
  return { x: 100, y: g.cy - g.ry + 4, scale: stage === 'baby' ? 0.85 : stage === 'child' ? 0.95 : 1 };
}

const COLORS: Record<Species, { body: string; belly: string; accent: string }> = {
  cat: { body: '#ffe08a', belly: '#fff6d6', accent: '#ff9f43' },
  penguin: { body: '#7cc6ff', belly: '#fffdf5', accent: '#ffa94d' },
  dino: { body: '#9be58a', belly: '#e8f9d0', accent: '#4fb83a' },
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

/** 몸 뒤에 그리는 부분 (귀, 꼬리, 등 돌기, 날개) */
function behind(species: Species, stage: GrownStage, g: Geo, c: (typeof COLORS)[Species]): ReactNode {
  const top = g.cy - g.ry;
  const grow = stage === 'baby' ? 0 : stage === 'child' ? 1 : 2;
  switch (species) {
    case 'cat': {
      const h = 22 + grow * 8;
      const ear = (dir: 1 | -1) => (
        <g key={dir}>
          <path {...line} fill={c.body} d={`M${100 + dir * 18} ${top + 14} L${100 + dir * (34 + grow * 2)} ${top - h + 6} L${100 + dir * 50} ${top + 26} Z`} />
          <path fill="#ff9ebb" d={`M${100 + dir * 26} ${top + 14} L${100 + dir * (34 + grow * 2)} ${top - h + 18} L${100 + dir * 42} ${top + 20} Z`} />
        </g>
      );
      const tail =
        stage === 'baby' ? (
          <circle {...line} cx="156" cy={g.cy + 26} r="12" fill={c.body} />
        ) : (
          <path {...line} fill="none" strokeWidth={STROKE + 9} stroke={INK} d={`M140 ${g.cy + 30} Q${178 + grow * 4} ${g.cy + 10} ${168 + grow * 4} ${g.cy - 30 - grow * 8}`} />
        );
      const tailFill =
        stage === 'baby' ? null : (
          <path fill="none" strokeWidth="9" stroke={c.body} strokeLinecap="round" d={`M140 ${g.cy + 30} Q${178 + grow * 4} ${g.cy + 10} ${168 + grow * 4} ${g.cy - 30 - grow * 8}`} />
        );
      return (
        <>
          {tail}
          {tailFill}
          {stage === 'adult' && star(176, g.cy - 50, 12, '#ffd43b')}
          {ear(-1)}
          {ear(1)}
        </>
      );
    }
    case 'penguin': {
      const wing = (dir: 1 | -1) => {
        const len = 22 + grow * 10;
        return (
          <path
            key={dir}
            {...line}
            fill={c.body}
            d={`M${100 + dir * (g.rx - 8)} ${g.cy - 10} Q${100 + dir * (g.rx + len)} ${g.cy + 8} ${100 + dir * (g.rx + 4)} ${g.cy + 30} Z`}
          />
        );
      };
      return (
        <>
          {stage !== 'baby' && wing(-1)}
          {stage !== 'baby' && wing(1)}
        </>
      );
    }
    case 'dino': {
      const bumps = stage === 'baby' ? 0 : stage === 'child' ? 3 : 5;
      const spikes = Array.from({ length: bumps }, (_, i) => {
        const a = -Math.PI / 2 + 0.35 + i * 0.36;
        const x = 100 + Math.cos(a) * (g.rx - 2);
        const y = g.cy + Math.sin(a) * (g.ry - 2);
        return <circle key={i} {...line} cx={x} cy={y} r={11} fill={c.accent} />;
      });
      return (
        <>
          {stage !== 'baby' && (
            <path {...line} fill={c.body} d={`M${100 + g.rx - 14} ${g.cy + 20} Q${186} ${g.cy + 30} ${190} ${g.cy + 6} Q${176} ${g.cy + 44} ${100 + g.rx - 20} ${g.cy + 42} Z`} />
          )}
          {stage === 'adult' && (
            <>
              <path {...line} fill="#c9b6ff" d={`M${100 - g.rx + 10} ${g.cy - 20} L${100 - g.rx - 30} ${g.cy - 46} L${100 - g.rx - 18} ${g.cy - 10} L${100 - g.rx - 34} ${g.cy - 4} Z`} />
              <path {...line} fill="#c9b6ff" d={`M${100 + g.rx - 10} ${g.cy - 20} L${100 + g.rx + 30} ${g.cy - 46} L${100 + g.rx + 18} ${g.cy - 10} L${100 + g.rx + 34} ${g.cy - 4} Z`} />
            </>
          )}
          {spikes}
          <path {...line} fill={c.accent} d={`M88 ${top + 8} Q100 ${top - 22 - grow * 4} 112 ${top + 8} Z`} />
        </>
      );
    }
  }
}

/** 몸 앞에 그리는 부분 (배, 무늬, 발, 목털) */
function front(species: Species, stage: GrownStage, g: Geo, c: (typeof COLORS)[Species]): ReactNode {
  const top = g.cy - g.ry;
  const bottom = g.cy + g.ry;
  const feet =
    stage === 'baby' ? null : (
      <>
        <ellipse {...line} cx="78" cy={bottom - 2} rx="16" ry="9" fill={species === 'penguin' ? '#ffa94d' : c.body} />
        <ellipse {...line} cx="122" cy={bottom - 2} rx="16" ry="9" fill={species === 'penguin' ? '#ffa94d' : c.body} />
      </>
    );
  switch (species) {
    case 'cat':
      return (
        <>
          <ellipse cx="100" cy={g.cy + g.ry * 0.45} rx={g.rx * 0.55} ry={g.ry * 0.38} fill={c.belly} />
          {stage !== 'baby' && star(100, top + 22, stage === 'adult' ? 11 : 9, '#ffa94d')}
          {stage === 'adult' && (
            // 목에 맨 리본
            <g {...line} strokeWidth="3.5" fill="#ff8fc1">
              <path d={`M100 ${g.faceY + 48} L80 ${g.faceY + 38} L80 ${g.faceY + 60} Z`} />
              <path d={`M100 ${g.faceY + 48} L120 ${g.faceY + 38} L120 ${g.faceY + 60} Z`} />
              <circle cx="100" cy={g.faceY + 48} r="6" />
            </g>
          )}
          {stage === 'adult' && (
            <g stroke={INK} strokeWidth="3" strokeLinecap="round">
              <line x1="52" y1={g.faceY + 12} x2="30" y2={g.faceY + 6} />
              <line x1="52" y1={g.faceY + 20} x2="30" y2={g.faceY + 22} />
              <line x1="148" y1={g.faceY + 12} x2="170" y2={g.faceY + 6} />
              <line x1="148" y1={g.faceY + 20} x2="170" y2={g.faceY + 22} />
            </g>
          )}
          {feet}
        </>
      );
    case 'penguin':
      return (
        <>
          <ellipse {...line} strokeWidth="3.5" cx="100" cy={g.cy + g.ry * 0.28} rx={g.rx * 0.62} ry={g.ry * 0.66} fill={c.belly} />
          {stage === 'baby' && (
            <path {...line} fill="none" d={`M92 ${top + 4} Q96 ${top - 14} 104 ${top - 6} M104 ${top + 2} Q110 ${top - 16} 116 ${top - 4}`} />
          )}
          {stage === 'adult' && (
            <>
              <path {...line} fill="#ffe14d" d={`M84 ${top + 6} L78 ${top - 22} L94 ${top + 2} Z`} />
              <path {...line} fill="#ffe14d" d={`M96 ${top + 2} L100 ${top - 28} L106 ${top + 2} Z`} />
            </>
          )}
          {stage !== 'baby' && (
            <path
              fill="#ff8fc1"
              stroke={INK}
              strokeWidth="3"
              d={`M100 ${g.cy + 40} C88 ${g.cy + 30} 86 ${g.cy + 20} 94 ${g.cy + 18} C98 ${g.cy + 17} 100 ${g.cy + 21} 100 ${g.cy + 23} C100 ${g.cy + 21} 102 ${g.cy + 17} 106 ${g.cy + 18} C114 ${g.cy + 20} 112 ${g.cy + 30} 100 ${g.cy + 40} Z`}
            />
          )}
          {feet}
        </>
      );
    case 'dino':
      return (
        <>
          <ellipse cx="100" cy={g.cy + g.ry * 0.42} rx={g.rx * 0.58} ry={g.ry * 0.42} fill={c.belly} />
          {stage === 'adult' &&
            [0, 1, 2].map((i) => (
              <path key={i} d={`M80 ${g.cy + 20 + i * 12} Q100 ${g.cy + 26 + i * 12} 120 ${g.cy + 20 + i * 12}`} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
            ))}
          {feet}
        </>
      );
  }
}

function Face({ expression, y, species }: { expression: PetExpression; y: number; species: Species }) {
  const L = 78;
  const R = 122;
  const eyes = (() => {
    switch (expression) {
      case 'idle':
        return (
          <g className="pet-eyes" style={{ transformOrigin: `100px ${y}px` }}>
            {[L, R].map((x) => (
              <g key={x}>
                <ellipse cx={x} cy={y} rx="8" ry="10" fill={INK} />
                <circle cx={x + 3} cy={y - 4} r="3" fill="#fff" />
              </g>
            ))}
          </g>
        );
      case 'happy':
      case 'eat':
        return [L, R].map((x) => (
          <path key={x} d={`M${x - 10} ${y + 4} Q${x} ${y - 10} ${x + 10} ${y + 4}`} stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />
        ));
      case 'excited':
        return [L, R].map((x) => <g key={x}>{star(x, y, 11, INK)}</g>);
      case 'cheer':
        return [L, R].map((x, i) => (
          <g key={x}>
            <ellipse cx={x} cy={y + 2} rx="7" ry="9" fill={INK} />
            <circle cx={x + 2} cy={y - 2} r="2.5" fill="#fff" />
            <path d={i === 0 ? `M${x - 10} ${y - 14} L${x + 8} ${y - 10}` : `M${x - 8} ${y - 10} L${x + 10} ${y - 14}`} stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
          </g>
        ));
      case 'sleep':
        return [L, R].map((x) => (
          <path key={x} d={`M${x - 10} ${y} Q${x} ${y + 9} ${x + 10} ${y}`} stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />
        ));
      case 'request':
        return [L, R].map((x) => (
          <g key={x}>
            <circle cx={x} cy={y} r="12" fill={INK} />
            <circle cx={x + 4} cy={y - 4} r="5" fill="#fff" />
            <circle cx={x - 4} cy={y + 5} r="2.5" fill="#fff" />
          </g>
        ));
    }
  })();

  const open = expression === 'happy' || expression === 'excited' || expression === 'eat' || expression === 'cheer';
  const my = y + 22;
  const mouth =
    species === 'penguin' ? (
      open ? (
        <g {...line} strokeWidth="3.5">
          <path fill="#ffa94d" d={`M90 ${my - 6} L110 ${my - 6} L100 ${my - 14} Z`} />
          <path fill="#ffa94d" d={`M91 ${my} L109 ${my} L100 ${my + 9} Z`} />
        </g>
      ) : (
        <path {...line} strokeWidth="3.5" fill="#ffa94d" d={`M89 ${my - 6} L111 ${my - 6} L100 ${my + 6} Z`} />
      )
    ) : expression === 'eat' ? (
      <g>
        <circle cx="100" cy={my + 2} r="10" fill={INK} />
        <ellipse cx="100" cy={my + 7} rx="6" ry="3.5" fill="#ff6b8b" />
      </g>
    ) : open ? (
      <path d={`M87 ${my - 4} Q100 ${my + 16} 113 ${my - 4} Z`} fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
    ) : expression === 'request' || expression === 'sleep' ? (
      <ellipse cx="100" cy={my} rx="4.5" ry="4" fill={INK} />
    ) : (
      <path d={`M90 ${my - 3} Q95 ${my + 4} 100 ${my - 2} Q105 ${my + 4} 110 ${my - 3}`} stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
    );

  return (
    <g>
      <ellipse cx={L - 16} cy={y + 16} rx="9" ry="6" fill="#ff6b8b" opacity="0.45" />
      <ellipse cx={R + 16} cy={y + 16} rx="9" ry="6" fill="#ff6b8b" opacity="0.45" />
      {eyes}
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
  const g = GEO[stage];
  const c = COLORS[species];
  return (
    <svg viewBox="-10 -10 220 210" width={size} height={size} className={className} role="img" aria-label="펫">
      <ellipse cx="100" cy={g.cy + g.ry + 8} rx="60" ry="8" fill={INK} opacity="0.15" />
      {behind(species, stage, g, c)}
      <ellipse {...line} cx="100" cy={g.cy} rx={g.rx} ry={g.ry} fill={c.body} />
      <ellipse cx={100 - g.rx * 0.45} cy={g.cy - g.ry * 0.55} rx="10" ry="6" fill="#fff" opacity="0.6" transform={`rotate(-30 ${100 - g.rx * 0.45} ${g.cy - g.ry * 0.55})`} />
      {front(species, stage, g, c)}
      <Face expression={expression} y={g.faceY} species={species} />
      {expression === 'sleep' && (
        <text x="150" y={g.cy - g.ry + 4} fontSize="28" fontWeight="900" fill={INK}>
          Z<tspan fontSize="20" dy="-12">z</tspan>
        </text>
      )}
      {expression === 'excited' && (
        <>
          {star(32, g.cy - 40, 9, '#ffe14d')}
          {star(170, g.cy - 50, 7, '#ff8fc1')}
        </>
      )}
      {hat && (() => {
        const a = hatAnchor(stage);
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

const EGG_STYLE: Record<Species, { fill: string; pattern: (clip: string) => ReactNode }> = {
  cat: {
    fill: '#ffe08a',
    pattern: () => (
      <>
        {star(76, 84, 10, '#ffa94d', 'a')}
        {star(124, 112, 13, '#ffa94d', 'b')}
        {star(84, 146, 8, '#ffa94d', 'c')}
        {star(132, 62, 7, '#ffa94d', 'd')}
      </>
    ),
  },
  penguin: {
    fill: '#7cc6ff',
    pattern: (clip) => (
      <g clipPath={`url(#${clip})`} fill="none" stroke="#fffdf5" strokeWidth="9" strokeLinecap="round">
        <path d="M30 96 Q50 84 70 96 T110 96 T150 96 T190 96" />
        <path d="M30 136 Q50 124 70 136 T110 136 T150 136 T190 136" />
      </g>
    ),
  },
  dino: {
    fill: '#b8f25c',
    pattern: () => (
      <g fill="#4fb83a" stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <path d="M70 80 Q86 66 96 84 Q80 96 70 80 Z" />
        <path d="M112 118 Q132 102 142 124 Q122 136 112 118 Z" />
        <path d="M74 140 Q88 128 98 144 Q84 154 74 140 Z" />
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
  const s = EGG_STYLE[species];
  const clip = `egg-clip-${species}`;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} role="img" aria-label="알">
      <defs>
        <clipPath id={clip}>
          <path d={EGG_PATH} />
        </clipPath>
      </defs>
      <ellipse cx="100" cy="186" rx="52" ry="8" fill={INK} opacity="0.15" />
      <path d={EGG_PATH} fill={s.fill} />
      {s.pattern(clip)}
      <path d={EGG_PATH} fill="none" stroke={INK} strokeWidth={STROKE} />
      <ellipse cx="74" cy="60" rx="9" ry="14" fill="#fff" opacity="0.6" transform="rotate(25 74 60)" />
      {CRACKS.slice(0, cracks).map((d) => (
        <path key={d} d={d} fill="none" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
      ))}
    </svg>
  );
}
