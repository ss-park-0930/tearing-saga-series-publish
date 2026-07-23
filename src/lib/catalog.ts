import type { EntityType, GameId } from './entities';

export interface CatalogCategory {
  slug: string;
  type: EntityType;
  title: string;
  description: string;
}

export const catalogCategories: Record<GameId, CatalogCategory[]> = {
  trs1: [
    { slug: 'characters', type: 'character', title: '캐릭터', description: '게임 고정 문자열에서 확인한 등장인물 이름' },
    { slug: 'equipment', type: 'weapon', title: '무기·마법·지팡이', description: '무기와 마법, 지팡이 이름 데이터' },
    { slug: 'items', type: 'item', title: '아이템', description: '소모품과 주요 아이템 이름 데이터' },
    { slug: 'classes', type: 'class', title: '클래스', description: '아군과 적군의 클래스 이름 데이터' },
    { slug: 'skills', type: 'skill', title: '스킬', description: '전투와 성장에 관여하는 스킬 이름 데이터' },
  ],
  trs2: [
    { slug: 'characters', type: 'character', title: '캐릭터', description: '승인된 한글패치 인물 용어집' },
    { slug: 'items', type: 'item', title: '장비·아이템', description: '승인된 무기, 방패, 도구와 아이템 이름 데이터' },
  ],
};
