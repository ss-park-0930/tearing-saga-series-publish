# 구조화 텍스트와 폰트 모델

[상위 가이드로 돌아가기](../ANALYSIS_GUIDE.md)

이 문서는 게임별 텍스트 표기와 폰트 구현이 달라도 원본 제어 스트림을 손실 없이 보존하기 위한 공통 모델을 정의한다.

## 번역 Domain

사람이 편집하는 번역 데이터는 `translation_unit`의 집합이다. 모든 번역을 scene으로 강제하지 않는다.

| domain | 권장 위치 | 대표 데이터 |
|---|---|---|
| `scene` | `src/translate/scene/` | 이벤트 대사와 독백 |
| `battle` | `src/translate/battle/` | 전투 대사, 결과와 HUD |
| `menu` | `src/translate/menu/` | 메뉴, 아이템, 스킬과 설명 |
| `system` | `src/translate/system/` | 설정, 저장/로드와 알림 |
| `graphic` | `src/translate/graphic/` | 이미지에 포함된 문자열 |
| `name_table` | `src/translate/name_table/` | 인명, 지명과 도감 표 |

scene은 사람이 문맥을 읽기 쉬운 YAML을 사용한다. 대량 표 데이터는 YAML 또는 JSONL을 사용할 수 있고, 게임별로 TSV가 반드시 유리한 경우에는 adapter 입력으로 허용한다. 다만 모든 domain은 안정적인 unit ID, source locator, 번역 입력, 번역 상태와 검증 결과를 제공해야 한다.

scene 외 domain의 JSONL 예시는 [translation-unit.sample.jsonl](samples/translation-unit.sample.jsonl)을 참고한다.

## 번역 입력 방식

원문의 기계 기준은 `src/translate/block/*.jsonl`의 token 배열이다. 번역문은 다음 두 방식 중 **정확히 하나**로 작성한다. 같은 unit에 `translation`과 `translation_tokens`를 함께 두지 않는다.

1. **일반 모드 `translation`**: 대부분의 번역에 사용한다. 번역자는 페이지와 줄을 사람이 읽기 쉬운 문자열로 작성한다. compiler가 원본 control skeleton을 결합해 `build/compiled-translations/*.jsonl`에 token 배열을 생성한다.
2. **고급 모드 `translation_tokens`**: 문장 중간의 변수·용어·제어 코드 위치를 번역자가 정확히 지정해야 할 때만 사용한다. 사람이 쓰는 token은 축약형이며 compiler가 최상위 `type`을 추론해 canonical token으로 정규화한다. 원본 skeleton 및 `control_codes.yml` 정책을 만족해야 한다.

```yaml
# 일반 모드
translation:
  pages:
    - lines:
        - "첫 번째 번역 줄"
        - "두 번째 번역 줄"
    - lines:
        - "다음 페이지"
```

일반 모드에서 `lines` 사이에는 `ctrl.newline`, 다음 `pages` 사이에는 `ctrl.page_continue`, 마지막 페이지 뒤에는 `ctrl.page_end`와 `ctrl.end`가 생성된다. 게임이 이와 다른 종료 구조를 사용하면 adapter profile에서 생성 규칙을 정의한다. `translation_preview`는 입력값이 아니라 compiler가 생성한 검토용 문자열이므로 직접 수정하지 않는다.

### 사용 순서

1. 추출기가 block JSONL에 원문 token과 control skeleton을 저장한다.
2. 번역자는 scene의 `original_preview`, 화자, 대상과 용어를 확인하고 보통 `translation.pages[].lines[]`만 수정한다.
3. 제어 코드가 문장 중간의 특정 위치에 있어 자동 배치할 수 없는 unit만 `translation` 대신 `translation_tokens`로 작성한다.
4. validator는 한 unit에 `translation`, `translation_tokens`, `translation_ref` 중 정확히 하나만 있는지 확인한다.
5. compiler는 `build/compiled-translations/`에 최종 token과 preview를 만들고, encoder는 이를 게임 byte로 변환한다.

## 축약 Token 입력

사람이 편집하는 `translation_tokens`는 다음 key로 최상위 token 종류를 추론한다.

| 축약 token의 식별 key | 추론 결과 |
|---|---|
| `value` | `text` |
| `term_id` | `term` |
| `variable` | `variable` |
| `code_id` | `control_codes.yml`에 등록된 `token_type` |
| `raw_bytes`만 존재 | `opaque` |

```yaml
translation_tokens:
  - {value: "첫 번째 줄"}
  - {code_id: ctrl.newline}
  - {term_id: term.person.0001, form: default}
  - {value: "의 두 번째 줄"}
  - {code_id: ctrl.page_continue}
  - {value: "다음 페이지"}
  - {code_id: ctrl.page_end}
  - {code_id: ctrl.end}
```

한 token에 식별 key를 둘 이상 넣지 않는다. 단, `code_id` token에는 opcode 인자인 `parameters`와 원본 확인용 `raw_bytes`를 함께 둘 수 있다. 등록되지 않은 `code_id`, 잘못된 parameter 개수·형식과 식별 key가 없는 token은 오류다. `parameters` 내부의 `type`은 `f32le`, `u16le` 같은 실제 데이터 형식을 나타내므로 생략하지 않는다.

## Canonical Token AST

token 배열은 원본 디스크의 제어 스트림과 compiler 출력의 기계 표현이다. 문자열 markup이나 preview를 다시 parse해 token을 덮어쓰지 않는다.

지원 token type:

| type | 의미 | 핵심 필드 |
|---|---|---|
| `text` | 일반 문자 run | `value` |
| `term` | glossary 표기 삽입 | `term_id`, `form` |
| `variable` | shared sentence 호출 값 | `name`, `value_type` |
| `line_break` | 게임의 강제 줄바꿈 | `code_id` |
| `page_break` | 페이지 경계 | `code_id` |
| `control` | 이름이 확인된 opcode | `code_id`, `parameters`, `raw_bytes` |
| `terminator` | item/message 종료 | `code_id` |
| `opaque` | 아직 해석되지 않은 원시 bytes | `raw_bytes`, `reason`, `evidence_status` |

`parameters`도 구조화하며 `u8`, `u16le`, `u32le`, `s16le`, `f32le`, `bytes`, `reference`처럼 type을 명시한다. float나 pointer byte를 glyph token으로 해석하지 않는다.

다음은 위 축약 입력을 compiler가 정규화한 산출물 예시다. 사람이 직접 관리하는 scene 파일이 아니라 `build/compiled-translations/`에 생성한다.

```yaml
compiled_tokens:
  - type: text
    value: "첫 번째 줄"
  - type: line_break
    code_id: ctrl.newline
  - type: term
    term_id: term.person.0001
    form: default
  - type: control
    code_id: ctrl.scale
    parameters:
      - {type: f32le, value: 0.85}
      - {type: f32le, value: 0.85}
    raw_bytes: "8a 80 9a 99 59 3f 9a 99 59 3f"
  - type: page_break
    code_id: ctrl.page_continue
  - type: text
    value: "다음 페이지"
  - type: page_break
    code_id: ctrl.page_end
  - type: terminator
    code_id: ctrl.end
```

전체 예시는 [scene.sample.yml](samples/scene.sample.yml)과 [block.sample.jsonl](samples/block.sample.jsonl)을 참고한다.

## 게임별 Adapter

VP1의 `{roll:81}`·`<HH>`, VP2의 control byte 표시, `=` 페이지 구분 같은 문법은 import/export adapter의 사람용 표현일 뿐 canonical format이 아니다.

```text
game bytes
  -> decoder
  -> canonical original tokens in block JSONL

domain YAML/JSONL authoring input
  -> compiler
  -> canonical translation token AST
  -> encoder
  -> game bytes
```

adapter는 다음을 증명해야 한다.

- 원본 bytes → tokens → bytes 무변경 왕복
- opcode별 parameter byte 수와 endian
- line break, page break와 terminator 구분
- 이동 가능한 control과 위치 고정 control 구분
- 미확정 opcode를 `opaque`로 보존
- preview를 다시 parse해 canonical token을 덮어쓰지 않음

## 줄바꿈과 페이지

YAML의 보기 좋은 줄바꿈과 게임 출력 명령을 구분한다.

- `text.value` 안의 줄바꿈은 정규화 과정에서 금지하거나 text token을 나눈다.
- 강제 줄바꿈은 `line_break` token이다.
- 다음 텍스트 상자는 `page_break` token이다.
- 이어지는 페이지 경계와 마지막 페이지 경계의 byte가 다르면 각각 `ctrl.page_continue`, `ctrl.page_end`처럼 별도 `code_id`로 정의한다.
- 하나의 opcode가 두 역할을 겸하면 뒤에 text/page token이 있는지를 compiler가 판단하므로 별도 boolean을 저장하지 않는다.
- 자동 wrap 후보는 `soft_break_hint` 메타데이터로 둘 수 있지만 게임 byte로 직접 인코딩하지 않는다.
- 단락과 별도 message/item은 token이 아니라 unit 경계로 구분한다.

번역자는 일반 모드의 `translation.pages[].lines[]`를 직접 읽고 수정한다. compiler가 생성한 preview와 tokens가 함께 저장되는 산출물에서는 validator가 두 표시 결과를 비교한다.

canonical AST에서 `type`과 `code_id`는 서로 다른 층이다. `type: page_break`는 모든 게임에서 통하는 의미이고 `code_id: ctrl.page_end`는 해당 게임의 실제 byte와 parameter 규칙을 찾는 키다. 사람이 편집하는 축약 token에서는 `type`을 쓰지 않지만 compiler가 `control_codes.yml`을 조회해 붙인다. validator와 후속 도구는 canonical `type`만 보고도 줄·페이지·종료 구조를 처리할 수 있고, adapter만 `code_id`의 게임별 구현을 알면 된다.

다음 두 필드는 token에 사용하지 않는다.

- `continuation`: 뒤에 페이지가 이어지는지를 나타내려던 boolean이지만 실제 opcode 차이를 표현하지 못하고 token 순서와도 중복된다. byte가 다르면 `ctrl.page_continue`와 `ctrl.page_end`를 별도 `code_id`로 등록한다.
- `locked`: 번역자가 해당 token을 삭제·이동·변경할 수 없다는 뜻으로 제안했던 boolean이다. 같은 정책이 모든 token에 반복되고 게임별 예외를 설명하기 어려우므로 제거한다. 대신 `control_codes.yml`의 `movement`를 단일 권위 값으로 사용한다.

## Control Skeleton

원문 token에서 `text`와 `term`을 제외한 순서를 control skeleton이라 한다. 기본적으로 번역은 원본 skeleton을 보존한다.

- 제어 token의 이동 정책은 각 token에 반복하지 않고 `control_codes.yml`의 `movement`에 한 번만 기록
- `fixed_position`은 원본 token index 또는 anchor 위치를 보존하고, `fixed_order`는 다른 제어 token과의 순서를 보존하며, `within_page`는 같은 페이지 안에서만 이동을 허용
- 제한 없이 옮겨도 되는 제어만 `movable`을 사용
- `opaque`는 별도 승인 규칙이 없으면 `fixed_position`으로 취급
- page 수 변경이 필요하면 해당 게임 adapter가 지원하고 별도 승인을 받아야 함
- `opaque` token이 있는 unit은 기술 검수 전 `approved` 불가가 기본
- 예외는 `control_override`와 근거·검증 결과를 기록

## 화자와 대상

`entity_id`는 인물·그룹·시스템의 정체와 관계를, `term_id`는 원어·한국어 표시명을 담당한다. 알려진 화자와 대상은 모두 glossary term을 가져야 한다.

화자 귀속 상태와 번역 상태는 분리한다.

- 화자를 확인할 수 없으면 `entity_id: unknown`, `term_id: term.participant.unknown`
- 시스템·무인칭 문장은 `system` 참여자를 사용
- 대상이 없는 문장은 `targets: []`
- 화자 정보가 말투를 결정하는 핵심 대사에는 `attribution_status: unresolved` 상태로 `approved` 금지
- 메뉴, 시스템 메시지, 주변 NPC처럼 화자 미확정이 번역 의미를 바꾸지 않으면 `unknown`을 명시한 채 번역 승인 가능

## 폰트 Profile

폰트는 단순 TTF 경로가 아니라 재현 가능한 변환 profile로 관리한다. `src/config/fonts.yml`에 다음을 기록한다.

- source font ID, 파일 hash, face/index와 license
- rasterizer 이름·버전과 rendering 옵션
- cell width/height, baseline, ascent, descent와 padding
- bit depth, channel/nibble/bit order와 row stride
- glyph ordering과 code assignment
- width/advance 계산과 kerning 정책
- fallback과 미지원 문자 정책
- atlas, VRAM, block별 glyph 수와 byte budget
- 압축 format과 정렬

폰트가 전역인지 block-local인지, 기존 glyph를 재사용하는지, 번역 unit별 빈도순으로 다시 배치하는지를 profile에 명시한다. 전체 예시는 [fonts.sample.yml](samples/fonts.sample.yml)을 참고한다.

## 폰트 검증

- 같은 입력·profile에서 glyph bitmap과 mapping hash가 동일하다.
- 모든 번역 token의 문자와 term 결과가 glyph set에 존재한다.
- 셀 경계, baseline, 폭표와 atlas 범위를 넘지 않는다.
- block-local font는 해당 block 번역에서 필요한 glyph를 모두 포함한다.
- glyph, mapping, width table과 compressed font의 용량이 각각 budget을 통과한다.
- 대표 글자뿐 아니라 받침, 구두점, 숫자, 영문과 조합 경계 screenshot을 검증한다.
- 원본 무변경 빌드는 원본 font block과 바이트 또는 문서화된 의미 수준에서 일치한다.

## 상태와 검증

번역 상태는 `untranslated`, `draft`, `reviewed`, `approved`, `blocked`, `excluded`를 사용한다. `excluded`에는 범위 제외 사유와 승인자가 필요하다. 화자 귀속은 `unresolved`, `inferred`, `observed`, `confirmed`, `not_applicable`을 별도로 사용한다.

validator는 domain과 관계없이 ID, token schema, glossary, control skeleton, encoding, glyph coverage, render width, page/line 수, 압축과 slot budget을 검사한다.
