import trs1Characters from '../../research/terminology/trs1-characters.json';
import trs1Classes from '../../research/terminology/trs1-classes.json';
import trs1Equipment from '../../research/terminology/trs1-equipment.json';
import trs1Items from '../../research/terminology/trs1-items.json';
import trs1Skills from '../../research/terminology/trs1-skills.json';
import trs2Characters from '../../research/terminology/trs2-characters.json';
import trs2Items from '../../research/terminology/trs2-items.json';

export type EntityType = 'character' | 'class' | 'weapon' | 'item' | 'skill';
export type GameId = 'trs1' | 'trs2';

export interface GameEntity {
  id: string;
  game: GameId;
  type: EntityType;
  sourceKey: string;
  canonicalJp: string;
  displayName: string;
  displayLanguage: 'ja' | 'ko';
  provisionalKo?: string | null;
  status: string;
  koreanStatus: string;
  introduction?: string;
  profile?: {
    register?: string | null;
    honorific?: string | null;
    firstPersonOriginal?: string | null;
    utteranceCount?: number | null;
  } | null;
}

export const entityTypeLabels: Record<EntityType, string> = {
  character: '캐릭터',
  class: '클래스',
  weapon: '무기·마법·지팡이',
  item: '아이템',
  skill: '스킬',
};

export const allEntities = [
  ...trs1Characters.terms,
  ...trs1Classes.terms,
  ...trs1Equipment.terms,
  ...trs1Items.terms,
  ...trs1Skills.terms,
  ...trs2Characters.terms,
  ...trs2Items.terms,
] as GameEntity[];

export const entitiesById = new Map(allEntities.map((entity) => [entity.id, entity]));

export function entityHref(id: string, base = '/') {
  const game = id.startsWith('trs2-') ? 'trs2' : 'trs1';
  return `${base}${game}/data/${id}/`;
}
