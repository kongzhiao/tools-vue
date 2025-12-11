import React, { useState, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Upload,
  message,
  Spin,
  Typography,
  Divider,
  Button,
  Modal,
  Descriptions,
  Progress,
  Alert,
  Empty,
  Input,
  Table,
  Checkbox,
  Space,
  Form,
  Select,
  InputNumber,
  Steps
} from 'antd';
import {
  InboxOutlined,
  FileImageOutlined,
  EyeOutlined,
  DeleteOutlined,
  SearchOutlined,
  UserOutlined,
  BankOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { recognizeImage, OcrRecognitionResult } from '@/services/ocr';
import { medicalRecordAPI, MedicalRecord, Patient, reimbursementAPI } from '@/services/medicalAssistance';
import type { UploadProps } from 'antd';
import type { RcFile } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;
const { Option } = Select;

const OcrPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<OcrRecognitionResult | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<RcFile[]>([]);
  
  // 新增状态
  const [currentStep, setCurrentStep] = useState(0);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<number[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();

  // 处理文件上传
  const handleUpload = useCallback(async (file: RcFile) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
      return false;
    }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('图片大小不能超过10MB！');
      return false;
    }

    setLoading(true);
    setRecognitionResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await recognizeImage(formData);
      
      if (response.code === 0) {
        setRecognitionResult(response.data);
        message.success('识别成功！');
        
        // 添加到已上传文件列表
        setUploadedFiles(prev => [...prev, file]);
        
        // 如果识别到身份证号，自动查询就诊记录
        if (response.data.extracted_data.id_card) {
          await handleSearchRecords(response.data.extracted_data.id_card);
        }
      } else {
        message.error(response.msg || '识别失败');
      }
    } catch (error) {
      console.error('OCR识别失败:', error);
      message.error('识别失败，请稍后重试');
    } finally {
      setLoading(false);
    }

    return false; // 阻止默认上传行为
  }, []);

  // 根据身份证号查询就诊记录
  const handleSearchRecords = async (idCard: string) => {
    if (!idCard) {
      message.error('请输入身份证号');
      return;
    }

    setSearchLoading(true);
    try {
      const response = await medicalRecordAPI.getMedicalRecordsByIdCard(idCard);
      if (response.code === 0) {
        setPatient(response.data.patient);
        setMedicalRecords(response.data.records);
        setSelectedRecords([]);
        setCurrentStep(1);
        message.success('查询成功');
      } else {
        message.error(response.message || '查询失败');
      }
    } catch (error) {
      message.error('查询失败');
      console.error('查询就诊记录失败:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // 手动查询就诊记录
  const handleManualSearch = async () => {
    const idCard = recognitionResult?.extracted_data.id_card;
    if (idCard) {
      await handleSearchRecords(idCard);
    } else {
      message.error('请先上传图片识别身份证号');
    }
  };

  // 选择就诊记录
  const handleRecordSelection = (recordId: number, checked: boolean) => {
    if (checked) {
      setSelectedRecords(prev => [...prev, recordId]);
    } else {
      setSelectedRecords(prev => prev.filter(id => id !== recordId));
    }
  };

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecords(medicalRecords.map(record => record.id));
    } else {
      setSelectedRecords([]);
    }
  };

  // 提交报销明细
  const handleSubmit = async () => {
    if (selectedRecords.length === 0) {
      message.error('请选择至少一条就诊记录');
      return;
    }

    try {
      const values = await form.validateFields();
      
      setSubmitLoading(true);
      const response = await reimbursementAPI.batchCreateReimbursements({
        person_id: patient!.id,
        medical_record_ids: selectedRecords,
        bank_name: values.bank_name,
        bank_account: values.bank_account,
        account_name: values.account_name,
      });

      if (response.code === 0) {
        message.success('报销明细创建成功');
        setCurrentStep(3);
        // 重置状态
        setSelectedRecords([]);
        setMedicalRecords([]);
        setPatient(null);
        setRecognitionResult(null);
        setUploadedFiles([]);
        form.resetFields();
      } else {
        message.error(response.message || '创建失败');
      }
    } catch (error) {
      console.error('提交失败:', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  // 就诊记录表格列定义
  const recordColumns: ColumnsType<MedicalRecord> = [
    {
      title: '选择',
      key: 'selection',
      width: 60,
      render: (_, record) => (
        <Checkbox
          checked={selectedRecords.includes(record.id)}
          onChange={(e) => handleRecordSelection(record.id, e.target.checked)}
        />
      ),
    },
    {
      title: '医院名称',
      dataIndex: 'hospital_name',
      key: 'hospital_name',
      width: 200,
    },
    {
      title: '就诊类别',
      dataIndex: 'visit_type',
      key: 'visit_type',
      width: 120,
    },
    {
      title: '入院时间',
      dataIndex: 'admission_date',
      key: 'admission_date',
      width: 120,
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD') : '-',
    },
    {
      title: '出院时间',
      dataIndex: 'discharge_date',
      key: 'discharge_date',
      width: 120,
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD') : '-',
    },
    {
      title: '总费用',
      dataIndex: 'total_cost',
      key: 'total_cost',
      width: 120,
      render: (text) => {
        const amount = typeof text === 'string' ? parseFloat(text) : text;
        return isNaN(amount) ? '¥0.00' : `¥${amount.toFixed(2)}`;
      },
    },
    {
      title: '政策内费用',
      dataIndex: 'policy_covered_cost',
      key: 'policy_covered_cost',
      width: 120,
      render: (text) => {
        const amount = typeof text === 'string' ? parseFloat(text) : text;
        return isNaN(amount) ? '¥0.00' : `¥${amount.toFixed(2)}`;
      },
    },
    {
      title: '统筹报销',
      dataIndex: 'pool_reimbursement_amount',
      key: 'pool_reimbursement_amount',
      width: 120,
      render: (text) => {
        const amount = typeof text === 'string' ? parseFloat(text) : text;
        return isNaN(amount) ? '¥0.00' : `¥${amount.toFixed(2)}`;
      },
    },
  ];

  // 上传组件配置
  const uploadProps: UploadProps = {
    name: 'image',
    multiple: false,
    beforeUpload: handleUpload,
    showUploadList: false,
    accept: 'image/*'
  };

  // 预览图片
  const handlePreview = (file: RcFile) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
      setPreviewVisible(true);
    };
    reader.readAsDataURL(file);
  };

  // 删除已上传文件
  const handleDeleteFile = (file: RcFile) => {
    setUploadedFiles(prev => prev.filter(f => f !== file));
    if (recognitionResult) {
      setRecognitionResult(null);
    }
  };

  // 重置所有状态
  const handleReset = () => {
    setCurrentStep(0);
    setPatient(null);
    setMedicalRecords([]);
    setSelectedRecords([]);
    setRecognitionResult(null);
    setUploadedFiles([]);
    form.resetFields();
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>OCR识别与报销申请</Title>
      
      {/* 步骤条 */}
      <Card style={{ marginBottom: 24 }}>
        <Steps current={currentStep}>
          <Steps.Step title="图片识别" description="上传图片识别信息" />
          <Steps.Step title="选择就诊记录" description="选择要报销的就诊记录" />
          <Steps.Step title="填写银行信息" description="填写银行账户信息" />
          <Steps.Step title="完成" description="提交报销申请" />
        </Steps>
      </Card>

      <Row gutter={[24, 24]}>
        {/* 左侧：识别结果展示 */}
        <Col xs={24} lg={12}>
          <Card title="识别结果">
            {!recognitionResult && !loading && (
              <Empty
                description="暂无识别结果"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}

            {loading && (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>正在识别中...</div>
                <Progress percent={75} status="active" style={{ marginTop: 16 }} />
              </div>
            )}

            {recognitionResult && (
              <div>
                <Alert
                  message="识别成功"
                  description={`识别耗时：${recognitionResult.processing_time}ms，置信度：${(recognitionResult.confidence * 100).toFixed(1)}%`}
                  type="success"
                  showIcon
                  style={{ marginBottom: 16 }}
                />

                <Descriptions 
                  title="提取的关键信息" 
                  bordered 
                  size="small"
                  labelStyle={{ 
                    fontWeight: 500,
                    minWidth: '80px',
                    verticalAlign: 'top'
                  }}
                  contentStyle={{
                    wordBreak: 'break-all',
                    wordWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.5'
                  }}
                >
                  <Descriptions.Item label="姓名" span={3}>
                    {recognitionResult.extracted_data.name || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="身份证号" span={3}>
                    {recognitionResult.extracted_data.id_card || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="银行卡号" span={3}>
                    {recognitionResult.extracted_data.bank_card || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="手机号" span={3}>
                    {recognitionResult.extracted_data.phone || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="地址" span={3}>
                    {recognitionResult.extracted_data.address || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="银行名称" span={3}>
                    {recognitionResult.extracted_data.bank_name || '-'}
                  </Descriptions.Item>
                </Descriptions>

                <Divider />

                <Card title="原始识别文本" size="small">
                  <Paragraph style={{ whiteSpace: 'pre-line' }}>
                    {recognitionResult.original_text}
                  </Paragraph>
                </Card>

                {/* 查询就诊记录按钮 */}
                {recognitionResult.extracted_data.id_card && (
                  <div style={{ marginTop: 16 }}>
                    <Button 
                      type="primary" 
                      icon={<SearchOutlined />}
                      onClick={handleManualSearch}
                      loading={searchLoading}
                    >
                      查询就诊记录
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* 已上传文件列表 */}
            {uploadedFiles.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <Card title="已上传文件" size="small">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: index < uploadedFiles.length - 1 ? '1px solid #f0f0f0' : 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <FileImageOutlined style={{ marginRight: 8 }} />
                        <div>
                          <div>{file.name}</div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </Text>
                        </div>
                      </div>
                      <div>
                        <Button 
                          type="link" 
                          size="small" 
                          icon={<EyeOutlined />}
                          onClick={() => handlePreview(file)}
                        >
                          预览
                        </Button>
                        <Button 
                          type="link" 
                          size="small" 
                          danger 
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteFile(file)}
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  ))}
                </Card>
              </div>
            )}
          </Card>
        </Col>

        {/* 右侧：功能区域 */}
        <Col xs={24} lg={12}>
          {/* 步骤1：图片上传 */}
          {currentStep === 0 && (
            <Card title="图片识别">
              <Dragger {...uploadProps} disabled={loading}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽图片到此区域进行识别</p>
                <p className="ant-upload-hint">
                  支持 JPG、PNG、GIF 格式，文件大小不超过 10MB
                </p>
              </Dragger>

              {/* 使用说明 */}
              <Card title="使用说明" size="small" style={{ marginTop: 16 }}>
                <div>
                  <p><Text strong>支持的证件类型：</Text></p>
                  <ul>
                    <li>身份证（正面/反面）</li>
                    <li>银行卡</li>
                    <li>其他包含文字信息的证件</li>
                  </ul>
                  <p><Text strong>识别内容：</Text></p>
                  <ul>
                    <li>姓名</li>
                    <li>身份证号</li>
                    <li>银行卡号</li>
                    <li>手机号</li>
                    <li>地址</li>
                    <li>银行名称</li>
                  </ul>
                  <p><Text strong>注意事项：</Text></p>
                  <ul>
                    <li>请确保图片清晰，文字可读</li>
                    <li>支持JPG、PNG、GIF格式</li>
                    <li>文件大小不超过10MB</li>
                    <li>识别结果仅供参考，请人工核对</li>
                  </ul>
                </div>
              </Card>
            </Card>
          )}

          {/* 步骤2：选择就诊记录 */}
          {currentStep === 1 && patient && (
            <Card title="选择就诊记录">
              <Alert
                message={`患者信息：${patient.name} (${patient.id_card})`}
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              
              <div style={{ marginBottom: 16 }}>
                <Space>
                  <Checkbox
                    checked={selectedRecords.length === medicalRecords.length && medicalRecords.length > 0}
                    indeterminate={selectedRecords.length > 0 && selectedRecords.length < medicalRecords.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  >
                    全选
                  </Checkbox>
                  <Text>已选择 {selectedRecords.length} 条记录</Text>
                </Space>
              </div>

              <Table
                columns={recordColumns}
                dataSource={medicalRecords}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ y: 300 }}
              />

              <div style={{ marginTop: 16 }}>
                <Space>
                  <Button 
                    type="primary" 
                    onClick={() => setCurrentStep(2)}
                    disabled={selectedRecords.length === 0}
                  >
                    下一步：填写银行信息
                  </Button>
                  <Button onClick={() => setCurrentStep(0)}>
                    上一步
                  </Button>
                </Space>
              </div>
            </Card>
          )}

          {/* 步骤3：填写银行信息 */}
          {currentStep === 2 && (
            <Card title="填写银行信息">
              <Form
                form={form}
                layout="vertical"
                initialValues={{
                  bank_name: recognitionResult?.extracted_data.bank_name || '',
                  bank_account: recognitionResult?.extracted_data.bank_card || '',
                  account_name: recognitionResult?.extracted_data.name || '',
                }}
              >
                <Form.Item
                  name="bank_name"
                  label="银行名称"
                  rules={[{ required: true, message: '请输入银行名称' }]}
                >
                  <Input placeholder="请输入银行名称" prefix={<BankOutlined />} />
                </Form.Item>

                <Form.Item
                  name="bank_account"
                  label="银行账号"
                  rules={[{ required: true, message: '请输入银行账号' }]}
                >
                  <Input placeholder="请输入银行账号" />
                </Form.Item>

                <Form.Item
                  name="account_name"
                  label="户名"
                  rules={[{ required: true, message: '请输入户名' }]}
                >
                  <Input placeholder="请输入户名" prefix={<UserOutlined />} />
                </Form.Item>

                <div style={{ marginTop: 16 }}>
                  <Space>
                    <Button 
                      type="primary" 
                      onClick={handleSubmit}
                      loading={submitLoading}
                      icon={<CheckCircleOutlined />}
                    >
                      提交报销申请
                    </Button>
                    <Button onClick={() => setCurrentStep(1)}>
                      上一步
                    </Button>
                  </Space>
                </div>
              </Form>
            </Card>
          )}

          {/* 步骤4：完成 */}
          {currentStep === 3 && (
            <Card title="提交完成">
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }} />
                <Title level={3} style={{ color: '#52c41a' }}>报销申请提交成功！</Title>
                <Text type="secondary">已成功创建 {selectedRecords.length} 条报销明细</Text>
                <div style={{ marginTop: 24 }}>
                  <Button type="primary" onClick={handleReset}>
                    重新开始
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </Col>
      </Row>

      {/* 图片预览模态框 */}
      <Modal
        open={previewVisible}
        title="图片预览"
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
      >
        <img alt="预览" style={{ width: '100%' }} src={previewImage} />
      </Modal>
    </div>
  );
};

export default OcrPage; 