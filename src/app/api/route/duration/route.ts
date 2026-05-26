import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface RouteSegment {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
}

export async function POST(req: NextRequest) {
  const { segments }: { segments: RouteSegment[] } = await req.json();

  // Straight-line distance estimate at 40 km/h avg urban speed
  const durations = segments.map((s) => {
    const dlat = s.toLat - s.fromLat;
    const dlng = s.toLng - s.fromLng;
    const distKm = Math.sqrt(dlat * dlat + dlng * dlng) * 111;
    return Math.round((distKm / 40) * 60);
  });

  return NextResponse.json({ durations });
}
