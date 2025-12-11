const fs = require('fs');
const path = require('path');

// 获取环境变量
const NODE_ENV = process.env.NODE_ENV || 'development';

// 根据环境生成配置
const config = {
  NODE_ENV,
  API_BASE_URL: NODE_ENV === 'test' 
    ? 'http://47.109.34.185:9510' 
    : NODE_ENV === 'production'
    ? 'https://cqjj.24do.com/api'
    : 'http://localhost:9510',
  API_TIMEOUT: 60000, // 统一设置为60秒，匹配后端OCR服务超时
  ENABLE_MOCK: NODE_ENV === 'test' ? false : NODE_ENV === 'production' ? false : true,
};

console.log(`Building with config for ${NODE_ENV} environment:`, config);

// 生成配置文件
const configContent = `// 自动生成的环境配置 - 构建时间: ${new Date().toISOString()}
// 环境: ${NODE_ENV}
export const ENV_CONFIG = ${JSON.stringify(config, null, 2)};
`;

// 确保配置目录存在
const configDir = path.join(__dirname, 'src/config');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// 写入配置文件
const configPath = path.join(configDir, 'env.ts');
fs.writeFileSync(configPath, configContent);

console.log(`Environment config written to: ${configPath}`);
console.log(`Current environment: ${NODE_ENV}`);
console.log(`API Base URL: ${config.API_BASE_URL}`);