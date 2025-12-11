import { request } from '@umijs/max';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface VerificationResult {
  id_number: string;
  name: string;
  original_category: string;
  matched_category: string;
  status: 'matched' | 'unmatched' | 'error';
  message?: string;
}

export interface VerificationResponse {
  results: VerificationResult[];
  summary: {
    total: number;
    matched: number;
    unmatched: number;
    error: number;
  };
}

export interface VerificationHistory {
  id: number;
  year: number;
  file_name: string;
  total_count: number;
  matched_count: number;
  unmatched_count: number;
  error_count: number;
  created_at: string;
}

export interface VerificationHistoryResponse {
  list: VerificationHistory[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * 身份类别验证
 */
export async function verifyIdentity(formData: FormData) {
  return request<ApiResponse<VerificationResponse>>('/api/identity-verification/verify', {
    method: 'POST',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 300000, // 5分钟超时
  });
}

/**
 * 获取验证历史
 */
export async function getVerificationHistory(params: {
  year: number;
  page?: number;
  page_size?: number;
}) {
  return request<ApiResponse<VerificationHistoryResponse>>('/api/identity-verification/history', {
    method: 'GET',
    params,
  });
}

/**
 * 下载身份验证模板
 */
export async function downloadTemplate() {
  return request('/api/identity-verification/template', {
    method: 'GET',
    responseType: 'blob',
  });
} 