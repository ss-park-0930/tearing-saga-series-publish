# 도구와 런타임 디버깅

[상위 가이드로 돌아가기](../ANALYSIS_GUIDE.md)

## 표준 도구 구성과 Ghidra 자동화

이 프로젝트의 기본 분석 구성은 다음과 같다.

```text
Ghidra
|-- analyzeHeadless           # 최초 가져오기, 전체 분석과 일괄 내보내기
`-- PyGhidra                  # Agent의 대화식 함수/참조/자료형 질의

DuckStation
`-- GDB Server               # PS1 레지스터, 메모리, 브레이크포인트와 실행 제어

PCSX2
|-- PINE                     # PS2 메모리와 저장 상태 자동화
|-- GUI Debugger             # 브레이크포인트, 레지스터와 단일 스텝
`-- .sym                     # Ghidra 함수명을 PCSX2에 전달

Python Agent
|-- 도구 연결 어댑터
|-- 헥스, 해시와 파일 비교
|-- 추출, 삽입과 재빌드
`-- 자동 테스트와 결과 기록
```

ImHex, BinDiff 및 별도 헥스/바이너리 비교 도구는 기본 요구사항으로 두지 않는다. Python과 Ghidra로 확인하기 어려운 문제가 생겼을 때 선택적으로 추가한다.

출처 불명 패치 EXE와 기존 제작 도구는 host에서 직접 실행하지 않는다. 정적 추출을 우선하고 실행이 불가피하면 [알 수 없는 실행 파일 안전 규칙](quality-operations.md#알-수-없는-실행-파일-안전-규칙)을 따른다.

### Agent 자동화 경계

| 도구 | Agent가 자동 수행 가능 | 기본적으로 불가능하거나 사용자 필요 |
|---|---|---|
| `analyzeHeadless` | 설치된 CLI 실행, import, 분석, 스크립트와 export | 실행 중 게임 디버깅, 열린 프로젝트 동시 수정 |
| PyGhidra | 닫힌/허용된 프로젝트 조회, 심볼·자료형·주석 갱신 | 다른 Ghidra 프로세스가 잠근 프로젝트 쓰기 |
| DuckStation GDB | 서버가 활성화된 경우 레지스터·메모리 읽기, 지원되는 breakpoint와 실행 제어 | 에뮬레이터 설정 변경, 저장 상태 선택과 화면 조작은 별도 UI 자동화 없이는 사용자 담당 |
| PCSX2 PINE | 해당 버전 API가 제공하는 메모리 읽기·쓰기와 저장 상태 명령 | CPU breakpoint, single-step, GUI Debugger 조작 |
| PCSX2 GUI Debugger | 사용자가 설정한 breakpoint 결과를 받아 분석 | 공식 원격 제어가 없는 GUI를 Agent가 직접 조작한다고 가정하지 않음 |
| 화면 검증 | 제공된 스크린샷·로그·메모리 결과 분석 | 사용자가 보지 않은 실제 화면 상태를 추정만으로 확정 |

`doctor`는 `toolchain.lock.json`의 정확한 버전으로 연결·읽기·일시정지 등 필요한 capability probe를 실행하고 결과를 기록한다. 표의 기능이 버전에서 지원되지 않으면 자동화를 약속하지 않고 사용자 수동 단계로 전환한다. UI 자동화는 별도 구현과 테스트가 있는 경우에만 사용한다.

모든 어댑터는 읽기 전용으로 시작한다. 원본 이미지 쓰기는 금지하며 RAM, 저장 상태와 작업 이미지 쓰기는 사용자가 승인한 주소·범위·시점에서만 수행하고 이전 값과 복원 방법을 로그에 남긴다.

### analyzeHeadless

`analyzeHeadless`는 명령행 배치 작업에 사용한다.

- 실행 파일 최초 가져오기와 전체 자동 분석
- 여러 판본 또는 여러 실행 파일 일괄 처리
- 함수, 문자열, 참조와 심볼 정기 내보내기
- CI 또는 재현 가능한 분석 파이프라인
- 분석 프로세스 실패 격리

Windows 예시 구조:

```bat
"C:\Tools\ghidra\support\analyzeHeadless.bat" ^
  "D:\game-re\analytics\temp\ghidra-projects" GAME_MAIN ^
  -import "D:\game-re\analytics\temp\extracted\MAIN.EXE" ^
  -scriptPath "D:\game-re\analytics\tools\ghidra" ^
  -postScript ExportAnalysis.java ^
  -analysisTimeoutPerFile 1800
```

실제 경로, 프로젝트명, 로더와 프로세서 옵션은 설치 버전과 대상 형식에 맞춰 조정한다. 명령을 실행하기 전에 AI는 기존 프로젝트 덮어쓰기 여부와 출력 위치를 확인해야 한다.

### PyGhidra

PyGhidra는 Python Agent가 Ghidra API를 직접 사용해 이미 분석된 프로젝트를 대화식으로 조회할 때 사용한다.

- 현재 PC가 속한 함수 조회
- 지정한 함수의 디컴파일과 실제 어셈블리 가져오기
- 호출자, 피호출자와 데이터 교차 참조 조회
- 함수명, 주석, 자료형과 구조체 적용
- 에뮬레이터에서 얻은 런타임 주소를 Ghidra 심볼에 대응
- JSON, CSV와 PCSX2 `.sym` 파일 생성

### 선택 기준

| 작업 | 기본 선택 |
|---|---|
| 새 바이너리 가져오기 | `analyzeHeadless` |
| 전체 자동 분석 | `analyzeHeadless` |
| 여러 판본 일괄 처리 | `analyzeHeadless` |
| 함수 하나 즉시 조회 | PyGhidra |
| 런타임 PC를 함수명에 대응 | PyGhidra |
| 반복적인 참조 탐색 | PyGhidra |
| 정기 분석 보고서 생성 | 둘을 조합 |

권장 순서는 `analyzeHeadless`로 프로젝트를 생성하고 분석을 완료한 뒤, PyGhidra Agent가 해당 프로젝트를 열어 질의하는 방식이다. 같은 프로젝트를 두 프로세스가 동시에 쓰지 않는다. 일괄 재분석이 필요하면 PyGhidra 세션을 닫거나 읽기 전용 복제본을 사용한다.

자동 내보내기 권장 항목:

- 프로그램 메타데이터와 이미지 베이스
- 함수 주소, 크기, 이름과 호출 관계
- 문자열 주소, 인코딩과 참조 함수
- 데이터 심볼과 교차 참조
- 외부 함수 및 라이브러리 후보
- 선택한 함수의 디컴파일 코드와 어셈블리
- Ghidra 버전, 분석 옵션 및 스크립트 버전

## 에뮬레이터 연동 디버깅

### 공통 세션 절차

DuckStation과 PCSX2 모두 다음 사용자 경험을 목표로 한다.

```text
1. 사용자가 원하는 장면 직전의 저장 상태를 준비한다.
2. Agent가 대상 이미지, 저장 상태와 주소를 확인한다.
3. Agent가 심볼, 감시 주소와 브레이크포인트 후보를 준비한다.
4. Agent가 READY 상태를 알린다.
5. 사용자가 직접 게임을 조작해 원하는 장면으로 진입한다.
6. Agent가 정지 이벤트 또는 메모리 변화를 수집한다.
7. Agent가 Ghidra 심볼과 런타임 값을 연결한다.
8. 원시 수집물은 analytics/temp에 저장한다.
9. 수집물을 해석해 알게 된 내용만 상태와 함께 analytics/result에 기록한다.
10. 반복 실험은 같은 저장 상태에서 다시 시작한다.
```

Agent는 사용자의 조작이 필요한 시점에 `READY`, 이벤트를 기다릴 때 `WAITING`, 데이터를 수집할 때 `CAPTURING`, 완료했을 때 `COMPLETE` 상태를 명확히 알린다. 사용자가 게임을 조작하는 동안 임의로 메모리를 수정하거나 저장 상태를 교체하지 않는다.

### DuckStation

DuckStation은 GDB Remote Protocol을 기본 연결 수단으로 사용한다.

- 저장 상태는 사용자가 먼저 불러오거나, 검증된 UI/핫키 자동화가 있을 때 Agent가 불러온다.
- 저장 상태가 로드된 뒤 Agent가 GDB 서버에 연결하고 대상 주소를 확인한다.
- Agent는 레지스터와 메모리를 읽고 브레이크포인트, 일시정지, 재개와 단일 스텝을 사용한다.
- 사용자가 장면에 진입하면 브레이크포인트 정지 이벤트를 기준으로 함수 인자와 관련 버퍼를 수집한다.
- 연결이 끊기거나 저장 상태 로드로 런타임 상태가 바뀌면 주소와 브레이크포인트를 다시 검증한다.

권장 결과 파일:

```text
analytics/temp/emulator/duckstation/<session-id>.jsonl
analytics/temp/emulator/duckstation/<session-id>/memory-*.bin
analytics/result/runtime/<analysis-topic>.md  # 세션 결과를 기존 주제 문서에 반영
```

### PCSX2

PCSX2는 PINE과 GUI Debugger를 역할에 따라 함께 사용한다.

- PINE: 메모리 읽기/쓰기, 저장 상태 로드/저장과 반복 실험 자동화
- GUI Debugger: R5900/R3000 브레이크포인트, 레지스터, 디스어셈블과 단일 스텝
- `.sym`: Ghidra에서 확인한 함수명과 범위를 PCSX2로 전달

PINE은 완전한 원격 디버거 프로토콜로 가정하지 않는다. PINE에 노출되지 않은 브레이크포인트나 실행 제어는 사용자가 GUI Debugger에서 설정하거나, 검증된 GUI 자동화 또는 별도 브리지가 있을 때만 Agent가 처리한다.

권장 절차:

```text
1. Agent가 Ghidra 결과로 PCSX2용 .sym을 생성한다.
2. Agent 또는 사용자가 PCSX2에서 저장 상태를 불러온다.
3. Agent가 PINE 연결과 대상 메모리를 확인한다.
4. 필요한 브레이크포인트를 GUI Debugger에서 준비한다.
5. Agent가 READY 상태를 알린다.
6. 사용자가 원하는 장면으로 진입한다.
7. Agent가 PINE 메모리와 GUI 정지 시점의 정보를 수집한다.
8. 같은 저장 상태에서 조건을 바꿔 반복한다.
```

권장 결과 파일:

```text
analytics/temp/emulator/pcsx2/<session-id>.jsonl
analytics/temp/emulator/symbols/pcsx2-symbols.sym
analytics/temp/emulator/pcsx2/<session-id>/memory-*.bin
analytics/result/runtime/<analysis-topic>.md  # 세션별 새 문서 대신 주제 문서 갱신
```

### 연결 안전장치

- GDB와 PINE은 기본적으로 `127.0.0.1`에만 연결한다.
- Agent 어댑터는 읽기 전용 모드로 시작한다.
- 메모리 쓰기는 주소, 크기, 기존 값과 새 값을 로그에 남긴 뒤 수행한다.
- 모든 대기와 네트워크 명령에 시간 제한을 둔다.
- 저장 상태, 원시 메모리 덤프, 스크린샷, 생성 심볼과 세션 로그는 `analytics/temp/emulator/`에 둔다.
- `analytics/result/`의 세션 보고서에는 게임 판본, 이미지 SHA-256, 저장 상태 식별자, 사용한 주소, 결론의 상태와 재현 명령을 기록한다.
- 원본 디스크 이미지는 읽기 전용으로 취급한다.

## Python Agent와 바이너리 비교

Python Agent는 Ghidra와 에뮬레이터를 연결하고 다음 작업을 담당한다.

- DuckStation GDB 및 PCSX2 PINE 연결
- Ghidra 분석 결과와 런타임 주소 대응
- 헥스 덤프, 문자열 검색, 해시와 엔디언 해석
- 원본/패치본의 변경 구간 계산과 병합
- 포인터 테이블, 파일 구조와 압축 헤더 조사
- 추출기, 삽입기, 재빌더와 테스트 작성
- JSONL, CSV와 Markdown 결과 생성

데이터 파일의 헥스 및 바이트 비교는 기본적으로 Python 도구로 처리한다. 전체 ISO/BIN을 AI 대화에 직접 넣지 않고 스크립트가 변경 구간, 해시와 표본을 계산해 구조화된 결과만 제공한다.

실행 파일은 주소 이동과 코드 재배치 때문에 단순 바이트 비교만으로 판단하지 않는다. 함수 수준 비교에는 Ghidra Version Tracking, 함수 해시, 호출 관계와 자체 Ghidra 스크립트를 우선 사용한다. 이 방법으로 충분하지 않을 때만 BinDiff 같은 외부 도구를 추가한다.

ImHex 같은 GUI 헥스 도구도 필수로 설치하지 않는다. 사람이 대형 바이너리 구조를 시각적으로 확인하거나 AI가 제안한 포맷을 눈으로 검증해야 할 때 선택적으로 사용한다.

Agent 어댑터는 사람이 읽는 비정형 문장 대신 안정적인 JSON을 출력해야 한다.

```json
{
  "tool": "duckstation-gdb",
  "status": "stopped",
  "pc": "0x80041230",
  "registers": {
    "a0": "0x80120000",
    "a1": "0x00000004"
  },
  "evidence": "OBSERVED"
}
```

## PS1 주의사항

- `PS-X EXE`의 로드 주소와 진입점을 확인한다.
- MIPS 분기 지연 슬롯을 항상 실제 어셈블리에서 검토한다.
- 오버레이가 같은 RAM 주소에 번갈아 로드될 가능성을 고려한다.
- BIN/CUE의 트랙, 섹터 모드와 2352/2048바이트 차이를 확인한다.
- CD-ROM 파일 시스템 접근과 LBA 직접 접근을 구분한다.
- GPU 명령 패킷, VRAM 전송과 문자 렌더링을 혼동하지 않는다.
- 수정판 및 디럭스판 이식은 절대 주소보다 함수 특징과 논리 파일 오프셋을 우선한다.

## PS2 주의사항

- 메인 ELF의 실제 MIPS 언어 설정과 엔디언을 확인한다.
- Emotion Engine 코드와 IOP 모듈을 구분한다.
- DMA, GIF 패킷, VIF/VU 코드가 일반 C 디컴파일만으로 충분히 설명되지 않을 수 있다.
- ISO9660 파일 배치와 게임 자체 번들 포맷을 구분한다.
- 압축 해제 후 주소와 원본 파일 오프셋을 혼동하지 않는다.
- 메모리 할당 크기와 정렬 조건을 확인한 뒤 폰트나 스크립트 크기를 확장한다.
- 기존 번역 패치가 실행 파일, 번들, 폰트와 디스크 배치를 동시에 수정할 가능성을 고려한다.
