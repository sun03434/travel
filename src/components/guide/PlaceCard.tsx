'use client';

import { Place } from '@/types/place';
import BadgeIcon from './BadgeIcon';

const priceRangeLabel = (n?: number) => {
  if (!n) return null;
  return '₩'.repeat(n);
};

const categoryLabel: Record<string, string> = {
  attraction: '관광지',
  restaurant: '맛집',
  lodging: '숙소',
};

interface PlaceCardProps {
  place: Place;
  index?: number;
}

export default function PlaceCard({ place, index }: PlaceCardProps) {
  return (
    <div className="flex gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      {index !== undefined && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
          {index + 1}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <span className="font-semibold text-gray-900 text-sm">{place.name}</span>
          {place.badges?.map((b) => <BadgeIcon key={b} badge={b} />)}
          {priceRangeLabel(place.priceRange) && (
            <span className="text-xs text-gray-400">{priceRangeLabel(place.priceRange)}</span>
          )}
          <span className="text-xs text-gray-300">{categoryLabel[place.category]}</span>
        </div>
        <p className="text-xs text-gray-500 mb-1 leading-relaxed">{place.description}</p>
        <p className="text-xs text-gray-400">{place.address}</p>
        <div className="flex gap-2 mt-2 flex-wrap">
          <a
            href={place.naverMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-0.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            네이버 지도
          </a>
          {place.sourceUrl && (
            <a
              href={place.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-0.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 3v2H7v14h10v-3h2v4a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1h8zm7 7l-4 4-1.4-1.4L17.2 11H10V9h7.2l-1.6-1.6L17 6l4 4z"/>
              </svg>
              참고 블로그
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
