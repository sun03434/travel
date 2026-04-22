export type Category = 'attraction' | 'restaurant' | 'lodging';
export type Badge = 'michelin_3' | 'michelin_2' | 'michelin_1' | 'bib_gourmand' | 'blueribbon';
export type Theme =
  | 'healing'
  | 'activity'
  | 'culture'
  | 'night'
  | 'hotplace'
  | 'indoor'
  | 'shopping'
  | 'nature';
export type MemberTag =
  | 'date'
  | 'family_infant'
  | 'family_child'
  | 'family_senior'
  | 'family_3gen'
  | 'friends_small'
  | 'friends_large'
  | 'solo'
  | 'pet'
  | 'company';
export type TimeLabel = '오전' | '점심' | '오후' | '저녁' | '숙소';
export type DurationKey = 'day' | '1n2d' | '2n3d' | '3n4d' | '4n_plus';

export interface Place {
  name: string;
  category: Category;
  address: string;
  description: string;
  naverMapUrl: string;
  sourceUrl?: string;
  lat?: number;
  lng?: number;
  badges?: Badge[];
  priceRange?: 1 | 2 | 3 | 4;
}

export interface Slot {
  timeLabel: TimeLabel;
  place: Place;
  alternatives?: Place[];
}

export interface Day {
  dayIndex: number;
  slots: Slot[];
}

export interface GuideInputs {
  region: string;
  member: MemberTag;
  duration: DurationKey;
  categories: Category[];
  themes: Theme[];
  extraRequest?: string;
}

export interface Plan {
  name: string;
  days: Day[];
}

export interface SourceBlog {
  title: string;
  url: string;
}

export interface Guide {
  id: string;
  createdAt: string;
  inputs: GuideInputs;
  plans: Plan[];
  sourceBlogUrls?: SourceBlog[];
}
