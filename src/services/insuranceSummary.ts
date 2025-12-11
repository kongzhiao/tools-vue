import { request } from '@umijs/max';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface InsuranceSummaryData {
  street_town: string;
  categories: {
    [key: string]: {
      count: number;
      amount: number;
      levels: {
        [key: string]: { count: number; amount: number };
      };
    };
  };
  total_count: number;
  total_amount: number;
}

export interface CategoryLevelMapping {
  category: string;
  levels: string[];
  total_levels: number;
}

export interface InsuranceSummaryResponse {
  data: InsuranceSummaryData[];
  categories: string[];
  levels: string[];
  categories_levels_mapping: CategoryLevelMapping[];
  total_count: number;
  total_amount: number;
  year: number;
}

/**
 * 获取参保汇总数据
 */
export async function getInsuranceSummary(year: number) {
  return request<ApiResponse<InsuranceSummaryResponse>>('/api/insurance-summary/data', {
    method: 'GET',
    params: { year },
  });
}

/**
 * 导出参保汇总数据
 */
export async function exportInsuranceSummary(year: number) {
  return request<ApiResponse<{
    filename: string;
    content: string;
    content_type: string;
  }>>('/api/insurance-summary/export', {
    method: 'GET',
    params: { year },
  });
} 