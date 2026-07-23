import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";

const projectRoot = path.resolve(import.meta.dirname, "..");
const trs1Root = path.resolve(process.argv[2] ?? "D:/dev/tear-ring-saga-korean");
const trs2Root = path.resolve(process.argv[3] ?? "D:/dev/berwick-saga-kor-patch");
const terminologyDir = path.join(projectRoot, "research", "terminology");
const dataDir = path.join(projectRoot, "src", "data");
const generatedAt = new Date().toISOString();

await mkdir(terminologyDir, { recursive: true });
await mkdir(dataDir, { recursive: true });

function recordNumber(record) {
  return Number(record.block_id?.match(/^FIX(\d+)$/)?.[1] ?? Number.NaN);
}

function inRanges(number, ranges) {
  return ranges.some(([start, end]) => number >= start && number <= end);
}

function readJsonLines(text) {
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function translationText(record) {
  return record.translation?.text_runs?.map((run) => run.value ?? "").join("") ?? "";
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const trs1Glossary = yaml.load(
  await readFile(path.join(trs1Root, "src", "translate", "glossary.yml"), "utf8"),
);
const trs1GlossaryByOriginal = new Map(
  (trs1Glossary.terms ?? [])
    .filter((term) => term.original)
    .map((term) => [term.original, term]),
);
const trs1Records = readJsonLines(
  await readFile(path.join(trs1Root, "src", "translate", "block", "strings.jsonl"), "utf8"),
).filter((record) => record.source?.source_kind === "fixed_executable");

const trs1Definitions = {
  weapons: {
    type: "weapon",
    ranges: [[24, 151]],
    output: "trs1-equipment.json",
  },
  items: {
    type: "item",
    ranges: [[152, 227]],
    output: "trs1-items.json",
  },
  classes: {
    type: "class",
    ranges: [[228, 380]],
    output: "trs1-classes.json",
  },
  characters: {
    type: "character",
    ranges: [[433, 611]],
    output: "trs1-characters.json",
  },
  skills: {
    type: "skill",
    ranges: [[750, 773], [833, 843]],
    output: "trs1-skills.json",
  },
};

const summary = {
  generatedAt,
  sources: {
    trs1: trs1Root.replaceAll("\\", "/"),
    trs2: trs2Root.replaceAll("\\", "/"),
  },
  games: {},
};

const trs1Summary = {};
for (const [entity, definition] of Object.entries(trs1Definitions)) {
  const seen = new Set();
  const terms = [];
  for (const record of trs1Records.filter((candidate) =>
    inRanges(recordNumber(candidate), definition.ranges)
  )) {
    const canonicalJp = String(record.original?.text ?? "").trim();
    if (!canonicalJp || /^ー+$/.test(canonicalJp) || seen.has(canonicalJp)) continue;
    seen.add(canonicalJp);

    const glossaryTerm = trs1GlossaryByOriginal.get(canonicalJp);
    const glossaryIsReviewed = ["approved", "source_backed"].includes(glossaryTerm?.status);
    const provisionalKo =
      (glossaryIsReviewed ? glossaryTerm.translation : null) ??
      String(record.translation?.text ?? "").trim() ??
      null;
    const koreanStatus = glossaryIsReviewed
      ? glossaryTerm.status
      : record.translation?.review_status === "approved"
        ? "approved-patch"
        : "patch-review-pending";

    terms.push({
      id: `trs1-${definition.type}-${record.block_id.toLowerCase()}`,
      game: "trs1",
      type: definition.type,
      sourceKey: record.block_id,
      canonicalJp,
      displayName: canonicalJp,
      displayLanguage: "ja",
      provisionalKo: provisionalKo || null,
      status: "japanese-canonical",
      koreanStatus,
      introduction:
        definition.type === "character"
          ? `${canonicalJp}의 이름과 대사 표기는 티어링 사가 한글패치 프로젝트의 일본어 원문 데이터를 기준으로 관리합니다.`
          : `${canonicalJp}의 명칭은 게임 고정 문자열에서 확인했으며, 한국어 표기는 패치 검수 상태와 함께 제공합니다.`,
      evidence: {
        source: "src/translate/block/strings.jsonl",
        translationStatus: record.translation?.translation_status ?? null,
        reviewStatus: record.translation?.review_status ?? null,
        glossaryTermId: glossaryTerm?.id ?? null,
        glossaryStatus: glossaryTerm?.status ?? null,
      },
    });
  }

  await writeJson(path.join(terminologyDir, definition.output), {
    game: "trs1",
    entity,
    generatedAt,
    source: {
      patchProject: trs1Root.replaceAll("\\", "/"),
      authority: "src/translate/block/strings.jsonl",
      glossary: "src/translate/glossary.yml",
      canonicalPolicy:
        "최종 패치 전까지 일본어 원문을 기준명으로 유지하고 최신 한국어 번역은 검수 상태와 함께 표시",
    },
    count: terms.length,
    terms,
  });
  trs1Summary[entity] = terms.length;
}

const trs2Glossary = yaml.load(
  await readFile(path.join(trs2Root, "src", "translate", "glossary.yml"), "utf8"),
);
const trs2CharactersConfig = yaml.load(
  await readFile(path.join(trs2Root, "src", "translate", "characters.yml"), "utf8"),
);
const trs2Profiles = new Map(
  (trs2CharactersConfig.characters ?? trs2CharactersConfig.entries ?? [])
    .map((profile) => [profile.name_term, profile]),
);

const trs2Characters = (trs2Glossary.terms ?? [])
  .filter((term) => term.category === "person" && term.original && term.translation)
  .map((term) => {
    const sourceKey =
      term.source?.member ??
      term.id.match(/\.([^.]+)$/)?.[1] ??
      term.id.replaceAll(".", "-");
    const profile = trs2Profiles.get(term.id);
    return {
      id: `trs2-character-${sourceKey}`,
      game: "trs2",
      type: "character",
      sourceKey,
      canonicalJp: term.original,
      displayName: term.translation,
      displayLanguage: "ko",
      provisionalKo: term.translation,
      status: "approved-patch-translation",
      koreanStatus: term.status,
      introduction:
        `${term.translation}(${term.original})의 이름은 베르위크 사가 한글패치 승인 용어집과 일본어 원문 대사 corpus를 기준으로 확정했습니다.`,
      profile: profile
        ? {
            register: profile.speech?.default?.register ?? null,
            honorific: profile.speech?.default?.honorific ?? null,
            firstPersonOriginal: profile.speech?.default?.first_person_original ?? null,
            utteranceCount:
              profile.speech?.default?.evidence?.utterance_count ??
              profile.source_evidence?.annotation_utterance_count ??
              null,
          }
        : null,
      evidence: {
        source: "src/translate/glossary.yml",
        termId: term.id,
        status: term.status,
      },
    };
  });

const nameTableDir = path.join(trs2Root, "src", "translate", "name_table");
const nameTableFiles = (await readdir(nameTableDir))
  .filter((file) => file.endsWith(".jsonl"))
  .sort();
const trs2ItemRecords = [];
for (const file of nameTableFiles) {
  const records = readJsonLines(await readFile(path.join(nameTableDir, file), "utf8"));
  for (const record of records) {
    const match = record.source?.legacy_id?.match(/namene\.ar:it(\d+)$/i);
    if (!match || record.status !== "approved") continue;
    trs2ItemRecords.push({ record, sourceKey: `it${match[1]}`, file });
  }
}

const trs2ItemByKey = new Map();
for (const { record, sourceKey, file } of trs2ItemRecords) {
  if (trs2ItemByKey.has(sourceKey)) continue;
  const canonicalJp = record.source_text_runs?.map((run) => run.japanese ?? "").join("") ?? "";
  const displayName = translationText(record);
  if (!canonicalJp || !displayName || /予備/.test(canonicalJp)) continue;
  trs2ItemByKey.set(sourceKey, {
    id: `trs2-item-${sourceKey}`,
    game: "trs2",
    type: "item",
    sourceKey,
    canonicalJp,
    displayName,
    displayLanguage: "ko",
    provisionalKo: displayName,
    status: "approved-patch-translation",
    koreanStatus: "approved",
    introduction:
      `${displayName}(${canonicalJp})은 베르위크 사가 일본어 원문 이름 테이블에서 확인하고 한글패치 프로젝트에서 승인한 장비·아이템 명칭입니다.`,
    evidence: {
      source: `src/translate/name_table/${file}`,
      recordId: record.id,
      approvedAt: record.approved_at ?? null,
      reviewer: record.reviewer ?? null,
    },
  });
}
const trs2Items = [...trs2ItemByKey.values()].sort((a, b) =>
  a.sourceKey.localeCompare(b.sourceKey, undefined, { numeric: true })
);

await writeJson(path.join(terminologyDir, "trs2-characters.json"), {
  game: "trs2",
  entity: "characters",
  generatedAt,
  source: {
    patchProject: trs2Root.replaceAll("\\", "/"),
    authority: "src/translate/glossary.yml",
  },
  count: trs2Characters.length,
  terms: trs2Characters,
});
await writeJson(path.join(terminologyDir, "trs2-items.json"), {
  game: "trs2",
  entity: "items",
  generatedAt,
  source: {
    patchProject: trs2Root.replaceAll("\\", "/"),
    authority: "src/translate/name_table/*.jsonl",
    scope: "namene.ar의 itNNN 승인 명칭을 장비·아이템으로 통합",
  },
  count: trs2Items.length,
  terms: trs2Items,
});

summary.games.trs1 = trs1Summary;
summary.games.trs2 = {
  characters: trs2Characters.length,
  items: trs2Items.length,
  guides: 0,
};

await writeJson(path.join(terminologyDir, "patch-project-import-summary.json"), summary);
await writeJson(path.join(dataDir, "catalog-summary.json"), summary);
console.log(JSON.stringify(summary, null, 2));
