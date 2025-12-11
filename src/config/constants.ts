// 应用常量配置
export const APP_CONFIG = {
  // 应用信息
  APP_NAME: '共享救助信息服务平台',
  APP_VERSION: '1.0.0',
  
  // 分页配置
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  
  // 缓存配置
  CACHE_EXPIRE_TIME: 5 * 60 * 1000, // 5分钟
  
  // 上传配置
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['.xlsx', '.xls', '.csv', '.pdf', '.jpg', '.png'],
  
  // 状态配置
  STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
  },
  
  // 用户角色
  ROLES: {
    ADMIN: 'admin',
    USER: 'user',
    VIEWER: 'viewer',
  },
  
  // 权限级别
  PERMISSIONS: {
    READ: 'read',
    WRITE: 'write',
    DELETE: 'delete',
    ADMIN: 'admin',
  },
} as const;

// 导出类型
export type AppStatus = typeof APP_CONFIG.STATUS[keyof typeof APP_CONFIG.STATUS];
export type UserRole = typeof APP_CONFIG.ROLES[keyof typeof APP_CONFIG.ROLES];
export type Permission = typeof APP_CONFIG.PERMISSIONS[keyof typeof APP_CONFIG.PERMISSIONS]; 