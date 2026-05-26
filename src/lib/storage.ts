import type { TravelPlan } from '@/types/plan';

const STORAGE_KEY = 'travel_plans_v2';
const MAX_PLANS = 20;

function getAll(): TravelPlan[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveAll(plans: TravelPlan[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

export function savePlan(plan: TravelPlan): void {
  const plans = getAll().filter((p) => p.id !== plan.id);
  plans.unshift(plan);
  saveAll(plans.slice(0, MAX_PLANS));
}

export function getPlan(id: string): TravelPlan | null {
  return getAll().find((p) => p.id === id) ?? null;
}

export function listPlans(): TravelPlan[] {
  return getAll();
}

export function deletePlan(id: string): void {
  saveAll(getAll().filter((p) => p.id !== id));
}

export function clearAllPlans(): void {
  localStorage.removeItem(STORAGE_KEY);
}
