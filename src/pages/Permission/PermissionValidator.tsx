import React, { useState } from 'react';
import {
  Card,
  Button,
  Input,
  message,
  Table,
  Tag,
  Space,
  Typography,
  Alert,
  Divider,
  Row,
  Col,
  Statistic,
  Tabs,
} from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface ValidationResult {
  valid: string[];
  missing: string[];
  total_requested: number;
  total_valid: number;
  total_missing: number;
  is_all_valid: boolean;
}

interface GenerationResult {
  created: Array<{ name: string; description: string; id: number }>;
  existing: string[];
  errors: Array<{ name: string; error: string }>;
  total_requested: number;
  total_created: number;
  total_existing: number;
  total_errors: number;
}

const PermissionValidator: React.FC = () => {
  const [permissionText, setPermissionText] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [loading, setLoading] = useState(false);

  // 示例权限列表
  const examplePermissions = [
    'dashboard',
    'data-verification',
    'insurance-data',
    'insurance-data:view',
    'insurance-data:create',
    'insurance-data:edit',
    'insurance-data:delete',
    'insurance-data:export',
    'insurance-summary',
    'insurance-summary:view',
    'insurance-summary:export',
    'tax-summary',
    'tax-summary:view',
    'tax-summary:export',
    'identity-verification',
    'identity-verification:view',
    'identity-verification:verify',
    'system-management',
    'user-management',
    'user:view',
    'user:create',
    'user:edit',
    'user:delete',
    'role-management',
    'role:view',
    'role:create',
    'role:edit',
    'role:delete',
    'role:assign-permissions',
    'permission-management',
    'permission:view',
    'permission:create',
    'permission:edit',
    'permission:delete',
    'insurance-level-config',
    'insurance-level-config:view',
    'insurance-level-config:create',
    'insurance-level-config:edit',
    'insurance-level-config:delete',
    'category-conversion',
    'category-conversion:view',
    'category-conversion:create',
    'category-conversion:edit',
    'category-conversion:delete',
    'medical-assistance',
    'patient-management',
    'patient-management:view',
    'patient-management:create',
    'patient-management:edit',
    'patient-management:delete',
    'patient-management:export',
    'medical-records',
    'medical-records:view',
    'medical-records:create',
    'medical-records:edit',
    'medical-records:delete',
    'medical-records:export',
    'reimbursement-management',
    'reimbursement-management:view',
    'reimbursement-management:create',
    'reimbursement-management:edit',
    'reimbursement-management:delete',
    'reimbursement-management:export',
  ];

  const handleValidate = async () => {
    if (!permissionText.trim()) {
      message.error('请输入要验证的权限名称');
      return;
    }

    const permissions = permissionText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (permissions.length === 0) {
      message.error('请输入有效的权限名称');
      return;
    }

    setLoading(true);
    try {
      const response = await request('/api/permissions/validate', {
        method: 'POST',
        data: { permissions },
      });

      if (response.code === 0) {
        setValidationResult(response.data);
        message.success('权限验证完成');
      } else {
        message.error(response.msg || '验证失败');
      }
    } catch (error) {
      console.error('验证失败:', error);
      message.error('验证失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!validationResult || validationResult.total_missing === 0) {
      message.error('没有缺失的权限需要生成');
      return;
    }

    setLoading(true);
    try {
      const response = await request('/api/permissions/generate', {
        method: 'POST',
        data: { permissions: validationResult.missing },
      });

      if (response.code === 0) {
        setGenerationResult(response.data);
        message.success('权限生成完成');
        // 重新验证
        setTimeout(() => {
          handleValidate();
        }, 1000);
      } else {
        message.error(response.msg || '生成失败');
      }
    } catch (error) {
      console.error('生成失败:', error);
      message.error('生成失败');
    } finally {
      setLoading(false);
    }
  };

  const loadExample = () => {
    setPermissionText(examplePermissions.join('\n'));
  };

  const clearAll = () => {
    setPermissionText('');
    setValidationResult(null);
    setGenerationResult(null);
  };

  const validationColumns = [
    {
      title: '权限名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '状态',
      key: 'status',
      render: (text: string, record: any) => (
        <Tag color={validationResult?.valid.includes(record.name) ? 'green' : 'red'}>
          {validationResult?.valid.includes(record.name) ? (
            <>
              <CheckCircleOutlined /> 存在
            </>
          ) : (
            <>
              <CloseCircleOutlined /> 缺失
            </>
          )}
        </Tag>
      ),
    },
  ];

  const generationColumns = [
    {
      title: '权限名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '状态',
      key: 'status',
      render: (text: string, record: any) => (
        <Tag color="green">
          <CheckCircleOutlined /> 已创建
        </Tag>
      ),
    },
  ];

  const errorColumns = [
    {
      title: '权限名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '错误信息',
      dataIndex: 'error',
      key: 'error',
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>权限验证与生成</Title>
      
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="权限验证" extra={
            <Space>
              <Button size="small" onClick={loadExample}>加载示例</Button>
              <Button size="small" onClick={clearAll}>清空</Button>
            </Space>
          }>
            <TextArea
              rows={15}
              value={permissionText}
              onChange={(e) => setPermissionText(e.target.value)}
              placeholder="请输入权限名称，每行一个&#10;例如：&#10;dashboard&#10;insurance-data:view&#10;user:create"
            />
            <div style={{ marginTop: 16 }}>
              <Button 
                type="primary" 
                onClick={handleValidate} 
                loading={loading}
                icon={<ReloadOutlined />}
              >
                验证权限
              </Button>
            </div>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="验证结果">
            {validationResult ? (
              <>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={8}>
                    <Statistic
                      title="总请求数"
                      value={validationResult.total_requested}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="有效权限"
                      value={validationResult.total_valid}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="缺失权限"
                      value={validationResult.total_missing}
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Col>
                </Row>

                {validationResult.is_all_valid ? (
                  <Alert
                    message="所有权限都存在"
                    type="success"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                ) : (
                  <Alert
                    message={`发现 ${validationResult.total_missing} 个缺失权限`}
                    type="warning"
                    showIcon
                    action={
                      <Button 
                        size="small" 
                        type="primary" 
                        onClick={handleGenerate}
                        loading={loading}
                        icon={<PlusOutlined />}
                      >
                        生成缺失权限
                      </Button>
                    }
                    style={{ marginBottom: 16 }}
                  />
                )}

                <Tabs
                  items={[
                    {
                      key: 'valid',
                      label: `有效权限 (${validationResult.total_valid})`,
                      children: (
                        <Table
                          dataSource={validationResult.valid.map(name => ({ name }))}
                          columns={validationColumns}
                          pagination={false}
                          size="small"
                        />
                      ),
                    },
                    {
                      key: 'missing',
                      label: `缺失权限 (${validationResult.total_missing})`,
                      children: (
                        <Table
                          dataSource={validationResult.missing.map(name => ({ name }))}
                          columns={validationColumns}
                          pagination={false}
                          size="small"
                        />
                      ),
                    },
                  ]}
                />
              </>
            ) : (
              <Text type="secondary">请先验证权限</Text>
            )}
          </Card>
        </Col>
      </Row>

      {generationResult && (
        <Card title="生成结果" style={{ marginTop: 16 }}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Statistic
                title="总请求数"
                value={generationResult.total_requested}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="成功创建"
                value={generationResult.total_created}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="已存在"
                value={generationResult.total_existing}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="创建失败"
                value={generationResult.total_errors}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
          </Row>

          <Tabs
            items={[
              {
                key: 'created',
                label: `成功创建 (${generationResult.total_created})`,
                children: (
                  <Table
                    dataSource={generationResult.created}
                    columns={generationColumns}
                    pagination={false}
                    size="small"
                  />
                ),
              },
              {
                key: 'existing',
                label: `已存在 (${generationResult.total_existing})`,
                children: (
                  <Table
                    dataSource={generationResult.existing.map(name => ({ name }))}
                    columns={validationColumns}
                    pagination={false}
                    size="small"
                  />
                ),
              },
              {
                key: 'errors',
                label: `创建失败 (${generationResult.total_errors})`,
                children: (
                  <Table
                    dataSource={generationResult.errors}
                    columns={errorColumns}
                    pagination={false}
                    size="small"
                  />
                ),
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
};

export default PermissionValidator; 