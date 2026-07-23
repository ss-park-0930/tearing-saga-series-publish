# 프로젝트 구조와 초기 설정

[상위 가이드로 돌아가기](../ANALYSIS_GUIDE.md)

## 프로젝트 디렉터리 권장 구조

디렉터리는 다음 세 가지 성격을 분리한다.

- `disc/`: 원본 및 비교용 디스크 이미지
- `analytics/`: 리버스 엔지니어링 과정, 도구, 임시 파일과 분석 결과
- `src/`: 실제 패치를 재현하는 데 필요한 소스, 번역, 리소스와 도구

```text
project/
|-- README.md                  # 프로젝트 개요, 준비물과 빌드/적용 방법
|-- manifest.json              # 버전, 대상 이미지, 폰트와 경로 설정
|-- disc/
|   |-- original/              # 원본 BIN/CUE/ISO 등, 저장소 제외
|   `-- reference/             # 기존 번역 패치 적용본 등, 저장소 제외
|-- analytics/
|   |-- result/
|   |   |-- INDEX.md           # 결과 문서 목차, 상태, 갱신 시각과 요약
|   |   |-- disc/              # 이미지 구조, 파일 배치와 LBA 매핑
|   |   |-- executable/        # 함수, 전역 데이터와 실행 파일 분석
|   |   |-- formats/           # 확인된 파일/스크립트 포맷 명세
|   |   |-- runtime/           # 에뮬레이터에서 확인한 실행 흐름
|   |   `-- patch/             # 패치 가능 영역, 제약과 적용 전략
|   |-- tools/
|   |   |-- agent/
|   |   |   |-- ghidra.py      # PyGhidra 질의 어댑터
|   |   |   |-- duckstation_gdb.py
|   |   |   |-- pcsx2_pine.py
|   |   |   |-- binary.py      # 헥스, 해시와 바이트 차이 분석
|   |   |   `-- common.py      # JSON 출력, 로깅과 공통 안전장치
|   |   |-- ghidra/            # analyzeHeadless용 GhidraScript
|   |   `-- disc/              # 파일 목록, 추출 및 LBA 조사 도구
|   `-- temp/
|       |-- ghidra-projects/   # 재생성 가능한 Ghidra 프로젝트
|       |-- exports/
|       |   `-- ghidra/        # 함수, 참조, 문자열과 디컴파일 원시 출력
|       |-- emulator/
|       |   |-- duckstation/   # 세션 로그, 저장 상태와 메모리 덤프
|       |   |-- pcsx2/         # 세션 로그, 저장 상태와 메모리 덤프
|       |   `-- symbols/       # 생성된 .sym 등 중간 심볼 파일
|       |-- reference/
|       |   |-- crawl/         # 크롤링한 HTML, JSON과 원문 자료
|       |   `-- downloads/     # 사이트에서 받은 이미지, 문서와 파일
|       |-- translation/
|       |   `-- raw/           # 정규화 전 추출물과 원시 중간 파일
|       |-- diff/              # 원본/패치본의 원시 비교 결과
|       |-- binaries/          # 분석 중 생성된 바이너리와 바이너리 조각
|       `-- extracted/         # 분석용 임시 추출 파일
|-- src/
|   |-- tools/                 # 최종 패치 생성에 실제 사용하는 도구
|   |-- reference/
|   |   |-- index.yml          # 정리 자료 ID와 출처 색인
|   |   |-- terminology/       # 세계관, 고유명사와 용어 조사
|   |   |-- characters/        # 캐릭터, 관계와 말투 조사
|   |   `-- lore/              # 설정, 사건과 배경 자료
|   |-- translate/
|   |   |-- glossary.yml       # ID 기반 공통 단어 사전
|   |   |-- characters.yml     # ID 기반 캐릭터 및 말투 분석
|   |   |-- shared_sentences.yml # 반복 문장과 공통 번역
|   |   |-- original/          # private Git으로 추적하는 정규화 원문·token
|   |   |-- block/             # 추적되는 권위 패치 매핑 JSONL
|   |   |-- scene/             # 장면별 YAML 번역과 블록 연결
|   |   |-- battle/            # 전투 대사와 전투 UI
|   |   |-- system/            # 시스템 메시지와 공통 문자열
|   |   |-- menu/              # 메뉴, 아이템, 스킬 등
|   |   |-- graphic/           # 이미지에 포함된 문자열
|   |   `-- name_table/        # 인명, 지명과 도감 표
|   |-- assets/
|   |   |-- font/              # 한글 글리프, 문자표와 폭 정보
|   |   `-- graphics/          # 번역된 이미지 및 UI 리소스
|   |-- patch/                 # 어셈블리, 코드 훅과 바이트 패치 정의
|   `-- config/                # 판본별 주소, 빌드 설정과 매핑
|       |-- fonts.yml          # 재현 가능한 폰트 변환 profile
|       |-- control_codes.yml  # 게임별 제어 코드 정의
|       `-- schemas/           # JSON/YAML/JSONL schema와 migration
|-- tests/                     # 파서, 재빌더와 패치 검증 테스트
|   |-- fixtures/              # 저작권 문제가 없는 최소 합성 fixture
|   `-- runtime-matrix.yml     # 에뮬레이터 실행 검증 사례와 결과
|-- plan/
|   |-- INDEX.md               # 전체 work plan 상태와 진행률
|   `-- plan-*.yml             # 단계·진척률·근거가 있는 개별 계획
|-- toolchain.lock.json        # 실제 검증한 도구와 런타임 버전
|-- THIRD_PARTY.yml            # 폰트, 코드와 외부 자산의 출처·라이선스
|-- docs/
|   |-- SETUP.md               # Python, xdelta3와 선택 분석 도구 설치
|   |-- BUILD.md               # 추출, 빌드와 검증 명령
|   |-- TRANSLATION.md         # 번역 데이터 편집 및 검수 절차
|   |-- DEBUGGING.md           # Ghidra와 에뮬레이터 디버깅 절차
|   `-- RELEASE.md             # 배포 생성, 왕복 검증과 체크섬
|-- temp/                      # 전체 작업에서 사용하는 일반 임시 파일
|-- build/                     # 재생성 가능한 빌드 중간 결과
|   |-- compiled-translations/ # domain 입력에서 생성한 canonical 번역 token
|   |-- compiled-blocks/       # 원본 block과 번역 token을 결합한 결과
|   |-- patch-plan/            # 실제 byte write operation JSONL
|   `-- reports/               # doctor/build/verify 등 JSON 보고서
`-- release/                   # 최종 배포 패치, 적용 안내와 체크섬
```

### 디렉터리 운영 규칙

- 이 문서에서 **원본 게임 데이터**는 사용자가 정품 매체에서 준비한 BIN, CUE, ISO 및 이에 준하는 전체 디스크 이미지를 뜻한다. 번역 작업용 원문 문자열과 구조화된 패치 메타데이터는 이에 포함하지 않는다.
- 원본 이미지는 작업 PC의 `disc/original/<platform>/<edition>/`에 있어야 하지만 Git, 소스 아카이브와 배포물에는 포함하지 않는다.
- 기존 번역 패치처럼 비교 목적으로만 사용하는 이미지는 `disc/reference/`에 둔다.
- 웹사이트 크롤링 원문, 내려받은 문서, 이미지와 JSON 응답은 `analytics/temp/reference/`에 둔다.
- 크롤링 자료를 읽고 출처와 함께 요약·정리한 프로젝트 지식만 `src/reference/`에 둔다.
- 정규화 전 원문 dump와 추출 중간 파일은 `analytics/temp/translation/raw/`에 둔다. 정규화된 원문 문자열과 구조화 token은 `src/translate/original/` 및 block/domain 파일에 저장하고 private Git으로 추적한다. 원본 디스크와 추출 바이너리는 Git에 포함하지 않는다.
- Ghidra 프로젝트 데이터베이스는 크고 재생성 가능하므로 기본적으로 `analytics/temp/ghidra-projects/`에 둔다.
- Ghidra에서 내보낸 원시 함수, 문자열, 참조와 디컴파일 결과는 `analytics/temp/exports/ghidra/`에 둔다.
- `analytics/result/`에는 원시 수집물이 아니라 사람이 검토했거나 AI가 상태를 표시해 정리한 지식만 둔다.
- Agent가 사용하는 Ghidra, DuckStation, PCSX2 및 바이너리 분석 어댑터는 `analytics/tools/agent/`에 둔다.
- Ghidra Java/Python 스크립트는 `analytics/tools/ghidra/`, 디스크 조사 도구는 `analytics/tools/disc/`에 둔다.
- 포맷 조사 및 일회성 비교 도구는 `analytics/tools/`, 최종 패치 빌드에 필요한 도구는 `src/tools/`에 둔다.
- 조사 도구가 최종 빌드에 필요해지면 복사본을 만들기보다 `src/tools/`로 이동하고 테스트를 추가한다.
- 번역 파일은 `scene`, `battle`, `system`, `menu`, `graphic`, `name_table` 등 domain별로 분리한다. 각 domain의 사람이 편집하는 파일이 해당 번역의 권위 데이터다.
- 공통 단어 사전은 `src/translate/glossary.yml`, 캐릭터와 관계별 말투 분석은 `src/translate/characters.yml`에 둔다.
- 반복 대사, 시스템 안내와 획득 문장은 범용 이름인 `src/translate/shared_sentences.yml`에서 관리한다.
- `src/translate/block/*.jsonl`은 원본 디스크에서 추출한 container chain, 항목 순서, 구조화 token, resource와 write region을 보존하는 권위 매핑이다. 추출 도구가 생성하고 private Git으로 관리하며 사람이 직접 수정하지 않는다.
- 빌드는 domain의 `translation`을 `build/compiled-translations/`의 token으로 컴파일하고 block과 결합한 뒤 `build/patch-plan/`에 실제 byte write operation을 생성한다. 깨끗한 clone에서는 검증된 로컬 원본으로 block을 재추출해 canonical 결과를 비교할 수 있어야 한다.
- 프로젝트 작업 진행은 `plan/`, 실제 byte 쓰기 계획은 `build/patch-plan/`에 두며 두 종류의 plan을 혼용하지 않는다.
- `analytics/temp/`는 Ghidra 프로젝트와 분석 중간 파일 전용으로 사용한다.
- 에뮬레이터 저장 상태, 메모리 덤프, 스크린샷, 세션 JSONL과 생성 심볼은 `analytics/temp/emulator/`에 둔다.
- 원본/패치본 비교의 원시 출력은 `analytics/temp/diff/`, 추출되거나 생성된 바이너리는 `analytics/temp/binaries/` 또는 `analytics/temp/extracted/`에 둔다.
- 검토 후 알게 된 사실, 관찰, 유력한 해석, 가설, 미확인 사항과 대체된 과거 결론만 `analytics/result/`의 주제별 Markdown에 기록한다. 구조화된 표가 꼭 필요할 때만 보조 JSON 또는 CSV를 둔다.
- 루트 `temp/`는 패치 빌드, 변환 도구와 기타 일반 작업의 임시 파일에 사용한다.
- `build/`는 언제든 삭제하고 다시 만들 수 있어야 한다. `release/`에는 사용자에게 전달할 패치, 적용 안내와 체크섬만 둔다.

### `analytics/result` 기록 규칙

`analytics/result/`는 Git으로 공유할 분석 지식 저장소다. 별도의 전역 finding ID를 강제하지 않고 **안정적인 파일 경로와 문서 내부 anchor**를 기록 식별자로 사용한다. 분석 세션마다 파일을 만들지 말고 `runtime/battle-package-loading.md`처럼 하나의 기능 또는 분석 주제를 한 파일에서 누적 관리한다. 파일명은 소문자 ASCII `kebab-case`로 만들고 참조된 뒤에는 가급적 변경하지 않는다.

`analytics/result/INDEX.md`는 모든 결과 문서의 목차다. 각 행에는 문서 링크, 문서 상태, 마지막 갱신 시각과 한두 문장의 요약을 기록한다. 문서 안에는 여러 증거 상태가 섞일 수 있으므로 문서 상태와 발견의 증거 상태를 혼용하지 않는다.

```markdown
# Analysis Results Index

마지막 갱신: 2026-07-16T21:30:00+09:00

| 문서 | 문서 상태 | 갱신 시각 | 요약 |
|---|---|---|---|
| [LBA 매핑](disc/lba-mapping.md) | stable | 2026-07-16T20:10:00+09:00 | 파일 오프셋과 디스크 LBA 변환식 |
| [배틀 패키지 로딩](runtime/battle-package-loading.md) | active | 2026-07-16T21:30:00+09:00 | 디스크에서 RAM까지의 로딩 경로 |
```

각 결과 문서는 YAML front matter로 문서 상태와 시간을 기록한다.

```markdown
---
title: 배틀 패키지 로딩
schema_version: 1
document_status: active
created_at: 2026-07-10T19:20:00+09:00
updated_at: 2026-07-16T21:30:00+09:00
platform: ps2
subjects: [disc-loading, battle-package]
related:
  - ../disc/lba-mapping.md
---
```

문서 상태는 `draft`(구조화 전), `active`(분석 진행 중), `stable`(현재 목표 범위에서 검증 완료), `superseded`(문서 전체가 다른 문서로 대체됨)를 사용한다. `stable` 문서에도 개별 `UNKNOWN`이 남을 수 있지만 문서 상단에 범위와 남은 미확인 항목을 명시해야 한다.

문서 안의 각 결론은 `[FACT]`, `[OBSERVED]`, `[LIKELY]`, `[HYPOTHESIS]`, `[UNKNOWN]`, `[SUPERSEDED]` 중 하나의 상태와 `recorded_at`을 가진다. 런타임 관찰은 필요에 따라 `observed_at`, 원시 수집물은 `captured_at`, 대체된 결론은 `superseded_at`도 기록한다. 모든 시간은 타임존을 포함한 ISO 8601 형식을 사용한다.

```markdown
<a id="disc-read-function"></a>
### [FACT] 디스크 읽기 함수

- recorded_at: `2026-07-15T23:10:00+09:00`
- 대상: `MAIN.ELF`, SHA-256 `...`
- 주소: `VA:0x0012A250`
- 근거: 어셈블리 인자 사용과 PCSX2 런타임 캡처가 일치함
- 원시 수집물: `analytics/temp/emulator/pcsx2/session-20260715-001/`
- 재현 명령: `python analytics/tools/agent/pcsx2_pine.py ...`
```

다른 문서에서는 `runtime/battle-package-loading.md#disc-read-function`처럼 참조한다. 제목은 바뀔 수 있으므로 교차 참조되는 중요한 결론에는 명시적인 영문 anchor를 권장한다.

`[SUPERSEDED]`는 잘못되거나 더 정확한 결론으로 대체된 과거 기록이다. 삭제하지 말고 `superseded_at`, 대체 결론 링크와 이유를 필수로 남긴다.

```markdown
### [SUPERSEDED] 패키지가 직접 암호화되어 저장된다는 추정

- recorded_at: `2026-07-10T18:00:00+09:00`
- superseded_at: `2026-07-16T20:40:00+09:00`
- superseded_by: [현재 로딩 결론](#current-loading-path)
- reason: 후속 워치포인트에서 중간 조립 단계를 확인함
```

`src/tools/build_analysis_index.py --check` 같은 도구로 INDEX 누락, 끊어진 링크, 중복 anchor, 시간 형식, 허용되지 않은 상태와 대체 링크 없는 `SUPERSEDED` 기록을 검사하는 것을 권장한다. 짧은 어셈블리, 헥스 또는 디컴파일 발췌는 결론을 설명하는 최소 범위만 포함하고 원본 데이터의 큰 연속 구간은 포함하지 않는다.

### 루트 파일

`README.md`는 최소한 다음 내용을 포함한다.

- 프로젝트 목적과 지원 게임/판본
- 원본 이미지를 준비할 위치와 필요한 SHA-256
- 필요한 런타임과 외부 도구
- 분석, 빌드, 테스트와 배포 명령
- `plan/INDEX.md`의 현재 진행 계획과 갱신 방법
- 패치 적용 방법
- 저장소에 포함되지 않는 파일 목록
- 라이선스, 기여 방법과 알려진 문제

`manifest.json`은 빌드와 분석 도구가 함께 읽는 프로젝트 설정의 단일 기준으로 사용한다. 환경별 절대 경로를 넣지 말고 프로젝트 루트 기준 상대 경로를 사용한다. 시작 파일은 [manifest.sample.json](samples/manifest.sample.json)을 참고하며, 필드 의미와 patch write 계약은 [디스크, 블록과 패치 쓰기 모델](media-patch-model.md)을 따른다.

권장 예시:

```json
{
  "schema_version": 2,
  "id": "game-korean-patch",
  "title": "Game Korean Translation Patch",
  "version": "0.1.0",
  "source_language": "ja",
  "target_language": "ko",
  "platform": "ps1",
  "source_text_policy": "private_repository",
  "disks": [
    {
      "id": "disc-1",
      "label": "Disc 1",
      "serial": "SLPS-00000",
      "descriptor": {
        "path": "disc/original/disc-1.cue",
        "accepted_hashes": [{"algorithm": "sha256", "value": "REQUIRED_CUE_SHA256"}]
      },
      "tracks": [
        {
          "number": 1,
          "type": "data",
          "path": "disc/original/disc-1.bin",
          "mode": "mode2-form1",
          "indexes": [{"number": 1, "lba": 0}],
          "sector_format": {"physical_sector_size": 2352, "user_data_offset": 24, "user_data_size": 2048},
          "accepted_hashes": [{"algorithm": "sha256", "value": "REQUIRED_TRACK_SHA256"}]
        }
      ],
      "accepted_hashes": [{"algorithm": "sha256-disc-set-v1", "value": "REQUIRED_CANONICAL_DISC_SET_SHA256", "edition": "japan-original"}],
      "dependencies": [
        {
          "id": "reference-base-patch",
          "role": "build_base",
          "required_for": ["build", "release"],
          "apply_order": 10,
          "adapter": "ppf",
          "artifact": {"path": "disc/reference/base-patch.ppf", "accepted_hashes": [{"algorithm": "sha256", "value": "REQUIRED_PATCH_SHA256"}]},
          "input_accepted_hashes": [{"algorithm": "sha256-disc-set-v1", "value": "REQUIRED_CANONICAL_DISC_SET_SHA256"}],
          "expected_output_hashes": [{"algorithm": "sha256", "value": "REQUIRED_BASE_OUTPUT_SHA256"}]
        }
      ],
      "patch": {
        "adapter": "ppf",
        "apply_order": 20,
        "output": "release/game-korean-patch-v{version}-disc-1.ppf",
        "sector_integrity": "recalculate_edc_ecc"
      }
    },
    {
      "id": "disc-2",
      "label": "Disc 2",
      "serial": "SLPS-00001",
      "descriptor": {"path": "disc/original/disc-2.cue", "accepted_hashes": [{"algorithm": "sha256", "value": "REQUIRED_CUE_SHA256"}]},
      "tracks": [{"number": 1, "type": "data", "path": "disc/original/disc-2.bin", "mode": "mode2-form1", "indexes": [{"number": 1, "lba": 0}], "sector_format": {"physical_sector_size": 2352, "user_data_offset": 24, "user_data_size": 2048}, "accepted_hashes": [{"algorithm": "sha256", "value": "REQUIRED_TRACK_SHA256"}]}],
      "accepted_hashes": [{"algorithm": "sha256-disc-set-v1", "value": "REQUIRED_CANONICAL_DISC_SET_SHA256", "edition": "japan-original"}],
      "dependencies": [],
      "patch": {
        "adapter": "ppf",
        "apply_order": 10,
        "output": "release/game-korean-patch-v{version}-disc-2.ppf",
        "sector_integrity": "recalculate_edc_ecc"
      }
    }
  ],
  "fonts_config": "src/config/fonts.yml",
  "control_codes_config": "src/config/control_codes.yml",
  "analysis": {
    "ghidra": {
      "project_dir": "analytics/temp/ghidra-projects",
      "project_name": "GAME_MAIN"
    },
    "duckstation": {
      "gdb_host": "127.0.0.1",
      "gdb_port": null
    },
    "pcsx2": {
      "pine_host": "127.0.0.1",
      "pine_port": null,
      "symbols": "analytics/temp/emulator/symbols/pcsx2-symbols.sym"
    }
  },
  "paths": {
    "analytics_result": "analytics/result",
    "analytics_temp": "analytics/temp",
    "reference": "src/reference",
    "reference_raw": "analytics/temp/reference",
    "translations": "src/translate",
    "translation_raw": "analytics/temp/translation/raw",
    "translation_original": "src/translate/original",
    "glossary": "src/translate/glossary.yml",
    "characters": "src/translate/characters.yml",
    "shared_sentences": "src/translate/shared_sentences.yml",
    "blocks": "src/translate/block",
    "compiled_translations": "build/compiled-translations",
    "compiled_blocks": "build/compiled-blocks",
    "patch_plan": "build/patch-plan",
    "work_plans": "plan",
    "reports": "build/reports",
    "scenes": "src/translate/scene",
    "temp": "temp",
    "build": "build",
    "release": "release"
  }
}
```

실제 프로젝트에서는 플랫폼에 맞지 않는 필드를 제거하고 필요한 설정을 추가한다. `disks`가 다중 디스크의 최상위 목록이며 각 디스크가 descriptor/image, tracks, 허용 해시, 의존성과 패치 출력을 가진다. `accepted_hashes`는 하나 이상이어야 하고 빈 값이나 placeholder가 남아 있으면 진단·빌드·릴리스를 실패시킨다. CUE가 있는 이미지는 CUE 내용과 참조하는 모든 track 파일을 함께 검증한다.

`version`은 배포 패치 버전으로 사용하고 `{version}` 템플릿은 빌드 시 치환한다. 파일명, 체크섬 목록과 릴리스 문서가 같은 버전을 사용하도록 검증한다. 폰트는 `fonts_config`가 가리키는 profile에서 source hash, rasterizer, bitmap, mapping과 budget을 관리한다. GDB/PINE 포트는 사용자 환경에서 확인한 뒤 설정하며 미설정 상태에서는 Agent가 연결을 시도하지 않는다. PC마다 달라지는 실행 파일 경로는 manifest가 아니라 Git에서 제외된 로컬 설정이나 환경 변수를 사용한다.

실제 검증한 OS/architecture, executable hash, 분석 옵션, font tool, emulator 설정과 도구 버전은 `toolchain.lock.json`의 profile로 고정한다. 예시는 [toolchain.lock.sample.json](samples/toolchain.lock.sample.json), 운영 규칙은 [품질, 보안과 작업 계획](quality-operations.md)을 참고한다.

### 기계 판독 파일 공통 규칙

- JSON, JSONL과 YAML의 최상위에는 정수 `schema_version`을 둔다.
- 키와 enum 값은 소문자 `snake_case`, 안정 ID는 [번역 데이터의 ID 규칙](translation-patch.md#id-규칙)을 사용한다.
- 필드가 없는 것과 값이 `null`인 것을 구분한다. 미적용은 필드를 생략하고, 적용 대상이지만 아직 모르면 `null`과 상태·사유를 함께 기록한다.
- 배열의 순서가 의미가 있으면 `source_order`처럼 명시하고, 의미가 없으면 생성기가 안정 정렬한다.
- 사용자가 임의 key/value를 추가할 때는 충돌 방지를 위해 `x_<project>_<name>` 확장 키를 사용한다. 공통 키로 승격할 때 schema version과 마이그레이션 도구를 갱신한다.
- 검증기는 알 수 없는 일반 키를 오류로, `x_` 확장 키를 허용 대상으로 처리한다. enum과 필수 필드는 JSON Schema 또는 동등한 검증 코드로 검사한다.

샘플 모음:

| 파일 | 용도 |
|---|---|
| [manifest.sample.json](samples/manifest.sample.json) | 다중 디스크, 해시, 섹터와 패치 출력 |
| [toolchain.lock.sample.json](samples/toolchain.lock.sample.json) | 재현 가능한 도구 버전과 capability |
| [third_party.sample.yml](samples/third_party.sample.yml) | 폰트·코드·외부 자산의 출처와 라이선스 |
| [analysis-result.sample.md](samples/analysis-result.sample.md) | 분석 결과 문서와 증거 상태 |
| [glossary.sample.yml](samples/glossary.sample.yml) | 용어와 참여자 표시명 |
| [characters.sample.yml](samples/characters.sample.yml) | 화자 관계와 말투 |
| [shared_sentences.sample.yml](samples/shared_sentences.sample.yml) | 반복 문장과 변수 |
| [control_codes.sample.yml](samples/control_codes.sample.yml) | 제어 코드 정의 |
| [fonts.sample.yml](samples/fonts.sample.yml) | 재현 가능한 폰트 profile과 budget |
| [scene.sample.yml](samples/scene.sample.yml) | 사람이 검수하는 장면 번역 |
| [translation-unit.sample.jsonl](samples/translation-unit.sample.jsonl) | scene 외 domain의 구조화 번역 unit |
| [block.sample.jsonl](samples/block.sample.jsonl) | 원본 디스크 패치 위치 매핑 |
| [patch-plan.sample.jsonl](samples/patch-plan.sample.jsonl) | 생성된 실제 byte write operation |
| [runtime-matrix.sample.yml](samples/runtime-matrix.sample.yml) | 실행 QA 사례와 결과 |
| [command-report.sample.json](samples/command-report.sample.json) | CLI 공통 JSON 검증 보고서 |
| [plan/INDEX.md](samples/plan/INDEX.md) | work plan 전체 목차 |
| [plan/plan-text-pipeline.yml](samples/plan/plan-text-pipeline.yml) | step 상태와 진행률이 있는 plan |

권장 `.gitignore`는 [gitignore.sample](gitignore.sample)을 복사해 프로젝트 상황에 맞게 조정한다. 최소 필수 제외 경로는 `/disc/`, `/analytics/temp/`, `/temp/`, `/build/`, `/release/`이며 Python 가상환경·캐시, IDE, OS 파일, 로컬 설정, Ghidra 프로젝트와 디스크 이미지 확장자도 포함한다.

루트 `README.md`와 `manifest.json`은 반드시 Git으로 관리한다. `disc/README.md`에는 필요한 파일명, 판본, 크기와 SHA-256만 기록하고 원본 데이터는 포함하지 않는다. `analytics/result/`에는 바이너리, 저장 상태, 메모리 덤프, 스크린샷, 원시 디컴파일 묶음 또는 대형 자동 내보내기를 넣지 않는다.

폰트, 외부 코드, 번역 이미지와 참고 자산은 `THIRD_PARTY.yml`에 이름, 출처 URL, 저작자, 버전·해시, 라이선스, 수정 여부와 배포 가능 여부를 기록한다. 라이선스가 불명확하거나 재배포를 허용하지 않는 파일은 `release/`와 저장소에 포함하지 않는다. 게임 원본에서 추출한 글꼴·그래픽·음성도 패치 생성에 필요한 차이 데이터의 범위를 넘겨 배포하지 않는다.

### 초기 설정 가이드

루트 `README.md`에는 가장 짧은 빠른 시작만 두고 상세한 개발 환경 준비는 `docs/SETUP.md`에서 안내한다. 설치 절차는 Windows, macOS와 Linux를 구분하고, 패치 빌드 필수 도구와 분석에만 필요한 선택 도구를 분리한다.

필수 환경:

- 프로젝트가 정한 버전 이상의 Python
- 격리된 Python 가상환경
- `pyproject.toml`과 lock 파일에 고정한 Python 의존성
- 최종 패치가 xdelta라면 `xdelta3`
- 원본 디스크 이미지와 판본별 기대 해시

선택 분석 환경:

- Java와 Ghidra (`analyzeHeadless`, PyGhidra 포함)
- PS1 프로젝트의 DuckStation
- PS2 프로젝트의 PCSX2
- Git과 Git LFS가 실제로 필요한 경우 해당 도구

Python 가상환경 예시:

```powershell
# Windows PowerShell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e .
python src/tools/doctor.py
```

```bash
# macOS / Linux
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e .
python src/tools/doctor.py
```

프로젝트가 패키지 구조를 사용하지 않는다면 `pip install -e .` 대신 lock된 requirements 파일을 사용한다. Python 버전과 직접·간접 의존성은 문서에만 적지 말고 `pyproject.toml`과 `uv.lock`, `requirements.lock` 또는 동등한 lock 파일에서 기계적으로 재현할 수 있어야 한다.

`xdelta3` 설치 예시:

```powershell
# Windows: 프로젝트가 안내하는 신뢰 가능한 바이너리를 설치한 뒤 PATH에 추가
xdelta3 -V
```

```bash
# macOS
brew install xdelta
xdelta3 -V

# Ubuntu / Debian
sudo apt update
sudo apt install xdelta3
xdelta3 -V
```

Windows용 바이너리를 내려받아 사용할 때는 출처, 버전과 SHA-256을 `docs/SETUP.md`에 기록한다. 외부 실행 파일을 저장소에 직접 포함하지 않고 PATH 또는 Git에서 제외된 로컬 설정으로 찾는다. Ghidra와 에뮬레이터 설치 경로도 환경 변수나 로컬 설정을 사용한다.

`src/tools/doctor.py`는 최소한 다음 항목을 읽기 전용으로 검사한다.

- Python 버전과 필수 모듈
- `manifest.json`의 스키마와 필수 경로
- `toolchain.lock.json`과 실제 Python, Java, Ghidra, patch adapter, font tool 및 에뮬레이터 profile
- manifest가 사용하는 `xdelta3`, PPF 또는 custom adapter의 존재 여부와 정확한 검증 버전·hash
- 폰트 및 패치 입력 파일
- 모든 디스크와 의존성의 존재 여부, 크기와 accepted hash
- `temp/`, `build/` 및 필요한 출력 경로의 생성 가능 여부
- 선택적으로 Java, Ghidra, `analyzeHeadless`, DuckStation과 PCSX2

필수 항목 누락은 `[FAIL]`, 선택 도구 누락은 `[WARN]`, 정상 항목은 `[OK]`로 출력하고 실패 시 0이 아닌 종료 코드를 반환한다. `accepted_hashes`가 비었거나 실제 디스크·의존성 해시가 일치하지 않으면 반드시 `[FAIL]`이다. 원본 이미지는 검사만 하고 수정하지 않는다. README의 첫 빌드 명령보다 먼저 `doctor.py` 실행을 안내한다.

권장 문서 분리:

- `docs/SETUP.md`: 설치, 환경 변수, 원본 배치와 자가진단
- `docs/BUILD.md`: 추출, 컴파일, 패치 생성과 테스트
- `docs/TRANSLATION.md`: glossary, characters, shared sentences, scene 편집과 block 생성
- `docs/DEBUGGING.md`: Ghidra 및 에뮬레이터 디버깅
- `docs/RELEASE.md`: 패치 포맷, 왕복 검증, 체크섬과 배포 승인
