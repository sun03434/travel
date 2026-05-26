export type PlaceCategory = 'attraction' | 'restaurant' | 'cafe' | 'shopping';
export type SlotType = 'wish' | 'ai_fill' | 'empty' | 'lodging';

export interface Region {
  province: string;
  city?: string;
  displayName: string;
  lat: number;
  lng: number;
}

export interface TravelPeriod {
  startDate: string;  // "YYYY-MM-DD"
  startTime: string;  // "HH:mm"
  endDate: string;
  endTime: string;
}

export interface WishPlace {
  id: string;
  kakaoId: string;
  name: string;
  category: PlaceCategory;
  address: string;
  roadAddress: string;
  lat: number;
  lng: number;
  phone?: string;
  kakaoMapUrl: string;
  openingHours?: string;
  closedDays?: string[];
  userNote?: string;
}

export interface WishLodging {
  id: string;
  kakaoId: string;
  name: string;
  address: string;
  roadAddress: string;
  lat: number;
  lng: number;
  kakaoMapUrl: string;
  checkInDate: string;   // "YYYY-MM-DD"
  checkOutDate: string;  // "YYYY-MM-DD"
  userNote?: string;
}

export interface ScheduledSlot {
  id: string;
  time: string;     // "09:00"
  endTime: string;  // "11:00"
  type: SlotType;
  place?: WishPlace | WishLodging;
  travelMinFromPrev?: number;
  warning?: string;
}

export interface ScheduledDay {
  date: string;
  dayLabel: string;
  weather?: DayWeather;
  slots: ScheduledSlot[];
  naverRouteUrl: string;
}

export interface DayWeather {
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
  description: string;
}

export interface TravelPlan {
  id: string;
  createdAt: string;
  region: Region;
  period: TravelPeriod;
  wishlist: {
    attractions: WishPlace[];
    restaurants: WishPlace[];
    lodgings: WishLodging[];
  };
  schedule: ScheduledDay[];
  generatedAt?: string;
}

// Kakao Local Search result shape
export interface KakaoPlace {
  id: string;
  place_name: string;
  category_name: string;
  address_name: string;
  road_address_name: string;
  x: string;  // longitude
  y: string;  // latitude
  phone: string;
  place_url: string;
}
