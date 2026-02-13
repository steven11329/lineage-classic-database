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
