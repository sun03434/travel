import { Badge } from '@/types/place';

const badgeConfig: Record<Badge, { label: string; color: string; symbol: string }> = {
  michelin_3: { label: '미슐랭 ★★★', color: '#D4173A', symbol: '★★★' },
  michelin_2: { label: '미슐랭 ★★', color: '#D4173A', symbol: '★★' },
  michelin_1: { label: '미슐랭 ★', color: '#D4173A', symbol: '★' },
  bib_gourmand: { label: '빕 구르망', color: '#D4173A', symbol: '😊' },
  blueribbon: { label: '블루리본', color: '#1a6fd4', symbol: '🎀' },
};

interface BadgeIconProps {
  badge: Badge;
}

export default function BadgeIcon({ badge }: BadgeIconProps) {
  const config = badgeConfig[badge];
  if (!config) return null;

  return (
    <span
      title={config.label}
      className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: config.color + '15', color: config.color }}
    >
      <span>{config.symbol}</span>
    </span>
  );
}
