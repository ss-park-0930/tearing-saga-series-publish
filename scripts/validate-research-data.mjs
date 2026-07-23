import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const schemaDir = path.join(root, "research", "schemas");
const exampleDir = path.join(root, "research", "examples");
const terminologyDir = path.join(root, "research", "terminology");
const pilotChapterDir = path.join(root, "research", "pilot", "trs1", "chapters");
const errors = [];

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const schemas = {};
for (const file of await readdir(schemaDir)) {
  if (!file.endsWith(".schema.json")) continue;
  const schema = await readJson(path.join(schemaDir, file));
  schemas[file] = schema;
  for (const field of ["$schema", "$id", "title", "type", "required", "properties"]) {
    if (!(field in schema)) errors.push(`${file}: missing ${field}`);
  }
}

function requireFields(record, fields, label) {
  for (const field of fields) if (!(field in record)) errors.push(`${label}: missing ${field}`);
}

function validateEntity(entity, label) {
  requireFields(entity, schemas["entity.schema.json"].required, label);
  if (!/^(trs1|trs2)-(character|weapon|item|class|skill)-[a-z0-9-]+$/.test(entity.id)) errors.push(`${label}: invalid entity id`);
  if (entity.displayLanguage === "ja" && entity.displayName !== entity.canonicalJp) errors.push(`${label}: Japanese displayName must equal canonicalJp`);
}

function validateFact(fact, label) {
  requireFields(fact, schemas["fact.schema.json"].required, label);
  if (!Array.isArray(fact.sources) || fact.sources.length === 0) errors.push(`${label}: fact needs at least one source`);
  for (const source of fact.sources ?? []) {
    requireFields(source, ["sourceId", "locator", "checkedAt"], `${label} source`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(source.checkedAt ?? "")) errors.push(`${label}: invalid checkedAt`);
  }
  const statuses = new Set(["collected", "cross-checked", "conflict", "reviewed"]);
  if (!statuses.has(fact.verification?.status)) errors.push(`${label}: invalid verification status`);
  if (fact.verification?.status === "conflict" && !fact.verification.conflictNote) errors.push(`${label}: conflict requires conflictNote`);
}

for (const file of await readdir(exampleDir)) {
  if (!file.endsWith(".json")) continue;
  const record = await readJson(path.join(exampleDir, file));
  if (file.includes(".fact.")) validateFact(record, file);
  else validateEntity(record, file);
}

let terminologyCount = 0;
const entityIds = new Set();
for (const file of ["trs1-characters.json", "trs1-equipment.json", "trs1-items.json", "trs1-classes.json", "trs1-skills.json"]) {
  const dictionary = await readJson(path.join(terminologyDir, file));
  for (const term of dictionary.terms ?? []) {
    validateEntity(term, `${file}:${term.sourceKey ?? term.id}`);
    if (entityIds.has(term.id)) errors.push(`${file}:${term.id}: duplicate entity id`);
    entityIds.add(term.id);
    terminologyCount += 1;
  }
}

const sourceConfig = await readJson(path.join(root, "research", "sources.json"));
const sourceIds = new Set(sourceConfig.sources.map((source) => source.id));
let factCount = 0;
const factIds = new Set();
for (const file of await readdir(pilotChapterDir)) {
  if (!file.endsWith(".facts.json")) continue;
  const set = await readJson(path.join(pilotChapterDir, file));
  requireFields(set, schemas["fact-set.schema.json"].required, file);
  for (const entityId of set.relatedEntityIds ?? []) if (!entityIds.has(entityId)) errors.push(`${file}: unknown related entity ${entityId}`);
  for (const fact of set.facts ?? []) {
    validateFact(fact, `${file}:${fact.id}`);
    if (fact.subjectId !== set.subjectId) errors.push(`${file}:${fact.id}: subjectId differs from fact set`);
    if (factIds.has(fact.id)) errors.push(`${file}:${fact.id}: duplicate fact id`);
    factIds.add(fact.id);
    for (const source of fact.sources ?? []) if (!sourceIds.has(source.sourceId)) errors.push(`${file}:${fact.id}: unknown source ${source.sourceId}`);
    factCount += 1;
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${Object.keys(schemas).length} schemas, ${(await readdir(exampleDir)).filter((file) => file.endsWith(".json")).length} examples, ${terminologyCount} terminology records, and ${factCount} pilot facts.`);
}
