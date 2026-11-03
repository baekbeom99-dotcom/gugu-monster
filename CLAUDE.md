# 구구단 몬스터 탐험대 — 작업 안내

어린이용 구구단 학습 PWA. 몬스터 탐험(문제 풀이)으로 별을 모아 다마고치 펫을 키운다.
React 18 + TypeScript + Vite + Zustand, 해시 라우터, GitHub Pages 정적 배포. 서버 없음 — 모든 데이터는 브라우저 localStorage.

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
| `src/screens/` | 화면. Pet·Explore·Shop·Records·Dex(탭), Battle·Practice·Stairs(전체 화면), `admin/`(관리자, PIN) |
| `src/art/` | 펫·몬스터·모자 SVG 그림 |
| `src/data/defaultCatalog.ts` | 상점 기본 아이템 |
| `src/pwa/autoUpdate.ts` | 서비스 워커 등록, 새 버전 확인(탭 복귀·30분), 문제 푸는 화면이 아닐 때 자동 새로고침 |
| `tests/` | Vitest 단위 테스트 |
| `e2e/` | Playwright. `helpers.ts`(`seedHatchedPet`, `playExploration`, `closeEvolutionIfShown`…), `fixtures.ts`(무작위 똥·병 끔) |

## 저장 데이터 — 바꿀 때 꼭

- 키: `gugu-monster:save` (공유 코드 `gugu-monster/shop`, 백업 `gugu-monster/backup`). 로컬 데이터를 잃지 않는 것이 최우선.
- `SaveData`에 필드를 추가하면 함께 고친다(네 곳): `createInitialSave` 기본값, `mergeSave`(예전 저장에 기본값 채우기), `useGameStore`의 `partialize` 목록, 그리고 `admin/DataSecurityPanels.tsx`의 `currentSave()`(백업).
- 펫 친밀도·XP가 바뀌는 액션은 `settlePet(before, after, now)`로 진화·레벨업을 잡고, 화면이 결과의 `evolvedTo`·`levelUp`을 `useSessionStore`에 넘긴다.
- 같은 github.io 아래에 다른 버전을 배포하면 localStorage가 공유되므로 키를 바꿔야 한다.

## 명령

```bash
npx tsc --noEmit -p .        # 타입 검사
npx vitest run               # 단위 테스트
E2E_PORT=5181 npx playwright test   # E2E (5173이 다른 앱에 쓰이면 포트 지정)
npm run build                # 배포용 빌드 (tsc -b && vite build)
```

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
