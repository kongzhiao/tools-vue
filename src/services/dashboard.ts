import { request } from '@umijs/max';
import { API_ENDPOINTS } from '@/config/api';

export interface DashboardStats {
  statistics: {
    users: number;
    roles: number;
    permissions: number;
    menus: number;
    insurance_data: number;
    category_conversions: number;
    insurance_level_configs: number;
  };
  system_status: {
    status: string;
    uptime: string;
    memory_usage: {
      total: string;
      used: string;
      percentage: number;
    };
    disk_usage: {
      total: string;
      used: string;
      percentage: number;
    };
    response_time: string;
  };
  recent_activities: Array<{
    id: number;
    type: string;
    description: string;
    user: string;
    time: string;
  }>;
}

export interface DashboardResponse {
  code: number;
  msg: string;
  data: DashboardStats;
}

/**
 * 获取仪表盘统计数据
 */
export async function getDashboardStats(): Promise<DashboardResponse> {
  return request(API_ENDPOINTS.STATISTICS.DASHBOARD, {
    method: 'GET',
  });
} 