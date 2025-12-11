import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  Card,
  Button,
  Space,
  Form,
  Select,
  Upload,
  Progress,
  Table,
  Tag,
  Statistic,
  Row,
  Col,
  Steps,
  message,
  App,
  Typography,
  Divider,
} from 'antd';
import { useAccess } from '@umijs/max';
import {
  UploadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { getYears, getStatistics } from '@/services/insuranceData';
import { verifyIdentity, downloadTemplate, type VerificationResponse } from '@/services/identityVerification';

const { Title, Text } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

interface VerificationResult {
  id_number: string;
  name: string;
  original_category: string;
  matched_category: string;
  status: 'matched' | 'unmatched' | 'error';
  message?: string;
}

const IdentityVerificationPage: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const access = useAccess();
  
  // 状态管理
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [years, setYears] = useState<number[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);
  const [matchSummary, setMatchSummary] = useState({
    total: 0,
    matched: 0,
    unmatched: 0,
    error: 0,
  });

  // 获取年份列表
  const fetchYears = async () => {
    try {
      const response = await getYears();
      if (response.code === 0) {
        setYears(response.data);
      }
    } catch (error) {
      console.error('获取年份列表失败:', error);
    }
  };

  // 获取统计数据
  const fetchStatistics = async () => {
    try {
      const response = await getStatistics(currentYear);
      if (response.code === 0) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  };

  // 初始化
  useEffect(() => {
    fetchYears();
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [currentYear]);

  // 文件上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    beforeUpload: (file) => {
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                     file.type === 'application/vnd.ms-excel';
      if (!isExcel) {
        messageApi.error('只能上传Excel文件！');
        return Upload.LIST_IGNORE;
      }
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        messageApi.error('文件大小不能超过10MB！');
        return Upload.LIST_IGNORE;
      }
      return false; // 阻止自动上传
    },
    onRemove: () => {
      setFileList([]);
    },
  };

  // 开始验证
  const handleStartVerification = async () => {
    if (fileList.length === 0) {
      messageApi.error('请先选择要验证的Excel文件');
      return;
    }

    setCurrentStep(1);
    setMatching(true);
    setProgress(0);

    try {
      // 调试信息
      console.log('fileList:', fileList);
      console.log('originFileObj:', fileList[0]?.originFileObj);
      
      if (!fileList[0]?.originFileObj) {
        messageApi.error('请选择要验证的Excel文件');
        return;
      }

      // 创建FormData
      const formData = new FormData();
      formData.append('year', currentYear.toString());
      formData.append('file', fileList[0].originFileObj as File);

      // 模拟进度
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // 调用后端API进行身份验证
      const response = await verifyIdentity(formData);

      clearInterval(progressInterval);
      setProgress(100);

      if (response.code === 0) {
        setVerificationResults(response.data.results);
        setMatchSummary(response.data.summary);
        setCurrentStep(2);
        messageApi.success('身份验证完成');
      } else {
        messageApi.error(response.message || '验证失败');
        setCurrentStep(0);
      }
    } catch (error) {
      messageApi.error('验证过程中出现错误');
      setCurrentStep(0);
    } finally {
      setMatching(false);
    }
  };

  // 下载模板
  const handleDownloadTemplate = () => {
    const templateUrl = '/assets/templates/data-verification/数据核实-匹配身份和认定区数据.xlsx';
    const link = document.createElement('a');
    link.href = templateUrl;
    link.download = '数据核实-匹配身份和认定区数据.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    messageApi.success('模板下载成功');
  };

  // 表格列定义
  const columns: ColumnsType<VerificationResult> = [
    {
      title: '身份证号',
      dataIndex: 'id_number',
      key: 'id_number',
      width: 180,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: '原始身份类别',
      dataIndex: 'original_category',
      key: 'original_category',
      width: 150,
    },
    {
      title: '匹配身份类别',
      dataIndex: 'matched_category',
      key: 'matched_category',
      width: 150,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        switch (status) {
          case 'matched':
            return <Tag color="green" icon={<CheckCircleOutlined />}>已匹配</Tag>;
          case 'unmatched':
            return <Tag color="orange" icon={<CloseCircleOutlined />}>未匹配</Tag>;
          case 'error':
            return <Tag color="red" icon={<CloseCircleOutlined />}>错误</Tag>;
          default:
            return <Tag>未知</Tag>;
        }
      },
    },
    {
      title: '备注',
      dataIndex: 'message',
      key: 'message',
      render: (message: string) => message || '-',
    },
  ];

  // 步骤配置
  const steps = [
    {
      title: '选择文件',
      description: '上传Excel文件',
    },
    {
      title: '验证中',
      description: '正在验证身份类别',
    },
    {
      title: '验证完成',
      description: '查看验证结果',
    },
  ];

  return (
    <PageContainer>
      <Card>
        {/* 年份选择和统计信息 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Form.Item label="选择年份">
              <Select
                value={currentYear}
                onChange={setCurrentYear}
                style={{ width: '100%' }}
              >
                {years.map(year => (
                  <Option key={year} value={year}>{year}年</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={18}>
            {statistics && (
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="总参保数量"
                    value={statistics.total_count}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="已匹配数量"
                    value={statistics.matched_count}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="待匹配数量"
                    value={statistics.unmatched_count}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
              </Row>
            )}
          </Col>
        </Row>

        <Divider />

        {/* 步骤指示器 */}
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          {steps.map((step, index) => (
            <Steps.Step
              key={index}
              title={step.title}
              description={step.description}
              icon={index === 1 && matching ? <LoadingOutlined /> : undefined}
            />
          ))}
        </Steps>

        {/* 步骤内容 */}
        {currentStep === 0 && (
          <Card>
            <Title level={4}>第一步：选择要验证的Excel文件</Title>
            <Text type="secondary">
              请上传包含"身份证"和"资助参保身份"列的Excel文件
            </Text>
            
            <div style={{ marginTop: 24 }}>
              <Dragger 
                {...uploadProps} 
                style={{ height: 300 }}
                fileList={fileList}
                onChange={({ fileList }) => setFileList(fileList)}
              >
                <p className="ant-upload-drag-icon">
                  <FileExcelOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                </p>
                <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                <p className="ant-upload-hint">
                  支持 .xlsx 和 .xls 格式，文件大小不超过 10MB
                </p>
              </Dragger>
            </div>

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Space>
                {access.canReadIdentityVerification && (
                  <Button
                    type="default"
                    size="large"
                    onClick={handleDownloadTemplate}
                    icon={<FileExcelOutlined />}
                  >
                    下载模板
                  </Button>
                )}
                {access.canExecuteIdentityVerification && (
                  <Button
                    type="primary"
                    size="large"
                    onClick={handleStartVerification}
                    disabled={fileList.length === 0}
                    icon={<UploadOutlined />}
                  >
                    开始验证
                  </Button>
                )}
              </Space>
            </div>
          </Card>
        )}

        {currentStep === 1 && (
          <Card>
            <Title level={4}>第二步：正在验证身份类别</Title>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Progress
                type="circle"
                percent={progress}
                format={(percent) => `${percent}%`}
                size={120}
              />
              <div style={{ marginTop: 24 }}>
                <Text>正在验证身份类别，请稍候...</Text>
              </div>
            </div>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <Title level={4}>第三步：验证结果</Title>
            
            {/* 验证结果统计 */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Statistic
                  title="总验证数量"
                  value={matchSummary.total}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="成功匹配"
                  value={matchSummary.matched}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="未匹配"
                  value={matchSummary.unmatched}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="验证错误"
                  value={matchSummary.error}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Col>
            </Row>

            {/* 验证结果表格 */}
            <Table
              columns={columns}
              dataSource={verificationResults}
              rowKey="id_number"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
              }}
              scroll={{ x: 800 }}
            />

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Space>
                {access.canExecuteIdentityVerification && (
                  <Button onClick={() => setCurrentStep(0)}>
                    重新验证
                  </Button>
                )}
                {access.canReadIdentityVerification && (
                  <Button type="primary" onClick={() => window.print()}>
                    导出结果
                  </Button>
                )}
              </Space>
            </div>
          </Card>
        )}
      </Card>
    </PageContainer>
  );
};

export default () => (
  <App>
    <IdentityVerificationPage />
  </App>
); 