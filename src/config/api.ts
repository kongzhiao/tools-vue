import { API_BASE_URL, API_TIMEOUT } from './index';

// API请求配置
export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
} as const;

// 注意：request函数在UmiJS中通过运行时注入，不需要在这里创建

// API端点配置
export const API_ENDPOINTS = {
  // 认证相关
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    PROFILE: '/api/auth/profile',
  },
  
  // 用户管理
  USER: {
    LIST: '/api/users',
    CREATE: '/api/users',
    UPDATE: (id: number) => `/api/users/${id}`,
    DELETE: (id: number) => `/api/users/${id}`,
    ROLES: '/api/users/roles',
  },
  
  // 角色管理
  ROLE: {
    LIST: '/api/roles',
    CREATE: '/api/roles',
    UPDATE: (id: number) => `/api/roles/${id}`,
    DELETE: (id: number) => `/api/roles/${id}`,
    PERMISSIONS: (id: number) => `/api/roles/${id}/permissions`,
  },
  
  // 权限管理
  PERMISSION: {
    LIST: '/api/permissions',
    CREATE: '/api/permissions',
    UPDATE: (id: number) => `/api/permissions/${id}`,
    DELETE: (id: number) => `/api/permissions/${id}`,
    VALIDATE: '/api/permissions/validate',
  },
  
  // 参保数据
  INSURANCE_DATA: {
    LIST: '/api/insurance-data',
    CREATE: '/api/insurance-data',
    UPDATE: (id: number) => `/api/insurance-data/${id}`,
    DELETE: (id: number) => `/api/insurance-data/${id}`,
    BATCH_UPDATE: '/api/insurance-data/batch-update',
    STATISTICS: '/api/insurance-data/statistics',
  },
  
  // 数据核实
  DATA_VERIFICATION: {
    IDENTITY: '/api/verification/identity',
    TAX_SUMMARY: '/api/verification/tax-summary',
    INSURANCE_SUMMARY: '/api/verification/insurance-summary',
  },
  
  // 业务配置
  BUSINESS_CONFIG: {
    CATEGORY_CONVERSION: '/api/business/category-conversion',
    INSURANCE_LEVEL: '/api/business/insurance-level',
  },
  
  // 统计汇总
  STATISTICS: {
    SUMMARY: '/api/statistics/summary',
    DASHBOARD: '/api/dashboard/stats',
  },
  
  // OCR识别
  OCR: {
    UPLOAD: '/api/ocr/upload',
    PROCESS: '/api/ocr/process',
    RESULT: (id: string) => `/api/ocr/result/${id}`,
  },
} as const;

// 导出类型
export type ApiEndpoint = typeof API_ENDPOINTS; 