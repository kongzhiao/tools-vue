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

export async function getUnrescuedWashStatus(params?: any) {
  return request('/api/unrescued/records/wash/status', {
    method: 'GET',
    params,
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

export async function getRefundRecords(params?: any) {
  return request('/api/unrescued/refund-records', { method: 'GET', params });
}

export async function getRefundStatistics(params?: any) {
  return request('/api/unrescued/refund-records/statistics', { method: 'GET', params });
}

export async function importRefundDetail(data: FormData) {
  return request('/api/unrescued/refund-records/import-detail', { method: 'POST', data });
}

export async function importRefundObject(data: FormData) {
  return request('/api/unrescued/refund-records/import-object', { method: 'POST', data });
}

export async function getRefundWashConfig() {
  return request('/api/unrescued/refund-records/wash-config', { method: 'GET' });
}

export async function saveRefundWashConfig(data: any) {
  return request('/api/unrescued/refund-records/wash-config', { method: 'POST', data });
}

export async function executeRefundWash(data: any) {
  return request('/api/unrescued/refund-records/wash/execute', { method: 'POST', data });
}

export async function getRefundWashStatus(params?: any) {
  return request('/api/unrescued/refund-records/wash/status', { method: 'GET', params });
}

export async function exportRefundRecords(data: any) {
  return request('/api/unrescued/refund-records/export', { method: 'POST', data });
}

export async function getNoticeRecords(params?: any) {
  return request('/api/unrescued/notice-records', { method: 'GET', params });
}

export async function getNoticeStatistics(params?: any) {
  return request('/api/unrescued/notice-records/statistics', { method: 'GET', params });
}

export async function importNoticeRecords(data: FormData) {
  return request('/api/unrescued/notice-records/import', { method: 'POST', data });
}

export async function distributeNoticeRecords(data: any) {
  return request('/api/unrescued/notice-records/distribute', { method: 'POST', data });
}

export async function undistributeNoticeRecords(data: any) {
  return request('/api/unrescued/notice-records/undistribute', { method: 'POST', data });
}

export async function receiveNoticeRecords(data: any) {
  return request('/api/unrescued/notice-records/receive', { method: 'POST', data });
}

export async function getNoticeReceiveStatus(params?: any) {
  return request('/api/unrescued/notice-records/receive/status', { method: 'GET', params });
}

export async function notifyNoticeRecords(data: any) {
  return request('/api/unrescued/notice-records/notify', { method: 'POST', data });
}

export async function unnotifyNoticeRecords(data: any) {
  return request('/api/unrescued/notice-records/unnotify', { method: 'POST', data });
}

export async function feedbackNoticeRecords(data: any) {
  return request('/api/unrescued/notice-records/feedback', { method: 'POST', data });
}

export async function saveNoticeAdminRemark(data: any) {
  return request('/api/unrescued/notice-records/admin-remark', { method: 'POST', data });
}

export async function markNoticeReimbursement(data: any) {
  return request('/api/unrescued/notice-records/reimbursement', { method: 'POST', data });
}

export async function exportNoticeRecords(data: any) {
  return request('/api/unrescued/notice-records/export', { method: 'POST', data });
}
