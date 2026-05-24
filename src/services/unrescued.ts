import { request } from '@umijs/max';

export async function getDiseaseConfigs(params?: any) {
  return request('/api/unrescued/disease-configs', {
    method: 'GET',
    params,
  });
}

export async function createDiseaseConfig(data: any) {
  return request('/api/unrescued/disease-configs', {
    method: 'POST',
    data,
  });
}

export async function updateDiseaseConfig(id: number, data: any) {
  return request(`/api/unrescued/disease-configs/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteDiseaseConfig(id: number) {
  return request(`/api/unrescued/disease-configs/${id}`, {
    method: 'DELETE',
  });
}

export async function importDiseaseConfigs(data: FormData) {
  return request('/api/unrescued/disease-configs/import', {
    method: 'POST',
    data,
  });
}
