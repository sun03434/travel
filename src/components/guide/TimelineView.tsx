'use client';

import { Day, GuideInputs } from '@/types/place';
import PlaceCard from './PlaceCard';

const timeLabelIcon: Record<string, string> = {
  오전: '☀️',
  점심: '🍜',
  오후: '🌤',
  저녁: '🌙',
  숙소: '🏨',
};

const timeLabelColor: Record<string, string> = {
  오전: 'bg-amber-50 text-amber-700 border-amber-200',
  점심: 'bg-orange-50 text-orange-700 border-orange-200',
  오후: 'bg-sky-50 text-sky-700 border-sky-200',
  저녁: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  숙소: 'bg-purple-50 text-purple-700 border-purple-200',
};

const dayColors = [
  'from-indigo-500 to-blue-500',
  'from-rose-500 to-pink-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-purple-500 to-violet-500',
];

interface TimelineViewProps {
  days: Day[];
  inputs: GuideInputs;
}

export default function TimelineView({ days, inputs }: TimelineViewProps) {

  if (days.length === 0 || days.every((d) => d.slots.length === 0)) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-4xl mb-3">🔍</p>
        <p>해당 조건에 맞는 장소 정보가 아직 없어요.</p>
        <p className="text-sm mt-1">다른 지역이나 카테고리를 선택해보세요.</p>
      </div>
    );
  }

  const onlyLodging =
    inputs.categories.length === 1 && inputs.categories[0] === 'lodging';
  if (onlyLodging) {
    const lodgings = days.flatMap((d) => d.slots.filter((s) => s.timeLabel === '숙소'));
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          추천 숙소
        </h3>
        <div className="space-y-2">
          {lodgings.map((slot, i) => (
            <PlaceCard
              key={`${slot.place.name}-${i}`}
              place={slot.place}
              departure={inputs.departure}
              index={i}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {days.map((day) => (
        <div key={day.dayIndex}>
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${dayColors[(day.dayIndex - 1) % dayColors.length]} flex items-center justify-center text-white font-bold text-sm shadow`}
            >
              {inputs.duration === 'day' ? '당일' : `D${day.dayIndex}`}
            </div>
            <div>
              <p className="font-bold text-gray-800">
                {inputs.duration === 'day' ? '당일치기 코스' : `${day.dayIndex}일차`}
              </p>
              <p className="text-xs text-gray-400">
                {day.slots.filter((s) => s.timeLabel !== '숙소').length}개 장소
              </p>
            </div>
          </div>

          <div className="space-y-3 ml-2 pl-6 border-l-2 border-gray-100">
            {day.slots.map((slot, idx) => (
              <div key={`${day.dayIndex}-${slot.timeLabel}-${slot.place.name}-${idx}`}>
                <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border mb-1.5 ${timeLabelColor[slot.timeLabel]}`}>
                  <span>{timeLabelIcon[slot.timeLabel]}</span>
                  <span>{slot.timeLabel}</span>
                </div>
                <PlaceCard
                  place={slot.place}
                  departure={inputs.departure}
                  index={idx}
                />
                {slot.alternatives && slot.alternatives.length > 0 && (
                  <div className="mt-1.5 ml-2 space-y-1.5">
                    <p className="text-xs text-gray-400 font-medium">대안 식당</p>
                    {slot.alternatives.map((alt, altIdx) => (
                      <div key={`${alt.name}-${altIdx}`} className="opacity-80">
                        <PlaceCard
                          place={alt}
                          departure={inputs.departure}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
