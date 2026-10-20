/**
 * 자체 제작 몬스터 SVG — 설계서 13-4 (레퍼런스 팝 블롭 몬스터 8종 + 풍부한 내부 얼룩무늬·디테일 강화판).
 * 몸 모양 8종 × 단 색 × 표정 4종(종별 개성 있는 기본 표정 포함) + 황금 몬스터.
 * 몸통 내부에 다채로운 얼룩무늬(반점·크레이터·호피·기포·모자이크·비늘), 배 패치, 귀여운 손발·뿔·송곳니 디테일을 갖는다.
 */
import { type ReactNode, useId } from 'react';
import type { MonsterKind } from '../domain/battle';
import { GOLD, INK, shade } from './colors';

export type MonsterMood = 'idle' | 'hit' | 'happy' | 'sleep';

export const MONSTER_NAMES: Record<MonsterKind, string> = {
  horn: '뿔뿔몬',
  jelly: '젤리몬',
  antenna: '안테나몬',
  mushroom: '방울무몬',
  cloud: '새싹몬',
  fluff: '왕관몬',
  pebble: '삼눈블록몬',
  ghost: '외뿔공룡몬',
};

interface Props {
  kind: MonsterKind;
  color: string;
  mood: MonsterMood;
  golden?: boolean;
  size?: number;
  className?: string;
  /** 외곽선 색. 기본은 검정(네오브루탈리즘) */
  outline?: string;
}

const STROKE = 5;

/** 몸통 경로 + 머리/외부 장식(topper) + 내부 얼룩/배 무늬(innerArt) + 얼굴 위치(faceY) + 왕관 위치(topY) */
function monsterArt(
  kind: MonsterKind,
  fill: string,
  line: string,
  clipId: string,
): { shape: ReactNode; faceY: number; topY: number; rightShadeX: number } {
  const p = { fill, stroke: line, strokeWidth: STROKE, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  const darkSpot = shade(fill, -0.14);
  const deepSpot = shade(fill, -0.22);
  const lightBelly = shade(fill, 0.36);
  const softLight = shade(fill, 0.22);
  const sideShadow = shade(fill, -0.16);
  const topHighlight = shade(fill, 0.3);

  const renderBody = (
    bodyPath: string,
    topper: ReactNode,
    innerArt: ReactNode,
    frontLimbs: ReactNode = null,
    rightShadeX = 134,
  ) => (
    <>
      <defs>
        <clipPath id={clipId}>
          <path d={bodyPath} />
        </clipPath>
      </defs>
      {topper}
      <path d={bodyPath} fill={fill} />
      <g clipPath={`url(#${clipId})`}>
        {/* 레퍼런스 특유의 좌상단 소프트 윤기 하이라이트 */}
        <ellipse cx="68" cy="72" rx="18" ry="30" fill={topHighlight} opacity="0.5" transform="rotate(-18 68 72)" />
        <circle cx="56" cy="106" r="5" fill={topHighlight} opacity="0.4" />
        {/* 종별 내부 얼룩무늬 & 배 무늬 */}
        {innerArt}
        {/* 레퍼런스 특유의 우측 세로 반달 셀 셰이딩(입체 음영) */}
        <path
          d={`M${rightShadeX} 26 Q${rightShadeX + 16} 105 ${rightShadeX - 6} 180 L190 180 L190 26 Z`}
          fill={sideShadow}
          opacity="0.78"
        />
      </g>
      <path {...p} fill="none" d={bodyPath} />
      {frontLimbs}
    </>
  );

  switch (kind) {
    case 'horn': {
      const bodyPath =
        'M 42 162 L 42 108 C 42 66 68 54 100 54 C 132 54 158 66 158 108 L 158 162 Q 158 172 148 172 L 52 172 Q 42 172 42 162 Z';
      const topper = (
        <g>
          {/* 줄무늬가 들어간 큼직한 노란 쌍뿔 */}
          <path {...p} fill="#ffcf3a" d="M 74 60 Q 60 32 52 18 Q 76 28 88 56 Z" />
          <path d="M 62 34 Q 70 32 76 38 M 67 45 Q 75 43 81 48" stroke="#e0781f" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path {...p} fill="#ffcf3a" d="M 126 60 Q 140 32 148 18 Q 124 28 112 56 Z" />
          <path d="M 138 34 Q 130 32 124 38 M 133 45 Q 125 43 119 48" stroke="#e0781f" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          {/* 양옆 작은 귀 돌기 */}
          <path {...p} strokeWidth={4} fill={fill} d="M 45 84 Q 30 78 34 92 Q 38 98 44 96 Z" />
          <path {...p} strokeWidth={4} fill={fill} d="M 155 84 Q 170 78 166 92 Q 162 98 156 96 Z" />
        </g>
      );
      const innerArt = (
        <g>
          {/* 몸통 내부 젖소/공룡풍 비대칭 얼룩무늬 (Blotches) */}
          <ellipse cx="48" cy="82" rx="16" ry="12" fill={darkSpot} transform="rotate(-25 48 82)" />
          <circle cx="62" cy="66" r="6" fill={darkSpot} />
          <ellipse cx="150" cy="96" rx="15" ry="19" fill={darkSpot} transform="rotate(15 150 96)" />
          <circle cx="134" cy="72" r="7" fill={darkSpot} />
          <ellipse cx="52" cy="136" rx="14" ry="18" fill={darkSpot} transform="rotate(12 52 136)" />
          <circle cx="66" cy="122" r="5" fill={darkSpot} />
          <ellipse cx="148" cy="144" rx="13" ry="14" fill={darkSpot} />
          {/* 이마 V자 무늬 */}
          <path d="M 92 64 L 100 72 L 108 64" stroke={deepSpot} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {/* 밝은 배 패치 + 5개 반점 무늬 */}
          <ellipse cx="100" cy="158" rx="38" ry="26" fill={lightBelly} />
          <g fill={darkSpot}>
            <circle cx="80" cy="148" r="5" />
            <circle cx="100" cy="144" r="5.5" />
            <circle cx="120" cy="148" r="5" />
            <circle cx="89" cy="160" r="4" />
            <circle cx="111" cy="160" r="4" />
          </g>
        </g>
      );
      const frontLimbs = (
        <g>
          {/* 발톱 달린 앙증맞은 두 발 */}
          <path {...p} strokeWidth={4} fill={fill} d="M 56 168 C 52 178 74 178 70 168 Z" />
          <path {...p} strokeWidth={4} fill={fill} d="M 130 168 C 126 178 148 178 144 168 Z" />
        </g>
      );
      return { faceY: 90, topY: 18, rightShadeX: 138, shape: renderBody(bodyPath, topper, innerArt, frontLimbs, 138) };
    }

    case 'jelly': {
      const bodyPath =
        'M 48 162 L 48 98 C 48 56 72 46 100 46 C 128 46 152 56 152 98 L 152 162 Q 152 172 142 172 L 58 172 Q 48 172 48 162 Z';
      const topper = (
        <g>
          {/* 정수리 말랑한 젤리 물방울 2개 & 양옆 미니 젤리 팔 */}
          <circle {...p} strokeWidth={4} cx="84" cy="43" r="8" fill={fill} />
          <circle {...p} strokeWidth={3.5} cx="114" cy="45" r="5.5" fill={fill} />
          <path {...p} strokeWidth={4} fill={fill} d="M 50 116 C 34 114 34 132 50 130 Z" />
          <path {...p} strokeWidth={4} fill={fill} d="M 150 116 C 166 114 166 132 150 130 Z" />
        </g>
      );
      const innerArt = (
        <g>
          {/* 상단 흘러내리는 시럽/젤리 물결 무늬 */}
          <path
            d="M 44 44 L 156 44 L 156 70 Q 142 82 130 66 Q 116 52 102 72 Q 88 86 74 66 Q 60 52 44 70 Z"
            fill={softLight}
            opacity="0.65"
          />
          {/* 젤리 내부에 둥둥 떠 있는 영롱한 기포(Bubbles) & 젤리 코어 */}
          <ellipse cx="100" cy="146" rx="34" ry="26" fill={lightBelly} opacity="0.55" />
          <g fill={darkSpot}>
            <rect x="73" y="128" width="9" height="46" rx="4.5" />
            <rect x="95.5" y="124" width="9" height="50" rx="4.5" />
            <rect x="118" y="128" width="9" height="46" rx="4.5" />
          </g>
          {/* 반투명 기포 얼룩들 */}
          {[
            [62, 82, 7.5],
            [56, 102, 4.5],
            [138, 80, 8.5],
            [142, 104, 5],
            [60, 142, 6.5],
            [140, 144, 6],
            [86, 62, 4.5],
            [116, 64, 5.5],
          ].map(([bx, by, br], idx) => (
            <g key={idx}>
              <circle cx={bx} cy={by} r={br} fill={lightBelly} opacity="0.78" />
              <circle cx={bx - br * 0.3} cy={by - br * 0.3} r={br * 0.28} fill="#ffffff" opacity="0.9" />
            </g>
          ))}
        </g>
      );
      return { faceY: 90, topY: 34, rightShadeX: 134, shape: renderBody(bodyPath, topper, innerArt, null, 134) };
    }

    case 'antenna': {
      const bodyPath =
        'M 58 162 L 58 84 C 58 52 76 42 100 42 C 124 42 142 52 142 84 L 142 162 Q 142 172 132 172 L 68 172 Q 58 172 58 162 Z';
      const topper = (
        <g>
          {/* 외계 전파 안테나 + 고리 + 양옆 귀 나사 돌기 */}
          <line x1="100" y1="44" x2="100" y2="24" stroke={line} strokeWidth={STROKE} strokeLinecap="round" />
          <ellipse cx="100" cy="19" rx="16" ry="5" fill="none" stroke="#ffe14d" strokeWidth="3" transform="rotate(-14 100 19)" />
          <circle {...p} cx="100" cy="19" r="9.5" fill="#c9b6ff" />
          <circle cx="97" cy="16" r="3" fill="#ffffff" opacity="0.85" />
          {/* 양옆 미니 우주 안테나 귀 */}
          <path {...p} strokeWidth={4} fill="#ffcf3a" d="M 58 76 L 44 70 L 44 82 L 58 84 Z" />
          <path {...p} strokeWidth={4} fill="#ffcf3a" d="M 142 76 L 156 70 L 156 82 L 142 84 Z" />
        </g>
      );
      const innerArt = (
        <g>
          {/* 우주 행성 크레이터(이중 링 반점) 얼룩무늬 */}
          {[
            [64, 62, 10],
            [136, 68, 11],
            [62, 122, 12],
            [138, 126, 13],
            [72, 156, 8],
            [128, 158, 8.5],
          ].map(([cx, cy, r], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r} fill={darkSpot} />
              <circle cx={cx} cy={cy} r={r * 0.52} fill={softLight} />
            </g>
          ))}
          {/* 배 중앙 외계 에너지 코어 & 물결 줄무늬 */}
          <path
            d="M 56 138 Q 78 130 100 138 Q 122 146 144 138 L 144 174 L 56 174 Z"
            fill={darkSpot}
            opacity="0.55"
          />
          <circle cx="100" cy="148" r="14" fill={lightBelly} stroke={deepSpot} strokeWidth="3" />
          <path d="M 100 138 L 104 144 L 110 148 L 104 152 L 100 158 L 96 152 L 90 148 L 96 144 Z" fill="#ffe14d" />
        </g>
      );
      return { faceY: 90, topY: 10, rightShadeX: 125, shape: renderBody(bodyPath, topper, innerArt, null, 125) };
    }

    case 'mushroom': {
      const bodyPath =
        'M 46 162 L 46 112 C 46 76 82 62 95 42 L 105 42 C 118 62 154 76 154 112 L 154 162 Q 154 172 144 172 L 56 172 Q 46 172 46 162 Z';
      const topper = (
        <g>
          {/* 목 둘레 귀여운 잎사귀 프릴 & 점박이 방울 꼭지 */}
          <path {...p} strokeWidth={4} fill="#74c69d" d="M 94 46 Q 74 38 78 52 Q 86 56 95 48 Z" />
          <path {...p} strokeWidth={4} fill="#74c69d" d="M 106 46 Q 126 38 122 52 Q 114 56 105 48 Z" />
          <path {...p} fill="#b8f25c" d="M 95 44 L 97 32 L 103 32 L 105 44 Z" />
          <circle {...p} cx="100" cy="23" r="12.5" fill="#b8f25c" />
          <circle cx="95" cy="19" r="3.5" fill="#ffffff" opacity="0.85" />
          <circle cx="105" cy="26" r="2.5" fill="#ffffff" opacity="0.75" />
        </g>
      );
      const innerArt = (
        <g>
          {/* 어깨·볼 주변 버섯 포자/호피 얼룩무늬 */}
          <ellipse cx="64" cy="92" rx="13" ry="10" fill={darkSpot} transform="rotate(-20 64 92)" />
          <circle cx="78" cy="76" r="6" fill={darkSpot} />
          <circle cx="56" cy="112" r="5.5" fill={softLight} />
          <ellipse cx="136" cy="92" rx="13" ry="10" fill={darkSpot} transform="rotate(20 136 92)" />
          <circle cx="122" cy="76" r="6" fill={darkSpot} />
          <circle cx="144" cy="112" r="5.5" fill={softLight} />
          {/* 둥근 배 패치 + 3단 줄무늬 & 작은 점 */}
          <ellipse cx="100" cy="154" rx="44" ry="26" fill={lightBelly} opacity="0.6" />
          <g fill={darkSpot}>
            <rect x="70" y="133" width="60" height="8" rx="4" />
            <rect x="66" y="146" width="68" height="8" rx="4" />
            <rect x="74" y="159" width="52" height="7" rx="3.5" />
          </g>
          <circle cx="58" cy="144" r="4.5" fill={darkSpot} />
          <circle cx="142" cy="144" r="4.5" fill={darkSpot} />
        </g>
      );
      return { faceY: 88, topY: 10, rightShadeX: 135, shape: renderBody(bodyPath, topper, innerArt, null, 135) };
    }

    case 'cloud': {
      const bodyPath =
        'M 46 162 L 46 106 C 46 82 55 68 68 62 C 74 48 88 44 100 46 C 112 44 126 48 132 62 C 145 68 154 82 154 106 L 154 162 Q 154 172 144 172 L 56 172 Q 46 172 46 162 Z';
      const topper = (
        <g>
          {/* 두 잎 새싹 + 잎맥 + 중앙 작은 꽃봉오리 */}
          <path d="M 100 46 L 100 28" stroke={line} strokeWidth={STROKE} strokeLinecap="round" />
          <path {...p} strokeWidth={4} fill="#66d2ff" d="M 100 34 C 78 34 72 16 84 12 C 94 10 100 22 100 34 Z" />
          <path d="M 96 28 Q 88 22 84 18" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.7" />
          <path {...p} strokeWidth={4} fill="#66d2ff" d="M 100 34 C 120 34 126 18 115 14 C 106 12 100 22 100 34 Z" />
          <path d="M 104 28 Q 111 23 114 19" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.7" />
          <circle {...p} strokeWidth={3.2} cx="100" cy="20" r="5" fill="#ff9eb5" />
        </g>
      );
      const innerArt = (
        <g>
          {/* 양어깨와 옆구리의 클로버/잎사귀형 얼룩무늬 */}
          <g fill={darkSpot}>
            <circle cx="58" cy="78" r="8" />
            <circle cx="66" cy="72" r="7" />
            <circle cx="54" cy="88" r="6" />
            <circle cx="142" cy="78" r="8" />
            <circle cx="134" cy="72" r="7" />
            <circle cx="146" cy="88" r="6" />
          </g>
          {/* 구름 소용돌이 털 결 무늬 */}
          <path
            d="M 56 116 C 64 110 72 118 66 125 C 62 129 56 125 60 120"
            fill="none"
            stroke={deepSpot}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 144 116 C 136 110 128 118 134 125 C 138 129 144 125 140 120"
            fill="none"
            stroke={deepSpot}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* 물결치는 밝은 배 패치 & 씨앗 점 무늬 */}
          <path
            d="M 44 136 Q 62 126 80 136 Q 100 126 120 136 Q 138 126 156 136 L 156 174 L 44 174 Z"
            fill={lightBelly}
            opacity="0.7"
          />
          <g fill={deepSpot}>
            <ellipse cx="74" cy="146" rx="4.5" ry="6" transform="rotate(-15 74 146)" />
            <ellipse cx="100" cy="144" rx="4.5" ry="6" />
            <ellipse cx="126" cy="146" rx="4.5" ry="6" transform="rotate(15 126 146)" />
            <ellipse cx="86" cy="160" rx="4.5" ry="6" transform="rotate(-8 86 160)" />
            <ellipse cx="114" cy="160" rx="4.5" ry="6" transform="rotate(8 114 160)" />
          </g>
        </g>
      );
      return { faceY: 88, topY: 12, rightShadeX: 135, shape: renderBody(bodyPath, topper, innerArt, null, 135) };
    }

    case 'fluff': {
      const bodyPath =
        'M 36 164 C 44 132 52 96 62 72 C 72 52 86 48 100 48 C 114 48 128 52 138 72 C 148 96 156 132 164 164 Q 166 172 156 172 L 44 172 Q 34 172 36 164 Z';
      const topper = (
        <g>
          {/* 보석이 박힌 핑크 미니 왕관 + 양옆 삐죽 털 */}
          <path
            {...p}
            strokeWidth={4}
            fill="#ff9eb5"
            d="M 80 52 L 84 30 L 93 42 L 100 26 L 107 42 L 116 30 L 120 52 Z"
          />
          <circle cx="100" cy="42" r="3.2" fill="#ffe14d" stroke={line} strokeWidth="2" />
          <circle cx="88" cy="44" r="2.2" fill="#66d2ff" />
          <circle cx="112" cy="44" r="2.2" fill="#66d2ff" />
        </g>
      );
      const innerArt = (
        <g>
          {/* 몸통 양옆 표범/호피 도넛형 얼룩무늬 (Rosette spots) */}
          {[
            [62, 108, 11],
            [52, 140, 13],
            [70, 156, 8],
            [138, 108, 11],
            [148, 140, 13],
            [130, 156, 8],
          ].map(([cx, cy, r], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r} fill={darkSpot} />
              <circle cx={cx + 1} cy={cy + 1} r={r * 0.48} fill={softLight} />
            </g>
          ))}
          {/* 가슴과 배의 복슬복슬 털 앞치마 & 다이아몬드 무늬 */}
          <path
            d="M 74 122 Q 87 132 100 122 Q 113 132 126 122 L 136 172 L 64 172 Z"
            fill={lightBelly}
            opacity="0.78"
          />
          <path
            d="M 82 118 L 88 125 L 94 118 L 100 126 L 106 118 L 112 125 L 118 118"
            fill="none"
            stroke={deepSpot}
            strokeWidth="3.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 배 중앙 다이아몬드 포인트 3개 */}
          <polygon points="100,134 107,143 100,152 93,143" fill={darkSpot} />
          <polygon points="83,146 88,153 83,160 78,153" fill={darkSpot} />
          <polygon points="117,146 122,153 117,160 112,153" fill={darkSpot} />
        </g>
      );
      return { faceY: 92, topY: 22, rightShadeX: 138, shape: renderBody(bodyPath, topper, innerArt, null, 138) };
    }

    case 'pebble': {
      const bodyPath =
        'M 44 162 L 44 96 Q 44 84 56 84 L 68 84 L 68 62 Q 68 50 80 50 L 120 50 Q 132 50 132 62 L 132 84 L 144 84 Q 156 84 156 96 L 156 162 Q 156 172 146 172 L 54 172 Q 44 172 44 162 Z';
      const topper = (
        <g>
          {/* 블록 어깨 위의 크리스탈/보석 돌기 */}
          <polygon {...p} strokeWidth={3.8} fill="#66d2ff" points="52,84 56,68 64,84" />
          <polygon {...p} strokeWidth={3.8} fill="#ffcf3a" points="140,84 146,70 150,84" />
        </g>
      );
      const innerArt = (
        <g>
          {/* 블록 몬스터 특유의 픽셀/모자이크 타일 얼룩무늬 */}
          <rect x="46" y="96" width="18" height="18" rx="4" fill={darkSpot} />
          <rect x="52" y="120" width="14" height="22" rx="4" fill={softLight} />
          <rect x="46" y="148" width="22" height="18" rx="4" fill={darkSpot} />
          <rect x="136" y="96" width="18" height="20" rx="4" fill={darkSpot} />
          <rect x="134" y="124" width="14" height="16" rx="4" fill={softLight} />
          <rect x="130" y="146" width="22" height="20" rx="4" fill={darkSpot} />
          {/* 바위 균열 디테일 */}
          <path d="M 74 52 L 78 62 L 72 68" fill="none" stroke={deepSpot} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 148 118 L 138 122 L 142 130" fill="none" stroke={deepSpot} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          {/* 배 중앙 고대 골렘 룬 패치 */}
          <rect x="74" y="128" width="52" height="36" rx="8" fill={lightBelly} stroke={darkSpot} strokeWidth="3.5" />
          <circle cx="100" cy="146" r="9" fill="none" stroke={deepSpot} strokeWidth="3.5" />
          <circle cx="100" cy="146" r="3.5" fill={deepSpot} />
          <line x1="82" y1="146" x2="91" y2="146" stroke={deepSpot} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="109" y1="146" x2="118" y2="146" stroke={deepSpot} strokeWidth="3.5" strokeLinecap="round" />
        </g>
      );
      return { faceY: 94, topY: 44, rightShadeX: 138, shape: renderBody(bodyPath, topper, innerArt, null, 138) };
    }

    case 'ghost': {
      const bodyPath =
        'M 54 162 L 54 96 C 54 58 74 44 100 44 C 126 44 146 58 146 96 L 146 162 Q 146 172 136 172 L 64 172 Q 54 172 54 162 Z';
      const topper = (
        <g>
          {/* 줄무늬 외뿔 + 양옆 귀여운 공룡 등지느러미 돌기 */}
          <path {...p} fill="#f1f3f5" d="M 87 48 Q 94 16 100 14 Q 106 16 113 48 Z" />
          <path d="M 91 34 Q 100 30 109 34" stroke="#adb5bd" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <path {...p} strokeWidth={3.8} fill="#ffcf3a" d="M 55 110 L 42 118 L 54 126 Z" />
          <path {...p} strokeWidth={3.8} fill="#ffcf3a" d="M 54 134 L 40 142 L 54 150 Z" />
          <path {...p} strokeWidth={3.8} fill="#ffcf3a" d="M 145 110 L 158 118 L 146 126 Z" />
          <path {...p} strokeWidth={3.8} fill="#ffcf3a" d="M 146 134 L 160 142 L 146 150 Z" />
        </g>
      );
      const innerArt = (
        <g>
          {/* 공룡 특유의 큼직한 원형+소형 쌍반점 얼룩무늬 */}
          <circle cx="64" cy="72" r="10" fill={darkSpot} />
          <circle cx="76" cy="60" r="5" fill={darkSpot} />
          <circle cx="136" cy="72" r="10" fill={darkSpot} />
          <circle cx="124" cy="60" r="5" fill={darkSpot} />
          <circle cx="60" cy="118" r="8.5" fill={darkSpot} />
          <circle cx="140" cy="118" r="8.5" fill={darkSpot} />
          {/* 공룡 배 갑피 패치 & 3줄 주름 무늬 */}
          <path d="M 70 124 C 70 116 130 116 130 124 L 132 172 L 68 172 Z" fill={lightBelly} opacity="0.72" />
          <g fill={darkSpot}>
            <rect x="75" y="128" width="50" height="7.5" rx="3.75" />
            <rect x="73" y="142" width="54" height="7.5" rx="3.75" />
            <rect x="75" y="156" width="50" height="7.5" rx="3.75" />
          </g>
        </g>
      );
      return { faceY: 90, topY: 12, rightShadeX: 130, shape: renderBody(bodyPath, topper, innerArt, null, 130) };
    }
  }
}

function Face({ kind, mood, y, line }: { kind: MonsterKind; mood: MonsterMood; y: number; line: string }) {
  // hit / happy / sleep 상태는 공통 리액션으로 명확한 타격·포획·수면 피드백 제공
  if (mood !== 'idle') {
    const eye = (x: number) => {
      switch (mood) {
        case 'hit':
          return (
            <g key={x} stroke={line} strokeWidth="5" strokeLinecap="round">
              <line x1={x - 8} y1={y - 8} x2={x + 8} y2={y + 8} />
              <line x1={x + 8} y1={y - 8} x2={x - 8} y2={y + 8} />
            </g>
          );
        case 'happy':
          return (
            <path key={x} d={`M${x - 10} ${y + 3} Q${x} ${y - 11} ${x + 10} ${y + 3}`} stroke={line} strokeWidth="5" fill="none" strokeLinecap="round" />
          );
        case 'sleep':
          return (
            <path key={x} d={`M${x - 10} ${y - 2} Q${x} ${y + 8} ${x + 10} ${y - 2}`} stroke={line} strokeWidth="5" fill="none" strokeLinecap="round" />
          );
      }
    };
    const mouth = {
      hit: <ellipse cx="100" cy={y + 24} rx="8" ry="9" fill={line} />,
      happy: (
        <g>
          <path d={`M84 ${y + 15} L116 ${y + 15} C116 ${y + 36} 84 ${y + 36} 84 ${y + 15} Z`} fill={line} stroke={line} strokeWidth="3" strokeLinejoin="round" />
          <ellipse cx="100" cy={y + 26} rx="8" ry="4.5" fill="#ff7b95" />
        </g>
      ),
      sleep: <ellipse cx="100" cy={y + 22} rx="5" ry="4" fill={line} />,
    }[mood];

    return (
      <g>
        {eye(78)}
        {eye(122)}
        <ellipse cx="64" cy={y + 14} rx="8.5" ry="5.5" fill="#ff6b8b" opacity="0.42" />
        <ellipse cx="136" cy={y + 14} rx="8.5" ry="5.5" fill="#ff6b8b" opacity="0.42" />
        {mouth}
      </g>
    );
  }

  // 'idle' 상태: 레퍼런스 이미지의 8종 몬스터 고유 표정 + 귀여운 송곳니·볼터치 디테일
  const whiteEye = (cx: number, cy: number, r = 10.5, px = cx, py = cy, pr = 4.6) => (
    <g key={`${cx}-${cy}`}>
      <circle cx={cx} cy={cy} r={r} fill="#ffffff" stroke={line} strokeWidth="3.2" />
      <circle cx={px} cy={py} r={pr} fill={line} />
      <circle cx={px - 1.5} cy={py - 1.5} r={pr * 0.35} fill="#ffffff" />
    </g>
  );

  switch (kind) {
    case 'horn':
      return (
        <g>
          {whiteEye(76, y - 2, 10.5, 76, y - 2, 4.5)}
          {whiteEye(124, y - 2, 10.5, 124, y - 2, 4.5)}
          <ellipse cx="62" cy={y + 12} rx="7.5" ry="4.5" fill="#ff6b8b" opacity="0.4" />
          <ellipse cx="138" cy={y + 12} rx="7.5" ry="4.5" fill="#ff6b8b" opacity="0.4" />
          {/* 귀여운 양쪽 송곳니 + 지그재그 입 */}
          <polygon points={`85,${y + 23} 89,${y + 32} 93,${y + 23}`} fill="#ffffff" stroke={line} strokeWidth="2.4" strokeLinejoin="round" />
          <polygon points={`107,${y + 23} 111,${y + 32} 115,${y + 23}`} fill="#ffffff" stroke={line} strokeWidth="2.4" strokeLinejoin="round" />
          <path
            d={`M83 ${y + 22} L89 ${y + 29} L95 ${y + 22} L100 ${y + 29} L105 ${y + 22} L111 ${y + 29} L117 ${y + 22}`}
            fill="none"
            stroke={line}
            strokeWidth="4.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );

    case 'jelly':
      return (
        <g>
          {whiteEye(78, y - 2, 10.5, 82, y - 2, 4.8)}
          {whiteEye(122, y - 2, 10.5, 126, y - 2, 4.8)}
          <ellipse cx="64" cy={y + 11} rx="7" ry="4" fill="#ff6b8b" opacity="0.38" />
          <ellipse cx="136" cy={y + 11} rx="7" ry="4" fill="#ff6b8b" opacity="0.38" />
          <line x1="86" y1={y + 22} x2="114" y2={y + 22} stroke={line} strokeWidth="5" strokeLinecap="round" />
          {/* 작은 물방울 혀 */}
          <path d={`M103 ${y + 22} C103 ${y + 30} 111 ${y + 30} 111 ${y + 22} Z`} fill="#ff7b95" stroke={line} strokeWidth="2.6" />
        </g>
      );

    case 'antenna':
      return (
        <g>
          {whiteEye(78, y - 2, 13, 78, y - 2, 5.5)}
          {whiteEye(120, y + 2, 8.5, 120, y + 2, 3.6)}
          <ellipse cx="65" cy={y + 14} rx="6.5" ry="4" fill="#ff6b8b" opacity="0.4" />
          <ellipse cx="132" cy={y + 14} rx="6.5" ry="4" fill="#ff6b8b" opacity="0.4" />
          <polygon points={`106,${y + 24} 110,${y + 32} 114,${y + 22}`} fill="#ffffff" stroke={line} strokeWidth="2.4" strokeLinejoin="round" />
          <path d={`M85 ${y + 20} Q100 ${y + 33} 115 ${y + 20}`} fill="none" stroke={line} strokeWidth="4.8" strokeLinecap="round" />
        </g>
      );

    case 'mushroom':
      return (
        <g>
          <circle cx="88" cy={y - 4} r="5.2" fill={line} />
          <circle cx="86.5" cy={y - 5.5} r="1.8" fill="#ffffff" />
          <circle cx="112" cy={y - 4} r="5.2" fill={line} />
          <circle cx="110.5" cy={y - 5.5} r="1.8" fill="#ffffff" />
          <ellipse cx="70" cy={y + 8} rx="7.5" ry="4.5" fill="#ff6b8b" opacity="0.42" />
          <ellipse cx="130" cy={y + 8} rx="7.5" ry="4.5" fill="#ff6b8b" opacity="0.42" />
          <path d={`M82 ${y + 14} L118 ${y + 14} C118 ${y + 37} 82 ${y + 37} 82 ${y + 14} Z`} fill={line} stroke={line} strokeWidth="3.2" strokeLinejoin="round" />
          {/* 앞니 2개 + 분홍 혀 */}
          <rect x="93" y={y + 14} width="6.5" height="5" rx="1.5" fill="#ffffff" />
          <rect x="100.5" y={y + 14} width="6.5" height="5" rx="1.5" fill="#ffffff" />
          <ellipse cx="100" cy={y + 27} rx="8.5" ry="5" fill="#ff7b95" />
        </g>
      );

    case 'cloud':
      return (
        <g>
          {[78, 122].map((cx) => (
            <g key={cx}>
              <path d={`M${cx - 10} ${y - 3} A10 10 0 0 0 ${cx + 10} ${y - 3} Z`} fill="#ffffff" stroke={line} strokeWidth="3" strokeLinejoin="round" />
              <circle cx={cx} cy={y} r="4" fill={line} />
              <line x1={cx - 12} y1={y - 3} x2={cx + 12} y2={y - 3} stroke={line} strokeWidth="4.8" strokeLinecap="round" />
            </g>
          ))}
          <ellipse cx="64" cy={y + 11} rx="7.5" ry="4.5" fill="#ff6b8b" opacity="0.42" />
          <ellipse cx="136" cy={y + 11} rx="7.5" ry="4.5" fill="#ff6b8b" opacity="0.42" />
          <ellipse cx="100" cy={y + 22} rx="9" ry="11.5" fill={line} />
          <ellipse cx="100" cy={y + 28} rx="5.5" ry="4" fill="#ff7b95" />
        </g>
      );

    case 'fluff':
      return (
        <g>
          <path d={`M66 ${y - 12} L82 ${y - 4} L66 ${y + 4}`} fill="none" stroke={line} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M134 ${y - 12} L118 ${y - 4} L134 ${y + 4}`} fill="none" stroke={line} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx="62" cy={y + 10} rx="8" ry="4.5" fill="#ff6b8b" opacity="0.42" />
          <ellipse cx="138" cy={y + 10} rx="8" ry="4.5" fill="#ff6b8b" opacity="0.42" />
          <circle cx="100" cy={y + 16} r="4.5" fill={line} />
        </g>
      );

    case 'pebble':
      return (
        <g>
          {whiteEye(76, y - 2, 8.5, 76, y - 2, 3.8)}
          {whiteEye(124, y - 2, 8.5, 124, y - 2, 3.8)}
          {whiteEye(100, y - 16, 8.5, 100, y - 16, 3.8)}
          <ellipse cx="62" cy={y + 10} rx="7" ry="4" fill="#ff6b8b" opacity="0.38" />
          <ellipse cx="138" cy={y + 10} rx="7" ry="4" fill="#ff6b8b" opacity="0.38" />
          <path d={`M94 ${y + 16} C94 ${y + 27} 106 ${y + 27} 106 ${y + 16} Z`} fill="#ff7b95" stroke={line} strokeWidth="2.8" strokeLinejoin="round" />
          <line x1="84" y1={y + 16} x2="116" y2={y + 16} stroke={line} strokeWidth="4.6" strokeLinecap="round" />
        </g>
      );

    case 'ghost':
      return (
        <g>
          <path d={`M67 ${y - 4} Q78 ${y + 6} 89 ${y - 4}`} fill="none" stroke={line} strokeWidth="5" strokeLinecap="round" />
          <path d={`M111 ${y - 4} Q122 ${y + 6} 133 ${y - 4}`} fill="none" stroke={line} strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="66" cy={y + 9} rx="8" ry="4.5" fill="#ff6b8b" opacity="0.4" />
          <ellipse cx="134" cy={y + 9} rx="8" ry="4.5" fill="#ff6b8b" opacity="0.4" />
          <polygon points={`106,${y + 20} 109,${y + 27} 112,${y + 19}`} fill="#ffffff" stroke={line} strokeWidth="2.2" strokeLinejoin="round" />
          <path
            d={`M88 ${y + 18} Q94 ${y + 25} 100 ${y + 19} Q106 ${y + 25} 112 ${y + 18}`}
            fill="none"
            stroke={line}
            strokeWidth="4.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );
  }
}

function Crown({ y }: { y: number }) {
  return (
    <g transform={`translate(100 ${y})`}>
      <path
        d="M-26 6 L-30 -22 L-14 -8 L0 -28 L14 -8 L30 -22 L26 6 Z"
        fill={GOLD}
        stroke={INK}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="0" cy="-6" r="4" fill="#ff6b8b" />
    </g>
  );
}

export function MonsterSprite({ kind, color, mood, golden = false, size = 200, className, outline }: Props) {
  const clipId = `monster-clip-${useId().replace(/:/g, '')}`;
  const fill = golden ? GOLD : color;
  const line = outline ?? INK;
  const { shape, faceY, topY } = monsterArt(kind, fill, line, clipId);
  return (
    // 위쪽 여백: 키 큰 몬스터(안테나·꼭지·뿔)의 황금 왕관이 잘리지 않게
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -24 224 224" width={size} height={size} className={className} role="img" aria-label="몬스터">
      <ellipse cx="100" cy="180" rx="56" ry="8.5" fill={INK} opacity="0.14" />
      {shape}
      <Face kind={kind} mood={mood} y={faceY} line={line} />
      {golden && (
        <>
          <Crown y={topY} />
          <path d="M168 50 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 Z" fill="#fff" stroke={GOLD} strokeWidth="2" className="sparkle" />
          <path d="M30 70 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 Z" fill="#fff" stroke={GOLD} strokeWidth="2" className="sparkle sparkle--late" />
        </>
      )}
      {mood === 'sleep' && (
        <text x="150" y="60" fontSize="26" fontWeight="800" fill={INK} opacity="0.7">
          Z<tspan fontSize="18" dy="-12">z</tspan>
        </text>
      )}
    </svg>
  );
}
