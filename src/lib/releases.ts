import releasesData from '../data/releases.json';
import type { GameId } from './entities';

export interface ReleaseAsset {
  id: number;
  name: string;
  url: string;
  size: number;
  downloadCount: number;
  contentType: string;
  sha256: string | null;
}

export interface ReleaseRecord {
  id: GameId;
  githubReleaseId: number;
  slug: string;
  version: string;
  title: string;
  body: string;
  releasedAt: string;
  prerelease: boolean;
  releaseLabel: string;
  assets: ReleaseAsset[];
}

export interface ReleaseGame {
  id: GameId;
  shortTitle: string;
  title: string;
  subtitle: string;
  platform: string;
  serial: string;
  format: string;
  sourceSha256: string;
}

export const releaseGames: Record<GameId, ReleaseGame> = {
  trs1: {
    id: 'trs1',
    shortTitle: '티어링 사가',
    title: '티어링 사가 - 유토나 영웅전기',
    subtitle: 'TearRing Saga',
    platform: 'PlayStation',
    serial: 'SLPS-03177',
    format: 'PPF 3.0',
    sourceSha256: 'D494D77951ECDE06E5281F26AEE8C83522011D6F09CC257D8059165820E5DC45',
  },
  trs2: {
    id: 'trs2',
    shortTitle: '베르위크 사가',
    title: '베르위크 사가',
    subtitle: 'Berwick Saga',
    platform: 'PlayStation 2',
    serial: 'SLPS-25497',
    format: 'xdelta3',
    sourceSha256: '77A280686E34D26053CE03873EB6CD0F7FD9730C0B4D4E104F6EB63AC5BD7320',
  },
};

export const releases = releasesData.games as ReleaseRecord[];

export function getLatestRelease(game: GameId) {
  return releases.find((release) => release.id === game);
}

export function releaseDetailHref(release: ReleaseRecord, base = '/') {
  return `${base}${release.id}/releases/${release.slug}/`;
}
