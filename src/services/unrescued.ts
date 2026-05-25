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

export async function getUnrescuedRecords(params?: any) {
  return request('/api/unrescued/records', {
    method: 'GET',
    params,
  });
}

export async function getUnrescuedStatistics(params?: any) {
  return request('/api/unrescued/records/statistics', {
    method: 'GET',
    params,
  });
}

export async function importUnrescuedAttachment1(data: FormData) {
  return request('/api/unrescued/records/import-attachment1', {
    method: 'POST',
    data,
  });
}

export async function importUnrescuedAttachment2(data: FormData) {
  return request('/api/unrescued/records/import-attachment2', {
    method: 'POST',
    data,
  });
}

export async function getUnrescuedWashConfig() {
  return request('/api/unrescued/records/wash-config', {
    method: 'GET',
  });
}

export async function getUnrescuedWashOptions(params?: any) {
  return request('/api/unrescued/records/wash-options', {
    method: 'GET',
    params,
  });
}

export async function saveUnrescuedWashConfig(data: any) {
  return request('/api/unrescued/records/wash-config', {
    method: 'POST',
    data,
  });
}

export async function executeUnrescuedWash(data: any) {
  return request('/api/unrescued/records/wash/execute', {
    method: 'POST',
    data,
  });
}

export async function distributeUnrescuedRecords(data: any) {
  return request('/api/unrescued/records/distribute', {
    method: 'POST',
    data,
  });
}

export async function receiveUnrescuedRecords(data: any) {
  return request('/api/unrescued/records/receive', {
    method: 'POST',
    data,
  });
}

export async function notifyUnrescuedRecords(data: any) {
  return request('/api/unrescued/records/notify', {
    method: 'POST',
    data,
  });
}

export async function unnotifyUnrescuedRecords(data: any) {
  return request('/api/unrescued/records/unnotify', {
    method: 'POST',
    data,
  });
}

export async function fillUnrescuedAccounts(data: any) {
  return request('/api/unrescued/records/accounts', {
    method: 'POST',
    data,
  });
}

export async function markUnrescuedReimbursement(data: any) {
  return request('/api/unrescued/records/reimbursement', {
    method: 'POST',
    data,
  });
}

export async function exportUnrescuedRecords(data: any) {
  return request('/api/unrescued/records/export', {
    method: 'POST',
    data,
  });
}
