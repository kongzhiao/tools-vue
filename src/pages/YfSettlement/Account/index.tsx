import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Progress,
  List,
  Avatar,
  Tag,
  Spin,
  Alert,
  Space,
  Divider
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  MenuOutlined,
  FileTextOutlined,
  SwapOutlined,
  ToolOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DatabaseOutlined,
  MonitorOutlined
} from '@ant-design/icons';
import { useModel } from '@umijs/max';
import { getDashboardStats, DashboardStats } from '@/services/dashboard';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getDashboardStats();
      if (response.code === 0) {
        setDashboardData(response.data);
      } else {
        setError(response.msg || '获取数据失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('获取仪表盘数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_login':
        return <UserOutlined style={{ color: '#1890ff' }} />;
      case 'data_import':
        return <DatabaseOutlined style={{ color: '#52c41a' }} />;
      case 'permission_update':
        return <SafetyCertificateOutlined style={{ color: '#722ed1' }} />;
      case 'system_backup':
        return <MonitorOutlined style={{ color: '#fa8c16' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#666' }} />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user_login':
        return 'blue';
      case 'data_import':
        return 'green';
      case 'permission_update':
        return 'purple';
      case 'system_backup':
        return 'orange';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载仪表盘数据中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="加载失败"
        description={error}
        type="error"
        showIcon
        action={
          <a onClick={fetchDashboardData} style={{ color: '#1890ff' }}>
            重试
          </a>
        }
      />
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 欢迎标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          欢迎回来3333{currentUser?.nickname || currentUser?.username}！
        </Title>
        <Text type="secondary">
          今天是 {dayjs().format('YYYY年MM月DD日 dddd')}，祝您工作愉快！
        </Text>
      </div>

      {/* 用户信息 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card title="当前用户信息">
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <p><Text strong>用户名：</Text>{currentUser?.username}</p>
                <p><Text strong>昵称：</Text>{currentUser?.nickname}</p>
                <p><Text strong>用户ID：</Text>{currentUser?.id}</p>
              </Col>
              <Col xs={24} sm={12}>
                <p><Text strong>权限数量：</Text>{currentUser?.permissions?.length || 0}</p>
                <p><Text strong>登录时间：</Text>{dayjs().format('YYYY-MM-DD HH:mm:ss')}</p>
                <p><Text strong>在线状态：</Text><Tag color="green">在线</Tag></p>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard; 