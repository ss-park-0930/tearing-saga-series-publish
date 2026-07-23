import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const dataFile = path.join(projectRoot, "src", "data", "releases.json");
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

const sources = [
  {
    id: "trs1",
    repository: "ss-park-0930/tearing-saga-release",
  },
  {
    id: "trs2",
    repository: "ss-park-0930/berwick-saga-release",
  },
];

function releaseSlug(release) {
  const tag = release.tag_name
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${tag || "release"}-${release.id}`;
}

async function fetchReleases(source) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "tearing-saga-series-publish",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `https://api.github.com/repos/${source.repository}/releases?per_page=100`,
    { headers },
  );
  if (!response.ok) {
    throw new Error(
      `GitHub Releases request failed for ${source.repository}: ${response.status} ${response.statusText}`,
    );
  }

  const releases = await response.json();
  return releases
    .filter((release) => !release.draft)
    .map((release) => ({
      id: source.id,
      githubReleaseId: release.id,
      slug: releaseSlug(release),
      version: release.tag_name,
      title: release.name || release.tag_name,
      body: release.body || "",
      releasedAt: (release.published_at || release.created_at).slice(0, 10),
      prerelease: Boolean(release.prerelease),
      releaseLabel: release.prerelease ? "사전 배포" : "정식 배포",
      assets: release.assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        url: asset.browser_download_url,
        size: asset.size,
        downloadCount: asset.download_count,
        contentType: asset.content_type,
        sha256: asset.digest?.startsWith("sha256:") ? asset.digest.slice(7).toUpperCase() : null,
      })),
    }));
}

const games = (
  await Promise.all(sources.map((source) => fetchReleases(source)))
)
  .flat()
  .sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));

const releases = {
  generatedAt: new Date().toISOString(),
  source: "github-releases",
  games,
};

await mkdir(path.dirname(dataFile), { recursive: true });
await writeFile(dataFile, `${JSON.stringify(releases, null, 2)}\n`, "utf8");

for (const source of sources) {
  const count = games.filter((release) => release.id === source.id).length;
  console.log(`${source.repository}: ${count} published release(s)`);
}
