'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TravelPlan } from '@/types/plan';
import { rebuildRouteUrls } from '@/lib/shareUrl';
import { savePlan, getPlan } from '@/lib/storage';
import ReadonlyPlanView from '@/components/schedule/ReadonlyPlanView';

export default function SharedByIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/share?id=${encodeURIComponent(id)}`);
        if (!res.ok) { setError(true); return; }
        const { plan: fetched } = await res.json();
        if (!fetched) { setError(true); return; }
        const enriched = rebuildRouteUrls(fetched as TravelPlan);
        setPlan(enriched);
        if (!getPlan(enriched.id)) {
          savePlan(enriched);
          setSaved(true);
        }
      } catch {
        setError(true);
      }
    })();
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-4xl mb-3">😕</p>
          <p className="text-gray-500">유효하지 않거나 만료된 공유 링크입니다.</p>
          <button onClick={() => router.push('/')} className="mt-4 text-blue-600 text-sm hover:underline">
            플래너로 이동
          </button>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return <ReadonlyPlanView plan={plan} saved={saved} />;
}
