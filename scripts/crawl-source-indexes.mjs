import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceFile = path.join(projectRoot, "research", "sources.json");
const outputDir = path.join(projectRoot, "research", "crawl", "indexes");
const catalogFile = path.join(projectRoot, "research", "crawl", "catalog.json");
const targetsFile = path.join(projectRoot, "research", "crawl", "targets.json");
const config = JSON.parse(await readFile(sourceFile, "utf8"));
const userAgent = config.policy.userAgent;

const categories = [
  ["secrets", /(secret|裏技|バグ|小ネタ|faq|よくある質問|レティーナ|コイントス)/i],
  ["skills", /(skill|スキル)/i],
  ["classes", /(class|クラス|cd_|最大パラメータ|ステータス上限|パラメータ変化|地形移動コスト)/i],
  ["equipment", /(weapon|item|magic|staff|shop|inventory|sword|lance|axe|bow|fire|thunder|wind|light|dark|breath|stave|武器|槍|斧|弓|魔法|杖|道具|アイテム|ショップ|職人|合成|宝箱|drop)/i],
  ["characters", /(character|unit|ユニット|加入|仲間|成長|支援|エンディング|通り名|とおり名|parameter|param|status|初期パラメータ)/i],
  ["data", /(formula|計算式|地形効果|闘技場|arena|support)/i],
  ["chapters", /(map|walkthrough|攻略|章|遭遇戦|編成|event|st_)/i],
  ["getting-started", /(basic|overview|introduction|background|基本|システム|攻略のコツ|基礎知識|物語の背景|対戦に向けたプレイ)/i]
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([0-9a-f]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)));
}

function plainText(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function firstMatch(html, pattern) {
  const match = html.match(pattern);
  return match ? plainText(match[1]) : "";
}

function categoryFor(label, url) {
  const input = `${label} ${url}`;
  return categories.find(([, pattern]) => pattern.test(input))?.[0] ?? "unclassified";
}

function extractMetadata(html, pageUrl, allowedPrefixes) {
  const headings = [...html.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((match) => ({ level: Number(match[1]), text: plainText(match[2]) }))
    .filter((heading) => heading.text);

  const seen = new Set();
  const links = [];
  for (const match of html.matchAll(/<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let url;
    try {
      url = new URL(decodeHtml(match[1]), pageUrl).href.split("#")[0];
    } catch {
      continue;
    }
    const label = plainText(match[2]);
    if (!label || url === pageUrl || !allowedPrefixes.some((prefix) => url.startsWith(prefix)) || seen.has(url)) continue;
    seen.add(url);
    links.push({ label, url, category: categoryFor(label, url) });
  }

  return {
    url: pageUrl,
    title: firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    description: firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i),
    headings,
    links
  };
}

function robotsRules(text) {
  const rules = [];
  let applies = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") applies = value === "*" || value.toLowerCase() === userAgent.toLowerCase();
    if (applies && (field === "allow" || field === "disallow") && value) rules.push({ type: field, path: value });
  }
  return rules;
}

async function isAllowed(url) {
  const target = new URL(url);
  const robotsUrl = `${target.origin}/robots.txt`;
  const response = await fetch(robotsUrl, { headers: { "user-agent": userAgent } });
  if (response.status === 404) return { allowed: true, robotsUrl, status: 404, matchedRule: null };
  if (!response.ok) throw new Error(`robots.txt ${response.status}: ${robotsUrl}`);
  const rules = robotsRules(await response.text());
  const matches = rules
    .filter((rule) => target.pathname.startsWith(rule.path.replace(/\*.*$/, "")))
    .sort((a, b) => b.path.length - a.path.length);
  const matchedRule = matches[0] ?? null;
  return { allowed: matchedRule?.type !== "disallow", robotsUrl, status: response.status, matchedRule };
}

async function fetchIndex(url, allowedPrefixes) {
  const robots = await isAllowed(url);
  if (!robots.allowed) return { url, fetchedAt: new Date().toISOString(), robots, skipped: "robots-disallow" };
  const response = await fetch(url, { headers: { "user-agent": userAgent, accept: "text/html" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  const html = await response.text();
  return {
    fetchedAt: new Date().toISOString(),
    status: response.status,
    robots,
    ...extractMetadata(html, url, allowedPrefixes)
  };
}

await mkdir(outputDir, { recursive: true });
const catalog = {
  generatedAt: new Date().toISOString(),
  storageMode: config.policy.storageMode,
  sources: []
};
const targets = [];

for (const source of config.sources.filter((entry) => entry.crawl)) {
  const pages = [];
  for (const url of source.indexUrls) {
    try {
      pages.push(await fetchIndex(url, source.allowedPrefixes));
    } catch (error) {
      pages.push({ url, fetchedAt: new Date().toISOString(), error: error.message });
    }
    await sleep(config.policy.defaultDelayMs);
  }
  const entry = {
    sourceId: source.id,
    name: source.name,
    language: source.language,
    role: source.role,
    trustTier: source.trustTier,
    pages
  };
  await writeFile(path.join(outputDir, `${source.id}.json`), `${JSON.stringify(entry, null, 2)}\n`, "utf8");
  const sourceTargets = pages.flatMap((page) => (page.links ?? []).map((link) => ({
    sourceId: source.id,
    language: source.language,
    trustTier: source.trustTier,
    ...link
  })));
  targets.push(...sourceTargets);
  const categoryCounts = Object.fromEntries(
    [...new Set(sourceTargets.map((target) => target.category))]
      .sort()
      .map((category) => [category, sourceTargets.filter((target) => target.category === category).length])
  );
  catalog.sources.push({
    sourceId: source.id,
    pageCount: pages.length,
    linkCount: sourceTargets.length,
    categoryCounts,
    errors: pages.filter((page) => page.error || page.skipped).map((page) => ({ url: page.url, error: page.error ?? page.skipped }))
  });
}

await writeFile(catalogFile, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
const byCategory = Object.fromEntries(
  [...new Set(targets.map((target) => target.category))]
    .sort()
    .map((category) => [category, targets.filter((target) => target.category === category).length])
);
await writeFile(
  targetsFile,
  `${JSON.stringify({ generatedAt: catalog.generatedAt, count: targets.length, byCategory, targets }, null, 2)}\n`,
  "utf8"
);
console.log(JSON.stringify(catalog, null, 2));
