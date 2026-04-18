import api from '../api';
import type {
  KappaStudy,
  KappaRating,
  KappaResults,
  KappaTrendPoint,
  CreateStudyPayload,
  SubmitRatingsPayload,
} from '../../types/cqm/kappa.types';

const BASE = '/kappa-studies';

// ── Studies ───────────────────────────────────────────────────────────────────

export async function listStudies(): Promise<{ studies: KappaStudy[] }> {
  const { data } = await api.get(BASE);
  return data;
}

export async function createStudy(payload: CreateStudyPayload): Promise<{ study: KappaStudy }> {
  const { data } = await api.post(BASE, payload);
  return data;
}

export async function getStudy(id: number): Promise<{ study: KappaStudy }> {
  const { data } = await api.get(`${BASE}/${id}`);
  return data;
}

export async function updateStudy(
  id: number,
  payload: Partial<CreateStudyPayload> & {
    status?: 'open' | 'complete';
    reference_data?: Record<string, string> | null;
    appraiser_ids?: number[];
  }
): Promise<{ study: KappaStudy }> {
  const { data } = await api.put(`${BASE}/${id}`, payload);
  return data;
}

export async function deleteStudy(id: number): Promise<void> {
  await api.delete(`${BASE}/${id}`);
}

// ── Ratings ───────────────────────────────────────────────────────────────────

export async function getRatings(studyId: number): Promise<{ ratings: KappaRating[] }> {
  const { data } = await api.get(`${BASE}/${studyId}/ratings`);
  return data;
}

export async function submitRatings(
  studyId: number,
  payload: SubmitRatingsPayload
): Promise<{ saved: number }> {
  const { data } = await api.post(`${BASE}/${studyId}/ratings`, payload);
  return data;
}

// ── Results ───────────────────────────────────────────────────────────────────

export async function getResults(studyId: number): Promise<{ results: KappaResults }> {
  const { data } = await api.get(`${BASE}/${studyId}/results`);
  return data;
}

// ── Trend ─────────────────────────────────────────────────────────────────────

export async function getTrend(params: {
  test_definition_id?: number;
  category_id?: number;
}): Promise<{ trend: KappaTrendPoint[] }> {
  const { data } = await api.get(`${BASE}/trend`, { params });
  return data;
}
