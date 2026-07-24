# 버그 제보 Worker 설정

방문자 버그 제보 폼(`/report/`)의 백엔드입니다. Turnstile 검증 → IP당 rate limit →
R2 첨부 업로드 → GitHub Issue 생성을 Cloudflare Worker 하나가 처리합니다.

- **폼**: `src/pages/report.astro` (사이트에 포함, GitHub Pages 배포)
- **Worker**: 이 디렉터리 (`worker.js`, `wrangler.toml`) — Cloudflare에 별도 배포
- **Issue 저장소**: 작품별 릴리즈 저장소로 라우팅
  - 티어링 사가 → `ss-park-0930/tearing-saga-release`
  - 베르위크 사가 → `ss-park-0930/berwick-saga-release`

---

## 1. Turnstile 사이트 등록

1. Cloudflare 대시보드 → Turnstile → Add site.
2. 도메인에 **`ts.soaptree.dev`** 추가 (로컬 테스트용 `localhost`도 함께).
3. 발급되는 두 키의 용도:
   - **Site Key** (공개) → 폼에서 사용. 아래 4단계 `PUBLIC_TURNSTILE_SITEKEY`.
   - **Secret Key** (비밀) → Worker secret `TURNSTILE_SECRET`.

## 2. R2 버킷

```sh
wrangler r2 bucket create ts-series
```

- 대시보드에서 이 버킷에 **공개 접근용 커스텀 도메인**(또는 r2.dev 공개 URL)을 연결하고,
  그 베이스 URL을 `wrangler.toml`의 `R2_PUBLIC_BASE`에 넣습니다. (끝 슬래시 없이)
- 처리 완료 첨부 자동 삭제를 원하면 버킷에 **lifecycle 규칙**(예: 90일 후 삭제)을 추가합니다.

## 3. KV 네임스페이스 (rate limit)

```sh
wrangler kv namespace create RATE_LIMIT
```

출력된 `id`를 `wrangler.toml`의 `[[kv_namespaces]]` → `id`에 채웁니다.

## 4. GitHub 토큰 (fine-grained PAT)

- **Resource owner**: `ss-park-0930`
- **Repository access**: **두 릴리즈 저장소만** 선택
  (`tearing-saga-release`, `berwick-saga-release`). 소스 저장소는 넣지 마세요.
- **Permissions**: `Issues` → **Read and write** 하나만. 그 외 전부 No access.
- 발급된 토큰을 Worker secret `GH_TOKEN`으로 등록합니다.

> 두 저장소는 라벨 `triage`, `user-report`가 있어야 합니다. 없으면 Issue 생성은 되지만
> 라벨이 자동으로 만들어지지는 않으니, 각 저장소 Labels에서 미리 두 개를 만들어 두세요.

## 5. Secret 등록 + 배포

```sh
cd worker
wrangler secret put TURNSTILE_SECRET   # Turnstile Secret Key
wrangler secret put GH_TOKEN           # fine-grained PAT
wrangler deploy
```

배포 후 Worker URL(예: `https://trs-bug-report.<계정>.workers.dev`)을 확인합니다.
커스텀 도메인 라우트를 붙여도 됩니다.

## 6. 폼에 Worker 연결 (Pages 빌드 환경변수)

폼은 빌드 시점에 아래 **공개** 환경변수(`PUBLIC_` 접두)를 읽습니다. 값이 비면 폼은
비활성 상태로 렌더되고 이메일 안내만 표시합니다. `.github/workflows/deploy-pages.yml`의
빌드 스텝 `env:`에 추가하세요.

| 변수 | 값 |
|---|---|
| `PUBLIC_REPORT_ENDPOINT` | 5단계의 Worker URL |
| `PUBLIC_TURNSTILE_SITEKEY` | 1단계의 Site Key |

두 값 모두 비밀이 아니므로 워크플로에 평문으로 두거나 저장소 변수로 관리해도 됩니다.

로컬 개발은 프로젝트 루트에 `.env`:

```
PUBLIC_REPORT_ENDPOINT=http://127.0.0.1:8787
PUBLIC_TURNSTILE_SITEKEY=<Turnstile 테스트 site key>
```

`wrangler dev`로 Worker를, `npm run dev`로 사이트를 띄워 시험합니다.

---

## 다층 스팸 방어

1. **Turnstile** — 자동화 봇 1차 차단.
2. **Honeypot** (`website` 숨김 필드) — 순진한 봇을 조용히 드롭(성공처럼 응답).
3. **Rate limit** — IP당 시간당 10건 (KV, TTL 1시간).
4. **`triage` 라벨 + 사람 검토** — 사람 스팸/장난 제보를 팀이 최종 필터.

## 설정 값 요약

| 종류 | 이름 | 위치 |
|---|---|---|
| var | `ALLOWED_ORIGIN` | `wrangler.toml` |
| var | `R2_PUBLIC_BASE` | `wrangler.toml` |
| var | `GH_REPO_TRS1` / `GH_REPO_TRS2` | `wrangler.toml` |
| binding | `BUCKET` (R2) | `wrangler.toml` |
| binding | `RATE_LIMIT` (KV) | `wrangler.toml` |
| secret | `TURNSTILE_SECRET` | `wrangler secret put` |
| secret | `GH_TOKEN` | `wrangler secret put` |
| public build var | `PUBLIC_REPORT_ENDPOINT` | Pages 워크플로 |
| public build var | `PUBLIC_TURNSTILE_SITEKEY` | Pages 워크플로 |
