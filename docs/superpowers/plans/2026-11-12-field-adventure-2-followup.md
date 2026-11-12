# 필드 모험 2차 후속 수정 계획 — 쓰러지면 자동 대체 · 상점 보상 0 · 효과 중심 맞춤·겹침 막기

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 최종 검토 뒤 사용자가 정한 것 셋을 반영한다. (1) 구구몬이 쓰러지면 도감의 다른 건강한 구구몬이 자동으로 동행이 된다. (2) 상점 연습은 별과 성장 점수를 주지 않는다(학습 기록은 그대로). (3) 기술 효과의 중심이 맞는 쪽 몬스터 몸 위에 오고, 효과끼리 겹치지 않는다(잘리는 것은 괜찮다).

**Spec:** `docs/superpowers/specs/2026-11-11-field-adventure-2-design.md` + 사용자 결정(아래). 이전 계획 `2026-11-12-field-adventure-2.md`의 Global Constraints를 그대로 따른다.

## Global Constraints

- 화면 글자·주석·커밋 메시지는 어린이가 읽기 쉬운 한국어. 커밋 끝줄은 실제로 쓴 모델 이름: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` 또는 `Claude Sonnet 5.5`.
- 브랜치 `field-adventure-2`. **push·merge·배포 금지.**
- 저장 키 `gugu-monster:save` 그대로. 저장 데이터 네 곳 규칙(`createInitialSave`·`mergeSave`/`mergeField`·`partialize`·`currentSave()`). 로컬 데이터를 잃지 않는 것이 최우선.
- 운영 수치는 `src/domain/field/tuning.ts`에만 + `tests/field/tuning.test.ts` 고정표. 새 수치가 생기면 거기에.
- E2E는 `E2E_PORT=5191`(5181은 다른 앱). 다른 E2E 실행과 겹치지 않게 혼자 돌린다. 눈 확인은 Playwright 스크린샷 375×812.
- 퀴즈 모험(필드 밖)의 동작은 바뀌지 않아야 한다.

## Review Focus

1. 자동 대체가 `damageCompanion` 단일 `set()` 안에서 체력·상처·마을 위치와 함께 일어난다(앱을 어느 순간에 닫아도 일관). 건강한 구구몬이 없으면 동행은 그대로이고 만남은 일어나지 않는다.
2. 상점 보상 0은 `source:'shop'`만 바뀐다 — 전투(`'field'`)·퀴즈 모험(`'normal'`·`'trial'`)의 별·XP·숙련도는 한 글자도 안 달라진다.
3. 효과 겹침: 같은 캔버스에서 새 효과가 이전 효과를 끊고 지운다. 효과를 틀다 오류가 나도 전투 흐름과 콘솔에 영향 없음.

---

### Task 1: 구구몬이 쓰러지면 도감의 다른 구구몬으로 자동 대체

**담당:** `opus-expert` (저장 데이터 + 전투 흐름)

**Files:**
- Modify: `src/store/useGameStore.ts`(`damageCompanion`, `finishWildBattle`), `src/store/fieldData.ts`(`FieldNotice`), `src/domain/field/wounds.ts` 또는 새 `src/domain/field/companion.ts`(고르는 순수 함수), `src/field/world/FieldScreen.tsx`(쓰러짐 알림 글), `src/field/battle/battleText.ts`(글), `tests/field/fieldStore.test.ts`, `tests/field/wounds.test.ts`(또는 새 테스트), `e2e/field.spec.ts`

**Interfaces:**
- Produces:
  - `pickReplacement(species: Record<SpeciesId, {level, hp, firstCaughtAt}>, fainted: SpeciesId): SpeciesId | null` — 도감에서 `fainted`를 뺀 **체력 > 0인** 종 중 레벨이 가장 높은 것, 같으면 `firstCaughtAt`이 빠른 것(그래도 같으면 `SPECIES_IDS` 순서). 없으면 null. 순수 함수.
  - `damageCompanion(id, dmg, wound): { hp: number; fainted: boolean; replacedBy: SpeciesId | null }` — 체력이 0이 되는 **같은 `set()`**에서 `field.companion`을 `pickReplacement(...)`로 바꾼다(있을 때). 이미 쓰러진 종이거나 대체 후보가 없으면 `companion`은 그대로. 마을 이동·상처 저장은 지금처럼 같은 `set()`.
  - `FieldNotice`의 `fainted`에 `replacedBy?: SpeciesId` 추가. `finishWildBattle`은 `end === 'fainted'`일 때, 정산 시점의 `field.companion`이 `end.companion`과 다르면 그 종을 `replacedBy`로 알림에 담는다.
  - 화면 알림: 제목 "쓰러졌어…", 본문은 `replacedBy`가 있으면 `${displayName(replacedBy)}이(가) 대신 함께 다녀요`(조사는 `josa`), 없으면 지금 글(`faintedField`).
- 규칙: 회복(`healSpecies`) 뒤 **원래 동행으로 자동으로 돌아가지 않는다**(도감에서 고름). 쓰러진 구구몬은 도감에서 "함께 다니기"가 비활성(지금 그대로). 건강한 구구몬이 하나도 없으면 지금처럼 만남 없음 + 안내.

- [ ] **Step 1: 실패하는 테스트** — 순수 함수(레벨 최고·동률·건강한 후보 없음·쓰러진 후보 제외), 스토어(`damageCompanion`이 0이 되는 순간 `companion`·`position`(마을)·`hp`·`wounds`가 한 번에 바뀜, 후보 없으면 `companion` 그대로, 이미 쓰러진 종을 또 때려도 안 바뀜), `finishWildBattle`의 `replacedBy`, 옛 저장 안전(`companion`이 null이어도 깨지지 않음). E2E: 동행 hp 20 + 건강한 다른 구구몬 저장본 → 시간 초과로 쓰러짐 → 마을 도착, 알림에 "대신 함께 다녀요", 저장본 `field.companion`이 대체 종, 도감에서 대체 종이 "함께 다니는 중"이고 쓰러진 종은 버튼 비활성, 마을에서 쓰러진 종은 누워 있고 대체 종은 주인공 뒤를 따라옴(돌아다니는 목록에서 빠짐). 건강한 구구몬이 없을 때는 동행 그대로·알림은 기존 글.
- [ ] **Step 2: 실패 확인** → **Step 3: 구현** → **Step 4: 통과 확인**(`npx tsc --noEmit -p .`, `npx vitest run`, `E2E_PORT=5191 npx playwright test e2e/field.spec.ts`)
- [ ] **Step 5: 레전드 만남 확인 테스트 하나(사용자 결정 3)** — 사용자는 "황금 구구몬은 황금 캡슐이 없어도 만날 수 있어야 한다"고 정했다. 현재 규칙(12단이 열리면 어디서든 2%로 나타남, 캡슐 보유와 무관)이 그것이다. 코드는 바꾸지 말고, 단위 또는 E2E로 고정: 레전드 만남이 `capsules.legend: 0`에서 시작되고(`__GUGU_E2E_LEGEND__`) 어지러워진 뒤 캡슐 없이 `캡슐이 없어서 돌려보냈어` 글로 끝나며 몬스터가 떠난다.
- [ ] **Step 6: Commit** — `git commit -m "구구몬이 쓰러지면 도감의 다른 구구몬이 자동으로 함께 다님"`

---

### Task 2: 상점 연습은 별과 성장 점수를 주지 않는다

**담당:** Sonnet

**Files:**
- Modify: `src/domain/progress.ts`(`RecordAnswerInput.source`와 보상 계산), `src/store/useGameStore.ts`(필요하면 `source` 통과), `src/field/shop/PracticeCard.tsx`(`source: 'shop'`), `tests/` 새·기존(progress/store 테스트), `e2e/field.spec.ts`
- Modify(문서): `MVP_DESIGN.md` 변경 이력 맨 위에 `v1.41`(상점 연습은 별·성장 점수 없음, 쓰러지면 자동 대체, 효과 중심·겹침 처리 — 간단히), `CLAUDE.md`는 바꿀 것 없으면 그대로.

**Interfaces:**
- `source`에 `'shop'` 추가. `'shop'`은 **숙련도·시도 횟수·오답 큐·오늘 기록 등 학습 기록은 `'field'`와 똑같이** 처리(상자 3까지 `FIELD_MAX_BOX`, 속도 별 없음)하되 **별 보상 0, 극복 보너스 0, 성장 점수(`xp`) 0**. 전투(`'field'`)·퀴즈 모험(`'normal'`·`'trial'`)의 값은 한 글자도 바뀌지 않는다.
- 상점 연습 화면(`PracticeCard`)이 `source: 'shop'`으로 기록한다.

- [ ] **Step 1: 실패하는 테스트** — `recordAnswer`(도메인): `'shop'` 정답은 `economy.stars`가 그대로, 펫 성장 점수가 그대로, 숙련도는 `'field'`와 같게 오른다(상자 3 상한·`dueAt`); 오답도 큐에 같은 방식으로; `'field'`·`'normal'`·`'trial'` 결과는 이전과 같다(기존 테스트 통과 + 회귀 하나). 스토어 수준: `recordAnswer({source:'shop'})`가 `pet.growthXp`와 `economy.stars`를 안 바꾼다. E2E(기존 상점 연습 테스트에 추가): 캡슐 얻기 한 판 전후 `economy.stars`와 `pet`의 성장 점수가 같다.
- [ ] **Step 2: 실패 확인** → **Step 3: 구현** → **Step 4: 통과 확인**(`npx tsc --noEmit -p .`, `npx vitest run`, `E2E_PORT=5191 npx playwright test e2e/field.spec.ts`)
- [ ] **Step 5: Commit** — `git commit -m "상점 연습은 별과 성장 점수를 주지 않음(학습 기록은 그대로)"`

---

### Task 3: 효과 중심을 맞는 쪽 몬스터 몸에 맞추고, 효과끼리 겹치지 않게

**담당:** Sonnet (직접 틀어 보고 조정)

**Files:**
- Modify: `src/field/fx/effects.ts`, `src/field/fx/playFx.ts`, `src/field/battle/WildBattleScreen.tsx`(`fxPoint`·`moveFx`), `src/field/DevFieldGallery.tsx`(같은 자리 규칙 사용), `tests/field/elements.test.ts` 또는 새 `tests/field/fxCenter.test.ts`, `e2e/field.spec.ts`(필요 시)

**Interfaces:**
- 중심 맞춤: 사용자 결정 — "잘려도 되지만 **이펙트의 중심에 맞는 쪽 몬스터가 있어야 한다**". 21개 속성 효과마다 **효과가 그려 낸 화소의 무게중심**(실행 전체에서 비어 있지 않은 화소의 평균 위치)을 헤드리스로 재서 `FxSpec`의 `center: { dx, dy }`(효과 화소 단위, 효과 원점 `(x, y)` 기준)로 효과표에 적는다. `playFx`의 자리 인자 `at`은 이제 "**효과의 중심을 놓을 화면 좌표**"로 해석해 `원점 = at − center × FX_PIXEL`(`mirror`이면 `dx`를 뒤집음)로 계산한다. 전투 화면은 맞는 쪽 몬스터의 **그림(스프라이트) 요소의 한가운데**를 `at`으로 준다(내 공격: `.wild__foe` 안의 그림, 적 공격: `.wild__ally` 안의 그림 — 이름 글자가 있는 상자 전체가 아니라 그림). 기존 `reach`·`anchor`는 중심 맞춤이 대신하면 없앤다(쓰는 효과가 없던 `anchor`는 반드시 제거).
- 옆으로 날아가는 효과(`vine-whip`·`water-jet`·`chain-lightning`·`boulder`·`fireball`·`fire-breath`)도 같은 규칙(무게중심이 몬스터 몸 위)으로 맞춘다. 무게중심이 몬스터 밖이면 그 효과에 한해 `center`를 손으로 조정해 **한창일 때 효과가 몬스터와 겹치게** 한다.
- 겹침 막기: 같은 캔버스에서 새 효과를 틀면 **이전 효과를 즉시 끊고 지운다**(캔버스마다 현재 실행 표식 하나; 이전 루프는 다음 프레임에 스스로 멈춤). 효과를 틀다 던지는 오류(`createFx`·`update`·`draw`)는 `playFx` 안에서 잡아 `false`를 돌려주고 콘솔 오류·미처리 거부를 남기지 않는다(기존 모듈 불러오기 실패 처리는 그대로). 동작 줄이기·`gold`·`mirror` 동작은 그대로.
- 개발 화면 `#/dev/field`는 전투와 같은 자리 규칙(무게중심)을 쓴다: 상자 한가운데가 곧 효과 중심.

- [ ] **Step 1: 실패하는 테스트** — (a) 21개 효과마다 측정한 무게중심이 효과표의 `center`와 허용 오차(예: 1.5 화소) 안에 있다(표가 어긋나면 실패; 측정은 Task 20의 헤드리스 방식 재사용), (b) `playFx`에서 같은 캔버스에 두 효과를 연달아 틀면 첫 효과 루프가 멈추고 캔버스가 한 효과의 그림만 갖는다(가짜 rAF나 짧은 시간 모의로), (c) `createFx`가 던지는 가짜 효과를 틀어도 거부된 프로미스가 안 생기고 `false`.
- [ ] **Step 2: 실패 확인** → **Step 3: 구현**
- [ ] **Step 4: 눈 확인(꼭)** — 375×812 전투에서 **21개 효과 전부**, 내 공격(야생 위)·적 공격(내 구구몬 위) 각각 한창일 때(효과 시작 0.2~0.3초) 스크린샷을 `.superpowers/sdd/2026-11-12-field-adventure-2-followup/task-3-shots/`에 저장하고, 효과의 중심에 몬스터 몸이 있는지 한 줄씩 표로 보고서에 적는다. 몬스터 밖에 있는 것은 `center`를 고쳐 다시 찍는다. 잘리는 것은 괜찮다. 황금 야생이 쏘는 효과 하나도 한 장(금색).
- [ ] **Step 5: 통과 확인**(`npx tsc --noEmit -p .`, `npx vitest run`, `MSYS_NO_PATHCONV=1 npm run build`, `E2E_PORT=5191 npx playwright test e2e/field.spec.ts e2e/title.spec.ts`)
- [ ] **Step 6: Commit** — `git commit -m "기술 효과의 중심을 맞는 쪽 몬스터에 맞추고 효과끼리 겹치지 않게 함"`
