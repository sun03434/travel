import { NextRequest, NextResponse } from 'next/server';
import type { TravelPlan } from '@/types/plan';
import { putSharedPlan, getSharedPlan } from '@/lib/shareStore';

export const maxDuration = 15;

// 플랜 저장 → 짧은 공유 ID 발급
export async function POST(req: NextRequest) {
  try {
    const plan = (await req.json()) as TravelPlan;
    if (!plan?.id || !Array.isArray(plan?.schedule)) {
      return NextResponse.json({ error: 'invalid_plan' }, { status: 400 });
    }
    const id = await putSharedPlan(plan);
    return NextResponse.json({ id });
  } catch (e) {
    console.error('[share][POST]', e);
    return NextResponse.json({ error: 'store_failed' }, { status: 500 });
  }
}

// 공유 ID → 플랜 조회
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 });
  try {
    const plan = await getSharedPlan(id);
    if (!plan) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ plan });
  } catch (e) {
    console.error('[share][GET]', e);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}
