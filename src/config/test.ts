// 配置测试文件
import { config, isDevelopment, isTest, isProduction, API_BASE_URL } from './index';

console.log('=== 环境配置测试 ===');
console.log('当前环境:', config.nodeEnv);
console.log('API地址:', config.apiBaseUrl);
console.log('超时时间:', config.apiTimeout);
console.log('Mock启用:', config.enableMock);

console.log('环境检测:');
console.log('- 开发环境:', isDevelopment());
console.log('- 测试环境:', isTest());
console.log('- 生产环境:', isProduction());

console.log('API配置:');
console.log('- 基础URL:', API_BASE_URL);

export const testConfig = {
  env: config.nodeEnv,
  apiUrl: config.apiBaseUrl,
  timeout: config.apiTimeout,
  mock: config.enableMock,
}; 