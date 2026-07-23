# 번역 데이터와 릴리스

[상위 가이드로 돌아가기](../ANALYSIS_GUIDE.md)

## 번역 패치 우선 분석 항목

다음 순서로 조사하는 것을 권장한다.

1. 원본과 기존 번역 패치 적용본의 변경 파일 식별
2. 메인 실행 파일의 문자 코드 처리 변경 추적
3. 폰트 텍스처, 글리프 매핑과 문자 폭 테이블 확인
4. 스크립트 VM 및 제어 코드 표 작성
5. 대사 데이터 추출과 원문 위치 매핑
6. 압축 및 번들 재빌드 가능성 검증
7. 번역문 길이 증가에 따른 버퍼와 UI 제한 확인
8. 원본에서 추출 후 무변경 재삽입하는 왕복 테스트
9. 최소 한 문장을 한국어로 교체하는 수직 통합 테스트
10. 여러 이벤트, 메뉴, 전투와 세이브 데이터 회귀 테스트

전체 문자열을 번역하기 전에 다음 최소 목표를 먼저 달성한다.

```text
한 문장 추출
→ 한국어로 변경
→ 필요한 글리프 삽입
→ 파일 재빌드
→ 이미지에 반영
→ 에뮬레이터에서 정상 출력
→ 저장/로드 후 문제 없음 확인
```

## 참고 자료와 번역 데이터 모델

### 전체 흐름

```text
웹 크롤링/다운로드
  → analytics/temp/reference/
  → 출처별 요약과 교차 검증
  → src/reference/

게임 원문 전체 추출
  → analytics/temp/translation/raw/
  → src/translate/original/ 정규화 원문·token
  → 원본 블록 및 항목 메타데이터 정규화
  → src/translate/block/*.jsonl 결정적 생성·검증

정리된 참고 자료 + 전체 원문 분석
  → src/translate/glossary.yml
  → src/translate/characters.yml
  → src/translate/shared_sentences.yml

원본 메타데이터 + 단어 사전 + 캐릭터 분석
  → src/translate/<domain>/*.{yml,jsonl}
  → 참조·마커·순서·폭·용량 검증
  → 결정적 컴파일
  → build/compiled-translations/*.jsonl
  → build/compiled-blocks/*.jsonl
  → 패치 빌드
```

번역은 원문을 바로 문장별로 바꾸는 것으로 시작하지 않는다. 먼저 전체 원문을 추출하고 반복 용어, 반복 문장, 고유명사, 시스템 명칭과 캐릭터 관계를 분석해 공통 단어 사전과 캐릭터 말투 규칙을 만든다. 사람이 편집하는 번역의 기준은 scene, battle, menu, system, graphic, name_table 등 domain별 YAML/JSONL과 glossary, characters, shared sentences다. block JSONL은 원본 위치·순서·구조화 token·제약을 보존하는 별도의 권위 매핑이며 실제 byte 쓰기는 `build/patch-plan/`에 생성한다.

### ID 규칙

- ID는 소문자 ASCII, 숫자, `.`, `_`, `-`만 사용한다.
- ID는 한 번 배포하거나 다른 파일에서 참조한 뒤 변경하거나 재사용하지 않는다.
- 번역된 이름처럼 나중에 바뀔 수 있는 문자열을 ID의 유일한 근거로 삼지 않는다.
- 게임 내부 ID, 파일 인덱스, 스크립트 인덱스 또는 안정적인 일련번호가 있으면 우선 사용한다.
- 사람이 읽기 위한 이름은 별도 `name`, `title`, `original`, `translation` 필드에 기록한다.

권장 네임스페이스:

```text
ref.character.0001
term.person.0001
term.place.0001
char.0001
block.script.002298.0001
line.script.002298.0001.0001
scene.chapter01.0001
sentence.obtain-item.0001
```

이 ID 규칙은 번역, 참고 자료와 패치 위치의 연결을 위한 것이다. `analytics/result`의 분석 결과는 별도 전역 ID 대신 안정적인 파일 경로와 anchor를 식별자로 사용한다.

### `src/reference`

`src/reference/`에는 국내외 사이트, 공략, 인터뷰, 설정 자료와 기존 연구에서 알게 된 내용을 출처별로 정리한다. 크롤링한 HTML, 이미지, PDF, API 응답과 원문 복사본은 `analytics/temp/reference/`에 두고 `src/reference/`에는 필요한 요약, 인용 가능한 짧은 발췌, 출처 URL, 접근일과 해석만 둔다.

`src/reference/index.yml` 예시:

```yaml
schema_version: 1
references:
  - id: ref.character.0001
    title: "캐릭터 공식 소개"
    source:
      url: "https://example.invalid/character/1"
      accessed_at: "2026-07-16"
      language: ja
    topics:
      - char.0001
      - term.person.0001
    evidence: OBSERVED
    summary: |-
      캐릭터의 공식 소속과 주인공을 대하는 태도를 설명한다.
    raw_material:
      path: analytics/temp/reference/crawl/character-0001.html
      sha256: ""
```

하나의 웹 자료를 그대로 정답으로 취급하지 않는다. 공식 자료, 게임 원문과 여러 독립 자료를 비교하고, 정리한 주장에도 가능하면 `[FACT]`, `[OBSERVED]`, `[LIKELY]`, `[HYPOTHESIS]`, `[UNKNOWN]`, `[SUPERSEDED]` 상태를 붙인다.

### 단어 사전

공통 단어 사전은 `src/translate/glossary.yml`에 둔다. 각 용어는 영구적인 `term.*` ID를 가지며 장면, 메뉴, 시스템 문구와 캐릭터 분석에서 문자열 대신 이 ID를 참조한다.

```yaml
schema_version: 1
source_language: ja
target_language: ko
terms:
  - id: term.person.0001
    category: person
    original: "原語名"
    reading: "げんごめい"
    translation: "한국어 이름"
    aliases:
      - "원문 별칭"
    references:
      - ref.character.0001
    status: approved
    notes: |-
      메뉴, 대사와 시스템 메시지에서 동일한 표기를 사용한다.
  - id: term.group.party
    category: participant
    original: null
    translation: "파티 전체"
    status: approved
  - id: term.participant.self
    category: participant
    original: null
    translation: "자기 자신"
    status: approved
  - id: term.participant.system
    category: participant
    original: null
    translation: "시스템"
    status: approved
  - id: term.participant.unknown
    category: participant
    original: null
    translation: "대상 미확인"
    status: approved
```

권장 `category`는 `person`, `place`, `organization`, `item`, `skill`, `system`, `title`, `concept` 등이다. 번역 중 새 용어가 발견되면 임의로 번역을 확정하기 전에 단어 사전 항목을 추가하거나 기존 ID를 참조한다.

### 캐릭터 분석

캐릭터 분석은 `src/translate/characters.yml`에 둔다. 전체 원문과 `src/reference/`의 정리 자료를 기반으로 성격, 관계, 기본 말투와 상대별 말투를 기록한다.

```yaml
schema_version: 1
characters:
  - id: char.0001
    name_term: term.person.0001
    references:
      - ref.character.0001
    profile: |-
      침착하며 공식적인 자리에서는 감정을 절제한다.
    speech:
      default:
        register: formal
        honorific: true
        first_person: "저"
        notes: |-
          짧고 단정한 문장을 사용한다.
      by_target:
        - entity_id: char.0002
          term_id: term.person.0002
          relation: superior
          register: highly_formal
          honorific: true
          notes: |-
            명령에 답할 때 격식을 유지한다.
        - entity_id: char.0003
          term_id: term.person.0003
          relation: close_friend
          register: informal
          honorific: false
          notes: |-
            감정 표현이 늘고 문장 끝이 부드러워진다.
```

모든 화자와 대상의 **표시 이름은 반드시 `glossary.yml`에 등록**한다. 캐릭터의 정체와 말투는 `char.*` 같은 `entity_id`, 화면에 보일 원어·한국어 표기는 `term.*`인 `term_id`가 담당한다. 예를 들어 `char.0001`은 `term.person.0001`을 `name_term`으로 사용한다. 파티 전체, 자기 자신, 시스템과 미확인 대상처럼 캐릭터가 아닌 참여자도 `term.group.*` 또는 `term.participant.*` 항목을 glossary에 등록한다.

이 분리는 한 캐릭터가 본명·칭호·가명처럼 여러 표기를 가질 수 있고, 여러 캐릭터가 동일한 집단명을 대상으로 삼을 수 있기 때문에 필요하다. `characters.yml`은 성격·관계·말투 정책의 권위 데이터이고 `glossary.yml`은 원어명·번역명·별칭의 권위 데이터다. scene의 표시명은 사람이 읽기 위한 생성 복사본이며 두 권위 파일과 다르면 검증을 실패시킨다.

### 반복 문장

반복되는 대사, 시스템 안내, 획득 메시지와 메뉴 문장은 범용 이름인 `src/translate/shared_sentences.yml`에 둔다. YAML anchor 대신 명시적인 `translation_ref`를 사용해 파일을 넘는 참조와 검증을 가능하게 한다.

```yaml
schema_version: 1
entries:
  sentence.obtain-item.0001:
    original_tokens:
      - {type: variable, name: item, value_type: term}
      - {type: text, value: "を手に入れた。"}
      - {type: terminator, code_id: ctrl.end}
    translation_tokens:
      - {variable: item, value_type: term}
      - {value: "을 손에 넣었다."}
      - {code_id: ctrl.end}
    variables:
      item:
        type: term
    status: reviewed
    notes: "아이템 획득 공통 문장"
```

scene에서는 다음처럼 참조한다.

```yaml
translation_ref: sentence.obtain-item.0001
variables:
  item: term.item.0001
```

완전히 동일한 원문만 공유할 때는 컴파일러가 shared entry의 원문 token과 domain unit의 원문 token이 일치하는지 검사한다. 변수가 있는 템플릿은 변수 개수, 이름, 타입과 치환 후 control skeleton 보존 여부를 검사한다. 동일한 일본어라도 문맥과 화자 관계에 따라 한국어 번역이 다르면 별도 sentence ID를 사용한다. 한 곳만 다른 번역이 필요하면 `translation_override`와 필수 `override_reason`을 사용한다.

### 텍스트, escape와 토큰 형식

원문의 기계 기준은 inline escape 문자열이 아니라 block JSONL의 구조화 token 배열이다. 일반 번역자는 domain 파일의 `translation.pages[].lines[]`를 편집하고 compiler가 원본 control skeleton을 결합해 번역 token을 생성한다. 제어 코드 위치를 직접 지정해야 하는 예외만 축약형 `translation_tokens`를 사용한다. compiler는 `value`, `term_id`, `variable`, `code_id`, `raw_bytes` 식별 key로 최상위 type을 추론하고 `build/compiled-translations/`에 canonical token을 생성한다. opcode parameter는 type과 endian을 가진 값으로 보존한다. `translation_preview`는 생성되는 읽기용 복사본이다.

게임별 `{roll:81}`, `<HH>`, `=`, control byte 표시는 adapter의 import/export 표현으로만 사용한다. 공통 문장 참조는 `translation_ref`, 조사 근거는 `references` 필드를 사용한다. 전체 schema, 줄바꿈·페이지 구분과 control skeleton 규칙은 [구조화 텍스트와 폰트 모델](text-font-model.md)을 따른다.

### 블록 파일

`src/translate/block/`에는 원본의 논리 block/item을 보존하는 JSONL을 둔다. block JSONL은 private Git으로 관리하지만 사람이 직접 수정하지 않는다. 실제 byte 쓰기 operation은 `build/patch-plan/`에 생성하며 block과 혼용하지 않는다. 상세 필드는 [디스크, 블록과 패치 쓰기 모델](media-patch-model.md)을 따른다.

최소 필드는 `schema_version`, disk/block/line/domain ID, `source_order`, `container_chain`, 원문 token과 stream hash, resource, 제약과 write region이다. 번역 입력은 domain 파일, 컴파일된 번역 token은 `build/compiled-translations/`가 담당하므로 block에 중복 저장하지 않는다.

블록 ID와 line ID는 패치 도구가 사용하는 기본 키다. 파일 위치가 판본에 따라 달라지면 `disk_id`와 판본 매핑을 명시하고 파일 오프셋만을 ID로 사용하지 않는다. `extract --check`는 검증된 원본 디스크에서 JSONL을 다시 생성해 추적된 파일과 바이트 단위로 비교한다. source hash, 항목 수, source order, 패치 위치 또는 제약이 다르면 빌드 전에 실패한다. 전체 예시는 [block.sample.jsonl](samples/block.sample.jsonl)을 참고한다.

### 장면 파일

`src/translate/scene/`에는 장면별 YAML 파일을 둔다. 사람이 원문과 번역, 화자, 복수의 대화 대상과 말투를 한 화면에서 검토할 수 있어야 한다. 일반 번역은 `translation`, 정확한 제어 token 배치가 필요한 예외는 `translation_tokens`를 사용한다. 다른 domain도 [구조화 텍스트와 폰트 모델](text-font-model.md)의 두 입력 모드를 따른다.

```yaml
# 일반 모드: 사용자가 수정
translation:
  pages:
    - lines: ["첫 번째 번역 줄", "두 번째 번역 줄"]

# 고급 모드: 별도 line에서만 사용
translation_tokens:
  - {value: "첫 번째 번역 줄"}
  - {code_id: ctrl.newline}
  - {value: "두 번째 번역 줄"}
  - {code_id: ctrl.page_end}
  - {code_id: ctrl.end}
```

두 형태를 화자·대상 메타데이터와 함께 배치한 전체 예시는 [scene.sample.yml](samples/scene.sample.yml)을 참고한다. 한 line에는 `translation`, `translation_tokens`, `translation_ref` 중 정확히 하나만 둔다. 일반 모드의 compiler는 `lines`와 `pages`를 control code로 바꾸고 원본의 나머지 control skeleton을 보존한다. 고급 모드는 축약 token 입력이 번역 권위 값이며 compiler가 canonical type을 보충한 뒤 validator가 원본 skeleton과 비교한다.

`basis`는 `event_script`, `runtime_playback`, `contiguous_items`, `inferred`, `unknown`처럼 장면 묶음의 근거를 표시한다. `contiguous_items`는 연속 대사를 검수 편의상 묶었을 뿐 실제 게임 씬으로 확정한 것이 아님을 뜻한다. 화자와 대화 대상 귀속도 `embedded`, `event_script`, `runtime`, `inferred`, `unknown` 같은 근거와 확신도를 별도로 가진다. 추정 화자나 대상을 확정된 것처럼 기록하지 않는다.

`speaker_attribution.original_name`과 `translated_name`은 사용자가 ID를 찾아보지 않고도 장면을 읽기 위한 표시용 복사본이다. `entity_id`는 캐릭터·그룹·시스템의 정체와 관계를, `term_id`는 glossary의 원어·한국어 표시명을 가리킨다. 생성·검증 도구는 표시명이 `term_id` 기준값과 다르면 실패해야 한다. 원어 이름이 없는 시스템·그룹 화자는 `original_name: null`을 허용한다.

대화 대상은 없거나 한 명 이상일 수 있으므로 단일 `target` 대신 `targets` 목록을 사용한다. 개인은 `char.*`, 파티나 군중은 `group.party`, `group.public`, 자기 자신은 `self`, 시스템 대상은 `system`, 확인할 수 없는 대상은 `unknown`처럼 안정적인 ID를 사용한다. 여러 대상 중 말투 결정에 직접 영향을 주는 대상은 `primary: true`를 선택적으로 표시할 수 있으며 한 문장에서 최대 하나만 허용한다.

원본 token은 block JSONL에만 저장하고 scene에는 `source` locator와 읽기용 `original_preview`를 둔다. 검증 도구는 scene의 item ID와 source order가 block과 다르면 실패해야 한다. `playback_order`는 런타임에서 확인된 경우에만 기록한다. 생성된 번역 token과 preview는 `build/compiled-translations/`에 두고 서로 불일치하면 실패한다.

### 번역 검증

빌드 전에 최소한 다음을 자동 검증한다.

- 모든 `ref.*`, `term.*`, `char.*`, `sentence.*`, `block.*`, `line.*`, `scene.*` ID가 유일하다.
- 각 domain unit이 참조하는 block, line, entity와 term ID가 존재한다.
- 알려진 화자·대상의 `term_id`가 glossary에 있고 표시명이 기준값과 일치한다. 미확정 참여자는 공통 unknown term과 귀속 상태를 사용한다.
- `targets`는 중복 ID를 포함하지 않고 `primary: true`는 최대 하나다.
- 모든 `translation_ref`가 존재하고 공유 원문 또는 템플릿 변수 정의가 일치한다.
- 각 번역 unit에는 `translation`, `translation_tokens`, `translation_ref` 중 정확히 하나만 존재한다.
- 축약 token은 식별 key가 정확히 하나이고 모든 `code_id`가 control code catalog에 있으며, compiler가 생성한 canonical token에는 `type`이 존재한다.
- `translation_override`에는 비어 있지 않은 `override_reason`이 있다.
- 패치 대상인 모든 block line에 정확히 하나의 domain 번역 또는 승인된 제외 기록이 연결된다.
- domain 파일의 source locator, item ID와 source order가 block과 일치한다.
- source order가 중복 없이 전체 원본 항목을 덮고 playback order는 확인된 항목에서만 유일하다.
- `approved` 단어 사전 표기가 모든 번역에서 일관되게 사용된다.
- 화자와 복수 대상의 관계 조합에 맞는 캐릭터 말투 규칙이 적용되거나 예외 사유가 기록된다.
- 구조화 token schema, control skeleton, 변수 치환, 줄/페이지, 최대 렌더 폭과 최대 줄 수를 위반하지 않는다.
- 인코딩 후 바이트 수, 압축 결과와 블록 슬롯 용량 예산을 위반하지 않는다.
- 추출 후 무변경 재빌드가 원본과 바이트 또는 문서화된 의미 수준에서 왕복 일치한다.
- 원본 디스크에서 재추출한 block JSONL이 추적된 권위 매핑과 일치한다.
- `status: approved`인 번역에는 미확정 용어, 허용되지 않은 `opaque` token과 해결되지 않은 주석이 없다.

번역 상태는 `untranslated`, `draft`, `reviewed`, `approved`, `blocked`, `excluded`를 사용한다. `reviewed`는 사람이 원문·문맥·표기를 검수한 상태, `approved`는 패치 빌드와 화면 QA에 사용할 수 있도록 승인된 상태, `blocked`는 화자·문맥·용어 또는 기술 제약이 해결되지 않은 상태다. `excluded`에는 범위 제외 사유와 승인자를 기록한다. 기본 흐름은 `untranslated → draft → reviewed → approved`이며 문제가 발견되면 이전 상태나 `blocked`로 되돌릴 수 있다. 화자 귀속 상태는 번역 상태와 별도로 관리한다. 상태 변경자와 시각을 `reviewed_by`, `reviewed_at`, `approved_by`, `approved_at`으로 기록한다.

### 릴리스 검증

최종 패치는 원본 이미지에서 재현 가능해야 하며 빌드된 한국어 이미지 자체를 배포하지 않는다. xdelta3, PPF 또는 custom adapter를 사용하는 경우 다음 절차를 릴리스의 필수 게이트로 둔다.

1. 모든 disk와 필수 dependency의 `accepted_hashes`가 비어 있지 않은지 확인한다.
2. 작업 PC의 실제 파일 해시가 accepted hash 중 하나와 일치하지 않으면 즉시 실패한다.
3. 검증된 깨끗한 원본에서 한국어 이미지를 결정적으로 빌드한다.
4. 각 디스크에 manifest가 지정한 adapter로 배포 패치를 생성한다.
5. 별도 임시 경로에서 dependency와 배포 패치를 순서대로 적용해 이미지를 복원한다.
6. 복원 이미지와 integration build 이미지의 SHA-256을 비교한다.
7. 불일치하면 릴리스를 실패시키고 패치 파일을 배포하지 않는다.
8. 패치, 적용 README, 선택 런타임 코드와 `SHA256SUMS.txt`를 배포 ZIP으로 묶는다.
9. ZIP 내부 파일명, 개수, 버전, 체크섬과 UTF-8 경로명을 다시 검증한다.
10. [품질, 보안과 작업 계획](quality-operations.md)의 정량 coverage를 충족하도록 런타임 회귀 테스트한다.

릴리스 도구는 실패한 실행이 이전 버전의 오래된 산출물을 다시 배포하지 못하게 대상 버전의 staging 파일을 먼저 제거하거나 새 임시 디렉터리에서 원자적으로 생성한다. `manifest.json`, README, 패치 파일명, 릴리스 디렉터리와 변경 기록의 버전이 다르면 실패해야 한다. PPF 등 다른 패치 형식을 사용하더라도 원본 식별, 적용 후 해시, 배포물 체크섬과 대표 실행 검증 원칙은 동일하다.
