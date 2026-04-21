'use client';

import { Day, GuideInputs } from '@/types/place';

const dayColors = ['#4F46E5', '#E11D48', '#059669', '#D97706', '#7C3AED'];

interface MapViewProps {
  days: Day[];
  inputs: GuideInputs;
}

export default function MapView({ days, inputs }: MapViewProps) {
  return (
    <div className="space-y-6">
      {days.map((day, dayIdx) => {
        const color = dayColors[dayIdx % dayColors.length];
        const nonLodging = day.slots.filter((s) => s.timeLabel !== '숙소');
        const lodging = day.slots.find((s) => s.timeLabel === '숙소');

        return (
          <div key={day.dayIndex}>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="font-semibold text-gray-700 text-sm">
                {inputs.duration === 'day' ? '당일 코스' : `${day.dayIndex}일차`}
              </span>
            </div>

            <div className="space-y-2 pl-5">
              {nonLodging.map((slot, idx) => (
                <a
                  key={`${slot.place.name}-${idx}`}
                  href={slot.place.naverMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-green-200 hover:shadow-sm transition-all group"
                >
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: color }}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-gray-800 text-sm group-hover:text-green-700">
                        {slot.place.name}
                      </span>
                      <span className="text-xs text-gray-400">{slot.timeLabel}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{slot.place.address}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 text-green-500 mt-1">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                </a>
              ))}

              {lodging && (
                <a
                  href={lodging.place.naverMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-xl border border-purple-100 bg-purple-50 hover:bg-white hover:border-purple-300 hover:shadow-sm transition-all group"
                >
                  <span className="flex-shrink-0 text-lg mt-0.5">🏨</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-gray-800 text-sm group-hover:text-green-700">
                      {lodging.place.name}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{lodging.place.address}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 text-green-500 mt-1">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                </a>
              )}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-center text-gray-400 pt-2">
        각 장소를 클릭하면 네이버 지도에서 열립니다
      </p>
    </div>
  );
}
