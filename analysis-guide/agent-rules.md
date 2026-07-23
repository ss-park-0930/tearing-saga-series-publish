# AI Agent 작업 규칙

[상위 가이드로 돌아가기](../ANALYSIS_GUIDE.md)

이 문서는 다른 가이드의 규칙을 반복하지 않는다. Agent는 현재 작업에 필요한 권위 문서만 읽고, 규칙을 변경할 때 해당 권위 문서 한 곳만 수정한다.

## 권위 문서 선택

| 작업 | 반드시 읽을 문서 |
|---|---|
| 모든 작업 | `ANALYSIS_GUIDE.md`의 기본 원칙과 역할 분담 |
| 저장소 생성, 환경 설정, manifest, 경로 | [프로젝트 구조와 초기 설정](project-structure.md) |
| 주소, 함수, 구조체, 포맷, 증거 상태 | [정적 분석과 포맷 분석](analysis-workflow.md) |
| Ghidra, DuckStation, PCSX2, 런타임 캡처 | [도구와 런타임 디버깅](tools-debugging.md) |
| 디스크, 트랙, dependency, block, write-set, 패치 형식 | [디스크, 블록과 패치 쓰기 모델](media-patch-model.md) |
| token, control, 번역 domain, 폰트 | [구조화 텍스트와 폰트 모델](text-font-model.md) |
| glossary, characters, shared sentence와 번역 검수 | [번역 데이터와 릴리스](translation-patch.md) |
| QA, 보고서, schema migration, 보안, work plan | [품질, 보안과 작업 계획](quality-operations.md) |
| 작업 시작·완료 판정 | [단계별 Definition of Done](phase-gates.md) |

작업이 여러 영역을 건드리면 해당 문서들을 함께 읽는다. 모든 상세 문서를 매번 읽을 필요는 없다.

## 공통 응답 규칙

- 결론과 현재 상태를 먼저 쓰고 근거를 뒤에 적는다.
- 확인한 사실, 직접 관찰과 해석을 구분한다.
- 주소에는 VA, GHA, FO, DO, LBA, RO 접두어를 붙인다.
- 검증하지 못한 내용을 성공이나 확정으로 표현하지 않는다.
- 원본 디스크는 읽기 전용으로 취급한다.
- 대형 파일 생성, RAM 쓰기, 저장 상태 변경과 패치 이미지 쓰기 전에 대상과 복원 방법을 확인한다.
- 실패 원인, 미확인 항목과 다음 검증 실험을 남긴다.
- 현재 Phase의 Definition of Done을 통과하지 못했으면 완료라고 보고하지 않는다.
- 작업 종료 시 해당 `plan/*.yml`의 step 상태·진척률·evidence와 `plan/INDEX.md`를 갱신한다.
- 출처 불명 실행 파일은 host에서 직접 실행하지 않는다.

## 작업 시작 프롬프트

```text
ANALYSIS_GUIDE.md를 먼저 읽고 현재 작업에 필요한 상세 가이드만 추가로 읽어라.

현재 Phase: <0~8>
현재 목표: <구체적인 결과>
대상 disk_id: <manifest의 disk id>
대상 파일/블록: <경로 또는 ID>
판본/시리얼: <값>
확인된 SHA-256: <값>
기존 분석 결과: <analytics/result 문서와 anchor>
허용된 쓰기: <없음 / RAM 범위 / 작업 이미지 / 소스 파일>
필수 검증: <명령 또는 Phase gate>
사용자 조작이 필요한 시점: <없음 또는 READY 조건>

결과에는 수행 명령, 생성·수정 파일, 검증 결과, 미확인 사항과 다음 단계를 포함하라.
```

## 완료 보고 형식

```markdown
### 결과
<완료한 내용>

### 검증
- Phase: <번호와 이름>
- 명령: `...`
- 결과: PASS / FAIL / NOT RUN
- 입력 해시: <필요한 경우>
- 출력 해시: <필요한 경우>

### 기록
- 분석 문서: <파일#anchor>
- 원시 수집물: <analytics/temp 경로>
- 변경 파일: <경로>

### 남은 사항
- <UNKNOWN, BLOCKED 또는 다음 단계>
```

## 금지되는 완료 판정

- 도구가 실행되었다는 이유만으로 분석이 완료되었다고 하지 않는다.
- dry-run이 통과했다는 이유로 실제 이미지 빌드나 런타임 QA가 통과했다고 하지 않는다.
- xdelta, PPF 또는 custom patch가 생성되었다는 이유로 왕복 검증과 accepted hash 검증을 생략하지 않는다.
- 일부 대표 장면만 확인하고 전체 번역이 승인되었다고 하지 않는다.
- 사용자 확인이 필요한 화면 결과를 Agent 추정만으로 PASS 처리하지 않는다.
