import { request } from '@umijs/max';
import { API_ENDPOINTS } from '../config/api';
import { getConfig } from '../config';

// API响应类型定义
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface InsuranceData {
  id: number;
  serial_number?: string;
  street_town: string;
  name: string;
  id_type: string;
  id_number: string;
  person_number?: string;
  payment_category: string;
  payment_amount: number;
  payment_date?: string;
  level?: string;
  personal_amount: number;
  medical_assistance_category?: string;
  category_match?: string;
  remark?: string;
  created_at: string;
  updated_at: string;
}

export interface InsuranceDataListParams {
  page?: number;
  page_size?: number;
  year?: number;
  street_town?: string;
  name?: string;
  id_number?: string;
  payment_category?: string;
  level?: string;
  medical_assistance_category?: string;
  match_status?: string;
}

export interface InsuranceDataListResult {
  list: InsuranceData[];
  total: number;
  page: number;
  page_size: number;
}

export interface StatisticsResult {
  total: number;
  total_count: number;
  matched_count: number;
  unmatched_count: number;
  suspicious_count: number;
  total_payment: number;
  payment_formatted: string;
}

export interface BatchUpdateParams {
  ids: number[];
  update_data: Partial<InsuranceData>;
}

// 获取参保数据列表
export async function getInsuranceDataList(params: InsuranceDataListParams) {
  return request<ApiResponse<InsuranceDataListResult>>(API_ENDPOINTS.INSURANCE_DATA.LIST, {
    method: 'GET',
    params,
  });
}

// 获取参保数据详情
export async function getInsuranceData(id: number) {
  return request<ApiResponse<InsuranceData>>(API_ENDPOINTS.INSURANCE_DATA.UPDATE(id), {
    method: 'GET',
  });
}

// 更新参保数据
export async function updateInsuranceData(id: number, data: Partial<InsuranceData>) {
  return request<ApiResponse<InsuranceData>>(API_ENDPOINTS.INSURANCE_DATA.UPDATE(id), {
    method: 'PUT',
    data,
  });
}

// 删除参保数据
export async function deleteInsuranceData(id: number) {
  return request<ApiResponse<null>>(API_ENDPOINTS.INSURANCE_DATA.DELETE(id), {
    method: 'DELETE',
  });
}

// 批量更新参保数据
export async function batchUpdateInsuranceData(params: BatchUpdateParams) {
  return request<ApiResponse<{ updated_count: number }>>(API_ENDPOINTS.INSURANCE_DATA.BATCH_UPDATE, {
    method: 'POST',
    data: params,
  });
}

// 获取所有年份
export async function getYears() {
  return request<ApiResponse<number[]>>('/api/insurance-data/years', {
    method: 'GET',
  });
}

// 获取所有街道乡镇
export async function getStreetTowns() {
  return request<ApiResponse<string[]>>('/api/insurance-data/street-towns', {
    method: 'GET',
  });
}

// 获取所有代缴类别
export async function getPaymentCategories() {
  return request<ApiResponse<string[]>>('/api/insurance-data/payment-categories', {
    method: 'GET',
  });
}

// 获取所有档次
export async function getLevels() {
  return request<ApiResponse<string[]>>('/api/insurance-data/levels', {
    method: 'GET',
  });
}

// 获取所有医疗救助类别
export async function getMedicalAssistanceCategories() {
  return request<ApiResponse<string[]>>('/api/insurance-data/medical-assistance-categories', {
    method: 'GET',
  });
}

// 获取统计数据
export async function getStatistics(year?: number) {
  return request<ApiResponse<StatisticsResult>>('/api/insurance-data/statistics', {
    method: 'GET',
    params: year ? { year } : {},
  });
}

// 创建新年份
export async function createYear(year: number) {
  return request<ApiResponse<{ year: number }>>('/api/insurance-data/create-year', {
    method: 'POST',
    data: { year },
  });
}

// 按年份导入数据
export async function importByYear(formData: FormData) {
  return request<ApiResponse<{ year: number; imported_count: number; mode: string }>>('/api/insurance-data/import-by-year', {
    method: 'POST',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 300000, // 5分钟超时
  });
}

// 年份管理相关接口
export interface InsuranceYear {
  id: number;
  year: number;
  description: string;
  is_active: boolean;
  data_count: number;
  created_at: string;
  updated_at: string;
}

export async function getYearList() {
  return request<ApiResponse<InsuranceYear[]>>('/api/insurance-data/year-list', {
    method: 'GET',
  });
}

export async function updateYear(id: number, data: { description?: string; is_active?: boolean }) {
  return request<ApiResponse<{ year: InsuranceYear }>>(`/api/insurance-data/years/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteYear(id: number) {
  return request<ApiResponse<{}>>(`/api/insurance-data/years/${id}`, {
    method: 'DELETE',
  });
}

export async function clearYearData(id: number) {
  return request<ApiResponse<{ year: number; deleted_count: number }>>(`/api/insurance-data/years/${id}/data`, {
    method: 'DELETE',
  });
}

// 获取导出信息
export async function getExportInfo(params: InsuranceDataListParams) {
  return request<ApiResponse<{
    total_count: number;
    can_export: boolean;
    suggested_format: 'csv';
  }>>('/api/insurance-data/export-info', {
    method: 'GET',
    params,
  });
}

// 导出参保数据
export async function exportInsuranceData(params: InsuranceDataListParams) {
  return request('/api/insurance-data/export', {
    method: 'GET',
    params,
    responseType: 'blob',
  });
} 

// 验证保险数据文件
export async function validateInsuranceDataFile(data: FormData) {
  return request('/api/insurance-data/validate', {
    method: 'POST',
    data,
  });
}

// 导入保险数据
export async function importInsuranceData(data: FormData) {
  return request<ApiResponse<{
    imported_count: number;
    skipped_count: number;
    error_rows: any[];
  }>>('/api/insurance-data/import', {
    method: 'POST',
    data,
    timeout: 300000, // 5分钟超时
  });
}

// 验证普通参保档次数据
export async function validateImportLevelMatch(data: FormData) {
  return request('/api/insurance-data/validate-import-level-match', {
    method: 'POST',
    data,
  });
}

// 普通参保档次匹配导入
export async function importLevelMatch(data: FormData) {
  return request<ApiResponse<{
    success_count: number;
    fail_count: number;
    total_rows: number;
    errors: string[];
  }>>('/api/insurance-data/import-level-match', {
    method: 'POST',
    data,
    timeout: 300000, // 5分钟超时
  });
} 


// 验证认定区数据
export async function validateImportStreetTown(data: FormData) {
  return request('/api/insurance-data/validate-import-street-town', {
    method: 'POST',
    data,
  });
}

// 认定区匹配
export async function importStreetTown(data: FormData) {
  return request<ApiResponse<{
    success_count: number;
    fail_count: number;
    total_rows: number;
    errors: string[];
  }>>('/api/insurance-data/import-street-town', {
    method: 'POST',
    data,
    timeout: 300000, // 5分钟超时
  });
} 