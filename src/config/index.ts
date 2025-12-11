// 导入环境配置
import { ENV_CONFIG } from './env';

// 环境配置管理
export interface AppConfig {
  apiBaseUrl: string;
  apiTimeout: number;
  enableMock: boolean;
  nodeEnv: string;
}

// 运行时环境检测
function detectRuntimeEnvironment(): string {
  // 优先使用环境变量
  if (typeof process !== 'undefined' && process.env.NODE_ENV) {
    return process.env.NODE_ENV;
  }
  
  // 在浏览器环境中，优先使用构建时配置的环境
  if (typeof window !== 'undefined') {
    // 如果构建时配置了环境，优先使用构建时的环境
    if (ENV_CONFIG.NODE_ENV && ENV_CONFIG.NODE_ENV !== 'development') {
      return ENV_CONFIG.NODE_ENV;
    }
    
    // 只有在开发环境或未配置时才进行运行时检测
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    }
    if (hostname.includes('test') || hostname.includes('staging')) {
      return 'test';
    }
    return 'production';
  }
  
  // 默认回退
  return 'development';
}

// 获取当前环境配置
export function getConfig(): AppConfig {
  // 优先使用构建时配置的环境
  const effectiveEnv = ENV_CONFIG.NODE_ENV;
  
  // 根据构建时环境生成配置
  const config: AppConfig = {
    apiBaseUrl: effectiveEnv === 'test' 
      ? 'http://47.109.34.185:9510' 
      : effectiveEnv === 'production'
      ? 'https://cqjj.24do.com/api'
      : 'http://127.0.0.1:9510',
    apiTimeout: effectiveEnv === 'test' ? 60000 : effectiveEnv === 'production' ? 60000 : 60000, // 统一设置为60秒，匹配后端OCR服务超时
    enableMock: effectiveEnv === 'test' ? false : effectiveEnv === 'production' ? false : true,
    nodeEnv: effectiveEnv,
  };
  
  // 输出当前使用的配置信息
  console.log(`Using environment config: ${effectiveEnv}, API Base URL: ${config.apiBaseUrl}`);
  
  return config;
}

// 导出当前配置
export const config = getConfig();

// 导出环境检测函数
export const isDevelopment = () => config.nodeEnv === 'development';
export const isTest = () => config.nodeEnv === 'test';
export const isProduction = () => config.nodeEnv === 'production';

// 导出API相关配置
export const API_BASE_URL = config.apiBaseUrl;
export const API_TIMEOUT = config.apiTimeout;
export const ENABLE_MOCK = config.enableMock;

// 重新导出其他配置
export * from './constants';
export * from './api';