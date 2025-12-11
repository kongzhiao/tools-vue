import React from 'react';
import { Card, Button, message, Alert } from 'antd';
import { request, useAccess } from '@umijs/max';

const TestPage: React.FC = () => {
  const access = useAccess();

  const testAPI = async () => {
    try {
      const response = await request('/api/category-conversions', {
        method: 'GET',
      });
      message.success(`API测试成功，返回${response.data.total}条数据`);
      console.log('API响应:', response);
    } catch (error) {
      message.error('API测试失败');
      console.error('API错误:', error);
    }
  };

  // 权限检查
  if (!access.canAccessCategoryConversion) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Alert
          message="无权限访问"
          description="您没有权限访问类别转换测试页面，请联系管理员。"
          type="warning"
          showIcon
        />
      </div>
    );
  }

  return (
    <Card title="类别转换测试页面">
      <p>这是一个测试页面，用于验证页面是否可以正常访问。</p>
      <Button type="primary" onClick={testAPI}>
        测试API
      </Button>
    </Card>
  );
};

export default TestPage; 