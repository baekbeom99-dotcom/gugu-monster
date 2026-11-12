# 필드 모험 2차 구현 계획 — 태초마을 · 캡슐 · 새 전투 · 조이스틱 · 속성 효과

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v1.35 필드 모험 위에 태초마을 허브·플로팅 조이스틱·길 만남·강함 4단계 전투(문제마다 시간, 적 공격, 내 체력·쓰러짐)·필드별 캡슐 4종과 상점 연습(캡슐 얻기·회복약)·속성별 기술 효과를 더한다.

**Architecture:** 규칙은 모두 `src/domain/field/`의 순수 함수(시간·난수는 인자)로 두고 Vitest로 고정한다. 수치는 `tuning.ts` 한 곳. 화면은 `src/field/`(필드는 canvas 1장 + React 겹층, 전투·상점은 React). 저장은 `SaveData.field` 안에 칸을 더하고 `mergeField`가 옛 저장을 채운다. 단계 M1~M5는 각각 끝나면 배포할 수 있는 상태다.

**Tech Stack:** React 18, TypeScript, Vite, Zustand persist, HashRouter, Vitest, Playwright, `pixelfx`(효과)

**Spec:** `docs/superpowers/specs/2026-11-11-field-adventure-2-design.md` (사용자 승인). 계획과 설계서가 어긋나면 설계서가 이긴다. 앞 설계서 `2026-11-03-field-adventure-design.md`의 적지 않은 규칙은 그대로.

## Global Constraints

- 화면 글자·주석·커밋 메시지는 어린이가 읽기 쉬운 한국어. 커밋 메시지는 한 줄 요약 + 끝에 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- 작업은 `field-adventure-2` 브랜치. **push·merge·배포 금지**(사용자가 시킬 때만).
- 저장 키 `gugu-monster:save` 그대로. `SaveData`(중첩 `field` 포함)에 칸을 더하면 네 곳을 함께: `createInitialSave` 기본값(`initialField`), `mergeSave`→`mergeField` 깊게 채우기·값 검사, `useGameStore`의 `partialize`(`field` 통째라 그대로인지 확인), `admin/DataSecurityPanels.tsx`의 `currentSave()`(`field` 통째라 그대로인지 확인). 로컬 데이터를 잃지 않는 것이 최우선.
- 펫 친밀도·XP가 바뀌는 액션은 `settlePet(before, after, now)`로 진화·레벨업을 잡는다(지금 `finishWildBattle` 방식 유지).
- 운영 수치(확률·시간·개수·데미지·배율)는 `src/domain/field/tuning.ts`에만 두고 `tests/field/tuning.test.ts` 고정표를 같이 고친다. 화면 배치 크기(px)는 컴포넌트 상수로 둔다.
- 원작 게임의 그림·이름·타일을 복제하지 않는다. 화면에 '포켓몬'·'몬스터볼' 낱말 금지. 지명 **'태초마을'**과 캡슐의 둥근 공·위아래 반쪽·가운데 띠·단추 구도는 사용자가 허락했다. 그림은 우리가 새로 그린다.
- 휴대폰 375×812 세로 기준. 화면이 바뀌는 작업은 개발 서버(`npx vite --port 5181`)에서 375px로 직접 보고 확인한다.
- 필드 문제 모양 `product`·`missingFirst`·`missingSecond`, 보기 3개, 상자 3까지(`source: 'field'`)는 그대로. 상점 연습의 답도 `source: 'field'`로 기록한다.
- 각 단계(M) 끝: `npx tsc --noEmit -p .` · `npx vitest run` · `E2E_PORT=5181 npx playwright test` · `npm run build` 모두 통과. 파이프로 줄일 땐 `set -o pipefail`. 단계마다 `MVP_DESIGN.md` 맨 위 변경 이력 표에 한 줄(M1 v1.36 … M5 v1.40).
- 설계서 [확정] 결정은 바꾸지 않는다.

## Review Focus

1. **옛 저장 불러오기**: v1.35 저장(`position.map`이 `meadow`, `species[id]`에 `hp`·`wounds` 없음, `capsules` 없음)을 열면 자리는 그대로, `hp` 100·`wounds` []·`capsules` {3,3,3,0}. 음수·소수·모르는 사실 ID·모르는 지도 이름은 걸러 기본값. → Task 6(`position.map`), Task 9(`hp`·`wounds`), Task 14(`capsules`)에 테스트.
2. **전투 도중 앱 닫았다 열기**: 맞은 체력·상처·쓴 캡슐은 그 순간 저장돼 있고, 체력 0이면 이미 마을 시작 칸으로 옮겨져 있다(다시 열면 마을). `#/field/battle`을 직접 열면 필드로. 정산(경험치)은 없던 일. → Task 9(`damageCompanion`이 쓰러짐과 자리 이동을 한 번에 저장), Task 11 E2E.
3. **쓰러진 동행으로 만남이 일어나지 않기**: 동행 체력 0이면 풀숲·길 어디서도 만남 주사위를 굴리지 않고(난수도 안 씀) "구구몬이 쓰러졌어요. 상점에서 회복시켜요"를 보인다. 쓰러진 종은 동행으로 고를 수 없다. → Task 10(순수), Task 9(`setCompanion`), Task 11 E2E.
4. **캡슐 개수가 0 아래로 내려가지 않기**: 0개에서 `spendCapsule`은 `false`를 돌려주고 아무것도 안 바꾼다. 버튼 연타로 한 번에 두 개가 빠지지 않는다(던지는 중엔 막힘). 저장본의 음수·소수는 0·기본값으로. → Task 14.
5. **시간 제한이 힌트·확인창·가려진 탭에서 멈추기**: `tick`은 `question` 단계에서만 줄고, 한 번에 `MAX_TICK_MS`(250)까지만 흐른다. 화면은 인트로·명중·피격·힌트·어지러움·도망 확인창·`document.hidden` 동안 `tick`을 부르지 않는다. → Task 10(순수), Task 11 E2E(확인창 6초 열어도 피격 없음).

---

## 파일 구조 (새로 만들거나 크게 바뀌는 곳)

```
src/domain/field/
  tuning.ts        만남(풀숲·길)·단계 표·던지기·체력·상처·캡슐·연습·돌아다니기 수치 (M1~M4)
  fields.ts        + MapId, MAP_IDS (T4)
  movement.ts      + ^ v D ~ g a p 글자, door 칸, 출구 inward, zones·raw, bump (T3, T4)
  encounter.ts     encounterChance, stepOnTile, 단계·레벨 뽑기 (T1, T10)
  strength.ts      단계 표 읽기·뽑기·던지기 확률 계산 (T8)        새 파일
  wildBattle.ts    다시 씀: 시간·피격·정답 수·어지러움·던지기 4결과·화남 (T10)
  wounds.ts        체력·상처 목록·회복 연습 진행 (T9, T16)        새 파일
  capsules.ts      CapsuleType, 종→캡슐, 더하기·빼기 (T14)        새 파일
  shopQuiz.ts      한 단 ×1~×9 연습 진행 (T16)                    새 파일
  roam.ts          돌아다니는 구구몬 상태 (T7)                    새 파일
  elements.ts      종→속성 (T20)                                  새 파일
src/field/world/
  Joystick.tsx (TouchPad 대신, T3) · FieldHud.tsx (T18) · roamerLayer.ts (T7)
  maps/town.ts · maps/townTiles.ts (T5)
src/field/shop/ ShopPopup · CapsuleTab · PotionTab · DanPractice · HealPractice · shop.css (T17)
src/field/art/CapsuleBall.tsx (GachaCapsule 대신, T15)
src/field/fx/effects.ts  + 속성 효과 21개, ELEMENT_FX (T20)
src/store/fieldData.ts   + town 시작, capsules, hp, wounds (T6, T9, T14)
```

---

## Rulings (설계서와 코드·설계서 안에서 어긋난 곳)

- **R1 마을 시작 칸 계산** — `initialField()`가 마을 `@`를 알아야 해서 `fieldData.ts`가 `maps/town.ts`(지도 글자·표지판 글만)를 가져온다. 타일 그림 `townTiles.ts`는 불러오기 함수에서만 가져온다(마을 그림은 첫 화면 묶음에 안 들어감). 지금 `meadowStart()`가 `meadow.ts`를 가져오는 것과 같은 방식이고 `meadow.ts` 가져오기는 없앤다. — 지도 글자 40줄(약 1KB)만 첫 묶음에 든다. — 틀렸다면 비용: 1KB.
- **R2 세로로 긴 지도의 배율** — 지금 `viewScale(375,812,20,40)`은 2, 20×20 필드는 3이라 마을만 멀어 보인다. 화면을 덮는 배율을 `min(mapW, mapH)` 크기의 정사각형 기준으로 계산하도록 바꾼다(두 지도 모두 3). 정사각형이 화면을 덮으면 긴 지도도 덮으므로 검은 띠는 생기지 않는다. — 틀렸다면 비용: 함수 하나.
- **R3 전투 문제의 필드** — `useQuestionFeed`가 `position.map`으로 필드를 정하는데, `position.map`에 `'town'`이 생긴다. `Encounter`에 `field: FieldId`를 더하고 문제는 그 값으로 낸다. — 틀렸다면 비용: 없음(같은 값).
- **R4 E2E 스위치** — 길 만남 4%가 생겨 길을 걷는 E2E가 우연히 전투에 들어갈 수 있다. `__GUGU_E2E_FIELD__`는 **풀숲만** 100%, 새로 `__GUGU_E2E_PATH__`(길 100%), `__GUGU_E2E_NO_WILD__`(강제하지 않은 만남 0%, `e2e/fixtures.ts`가 모든 테스트에 켬), `__GUGU_E2E_NO_TIMER__`(문제 시간이 줄지 않음)를 더한다. 모두 `debugFlags.ts` 한 곳에서 읽고 CLAUDE.md 스위치 줄도 고친다. — 틀렸다면 비용: E2E가 가끔 흔들림.
- **R5 안전 걸음 세기** — 지금은 풀숲 걸음만 센다. 이제 풀숲·길 걸음(만남 주사위를 굴리는 걸음) 모두 센다. 마을·출구 칸 걸음은 굴리지도 세지도 않는다. — 전투 직후 길 3걸음도 안전. — 틀렸다면 비용: 숫자 하나.
- **R6 부딪힘은 누를 때 한 번** — A 버튼이 없어져 표지판·문·구구몬은 부딪히면 반응한다. 걸음 판정이 매 프레임 돌아서 그대로 두면 닫자마자 다시 열린다. 같은 칸에 대한 부딪힘은 방향을 떼거나 바꾸거나 한 칸 걸을 때까지 한 번만 반응한다. — 틀렸다면 비용: 창이 깜빡임.
- **R7 탭** — 조이스틱이 화면 어디서나 열리므로 '탭'은 손가락을 가운데 영역(dead zone) 밖으로 끌지 않고 `TURN_TAP_MS` 안에 뗀 것으로 정한다. 탭은 열린 글·알림을 닫고, 마을에서는 그 칸의 구구몬을 깨운다. — 틀렸다면 비용: 탭 판정 상수.
- **R8 시간 초과도 오답으로 기록** — 설계서는 시간 초과를 피격·힌트·다시 내기로만 적었다. 학습 기록은 `recordAnswer({ correct: false, ms: 제한 시간 })`로 남기고 `insertRetry`도 한다(오답과 같게). — 느린 아이의 상자가 내려갈 수 있다. — 틀렸다면 비용: `recordAnswer` 한 줄 빼기.
- **R9 쓰러지면 힌트 없이 끝** — 피격으로 체력 0이면 힌트로 가지 않고 바로 `fainted`로 끝난다(6-5 "그 자리에서 전투가 끝나고"). — 틀렸다면 비용: 단계 하나.
- **R10 쓰러짐과 강제 이동은 한 번에 저장** — `damageCompanion`이 체력을 0으로 만들면 같은 `set()`에서 `position`을 마을 `@`(아래 보기)로 바꾼다. 전투 끝 글을 보는 중에 앱을 닫아도 다시 열면 마을이다. — 틀렸다면 비용: 액션 하나의 숨은 일(테스트로 고정).
- **R11 던지기 난수 순서** — `r < 잡힘` 잡힘, `< 잡힘+재도전` 재도전, `< 1−화남` 도망, 나머지 화남. 그래서 `() => 0`은 언제나 잡힘(E2E 스위치 유지), `() => 0.999`는 화남. 화남이면 레벨을 위해 난수를 한 번 더 쓴다.
- **R12 정산은 끝났을 때의 단계로** — 화나서 강력이 되면 경험치 배율·잡힌 레벨은 강력(다시 뽑은 레벨) 기준. — 틀렸다면 비용: 인자 하나.
- **R13 경험치 반올림** — `Math.round((10 + 2×맞힌 수) × 배율)`, 같은 종 `Math.round(40 × 배율)`. 
- **R14 상처 중복** — 같은 `factId`+`type`이면 중복. 다시 맞으면 목록 맨 뒤(가장 최근)로 옮긴다. 10개 넘으면 오래된 것부터 버린다.
- **R15 쓰러진 종은 동행 불가** — `setCompanion`은 체력 0인 종이면 `false`. 도감 시트에 "쓰러짐"과 비활성 버튼.
- **R16 M3 임시 회복** — 회복약은 M4인데 M3만 배포되면 쓰러진 구구몬을 고칠 길이 없다. M3에서는 마을 상점 문에 부딪히면 모든 구구몬을 바로 회복하고 "구구몬들이 기운을 되찾았어요!"를 띄운다. Task 17이 상점 팝업으로 바꾼다.
- **R17 M3 캡슐 무제한** — 개수 제한은 M4(Task 14). M3에서는 던져도 줄지 않는다.
- **R18 캡슐 0개면 자동 퇴치** — 어지러워진 순간(또는 재도전 뒤) 맞는 캡슐이 0이면 버튼 없이 "캡슐이 없어서 돌려보냈어! 상점에서 캡슐을 구해 오자"와 함께 `released`로 끝난다.
- **R19 `fieldFleeScale`** — 관리자 화면 항목과 전투에서의 사용만 없앤다. `Settings` 형식과 `mergeSave` 검사는 그대로 둬 저장값은 보존·무시된다. `e2e/admin.spec.ts`의 도망 빠르기 검사는 지운다.
- **R20 황금은 다섯째 단계** — `Tier = 'weak'|'normal'|'strong'|'mighty'|'legend'`. `rollTier`는 앞 넷만 뽑고 레전드 만남은 `legend` 단계. 화남이어도 `legend`·`mighty`는 단계 그대로, 적 체력(맞은 수)만 0으로.
- **R21 그림용 칸 정보** — 마을 타일은 `g`·`a`·`p`·`~`를 구분해 그려야 하는데 칸 종류(`path`·`block`)만으로는 모른다. `FieldMap`에 원래 글자 줄 `raw: string[]`와 서식지 칸 목록 `zones`를 더한다.
- **R22 상점 연습에서 틀리면** — 힌트 뒤 '같은 문제'는 같은 `Question`(보기 그대로)이다.
- **R23 돌아다니기 수치** — 설계서에 없다. `tuning.ts`에 `ROAM_*`로 [제안] 값을 둔다(Task 7).

---

# M1 — 조이스틱 · 만남 확률(풀숲·길) · 풀숲 확대 (저장 데이터 없음)

### Task 1: 칸 종류별 만남 확률과 E2E 스위치

**담당:** Sonnet

**Files:**
- Modify: `src/domain/field/tuning.ts`, `src/domain/field/encounter.ts`, `src/domain/field/creatures.ts`(다시 내보내기 이름), `src/domain/field/movement.ts`(`StepResult.tile`), `src/field/debugFlags.ts`, `src/field/world/FieldScreen.tsx`(`checkEncounter`), `src/field/DevFieldGallery.tsx`(스위치 버튼), `e2e/fixtures.ts`, `CLAUDE.md`(E2E 스위치 줄)
- Test: `tests/field/encounter.test.ts`, `tests/field/tuning.test.ts`, `tests/field/movement.test.ts`, `tests/field/debugFlags.test.ts`, `e2e/field.spec.ts`

**Interfaces:**
- Produces:
  - tuning: `ENCOUNTER_CHANCE_GRASS = 0.3`, `ENCOUNTER_CHANCE_PATH = 0.04` (`ENCOUNTER_CHANCE` 삭제)
  - `StepResult` += `tile: Tile | null` (움직였으면 도착 칸 종류, 못 움직였으면 null). `enteredGrass`는 남긴다.
  - `encounterChance(map: FieldId, tile: Tile | null): number` — grass 0.3, path 0.04, 나머지 0 (M2에서 `map: MapId`로 넓히고 town 0)
  - `EncounterContext.force` → `{ grass?: boolean; path?: boolean; legend?: boolean; noWild?: boolean }`
  - `stepOnTile(rng, ctx: EncounterContext & { tile: Tile | null }): { encounter: Encounter | null; stepsSinceBattle: number }` (`stepIntoGrass` 대신). 확률 0인 칸은 rng를 쓰지 않고 걸음 수도 그대로.
  - `rollEncounter(rng, ctx & { tile })`: 첫 판정 — 그 칸 강제면 통과, `noWild`면 실패, 아니면 `rng() < encounterChance`.
  - `FieldDebugFlags` += `path: boolean`, `noWild: boolean`, `noTimer: boolean` (전역 `__GUGU_E2E_PATH__`, `__GUGU_E2E_NO_WILD__`, `__GUGU_E2E_NO_TIMER__`). `setDebugFlag` 이름에 `'path'` 추가.

- [ ] **Step 1: 실패하는 테스트 쓰기** (`tests/field/encounter.test.ts`의 `ENCOUNTER_CHANCE` 검사·`stepIntoGrass` 묶음을 바꾼다)

```ts
it('칸 종류별 만남 확률', () => {
  expect(encounterChance('meadow', 'grass')).toBe(0.3);
  expect(encounterChance('meadow', 'path')).toBe(0.04);
  for (const t of ['exit', 'sign', 'block', 'deco', null] as const) expect(encounterChance('meadow', t)).toBe(0);
});
it('길에서도 만난다: 0.039는 만남, 0.04는 아님', () => {
  expect(stepOnTile(() => 0.039, { ...ctx, stepsSinceBattle: 5, tile: 'path' }).encounter).not.toBeNull();
  expect(stepOnTile(() => 0.04, { ...ctx, stepsSinceBattle: 5, tile: 'path' }).encounter).toBeNull();
});
it('풀숲 0.299 만남, 0.3 아님', () => { /* 같은 꼴, tile 'grass' */ });
it('출구 칸은 난수를 쓰지 않고 걸음 수도 그대로', () => {
  const rng = vi.fn(() => 0);
  expect(stepOnTile(rng, { ...ctx, stepsSinceBattle: 1, tile: 'exit' })).toEqual({ encounter: null, stepsSinceBattle: 1 });
  expect(rng).not.toHaveBeenCalled();
});
it('길 걸음도 안전 걸음에 센다', () => {
  expect(stepOnTile(() => 0.99, { ...ctx, stepsSinceBattle: 0, tile: 'path' }).stepsSinceBattle).toBe(1);
});
it('강제 스위치: grass는 풀숲만, path는 길만, noWild면 강제 아닌 만남 없음', () => {
  expect(stepOnTile(() => 0.99, { ...ctx, stepsSinceBattle: 5, tile: 'grass', force: { grass: true } }).encounter).not.toBeNull();
  expect(stepOnTile(() => 0.99, { ...ctx, stepsSinceBattle: 5, tile: 'path', force: { grass: true } }).encounter).toBeNull();
  expect(stepOnTile(() => 0.99, { ...ctx, stepsSinceBattle: 5, tile: 'path', force: { path: true } }).encounter).not.toBeNull();
  expect(stepOnTile(() => 0, { ...ctx, stepsSinceBattle: 5, tile: 'grass', force: { noWild: true } }).encounter).toBeNull();
});
```
`movement.test.ts`: 풀숲으로 걸으면 `tile: 'grass'`, 막히면 `tile: null`. `tuning.test.ts` 고정표에서 `ENCOUNTER_CHANCE` → 두 값. `debugFlags.test.ts`: 세 전역을 켜면 `path`·`noWild`·`noTimer`가 true.

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/field` / Expected: FAIL (`encounterChance`·`stepOnTile` 없음)
- [ ] **Step 3: 구현** — 위 Interfaces대로. `FieldScreen.checkEncounter`는 `result.tile`을 넘기고 `force`를 `debugFlags()`로 채운다(`grass: flags.encounter`). `e2e/fixtures.ts`의 초기 스크립트에 `__GUGU_E2E_NO_WILD__ = true` 추가. 개발 화면에 '길 만남 100%' 스위치 버튼.
- [ ] **Step 4: E2E 하나 더하기** — `e2e/field.spec.ts`: `__GUGU_E2E_PATH__`를 켜고 초원 (5,10)→오른쪽 길로 한 걸음 → `#/field/battle`. (출발 칸 오른쪽이 길인지 지도에서 확인)
- [ ] **Step 5: 통과 확인** — Run: `npx vitest run && E2E_PORT=5181 npx playwright test e2e/field.spec.ts` / Expected: PASS
- [ ] **Step 6: Commit** — `git commit -m "필드 만남: 풀숲 30%, 길 4%, E2E 스위치(길·만남 끔·시간 멈춤) 추가"`

### Task 2: 세 필드의 풀숲을 두 배로

**담당:** Haiku (지도 글자만 고침, 테스트가 정답)

**Files:**
- Modify: `src/field/world/maps/meadow.ts`, `waterside.ts`, `desert.ts` (ROWS만)
- Test: `tests/field/maps.test.ts`

**Interfaces:** 없음(지도 글자). 지금 풀숲 칸: 초원 88, 물가 70, 사막 60.

- [ ] **Step 1: 실패하는 테스트** — `maps.test.ts`의 "풀숲이 충분하다"를 필드별 최소값으로 바꾼다.

```ts
const MIN_GRASS: Record<FieldId, number> = { meadow: 176, waterside: 140, desert: 120 };
expect(map.tiles.flat().filter((t) => t === 'grass').length).toBeGreaterThanOrEqual(MIN_GRASS[id]);
```
그리고 E2E가 기대는 칸을 고정한다:
```ts
it('E2E가 쓰는 칸은 그대로', async () => {
  const m = await loadField('meadow'), w = await loadField('waterside');
  expect([m.tiles[8][5], m.tiles[8][6], m.tiles[10][1], m.tiles[10][18], m.tiles[5][9], m.tiles[6][9]]).toEqual(['path', 'grass', 'path', 'path', 'sign', 'path']);
  expect([w.tiles[9][4], w.tiles[9][5], w.tiles[10][18]]).toEqual(['path', 'grass', 'path']);
});
```
- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/field/maps.test.ts` / Expected: FAIL(풀숲 부족)
- [ ] **Step 3: 지도 고치기** — `.`을 `,`로 바꿔 덩어리를 넓힌다. 테두리·출구·`@`·표지판·위 E2E 칸은 건드리지 않고, 출구·표지판으로 가는 길이 막히지 않게(같은 파일의 "모든 풀숲·출구·표지판 옆 칸에 닿는다" 테스트). 각 지도 맨 위 주석도 고친다.
- [ ] **Step 4: 통과 확인** — Run: `npx vitest run tests/field/maps.test.ts` / Expected: PASS. 개발 서버 375px에서 세 필드를 한 번씩 본다.
- [ ] **Step 5: Commit** — `git commit -m "세 필드의 풀숲을 두 배로 넓힘"`

### Task 3: 플로팅 조이스틱, A·B 삭제, 부딪히면 표지판

**담당:** Sonnet

**Files:**
- Create: `src/field/world/Joystick.tsx`
- Delete: `src/field/world/TouchPad.tsx` (와 `field.css`의 `.fpad*`)
- Modify: `src/domain/field/movement.ts`(`bump`), `src/field/world/FieldScreen.tsx`, `src/field/world/field.css`
- Test: `tests/field/movement.test.ts`, `tests/field/padDirection.test.ts`(그대로 통과), `e2e/field.spec.ts`(패드·A·B 테스트 고침)

**Interfaces:**
- Produces:
  - `StepResult` += `bump: Pos | null` — 가려던 칸이 표지판(M2부터 문·구구몬도)이라 못 갔으면 그 칸, 아니면 null. 벽·꾸밈·지도 밖은 null.
  - `tryStep(map: FieldMap, pos: Pos, dir: Dir, occupied?: (p: Pos) => boolean): StepResult` — `occupied(p)`가 true인 칸은 막히고 `bump`가 그 칸(M2 Task 7이 씀).
  - `Joystick({ onDir, onTap }: { onDir(dir: Dir | null): void; onTap(clientX: number, clientY: number): void })` — 부모(`.fieldmode__view`)를 덮는 투명 층. 컴포넌트 상수 `JOYSTICK_BASE_PX = 120`, `DEAD_ZONE_RATIO = 0.18`(가운데 판정은 `padDirection(dx, dy, JOYSTICK_BASE_PX * DEAD_ZONE_RATIO)`). 누른 자리에 바닥 원(`aria-label="조이스틱"`, 누르는 동안만 보임)과 손잡이를 그린다. 손가락 하나만(처음 `pointerId`), `pointerup`·`pointercancel`·`lostpointercapture`·window `pointerup`에서 `onDir(null)`(지금 TouchPad의 놓침 방지 그대로). R7: dead zone 밖으로 안 끌고 `TURN_TAP_MS` 안에 떼면 `onTap`.

- [ ] **Step 1: 실패하는 테스트** (`movement.test.ts`)

```ts
it('표지판에 부딪히면 bump에 그 칸', () => {
  const r = tryStep(map, signNeighbor, dirToSign);
  expect(r).toMatchObject({ moved: false, bump: signPos, tile: null });
});
it('벽은 bump 없음', () => expect(tryStep(map, wallNeighbor, dirToWall).bump).toBeNull());
it('occupied 칸은 막히고 bump', () => {
  const r = tryStep(map, { x: 1, y: 1 }, 'right', (p) => p.x === 2 && p.y === 1);
  expect(r).toMatchObject({ moved: false, bump: { x: 2, y: 1 } });
});
```
- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/field/movement.test.ts` / Expected: FAIL
- [ ] **Step 3: `tryStep`·`Joystick` 구현, `FieldScreen` 연결** — `TouchPad` 자리에 `<Joystick>`을 `.fieldmode__view` 안, 메뉴 버튼·알림·글 창보다 **아래 층**(z-index)으로 둔다(그래서 메뉴·팝업 위에서는 안 열린다). `press('A'|'B')`와 Z·X 키를 지운다. 걸음 루프에서 `result.bump`가 표지판이면 R6대로 한 번만 글을 연다: `st.lastBump`(칸 키)에 기억하고, 잡은 방향이 바뀌거나 놓이거나 한 칸 걸으면 지운다. `onTap`: 알림이 떠 있으면 닫기, 표지판 글이 떠 있으면 닫기(나머지는 M2). 글·알림이 떠 있으면 걷지 않는다(지금 그대로). 화살표·WASD 그대로.
- [ ] **Step 4: E2E 고치기** — 패드 테스트 셋을 조이스틱으로: 캔버스 가운데쯤 `mouse.down` → 오른쪽으로 60px `mouse.move` → 걸음 → `mouse.up` → 멈춤; 누른 채 `pointercancel` 디스패치 → 멈춤; 화면 밖으로 끌고 나가 떼도 멈춤. "누르는 동안 `조이스틱` 라벨이 보이고 떼면 사라진다". 표지판 테스트: (9,6)에서 위쪽 키를 눌러 부딪히면 글이 뜨고, 글을 탭(클릭)하면 닫히며, 방향키를 계속 누르고 있어도 다시 열리지 않는다(300ms 기다려 확인). 'A 버튼'·'B 버튼'·'십자 패드'를 찾는 곳이 남지 않게 grep.
- [ ] **Step 5: 통과 확인** — Run: `npx tsc --noEmit -p . && npx vitest run && E2E_PORT=5181 npx playwright test e2e/field.spec.ts` / Expected: PASS. 375px에서 조이스틱을 직접 끌어 본다(메뉴 버튼을 누르면 조이스틱이 안 뜸).
- [ ] **Step 6: M1 마무리** — `MVP_DESIGN.md` 변경 이력 `v1.36` 한 줄(조이스틱·만남 30%/4%·풀숲 두 배). 전체 명령 넷(Global Constraints) 통과 확인.
- [ ] **Step 7: Commit** — `git commit -m "필드 조작을 플로팅 조이스틱으로, A·B 버튼 없앰, 표지판은 부딪히면 읽기"`

---

# M2 — 태초마을 · 위아래 출구 · 돌아다니는 구구몬 (저장: `position.map`에 `town`)

### Task 4: `MapId`와 지도 글자 넓히기(위아래 출구·문·서식지)

**담당:** `opus-expert` (타입 확장이 여러 파일에 퍼짐)

**Files:**
- Modify: `src/domain/field/fields.ts`, `movement.ts`, `encounter.ts`, `src/field/world/loadField.ts`, `fieldRenderer.ts`(`registerTileSet` 키), `FieldLoading.tsx`, `src/field/battle/useQuestionFeed.ts`, `src/field/art/pixelArt.ts`(`exitArrow`)
- Test: `tests/field/movement.test.ts`, `tests/field/loadField.test.ts`, `tests/field/encounter.test.ts`

**Interfaces:**
- Produces:
  - `fields.ts`: `export type MapId = FieldId | 'town'`, `export const MAP_IDS: readonly MapId[] = ['town', 'meadow', 'waterside', 'desert']`, `export const TOWN_NAME = '태초마을'`. `FIELDS`는 FieldId만(그대로).
  - `movement.ts`:
    - `Tile` += `'door'`
    - 글자: `^` `v` 출구, `D` door, `~` block, `g` `a` `p` path(서식지). 
    - `ParseOpts.exits: Partial<Record<'<' | '>' | '^' | 'v', MapId>>`
    - `FieldMap`: `id: MapId`, `entrances: Partial<Record<MapId | 'start', Pos>>`, `exits: { pos: Pos; to: MapId; inward: Dir }[]`(`<`→right, `>`→left, `^`→down, `v`→up; 입구 = 출구 + inward 한 칸), `doors: Pos[]`, `zones: Partial<Record<FieldId, Pos[]>>`(`g`→meadow, `p`→waterside, `a`→desert), `raw: string[]`
    - `StepResult.exitTo: MapId | null`; 문에 부딪히면 `bump` = 문 칸
    - `safeStartPosition(map, saved: { map: MapId; ... })`
  - `encounter.ts`: `encounterChance(map: MapId, tile)` — town이면 늘 0. `EncounterContext.map: MapId`(이름 `field` → `map`). town이면 rng를 쓰지 않는다. `Encounter` += `field: FieldId`(만난 필드; 레전드도 그 필드).
  - `loadField.ts`: `FieldLoaders = Record<MapId, () => Promise<FieldMap>>`, `SavedPosition.map: MapId`, `arrivalPosition(dest, from: MapId)`의 바라보는 쪽 = 그 출구의 `inward`. `travelTo(from, to: MapId, …)`. `DEFAULT_LOADERS.town`은 Task 5가 채운다 — 이 작업에서는 `town: () => Promise.reject(new Error('아직 없음'))`.
  - `exitArrow(map: FieldMap, x: number, y: number): PixelArt` — 그 칸 출구의 바깥쪽 화살표(`SHARED_ARTS`에 `arrowUp`·`arrowDown` 추가, 16×16, 기존 화살표를 돌린 그림).
  - `FieldLoading({ map }: { map: MapId })` — town이면 `태초마을` 한 줄과 곱셈 한 줄(단은 2~9 중).
  - `useQuestionFeed`: 필드 문제는 `encounter.field`로(R3).

- [ ] **Step 1: 실패하는 테스트** (작은 글자 지도로)

```ts
const rows = ['##^##', '<...>', '#gDa#', '#p~@#', '###v#'];
const m = parseMap('town', rows, { exits: { '<': 'waterside', '>': 'desert', '^': 'meadow', v: 'town' }, signTexts: [] });
expect(m.exits.find((e) => e.pos.y === 0)).toEqual({ pos: { x: 2, y: 0 }, to: 'meadow', inward: 'down' });
expect(m.entrances.waterside).toEqual({ x: 1, y: 1 });
expect(m.doors).toEqual([{ x: 2, y: 2 }]);
expect(m.tiles[3][2]).toBe('block'); expect(m.tiles[2][1]).toBe('path');
expect(m.zones).toEqual({ meadow: [{ x: 1, y: 2 }], desert: [{ x: 3, y: 2 }], waterside: [{ x: 1, y: 3 }] });
expect(m.raw).toBe(rows);
expect(tryStep(m, { x: 2, y: 1 }, 'down')).toMatchObject({ moved: false, bump: { x: 2, y: 2 } });
expect(m.exits.find((e) => e.to === 'town')).toEqual({ pos: { x: 3, y: 4 }, to: 'town', inward: 'up' });
expect(tryStep(m, { x: 3, y: 3 }, 'down')).toMatchObject({ moved: true, exitTo: 'town' });
```
`loadField.test.ts`: 가짜 loaders로 `^`에서 들어오면 바라보는 쪽 `down`, `v`면 `up`. `encounter.test.ts`: `encounterChance('town', 'grass')`·`('town','path')` 0, town 걸음은 rng를 안 부름, 만남 결과에 `field`가 들어감.
- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/field` / Expected: FAIL
- [ ] **Step 3: 구현** — 위 Interfaces. `tsc`가 알려 주는 `FieldId`→`MapId` 자리(FieldScreen `goTo`, 렌더러 타일 셋 키 등)를 고친다. `FIELDS[map.id]`처럼 필드에만 있는 값을 읽는 곳은 town을 걸러야 한다.
- [ ] **Step 4: 통과 확인** — Run: `npx tsc --noEmit -p . && npx vitest run` / Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "지도 이름 MapId(태초마을 포함), 위아래 출구·상점 문·서식지 글자 추가"`

### Task 5: 태초마을 지도·타일, 필드마다 마을 길, 세로 지도 배율

**담당:** Sonnet

**Files:**
- Create: `src/field/world/maps/town.ts`(`TOWN_ROWS`, `TOWN_SIGNS`, `TOWN_EXITS`만 — 타일 다시 내보내기 **없음**, R1), `src/field/world/maps/townTiles.ts`(`TOWN_TILES: TileSet`)
- Modify: `meadow.ts`·`waterside.ts`·`desert.ts`(맨 윗줄에 `^`), `loadField.ts`(`DEFAULT_LOADERS` 넷 모두 `^`/`v` 포함 출구, `town`은 `import('./maps/town')`과 `import('./maps/townTiles')`를 함께 기다려 `registerTileSet('town', …)`), `meadowTiles.ts`·`watersideTiles.ts`·`desertTiles.ts`(`exitArrow(map, x, y)`), `fieldRenderer.ts`(`viewScale`, `TILE_COLOR.door`), `FieldScreen.tsx`(문에 부딪히면 "상점은 곧 열려요!" 글 — M3 Task 11·M4 Task 17이 바꿈)
- Test: `tests/field/maps.test.ts`, `tests/field/viewScale.test.ts`, `e2e/field.spec.ts`

**Interfaces:**
- Consumes: Task 4의 `parseMap` 글자·`FieldMap.raw`·`zones`·`doors`
- Produces:
  - `TOWN_EXITS = { '<': 'waterside', '>': 'desert', v: 'meadow' } as const`
  - 필드 출구: 초원 `{ '<': 'waterside', '>': 'desert', '^': 'town' }`, 물가 `{ '>': 'meadow', '^': 'town' }`, 사막 `{ '<': 'meadow', '^': 'town' }`
  - 마을 지도 규칙(테스트로 고정): 20×40, 위 22줄 서식지(`g`·`p`·`a`·`~`, `,` 풀숲 없음), 아래 18줄 광장(`@`, `D` 하나, 집 2채·울타리·꽃밭은 `#`·`*`), `<` `>`는 광장 줄(y ≥ 22), `v`는 맨 아랫줄. 표지판 넷: 읽는 순서(위→아래, 왼→오른)대로 `TOWN_SIGNS`에 "← 물가", "사막 →", "↓ 초원", "상점 · 캡슐과 회복약" 중 놓인 순서대로.
  - `viewScale`: R2 — 덮는 배율을 `s = min(mapW, mapH)` 정사각형으로 계산.

- [ ] **Step 1: 실패하는 테스트**

```ts
// maps.test.ts — IDS를 MAP_IDS로, 크기 검사는 지도마다
const SIZE: Record<MapId, [number, number]> = { town: [20, 40], meadow: [20, 20], waterside: [20, 20], desert: [20, 20] };
it('마을: 만남 칸(풀숲) 없음, 문 1개, 서식지 셋 다 6칸 이상, 표지판 4개', async () => {
  const t = await loadField('town');
  expect(t.tiles.flat()).not.toContain('grass');
  expect(t.doors).toHaveLength(1);
  for (const f of ['meadow', 'waterside', 'desert'] as const) expect(t.zones[f]!.length).toBeGreaterThanOrEqual(6);
  expect(t.zones.meadow!.every((p) => p.y < 22)).toBe(true); // 서식지는 위 22줄
  expect(t.signs.map((s) => s.text).sort()).toEqual(['← 물가', '↓ 초원', '사막 →', '상점 · 캡슐과 회복약'].sort());
});
it('연결: 마을↔세 필드, 초원↔물가, 초원↔사막', async () => {
  const to = async (id: MapId) => (await loadField(id)).exits.map((e) => e.to).sort();
  expect(await to('town')).toEqual(['desert', 'meadow', 'waterside']);
  expect(await to('meadow')).toEqual(['desert', 'town', 'waterside']);
  expect(await to('waterside')).toEqual(['meadow', 'town']);
  expect(await to('desert')).toEqual(['meadow', 'town']);
});
// 기존 "모든 출구의 도착 지도에 짝이 되는 입구" · "시작점과 모든 입구에서 … 닿는다"를 네 지도로. 마을은 문 옆 칸과 세 서식지 칸에도 닿아야 한다.
// viewScale.test.ts
expect(viewScale(375, 812, 20, 40)).toBe(viewScale(375, 812, 20, 20));
expect(viewScale(375, 812, 20, 40)).toBe(3);
```
- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/field/maps.test.ts tests/field/viewScale.test.ts` / Expected: FAIL
- [ ] **Step 3: 지도·타일 그리기** — `townTiles.ts`는 `map.raw[y][x]`로 `g`(초원 땅)·`a`(모래)·`p`(연못 가장자리 길)·`~`(물, 두 장 번갈아 `frame`)·`D`(상점 문)·`#`(나무·지붕·울타리 — 둘레 칸으로 모양 고르기는 자유)를 고른다. 색은 각 필드 타일 팔레트를 빌려 와 어울리게(`recolor` 가능). 필드 `^` 칸은 맨 윗줄 벽 하나를 출구로 바꾸고 바로 아래 칸이 길이 되게. Task 2가 고정한 E2E 칸은 건드리지 않는다.
- [ ] **Step 4: 통과 확인** — Run: `npx vitest run` / Expected: PASS. 개발 서버 375px에서 마을 위·아래 끝까지 걸어 본다(배율이 필드와 같은지, 검은 띠 없는지).
- [ ] **Step 5: Commit** — `git commit -m "태초마을 지도·타일, 세 필드에서 마을로 가는 위쪽 길"`

### Task 6: 저장 — 새로 시작하면 태초마을, 옛 자리는 그대로

**담당:** `opus-expert` (저장 데이터)

**Files:**
- Modify: `src/store/fieldData.ts`
- Test: `tests/field/fieldSave.test.ts`, `tests/saveMigration.test.ts`(필요하면), `e2e/field.spec.ts`

**Interfaces:**
- Consumes: `TOWN_ROWS`·`TOWN_SIGNS`·`TOWN_EXITS`(Task 5), `MAP_IDS`(Task 4)
- Produces:
  - `FieldPosition.map: MapId`
  - `townStart(): { x: number; y: number }` (`meadowStart` 삭제 — R1)
  - `initialField().position = { map: 'town', ...townStart(), facing: 'down' }`
  - `mergeField`: `position.map`은 `MAP_IDS` 중 하나면 받음(`'town'` 포함), 아니면 `initial.position`

- [ ] **Step 1: 실패하는 테스트** (`fieldSave.test.ts`)

```ts
it('새로 시작하면 태초마을 @', () => {
  expect(initialField().position).toEqual({ map: 'town', ...townStart(), facing: 'down' });
});
it('옛 저장의 초원 자리는 그대로', () => {
  const pos = { map: 'meadow', x: 5, y: 8, facing: 'right' };
  expect(mergeField(initialField(), { position: pos }).position).toEqual(pos);
});
it('town 자리도 받는다, 모르는 지도 이름은 마을 시작', () => {
  expect(mergeField(initialField(), { position: { map: 'town', x: 3, y: 30, facing: 'up' } }).position.map).toBe('town');
  expect(mergeField(initialField(), { position: { map: 'castle', x: 3, y: 3, facing: 'up' } }).position).toEqual(initialField().position);
});
```
`fieldData.ts`가 `maps/meadow`·`townTiles`를 가져오지 않는지도 확인하는 테스트(파일 내용을 읽어 `import` 줄 검사).
- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/field/fieldSave.test.ts` / Expected: FAIL
- [ ] **Step 3: 구현** — 위 Interfaces. `partialize`·`currentSave()`는 `field` 통째라 그대로인지만 확인.
- [ ] **Step 4: E2E** — "처음 필드는 첫 구구몬 고르기 → 고르면 태초마을(불러오기 화면에 '태초마을')", "마을 아래 `v`로 나가면 초원 `^` 아래 칸, 초원 `^`로 나가면 마을 `v` 위 칸". 기존 "젤리몬을 골라 잡으면…" 테스트는 고른 뒤 초원 자리로 옮기는 부분이 이미 있으니 그대로 통과하는지 본다.
- [ ] **Step 5: 통과 확인** — Run: `npx tsc --noEmit -p . && npx vitest run && E2E_PORT=5181 npx playwright test e2e/field.spec.ts` / Expected: PASS
- [ ] **Step 6: Commit** — `git commit -m "새로 시작하면 태초마을에서, 옛 저장 자리는 그대로"`

### Task 7: 마을에서 돌아다니는 구구몬(모션 4가지)

**담당:** Sonnet

**Files:**
- Create: `src/domain/field/roam.ts`, `src/field/world/roamerLayer.ts`(그리기·말풍선 자리 계산), `tests/field/roam.test.ts`
- Modify: `tuning.ts`(+ `ROAM_*`), `fieldRenderer.ts`(`drawField`에 `roamers` 인자), `FieldScreen.tsx`(마을에서만 돌림, `occupied`, 부딪힘·탭 말풍선), `field.css`, `tests/field/tuning.test.ts`

**Interfaces:**
- Consumes: `FieldMap.zones`(Task 4), `tryStep(..., occupied)`·`StepResult.bump`(Task 3), `Joystick.onTap`(Task 3)
- Produces:
  - tuning (R23, [제안]): `ROAM_IDLE_MIN_MS = 1500`, `ROAM_IDLE_MAX_MS = 3000`, `ROAM_MOVE_MS = 360`, `ROAM_JUMP_MS = 600`, `ROAM_SLEEP_MS = 5000`, `ROAM_WEIGHTS = { move: 0.6, idle: 0.25, jump: 0.1, sleep: 0.05 }`, `ROAM_BUBBLE_MS = 2500`
  - `type RoamMotion = 'idle' | 'move' | 'jump' | 'sleep'`
  - `interface Roamer { species: SpeciesId; x: number; y: number; fromX: number; fromY: number; facing: Dir; motion: RoamMotion; since: number; until: number; fainted: boolean }`
  - `habitatOf(id: SpeciesId): FieldId` — 레전드는 기본 종의 필드(`legend-fluff`→meadow, `legend-horn`→waterside, `legend-ghost`→desert), 그 밖은 `speciesDef(id).field`
  - `createRoamers(map: FieldMap, list: { species: SpeciesId; fainted: boolean }[], rng: Rng, now: number): Roamer[]` — 종마다 한 마리, 자기 서식지 칸 중 서로 겹치지 않는 칸. 쓰러진 종은 `sleep`.
  - `stepRoamer(r: Roamer, now: number, rng: Rng, canStand: (p: Pos) => boolean): Roamer` — `now < r.until`이면 그대로. 끝났으면 `ROAM_WEIGHTS`로 다음 모션: `move`는 네 방향 중 `canStand`인 칸으로 한 칸(없으면 idle), `fromX/fromY`에 떠난 칸, 시간 `ROAM_MOVE_MS`; `idle`은 `ROAM_IDLE_MIN_MS~MAX_MS`; `jump` `ROAM_JUMP_MS`; `sleep` `ROAM_SLEEP_MS`. 쓰러진 종은 언제나 `sleep`을 이어 간다.
  - `pokeRoamer(r: Roamer, now: number): Roamer` — 쓰러지지 않았으면 `jump`(바로), 쓰러졌으면 그대로 `sleep`.
  - 화면: 마을에서만 잡은 종(동행 제외) 목록으로 `createRoamers`. `canStand` = 그 종 서식지 칸 ∧ 주인공·동행·다른 구구몬이 없는 칸. 주인공 `tryStep`의 `occupied` = 구구몬이 있는 칸. 부딪힘(R6 한 번)·탭한 칸의 구구몬 → `pokeRoamer` + 말풍선(`role="dialog"`, `aria-label="구구몬 말풍선"`, 이름·Lv·체력 — 체력은 M3 전에는 100으로 보임) `ROAM_BUBBLE_MS` 동안. 그리기: idle은 크기 살짝 숨쉬기, move는 `fromX→x` 보간 + 통통, jump는 위로 포물선, sleep은 `MonsterSprite` sleep 표정을 구운 그림 + "Zz". `canvas.dataset.roamers = "cloud:3,5;jelly:7,9"`(E2E용).

- [ ] **Step 1: 실패하는 테스트** (`roam.test.ts`, 작은 지도와 `seededRng`)

```ts
it('종마다 한 마리, 자기 서식지 칸에, 겹치지 않게', () => {
  const rs = createRoamers(map, [{ species: 'cloud', fainted: false }, { species: 'jelly', fainted: false }, { species: 'legend-fluff', fainted: false }], seededRng(1), 0);
  expect(rs.map((r) => r.species)).toEqual(['cloud', 'jelly', 'legend-fluff']);
  expect(inZone(map, 'meadow', rs[0]) && inZone(map, 'waterside', rs[1]) && inZone(map, 'meadow', rs[2])).toBe(true);
  expect(new Set(rs.map((r) => `${r.x},${r.y}`)).size).toBe(3);
});
it('1000번 돌려도 서식지 밖·canStand 거짓 칸으로 안 간다', () => { /* now를 늘리며 stepRoamer 반복, 매번 inZone && canStand 확인 */ });
it('모션 이동: until 전엔 그대로, 지나면 바뀜, move는 한 칸만', () => { /* rng 고정으로 move 고르기 → |dx|+|dy| === 1, fromX/Y는 이전 칸 */ });
it('갈 칸이 없으면 move 대신 idle', () => {});
it('쓰러진 종은 sleep만, poke해도 sleep', () => {});
it('poke하면 jump', () => expect(pokeRoamer(idleRoamer, 10).motion).toBe('jump'));
```
- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/field/roam.test.ts` / Expected: FAIL
- [ ] **Step 3: 구현** — 위 Interfaces. `tuning.test.ts` 고정표에 `ROAM_*`.
- [ ] **Step 4: E2E** — 젤리몬·새싹몬을 잡은 저장본(동행 새싹몬)으로 마을에 서면 `data-roamers`에 `jelly`만 있고 그 칸이 물가 서식지 안. 말풍선은 젤리몬 칸 옆에 세운 저장본에서 그쪽으로 부딪혀 "젤리몬"이 보이는지(구구몬이 움직이므로 `data-roamers`를 읽어 바로 옆 칸으로 옮겨 세운 뒤 키 누르기, 실패하면 한 번 다시).
- [ ] **Step 5: 통과 확인 · M2 마무리** — 전체 명령 넷 통과. `MVP_DESIGN.md` `v1.37`(태초마을·위아래 길·돌아다니는 구구몬). 375px에서 모션 넷을 눈으로 확인.
- [ ] **Step 6: Commit** — `git commit -m "태초마을 서식지에 잡은 구구몬이 돌아다님(가만히·걷기·점프·잠)"`

---

# M3 — 전투 개편: 단계·레벨, 문제 시간, 적 공격, 내 체력·쓰러짐 (저장: `hp`·`wounds`)

### Task 8: 강함 단계 표와 계산

**담당:** Sonnet

**Files:**
- Create: `src/domain/field/strength.ts`, `tests/field/strength.test.ts`
- Modify: `tuning.ts`, `tests/field/tuning.test.ts`

**Interfaces:**
- Produces:
  - tuning(설계서 6-1 그대로):
    ```ts
    export const TIER_CHANCE = { weak: 0.15, normal: 0.65, strong: 0.15, mighty: 0.05 } as const;
    export const TIER_RULES = {
      weak:   { levels: [-5, -3], timeMs: 7000, hitsToDizzy: 3, damage: 20, expScale: 0.6, ultimateCatch: 0.3 },
      normal: { levels: [-1, 1],  timeMs: 7000, hitsToDizzy: 4, damage: 25, expScale: 1,   ultimateCatch: 0.25 },
      strong: { levels: [3, 5],   timeMs: 5000, hitsToDizzy: 4, damage: 34, expScale: 1.6, ultimateCatch: 0.15 },
      mighty: { levels: [6, 9],   timeMs: 5000, hitsToDizzy: 6, damage: 50, expScale: 3,   ultimateCatch: 0.1 },
      legend: { levels: null,     timeMs: 7000, hitsToDizzy: 4, damage: 34, expScale: 3,   ultimateCatch: 0.1 },
    } as const;
    export const THROW_ESCAPE = 0.21;
    export const THROW_ANGRY = 0.03;
    export const COMPANION_MAX_HP = 100;
    export const TIMER_WARN_MS = 2000;      // 마지막 2초 빨갛게
    export const WILD_FOE_ATTACK_MS = 700;  // 적 공격 연출
    ```
  - `strength.ts`: `type Tier = keyof typeof TIER_RULES`; `type WildTier = Exclude<Tier, 'legend'>`; `rollTier(rng: Rng): WildTier`(rng 한 번, 누적 weak→normal→strong→mighty); `tierLevelRange(tier: Tier, companionLevel: number): [number, number]`(1·`MAX_LEVEL` 사이로 자름, legend는 `[LEGEND_LEVEL, LEGEND_LEVEL]`); `rollTierLevel(rng, tier, companionLevel): number`(`randomInt`); `throwOdds(tier: Tier): { caught: number; retry: number; escaped: number; angry: number }`(`caught = U×(E+A)÷(1−U)`, `retry = 1 − caught − E − A`); `tierExp(base: number, tier: Tier): number`(R13 `Math.round`).

- [ ] **Step 1: 실패하는 테스트**

```ts
it('단계 확률 합 1, 경계 (부동소수 합 오차를 피해 경계에서 0.001 떨어진 값)', () => {
  expect(Object.values(TIER_CHANCE).reduce((a, b) => a + b)).toBeCloseTo(1);
  expect([0.149, 0.151, 0.799, 0.801, 0.949, 0.951].map((r) => rollTier(() => r))).toEqual(['weak', 'normal', 'normal', 'strong', 'strong', 'mighty']);
});
it('레벨 범위와 1·30 경계', () => {
  expect(tierLevelRange('weak', 10)).toEqual([5, 7]);
  expect(tierLevelRange('mighty', 10)).toEqual([16, 19]);
  expect(tierLevelRange('weak', 2)).toEqual([1, 1]);
  expect(tierLevelRange('mighty', 28)).toEqual([30, 30]);
  expect(tierLevelRange('legend', 3)).toEqual([20, 20]);
});
it('던지기 확률 (설계서 표)', () => {
  const t = (x: Tier) => Object.values(throwOdds(x)).map((v) => +v.toFixed(3));
  expect(t('weak')).toEqual([0.103, 0.657, 0.21, 0.03]);
  expect(t('normal')).toEqual([0.08, 0.68, 0.21, 0.03]);
  expect(t('strong')).toEqual([0.042, 0.718, 0.21, 0.03]);
  expect(t('mighty')).toEqual([0.027, 0.733, 0.21, 0.03]);
  expect(throwOdds('legend')).toEqual(throwOdds('mighty'));
  for (const x of Object.keys(TIER_RULES) as Tier[]) {
    const o = throwOdds(x);
    expect(o.caught + o.retry + o.escaped + o.angry).toBeCloseTo(1);
    expect(o.caught / (o.caught + o.escaped + o.angry)).toBeCloseTo(TIER_RULES[x].ultimateCatch); // 끝내 잡을 확률
  }
});
it('쓰러지는 피격 횟수 5·4·3·2, 황금 3', () => {
  expect((['weak', 'normal', 'strong', 'mighty', 'legend'] as const).map((x) => Math.ceil(COMPANION_MAX_HP / TIER_RULES[x].damage))).toEqual([5, 4, 3, 2, 3]);
});
it('경험치 배율', () => expect([tierExp(16, 'weak'), tierExp(40, 'strong'), tierExp(40, 'mighty')]).toEqual([10, 64, 120]));
```
- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/field/strength.test.ts` / Expected: FAIL
- [ ] **Step 3: 구현** · **Step 4: 통과 확인** (`npx vitest run tests/field`)
- [ ] **Step 5: Commit** — `git commit -m "야생 강함 4단계 표(약함·보통·강함·강력)와 황금 규칙"`

### Task 9: 저장 — 구구몬 체력·상처, 전투 정산 새 모양

**담당:** `opus-expert` (저장 데이터 + 정산)

**Files:**
- Create: `src/domain/field/wounds.ts`(이 작업은 `addWound`·`applyDamage`·`isFainted`만), `tests/field/wounds.test.ts`
- Modify: `tuning.ts`(+ `WOUNDS_MAX = 10`), `src/store/fieldData.ts`, `src/store/useGameStore.ts`, `src/domain/field/growth.ts`(`SpeciesEntry` 모양만 따라감), `tests/field/fieldSave.test.ts`, `tests/field/fieldStore.test.ts`, `tests/field/growth.test.ts`

**Interfaces:**
- Consumes: `Tier`·`tierExp`(Task 8), `townStart()`(Task 6)
- Produces:
  - `wounds.ts`: `interface Wound { factId: FactId; type: QuestionType }`; `addWound(list: readonly Wound[], w: Wound): Wound[]`(R14); `applyDamage(hp: number, dmg: number): number`(0~`COMPANION_MAX_HP` 정수); `isFainted(e: { hp: number }): boolean`
  - `SpeciesEntry` += `hp: number`, `wounds: Wound[]`
  - `FieldNotice` += `{ kind: 'fainted'; species: SpeciesId }`
  - `mergeEntry`: `hp`가 0~100 정수가 아니면 100(옛 저장 포함). `wounds`: 배열이 아니면 []; 항목은 `factId`가 `FACTS`에 있고 `type`이 `FIELD_TYPES` 중일 때만, `addWound`로 차례로 넣어 중복 제거·최근 10개.
  - `chooseStarter`·새 종 잡기: `hp: 100, wounds: []`
  - store 액션:
    - `damageCompanion(id: SpeciesId, dmg: number, wound: Wound): { hp: number; fainted: boolean }` — 체력 깎고 상처 추가, 한 번의 `set`. 체력이 0이 되면 같은 `set`에서 `position = { map: 'town', ...townStart(), facing: 'down' }`(R10). 그 종이 없으면 `{ hp: 0, fainted: false }`로 아무것도 안 바꿈.
    - `healSpecies(id: SpeciesId): void` — `hp: 100, wounds: []`
    - `setCompanion(id)` — 종이 없거나 쓰러졌으면 `false`(R15)
  - `WildBattleEnd` → `{ species: SpeciesId; level: number; tier: Tier; end: WildEnd; correct: number; now: number }`, `type WildEnd = 'caught' | 'escaped' | 'released' | 'fainted' | 'quit'`
  - `finishWildBattle`: 동행 경험치 `tierExp(PARTICIPATION_EXP + CORRECT_EXP × correct, tier)`, 같은 종 잡기 `tierExp(DUPLICATE_EXP, tier)`. `stats.catches`는 `end === 'caught'`, `stats.fled`는 그 밖 전부(지금 의미 유지). 체력·상처는 건드리지 않는다(이미 `damageCompanion`이 저장). `end === 'fainted'`면 `notices` 맨 앞에 `{ kind: 'fainted', species: 동행 }`.

- [ ] **Step 1: 실패하는 테스트**

```ts
// wounds.test.ts
it('상처: 중복은 한 번(다시 맞으면 맨 뒤로), 최근 10개', () => {
  const w = (f: string) => ({ factId: f as FactId, type: 'product' as const });
  expect(addWound([w('2x3'), w('2x4')], w('2x3'))).toEqual([w('2x4'), w('2x3')]);
  expect(addWound([w('2x3')], { factId: '2x3', type: 'missingFirst' })).toHaveLength(2);
  const many = Array.from({ length: 12 }, (_, i) => w(`3x${i <= 10 ? i : 10}`)).reduce(addWound, [] as Wound[]);
  expect(many.length).toBe(10);
});
it('applyDamage는 0 아래·100 위로 안 감', () => expect([applyDamage(20, 25), applyDamage(100, 0)]).toEqual([0, 100]));

// fieldSave.test.ts
it('옛 종 기록에 hp 100, wounds []', () => {
  const f = mergeField(initialField(), { species: { cloud: { level: 5, exp: 0, stage: 1, caught: 1, firstCaughtAt: 1 } } });
  expect(f.species.cloud).toMatchObject({ hp: 100, wounds: [] });
});
it('이상한 hp·상처는 거른다', () => {
  const f = mergeField(initialField(), { species: { cloud: { level: 5, exp: 0, stage: 1, caught: 1, firstCaughtAt: 1, hp: -3,
    wounds: [{ factId: '99x1', type: 'product' }, { factId: '2x3', type: 'skipCount' }, { factId: '2x3', type: 'product' }, 'x'] } } });
  expect(f.species.cloud).toMatchObject({ hp: 100, wounds: [{ factId: '2x3', type: 'product' }] });
  expect(mergeField(initialField(), { species: { cloud: { ...ok, hp: 42.5 } } }).species.cloud!.hp).toBe(100);
});

// fieldStore.test.ts
it('damageCompanion: 체력·상처를 바로 저장', () => { /* 100 → 75, wounds 1개, position 그대로 */ });
it('damageCompanion으로 0이 되면 같은 순간 마을 시작 칸으로', () => {
  useGameStore.setState((s) => ({ field: { ...s.field, position: { map: 'meadow', x: 5, y: 8, facing: 'right' } } }));
  const r = useGameStore.getState().damageCompanion('cloud', 25, wound);   // hp 20에서
  expect(r).toEqual({ hp: 0, fainted: true });
  expect(useGameStore.getState().field.position).toEqual({ map: 'town', ...townStart(), facing: 'down' });
});
it('setCompanion: 쓰러진 종은 false', () => {});
it('healSpecies: 체력 100, 상처 비움', () => {});
it('finishWildBattle: 강함 배율로 경험치, 쓰러짐 알림, 같은 종 잡기 ×배율', () => {
  // correct 3, tier 'strong' → 동행 +Math.round((10+6)*1.6)=26
  // end 'fainted' → notices[0] = { kind: 'fainted', species: 'cloud' }
});
```
- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/field` / Expected: FAIL
- [ ] **Step 3: 구현** — 위 Interfaces. 저장 네 곳 확인(`field` 통째: `partialize`·`currentSave()` 그대로임을 눈으로 확인, `initialField`·`mergeField` 고침). 지금 `WildBattleScreen`은 Task 11 전까지 `end`로 바꿔 부르기만 한다(`caught ? 'caught' : quit ? 'quit' : 'escaped'`, `tier: 'normal'`) — 타입 검사 통과용. `FieldScreen`의 만남 ctx에는 Task 10이 `companion`을 더한다.
- [ ] **Step 4: 통과 확인** — Run: `npx tsc --noEmit -p . && npx vitest run` / Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "구구몬 체력·상처 목록 저장, 쓰러지면 바로 태초마을로, 전투 정산에 강함 배율"`

### Task 10: 야생 전투 규칙 다시 쓰기(순수)와 만남의 단계·레벨

**담당:** `opus-expert` (전투 흐름)

**Files:**
- Modify (다시 씀): `src/domain/field/wildBattle.ts`, `tests/field/wildBattle.test.ts`
- Modify: `encounter.ts`, `tuning.ts`(없애는 값: `WILD_LEVEL_MIN`, `WILD_LEVEL_MAX`, `WILD_MAX_HP`, `HIT_DAMAGE`, `FAST_HIT_BONUS`, `REGEN_PER_SEC`, `WILD_MAX_QUESTIONS`, `FLEE_*` 다섯, `CATCH_CHANCE`, `CATCH_STEP`, `ESCAPE_HP`), `creatures.ts`·`growth.ts`(다시 내보내기 정리), `tests/field/encounter.test.ts`, `tests/field/tuning.test.ts`

**Interfaces:**
- Consumes: Task 8 전부
- Produces:
  - `Encounter` += `tier: Tier` (레전드는 `'legend'`, `level`은 단계 레벨)
  - `EncounterContext` += `companion: { level: number; hp: number }`. `hp <= 0`이면 `stepOnTile`·`rollEncounter`는 rng를 쓰지 않고 `{ encounter: null, stepsSinceBattle: 그대로 }`.
  - rng 차례: 만남 → (해금 때만) 레전드 → 종 → 단 → 단계 → 레벨. 레전드: 종 → 끝(단계 `legend`, 레벨 20).
  - `wildBattle.ts`:
    ```ts
    export const MAX_TICK_MS = 250;
    export type WildPhase = 'question' | 'hit' | 'struck' | 'hint' | 'dizzy' | 'caught' | 'escaped' | 'released' | 'fainted';
    export type ThrowOutcome = 'caught' | 'retry' | 'escaped' | 'angry';
    export interface WildState {
      tier: Tier; level: number;
      hits: number;        // 정답으로 깎은 수
      timeLeftMs: number;  // 이 문제 남은 시간
      allyHp: number;
      phase: WildPhase;
      correct: number;
      timedOut: boolean;   // 마지막 피격이 시간 초과
      lastMove: number | null; // 적이 고른 기술 0~2 (피격 때)
    }
    export function createWild(tier: Tier, level: number, allyHp: number): WildState;
    export function tick(s: WildState, dtMs: number, rng: Rng): WildState;        // question만, dt는 0~MAX_TICK_MS(NaN은 0). 0이 되면 피격(timedOut true)
    export function answerWild(s: WildState, correct: boolean, rng: Rng): WildState; // question만. 정답: hits+1 → hitsToDizzy면 dizzy, 아니면 hit. 오답: 피격
    export function resumeWild(s: WildState): WildState;  // hit→question, struck→hint, hint→question. question으로 갈 때 timeLeftMs = timeMs
    export function throwCapsule(s: WildState, rng: Rng, companionLevel: number): { state: WildState; outcome: ThrowOutcome } | null; // dizzy만
    export function releaseWild(s: WildState): WildState; // dizzy→released
    export function wildHpRatio(s: WildState): number;    // 1 − hits/hitsToDizzy (0~1)
    export function damageOf(s: WildState): number;       // TIER_RULES[tier].damage
    ```
    피격 = `allyHp = applyDamage(allyHp, damage)`, `lastMove = Math.floor(rng() * 3)`; 0이면 `fainted`(R9), 아니면 `struck`.
    던지기(R11): 잡힘 → `caught`; 재도전 → 상태 그대로 `dizzy`; 도망 → `escaped`; 화남 → `tier`가 `mighty`·`legend`면 그대로, 아니면 `mighty`와 `rollTierLevel(rng, 'mighty', companionLevel)`; `hits 0`, `phase 'question'`, `timeLeftMs` 새 단계 시간.

- [ ] **Step 1: 실패하는 테스트** (`wildBattle.test.ts` 새로)

```ts
const r0 = () => 0;
it('보통: 7초, 정답 4개로 어지러움', () => {
  let s = createWild('normal', 5, 100);
  expect(s.timeLeftMs).toBe(7000);
  for (let i = 0; i < 3; i++) s = resumeWild(answerWild(s, true, r0));
  expect(s.phase).toBe('question');
  expect(answerWild(s, true, r0).phase).toBe('dizzy');
});
it.each([['weak', 3], ['normal', 4], ['strong', 4], ['mighty', 6], ['legend', 4]] as const)('%s 정답 %i개', (t, n) => { /* n−1개 뒤 question, n개면 dizzy */ });
it.each([['weak', 7000], ['strong', 5000], ['mighty', 5000], ['legend', 7000]] as const)('%s 시간 %i', (t, ms) => expect(createWild(t, 1, 100).timeLeftMs).toBe(ms));
it('시간은 question에서만, 한 번에 250ms까지', () => {
  const s = createWild('normal', 5, 100);
  expect(tick(s, 60000, r0).timeLeftMs).toBe(6750);
  expect(tick(s, NaN, r0).timeLeftMs).toBe(7000);
  for (const phase of ['hit', 'struck', 'hint', 'dizzy'] as const) expect(tick({ ...s, phase }, 100, r0)).toEqual({ ...s, phase });
});
it('시간이 다 되면 피격(timedOut), 체력 −25, 힌트로', () => {
  let s = createWild('normal', 5, 100);
  for (let i = 0; i < 28; i++) s = tick(s, 250, r0);
  expect(s).toMatchObject({ phase: 'struck', timedOut: true, allyHp: 75 });
  expect(resumeWild(s).phase).toBe('hint');
  expect(resumeWild(resumeWild(s))).toMatchObject({ phase: 'question', timeLeftMs: 7000 });
});
it.each([['weak', 5], ['normal', 4], ['strong', 3], ['mighty', 2], ['legend', 3]] as const)('%s: 오답 %i번에 쓰러지고 힌트 없이 끝', (t, n) => {
  let s = createWild(t, 5, 100);
  for (let i = 0; i < n - 1; i++) s = resumeWild(resumeWild(answerWild(s, false, r0)));
  const last = answerWild(s, false, r0);
  expect(last).toMatchObject({ phase: 'fainted', allyHp: 0 });
});
it('question이 아니면 answerWild는 그대로(연타)', () => {});
it('적 기술은 rng로 0~2', () => expect(answerWild(createWild('normal', 5, 100), false, () => 0.99).lastMove).toBe(2));
it('던지기 4결과 경계(보통): 0.079 잡힘, 0.081 재도전, 0.759 재도전, 0.761 도망, 0.969 도망, 0.971 화남', () => {});
it('화남: 보통→강력, 레벨은 강력 범위에서 다시, 체력 가득, 문제로', () => {
  const d = { ...createWild('normal', 5, 100), phase: 'dizzy' as const, hits: 4 };
  const seq = [0.999, 0]; const rng = () => seq.shift()!;
  const r = throwCapsule(d, rng, 10)!;
  expect(r.outcome).toBe('angry');
  expect(r.state).toMatchObject({ tier: 'mighty', level: 16, hits: 0, phase: 'question', timeLeftMs: 5000 });
});
it('강력·황금의 화남은 단계 그대로, 체력만 회복', () => {});
it('재도전은 dizzy 그대로, dizzy가 아니면 null', () => {});
it('releaseWild: dizzy→released', () => {});
it('wildHpRatio', () => expect(wildHpRatio({ ...createWild('mighty', 5, 100), hits: 3 })).toBe(0.5));

// encounter.test.ts
it('만남에 단계·레벨·필드: 동행 Lv10, 보통이면 9~11', () => {});
it('레전드는 legend 단계 Lv20', () => {});
it('동행 체력 0이면 만남 없음, 난수도 안 씀', () => {
  const rng = vi.fn(() => 0);
  expect(stepOnTile(rng, { ...ctx, tile: 'grass', stepsSinceBattle: 5, companion: { level: 5, hp: 0 }, force: { grass: true } }).encounter).toBeNull();
  expect(rng).not.toHaveBeenCalled();
});
```
- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/field` / Expected: FAIL
- [ ] **Step 3: 구현** — 위 Interfaces. `tuning.test.ts` 고정표에서 없앤 값을 빼고 "도망 시간 7~17초" 테스트를 지운다. `WildBattleScreen`은 Task 11에서 다시 쓰므로 이 작업에서는 타입만 맞게 최소한으로 고친다(새 함수 이름으로 부르기, `fleeTimeMs`·`fieldFleeScale` 사용 제거).
- [ ] **Step 4: 통과 확인** — Run: `npx tsc --noEmit -p . && npx vitest run` / Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "야생 전투 규칙 다시 씀: 문제마다 시간, 적 공격, 정답 수로 어지러움, 던지기 4결과·화남"`

### Task 11: 전투 화면과 필드 연결(시간 막대·내 체력·적 공격·쓰러짐)

**담당:** `opus-expert` (전투 흐름 화면)

**Files:**
- Modify: `src/field/battle/WildBattleScreen.tsx`, `battleText.ts`, `wildBattle.css`, `src/field/world/FieldScreen.tsx`(만남 ctx·쓰러짐 표시·문 임시 회복 R16), `src/field/FieldDexScreen.tsx`(쓰러진 종 "함께 다니기" 막기 — 최소), `e2e/field.spec.ts`
- Test: `e2e/field.spec.ts`

**Interfaces:**
- Consumes: Task 9 store 액션·`WildEnd`, Task 10 전부, `debugFlags().noTimer`
- Produces:
  - `battleText` 추가: `tierName(name: string, tier: Tier)`("약한 ○○"/"○○"/"강한 ○○"/"강력한 ○○"/황금은 이름 그대로), `timeUp: '시간이 지났어!'`, `foeAttack(name, move)`(`${name}의 ${move}!`), `fainted(name)`(`${josa(name,'이','가')} 쓰러졌다… 태초마을로 돌아가자`), `retryThrow: '아직 어지러워해! 한 번 더!'`, `escaped(name)`, `angry(name)`(`${name}이(가) 화가 났다! 강력해졌다!`), `faintedField: '구구몬이 쓰러졌어요. 상점에서 회복시켜요'`, `healedAll: '구구몬들이 기운을 되찾았어요!'`. `hit(move)`는 `fast` 인자를 없앤다.
  - 화면 흐름: `createWild(encounter.tier, encounter.level, 동행 hp)`. `running = !intro && !confirmQuit && !ending && phase==='question' && !noTimer` 동안만 rAF로 `tick`(가려진 탭 dt 0 — 지금 방식). 피격(`struck`)이 되는 순간(오답·시간 초과 모두): `recordAnswer`(시간 초과면 `correct:false, ms: timeMs` — R8), `damageCompanion(동행, damage, { factId, type })`, 적 기술 이름 `speciesDef(encounter.species).moves[lastMove]`로 글, `WILD_FOE_ATTACK_MS` 뒤 `resumeWild` → 힌트(시간 초과면 `timeUp` 글). `fainted`면 끝. 힌트에서 빛나는 기술 → `resumeWild` + `next(true)`. 정답 → `hit` 연출 `WILD_HIT_ANIM_MS` 뒤 `resumeWild` + `next(false)`.
  - 끝 정산: `finishWildBattle({ species, level: wild.level, tier: wild.tier, end, correct, now })` 한 번(`settledRef`). `end`는 `caught|escaped|released|fainted|quit`. 끝 글 뒤 `endWildBattle()`.
  - 표시: 위 카드 — 야생 이름(`tierName`) Lv, 체력 막대(`aria-label="야생 체력 {Math.round(ratio*100)}"`), 강함·강력은 `wild__card--strong`·`--mighty` 색 테두리. 내 구구몬 아래 — 이름 Lv, 체력 막대(`aria-label="내 체력 {allyHp}"`). 문제 위 시간 막대(`role="timer"`, `aria-label="남은 시간 {Math.ceil(ms/1000)}초"`, 남은 `TIMER_WARN_MS` 이하이면 `--warn` 빨강). 지금 모래시계 표시는 지운다.
  - 필드: `stepOnTile` ctx에 `companion: { level, hp }`. 동행이 쓰러져 있으면 필드 위에 `faintedField` 알림(`role="status"`)을 늘 보인다(마을 제외). 체력 0으로 마을에 왔을 때 `pendingFieldNotices`의 `fainted` 알림을 지금 성장 알림 자리에 보인다(제목 "쓰러졌어…", 본문 `faintedField`). 마을 문 부딪힘(R16): 잡은 종 전부 `healSpecies` + `healedAll` 글.

- [ ] **Step 1: E2E 먼저 고치고 더하기** (`e2e/field.spec.ts`; 기존 전투 테스트의 `standBesideGrass`·`battleWithQuestion` 초기 스크립트에 `__GUGU_E2E_NO_TIMER__` 추가)
  - "정답으로 체력을 0으로 만들면 캡슐 던지기": 반복 상한 3 → 6, `야생 체력 0` 확인.
  - "오답이면 적이 공격하고 내 체력이 줄고 힌트": 오답 버튼 → `/내 체력 (80|75|66|50)/`, 힌트의 빛나는 기술 → 다시 문제. 저장본 `species.cloud.hp`가 같은 값, `wounds` 1개.
  - "시간 초과 → 쓰러짐 → 태초마을": 저장본 동행 `hp: 20`, `NO_TIMER` 끔, `__GUGU_E2E_QUESTION__ = {factId:'7x8',type:'product'}`. 문제가 뜨고 8초 기다림 → `쓰러졌다` 글 → 필드로 돌아오면 불러오기 화면 `태초마을`, 알림 "쓰러졌어…". 저장본 `position.map === 'town'`, `hp === 0`, `wounds[0].factId === '7x8'`.
  - "쓰러진 동행이면 풀숲에서 만나지 않고 알림이 보인다": `hp: 0`, 초원 (5,8), `__GUGU_E2E_FIELD__` 켬 → 오른쪽 풀숲으로 → URL 그대로 `#/field`, `구구몬이 쓰러졌어요` 보임.
  - "전투 중 맞고 새로고침하면 필드, 체력은 줄어 있다": 오답 하나 → `reload` → `#/field`, 저장본 hp < 100.
  - "도망 확인창을 6초 열어 둬도 피격 없음": `NO_TIMER` 끔, 문제가 뜨자마자 Escape → 6초 → '계속 싸우기' → `남은 시간`이 3초 이상, 메시지에 기술 공격 글 없음. 기존 "답하는 데 걸린 시간" 테스트는 그대로 둔다.
  - "마을 상점 문에 부딪히면 회복(임시)": hp 0 저장본, 마을 문 앞 → 부딪힘 → `기운을 되찾았어요`, 저장본 hp 100.
- [ ] **Step 2: 실패 확인** — Run: `E2E_PORT=5181 npx playwright test e2e/field.spec.ts` / Expected: FAIL(새 표시 없음)
- [ ] **Step 3: 화면 구현** — 위 Interfaces. 버튼 연타 막기는 지금처럼 `wildRef`를 바로 바꿔 두기. 피격 처리는 `struck`로 바뀐 순간 한 번만(시간 초과는 rAF 안에서 생기므로 이전 단계와 비교해 감지).
- [ ] **Step 4: 통과 확인** — Run: `npx tsc --noEmit -p . && npx vitest run && E2E_PORT=5181 npx playwright test` / Expected: PASS. 375px에서 시간 막대·두 체력 막대·이름 테두리가 겹치지 않는지 본다(기존 "가장 긴 문제" E2E 포함).
- [ ] **Step 5: Commit** — `git commit -m "전투 화면: 문제 시간 막대, 적 공격과 내 체력, 쓰러지면 태초마을로"`

### Task 12: 관리자 '도망 빠르기' 항목 지우기

**담당:** Haiku

**Files:**
- Modify: `src/screens/admin/SettingsPanels.tsx`(`FLEE_SPEED_CHOICES`와 그 목록 화면 삭제), `e2e/admin.spec.ts`(도망 빠르기 검사 삭제, 88행 근처)
- 그대로 둠: `src/store/saveData.ts`의 `fieldFleeScale` 형식·검사, `tests/field/fieldSave.test.ts`의 `fieldFleeScale` 테스트 (R19)

- [ ] **Step 1:** 위 두 곳 삭제. `grep -rn "fieldFleeScale\|FLEE_SPEED" src e2e`로 남은 곳이 `saveData.ts`뿐인지 확인.
- [ ] **Step 2:** Run: `npx tsc --noEmit -p . && npx vitest run && E2E_PORT=5181 npx playwright test e2e/admin.spec.ts` / Expected: PASS
- [ ] **Step 3: M3 마무리** — `MVP_DESIGN.md` `v1.38`(강함 4단계·문제마다 7/5초·적 공격·체력·쓰러짐·던지기 4결과, 캡슐 개수는 다음 판). 전체 명령 넷.
- [ ] **Step 4: Commit** — `git commit -m "관리자 화면에서 도망 빠르기 설정 없앰(저장값은 그대로 둠)"`

### Task 13: M3 검토

**담당:** `opus-reviewer` — M3 커밋 전체(Task 8~12). 특히 Review Focus 2·3·5, `damageCompanion`의 자리 이동, 정산 한 번, `tick`이 멈춰야 할 때 안 불리는지, 저장 네 곳. 지적은 지휘자가 채택을 정해 해당 작업 담당에게 돌려보낸다.

---

# M4 — 캡슐 4종 · 상점 팝업(캡슐 연습·회복 연습) · 왼쪽 위 표시 · [태초마을로] (저장: `capsules`)

### Task 14: 캡슐 개수 저장과 전투에서 쓰기

**담당:** `opus-expert` (저장 데이터 + 전투 흐름)

**Files:**
- Create: `src/domain/field/capsules.ts`, `tests/field/capsules.test.ts`
- Modify: `tuning.ts`(+ `CAPSULE_START = { meadow: 3, waterside: 3, desert: 3, legend: 0 }`, `CAPSULE_REWARD = 3`), `src/store/fieldData.ts`, `src/store/useGameStore.ts`, `src/field/battle/WildBattleScreen.tsx`, `battleText.ts`, `tests/field/fieldSave.test.ts`, `tests/field/fieldStore.test.ts`, `tests/field/tuning.test.ts`, `e2e/field.spec.ts`

**Interfaces:**
- Produces:
  - `capsules.ts`: `type CapsuleType = FieldId | 'legend'`; `CAPSULE_TYPES: readonly CapsuleType[] = ['meadow', 'waterside', 'desert', 'legend']`; `CAPSULE_NAMES: Record<CapsuleType, string>`(초원 캡슐·물가 캡슐·사막 캡슐·황금 캡슐); `capsuleFor(id: SpeciesId): CapsuleType`(레전드 → legend, 그 밖 `speciesDef(id).field`); `type Capsules = Record<CapsuleType, number>`; `addCapsules(c: Capsules, t: CapsuleType, n: number): Capsules`(n은 0 이상 정수만, 아니면 그대로); `takeCapsule(c: Capsules, t: CapsuleType): Capsules | null`(0이면 null)
  - `FieldData.capsules: Capsules`; `initialField().capsules = { ...CAPSULE_START }`; `mergeField`: 없으면 기본값(옛 저장도 같은 개수 — 설계서 4절), 항목마다 0 이상 정수가 아니면 그 항목만 기본값.
  - store: `grantCapsules(t: CapsuleType, n: number): void`, `spendCapsule(t: CapsuleType): boolean`(0이면 false, 아무것도 안 바꿈)
  - 전투: 던지기 버튼 `캡슐 던지기 ({남은 수})`(`aria-label="캡슐 던지기"` 유지) 옆에 `CapsuleBall`(Task 15 전에는 `GachaCapsule`). 누르면 `spendCapsule(capsuleFor(종))`가 true일 때만 `throwCapsule`(던지는 중 버튼 막힘). 결과 글: 잡힘 `caught`, 재도전 `retryThrow`, 도망 `escaped`, 화남 `angry`(문제로). 어지러워진 순간·재도전 뒤 남은 캡슐 0 → R18 `releaseWild` + `battleText.noCapsule: '캡슐이 없어서 돌려보냈어! 상점에서 캡슐을 구해 오자'`. `end`는 `released`.

- [ ] **Step 1: 실패하는 테스트**

```ts
// capsules.test.ts
it('종 → 캡슐', () => expect(['cloud', 'horn', 'ghost', 'legend-horn'].map((s) => capsuleFor(s as SpeciesId))).toEqual(['meadow', 'waterside', 'desert', 'legend']));
it('takeCapsule: 0이면 null, 아니면 1 줄임', () => {});
it('addCapsules: 음수·소수 n은 무시', () => {});
// fieldSave.test.ts
it('옛 저장에 capsules 3·3·3·0', () => expect(mergeField(initialField(), { starterChosen: true }).capsules).toEqual({ meadow: 3, waterside: 3, desert: 3, legend: 0 }));
it('이상한 캡슐 수는 그 항목만 기본값', () => {
  expect(mergeField(initialField(), { capsules: { meadow: -2, waterside: 1.5, desert: 7, legend: 'x' } }).capsules).toEqual({ meadow: 3, waterside: 3, desert: 7, legend: 0 });
});
// fieldStore.test.ts
it('spendCapsule: 0 아래로 안 감', () => {
  useGameStore.setState((s) => ({ field: { ...s.field, capsules: { ...s.field.capsules, desert: 1 } } }));
  expect(useGameStore.getState().spendCapsule('desert')).toBe(true);
  expect(useGameStore.getState().spendCapsule('desert')).toBe(false);
  expect(useGameStore.getState().field.capsules.desert).toBe(0);
});
it('grantCapsules: 더한다', () => {});
it('백업 currentSave()에 capsules가 들어간다', () => {}); // DataSecurityPanels의 currentSave를 내보내 쓰거나 field 통째임을 확인
```
E2E: "잡으면 초원 캡슐이 1개 준다"(3 → 2, 저장본), "캡슐 0개면 어지러워질 때 돌려보낸다"(`capsules.meadow: 0` 저장본 → `캡슐이 없어서` 글, 버튼 없음), "던지기 버튼에 남은 수 (3)".
- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/field && E2E_PORT=5181 npx playwright test e2e/field.spec.ts` / Expected: FAIL
- [ ] **Step 3: 구현** — 저장 네 곳: `initialField`, `mergeField`, `partialize`(`field` 통째 — 확인), `currentSave()`(`field` 통째 — 확인).
- [ ] **Step 4: 통과 확인** — Run: `npx tsc --noEmit -p . && npx vitest run && E2E_PORT=5181 npx playwright test` / Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "캡슐 4종 개수 저장, 던질 때마다 1개, 없으면 돌려보내기"`

### Task 15: 필드별 색 캡슐 그림

**담당:** Sonnet

**Files:**
- Create: `src/field/art/CapsuleBall.tsx`
- Delete: `src/field/art/GachaCapsule.tsx` (쓰는 곳 셋: `WildBattleScreen`, `DevFieldGallery`)
- Modify: `src/field/DevFieldGallery.tsx`(네 색 나란히)
- Test: `tests/field/creatureArt.test.ts` 또는 새 `tests/field/capsuleBall.test.ts`

**Interfaces:**
- Produces: `CapsuleBall({ type, size = 64 }: { type: CapsuleType; size?: number })` — SVG, 둥근 공, 위 반쪽 필드 색, 아래 반쪽 흰색 계열, 가운데 어두운 띠와 둥근 단추, 어두운 테두리. `CAPSULE_COLORS: Record<CapsuleType, string>` = 초록 `#4caf50`, 파랑 `#2f8fe0`, 주황 `#f08a24`, 금색 `#f2c230`(설계서 [제안] 색). `clipPath` id는 `useId()`로(여러 개가 한 화면에 있어도 안 섞이게).

- [ ] **Step 1: 실패하는 테스트** — `renderToStaticMarkup(<CapsuleBall type="desert" />)`에 `#f08a24`가 있고, 두 개를 함께 그리면 `clipPath` id가 다르다.
- [ ] **Step 2: 실패 확인** · **Step 3: 구현**(전투 화면 던지기 애니메이션은 그 종의 캡슐) · **Step 4: 통과 확인** — `npx vitest run`, `#/dev/field` 375px에서 네 색 확인.
- [ ] **Step 5: Commit** — `git commit -m "캡슐 그림을 필드별 색 공 모양으로 새로 그림"`

### Task 16: 상점 연습 규칙(순수) — 한 단 ×1~×9, 회복 3바퀴

**담당:** Sonnet

**Files:**
- Create: `src/domain/field/shopQuiz.ts`, `tests/field/shopQuiz.test.ts`
- Modify: `src/domain/field/wounds.ts`(회복 진행), `tests/field/wounds.test.ts`, `tuning.ts`(+ `DAN_PRACTICE_FIRST = 1`, `DAN_PRACTICE_LAST = 9`, `HEAL_ROUNDS = 3`), `tests/field/tuning.test.ts`

**Interfaces:**
- Produces:
  - `shopQuiz.ts`:
    - `practiceDans(t: CapsuleType, challengeUnlocked: boolean): { dan: Dan; locked: boolean }[]` — meadow [2,4,8], waterside [3,6,9], desert [5,7,12(잠김 ↔ 해금)], legend [13(잠김 ↔ 해금)]
    - `interface DanQuiz { dan: Dan; index: number; hint: boolean; done: boolean }`
    - `createDanQuiz(dan: Dan): DanQuiz`; `danQuizFact(q: DanQuiz): FactId`(`factId(dan, DAN_PRACTICE_FIRST + index)`); `answerDanQuiz(q, correct: boolean): DanQuiz`(정답 index+1, 9문제 끝이면 done; 오답 hint true, index 그대로; done·hint 중이면 그대로); `leaveDanHint(q): DanQuiz`
  - `wounds.ts`:
    - `interface HealRun { order: Wound[]; round: number; index: number; hint: boolean; done: boolean }`
    - `createHealRun(wounds: readonly Wound[], rng: Rng): HealRun` — 비었으면 `done: true`(바로 회복). `order = shuffle(rng, wounds)`
    - `healRunWound(run): Wound | null`
    - `answerHeal(run, correct: boolean, rng: Rng): HealRun` — 정답 index+1, 바퀴 끝이면 round+1·index 0·`order` 다시 섞기, round가 `HEAL_ROUNDS`가 되면 done. 오답 hint true(셈 안 함).
    - `leaveHealHint(run): HealRun`

- [ ] **Step 1: 실패하는 테스트**

```ts
it('2단 연습은 2x1 … 2x9 차례대로 9문제', () => {
  let q = createDanQuiz(2); const ids: string[] = [];
  while (!q.done) { ids.push(danQuizFact(q)); q = answerDanQuiz(q, true); }
  expect(ids).toEqual(['2x1', '2x2', '2x3', '2x4', '2x5', '2x6', '2x7', '2x8', '2x9']);
});
it('틀리면 힌트, 같은 문제, 진도 안 나감', () => {
  const q = answerDanQuiz(createDanQuiz(3), false);
  expect(q).toMatchObject({ index: 0, hint: true });
  expect(answerDanQuiz(q, true)).toEqual(q);
  expect(leaveDanHint(q)).toMatchObject({ index: 0, hint: false });
});
it('12·13단은 해금 전 잠김', () => {
  expect(practiceDans('desert', false)).toEqual([{ dan: 5, locked: false }, { dan: 7, locked: false }, { dan: 12, locked: true }]);
  expect(practiceDans('legend', true)).toEqual([{ dan: 13, locked: false }]);
});
it('회복: 상처 2개 → 정답 6번에 끝, 바퀴마다 다시 섞음, 오답은 셈 안 함', () => {
  const ws = [w('2x3'), w('7x8')];
  let run = createHealRun(ws, seededRng(3)); let n = 0; const seen: string[] = [];
  while (!run.done) {
    seen.push(healRunWound(run)!.factId);
    run = leaveHealHint(answerHeal(run, false, seededRng(n)));  // 틀리고
    run = answerHeal(run, true, seededRng(n++));                  // 맞힘
  }
  expect(n).toBe(6);
  expect(seen.filter((f) => f === '2x3')).toHaveLength(3);
});
it('상처가 없으면 바로 done', () => expect(createHealRun([], seededRng(1)).done).toBe(true));
```
- [ ] **Step 2: 실패 확인** · **Step 3: 구현** · **Step 4: 통과 확인** — Run: `npx vitest run tests/field` / Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "상점 연습 규칙: 한 단 ×1~×9 차례대로, 회복은 상처 문제마다 3번"`

### Task 17: 상점 팝업 — [캡슐] 탭·단 연습, [회복약] 탭·회복 연습

**담당:** Sonnet

**Files:**
- Create: `src/field/shop/ShopPopup.tsx`, `CapsuleTab.tsx`, `PotionTab.tsx`, `DanPractice.tsx`, `HealPractice.tsx`, `shop.css`
- Modify: `src/field/world/FieldScreen.tsx`(문 부딪힘 → 팝업, R16 임시 회복 제거), `src/field/battle/battleText.ts` 옆에 `src/field/shop/shopText.ts`(상점 글 한 곳), `e2e/field.spec.ts`

**Interfaces:**
- Consumes: Task 14 `CAPSULE_TYPES`·`CAPSULE_NAMES`·`grantCapsules`·`CAPSULE_REWARD`, Task 15 `CapsuleBall`, Task 16 전부, Task 9 `healSpecies`·`isFainted`, `recordAnswer`(`source: 'field'`, `inputMode: 'choice'`, `battleStartedAt` = 연습 시작 시각, `firstAttemptInBattle` = 이 연습에서 처음 나온 사실인가), `generateQuestion(rng, getFact(id), type, FIELD_CHOICES)`, `HintPanel`, `QuestionView`
- Produces:
  - `SHOP_TABS: { id: 'capsule' | 'potion' | 'soon'; label: string; ready: boolean }[]` = 캡슐·회복약·준비 중(ready false — 누르면 "추후 업데이트로 열려요")
  - `ShopPopup({ onClose }: { onClose(): void })` — `role="dialog"`, `aria-label="상점"`, 필드 위 겹층(조이스틱보다 위), 닫기 버튼. 닫으면 문 앞 칸 그대로(자리 안 바꿈). 열려 있는 동안 걷지 않음.
  - `CapsuleTab`: 줄 넷 — 그림·이름·보유 수·[얻기]. [얻기] → 단 버튼(`practiceDans`, 잠긴 단은 🔒 비활성) → `DanPractice({ dan, type, onDone, onQuit })`: 문제(시간 없음), 틀리면 힌트 → 빛나는 답 → 같은 문제(R22), 9문제 끝 → `grantCapsules(type, CAPSULE_REWARD)` + "초원 캡슐 3개를 받았어요!"(`shopText.gotCapsules(name, n)`). 중간에 나가면 보상 없음.
  - `PotionTab`: 체력 < 100인 잡은 종 목록(그림·체력 막대·상처 수·쓰러지면 "쓰러짐"). 없으면 "모두 건강해요!". 고르면 `HealPractice({ species, onDone, onQuit })`: `createHealRun(wounds)`, 문제는 상처의 `type` 그대로, 끝나면 `healSpecies` + "○○이(가) 다 나았어요!". 상처가 없으면 바로 회복.
  - 연습 진행은 저장하지 않는다(화면 상태).

- [ ] **Step 1: E2E 먼저** (`__GUGU_E2E_NO_WILD__`는 기본 켜짐)
  - "마을 문에 부딪히면 상점 팝업, 캡슐 탭에 네 줄": 문 앞 저장본 → 부딪힘 → `dialog 상점`, `초원 캡슐`·`황금 캡슐` 보임, 황금 [얻기] → 13단 잠김.
  - "초원 캡슐 얻기: 2단 9문제": 첫 문제 틀려 힌트 → 같은 문제 → 맞힘 → 나머지 8문제 맞힘 → `초원 캡슐 3개를 받았어요!`, 저장본 `capsules.meadow === 6`, `learning.totalAttempts` 10 늘어남.
  - "중간에 나가면 캡슐 그대로".
  - "회복약: 쓰러진 구구몬을 상처 문제 3번으로 회복": 저장본 cloud `hp 0, wounds [{7x8, product}]` → 회복약 탭 `쓰러짐` → 고르기 → 7×8 세 번 → `다 나았어요` → 저장본 hp 100, wounds [] → 팝업 닫으면 필드 위 쓰러짐 알림 사라짐.
  - "준비 중 탭은 안내만".
- [ ] **Step 2: 실패 확인** — Run: `E2E_PORT=5181 npx playwright test e2e/field.spec.ts` / Expected: FAIL
- [ ] **Step 3: 구현** — 위 Interfaces. 375px에서 팝업이 화면 안에 들어가고 보기 버튼이 손가락 크기(44px 이상)인지.
- [ ] **Step 4: 통과 확인** — Run: `npx tsc --noEmit -p . && npx vitest run && E2E_PORT=5181 npx playwright test` / Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "태초마을 상점 팝업: 구구단 한 단 풀고 캡슐 얻기, 상처 문제로 회복약"`

### Task 18: 왼쪽 위 표시, [태초마을로], 도감 체력

**담당:** Sonnet

**Files:**
- Create: `src/field/world/FieldHud.tsx`
- Modify: `FieldScreen.tsx`(HUD·메뉴 버튼 `[태초마을로]`), `loadField.ts`(+ 순간 이동), `FieldDexScreen.tsx`(체력·쓰러짐), `field.css`, `fieldDex.css`, `e2e/field.spec.ts`
- Test: `tests/field/loadField.test.ts`, `e2e/field.spec.ts`

**Interfaces:**
- Produces:
  - `FieldHud()` — 왼쪽 위 알약(`aria-label="필드 정보"`): 캡슐 넷(작은 `CapsuleBall` + 수), `도감 {잡은 종 수}/{SPECIES.length}`, 동행 체력 막대(`aria-label="동행 체력 {hp}"`). 조이스틱보다 위 층.
  - `warpPosition(dest: FieldMap): SavedPosition` — `dest.entrances.start`, facing `down`(`loadField.ts`)
  - 메뉴 `[태초마을로]`(마을에서는 숨김): `travelTo`처럼 불러오기 화면을 거쳐 마을 `@`. 실패하면 제자리 + `OFFLINE_MESSAGE`.
  - 도감: 잡은 칸마다 작은 체력 막대, 0이면 "쓰러짐" 꼬리표. 시트의 "함께 다니기"는 쓰러졌으면 비활성 + "상점에서 회복시켜요"(Task 11의 최소 막기를 이걸로 바꿈).

- [ ] **Step 1: 실패하는 테스트** — `loadField.test.ts`: `warpPosition(town)`이 `{ map: 'town', ...town.entrances.start, facing: 'down' }`. E2E: "HUD에 도감 1/11과 캡슐 3", "초원에서 메뉴 → 태초마을로 → 마을 @, 저장본 town", "마을에서는 [태초마을로]가 없다", "도감에서 쓰러진 종은 함께 다니기 버튼이 꺼져 있다".
- [ ] **Step 2: 실패 확인** · **Step 3: 구현** · **Step 4: 통과 확인** — 전체 명령 넷.
- [ ] **Step 5: M4 마무리** — `MVP_DESIGN.md` `v1.39`(캡슐 4종·개수·상점 팝업·캡슐 연습·회복약·HUD·태초마을로). 
- [ ] **Step 6: Commit** — `git commit -m "필드 왼쪽 위에 캡슐·도감·체력 표시, 메뉴에 태초마을로, 도감에 체력"`

### Task 19: M4 검토

**담당:** `opus-reviewer` — Task 14~18. 특히 Review Focus 1·4, 저장 네 곳(`capsules`), 상점 연습의 `recordAnswer` 기록(상자 3까지, 한 문제 한 번), 팝업이 열려 있을 때 걷기·만남이 멈추는지, 연습 중 앱을 닫으면 보상 없이 사라지는지.

---

# M5 — 속성과 기술 효과 (저장 데이터 없음)

### Task 20: 속성 표와 효과 21개

**담당:** Sonnet

**Files:**
- Create: `src/domain/field/elements.ts`, `tests/field/elements.test.ts`
- Modify: `src/field/fx/effects.ts`, `tests/field/pixelArt.test.ts`(효과 이름 목록)

**Interfaces:**
- Produces:
  - `type Element = 'grass' | 'poison' | 'light' | 'water' | 'thunder' | 'earth' | 'fire'`; `ELEMENT_NAMES: Record<Element, string>`(풀·독·빛·물·번개·땅·불); `elementOf(id: SpeciesId): Element` — cloud 풀, mushroom 독, fluff 빛, jelly·horn 물, antenna 번개, pebble 땅, ghost 불; 레전드는 기본 종과 같음.
  - `effects.ts`: `EFFECTS`에 21개(`screen: false`, `hold: false`, `speed: 1`, `note`에 속성·번호). 경로(`pixelfx/fx/…`, 모두 있음 확인함): `nature/vine-whip`, `nature/thorns`, `nature/leaf-storm`, `nature/acid-splash`, `nature/spore-burst`, `nature/poison-cloud`, `holy/feather-burst`, `holy/smite`, `holy/sunburst`, `water/splash`, `water/water-jet`, `water/wave-crash`, `lightning/zap-hit`, `lightning/chain-lightning`, `lightning/lightning-strike`, `nature/earth-spike`, `nature/boulder`, `nature/quake`, `fire/fireball`, `fire/fire-breath`, `fire/flame-pillar`. 이름은 파일 이름 그대로(`'vine-whip'` 등).
  - `ELEMENT_FX: Record<Element, readonly [FxName, FxName, FxName]>` — 설계서 11절 표 순서(기술 1·2·3번 = 약함→강함).

- [ ] **Step 1: 실패하는 테스트**

```ts
it('종 11개 모두 속성이 있고 레전드는 기본 종과 같다', () => {
  for (const s of SPECIES) expect(ELEMENT_NAMES[elementOf(s.id)]).toBeTruthy();
  expect(elementOf('legend-horn')).toBe(elementOf('horn'));
  expect(elementOf('ghost')).toBe('fire');
});
it('속성마다 효과 3개, 모두 EFFECTS에 있다', () => {
  for (const fx of Object.values(ELEMENT_FX)) { expect(fx).toHaveLength(3); for (const n of fx) expect(FX_NAMES).toContain(n); }
  expect(ELEMENT_FX.fire).toEqual(['fireball', 'fire-breath', 'flame-pillar']);
});
```
- [ ] **Step 2: 실패 확인** · **Step 3: 구현** · **Step 4: 통과 확인** — Run: `npx vitest run tests/field` / Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "구구몬 속성 7가지와 속성별 기술 효과 21개"`

### Task 21: 전투에서 속성 효과 틀기(내 공격·적 공격)

**담당:** Sonnet (직접 틀어 보고 옵션 조정)

**Files:**
- Modify: `src/field/battle/WildBattleScreen.tsx`, `src/field/DevFieldGallery.tsx`(속성별 버튼 줄 — 한 줄에 효과 3개), `src/field/fx/effects.ts`(옵션·`speed` 조정)

**Interfaces:**
- Consumes: Task 20 `elementOf`·`ELEMENT_FX`, `playFx`·`preloadFx`
- Produces:
  - 정답: `ELEMENT_FX[elementOf(동행)][고른 기술 번호]`를 **야생 구구몬** 발치에서(지금 `fxAtFoe`). 지금의 `'hit'`는 효과를 못 틀 때(불러오기 실패)만 대신.
  - 피격: `ELEMENT_FX[elementOf(야생)][wild.lastMove]`를 **내 구구몬** 위에서(`fxAtAlly`, `.wild__ally` 기준). 내 구구몬이 왼쪽이라 방향 옵션(`flip`)은 반대로.
  - 황금 야생: 효과가 `palette` 옵션을 받으면 금색 팔레트(지금 `catch` 팔레트)를 넘긴다, 아니면 그대로.
  - 전투 시작 때 두 구구몬의 효과 6개만 `preloadFx`. 동작 줄이기면 틀지 않음(`playFx`가 이미 처리).
  - 효과는 보기만 — 연출 시간(`WILD_HIT_ANIM_MS`·`WILD_FOE_ATTACK_MS`)과 규칙은 그대로. 효과가 그 시간보다 길면 `until`로 자른다.

- [ ] **Step 1:** `#/dev/field`에서 21개를 하나씩 틀어 보고 `effects.ts`의 `speed`·`until`·`options`를 맞춘다(효과가 0.6초·0.7초 안에 끝나게).
- [ ] **Step 2:** 전투 화면 연결. Run: `npx tsc --noEmit -p . && npx vitest run && E2E_PORT=5181 npx playwright test` / Expected: PASS(E2E는 콘솔 오류 없음 — `collectErrors` 쓰는 테스트 통과).
- [ ] **Step 3:** 375px 개발 서버에서 내 공격·적 공격을 한 번씩 보고, 동작 줄이기를 켜도 전투가 그대로 흐르는지 본다.
- [ ] **Step 4: M5 마무리** — `MVP_DESIGN.md` `v1.40`(속성·기술 효과). CLAUDE.md "어디를 고치나" 표에 `strength`·`capsules`·`shopQuiz`·`wounds`·`roam`·`elements`·`src/field/shop/` 줄 추가.
- [ ] **Step 5: Commit** — `git commit -m "전투에서 속성별 기술 효과: 내 공격은 야생 위, 적 공격은 내 구구몬 위"`

### Task 22: 브랜치 전체 최종 검토

**담당:** `opus-reviewer` — `main...field-adventure-2` 전체. 설계서 0절 표의 줄마다 구현 위치, Review Focus 다섯, 저장 네 곳(`position.map`·`hp`·`wounds`·`capsules`), 원작 복제 금지(그림·낱말), 375px.

---

## 담당 요약

| 담당 | 작업 |
|---|---|
| Haiku | 2, 12 |
| Sonnet | 1, 3, 5, 7, 8, 15, 16, 17, 18, 20, 21 |
| `opus-expert` | 4, 6, 9, 10, 11, 14 |
| `opus-reviewer` | 13, 19, 22 |

작업마다의 검토자는 Sonnet(일반 에이전트, `model: sonnet`) 이상.
