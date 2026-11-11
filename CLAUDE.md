# 구구단 몬스터 탐험대 — 작업 안내

어린이용 구구단 학습 PWA. 몬스터 탐험(문제 풀이)으로 별을 모아 다마고치 펫을 키운다.
React 18 + TypeScript + Vite + Zustand, 해시 라우터(`#/` 타이틀, `#/field`, `#/field/battle`, `#/field/starter`, `#/field/dex`), GitHub Pages 정적 배포. 서버 없음 — 모든 데이터는 브라우저 localStorage.

- 라이브: https://baekbeom99-dotcom.github.io/gugu-monster/
- 사용자는 한국어로 요청한다. 화면 글자·주석·커밋 메시지도 한국어(어린이가 읽기 쉬운 말).
- 규칙·수치의 기준은 `MVP_DESIGN.md`(설계서, 크다 — 필요한 절만 grep해서 읽기). 맨 위 변경 이력 표에 버전(v1.xx)을 한 줄씩 추가한다.

## 폴더

| 위치 | 내용 |
|---|---|
| `src/domain/` | 순수 로직(React 없음). 테스트는 여기를 대상으로. `pet.ts`(펫 상태·돌봄·똥/병·친밀도), `progress.ts`(답 기록·별·탐험 정산), `mastery.ts`·`scheduler.ts`(숙련도·출제), `arith*.ts`(셈 연습), `stairs.ts`(무한의 계단), `shop.ts`·`catalogRules.ts`(상점), `dex.ts`(도감·졸업) |
| `src/store/useGameStore.ts` | 저장되는 게임 상태와 액션(Zustand persist) |
| `src/store/saveData.ts` | `SaveData` 형식, `createInitialSave`, `mergeSave`(예전 저장 채우기), `SAVE_KEY` |
| `src/store/useSessionStore.ts` | 저장 안 되는 화면 상태(진화·레벨업 알림 대기 등) |
| `src/domain/field/` | 필드 모험 순수 로직: `fields`(필드·단 구성), `movement`, `wildBattle`, `encounter`(만남·캡슐·E2E 스위치), `creatures`, `fieldQuestions`, `growth`(경험치·레벨·진화) |
| `src/field/` | 필드 모험 화면: `FieldScreen`·`maps/`·`fieldRenderer`(캔버스)·`TouchPad`·`WildBattleScreen`·`FieldDexScreen`·`StarterScreen`·`fx`(효과)·`GachaCapsule` |
| `src/store/fieldData.ts` | 필드 모험 저장 데이터(`SaveData.field`) 형식·기본값·병합 |
| `src/screens/` | 화면. `TitleScreen.tsx`(타이틀 `#/`). Pet·Explore·Shop·Records·Dex(탭), Battle·Practice·Stairs(전체 화면), `admin/`(관리자, PIN) |
| `src/art/` | 펫·몬스터·모자 SVG 그림 |
| `src/data/defaultCatalog.ts` | 상점 기본 아이템 |
| `src/pwa/autoUpdate.ts` | 서비스 워커 등록, 새 버전 확인(탭 복귀·30분), 문제 푸는 화면이 아닐 때 자동 새로고침 |
| `tests/` | Vitest 단위 테스트 |
| `e2e/` | Playwright. `helpers.ts`(`seedHatchedPet`, `playExploration`, `closeEvolutionIfShown`…), `fixtures.ts`(무작위 똥·병 끔) |

## 저장 데이터 — 바꿀 때 꼭

- 키: `gugu-monster:save` (공유 코드 `gugu-monster/shop`, 백업 `gugu-monster/backup`). 로컬 데이터를 잃지 않는 것이 최우선.
- `SaveData`에 필드를 추가하면 함께 고친다(네 곳, `field` 같은 중첩 데이터도 `mergeSave`에서 깊게 채우기): `createInitialSave` 기본값, `mergeSave`(예전 저장에 기본값 채우기), `useGameStore`의 `partialize` 목록, 그리고 `admin/DataSecurityPanels.tsx`의 `currentSave()`(백업).
- 펫 친밀도·XP가 바뀌는 액션은 `settlePet(before, after, now)`로 진화·레벨업을 잡고, 화면이 결과의 `evolvedTo`·`levelUp`을 `useSessionStore`에 넘긴다.
- 같은 github.io 아래에 다른 버전을 배포하면 localStorage가 공유되므로 키를 바꿔야 한다.

## 명령

```bash
npx tsc --noEmit -p .        # 타입 검사
npx vitest run               # 단위 테스트
E2E_PORT=5181 npx playwright test   # E2E (다른 앱이 5181 등을 쓰면 5191 같은 빈 포트)
npm run build                # 배포용 빌드 (tsc -b && vite build)
```

- E2E 스위치(`window`에 설정): `__GUGU_E2E_CALM__`(똥·병 끔), `__GUGU_E2E_FIELD__`(필드 만남·캡슐 100%), `__GUGU_E2E_LEGEND__`(만남이 레전드).
- E2E 하나가 가끔 시간 문제로 실패할 수 있다(`dex.spec` 놀이 장면). 따로 다시 돌려 확인. 파이프로 줄일 때는 `set -o pipefail`로 실패를 놓치지 않기.
- Windows Git Bash에서 `BASE_PATH=/gugu-monster/`처럼 `/`로 시작하는 값은 경로로 바뀐다 → 로컬 빌드 확인 때 `MSYS_NO_PATHCONV=1`.

## 배포

`main`에 push하면 GitHub Actions(`.github/workflows/deploy.yml`)가 빌드해 Pages에 올린다. 경로는 저장소 이름으로 정해진다(`BASE_PATH: /<repo>/`).

1. 타입 검사·단위 테스트·E2E·빌드 통과
2. `git add -A && git commit` — 메시지는 한국어 한 줄 요약, 끝에 `Co-Authored-By` 줄
3. `git push origin main`
4. `gh run list --json databaseId,headSha`로 이번 커밋의 run을 찾아 `gh run watch <id> --exit-status`
5. 라이브 확인: 서비스 워커 캐시 때문에 `index.html?v=<시각>`을 받아 새 `assets/index-*.js` 이름과 바뀐 글자를 확인

사용자가 "바로 배포"라고 하면 확인 질문 없이 위 순서로 끝까지 한다. `backup` 같은 임시 폴더는 커밋하지 않는다.

## 작업 습관

- 여러 줄 Python 패치는 bash heredoc보다 스크래치 폴더에 파일로 써서 실행하는 편이 따옴표 문제가 없다.
- 화면이 바뀌는 수정은 브라우저(개발 서버 `npx vite --port 5181`)에서 직접 보고 확인한다. 휴대폰 폭(375px) 기준.
- 관련 수치는 상수로 두고(`STAIRS_*`, `EXPLORATION_AFFECTION` 등) 테스트에서 값을 고정해 둔다.

## 모델 분배

지휘자(세션 모델)는 일의 크기로 고른다.

| 일 | 지휘자 | 이유 |
|---|---|---|
| 새 모드·여러 단계 기능(필드 모험처럼 설계서→계획→작업 여러 개) | **Opus** | 실행 중에도 판정(검토 지적 채택, 설계서와 계획이 어긋날 때 결정)을 지휘자가 내린다. 저장 데이터 네 곳·`settlePet` 같은 함정을 놓치지 않아야 한다 |
| 화면 한두 개 고치기, 수치 조정, 그림 다듬기 | **Sonnet** | 파일이 좁고 규칙이 이 문서에 다 있다 |
| 테스트·빌드·배포만 하기 | **Sonnet** (Haiku도 됨) | 정해진 순서를 따르는 일 |
| 계획은 깊게, 구현은 혼자 하는 중간 크기 일 | opusplan | 계획 모드만 Opus. 서브에이전트로 나눠 돌리는 일에는 맞지 않는다(실행 중 판정이 Sonnet으로 넘어감) |

서브에이전트에게는 모델을 꼭 적어서 보낸다(안 적으면 지휘자 모델을 그대로 씀).

- **Haiku**: 계획에 코드가 다 적힌 옮겨 쓰기, 한 파일짜리 기계적 수정, 픽셀 그림 줄 맞추기
- **Sonnet**: 보통 구현자, 작업마다의 검토자(검토자는 Sonnet보다 아래로 내리지 않는다), 범위 좁은 재검토
- **Opus**: 브랜치 전체 최종 검토, 저장 데이터(`SaveData`·`mergeSave`·백업)를 건드리는 작업, 검토 지적이 두 번 넘게 안 풀린 작업의 수정
