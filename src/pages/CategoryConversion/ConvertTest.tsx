import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Table,
  Space,
  message,
  Row,
  Col,
  Typography,
  Alert,
  Divider
} from 'antd';
import { request, useAccess } from '@umijs/max';
import { SwapOutlined, ClearOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface ConvertResult {
  original_value: string;
  converted_value: string;
  conversion_type: 'medical_export' | 'national_dict' | 'no_match';
}

const ConvertTest: React.FC = () => {
  const access = useAccess();
  const [form] = Form.useForm();
  const [results, setResults] = useState<ConvertResult[]>([]);
  const [loading, setLoading] = useState(false);

  // 权限检查
  if (!access.canAccessCategoryConversion) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Alert
          message="无权限访问"
          description="您没有权限访问类别转换测试功能，请联系管理员。"
          type="warning"
          showIcon
        />
      </div>
    );
  }

  const handleSingleConvert = async (values: any) => {
    if (!values.singleValue) {
      message.warning('请输入要转换的值');
      return;
    }

    setLoading(true);
    try {
      const response = await request('/api/category-conversions/convert', {
        method: 'POST',
        data: { value: values.singleValue },
      });

      if (response.code === 0) {
        setResults([response.data]);
        message.success('转换完成');
      }
    } catch (error) {
      console.error('转换失败:', error);
      message.error('转换失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchConvert = async (values: any) => {
    if (!values.batchValues) {
      message.warning('请输入要转换的值');
      return;
    }

    // 解析批量输入的值
    const valuesList = values.batchValues
      .split('\n')
      .map((v: string) => v.trim())
      .filter((v: string) => v.length > 0);

    if (valuesList.length === 0) {
      message.warning('请输入有效的值');
      return;
    }

    setLoading(true);
    try {
      const response = await request('/api/category-conversions/batch-convert', {
        method: 'POST',
        data: { values: valuesList },
      });

      if (response.code === 0) {
        setResults(response.data);
        message.success(`批量转换完成，共处理 ${valuesList.length} 个值`);
      }
    } catch (error) {
      console.error('批量转换失败:', error);
      message.error('批量转换失败');
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  const getConversionTypeText = (type: string) => {
    switch (type) {
      case 'medical_export':
        return '医保数据导出对象口径';
      case 'national_dict':
        return '国家字典值名称';
      case 'no_match':
        return '无匹配';
      default:
        return type;
    }
  };

  const getConversionTypeColor = (type: string) => {
    switch (type) {
      case 'medical_export':
        return 'blue';
      case 'national_dict':
        return 'green';
      case 'no_match':
        return 'red';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      title: '原始值',
      dataIndex: 'original_value',
      key: 'original_value',
      width: 200,
    },
    {
      title: '转换后值',
      dataIndex: 'converted_value',
      key: 'converted_value',
      width: 200,
      render: (text: string, record: ConvertResult) => (
        <span style={{ 
          fontWeight: record.conversion_type !== 'no_match' ? 'bold' : 'normal',
          color: record.conversion_type !== 'no_match' ? '#1890ff' : '#666'
        }}>
          {text}
        </span>
      ),
    },
    {
      title: '转换类型',
      dataIndex: 'conversion_type',
      key: 'conversion_type',
      width: 150,
      render: (type: string) => (
        <span style={{ 
          color: type === 'no_match' ? '#ff4d4f' : '#52c41a',
          fontWeight: 'bold'
        }}>
          {getConversionTypeText(type)}
        </span>
      ),
    },
    {
      title: '是否转换',
      key: 'is_converted',
      width: 100,
      render: (_: any, record: ConvertResult) => (
        <span style={{ 
          color: record.conversion_type !== 'no_match' ? '#52c41a' : '#ff4d4f',
          fontWeight: 'bold'
        }}>
          {record.conversion_type !== 'no_match' ? '是' : '否'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Title level={3}>类别转换测试</Title>
        <Alert
          message="转换规则说明"
          description="输入医保数据导出对象口径或国家字典值名称，系统会自动查找对应的税务代缴数据口径。如果找到匹配的转换规则，将返回转换后的值；如果未找到，则返回原值。"
          type="info"
          style={{ marginBottom: 24 }}
        />

        <Row gutter={24}>
          {/* 单个转换 */}
          <Col span={12}>
            <Card title="单个值转换" size="small">
              <Form form={form} onFinish={handleSingleConvert} layout="vertical">
                <Form.Item
                  name="singleValue"
                  label="输入要转换的值"
                  rules={[{ required: true, message: '请输入要转换的值' }]}
                >
                  <Input placeholder="例如：特困人员-7131" />
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      loading={loading}
                      icon={<SwapOutlined />}
                    >
                      转换
                    </Button>
                    <Button onClick={() => form.resetFields()}>
                      清空
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* 批量转换 */}
          <Col span={12}>
            <Card title="批量转换" size="small">
              <Form onFinish={handleBatchConvert} layout="vertical">
                <Form.Item
                  name="batchValues"
                  label="输入要转换的值（每行一个）"
                  rules={[{ required: true, message: '请输入要转换的值' }]}
                >
                  <TextArea 
                    placeholder="例如：&#10;特困人员-7131&#10;低保中重残重病人员-7019&#10;城乡孤儿-7041"
                    rows={4}
                  />
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      loading={loading}
                      icon={<SwapOutlined />}
                    >
                      批量转换
                    </Button>
                    <Button onClick={() => form.resetFields()}>
                      清空
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </Row>

        <Divider />

        {/* 转换结果 */}
        {results.length > 0 && (
          <Card 
            title={
              <Space>
                <span>转换结果</span>
                <Button 
                  size="small" 
                  icon={<ClearOutlined />} 
                  onClick={clearResults}
                >
                  清空结果
                </Button>
              </Space>
            }
            size="small"
          >
            <Table
              columns={columns}
              dataSource={results}
              rowKey={(record, index) => index?.toString() || '0'}
              pagination={false}
              size="small"
              locale={{
                emptyText: '暂无转换结果',
              }}
            />
          </Card>
        )}
      </Card>
    </div>
  );
};

export default ConvertTest; 