#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 环境配置验证脚本
function verifyEnvironmentConfig() {
  console.log('🔍 验证环境配置...\n');
  
  // 读取当前环境变量
  const nodeEnv = process.env.NODE_ENV || 'development';
  console.log(`📋 当前环境变量: NODE_ENV=${nodeEnv}`);
  
  // 读取生成的配置文件
  const configPath = path.join(__dirname, '../src/config/env.ts');
  if (!fs.existsSync(configPath)) {
    console.error('❌ 配置文件不存在:', configPath);
    return false;
  }
  
  const configContent = fs.readFileSync(configPath, 'utf8');
  console.log(`📁 配置文件路径: ${configPath}`);
  
  // 解析配置内容
  const envMatch = configContent.match(/"NODE_ENV":\s*"([^"]+)"/);
  const apiMatch = configContent.match(/"API_BASE_URL":\s*"([^"]+)"/);
  
  if (!envMatch || !apiMatch) {
    console.error('❌ 配置文件格式错误');
    return false;
  }
  
  const configEnv = envMatch[1];
  const configApi = apiMatch[1];
  
  console.log(`📋 配置文件环境: ${configEnv}`);
  console.log(`🌐 配置文件API地址: ${configApi}`);
  
  // 验证环境一致性
  if (nodeEnv !== configEnv) {
    console.warn(`⚠️  环境不匹配: 环境变量=${nodeEnv}, 配置文件=${configEnv}`);
  } else {
    console.log(`✅ 环境配置一致`);
  }
  
  // 验证API地址
  const expectedApi = nodeEnv === 'test' 
    ? 'http://47.109.34.185:9510' 
    : nodeEnv === 'production'
    ? 'https://api.example.com'
    : 'http://localhost:9510';
    
  if (configApi !== expectedApi) {
    console.error(`❌ API地址不匹配: 期望=${expectedApi}, 实际=${configApi}`);
    return false;
  } else {
    console.log(`✅ API地址配置正确`);
  }
  
  // 验证UmiJS配置
  const umircPath = path.join(__dirname, '../.umirc.ts');
  if (fs.existsSync(umircPath)) {
    const umircContent = fs.readFileSync(umircPath, 'utf8');
    
    // 更精确的代理配置匹配
    const proxyMatch = umircContent.match(/target:\s*process\.env\.NODE_ENV\s*===\s*'test'\s*\?\s*'([^']+)'/);
    
    if (proxyMatch) {
      const testTarget = proxyMatch[1];
      console.log(`🔗 UmiJS测试环境代理: ${testTarget}`);
      
      // 检查代理配置是否与环境匹配
      if (nodeEnv === 'development') {
        // 开发环境应该使用 localhost:9510
        if (umircContent.includes('localhost:9510')) {
          console.log(`✅ UmiJS开发环境代理配置正确`);
        } else {
          console.warn(`⚠️  UmiJS开发环境代理配置可能不正确`);
        }
      } else if (nodeEnv === 'test') {
        if (testTarget === 'http://47.109.34.185:9510') {
          console.log(`✅ UmiJS测试环境代理配置正确`);
        } else {
          console.warn(`⚠️  UmiJS测试环境代理配置可能不正确`);
        }
      }
    } else {
      console.log(`ℹ️  UmiJS代理配置使用动态环境判断`);
    }
  }
  
  console.log('\n🎉 环境配置验证完成！');
  return true;
}

// 如果直接运行此脚本
if (require.main === module) {
  verifyEnvironmentConfig();
}

module.exports = { verifyEnvironmentConfig }; 