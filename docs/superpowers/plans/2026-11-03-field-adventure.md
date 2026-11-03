# 필드 모험 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 타이틀 화면에서 퀴즈 모험(지금 앱)과 필드 모험(걸어 다니며 야생 몬스터와 구구단 전투 → 캡슐로 잡기 → 도감·동행·진화)을 고르는 테스트판을 만든다.

**Architecture:** 규칙은 모두 `src/domain/field/`의 순수 함수(시간은 `dtMs` 인자로 받음)로 두고 Vitest로 고정한다. 화면은 `src/field/`(필드는 canvas 1장 + React 오버레이, 전투는 React). 출제·답 기록은 기존 `scheduler`·`questionGen`·`progress.recordAnswer`를 그대로 쓰고, 단 목록·보기 개수·상자 상한만 옵션으로 넓힌다. 저장은 기존 `gugu-monster:save`에 `field` 항목 하나를 더한다.

**Tech Stack:** React 18, TypeScript, Vite, Zustand persist, HashRouter, Vitest, Playwright, `pixelfx`(MIT, 효과만)

**Spec:** `docs/superpowers/specs/2026-11-03-field-adventure-design.md` (확정판). 이 계획은 M0~M6. **M7 캐릭터 개발은 제외**.

## Global Constraints

- 화면 글자·주석·커밋 메시지는 한국어(어린이가 읽기 쉬운 말). 커밋 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 작업은 `field-adventure` 브랜치에서. `main` 머지·push·배포는 사용자가 요청할 때만.
- 저장 키 `gugu-monster:save` 그대로, `SCHEMA_VERSION` 2 그대로(칸 추가만 → `mergeSave`가 채움). `SaveData`에 칸을 더하면 `createInitialSave`·`mergeSave`·`useGameStore`의 `partialize`·`admin/DataSecurityPanels.tsx`의 `currentSave()` 네 곳을 함께.
- 퀴즈 모험의 동작은 바뀌지 않는다: 기존 단위 테스트·E2E가 모두 통과해야 한다(E2E 시작 방법만 타이틀 경유로 바뀜).
- 몬스터 그림은 기존 `MonsterSprite` 8종만, 새로 그리지 않는다. 포켓몬 이름·그림·원작 타일을 쓰지 않는다. 화면에 '포켓몬'·'몬스터볼' 낱말 금지(구구몬·캡슐).
- 필드 문제 모양은 `product`·`missingFirst`·`missingSecond`만. 보기 3개. 셈 문제 없음.
- 필드 정답은 숙련도 상자를 **3까지만** 올린다(`FIELD_MAX_BOX = 3`). 정답 별은 1개(+오답 극복 보너스는 지금처럼), 빠르기 별 없음.
- 필드 단: 초원 2·4·8, 물가 3·6·9, 사막 5·7·12(12는 `learning.challengeUnlocked`일 때만). 레전드 13단, 해금 뒤에만.
- 휴대폰 375px 세로 기준. 픽셀 그림은 `image-rendering: pixelated`, 정수 배율.
- 수치는 모두 이름 있는 상수로 두고 테스트에서 값을 고정한다(아래 각 작업에 값).
- 명령: `npx tsc --noEmit -p .` / `npx vitest run` / `E2E_PORT=5181 npx playwright test` / `npm run build`. 파이프로 줄일 땐 `set -o pipefail`.

## Review Focus

1. **탭을 떠났다 돌아옴**: 백그라운드에서 `requestAnimationFrame`이 멈췄다가 돌아오면 한 번에 수십 초가 흘러 바로 도망가면 안 된다 → `tick`은 한 번에 `MAX_TICK_MS = 250`까지만 흐르고, 화면은 `document.hidden`이면 시간을 멈춘다. (Task 6, Task 8)
2. **옛 저장·백업 불러오기**: `field`가 없는 저장본/백업 파일을 불러와도 별·펫·학습 기록은 그대로, `field`만 기본값. (Task 3)
3. **전투 중 새로고침·앱 닫기**: 이미 푼 답은 기록에 남고, `#/field/battle`을 직접 열면(전투 상태 없음) 필드로 돌아간다. (Task 8)
4. **버튼 연타**: 한 문제에 답이 두 번 기록되거나 HP가 두 번 깎이면 안 된다 → `question`이 아닌 단계에서 `answerWild`는 상태를 바꾸지 않는다. (Task 6)
5. **손가락이 패드 밖으로/전화가 옴**: `pointercancel`·패드 밖에서 떼기 뒤에 캐릭터가 계속 걸으면 안 된다. (Task 4)

---

## 파일 구조

```
src/screens/TitleScreen.tsx        타이틀 (Task 1)
src/domain/field/
  fields.ts          필드 3곳: 단·몬스터·출구 (Task 2)
  movement.ts        칸 지도·이동·충돌 (Task 2)
  fieldQuestions.ts  필드·레전드 출제 (Task 5)
  wildBattle.ts      HP·회복·도망·캡슐 상태 머신, 도망 시간 (Task 6)
  creatures.ts       종 표(8종+레전드 3)·기술·첫 구구몬 (Task 7)
  encounter.ts       만남 판정·종/단/레벨 고르기 (Task 7)
  growth.ts          경험치·레벨·진화 (Task 12)
src/field/
  maps/meadow.ts · maps/waterside.ts · maps/desert.ts   지도 문자열 (Task 2, 10)
  TouchPad.tsx, padDirection.ts  (Task 4)
  FieldScreen.tsx, fieldRenderer.ts, field.css  (Task 4)
  creatureSprite.tsx   몬스터 그림 고르는 한 곳 (Task 8)
  WildBattleScreen.tsx, wildBattle.css  (Task 8, 9)
  StarterScreen.tsx, FieldDexScreen.tsx  (Task 9)
  FieldLoading.tsx, loadField.ts  (Task 10)
  pixelArt.ts          타일·주인공 픽셀 배열 (Task 13)
src/store/fieldData.ts   FieldData 형식·기본값·merge (Task 3)
tests/field/*.test.ts
e2e/field.spec.ts, e2e/title.spec.ts
```

---

## M0 — 타이틀 + 필드 뼈대

### Task 1: 타이틀 화면과 라우트

**Files:**
- Create: `src/screens/TitleScreen.tsx`, `src/screens/title.css`, `e2e/title.spec.ts`
- Modify: `src/App.tsx` (`/` 라우트, `/field` 자리), `src/components/TopBar.tsx` ([처음 화면] 버튼), `e2e/helpers.ts`, `goto('/')`를 쓰는 E2E 7곳

**Interfaces:**
- Produces: 주소 `#/` = 타이틀, `#/field` = 필드 모험 입구(이 작업에선 "준비 중" 자리 컴포넌트), `e2e/helpers.ts`의 `openQuiz(page: Page): Promise<void>`(`/`로 가서 [퀴즈 모험] 클릭)

- [ ] **Step 1: 실패하는 E2E 작성** — `e2e/title.spec.ts`
  - `타이틀에서 퀴즈 모험을 고르면 처음 쓰는 사람은 알 고르기로 간다`: `goto('/')` → 버튼 `퀴즈 모험`·`필드 모험`이 보임 → `퀴즈 모험` 클릭 → URL `#/welcome`
  - `알을 고른 사람은 퀴즈 모험에서 나의 펫으로 간다`: `seedHatchedPet` → `goto('/')` → `퀴즈 모험` → `#/pet`
  - `필드 모험 버튼은 #/field로 간다`
  - `퀴즈 모험 위쪽 [처음 화면]을 누르면 타이틀로 돌아온다`
- [ ] **Step 2: 실행해 실패 확인** — `E2E_PORT=5181 npx playwright test e2e/title.spec.ts` → FAIL
- [ ] **Step 3: 구현**
  - `App.tsx`: `<Route path="/" element={<Navigate to="/pet" />}>`를 탭 레이아웃 밖의 `fullScreen(<TitleScreen />)`로 옮긴다. `OnboardingGuard`는 퀴즈 모험 주소에만 그대로. `*` 대체 경로는 `/`로.
  - `TitleScreen`: 앱 이름, 큰 버튼 두 개(세로, 높이 64px 이상), `navigate('/pet')` / `navigate('/field')`. 그림은 지금은 글자만(Task 13에서 꾸밈).
  - `TopBar`: 왼쪽에 `처음 화면` 버튼(`navigate('/')`).
  - E2E: `goto('/')` 7곳을 `openQuiz(page)`로 바꾼다.
- [ ] **Step 4: 전체 확인** — `npx tsc --noEmit -p .` · `npx vitest run` · `E2E_PORT=5181 npx playwright test` 모두 PASS
- [ ] **Step 5: 커밋** — `타이틀 화면: 퀴즈 모험·필드 모험 고르기`

### Task 2: 필드 규칙과 초원 지도

**Files:**
- Create: `src/domain/field/fields.ts`, `src/domain/field/movement.ts`, `src/field/maps/meadow.ts`, `tests/field/movement.test.ts`, `tests/field/maps.test.ts`

**Interfaces:**
- Produces:
  - `type FieldId = 'meadow' | 'waterside' | 'desert'`
  - `type Dir = 'up' | 'down' | 'left' | 'right'`
  - `interface Pos { x: number; y: number }`
  - `type Tile = 'path' | 'grass' | 'block' | 'sign' | 'deco' | 'exit'`
  - `interface FieldMap { id: FieldId; width: number; height: number; tiles: Tile[][]; entrances: Partial<Record<FieldId | 'start', Pos>>; exits: { pos: Pos; to: FieldId }[]; signs: { pos: Pos; text: string }[] }`
  - `parseMap(id: FieldId, rows: string[], legend: MapLegend): FieldMap` — 문자: `.` 길, `,` 풀숲, `#` 막힘, `*` 꾸밈, `S` 표지판, `<`/`>` 출구, `@` 시작
  - `interface StepResult { pos: Pos; moved: boolean; enteredGrass: boolean; exitTo: FieldId | null }`
  - `tryStep(map: FieldMap, pos: Pos, dir: Dir): StepResult`
  - `FIELDS: Record<FieldId, { name: string; dans: Dan[]; species: MonsterKind[] }>` — 초원 `[2,4,8]`·`['cloud','mushroom','fluff']`, 물가 `[3,6,9]`·`['jelly','antenna','horn']`, 사막 `[5,7,12]`·`['pebble','ghost']`
  - `fieldDans(field: FieldId, challengeUnlocked: boolean): Dan[]` — 닫혀 있으면 12 뺌
  - `MEADOW_ROWS: string[]` (20×20)

- [ ] **Step 1: 실패하는 테스트**
  - `tryStep`: 막힘 칸·지도 밖으로는 `moved:false`, 풀숲으로 들어가면 `enteredGrass:true`, 출구 칸이면 `exitTo` 채움.
  - `fieldDans('desert', false)` → `[5,7]`, `fieldDans('desert', true)` → `[5,7,12]`.
  - `maps.test.ts`: 초원 지도가 20×20, `@`가 하나, 시작점에서 BFS로 모든 풀숲·출구·표지판 옆 칸에 닿는다.
- [ ] **Step 2: 실패 확인** — `npx vitest run tests/field`
- [ ] **Step 3: 구현** — 초원 지도는 가운데 흙길 십자, 풀숲 덩어리 3~4개, 왼쪽 끝 `<`(물가), 오른쪽 끝 `>`(사막), 집·나무는 `#`.
- [ ] **Step 4: 통과 확인** — `npx vitest run tests/field` PASS
- [ ] **Step 5: 커밋** — `필드 규칙: 필드 3곳의 단, 칸 이동, 초원 지도`

### Task 3: 저장 데이터 `field`

**Files:**
- Create: `src/store/fieldData.ts`, `tests/field/fieldSave.test.ts`
- Modify: `src/store/saveData.ts` (`SaveData`, `createInitialSave`, `mergeSave`), `src/store/useGameStore.ts` (`partialize`, 액션), `src/screens/admin/DataSecurityPanels.tsx` (`currentSave`)

**Interfaces:**
- Produces:
  - `type SpeciesId = MonsterKind | 'legend-fluff' | 'legend-horn' | 'legend-ghost'`
  - `interface SpeciesEntry { level: number; exp: number; stage: 1 | 2 | 3; caught: number; firstCaughtAt: number }`
  - `interface FieldData { starterChosen: boolean; companion: SpeciesId | null; species: Partial<Record<SpeciesId, SpeciesEntry>>; seen: SpeciesId[]; position: { map: FieldId; x: number; y: number; facing: Dir }; stats: { battles: number; catches: number; fled: number } }`
  - `initialField(): FieldData` — `position`은 초원 `@`
  - `mergeField(initial: FieldData, persisted: unknown): FieldData` — 모르는 종 아이디·잘못된 지도 이름은 버리고 기본값
  - `type FieldNotice = { kind: 'levelUp'; species: SpeciesId; level: number } | { kind: 'evolve'; species: SpeciesId; stage: 2 | 3 }` (Task 12에서 채워 씀)
  - 스토어 액션: `setFieldPosition(pos: FieldData['position']): void`, `markSeen(id: SpeciesId): void`(이미 있으면 그대로)
  - `Settings`에 `fieldFleeScale: 0.8 | 1 | 1.5` (기본 1)

- [ ] **Step 1: 실패하는 테스트**
  - `mergeSave(createInitialSave(now), 옛저장_field없음)` → `field`가 `initialField()`와 같고, `economy.stars`·`learning.facts`는 옛 값 그대로.
  - `field.position.map = 'volcano'`인 저장 → 초원 기본 자리로.
  - `species`에 모르는 키(예: `'dragon'`) → 버려짐.
  - `markSeen('horn')` 두 번 → `seen`에 한 번만.
  - `settings.fieldFleeScale` 없으면 1.
- [ ] **Step 2: 실패 확인**
- [ ] **Step 3: 구현** — 네 곳 모두. 백업 불러오기(`replaceSave`)는 이미 `mergeSave`를 거치는지 확인하고, 아니면 거치게.
- [ ] **Step 4: 통과 + 기존 `tests/saveMigration.test.ts` 통과**
- [ ] **Step 5: 커밋** — `저장 데이터에 필드 모험 칸 추가 (예전 저장은 기본값으로 채움)`

### Task 4: 필드 화면과 터치패드

**Files:**
- Create: `src/field/padDirection.ts`, `src/field/TouchPad.tsx`, `src/field/FieldScreen.tsx`, `src/field/fieldRenderer.ts`, `src/field/field.css`, `tests/field/padDirection.test.ts`, `e2e/field.spec.ts`
- Modify: `src/App.tsx` (`/field` → `FieldScreen`)

**Interfaces:**
- Consumes: `tryStep`, `parseMap`, `MEADOW_ROWS` (Task 2), `setFieldPosition` (Task 3)
- Produces:
  - `padDirection(dx: number, dy: number, deadZone: number): Dir | null` — 가운데 `deadZone` 안은 `null`, 그 밖은 가장 가까운 4방향
  - `STEP_MS = 180`, `TURN_TAP_MS = 120`(이보다 짧게 누르면 방향만 바꿈), `TILE_PX = 16`
  - `TouchPad` props: `{ onDir(dir: Dir | null): void; onA(): void; onB(): void }`
  - `FieldScreen`이 걸음마다 부르는 훅 자리 `onStep(result: StepResult)` (Task 8에서 만남 연결)
  - 화면 요소 이름(E2E용): `aria-label="십자 패드"`, `"A 버튼"`, `"B 버튼"`, canvas `data-testid="field-canvas"`, 디버그용 `data-pos="x,y"`

- [ ] **Step 1: 실패하는 테스트**
  - `padDirection(0, -40, 15)` → `'up'`, `(30, 5, 15)` → `'right'`, `(3, 4, 15)` → `null`.
  - E2E(375×812): `#/field` → 십자 패드 오른쪽을 누르고 0.5초 → `data-pos`의 x가 커짐 → 떼면 멈춤(0.4초 뒤 그대로).
  - E2E: 패드를 누른 채 `pointercancel` 보내기 → 걸음이 멈춤 (Review Focus 5).
  - E2E: 걸은 뒤 새로고침 → 같은 자리 (저장 확인).
- [ ] **Step 2: 실패 확인**
- [ ] **Step 3: 구현**
  - canvas 1장, 화면 위 60%. 배율 = `Math.floor(canvas폭 / (8 * TILE_PX))`. 카메라는 주인공 가운데, 지도 끝에서 멈춤. 그림은 임시 색 칸(길 연갈색, 풀숲 초록, 막힘 짙은 초록, 주인공 빨간 칸).
  - 걸음: 누르고 있으면 `STEP_MS`마다 `tryStep`, 그 사이는 보간. 짧게 톡(`< TURN_TAP_MS`)은 방향만.
  - `TouchPad`: `pointerdown/move/up/cancel` + `setPointerCapture`, `touch-action: none`, pointerId별 처리. 키보드 방향키·WASD·Z(A)·X(B)도 같은 입력.
  - 위쪽 오른쪽 메뉴 버튼(지금은 [처음 화면]만).
  - 표지판: 표지판을 바라보고 A → 아래쪽 글 상자에 `signs[].text`, A·B로 닫음(글 상자가 떠 있는 동안 걷지 않음). E2E에 한 줄 추가: 초원 표지판 앞에서 A → 글이 보임.
  - 걸음이 끝날 때마다 `setFieldPosition`.
- [ ] **Step 4: 통과 확인 + 개발 서버(`npx vite --port 5181`) 375px로 직접 걸어 보기**
- [ ] **Step 5: 커밋** — `필드 모험: 초원을 걸어 다니는 화면과 터치패드`

---

## M1 — 야생 전투 핵심

### Task 5: 필드 출제 (기존 엔진 옵션 넓히기)

**Files:**
- Modify: `src/domain/questionGen.ts` (`generateQuestion`), `src/domain/scheduler.ts` (`planExploration`), `src/domain/mastery.ts` (`AnswerEvent`, `applyAnswer`), `src/domain/progress.ts` (`AnswerInput.source`)
- Create: `src/domain/field/fieldQuestions.ts`, `tests/field/fieldQuestions.test.ts`
- Test: 기존 `tests/questionGen.test.ts`·`tests/scheduler.test.ts`·`tests/mastery.test.ts` 그대로 통과

**Interfaces:**
- Produces:
  - `generateQuestion(rng, fact, type, choiceCount = CHOICE_COUNT): Question` — 보기 `choiceCount`개, 정답 하나 포함
  - `interface PlanOptions { dans?: Dan[]; reviewFromAllDans?: boolean }` / `planExploration(learner, mode, now, rng, opts?: PlanOptions)` — `dans`가 있으면 본 출제 풀은 그 단(∩ 해금된 단), 오답 복습 슬롯 풀은 `reviewFromAllDans`면 해금된 모든 단. 옵션 없으면 지금과 똑같이.
  - `AnswerEvent.maxBox?: Box`, `applyAnswer`는 승급 시 `maxBox`를 넘지 않음
  - `AnswerInput.source?: 'trial' | 'normal' | 'field'` — `'field'`면 `maxBox = FIELD_MAX_BOX`
  - `FIELD_MAX_BOX: Box = 3`, `FIELD_TYPES: readonly QuestionType[] = ['product','missingFirst','missingSecond']`, `FIELD_CHOICES = 3`
  - `planFieldQuestions(learner: LearnerSnapshot, field: FieldId, now: number, rng: Rng): PlannedItem[]`
  - `planLegendQuestions(learner: LearnerSnapshot, now: number, rng: Rng): PlannedItem[]` — 13단만, 다른 단 복습 없음

- [ ] **Step 1: 실패하는 테스트**
  - `generateQuestion(..., 3)` 1000번: 보기 3개, 서로 다름, 정답 정확히 하나. 기본값 호출은 4개(기존 테스트).
  - `planFieldQuestions(학습자, 'meadow', ...)` 200번: 모든 문제의 단 ∈ {2,4,8} — 단, 다른 단의 오답 복습 대상(`isWrongReviewDue`) 사실은 예외로 허용; 유형 ∈ `FIELD_TYPES`; `sequence`·`commutative` 없음.
  - 사막 + `challengeUnlocked:false` → 12단 문제 없음. `true` → 12단이 나올 수 있음.
  - `planLegendQuestions` → 모두 13단.
  - `applyAnswer`: 상자 3인 사실을 `maxBox:3`으로 빠르게 맞혀도 3 그대로; `maxBox` 없으면 4로(기존).
  - `recordAnswer(..., source:'field')`로 2단 11개를 모두 상자 3까지 올려도 `masteredDans`에 2단 없음.
  - 퀴즈 모험 동일성: 같은 시드로 `planExploration(learner, {kind:'recommended'}, now, rng)` 결과가 옵션 추가 전과 같음(고정 시드 스냅샷).
- [ ] **Step 2: 실패 확인**
- [ ] **Step 3: 구현** — `fieldQuestions`는 `planExploration(..., { dans: fieldDans(...), reviewFromAllDans: true })` 뒤 `FIELD_TYPES` 밖 유형을 `isTypeEligible`을 지키며 `FIELD_TYPES` 중에서 다시 고른다(상자 0은 `product`).
- [ ] **Step 4: 통과 + `npx vitest run` 전체**
- [ ] **Step 5: 커밋** — `출제: 단 목록·보기 개수 옵션, 필드 정답은 상자 3까지`

### Task 6: 야생 전투 상태 머신

**Files:**
- Create: `src/domain/field/wildBattle.ts`, `tests/field/wildBattle.test.ts`

**Interfaces:**
- Produces:
  - 상수: `WILD_MAX_HP = 100`, `HIT_DAMAGE = 40`, `FAST_HIT_BONUS = 10`, `REGEN_PER_SEC = 3`, `CATCH_CHANCE = 0.3`, `CATCH_STEP = 0.15`, `ESCAPE_HP = 40`, `WILD_MAX_QUESTIONS = 12`, `MAX_TICK_MS = 250`
  - `type WildPhase = 'question' | 'anim' | 'hint' | 'dizzy' | 'caught' | 'fled'`
  - `interface WildState { hp: number; fullMs: number; phase: WildPhase; catchChance: number; questions: number; correct: number; asleep: boolean }`
  - `createWild(): WildState` (hp 100, phase `question`, catchChance 0.3)
  - `tick(s: WildState, dtMs: number, fleeMs: number): WildState` — `question`일 때만 시간이 흐름; dt는 `MAX_TICK_MS`로 자름; hp<100이면 회복(꽉 차면 100에서 멈춤), hp=100인 동안 `fullMs` 누적, `fullMs >= fleeMs`면 `fled`; hp<100이 되면 `fullMs = 0`
  - `answerWild(s: WildState, correct: boolean, fast: boolean): WildState` — `question`이 아니면 그대로 반환; 정답: hp −(40 또는 50), hp≤0이면 `dizzy`, 아니면 `anim`; 오답: `hint`; `questions+1`; 답 뒤 `questions >= 12`이고 hp>0이면 `asleep:true`, `dizzy`
  - `resumeWild(s: WildState): WildState` — `anim`/`hint` → `question`
  - `throwCapsule(s: WildState, rng: Rng): WildState` — `dizzy`에서만; `rng() < catchChance` → `caught`; 아니면 hp 40, `catchChance = min(1, catchChance + 0.15)`, `fullMs 0`, `asleep:false`, `questions`는 그대로, phase `question`
  - `fleeTimeMs(fact: Fact, box: Box, type: QuestionType, scale: number): number` — 기본: 2~5단 7000, 6~9단 9000, 12·13단 12000; 상자 0~1 +3000; `missingFirst`·`missingSecond` +2000; × `scale`

- [ ] **Step 1: 실패하는 테스트**
  - 처음 상태에서 `tick(…, 100ms씩 70번, fleeMs 7000)` → `fled`; 69번이면 아직 `question`.
  - `hint`·`anim` 단계에서 10초 `tick` → hp·fullMs 그대로.
  - `tick(s, 60000, 7000)` 한 번 → 250ms만 흐름(아직 `question`) (Review Focus 1).
  - 정답(느림) 뒤 hp 60 → 5초 `tick` → 75.
  - 느린 아이: "정답 → `resumeWild` → 10초 `tick`"을 반복하면 12문제 안에 `dizzy`이고 `asleep:false`.
  - 연타: `answerWild`를 두 번 연달아(사이에 resume 없이) → 두 번째는 상태 그대로, `questions` 1 (Review Focus 4).
  - 12번 모두 오답 → `dizzy`, `asleep:true`.
  - `throwCapsule` rng 0.29 → `caught`; rng 0.31 → hp 40, catchChance 0.45; 여섯 번 실패 뒤 catchChance 1.
  - `fleeTimeMs`: 3×4(상자 3, product, scale 1) = 7000; 7×8(상자 0) = 12000; 6×□(상자 2, missingSecond) = 11000; 13단 상자 0 빈칸 = 17000; scale 1.5 → ×1.5.
- [ ] **Step 2: 실패 확인**
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과**
- [ ] **Step 5: 커밋** — `야생 전투 규칙: HP 회복·도망 시간·캡슐 확률`

### Task 7: 종 표와 만남

**Files:**
- Create: `src/domain/field/creatures.ts`, `src/domain/field/encounter.ts`, `tests/field/encounter.test.ts`

**Interfaces:**
- Consumes: `FIELDS`, `fieldDans`, `FieldId` (Task 2), `SpeciesId` (Task 3)
- Produces:
  - `interface SpeciesDef { id: SpeciesId; kind: MonsterKind; name: string; field: FieldId | 'legend'; moves: [string, string, string]; legend: boolean }`
  - `SPECIES: readonly SpeciesDef[]` — 8종 이름은 `MONSTER_NAMES`, 기술은 설계서 6-1 표 그대로; 레전드 `legend-fluff`(황금 왕관몬)·`legend-horn`(황금 뿔뿔몬)·`legend-ghost`(황금 외뿔공룡몬), 기술 3개씩(이 작업에서 지음)
  - `speciesDef(id: SpeciesId): SpeciesDef`, `STARTERS: SpeciesId[] = ['cloud','jelly','pebble']`
  - 상수: `ENCOUNTER_CHANCE = 0.12`, `ENCOUNTER_GRACE_STEPS = 3`, `LEGEND_CHANCE = 0.02`, `UNSEEN_WEIGHT = 2`, `WILD_LEVEL_MIN = 3`, `WILD_LEVEL_MAX = 6`, `LEGEND_LEVEL = 20`
  - `interface Encounter { species: SpeciesId; dan: Dan; level: number; legend: boolean }`
  - `rollEncounter(rng: Rng, ctx: { field: FieldId; stepsSinceBattle: number; challengeUnlocked: boolean; seen: readonly SpeciesId[] }): Encounter | null` — 풀숲에 들어선 걸음에서만 부른다는 전제; `stepsSinceBattle < 3`이면 `null`; 레전드는 해금 뒤에만, 단 13, 레벨 20; 일반은 그 필드 종에서 못 본 종 ×2 가중, 몸 색 단은 `fieldDans` 중 무작위
  - E2E 스위치(기존 `__GUGU_E2E_CALM__`와 같은 방식, `globalThis`에서 읽음): `__GUGU_E2E_FIELD__`면 만남·캡슐 100%, `__GUGU_E2E_LEGEND__`면 만남이 레전드(해금 조건은 그대로 지킴). `e2eFlags(): { field: boolean; legend: boolean }`로 한 곳에서 읽는다.

- [ ] **Step 1: 실패하는 테스트**
  - 안전 걸음: `stepsSinceBattle` 0~2면 rng와 상관없이 `null`.
  - rng 0.11 → 만남, 0.13 → `null` (레전드 판정 rng는 닫힘 상태라 건너뜀).
  - 초원 1000번 → 종 ∈ {cloud, mushroom, fluff}, 단 ∈ {2,4,8}, 레벨 3~6.
  - 사막·닫힘 → 단 ∈ {5,7}; 열림 → 12 포함 가능.
  - 닫힘이면 1만 번에 레전드 0; 열림이면 레전드 비율 1~3%, 단 13, 레벨 20.
  - `seen`에 cloud·mushroom이 있으면 fluff가 더 자주(1000번 중 fluff > 400).
- [ ] **Step 2~4: 실패 확인 → 구현 → 통과**
- [ ] **Step 5: 커밋** — `구구몬 종 표와 풀숲 만남`

### Task 8: 야생 전투 화면

**Files:**
- Create: `src/field/creatureSprite.tsx`, `src/field/WildBattleScreen.tsx`, `src/field/wildBattle.css`, `src/field/useFieldSession.ts`
- Modify: `src/App.tsx` (`/field/battle`), `src/field/FieldScreen.tsx` (만남 → 전투), `src/pwa/autoUpdate.ts` (`BUSY_ROUTES`에 `/field/battle`), `tests/autoUpdate.test.ts`, `e2e/field.spec.ts`

**Interfaces:**
- Consumes: Task 5~7 전부, `recordAnswer` 스토어 액션, `HintPanel`
- Produces:
  - `creatureSprite(id: SpeciesId, opts: { view: 'front' | 'back' | 'mini'; stage?: 1|2|3; mood?: MonsterMood; color: string; size: number }): JSX.Element` — 테스트판: `MonsterSprite`(레전드는 `golden`), `back`은 좌우 뒤집기 + 0.8배, `stage` 2·3은 1.15·1.3배
  - 세션 스토어(저장 안 함) `useFieldSession`: `{ encounter: Encounter | null; stepsSinceBattle: number; set(patch) }`
  - 버튼 이름(E2E용): 기술 버튼 `aria-label="{기술} {숫자}"`, `aria-label="캡슐 던지기"`, `aria-label="도망치기"`

- [ ] **Step 1: 실패하는 테스트**
  - `tests/autoUpdate.test.ts`: `isBusyRoute('#/field/battle')` → true, `isBusyRoute('#/field')` → false.
  - E2E(`__GUGU_E2E_FIELD__`): 초원 풀숲으로 한 걸음 → `#/field/battle` → "나타났다" 글 → 문제와 버튼 3개(정답 하나) → 정답 3번 → HP 바 0 → `캡슐 던지기` 버튼 보임.
  - E2E: 전투 중 답 하나 고른 뒤 새로고침 → `#/field`로 돌아오고, 퀴즈 모험 기록 화면의 오늘 푼 문제 수가 1 늘어 있음 (Review Focus 3).
  - E2E: 정답 버튼 빠르게 두 번 클릭 → 오늘 푼 문제 수 1만 늘어남.
- [ ] **Step 2: 실패 확인**
- [ ] **Step 3: 구현**
  - 전투 시작: `markSeen`(Task 3) → 문제 목록 = 레전드면 `planLegendQuestions`, 아니면 `planFieldQuestions`; 모자라면 다시 받아 이어 붙임.
  - 문제 하나: `generateQuestion(rng, fact, type, FIELD_CHOICES)`. 버튼 3개는 동행 기술 3개 순서 고정, 숫자 위치만 섞임. 말풍선은 야생 위.
  - 시계: `requestAnimationFrame`으로 `tick(state, dt, fleeTimeMs(...))`, `document.hidden`이면 dt 0.
  - 답: `recordAnswer({ ..., inputMode:'choice', source:'field' })`를 **고를 때 바로**. 빠름 = `ms <= fastThresholdMs(fact,'choice')`. 정답 연출 0.6초 뒤 `resumeWild`, 오답은 `HintPanel` 닫을 때 `resumeWild` + 같은 사실 다시 넣기(`insertRetry`).
  - HP 바: 꽉 차면 테두리 깜빡임 + 줄어드는 모래시계(남은 `fleeMs - fullMs`).
  - `fled` → "도망갔다…" 1.5초 → 필드. B 버튼/`도망치기` → 확인 → 도망과 같음.
  - 세션에 `encounter`가 없으면 `#/field`로 `Navigate`.
- [ ] **Step 4: 통과 + 375px에서 직접 전투 해 보기**
- [ ] **Step 5: 커밋** — `야생 전투 화면: 기술 버튼 3개, HP 회복과 도망`

---

## M2 — 캡슐·도감·첫 구구몬

### Task 9: 잡기 결과, 첫 구구몬 고르기, 구구몬 도감

**Files:**
- Create: `src/field/StarterScreen.tsx`, `src/field/FieldDexScreen.tsx`, `src/field/fieldDex.css`, `tests/field/fieldStore.test.ts`
- Modify: `src/store/useGameStore.ts`, `src/field/WildBattleScreen.tsx`, `src/field/FieldScreen.tsx`(메뉴), `src/App.tsx` (`/field/starter`, `/field/dex`), `e2e/field.spec.ts`

**Interfaces:**
- Consumes: `throwCapsule` (Task 6), `SPECIES`·`STARTERS` (Task 7), `settlePet`·`addAffection`·`ANSWER_AFFECTION`
- Produces (스토어 액션):
  - `chooseStarter(id: SpeciesId, now: number): void` — `starterChosen`, `companion`, `species[id] = { level:5, exp:0, stage:1, caught:1, firstCaughtAt: now }`, `seen`에도 넣음
  - `setCompanion(id: SpeciesId): boolean` — 잡은 종만
  - `finishWildBattle(r: { species: SpeciesId; level: number; caught: boolean; fled: boolean; correct: number; now: number }): WildResult`
  - `interface WildResult extends PetChange { newSpecies: boolean; affection: number; notices: FieldNotice[] }` (`FieldNotice`는 Task 3, 이 작업에선 늘 빈 배열 — Task 12에서 채움)
  - 동작: 새 종이면 `species`에 `{ level: r.level, exp:0, stage:1, caught:1, firstCaughtAt }`; `stats` 갱신; 펫 친밀도 `correct × ANSWER_AFFECTION`을 `settlePet`으로(펫이 `egg`면 0); 진화·레벨업 결과는 기존처럼 `useSessionStore`로

- [ ] **Step 1: 실패하는 테스트** (`fieldStore.test.ts`, 스토어를 초기 저장으로 리셋해서)
  - `chooseStarter('jelly')` 뒤 `companion === 'jelly'`, 도감 1종.
  - `finishWildBattle({species:'horn', caught:true, correct:3, ...})` → `newSpecies:true`, `stats.catches 1`, 펫 친밀도 +3.
  - 펫이 알이면 친밀도 그대로.
  - `setCompanion('ghost')`(안 잡음) → false, 동행 그대로.
  - E2E: 처음 `#/field` → 첫 구구몬 고르기로 → 젤리몬 고르기 → 필드. 풀숲 → 정답 3번 → `캡슐 던지기` → "잡았다!" → 메뉴 → 도감에 그 종이 색으로, 못 본 종은 실루엣.
- [ ] **Step 2~4: 실패 확인 → 구현 → 통과**
  - 캡슐: 흔들림 3번(각 0.4초) 뒤 결과. 실패하면 "앗, 빠져나왔다!" 후 전투 계속.
  - 도감: 필드별 묶음(초원 3·물가 3·사막 2) + 레전드 3, 칸 = 못 봄(실루엣 ?) / 봄(흑백) / 잡음(색·레벨·잡은 횟수). 잡은 칸을 누르면 [함께 다니기].
  - `#/field`에서 `starterChosen`이 false면 `#/field/starter`로.
- [ ] **Step 5: 커밋** — `캡슐로 잡기, 첫 구구몬 고르기, 구구몬 도감`

---

## M3 — 필드 3곳, 따로 불러오기, 레전드

### Task 10: 물가·사막과 필드 이동

**Files:**
- Create: `src/field/maps/waterside.ts`, `src/field/maps/desert.ts`, `src/field/loadField.ts`, `src/field/FieldLoading.tsx`
- Modify: `src/field/FieldScreen.tsx`, `tests/field/maps.test.ts`, `e2e/field.spec.ts`

**Interfaces:**
- Consumes: `parseMap`, `StepResult.exitTo` (Task 2)
- Produces:
  - `loadField(id: FieldId): Promise<FieldMap>` — `import('./maps/<id>')` 동적 불러오기(빌드에서 필드마다 따로 묶임)
  - `MIN_LOADING_MS = 600`
  - 물가 지도: 오른쪽 끝 `>`(초원), 사막 지도: 왼쪽 끝 `<`(초원), 각자 `entrances.meadow`

- [ ] **Step 1: 실패하는 테스트**
  - `maps.test.ts`에 물가·사막도 같은 검사(20×20, 입구에서 모든 풀숲·출구에 닿음), 모든 출구의 `to` 필드에 짝이 되는 입구가 있음.
  - E2E: 초원 왼쪽 출구로 걸어감 → 불러오기 화면에 "물가 · 3·6·9단" → 물가 입구에 섬 → 새로고침해도 물가.
  - E2E: 물가에서 만난 몬스터가 젤리몬·안테나몬·뿔뿔몬 중 하나 (`data-species` 속성으로 확인).
  - 빌드 확인: `npm run build` 출력에 `waterside`·`desert` 이름이 들어간 js 묶음이 따로 있음.
- [ ] **Step 2~4: 실패 확인 → 구현 → 통과**
  - 불러오기 실패(오프라인) → "인터넷에 연결되면 갈 수 있어요" → 원래 필드 출구 한 칸 앞으로.
- [ ] **Step 5: 커밋** — `물가·사막 필드와 필드 사이 이동 (필드마다 따로 불러오기)`

### Task 11: 레전드 전투

**Files:**
- Modify: `src/field/WildBattleScreen.tsx`, `src/field/wildBattle.css`, `e2e/field.spec.ts`

**Interfaces:**
- Consumes: `Encounter.legend` (Task 7), `planLegendQuestions` (Task 5), `creatureSprite`의 레전드 = 황금 (Task 8)

- [ ] **Step 1: 실패하는 E2E** — 12·13단 열린 저장 + `__GUGU_E2E_FIELD__` + `__GUGU_E2E_LEGEND__`(레전드 강제) → "전설의 황금 ○○몬이 나타났다!" → 문제의 첫 수가 13(또는 빈칸 문제에서 13단 사실).
- [ ] **Step 2~4: 실패 확인 → 구현(반짝이는 특별 전환, 황금 테두리) → 통과**
- [ ] **Step 5: 커밋** — `레전드 구구몬: 13단 문제, 어느 필드든 드물게`

---

## M4 — 경험치·레벨·진화·동행

### Task 12: 성장 규칙과 동행

**Files:**
- Create: `src/domain/field/growth.ts`, `tests/field/growth.test.ts`
- Modify: `src/store/useGameStore.ts` (`finishWildBattle`), `src/store/useSessionStore.ts`, `src/field/WildBattleScreen.tsx`(결과), `src/field/FieldScreen.tsx`(따라 걷기), `src/field/FieldDexScreen.tsx`, `e2e/field.spec.ts`

**Interfaces:**
- Produces:
  - 상수: `MAX_LEVEL = 30`, `DUPLICATE_EXP = 40`, `PARTICIPATION_EXP = 10`, `CORRECT_EXP = 2`, `EVOLVE_LEVELS = { 2: 8, 3: 18 }`
  - `expToNext(level: number): number` = `20 + level * 10`
  - `addExp(e: SpeciesEntry, exp: number, legend: boolean): { entry: SpeciesEntry; levelsGained: number; evolvedTo: 2 | 3 | null }` — Lv30에서 멈춤, 레전드는 진화 없음, 한 번에 여러 레벨 가능
  - `FieldNotice`(Task 3)를 실제로 만들어 넣는다
  - `useSessionStore`에 `pendingFieldNotices: FieldNotice[]`
  - `finishWildBattle`: 동행에 `PARTICIPATION_EXP + correct × CORRECT_EXP`, 이미 있는 종을 잡으면 그 종에 `DUPLICATE_EXP`, 알림을 `notices`로 반환

- [ ] **Step 1: 실패하는 테스트**
  - `expToNext(1) = 30`, `expToNext(10) = 120`.
  - Lv7 exp 0 + 충분한 exp → Lv8, `evolvedTo 2`; Lv17 → 18에서 `evolvedTo 3`; 레전드 Lv17→18은 `null`.
  - Lv30에서 exp를 더해도 Lv30.
  - 한 번에 두 레벨 오르면 `levelsGained 2`.
  - 스토어: 동행 젤리몬, 정답 4로 끝 → 젤리몬 exp +18; 같은 종 다시 잡음 → +40.
  - E2E: 결과 화면 뒤 "레벨이 올랐어!" 알림, 도감에 새 레벨; 필드에서 동행이 주인공 바로 뒤 칸을 따라옴(`data-companion-pos`).
- [ ] **Step 2~4: 실패 확인 → 구현 → 통과**
  - 진화 모습(테스트판): `creatureSprite`의 `stage` 크기 + 이름 뒤 `★★`/`★★★`.
- [ ] **Step 5: 커밋** — `구구몬 경험치·레벨·진화, 동행 따라 걷기`

---

## M5 — 테스트판 꾸미기

### Task 13: 픽셀 타일·주인공, 효과, 타이틀 그림, 도망 빠르기 설정

**Files:**
- Create: `src/field/pixelArt.ts`, `src/field/fx.ts`, `NOTICE.md`(없으면)
- Modify: `src/field/fieldRenderer.ts`, `src/field/WildBattleScreen.tsx`, `src/screens/TitleScreen.tsx`, `src/screens/admin/`의 설정 패널(도망 빠르기 3단), `tests/field/pixelArt.test.ts`

**Interfaces:**
- Produces:
  - `pixelArt.ts`: 16×16 픽셀 배열(팔레트 문자 → 색) — 초원(풀밭·흙길·풀숲·나무·꽃·집 지붕), 물가(물 2프레임·모래톱·다리·수초), 사막(모래·바위·선인장·마른 덤불), 주인공 4방향 × 걸음 2프레임. 원작 타일을 보고 옮겨 그리지 않는다.
  - `bakeTiles(art): HTMLCanvasElement` (처음 한 번 오프스크린에 굽기)
  - `fx.ts`: `pixelfx`에서 전환(`transitions`), 타격(`impacts`), 캡슐(`spawn & death`·`pickups`) 효과를 부르는 얇은 함수 `playFx(canvas, name, at)`; 쓴 효과 이름을 `NOTICE.md`에 MIT 표기와 함께
  - 관리자: `settings.fieldFleeScale` 느리게(1.5)·보통(1)·빠르게(0.8)

- [ ] **Step 1: 실패하는 테스트** — 모든 타일 배열이 16줄×16칸, 팔레트에 없는 문자 없음; 관리자 E2E: 도망 빠르기 "느리게" → 저장 후 새로고침해도 유지.
- [ ] **Step 2~4: 실패 확인 → 구현 → 통과** — 375px에서 세 필드·전투·타이틀 화면을 직접 보고 확인, 스크린샷 남기기.
- [ ] **Step 5: 커밋** — `필드 모험 꾸미기: 픽셀 타일·주인공·전투 효과, 도망 빠르기 설정`

---

## M6 — 정리와 배포 준비

### Task 14: 문서·전체 검사

**Files:**
- Modify: `MVP_DESIGN.md`(변경 이력 맨 위에 `v1.34 | 필드 모험 테스트판 …` 한 줄 + 필드 모험 절 요약·설계 문서 링크), `CLAUDE.md`(폴더 표에 `src/domain/field/`·`src/field/`, 타이틀·필드 주소, `__GUGU_E2E_FIELD__`)

- [ ] **Step 1: 전체 검사** — `npx tsc --noEmit -p .` · `npx vitest run` · `E2E_PORT=5181 npx playwright test` · `MSYS_NO_PATHCONV=1 BASE_PATH=/gugu-monster/ npm run build` 모두 통과(실패한 `dex.spec` 놀이 장면은 따로 다시 돌려 확인)
- [ ] **Step 2: 375px로 처음부터 끝까지 놀아 보기** — 타이틀 → 퀴즈 모험 한 판 → 처음 화면 → 필드 모험(첫 구구몬 → 잡기 → 물가·사막 → 진화)
- [ ] **Step 3: 커밋** — `설계서 v1.34·CLAUDE.md: 필드 모험 테스트판`
- [ ] **Step 4: 배포는 사용자 요청 시** — CLAUDE.md "배포" 순서대로(`main` 머지 → push → Actions 확인 → 라이브 확인)
