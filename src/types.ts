export type Monster = {
  id: string;
  name: string;
  dropItems: string[];
  imageUrl: string;
  link: string;
};

export type Item = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  link: string;
  dropFrom: string[];
};

/**
 * 物品掉落查詢結果
 */
export interface ItemDropResult {
  item_name: string;
  item_image_url: string | null;
  item_link: string | null;
  monster_name: string;
  monster_image_url: string | null;
  monster_link: string | null;
  is_blessed: number;
  is_cursed: number;
}

/**
 * 怪物掉落查詢結果
 */
export interface MonsterDropResult {
  monster_name: string;
  monster_image_url: string | null;
  monster_link: string | null;
  item_name: string;
  item_image_url: string | null;
  item_link: string | null;
  item_description: string | null;
  is_blessed: number;
  is_cursed: number;
}
