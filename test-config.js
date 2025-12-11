// 测试环境配置
console.log('NODE_ENV:', process.env.NODE_ENV);

const testConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_BASE_URL: process.env.NODE_ENV === 'test' 
    ? 'http://47.108.30.164:9510' 
    : process.env.NODE_ENV === 'production'
    ? 'https://api.example.com'
    : 'http://localhost:9510',
};

console.log('Test Config:', testConfig);