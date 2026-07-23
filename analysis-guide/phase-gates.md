# 단계별 Definition of Done

[상위 가이드로 돌아가기](../ANALYSIS_GUIDE.md)

각 단계는 산출물과 자동 검증이 모두 통과해야 완료된다. 일부 기능만 작업할 때는 필요한 단계까지만 적용하되 선행 단계는 건너뛰지 않는다.

프로젝트 진행표의 Phase 상태는 `not_started`, `in_progress`, `blocked`, `passed`를 사용한다. `passed`는 해당 Phase의 모든 필수 항목과 통과 명령이 성공한 경우에만 부여한다. `blocked`에는 원인, 담당자 또는 필요한 입력과 다음 재시도 조건을 기록한다. 후속 변경으로 통과 조건이 깨지면 즉시 `in_progress` 또는 `blocked`로 되돌린다.

## Phase 0. Bootstrap

목표: 새 PC에서 프로젝트를 안전하게 열 수 있다.

- `manifest.json`, `toolchain.lock.json`, `.gitignore`, `plan/INDEX.md`와 디렉터리 구조가 존재한다.
- Python lock 파일로 환경을 재현할 수 있다.
- `doctor`가 모든 디스크·의존성의 accepted hash와 필수 도구를 확인한다.
- BIN, CUE, ISO, 참조 패치와 추출 바이너리는 작업 PC에만 있고 Git에 없다. 정규화 원문·token은 private Git 정책에 따라 추적한다.
- schema 지원 범위와 migration 명령이 존재한다.

통과 명령:

```bash
python -m patchtool doctor
python -m patchtool validate-config
```

## Phase 1. Inventory

목표: 분석 대상과 디스크 구조를 식별한다.

- 모든 디스크 descriptor, track, 실행 파일과 주요 컨테이너의 크기·해시·LBA를 기록한다.
- dependency 적용 그래프, 순서, 입력·출력 hash를 검증한다.
- Ghidra 로더, 언어, 이미지 베이스와 주요 모듈을 기록한다.
- `analytics/result/INDEX.md`와 대상 식별 문서가 존재한다.
- 원본과 참조 패치본의 변경 파일·구간 목록을 생성한다.

## Phase 2. Vertical Slice

목표: 번역 한 문장을 실제 게임에 표시하는 전체 경로를 증명한다.

- 한 블록의 전체 container chain을 추출하고 변경 없이 재삽입했을 때 원본과 바이트 또는 승인된 의미 수준에서 동일하다.
- 한 문장을 한국어로 교체하고 필요한 글리프를 삽입한다.
- 구조화 token과 control skeleton, 줄/페이지, 폰트, 압축, padding, tail과 슬롯 크기를 보존한다.
- 생성된 patch plan의 write-set, 원본 사전조건과 필요한 PS1 EDC/ECC를 검증한다.
- 에뮬레이터에서 표시, 진행, 저장·로드가 정상임을 확인한다.
- 실패 시 원본으로 되돌릴 수 있는 빌드 경로가 있다.

이 단계가 완료되기 전에는 대량 번역을 시작하지 않는다.

## Phase 3. Extraction And Rebuild

목표: 전체 대상 데이터를 결정적으로 처리한다.

- 모든 대상 block JSONL을 원본 디스크에서 추출하고 container chain과 write region을 기록한다.
- `extract --check`가 재추출 결과와 추적된 JSONL의 바이트 일치를 확인한다.
- 파서·인코더·압축기·폰트 도구에 단위 및 왕복 테스트가 있다.
- 알 수 없는 제어 코드는 `opaque` token, 해석되지 않은 패치 위치는 UNKNOWN write region으로 보고된다.
- 판본별 위치 차이는 `disk_id`와 설정으로 분리된다.

통과 명령:

```bash
python -m patchtool extract --check
python -m patchtool test
```

## Phase 4. Translation Preparation

목표: 번역 기준과 사람 검수 구조를 확정한다.

- 전체 원문 분석을 바탕으로 glossary와 characters를 작성하고 scene/battle/menu/system/graphic/name_table domain을 분류한다.
- 모든 화자·대상의 표시 term이 glossary에 있다.
- 반복 문장을 `shared_sentences.yml`에 정리한다.
- domain별 YAML/JSONL이 모든 번역 대상 line을 정확히 한 번 참조하거나 제외 사유를 가진다.
- term, variable, 일반 번역의 token 컴파일, 고급 token 입력, control skeleton과 preview 검증이 통과한다.
- `src/config/fonts.yml`의 font profile과 glyph budget이 확정된다.

## Phase 5. Translation Complete

목표: 패치에 사용할 번역이 승인된다.

- 범위 내 모든 문장이 `approved`이거나 명시적으로 제외된다.
- `blocked`, 미정 term, 허용되지 않은 `opaque` token과 unresolved note가 없다.
- 말투에 영향을 주는 대사의 화자·복수 대상 귀속 검수가 끝났다. 그 외 미확정 화자는 unknown term과 귀속 상태가 명시된다.
- 렌더 폭, 줄 수, 인코딩 바이트와 압축 슬롯 예산을 통과한다.
- 검수자와 승인 시각이 기록되어 있다.

## Phase 6. Integration Build

목표: 검증된 원본에서 한국어 이미지를 결정적으로 만든다.

- 빌드는 원본을 직접 수정하지 않고 새 출력 이미지를 만든다.
- 같은 입력·toolchain profile에서 출력 해시가 동일하거나 승인된 비결정 영역을 정규화한 의미 hash가 동일하다.
- 모든 디스크와 의존성 해시를 빌드 직전에 다시 확인한다.
- 모든 write operation의 쓰기 전 hash가 일치하고 overlap이 없거나 승인된 해결 규칙이 있다.
- 실제 diff가 write-set allowlist 안에 있고 padding, tail과 sector integrity 정책을 통과한다.
- 빌드 보고서에 입력·출력 해시, owner별 변경 구간, 용량과 최대 budget 사용률이 있다.

## Phase 7. Runtime QA

목표: 대표 기능과 위험 구간을 실제 실행으로 검증한다.

- [runtime-matrix.sample.yml](samples/runtime-matrix.sample.yml)을 바탕으로 만든 `tests/runtime-matrix.yml`의 필수 사례를 모두 실행하고 정적 대상 100% 검증 지표를 기록한다.
- 변경된 모든 domain/renderer/font profile, 위험 상위 unit, 부팅, 메뉴, 전투, 저장·로드와 디스크 교체를 검증한다.
- 각 사례에 디스크 ID, 저장 상태, 진입 절차, 기대 결과와 실제 결과가 있다.
- 크래시, 글자 깨짐, 줄 넘침과 진행 불가 이슈가 없다.
- 미실행 항목은 릴리스 차단 여부와 이유가 기록되어 있다.

각 실행 사례의 `result`는 `not_run`, `passed`, `failed`, `blocked`, `skipped` 중 하나다. `skipped`는 해당 플랫폼·판본에 적용되지 않거나 승인된 제외 사유가 있을 때만 사용하고 `skip_reason`을 필수로 기록한다. `blocked`와 `failed`인 필수 사례가 하나라도 있으면 Phase 7은 `passed`가 될 수 없다.

## Phase 8. Release

목표: 사용자가 검증된 원본에 적용할 배포 패치를 만든다.

- 원본 accepted hash가 비어 있지 않고 실제 입력과 일치한다.
- dependency와 manifest patch adapter로 복원한 이미지가 integration build 이미지와 SHA-256이 같다.
- 모든 디스크 패치, README, 선택 코드와 `SHA256SUMS.txt`를 검증한다.
- manifest, 파일명, 문서와 릴리스 노트의 버전이 같다.
- ZIP 내부 파일 수, 이름, UTF-8 경로와 체크섬이 일치한다.
- 원본 BIN, CUE, ISO, 전체 원문 corpus와 저작권 바이너리가 배포물에 없다.
- PPF/raw sector 프로젝트는 EDC/ECC와 적용 전 byte 검증 결과가 있다.

## 표준 CLI 계약

프로젝트 도구 이름은 달라도 다음 역할을 제공한다.

```text
doctor             환경, 도구, 디스크와 의존성 검증
extract            원본 디스크에서 block JSONL 추출
extract --check    추적된 block JSONL 재현성 확인
validate           schema, 참조, 토큰, 번역과 용량 검증
build              새 한국어 이미지 생성
verify             출력 diff, 해시와 왕복 검증
test               단위·왕복·fixture 테스트
release            패치와 배포 ZIP 생성
migrate            schema version 명시적 변환과 semantic diff
plan check         work plan, step, 진행률과 INDEX 검증
```

각 명령은 성공 시 0, 실패 시 0이 아닌 종료 코드를 반환하고 사람이 읽는 요약과 `build/reports/`의 schema 검증된 JSON 보고서를 함께 생성한다. 세부 계약은 [품질, 보안과 작업 계획](quality-operations.md)을 따른다.
