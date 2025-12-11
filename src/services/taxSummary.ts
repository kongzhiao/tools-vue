import { request } from '@umijs/max';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface TaxSummaryData {
  category: string;
  count: number;
  amount: number;
  percentage?: number;
}

export interface TaxSummaryResponse {
  data: TaxSummaryData[];
  total_count: number;
  total_amount: number;
  year: number;
}

/**
 * 获取税务汇总数据
 */
export async function getTaxSummary(year: number) {
  return request<ApiResponse<TaxSummaryResponse>>('/api/tax-summary/data', {
    method: 'GET',
    params: { year },
  });
}

/**
 * 导出税务汇总数据
 */
export async function exportTaxSummary(year: number) {
  return request<ApiResponse<{
    filename: string;
    content: string;
    content_type: string;
  }>>('/api/tax-summary/export', {
    method: 'GET',
    params: { year },
  });
} 