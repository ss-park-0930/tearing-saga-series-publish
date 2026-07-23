# 티어링 사가 1편 용어 사전

패치가 완성되기 전까지 캐릭터·무기·아이템·클래스·스킬의 기준 표기는 일본어 게임 원문입니다. 한국어 번역은 확정값이 아니라 나중에 교체할 후보로만 보관합니다.

현재 우선순위는 다음과 같습니다.

1. `fixed_executable`에서 추출한 일본어 게임 원문
2. 실제 한국어 패치의 `translate/translations.tsv`에서 사용한 표기(참고값)
3. `dialogue_book_legacy.tsv`의 일본어·한국어 화자 이름 대응(참고값)
4. 국내 게임잡지 스캔을 직접 판독한 표기(참고값)

`translations.tsv`의 `fixed_executable` 행은 게임 UI의 원본 용어 목록이지만 현재 대부분 `untranslated/pending`입니다. 따라서 일본어 원명과 항목 순서를 얻는 근거로만 사용하고, 번역 완료로 간주하지 않습니다.

생성 데이터에서는 `canonicalJp`와 `displayName`이 일본어 원문이며, `provisionalKo`는 패치 완료 전에는 화면에 사용하지 않습니다.

## 한국어 후보 상태

- `confirmed-patch-usage`: 패치 번역 데이터에서 같은 한국어 표기가 두 번 이상 일관되게 사용됨
- `patch-candidate`: 패치 데이터에서 확인되지만 근거가 한 건이거나 후보가 충돌함
- `image-review-required`: UI 원문만 있고 한국어 표기는 잡지 이미지 확인이 필요함
- `manual-override`: 사람이 `trs1-overrides.json`에서 확정함

패치가 완료되면 최종 번역 문자열을 다시 추출해 `provisionalKo`를 한국어 표시명으로 승격합니다. 생성 파일을 직접 수정하지 않고 예외만 `trs1-overrides.json`에 기록합니다.
