/**
 * 필드 모험 운영 수치 — 값을 바꿀 때는 이 파일만 고친다.
 * 각 규칙 파일(encounter·wildBattle·growth…)은 여기 값을 가져다 쓰고, 테스트는 그 값으로 규칙을 확인한다.
 * 값을 바꾸면 tests/field/tuning.test.ts의 고정값도 함께 고치고, MVP_DESIGN.md 변경 이력에 한 줄 남긴다.
 */

// ── 만남 ──
/** 풀숲 한 걸음에 만날 확률 */
export const ENCOUNTER_CHANCE_GRASS = 0.3;
/** 풀숲 밖 길 한 걸음에 만날 확률 */
export const ENCOUNTER_CHANCE_PATH = 0.04;
/** 전투가 끝난 뒤 이 걸음 수 안에는 만나지 않음 */
export const ENCOUNTER_GRACE_STEPS = 3;
/** 만났을 때 레전드일 확률(12단 열린 뒤에만) */
export const LEGEND_CHANCE = 0.02;
/** 아직 못 본 종이 뽑힐 가중치(본 종은 1) */
export const UNSEEN_WEIGHT = 2;
/** 야생 구구몬 레벨 범위 */
export const WILD_LEVEL_MIN = 3;
export const WILD_LEVEL_MAX = 6;
export const LEGEND_LEVEL = 20;

// ── 야생 전투 ──
export const WILD_MAX_HP = 100;
/** 정답 한 번에 깎는 HP */
export const HIT_DAMAGE = 40;
/** 빨리 맞히면 더 깎는 HP */
export const FAST_HIT_BONUS = 10;
/** 문제가 떠 있는 동안 1초에 차오르는 HP */
export const REGEN_PER_SEC = 3;
/** 이만큼 문제를 내도 못 쓰러뜨리면 지쳐서 잠든다 */
export const WILD_MAX_QUESTIONS = 12;

// ── 도망 시간: HP가 꽉 찬 채로 이만큼 지나면 도망간다 (관리자 '도망 빠르기'가 곱해짐) ──
/** 2~5단 / 6~11단 / 12단 이상 */
export const FLEE_BASE_LOW_MS = 7000;
export const FLEE_BASE_MID_MS = 9000;
export const FLEE_BASE_HIGH_MS = 12000;
/** 아직 잘 모르는 문제(상자 0·1)면 더 기다려 줌 */
export const FLEE_LOW_BOX_BONUS_MS = 3000;
/** 빈칸 문제면 더 기다려 줌 */
export const FLEE_MISSING_BONUS_MS = 2000;

// ── 캡슐 ──
/** 첫 캡슐로 잡힐 확률 */
export const CATCH_CHANCE = 0.3;
/** 빠져나올 때마다 오르는 확률 */
export const CATCH_STEP = 0.15;
/** 빠져나온 뒤 야생 HP */
export const ESCAPE_HP = 40;

// ── 출제 ──
/** 기술 버튼(보기) 개수 */
export const FIELD_CHOICES = 3;

// ── 성장 ──
export const MAX_LEVEL = 30;
/** 같은 종을 또 잡았을 때 */
export const DUPLICATE_EXP = 40;
/** 전투에 나간 동행이 받는 기본 경험치 */
export const PARTICIPATION_EXP = 10;
/** 그 전투에서 맞힌 문제마다 */
export const CORRECT_EXP = 2;
/** 다음 레벨까지 필요한 경험치 = EXP_BASE + 레벨 × EXP_PER_LEVEL */
export const EXP_BASE = 20;
export const EXP_PER_LEVEL = 10;
/** 진화하는 레벨: 2단계 Lv8, 3단계 Lv18 */
export const EVOLVE_LEVELS = { 2: 8, 3: 18 } as const;

// ── 화면 연출 시간 (ms) — 규칙 결과에는 영향 없음 ──
/** 한 걸음 걷는 시간 */
export const STEP_MS = 180;
/** 이보다 짧게 누르면 걷지 않고 방향만 바꾼다 */
export const TURN_TAP_MS = 120;
/** 이 안에 떼면(가운데에서 안 끌었을 때) 탭으로 쳐서 글·알림을 닫는다 */
export const TAP_CLOSE_MS = 300;
/** 만남 → 전투 화면으로 넘어가기 전 번쩍이는 시간 */
export const ENCOUNTER_FLASH_MS = 800;
/** "나타났다!" 글이 떠 있는 시간 (탭하면 바로 넘김) */
export const WILD_INTRO_MS = 1200;
/** 정답 기술 연출 시간 (이동안 시간은 멈춘다) */
export const WILD_HIT_ANIM_MS = 600;
/** 도망갔다·잡았다 글을 보여 주고 필드로 돌아가기까지 */
export const WILD_END_MS = 1500;
/** 캡슐이 흔들리는 횟수와 한 번의 시간 */
export const CAPSULE_SHAKES = 3;
export const CAPSULE_SHAKE_MS = 400;
/** 필드 불러오기 화면을 적어도 이만큼은 보여준다 */
export const MIN_LOADING_MS = 600;
/** 물결 그림이 바뀌는 시간 */
export const WATER_FRAME_MS = 500;

// ── 마을에서 돌아다니는 구구몬 ──
/** 가만히 서 있는 시간 범위 */
export const ROAM_IDLE_MIN_MS = 1500;
export const ROAM_IDLE_MAX_MS = 3000;
/** 한 칸 걷는 시간 / 점프 / 잠 */
export const ROAM_MOVE_MS = 360;
export const ROAM_JUMP_MS = 600;
export const ROAM_SLEEP_MS = 5000;
/** 다음 모션을 고르는 가중치 */
export const ROAM_WEIGHTS = { move: 0.6, idle: 0.25, jump: 0.1, sleep: 0.05 };
/** 말풍선이 떠 있는 시간 */
export const ROAM_BUBBLE_MS = 2500;
