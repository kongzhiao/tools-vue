import { request } from '@umijs/max';

export async function getOperationLogs(params?: any) {
  return request('/api/operation-logs', {
    method: 'GET',
    params,
  });
}

export async function getBusinessFilterOptions(params?: any) {
  return request('/api/business-filter-options', {
    method: 'GET',
    params,
  });
}

export async function createBusinessFilterOption(data: any) {
  return request('/api/business-filter-options', {
    method: 'POST',
    data,
  });
}

export async function updateBusinessFilterOption(id: number, data: any) {
  return request(`/api/business-filter-options/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteBusinessFilterOption(id: number) {
  return request(`/api/business-filter-options/${id}`, {
    method: 'DELETE',
  });
}
