import { request } from '@umijs/max';

export interface Project {
  id: number;
  code: string;
  dec: string;
  created_at: string;
  updated_at: string;
}

export interface StatisticsData {
  id: number;
  project_id: number;
  import_type: string;
  import_batch: string;
  medical_category: string;
  settlement_period: string;
  fee_period: string;
  settlement_id: string;
  certification_place: string;
  street_town: string;
  insurance_place: string;
  insurance_category: string;
  id_number: string;
  name: string;
  assistance_identity: string;
  visit_place: string;
  medical_institution: string;
  medical_visit_category: string;
  medical_assistance_category: string;
  disease_code: string;
  disease_name: string;
  admission_date: string;
  discharge_date: string;
  settlement_date: string;
  total_cost: string;
  eligible_reimbursement: string;
  basic_medical_reimbursement: string;
  serious_illness_reimbursement: string;
  large_amount_reimbursement: string;
  medical_assistance_amount: string;
  medical_assistance: string;
  tilt_assistance: string;
  poverty_relief_amount: string;
  yukuaibao_amount: string;
  personal_account_amount: string;
  personal_cash_amount: string;
  created_at: string;
  updated_at: string;
  project: {
    id: number;
    code: string;
    dec: string;
    created_at: string;
    updated_at: string;
  };
}

// 获取项目列表
export async function getProjects() {
  return request('/api/statistics/projects', {
    method: 'GET',
  });
}

// 创建项目
export async function createProject(data: { code: string; dec: string }) {
  return request('/api/statistics/projects', {
    method: 'POST',
    data,
  });
}

// 更新项目
export async function updateProject(id: number, data: { code: string; dec: string }) {
  return request(`/api/statistics/projects/${id}`, {
    method: 'PUT',
    data,
  });
}

// 删除项目
export async function deleteProject(id: number) {
  return request(`/api/statistics/projects/${id}`, {
    method: 'DELETE',
  });
}

// 人次统计
export async function getPersonTimeStatistics(data: {
  project_ids: number[];
}) {
  return request('/api/statistics/person-time-statistics', {
    method: 'POST',
    data,
  });
}

// 报销统计
export async function getReimbursementStatistics(data: {
  project_ids: number[];
}) {
  return request('/api/statistics/reimbursement-statistics', {
    method: 'POST',
    data,
  });
}

// 倾斜救助统计
export async function getTiltAssistanceStatistics(data: {
  project_ids: number[];
}) {
  return request('/api/statistics/tilt-assistance-statistics', {
    method: 'POST',
    data,
  });
}

// 导出人次统计
export async function exportPersonTimeStatistics(data: {
  project_ids: number[];
}) {
  return request('/api/statistics/export-person-time-statistics', {
    method: 'POST',
    data,
  });
}

// 导出报销统计
export async function exportReimbursementStatistics(data: {
  project_ids: number[];
}) {
  return request('/api/statistics/export-reimbursement-statistics', { 
    method: 'POST',
    data,
  });
}

// 导出倾斜救助统计
export async function exportTiltAssistanceStatistics(data: {
  project_ids: number[];
}) {
  return request('/api/statistics/export-tilt-assistance-statistics', {
    method: 'POST',
    data,
  });
}

// 导出明细统计
export async function exportDetailStatistics(data: {
  project_ids: number[];
}) {
  return request('/api/statistics/export-detail-statistics', {
    method: 'POST',
    data,
  });
}

// 清空项目数据
export async function clearProjectData(id: number) {
  return request(`/api/statistics/projects/${id}/data`, {
    method: 'DELETE',
  });
}

// 获取统计数据列表
export async function getStatisticsList(params: {
  page?: number;
  pageSize?: number;
  project_id?: string | number;
  project_code?: string;
  import_type?: string;
  name?: string;
  id_number?: string;
}) {
  return request('/api/statistics/list', {
    method: 'GET',
    params,
  });
}

// 导入统计数据
export async function importStatistics(data: {
  project_id: number;
  import_type: string;
  file: File;
}) {
  const formData = new FormData();
  formData.append('project_id', data.project_id.toString());
  formData.append('import_type', data.import_type);
  formData.append('file', data.file);
  
  return request('/api/statistics/import', {
    method: 'POST',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

// 获取数据类型选项
export async function getDataTypeOptions() {
  return request('/api/statistics/data-type-options', {
    method: 'GET',
  });
}