# 구구단 몬스터 탐험대

구구단을 풀어 몬스터를 잡고, 모은 별로 나만의 펫을 키우는 초등 3학년용 학습 웹앱.

**바로 해 보기:** https://baekbeom99-dotcom.github.io/gugu-monster/
(휴대폰에서 열고 '홈 화면에 추가'하면 앱처럼 쓸 수 있고, 한 번 열면 인터넷 없이도 돼요)

- 기획 초안: [PROJECT_PLAN.md](PROJECT_PLAN.md)
- MVP 설계서: [MVP_DESIGN.md](MVP_DESIGN.md)

## 실행

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:5173)
npm test         # 단위·시뮬레이션 테스트 (Vitest)
npm run e2e      # 화면 전체 흐름 테스트 (Playwright, 이 PC의 Microsoft Edge 사용)
npm run build    # 타입 검사 + 배포용 빌드(dist/, PWA 포함)
```

## 배포

`main`에 올리면 GitHub Actions가 테스트 → 빌드 → GitHub Pages 배포를 자동으로 한다 (`.github/workflows/deploy.yml`).
Pages 주소가 `/<저장소 이름>/` 아래라서 빌드 때 `BASE_PATH`로 경로를 넘긴다.

## 구조

| 폴더 | 내용 |
|---|---|
| `src/domain/` | 학습·게임 규칙 (순수 함수, UI 의존 없음) — 곱셈 사실, 문제 생성, 숙련도, 출제 알고리즘 |
| `src/store/` | 저장 데이터 스키마와 Zustand 스토어 (localStorage `gugu-monster:save`) |
| `src/screens/`, `src/components/` | 화면 |
| `src/audio/` | Web Audio 합성 효과음 |
| `tests/` | Vitest 단위·시뮬레이션 테스트 |
| `e2e/` | Playwright 화면 흐름 테스트 |

## 진행 상황

- [x] M0 기반: 5탭 레이아웃, 저장소, 효과음, PWA
- [x] M1 학습 엔진 + 테스트
- [x] M2 몬스터 전투: 탐험 선택, 전투, 힌트 4종, 재출제, 결과 정산, 몬스터 SVG (개발용 그림 검수: `#/dev/gallery`)
- [x] M3 학습 기록: 숫자 타일, 구구단 지도(10×11, 칸 눌러 자세히), 단별 진행, 문제 종류별 정답률, 극복한/연습 중인 문제
- [x] M4 펫: 알 고르기 → 첫 탐험 → 부화·이름 짓기, 펫 3종×4단계 SVG·표정 7종, 상태 감소(하한 30·최대 24시간), 무료 돌봄 4종, 친밀도 Lv, 성장·진화, 전투 응원, 성장 앨범
- [x] M5 별 상점: 카탈로그(먹이 5·위생 2·장난감 3·모자 5 + 마스터 모자 10), 구매·가방, 펫 화면 아이템 서랍, 모자 9종 SVG 착용, 단 마스터 보상 모자
- [x] M6 관리자 모드: PIN·복구 코드·5회 실패 잠금·2분 자동 잠금, 아이템 편집·추가·판매 중지·순서·기본값 복원, 상점 설정 공유(코드·파일), 학습·소리 설정, 백업·불러오기·전체 초기화
- [x] M7 마감: 펫 반응 점검(도전 해금 대사·친밀도 하이파이브/춤·결과 말풍선·축하 폭죽), 효과음 다듬기(부드러운 음색·구매/콤보/팡파르/자장가), 반응형(작은 폰·가로 화면·태블릿·PC), E2E 3개

아직 확인하지 못한 것: 실제 휴대폰·태블릿 기기에서의 확인, 효과음을 귀로 들어 보는 확인
