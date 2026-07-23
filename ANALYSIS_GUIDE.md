# AI 기반 게임 리버스 엔지니어링 가이드

이 문서는 Ghidra, DuckStation, PCSX2와 AI 코딩 도구(Codex, Claude Code 등)를 함께 사용해 콘솔 게임을 분석하고 번역 패치를 제작하기 위한 범용 작업 지침이다. PS1과 PS2를 중심으로 설명하지만 다른 플랫폼에도 같은 원칙을 적용할 수 있다. 한글화에 필요한 실행 코드, 런타임 상태, 문자열, 스크립트, 폰트, 압축 및 디스크 구조 분석을 우선하며, 특정 게임에 종속된 규칙은 해당 프로젝트의 별도 문서에 기록한다.

AI는 이 문서를 프로젝트 지침으로 읽고 따라야 한다. 분석의 목적은 그럴듯한 설명을 만드는 것이 아니라, 재현 가능한 증거를 축적하고 안전한 패치 제작으로 연결하는 것이다.

## 1. 기본 원칙

1. Ghidra의 디컴파일 결과를 원본 소스 코드로 취급하지 않는다.
2. AI의 함수명, 변수명, 자료형 및 알고리즘 설명은 검증 전까지 가설이다.
3. 모든 중요한 결론에는 주소, 파일, 판본, 근거와 검증 방법을 기록한다.
4. 디컴파일 코드만 보지 말고 해당 위치의 실제 대상 CPU 어셈블리를 함께 확인한다.
5. 원본 파일은 절대 직접 수정하지 않는다. 복사본과 생성물을 별도 디렉터리에 둔다.
6. 분석 시작 전에 대상 파일의 SHA-256과 크기를 기록한다.
7. 파일 오프셋, 디스크 오프셋, LBA, RAM 주소, Ghidra 주소를 명확히 구분한다.
8. 정적 분석 결과는 가능한 경우 에뮬레이터 디버거 또는 바이트 단위 테스트로 검증한다.
9. 자동 분석이 실패하거나 모호하면 억지로 결론을 내리지 말고 미확인 상태로 남긴다.
10. 저작권이 있는 원본 게임 데이터는 저장소나 배포 패키지에 포함하지 않는다.

## 2. 역할 분담

### Ghidra가 담당할 일

- 명령어 디코딩과 함수 경계 분석
- 제어 흐름과 호출 관계 생성
- 문자열, 전역 데이터 및 교차 참조 탐색
- 함수, 변수, 구조체 및 enum 관리
- 디컴파일과 실제 어셈블리 비교
- 분석 결과를 스크립트로 내보내기

### DuckStation과 PCSX2가 담당할 일

- 저장 상태를 기준으로 동일 장면 반복 실행
- 실행 중 CPU 레지스터와 메모리 상태 제공
- 브레이크포인트, 메모리 감시와 실행 흐름 검증
- Ghidra에서 세운 정적 분석 가설의 동적 검증
- 패치 적용 후 화면, 이벤트와 저장/로드 동작 확인

### AI Agent가 담당할 일

- 함수와 데이터 구조의 의미에 대한 가설 제시
- 가설의 근거와 반증 가능성 정리
- analyzeHeadless, PyGhidra와 GhidraScript 자동화
- DuckStation GDB와 PCSX2 PINE 어댑터 운영
- Ghidra 심볼과 런타임 주소 대응
- 바이너리 파서, 추출기, 삽입기 및 비교 도구 작성
- 크롤링 원문과 게임 원문에서 참고 지식, 단어 사전과 캐릭터 말투 후보 추출
- block, scene, glossary, character와 reference ID 연결 검증
- 여러 판본과 원본/패치본의 차이 분류
- 테스트, 보고서 및 데이터 사전 생성
- 다음에 확인할 주소, 브레이크포인트 및 실험 제안과 결과 수집

### 사람이 담당할 일

- 분석 목표와 우선순위 결정
- 원하는 장면 직전의 저장 상태 준비
- Agent의 `READY` 알림 후 게임을 직접 조작해 목표 장면 진입
- Ghidra 로더 및 메모리 맵 설정 검토
- 중요한 디컴파일 결과를 어셈블리로 확인
- Agent가 수집한 에뮬레이터 결과와 실제 화면 검증
- 단어 사전, 캐릭터 관계별 말투와 장면 번역 검토
- 번역과 화면 품질 판단
- 최종 패치의 전체 플레이 테스트와 배포 승인


## 3. 상세 가이드

긴 절차와 스키마는 역할별 문서로 분리한다. AI Agent는 작업 목표에 필요한 문서만 읽되, 처음 참여할 때는 이 문서와 프로젝트 구조 문서를 먼저 읽는다.

| 문서 | 내용 |
|---|---|
| [프로젝트 구조와 초기 설정](analysis-guide/project-structure.md) | 디렉터리, manifest, Git 제외 경로, Python·xdelta3 설치와 환경 진단 |
| [정적 분석과 포맷 분석](analysis-guide/analysis-workflow.md) | 대상 식별, 주소, 증거 수준, 함수·구조체·바이너리 비교 |
| [도구와 런타임 디버깅](analysis-guide/tools-debugging.md) | Ghidra, analyzeHeadless, PyGhidra, DuckStation과 PCSX2 |
| [디스크, 블록과 패치 쓰기 모델](analysis-guide/media-patch-model.md) | 트랙, dependency, container chain, write-set, PPF/xdelta와 EDC/ECC |
| [구조화 텍스트와 폰트 모델](analysis-guide/text-font-model.md) | 번역 domain, token AST, control skeleton과 font profile |
| [번역 데이터와 릴리스](analysis-guide/translation-patch.md) | 참고 자료, glossary, characters, shared sentences와 번역 검수 |
| [단계별 Definition of Done](analysis-guide/phase-gates.md) | Bootstrap부터 릴리스까지 단계별 산출물과 통과 조건 |
| [품질, 보안과 작업 계획](analysis-guide/quality-operations.md) | 정량 QA, 보고서, migration, toolchain, EXE 격리와 plan 디렉터리 |
| [AI Agent 작업 규칙](analysis-guide/agent-rules.md) | 작업별 필독 문서 선택, 최소 프롬프트와 완료 보고 형식 |

## 4. 표준 작업 흐름

```text
환경 진단
  → 원본 이미지와 해시 확인
  → analytics/temp에서 정적·동적 분석
  → analytics/result의 주제별 문서와 INDEX 갱신
  → 전체 원문과 참고 자료 정리
  → glossary·characters·shared_sentences 작성
  → domain별 YAML/JSONL 번역과 구조화 token 검수
  → block JSONL 결정적 재추출·검증
  → write-set과 patch plan 생성·충돌 검사
  → 패치 빌드와 왕복 검증
  → 에뮬레이터 회귀 테스트
  → release 배포물과 체크섬 생성
```

## 5. 문서 사용 원칙

- 원시 분석물과 바이너리는 `analytics/temp/`, 검토된 지식만 `analytics/result/`에 둔다.
- 분석 결과는 파일 경로와 명시적 anchor로 참조하고 `INDEX.md`에 상태, 시각과 요약을 기록한다.
- 상태는 `FACT`, `OBSERVED`, `LIKELY`, `HYPOTHESIS`, `UNKNOWN`, `SUPERSEDED`를 사용한다.
- 사람이 편집하는 번역의 기준은 domain별 YAML/JSONL이며 block JSONL은 원본에서 결정적으로 추출한 논리 매핑, `build/patch-plan`은 실제 byte 쓰기 목록이다.
- 용어, 캐릭터, 반복 문장과 패치 위치는 안정적인 ID로 연결한다.
- 설치, 분석, 번역과 릴리스 규칙을 바꾸면 해당 상세 문서와 이 목차를 함께 갱신한다.
