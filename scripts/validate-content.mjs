import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const categories = JSON.parse(await readFile(path.join(projectRoot, "content", "categories.json"), "utf8"));
const categoryIds = new Set(categories.map((category) => category.id));
const chaptersData = JSON.parse(await readFile(path.join(projectRoot, "content", "trs1", "data", "chapters.json"), "utf8"));
const chapterDir = path.join(projectRoot, "content", "trs1", "guides", "chapters");
const markdownFiles = (await readdir(chapterDir)).filter((file) => file.endsWith(".md")).sort();
const errors = [];

if (chaptersData.count !== 41) errors.push(`chapters.json count must be 41, received ${chaptersData.count}`);
if (markdownFiles.length !== 41) errors.push(`chapter Markdown count must be 41, received ${markdownFiles.length}`);

for (const file of markdownFiles) {
  const text = await readFile(path.join(chapterDir, file), "utf8");
  const frontMatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontMatter) {
    errors.push(`${file}: missing front matter`);
    continue;
  }
  for (const field of ["id", "game", "category", "chapter", "slug", "title", "titleJp", "status", "sourceIds", "relatedIds", "lastVerified"]) {
    if (!new RegExp(`^${field}:`, "m").test(frontMatter[1])) errors.push(`${file}: missing ${field}`);
  }
  const category = frontMatter[1].match(/^category:\s*(.+)$/m)?.[1]?.trim();
  if (category && !categoryIds.has(category)) errors.push(`${file}: unknown category ${category}`);
}

const ids = chaptersData.chapters.map((chapter) => chapter.id);
if (new Set(ids).size !== ids.length) errors.push("chapters.json contains duplicate IDs");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${markdownFiles.length} chapter documents and ${categoryIds.size} categories.`);
}
