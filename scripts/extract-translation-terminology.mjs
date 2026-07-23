import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const translationRoot = path.resolve(process.argv[2] ?? "D:/dev/tear-ring-saga-korean/translate");
const mainFile = path.join(translationRoot, "translations.tsv");
const speakerFile = path.join(translationRoot, "candidates", "dialogue_book_legacy.tsv");
const terminologyDir = path.join(projectRoot, "research", "terminology");
const overridesFile = path.join(terminologyDir, "trs1-overrides.json");

function parseTsv(text) {
  const records = [];
  let record = [];
  let field = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (inQuotes && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "\t" && !inQuotes) {
      record.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      record.push(field);
      field = "";
      if (record.some((value) => value !== "")) records.push(record);
      record = [];
    } else {
      field += char;
    }
  }
  if (field || record.length) {
    record.push(field);
    records.push(record);
  }
  const [headers, ...rows] = records;
  headers[0] = headers[0].replace(/^\uFEFF/, "");
  return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function fixedNumber(row) {
  return Number(row.string_id?.match(/^FIX(\d+)$/)?.[1] ?? Number.NaN);
}

function stripControls(value) {
  return String(value ?? "").replace(/\{[0-9A-F]+\}/gi, "").trim();
}

function inRanges(number, ranges) {
  return ranges.some(([start, end]) => number >= start && number <= end);
}

function cleanCandidate(value) {
  return String(value ?? "")
    .replace(/[!！?？.…·~～]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function usableKorean(value) {
  return value && value.length <= 40 && /[가-힣]/.test(value) && !/[ぁ-んァ-ヶ一-龯]/.test(value);
}

function countCandidates(values) {
  const counts = new Map();
  for (const rawValue of values) {
    const value = cleanCandidate(rawValue);
    if (!usableKorean(value)) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([ko, count]) => ({ ko, count }))
    .sort((a, b) => b.count - a.count || a.ko.localeCompare(b.ko, "ko"));
}

const mainRows = parseTsv(await readFile(mainFile, "utf8"));
const speakerRows = parseTsv(await readFile(speakerFile, "utf8"));
const overrides = JSON.parse(await readFile(overridesFile, "utf8"));
const fixedRows = mainRows.filter((row) => row.source_kind === "fixed_executable" && row.japanese_text);

const definitions = {
  weapons: { type: "weapon", ranges: [[24, 151]], output: "trs1-equipment.json", scanFiles: ["page_006.jpg", "page_007.jpg"] },
  items: { type: "item", ranges: [[152, 227]], output: "trs1-items.json", scanFiles: ["page_008.jpg"] },
  classes: { type: "class", ranges: [[228, 380]], output: "trs1-classes.json", scanFiles: ["page_009.jpg", "page_010.jpg"] },
  characters: { type: "character", ranges: [[433, 611]], output: "trs1-characters.json", scanFiles: ["page_009.jpg"] },
  skills: { type: "skill", ranges: [[750, 773], [833, 843]], output: "trs1-skills.json", scanFiles: ["page_005.jpg", "page_009.jpg"] }
};

await mkdir(terminologyDir, { recursive: true });
const summary = { generatedAt: new Date().toISOString(), translationRoot, entities: {} };

for (const [entity, definition] of Object.entries(definitions)) {
  const sourceRows = fixedRows.filter((row) => inRanges(fixedNumber(row), definition.ranges));
  const seenJapanese = new Set();
  const terms = [];
  for (const row of sourceRows) {
    const japanese = stripControls(row.japanese_text);
    if (!japanese || /^ー+$/.test(japanese) || seenJapanese.has(japanese)) continue;
    seenJapanese.add(japanese);

    const exactLineEvidence = mainRows.filter((candidate) =>
      candidate.korean_text && stripControls(candidate.japanese_text) === japanese
    );
    const speakerEvidence = entity === "characters"
      ? speakerRows.filter((candidate) => stripControls(candidate.speaker_jp) === japanese && candidate.speaker_ko)
      : [];
    const candidates = countCandidates([
      ...speakerEvidence.map((candidate) => candidate.speaker_ko),
      ...exactLineEvidence.map((candidate) => candidate.korean_text)
    ]);
    const override = overrides[entity]?.[japanese] ?? null;
    const top = candidates[0] ?? null;
    const hasConflict = candidates.length > 1 && candidates[1].count === top?.count;
    const provisionalKo = override ?? (!hasConflict ? top?.ko ?? null : null);
    let koreanStatus = "image-review-required";
    if (override) koreanStatus = "manual-override";
    else if (provisionalKo && top.count >= 2) koreanStatus = "confirmed-patch-usage";
    else if (provisionalKo || candidates.length) koreanStatus = "patch-candidate";

    terms.push({
      id: `trs1-${definition.type}-${row.string_id.toLowerCase()}`,
      game: "trs1",
      type: definition.type,
      sourceKey: row.string_id,
      canonicalJp: japanese,
      displayName: japanese,
      displayLanguage: "ja",
      provisionalKo,
      status: "japanese-canonical",
      koreanStatus,
      evidence: {
        fixedExecutable: {
          translationStatus: row.translation_status,
          reviewStatus: row.review_status
        },
        patchCandidates: candidates.slice(0, 8),
        speakerOccurrences: speakerEvidence.length,
        exactLineOccurrences: exactLineEvidence.length,
        scanFiles: definition.scanFiles
      }
    });
  }

  const koreanCandidateCounts = terms.reduce((result, term) => {
    result[term.koreanStatus] = (result[term.koreanStatus] ?? 0) + 1;
    return result;
  }, {});
  const output = {
    game: "trs1",
    entity,
    generatedAt: summary.generatedAt,
    source: {
      patchTranslations: mainFile.replaceAll("\\", "/"),
      speakerMap: entity === "characters" ? speakerFile.replaceAll("\\", "/") : null,
      canonicalPolicy: "패치 완료 전 일본어 원문을 표시명으로 사용하고 한국어는 후보로만 보존"
    },
    count: terms.length,
    koreanCandidateCounts,
    terms
  };
  await writeFile(path.join(terminologyDir, definition.output), `${JSON.stringify(output, null, 2)}\n`, "utf8");
  summary.entities[entity] = { total: terms.length, displayLanguage: "ja", koreanCandidateCounts };
}

await writeFile(path.join(terminologyDir, "trs1-extraction-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
