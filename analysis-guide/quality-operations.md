# 품질, 보안과 작업 계획

[상위 가이드로 돌아가기](../ANALYSIS_GUIDE.md)

## 정량 QA Coverage

런타임 QA는 막연한 “대표 장면”이 아니라 위험과 변경 범위를 기준으로 계획한다. `tests/runtime-matrix.yml`의 각 case에는 다음 dimension을 기록한다.

- `domains`: scene, battle, menu, system, graphic, name_table
- `renderers`: 대화창 종류, HUD, 메뉴, 이미지와 폰트 profile
- `features`: line/page break, 변수, control opcode, 저장/로드, 디스크 교체
- `risks`: 최대 폭, 최대 glyph, 최대 압축 사용률, shared resource와 relocation
- `covered_units`, `covered_write_regions`
- emulator 이름·버전·설정 profile

정적 검증은 변경된 모든 unit과 write region을 100% 검사한다. 런타임 검증은 모든 renderer/domain 조합을 최소 한 번 포함하고, 위험 상위 항목과 사용자 진행을 막을 수 있는 기능을 필수 case로 둔다. 전체 대사의 화면 확인이 불가능하면 미검수 범위와 표본 선정 규칙을 release note에 공개한다.

필수 정적 지표:

- translation unit 총수와 상태별 수
- token/control/opaque 검증 수와 실패 수
- glyph coverage와 누락 수
- render width, line/page, byte, compressed slot budget의 최대 사용률
- write region 수, overlap 수, diff allowlist 이탈 수
- 디스크·dependency·출력 hash 검증 결과

필수 런타임 범위:

- 부팅과 새 게임/로드
- 변경된 모든 renderer와 font profile
- 최대 폭·줄·페이지·glyph·slot 사용 unit
- 메뉴 진입/복귀, 전투, 이벤트 진행과 저장/로드
- 다중 디스크의 교체와 디스크 간 save 연속성
- 지원 emulator profile별 smoke test

실기 검증은 프로젝트가 지원한다고 선언한 경우 별도 profile로 기록하며, 수행하지 않았다면 emulator 검증을 실기 검증으로 표현하지 않는다.

## 표준 보고서 계약

`doctor`, `extract`, `validate`, `build`, `verify`, `test`, `release`는 사람이 읽는 출력과 함께 `build/reports/<command>.json`을 생성한다.

공통 필드:

```json
{
  "schema_version": 1,
  "command": "verify",
  "status": "passed",
  "started_at": "2026-07-16T20:00:00+09:00",
  "finished_at": "2026-07-16T20:01:00+09:00",
  "toolchain_profile": "windows-x86_64",
  "inputs": [],
  "checks": [],
  "metrics": {},
  "artifacts": [],
  "warnings": [],
  "errors": []
}
```

`status`는 `passed`, `failed`, `blocked`만 사용한다. warning이 release 허용인지 check별 `release_blocking`으로 표시한다. 보고서 schema와 [command-report.sample.json](samples/command-report.sample.json)은 Git으로 관리하고 생성 시 schema validation을 수행한다.

## Schema Version과 Migration

모든 기계 판독 파일은 `schema_version`을 가진다. 프로젝트는 `src/config/schemas/`에 지원 schema를 두고 다음 정책을 따른다.

- reader가 지원하는 최소·최대 version을 명시한다.
- 알 수 없는 미래 version은 읽거나 자동 수정하지 않는다.
- migration은 `python -m patchtool migrate --from N --to M`처럼 명시적으로 실행한다.
- migration 전 backup 또는 clean Git 상태를 확인하고 변경 파일 목록을 출력한다.
- migration 후 semantic diff와 `validate`를 실행한다.
- ID 삭제·재사용과 token 의미 변경은 금지하며 mapping을 남긴다.
- schema 변경, migration 코드와 sample 변경은 하나의 commit/PR에서 함께 검증한다.

## Toolchain Profile

`toolchain.lock.json`은 버전 문자열만 기록하지 않고 실행 환경을 profile별로 고정한다.

- OS, version, architecture와 locale
- Python executable/version, dependency lock hash
- Java vendor/version
- Ghidra archive/hash, processor module, loader와 analysis option hash
- xdelta/PPF/custom tool executable hash
- font rasterizer와 image library version
- emulator build/hash와 설정 profile hash
- 프로젝트 분석·빌드 script Git commit

로컬 경로는 lock에 넣지 않고 environment variable 또는 Git 제외 local config로 연결한다. `doctor`는 현재 profile과 lock의 version·hash·capability를 비교한다.

## 알 수 없는 실행 파일 안전 규칙

기존 번역 패치 EXE나 출처 불명 도구는 신뢰하지 않는다.

1. 파일 hash, 입수 경로와 시각을 기록한다.
2. PE header, resource, overlay와 문자열을 정적으로 먼저 조사한다.
3. patch stream을 직접 parser로 추출할 수 있으면 EXE를 실행하지 않는다.
4. 실행이 꼭 필요하면 snapshot 가능한 격리 VM을 사용한다.
5. VM 네트워크는 기본 차단하고 host 공유 폴더, clipboard와 credential 접근을 끈다.
6. 원본 디스크는 복사본만 VM에 제공하고 실행 전후 filesystem/process/network 변화를 기록한다.
7. 실행 후 snapshot을 폐기하고 생성된 결과는 hash와 diff로만 검증한다.

Agent는 unknown EXE를 host에서 직접 실행하거나 보안 프로그램 예외를 임의로 추가하지 않는다.

## Work Plan 디렉터리

프로젝트 진행 계획은 루트 `plan/`에서 관리한다. 이는 `build/patch-plan/`의 바이트 쓰기 작업과 전혀 다른 개념이다.

```text
plan/
|-- INDEX.md
|-- plan-bootstrap.yml
|-- plan-text-pipeline.yml
|-- plan-font-pipeline.yml
`-- plan-release.yml
```

`plan/INDEX.md`는 모든 plan의 링크, 상태, 진행률, 현재 step, owner, 갱신 시각과 요약을 담는다. plan 파일이 추가·변경되면 INDEX를 같은 변경에서 갱신한다. `python -m patchtool plan check`는 누락 plan, 상태·진척률 불일치와 끊어진 evidence 링크를 검사한다.

### Plan 상태

- `not_started`: 시작 전, progress 0
- `in_progress`: 하나 이상의 step 진행 중
- `blocked`: 외부 입력이나 미해결 문제로 진행 불가
- `completed`: 필수 step과 acceptance criteria 완료, progress 100
- `cancelled`: 더 진행하지 않기로 결정
- `superseded`: 다른 plan으로 대체됨

### Step 상태

- `not_started`
- `in_progress`
- `blocked`
- `completed`
- `skipped`: 필수가 아니며 승인된 사유가 있음

각 step은 `id`, `title`, `status`, `progress`, `weight`, `depends_on`, `acceptance_criteria`, `evidence`, `blockers`, `started_at`, `updated_at`, `completed_at`을 가진다. 필수 step의 `skipped`는 허용하지 않는다.

plan progress는 step의 `weight * progress` 합을 weight 합으로 나눈 정수다. 사람이 plan progress만 임의로 고치지 않는다. `completed` step은 100, `not_started`는 0이어야 한다. `blocked`는 마지막 실제 progress를 유지한다.

plan sample은 [plan/INDEX.md](samples/plan/INDEX.md)와 [plan/plan-text-pipeline.yml](samples/plan/plan-text-pipeline.yml)을 참고한다.

## 인계와 현재 상태

새 Agent나 작업자는 먼저 `plan/INDEX.md`에서 현재 `in_progress` 또는 `blocked` plan을 찾고, 연결된 step의 evidence와 `analytics/result` 문서를 읽는다. 장문의 continuation 문서 한 곳에 오래된 가설과 최신 사실을 계속 추가하지 않는다.

각 작업 종료 시 다음을 갱신한다.

- 해당 plan/step 상태와 progress
- 마지막 실행 명령과 결과 report
- 생성·수정 파일
- 연결된 analytics result 및 evidence
- blocker와 다음 재시도 조건
- 다음 실행 가능한 step

분석 결론이 바뀌면 `analytics/result`에서 `SUPERSEDED` 처리하고 plan에는 현재 유효한 결론 링크만 유지한다.
