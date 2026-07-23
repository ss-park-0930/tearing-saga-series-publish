import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const pilotDir = path.join(root, "research", "pilot", "trs1", "chapters");
const outputDir = path.join(root, "content", "trs1", "guides", "chapters");
const chapterData = JSON.parse(await readFile(path.join(root, "content", "trs1", "data", "chapters.json"), "utf8"));
const sourceConfig = JSON.parse(await readFile(path.join(root, "research", "sources.json"), "utf8"));
const sourceNames = new Map(sourceConfig.sources.map((source) => [source.id, source.name]));

const dictionaries = await Promise.all(
  ["trs1-characters.json", "trs1-equipment.json", "trs1-items.json", "trs1-classes.json", "trs1-skills.json"]
    .map(async (file) => JSON.parse(await readFile(path.join(root, "research", "terminology", file), "utf8")))
);
const entities = new Map(dictionaries.flatMap((dictionary) => dictionary.terms).map((term) => [term.id, term]));

const quote = (value) => JSON.stringify(String(value));
const yamlList = (values) => values.length ? values.map((value) => `  - ${value}`).join("\n") : "  []";
const factMap = (facts) => new Map(facts.map((fact) => [fact.field, fact]));

function sourcesFor(facts) {
  const byKey = new Map();
  for (const fact of facts) {
    for (const source of fact.sources) {
      const key = `${source.sourceId}|${source.url ?? ""}`;
      const entry = byKey.get(key) ?? { ...source, locators: new Set() };
      entry.locators.add(source.locator);
      byKey.set(key, entry);
    }
  }
  return [...byKey.values()];
}

function renderSources(sources) {
  return sources.map((source) => {
    const label = sourceNames.get(source.sourceId) ?? source.sourceId;
    const locations = [...source.locators].join("; ");
    return source.url
      ? `- [${label}](${source.url}) — ${locations} (확인: ${source.checkedAt})`
      : `- ${label} — ${locations} (확인: ${source.checkedAt})`;
  }).join("\n");
}

function renderRelated(ids) {
  return ids.map((id) => {
    const entity = entities.get(id);
    return entity ? `- ${entity.displayName} \`${id}\`` : `- \`${id}\``;
  }).join("\n");
}

function frontMatter(chapter, set, sourceIds) {
  const key = String(chapter.key).toLowerCase().padStart(2, "0");
  return `---
id: ${chapter.id}
game: trs1
category: chapters
chapter: ${quote(chapter.route ? `${chapter.number}${chapter.route}` : chapter.number)}
route: ${quote(chapter.route ?? "")}
slug: ${quote(`guides/chapters/${key}`)}
title: ${quote(`${chapter.route ? `${chapter.number}${chapter.route}` : chapter.number}장 - ${chapter.titleKo}`)}
titleJp: ${quote(chapter.titleJp)}
status: draft
sourceIds:
${yamlList(sourceIds)}
relatedIds:
${yamlList(set.relatedEntityIds)}
lastVerified: ${quote(set.generatedAt)}
---`;
}

function chapter01(map) {
  const initial = map.get("units.initialPlayable").value.join(", ");
  const rewards = map.get("rewards.villages").value.map((item) => `- ${item}`).join("\n");
  const choice = map.get("postMap.vergeChoice").value;
  return `# 1장 - 웰트 상륙

> 현재 캐릭터·무기·아이템·스킬은 일본어 게임 원문으로 표시합니다. 한국어 패치가 완성되면 표시명만 교체합니다.

## 전투 개요

- 지형: ${map.get("map.terrain").value}
- 승리 조건: ${map.get("objective.victory").value}
- 초기 조작 유닛: ${initial}

## 반드시 확인할 요소

- 도개교는 ${map.get("events.bridgeLowersTurn").value}턴에 내려옵니다.
- リュナン으로 サーシャ와 대화하면 サーシャ와 ケイト가 함께 합류합니다.
- 도개교가 내려오기 전 항구의 민가와 훈련소를 모두 확인합니다.

## 추천 진행 순서

1. 1~4턴에는 네 명을 나눠 민가와 훈련소를 방문합니다.
2. リュナン은 4턴 종료 전에 도개교 가까이에 배치합니다.
3. 5턴에 다리가 내려오면 サーシャ에게 곧바로 접근해 두 NPC를 합류시킵니다.
4. 합류 후 적을 정리합니다. 보스는 아머 계열이므로 특효 무기를 이용하면 안전합니다.

## 민가와 훈련소

${rewards}

## 클리어 후 ヴェルジェ 선택

- 다음 네 명 중 한 명 선택: ${choice.chooseOne.join(", ")}
- 자동 합류: ${choice.automaticJoins.join(", ")}

이 선택은 이후 이벤트와 연결되므로 캐릭터 성능만 보고 결정하지 않는 편이 좋습니다. 선택별 장기 영향은 별도 가이드에서 다룹니다.`;
}

function chapter02(map) {
  const plum = map.get("recruitment.plum").value;
  const mirror = map.get("rewards.lansMirror").value;
  const staff = map.get("postMap.defenceStaffCondition").value;
  return `# 2장 - 산적토벌

> 민가 방문 순서가 보상과 プラム 영입에 직접 영향을 줍니다. 일본어 원문 표기를 기준으로 작성했습니다.

## 전투 개요

- 지형: ${map.get("map.terrain").value}
- 승리 조건: ${map.get("objective.victory").value} — 현재 단일 출처 확인
- 초기 아군/NPC 핵심 인물: ${map.get("units.initialAllies").value.join(", ")}
- 적 증원: ${map.get("enemy.reinforcementTurns").value.join("~")}턴 — 턴 수는 현재 단일 출처 확인

## 반드시 확인할 요소

- 기동력이 높은 유닛을 마을 쪽으로 보내 도적에게 민가가 파괴되지 않게 합니다.
- バーツ는 エンテ가 집중 공격을 받지 않도록 앞을 막는 역할을 맡습니다.
- 민가를 다른 유닛으로 먼저 방문하면 연속 보상이나 영입이 끊길 수 있습니다.

## プラム 영입 순서

1. ${plum.firstVisitor}가 해당 민가를 방문해 ${plum.priorReward}를 받습니다.
2. 같은 민가를 ${plum.secondVisitor}로 방문하면 ${plum.joins}이 합류합니다.
3. 다른 민가는 ${mirror.visitorOrder.join(" → ")} 순서로 방문해 ${mirror.reward}를 얻습니다.

## 클리어 후 보상

- ヴェルジェ 귀환 후 군자금 ${map.get("postMap.gold").value.toLocaleString("ko-KR")}G
- ${staff.reward} 이벤트

> 검수 필요: ${staff.reward}의 정확한 조건이 출처마다 다릅니다. RRPG는 ${staff.possibleAdditionalRequirement} 입수를 추가 조건으로 적지만 다른 출처는 ${staff.required.join("와 ")}의 존재만 명시합니다.`;
}

function chapter03(map) {
  const deployment = map.get("deployment.maxUnits").value;
  const rewards = map.get("rewards.villages").value.map((item) => `- ${item}`).join("\n");
  const narcus = map.get("events.narcus").value;
  return `# 3장 - 조우전

> 적 턴부터 시작하는 전투입니다. 초기 배치와 민가 보호를 먼저 고려합니다.

## 전투 개요

- 지형: ${map.get("map.terrain").value}
- 승리 조건: ${map.get("objective.victory").value} — 현재 단일 출처 확인
- 첫 행동 진영: 적군
- 馬賊 증원: ${map.get("enemy.reinforcementTurn").value}턴

> 검수 필요: 출격 상한은 RRPG가 ${deployment.rrpg}명, 게임 공략 천마기사단이 ${deployment.pegasusKnight}명으로 기록해 충돌합니다. 실제 게임 확인 전에는 확정하지 않습니다.

## 반드시 확인할 요소

- 강한 유닛으로 벽을 만들고 첫 적 턴의 집중 공격을 분산합니다.
- 3턴 증원은 마을을 우선하므로 도개교 부근에서 길을 막아 민가를 보호합니다.
- ${narcus.location}는 반드시 ${narcus.visitor}으로 방문해 ナルサス 이벤트를 발생시킵니다.
- 클리어 후 ガロ와 ジュリア 이벤트에서 「${map.get("postMap.garoJuliaSupport").value.choice}」를 선택하면 두 사람의 지원 효과가 증가합니다.

## 민가 보상

${rewards}

## 진행 순서

1. 초기 배치에서 방어력이 높은 유닛을 전면에 둡니다.
2. 첫 적 턴을 버틴 뒤 전열을 유지하면서 민가 방문 인원을 분리합니다.
3. 3턴 증원이 마을에 접근하지 못하도록 도개교와 길목을 차단합니다.
4. ナルサス 이벤트를 확인한 뒤 보스를 유인해 집중 공격합니다.`;
}

const renderers = { "01": chapter01, "02": chapter02, "03": chapter03 };
await mkdir(outputDir, { recursive: true });

for (const key of Object.keys(renderers)) {
  const set = JSON.parse(await readFile(path.join(pilotDir, `${key}.facts.json`), "utf8"));
  const chapter = chapterData.chapters.find((entry) => entry.id === set.subjectId);
  if (!chapter) throw new Error(`Missing chapter metadata for ${set.subjectId}`);
  const sources = sourcesFor(set.facts);
  const sourceIds = [...new Set(sources.map((source) => source.sourceId))];
  const body = renderers[key](factMap(set.facts));
  const output = `${frontMatter(chapter, set, sourceIds)}

${body}

## 출처와 검수 기록

${renderSources(sources)}
`;
  await writeFile(path.join(outputDir, `${key}.md`), output, "utf8");
}

console.log("Generated pilot guides for chapters 01-03.");
