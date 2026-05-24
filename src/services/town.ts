import { request } from '@umijs/max';

export async function getTowns(params?: any) {
  return request('/api/towns', {
    method: 'GET',
    params,
  });
}

export async function getTownOptions() {
  return request('/api/towns/options', {
    method: 'GET',
  });
}

export async function createTown(data: any) {
  return request('/api/towns', {
    method: 'POST',
    data,
  });
}

export async function updateTown(id: number, data: any) {
  return request(`/api/towns/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteTown(id: number) {
  return request(`/api/towns/${id}`, {
    method: 'DELETE',
  });
}
