import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const defaultReference = "D:/dev/tear-ring-saga-korean/source/reference/naver_ssukyang_120205984605";
const referenceArgument = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
const referenceRoot = path.resolve(referenceArgument ?? defaultReference);
const sourceTsv = path.join(referenceRoot, "guide_chapter_index.tsv");
const outputDir = path.join(projectRoot, "content", "trs1", "guides", "chapters");
const dataDir = path.join(projectRoot, "content", "trs1", "data");
const force = process.argv.includes("--force");

function parseTsv(text) {
  const [headerLine, ...lines] = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const headers = headerLine.split("\t");
  return lines.map((line) => {
    const values = line.split("\t");
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function quote(value) {
  return JSON.stringify(String(value));
}

function slugFor(row) {
  return String(row.chapter_key).toLowerCase().padStart(2, "0");
}

function displayChapter(row) {
  return row.route ? `${row.chapter_number}${row.route}` : row.chapter_number;
}

function markdownFor(row) {
  const slug = slugFor(row);
  const chapter = displayChapter(row);
  return `---
id: trs1-chapter-${slug}
game: trs1
category: chapters
chapter: ${quote(chapter)}
route: ${quote(row.route)}
slug: ${quote(`guides/chapters/${slug}`)}
title: ${quote(`${chapter}장 - ${row.title_ko}`)}
titleJp: ${quote(row.title_jp)}
status: outline
sourceIds:
  - korean-magazine
relatedIds: []
lastVerified: null
---

# ${chapter}장 - ${row.title_ko}

> 작성 상태: 국내 잡지의 장 제목만 이미지 검수된 골격입니다. 전투 조건과 공략은 일본어·영문 출처를 교차 검증한 뒤 채웁니다.

## 전투 개요

- 승리 조건: 조사 필요
- 패배 조건: 조사 필요
- 출격 인원: 조사 필요
- 맵 지형: 조사 필요

## 놓치기 쉬운 요소

- 영입 가능 캐릭터: 조사 필요
- 대화·지원 이벤트: 조사 필요
- 기간 한정 아이템: 조사 필요
- 숨겨진 이벤트: 조사 필요

## 추천 준비

조사 필요

## 진행 순서

조사 필요

## 적 증원과 위험 요소

조사 필요

## 획득 아이템

조사 필요

## 출처 및 검수 기록

- 한국어 장 제목: 국내 게임잡지 ${row.magazine_page}쪽, \`${row.scan_file}\`의 세로 구간 ${row.region_top}–${row.region_bottom} (이미지 검수 완료)
- 전투 데이터: 미수집
- 최종 검수: 미완료
`;
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

const rows = parseTsv(await readFile(sourceTsv, "utf8"));
await mkdir(outputDir, { recursive: true });
await mkdir(dataDir, { recursive: true });

const chapters = rows.map((row) => ({
  id: `trs1-chapter-${slugFor(row)}`,
  key: row.chapter_key,
  number: Number(row.chapter_number),
  route: row.route || null,
  titleKo: row.title_ko,
  titleJp: row.title_jp,
  source: {
    id: "korean-magazine",
    magazinePage: Number(row.magazine_page),
    scanFile: row.scan_file,
    regionTop: Number(row.region_top),
    regionBottom: Number(row.region_bottom),
    reviewStatus: row.review_status
  }
}));

await writeFile(
  path.join(dataDir, "chapters.json"),
  `${JSON.stringify({ game: "trs1", count: chapters.length, chapters }, null, 2)}\n`,
  "utf8"
);

let created = 0;
let skipped = 0;
for (const row of rows) {
  const target = path.join(outputDir, `${slugFor(row)}.md`);
  if (!force && await exists(target)) {
    skipped += 1;
    continue;
  }
  await writeFile(target, markdownFor(row), "utf8");
  created += 1;
}

console.log(`Imported ${chapters.length} chapter records; created ${created}, skipped ${skipped}.`);
