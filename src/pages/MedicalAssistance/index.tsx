import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Row, Col, Typography, Space } from 'antd';
import { history, useAccess } from '@umijs/max';
import {
  UserOutlined,
  FileTextOutlined,
  DollarOutlined,
  PlusOutlined,
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const MedicalAssistance: React.FC = () => {
  const access = useAccess();

  const modules = [
    {
      title: '患者管理',
      description: '管理患者基本信息，包括姓名、身份证号、参保地区等',
      icon: <UserOutlined style={{ fontSize: '48px', color: '#1890ff' }} />,
      path: '/medical-assistance/patients',
      color: '#1890ff',
      canAccess: access.canAccessPatientManagement,
    },
    {
      title: '就诊记录',
      description: '管理患者的就诊记录，包括医院、就诊类别、费用等信息',
      icon: <FileTextOutlined style={{ fontSize: '48px', color: '#52c41a' }} />,
      path: '/medical-assistance/records',
      color: '#52c41a',
      canAccess: access.canAccessMedicalRecords,
    },
    {
      title: '受理记录',
      description: '管理医疗救助报销明细，包括银行信息、报销金额等',
      icon: <DollarOutlined style={{ fontSize: '48px', color: '#722ed1' }} />,
      path: '/medical-assistance/reimbursement',
      color: '#722ed1',
      canAccess: access.canAccessReimbursementManagement,
    },
    {
      title: '数据导入',
      description: '通过Excel文件批量导入患者、就诊记录和报销数据',
      icon: <PlusOutlined style={{ fontSize: '48px', color: '#fa8c16' }} />,
      path: '/medical-assistance/reimbursement',
      color: '#fa8c16',
      canAccess: access.canAccessReimbursementManagement, // 数据导入功能在受理记录页面
    },
  ];

  const handleModuleClick = (path: string) => {
    history.push(path);
  };

  return (
    <PageContainer>
      <div style={{ padding: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <Title level={1}>医疗救助管理系统</Title>
          <Paragraph style={{ fontSize: '16px', color: '#666' }}>
            提供完整的医疗救助服务，包括患者管理、就诊记录管理和报销管理
          </Paragraph>
        </div>

        <Row gutter={[24, 24]}>
          {modules.filter(module => module.canAccess).map((module, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card
                hoverable
                style={{
                  height: '200px',
                  cursor: 'pointer',
                  border: `2px solid ${module.color}`,
                  borderRadius: '12px',
                }}
                onClick={() => handleModuleClick(module.path)}
                bodyStyle={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  padding: '24px',
                }}
              >
                <div style={{ marginBottom: '16px' }}>
                  {module.icon}
                </div>
                <Title level={4} style={{ margin: '0 0 8px 0', color: module.color }}>
                  {module.title}
                </Title>
                <Paragraph style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                  {module.description}
                </Paragraph>
      </Card>
            </Col>
          ))}
        </Row>

        <div style={{ marginTop: '48px', padding: '24px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <Title level={3}>系统功能说明</Title>
          <Row gutter={[24, 16]}>
            <Col span={12}>
              <h4>患者管理</h4>
              <ul>
                <li>患者信息的增删改查</li>
                <li>身份证号唯一性验证</li>
                <li>参保地区管理</li>
                <li>患者信息搜索和筛选</li>
              </ul>
            </Col>
            <Col span={12}>
              <h4>就诊记录</h4>
              <ul>
                <li>就诊记录的完整管理</li>
                <li>费用明细记录</li>
                <li>处理状态跟踪</li>
                <li>与患者信息关联</li>
              </ul>
            </Col>
            <Col span={12}>
              <h4>报销管理</h4>
              <ul>
                <li>报销明细的创建和管理</li>
                <li>银行账户信息管理</li>
                <li>报销状态跟踪</li>
                <li>Excel数据导入</li>
              </ul>
            </Col>
            <Col span={12}>
              <h4>数据统计</h4>
              <ul>
                <li>实时数据统计</li>
                <li>报销金额汇总</li>
                <li>处理状态统计</li>
                <li>数据可视化展示</li>
              </ul>
            </Col>
          </Row>
        </div>
      </div>
    </PageContainer>
  );
};

export default MedicalAssistance;