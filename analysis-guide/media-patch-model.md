# 디스크, 블록과 패치 쓰기 모델

[상위 가이드로 돌아가기](../ANALYSIS_GUIDE.md)

이 문서는 원본 매체에서 번역 항목을 찾고 최종 바이트를 기록하기까지의 기계 판독 계약을 정의한다. `block`은 논리 데이터를, `patch plan`은 실제 쓰기 작업을 뜻한다. 두 개념을 혼용하지 않는다.

## 디스크와 트랙

`manifest.json`의 `disks[]`가 최상위 매체 목록이다. ISO처럼 단일 2048바이트 데이터 이미지라면 `image` 하나를 사용하고, CUE/BIN처럼 혼합 트랙이면 `descriptor`와 `tracks[]`를 사용한다.

- `descriptor`: CUE 자체 경로, 크기와 hash
- `tracks[]`: track 번호, type, mode, 파일, index, pregap, sector 형식과 hash
- `accepted_hashes`: 해당 디스크 조합을 식별하는 canonical hash 목록
- `serial`, `region`, `edition`: 사람이 판본을 확인하기 위한 값
- `dependencies[]`: 빌드 전에 적용하거나 참조할 외부 입력

CUE는 텍스트 파일만 확인하지 않고 참조하는 모든 BIN과 track 순서를 검증한다. 한 디스크의 서로 다른 트랙이 다른 sector 형식을 사용하면 디스크 수준의 단일 `sector_format`을 사용하지 않는다. 전체 예시는 [manifest.sample.json](samples/manifest.sample.json)을 참고한다.

단일 ISO/BIN의 디스크 hash는 해당 파일의 SHA-256이다. 여러 파일로 된 CUE/BIN 세트의 `sha256-disc-set-v1`은 다음 canonical JSON을 UTF-8, BOM 없음, LF, key 정렬, 공백 없는 형식으로 직렬화한 bytes의 SHA-256이다. 경로와 파일 시각은 포함하지 않는다.

```json
{"descriptor_sha256":"...","tracks":[{"mode":"mode2-form1","number":1,"sha256":"...","size":123},{"mode":"audio","number":2,"sha256":"...","size":456}]}
```

구성 hash만 믿지 않고 descriptor와 각 track의 개별 hash도 모두 검증한다.

## Dependency 적용 그래프

기존 패치를 기반으로 빌드할 때 dependency는 단순 참고 파일이 아니라 재현 가능한 변환 단계다.

```text
clean_original
  -> dependency(base_patch, order=10)
  -> project_patch(order=20)
  -> integration_image
```

dependency에는 다음을 기록한다.

- `role`: `build_base`, `analysis_reference`, `tool`, `data`
- `required_for`: `analysis`, `build`, `release`의 목록
- `apply_order`: 동일 디스크 변환의 정수 순서
- `input_accepted_hashes`: 적용 직전 입력
- `artifact.accepted_hashes`: dependency 파일 자체
- `expected_output_hashes`: 적용 결과
- `adapter`: `ppf`, `xdelta3`, `custom` 등 검증된 적용기

빌드 도구는 dependency 그래프의 cycle, 중복 order, 입력 hash 불일치와 예상 출력 hash 불일치를 실패시킨다. 분석용 reference는 빌드 그래프에 자동으로 들어가지 않는다.

## Container Chain

원문 위치를 단일 LBA나 파일 offset으로만 표현하지 않는다. 각 block은 원본 매체부터 논리 item까지의 변환 경로인 `container_chain`을 가진다.

```text
disc track
  -> physical/user-data sector view
  -> fixed slot
  -> compressed stream
  -> bundle/container
  -> item/string
```

각 단계는 `type`, `format`, `locator`, `decoder`, `encoder`, `expected_hash`와 정렬·크기 제약을 가질 수 있다. 예를 들어 PS2의 `raw_slot -> slz_v2 -> mcps2lib -> item`, PS1의 `raw2352 -> userdata2048 -> slz_v1 -> text_block`을 같은 형식으로 표현할 수 있어야 한다.

## Block JSONL

`src/translate/block/*.jsonl`은 원본에서 결정적으로 추출한 논리 항목의 권위 매핑이다. 한 줄은 하나의 원본 항목이며 최소한 다음을 포함한다.

- `disk_id`, `block_id`, `line_id`, `domain`, `source_order`
- `container_chain`
- 원본 `tokens`와 원본 token stream hash
- 연결된 폰트나 공유 resource ID
- 크기, 정렬, 압축과 rendering 제약
- 실제 출력에 영향을 주는 write region 선언

원문 문자열과 구조화 token은 private Git 저장소에서 추적한다. 원본 디스크 이미지, 추출 바이너리, 압축 block과 대형 원시 dump는 추적하지 않는다. 저장소를 공개로 전환할 때는 원문 공개 가능 여부를 별도로 검토해야 하며 자동으로 공개 가능한 것으로 간주하지 않는다.

`extract --check`는 로컬 원본에서 block JSONL을 다시 생성하고 canonical serialization 결과를 비교한다. 생성기 버전이 달라 의미는 같지만 직렬화만 달라지는 경우에는 migration 후 비교하며 수동 편집으로 차이를 덮지 않는다.

## Write Region

하나의 block이 텍스트, 폰트, 포인터, 크기 필드와 checksum처럼 여러 위치를 수정할 수 있으므로 `write_regions[]`를 사용한다.

필수 속성:

- `id`, `owner_id`, `disk_id`, `purpose`
- `address_space`: `disc_physical`, `sector_userdata`, `file`, `container`, `runtime`
- `locator`: track/LBA/offset 또는 container-relative offset
- `length` 또는 `allocated_size`
- `expected_before_hash`
- `payload_source`
- `padding_policy`: `preserve`, `zero`, `fill`, `rebuild`
- `tail_policy`: 일반적으로 `preserve`
- `alignment`
- `sector_integrity`: `none`, `preserve`, `recalculate_edc_ecc`

원본 또는 dependency 적용 결과의 `expected_before_hash`가 다르면 쓰지 않는다. 특히 압축 stream 뒤의 tail과 같은 미해석 영역은 기본적으로 보존한다.

## 생성된 Patch Plan

빌드는 block, 번역 unit, 폰트, 코드 patch와 dependency를 결합해 `build/patch-plan/<disk-id>.jsonl`을 생성한다. 이 파일은 실제 쓰기 작업의 유일한 실행 목록이며 사람이 직접 편집하지 않는다. 전체 예시는 [patch-plan.sample.jsonl](samples/patch-plan.sample.jsonl)을 참고한다.

각 operation은 다음을 포함한다.

- `operation_id`, `owner_id`, `apply_order`
- 입력 artifact와 hash
- 정확한 target address space와 범위
- 쓰기 전 hash 또는 bytes
- payload hash와 길이
- padding/tail/sector integrity 정책
- operation 생성 근거인 block, translation unit와 config ID

## Write-set과 충돌 검사

patch plan을 실행하기 전에 모든 operation을 동일한 최종 디스크 byte 범위로 투영하여 write-set을 만든다.

1. 범위가 겹치지 않으면 정상이다.
2. 동일 payload의 완전 중복은 한 번만 실행하고 alias를 기록한다.
3. 의도된 순차 덮어쓰기는 명시적 `conflict_resolution`과 apply order가 있어야 한다.
4. 그 외 overlap은 빌드를 실패시킨다.
5. 실행 후 실제 diff가 write-set allowlist를 벗어나면 실패한다.

보고서는 owner별 변경 byte, 최대 slot 사용률, overlap, 보존 tail과 sector integrity 결과를 포함한다. 검증 없이 마지막 write가 이기는 방식은 금지한다.

## 패치 형식 Adapter

`xdelta3`, `PPF`, 자체 installer는 동일한 형식으로 취급하지 않는다. adapter별로 생성, 적용, 검증 명령과 지원 입력을 정의한다.

- `xdelta3`: 정확한 원본 hash, decode 결과 hash와 window 설정 기록
- `PPF`: 버전, record 범위, undo 지원 여부와 적용 전 byte 검증
- `custom`: 포맷 명세, parser, 안전한 적용기와 fixture 필요

PS1 RAW 2352 섹터의 사용자 데이터를 수정하면 대상 mode에 따라 EDC/ECC를 재계산하고 sector sync/header/subheader가 보존됐는지 검사한다. PPF가 만들어졌다는 사실만으로 섹터가 유효하다고 판정하지 않는다.

## 완료 조건

- 모든 입력 디스크·트랙·dependency hash가 검증된다.
- block의 container chain이 무변경 왕복 테스트를 통과한다.
- 모든 operation에 쓰기 전 사전조건과 owner가 있다.
- write-set overlap이 없거나 승인된 해결 규칙이 있다.
- 실제 출력 diff가 allowlist 안에 있다.
- padding, tail, slot budget와 EDC/ECC 정책이 검증된다.
- patch adapter로 복원한 이미지가 integration image와 일치한다.
