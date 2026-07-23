# 티어링 사가 한국어화 배포 사이트

티어링 사가 시리즈의 두 작품을 위한 비공식 한국어화 패치 통합 배포 사이트입니다.

- GitHub 저장소: [ss-park-0930/tearing-saga-series-publish](https://github.com/ss-park-0930/tearing-saga-series-publish)
- 기본 Pages 주소: `https://ss-park-0930.github.io/tearing-saga-series-publish/`

- 《티어링 사가 - 유토나 영웅전기》 (PlayStation)
- 《베르위크 사가 - 라즈베리아 연대기 제174장》 (PlayStation 2)

## 로컬에서 확인하기

처음 한 번 의존성을 설치한 뒤 개발 서버를 실행합니다.

```powershell
npm install
npm run dev
```

터미널에 표시되는 로컬 주소를 열면 통합 다운로드 홈을 볼 수 있습니다. 배포용 결과를 확인하려면 다음 명령을 사용합니다.

```powershell
npm run build
npm run preview
```

## 주요 파일

- `src/pages/index.astro`: 최신 배포와 패치 가이드로 이동하는 단순 통합 홈
- `src/pages/[game]/releases/`: 작품별 릴리즈 목록과 상세 화면
- `src/pages/[game]/patch-guide.astro`: 작품별 패치 준비·적용·검증 가이드
- `src/pages/[game]/catalog/`: 작품별 캐릭터·장비·아이템·클래스·스킬 목록
- `src/`: Astro 기반 배포·공략·카탈로그·상세 화면
- `public/downloads/`: 검증 후 복사된 현재 배포 파일
- `astro.config.mjs`: GitHub Pages 하위 경로를 지원하는 정적 빌드 설정
- `.github/workflows/deploy-pages.yml`: GitHub Pages 자동 배포
- `content/`: 두 작품의 Markdown 공략과 정규화 데이터
- `research/`: 출처 목록, 수집 색인, 국내 명칭 검수 큐
- `scripts/`: 장별 문서 생성, 출처 색인 수집, 콘텐츠 검증 도구
- `docs/implementation-plan.md`: 단계별 실행 계획과 완료 조건

## 공략 데이터 작업

```powershell
npm run content:import-chapters
npm run content:generate-pilot
npm run terminology:extract
npm run patches:import
npm run release:sync
npm run research:crawl
npm run research:validate
npm run content:validate
```

`patches:import`는 `D:\dev\tear-ring-saga-korean`, `D:\dev\berwick-saga-kor-patch`에서 명칭 데이터를 가져옵니다. `release:sync`는 아래 두 공개 저장소의 GitHub Release API만 읽어 릴리즈 데이터를 갱신합니다.

- `ss-park-0930/tearing-saga-release`
- `ss-park-0930/berwick-saga-release`

공개된 GitHub Release가 없으면 사이트에도 임의 버전이나 로컬 파일을 표시하지 않습니다. 수집기는 허용된 출처의 색인 정보만 저장하며 온라인 공략 본문을 복제하지 않습니다. 국내 잡지 스캔은 한국어 명칭 검수에만 사용하고 공개 결과물에는 포함하지 않습니다.

## 배포하기

1. GitHub 저장소의 기본 브랜치를 `main`으로 설정합니다.
2. 저장소의 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택합니다.
3. `main` 브랜치에 푸시하면 Astro가 기존 배포 페이지와 공략 화면을 함께 빌드해 자동 배포합니다.
4. 배포 작업은 15분마다 두 패치 저장소의 공개 GitHub Release를 다시 확인합니다.

커스텀 도메인은 저장소의 **Settings → Pages → Custom domain**에서 사이트가 먼저 배포된 후 설정합니다.
커스텀 도메인을 연결할 때는 `SITE_URL`, `BASE_PATH`, `CNAME`도 함께 해당 도메인 기준으로 변경합니다.

## 현재 배포 상태

릴리즈 목록, 상세 정보, 배포일, 릴리즈 노트와 첨부 파일은 GitHub Release에서 자동으로 가져옵니다. 현재 두 배포 저장소에 공개 Release가 없으므로 사이트에는 빈 상태가 표시됩니다.

패치 제작자는 `비누나무(soaptree)`이며, 버그 제보와 패치 관련 문의는 이메일
`soaptree45@gmail.com`으로 받습니다.

## 주요 화면

- `/`: 두 작품의 최신 릴리즈와 패치 가이드로 이동
- `/trs1/releases/`: 티어링 사가 릴리즈 목록
- `/trs1/releases/<release>/`: 티어링 사가 릴리즈 상세
- `/trs1/patch-guide/`: 티어링 사가 패치 가이드
- `/trs2/releases/`: 베르위크 사가 릴리즈 목록
- `/trs2/releases/<release>/`: 베르위크 사가 릴리즈 상세
- `/trs2/patch-guide/`: 베르위크 사가 패치 가이드

게임 본편, 디스크 이미지, BIOS 등 저작권이 있는 원본 데이터는 저장소와 배포 파일에 포함하지 않습니다.
