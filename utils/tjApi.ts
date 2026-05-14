import { getDeviceId } from './tjStorage';

export const TJ_BASE_URL = 'https://w99rpvg2jykqme8ytyqjerycckd6z729.app.specular.dev';

export interface TJTrend {
  id: string;
  title: string;
  niche: string;
  platform: string;
  trend_score: number;
  why_trending: string;
  is_featured?: boolean;
  templates?: TJTemplate[];
}

export interface TJTemplate {
  id: string;
  hook: string;
  script: string;
  caption: string;
  call_to_action: string;
}

export interface TJProfile {
  device_id: string;
  name?: string;
  selected_niches?: string;
}

export interface TJSavedTrend {
  id: string;
  trend_id: string;
  device_id: string;
  trend?: TJTrend;
}

async function tjFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${TJ_BASE_URL}${path}`;
  console.log(`[TJApi] ${options?.method ?? 'GET'} ${url}`);
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchTrends(): Promise<TJTrend[]> {
  const data = await tjFetch<{ trends?: TJTrend[] } | TJTrend[]>('/api/tj/trends');
  if (Array.isArray(data)) return data;
  return (data as { trends?: TJTrend[] }).trends ?? [];
}

export async function fetchTrendById(id: string): Promise<TJTrend> {
  return tjFetch<TJTrend>(`/api/tj/trends/${id}`);
}

export async function fetchProfile(deviceId: string): Promise<TJProfile> {
  return tjFetch<TJProfile>(`/api/tj/profile?device_id=${encodeURIComponent(deviceId)}`);
}

export async function updateProfile(deviceId: string, selectedNiches: string): Promise<void> {
  console.log('[TJApi] PUT /api/tj/profile — device_id:', deviceId, 'niches:', selectedNiches);
  await tjFetch('/api/tj/profile', {
    method: 'PUT',
    body: JSON.stringify({ device_id: deviceId, selected_niches: selectedNiches }),
  });
}

export async function fetchSaved(deviceId: string): Promise<TJSavedTrend[]> {
  const data = await tjFetch<{ saved?: TJSavedTrend[] } | TJSavedTrend[]>(
    `/api/tj/saved?device_id=${encodeURIComponent(deviceId)}`
  );
  if (Array.isArray(data)) return data;
  return (data as { saved?: TJSavedTrend[] }).saved ?? [];
}

export async function saveTrend(trendId: string): Promise<void> {
  const deviceId = await getDeviceId();
  console.log('[TJApi] POST /api/tj/saved — trend_id:', trendId, 'device_id:', deviceId);
  await tjFetch('/api/tj/saved', {
    method: 'POST',
    body: JSON.stringify({ trend_id: trendId, device_id: deviceId }),
  });
}

export async function deleteSaved(savedId: string, deviceId: string): Promise<void> {
  console.log('[TJApi] DELETE /api/tj/saved/', savedId, '— device_id:', deviceId);
  await tjFetch(`/api/tj/saved/${savedId}`, {
    method: 'DELETE',
    body: JSON.stringify({ device_id: deviceId }),
  });
}
