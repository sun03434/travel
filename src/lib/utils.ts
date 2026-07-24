import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ScheduledSlot, WishPlace, WishLodging } from '@/types/plan';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 슬롯을 시작 시간(time) 오름차순으로 정렬한 새 배열 반환. "HH:mm"은 zero-padded라 문자열 비교로 충분. */
export function sortSlotsByTime(slots: ScheduledSlot[]): ScheduledSlot[] {
  return [...slots].sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
}

/** "HH:mm"에 분을 더한 "HH:mm" 반환 (23:59 상한). */
export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

export function getDayCount(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function getDayLabel(dateStr: string, index: number): string {
  const date = new Date(dateStr + 'T00:00:00');
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = weekdays[date.getDay()];
  return `${index + 1}일차 (${month}/${day} ${weekday})`;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function dateToWeekday(dateStr: string): string {
  return WEEKDAYS[new Date(dateStr + 'T12:00:00').getDay()];
}

/** 장소의 정기휴무가 해당 날짜와 겹치면 warning 문자열, 아니면 undefined */
export function getClosedDayWarning(place: WishPlace | WishLodging, dateStr: string): string | undefined {
  if (!('closedDays' in place) || !place.closedDays?.length) return undefined;
  const weekday = dateToWeekday(dateStr);
  return place.closedDays.includes(weekday) ? `정기휴무 (${weekday}요일)` : undefined;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function weatherCodeToDescription(code: number): string {
  if (code === 0) return '맑음';
  if (code <= 3) return '구름 조금';
  if (code <= 48) return '안개';
  if (code <= 67) return '비';
  if (code <= 77) return '눈';
  if (code <= 82) return '소나기';
  if (code <= 99) return '뇌우';
  return '알 수 없음';
}

export function weatherCodeToEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  if (code <= 99) return '⛈️';
  return '🌤️';
}
