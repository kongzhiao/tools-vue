import { request } from '@umijs/max';

export async function getEnrollLedgers(params?: any) {
  return request('/api/enroll/ledgers', { method: 'GET', params });
}

export async function getEnrollLedgerStatistics(params?: any) {
  return request('/api/enroll/ledgers/statistics', { method: 'GET', params });
}

export async function getEnrollLedgerOptions(params?: any) {
  return request('/api/enroll/ledgers/options', { method: 'GET', params });
}

export async function updateEnrollLedger(id: number, data: any) {
  return request(`/api/enroll/ledgers/${id}`, { method: 'PUT', data });
}

export async function deleteEnrollLedger(id: number) {
  return request(`/api/enroll/ledgers/${id}`, { method: 'DELETE' });
}

export async function importEnrollAttachment3(data: FormData) {
  return request('/api/enroll/ledgers/import-attachment3', { method: 'POST', data });
}

export async function importEnrollAttachment3Return(data: FormData) {
  return request('/api/enroll/ledgers/import-attachment3-return', { method: 'POST', data });
}

export async function importEnrollAttachment4(data: FormData) {
  return request('/api/enroll/ledgers/import-attachment4', { method: 'POST', data });
}

export async function importEnrollAttachment5(data: FormData) {
  return request('/api/enroll/ledgers/import-attachment5', { method: 'POST', data });
}

export async function importEnrollAttachment6(data: FormData) {
  return request('/api/enroll/ledgers/import-attachment6', { method: 'POST', data });
}

export async function exportEnrollLedgers(data: any) {
  return request('/api/enroll/ledgers/export', { method: 'POST', data });
}

export async function getEnrollConfigs(params?: any) {
  return request('/api/enroll/configs', { method: 'GET', params });
}

export async function createEnrollConfig(data: any) {
  return request('/api/enroll/configs', { method: 'POST', data });
}

export async function updateEnrollConfig(id: number, data: any) {
  return request(`/api/enroll/configs/${id}`, { method: 'PUT', data });
}

export async function deleteEnrollConfig(id: number, params?: any) {
  return request(`/api/enroll/configs/${id}`, { method: 'DELETE', params });
}

export async function cloneEnrollConfigYear(data: any) {
  return request('/api/enroll/configs/clone', { method: 'POST', data });
}

export async function importEnrollConfigs(data: FormData) {
  return request('/api/enroll/configs/import', { method: 'POST', data });
}

export async function getEnrollImportBatches(params?: any) {
  return request('/api/enroll/import-batches', { method: 'GET', params });
}
