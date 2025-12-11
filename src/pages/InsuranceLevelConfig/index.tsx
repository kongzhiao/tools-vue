import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Popconfirm,
  Row,
  Col,
  Tag,
  Radio,
  Upload,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { request, useAccess } from '@umijs/max';
import { getConfig } from '../../config';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import type { RcFile } from 'antd/es/upload';

const { Option } = Select;

interface InsuranceLevelConfig {
  id: number;
  year: number;
  payment_category: string;
  level: string;
  subsidy_amount: number;
  personal_amount: number;
  effective_period?: string;
  payment_department?: string;
  remark?: string;
  created_at: string;
  updated_at: string;
}

const InsuranceLevelConfigPage: React.FC = () => {
  const access = useAccess();
  const [data, setData] = useState<InsuranceLevelConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InsuranceLevelConfig | null>(null);
  const [form] = Form.useForm();
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [paymentCategories, setPaymentCategories] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [templateData, setTemplateData] = useState<InsuranceLevelConfig[]>([]);
  const [templateYear, setTemplateYear] = useState<number>(new Date().getFullYear());
  const [amountOption, setAmountOption] = useState<'keep' | 'zero'>('zero');
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importMode, setImportMode] = useState<'overwrite' | 'append'>('append');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message: string;
    data?: any[];
  } | null>(null);

  // 权限检查
  if (!access.canAccessInsuranceLevelConfig) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Alert
          message="无权限访问"
          description="您没有权限访问参保档次配置功能，请联系管理员。"
          type="warning"
          showIcon
        />
      </div>
    );
  }

  // 获取所有年份
  const fetchYears = async () => {
    try {
      const response = await request('/api/insurance-level-configs/years');
      if (response.code === 0) {
        setYears(response.data);
        if (response.data.length > 0 && !response.data.includes(selectedYear)) {
          setSelectedYear(response.data[0]);
        }
      }
    } catch (error) {
      message.error('获取年份列表失败');
    }
  };

  // 获取代缴类别
  const fetchPaymentCategories = async () => {
    try {
      const response = await request('/api/insurance-level-configs/payment-categories');
      if (response.code === 0) {
        setPaymentCategories(response.data);
      }
    } catch (error) {
      message.error('获取代缴类别失败');
    }
  };

  // 获取档次
  const fetchLevels = async () => {
    try {
      const response = await request('/api/insurance-level-configs/levels');
      if (response.code === 0) {
        setLevels(response.data);
      }
    } catch (error) {
      message.error('获取档次失败');
    }
  };

  // 获取数据
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await request('/api/insurance-level-configs', {
        params: { 
          year: selectedYear,
          page_size: 1000, // 获取所有数据，不分页
        },
      });
      if (response.code === 0) {
        setData(response.data.list || []);
      }
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取模板数据
  const fetchTemplate = async () => {
    try {
      const response = await request('/api/insurance-level-configs/template');
      if (response.code === 0) {
        setTemplateData(response.data);
      }
    } catch (error) {
      message.error('获取模板数据失败');
    }
  };

  // 下载模板
  const handleDownloadTemplate = () => {
    const templateUrl = '/assets/templates/business-config/业务配置-参保档次配置.xls';
    const link = document.createElement('a');
    link.href = templateUrl;
    link.download = '业务配置-参保档次配置.xls';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 文件上传前验证
  const beforeUpload = (file: RcFile) => {
    const isExcel = file.type === 'application/vnd.ms-excel' || 
                    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (!isExcel) {
      message.error('只能上传Excel文件！');
      return false;
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('文件大小不能超过10MB！');
      return false;
    }
    return true;
  };

  // 处理文件上传
  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.error('请选择要上传的文件');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileList[0] as any);
    formData.append('mode', importMode);
    formData.append('year', selectedYear.toString());

    setUploading(true);
    try {
      const response = await request('/api/insurance-level-configs/import', {
        method: 'POST',
        data: formData,
      });
      
      if (response.code === 0) {
        message.success('导入成功');
        setImportModalVisible(false);
        setFileList([]);
        setValidationResult(null);
        fetchData();
        fetchYears();
      } else {
        message.error(response.message || '导入失败');
      }
    } catch (error: any) {
      message.error(error.message || '导入失败');
    } finally {
      setUploading(false);
    }
  };

  // 处理文件验证
  const handleFileValidation = async (file: UploadFile) => {
    const formData = new FormData();
    formData.append('file', file as any);

    try {
      const response = await request('/api/insurance-level-configs/validate', {
        method: 'POST',
        data: formData,
      });
      
      if (response.code === 0) {
        setValidationResult({
          valid: true,
          message: '文件格式正确，可以导入',
          data: response.data,
        });
      } else {
        setValidationResult({
          valid: false,
          message: response.message || '文件格式不正确',
        });
      }
    } catch (error: any) {
      setValidationResult({
        valid: false,
        message: error.message || '文件验证失败',
      });
    }
  };

  const uploadProps: UploadProps = {
    onRemove: () => {
      setFileList([]);
      setValidationResult(null);
    },
    beforeUpload: (file) => {
      if (beforeUpload(file)) {
        setFileList([file]);
        handleFileValidation(file);
      }
      return false;
    },
    fileList,
    maxCount: 1,
  };

  useEffect(() => {
    fetchYears();
    fetchPaymentCategories();
    fetchLevels();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchData();
    }
  }, [selectedYear]);

  // 创建或更新
  const handleSubmit = async (values: any) => {
    try {
      if (editingRecord) {
        await request(`/api/insurance-level-configs/${editingRecord.id}`, {
          method: 'PUT',
          data: { ...values, year: selectedYear },
        });
        message.success('更新成功');
      } else {
        await request('/api/insurance-level-configs', {
          method: 'POST',
          data: { ...values, year: selectedYear },
        });
        message.success('创建成功');
      }
      setModalVisible(false);
      setEditingRecord(null);
      form.resetFields();
      fetchData();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  // 删除
  const handleDelete = async (id: number) => {
    try {
      await request(`/api/insurance-level-configs/${id}`, {
        method: 'DELETE',
      });
      message.success('删除成功');
      fetchData();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  // 批量创建
  const handleBatchCreate = async (templateYear: number) => {
    try {
      const response = await request('/api/insurance-level-configs/batch-create', {
        method: 'POST',
        data: {
          year: templateYear,
          configs: templateData.map(item => ({
            payment_category: item.payment_category,
            level: item.level,
            subsidy_amount: amountOption === 'zero' ? 0 : item.subsidy_amount,
            personal_amount: amountOption === 'zero' ? 0 : item.personal_amount,
            effective_period: item.effective_period,
            payment_department: item.payment_department,
            remark: item.remark,
          })),
        },
      });
      if (response.code === 0) {
        message.success('批量创建成功');
        setTemplateModalVisible(false);
        fetchData();
        fetchYears();
      }
    } catch (error: any) {
      message.error(error.message || '批量创建失败');
    }
  };

  // 删除年份所有配置
  const handleDeleteYear = async () => {
    try {
      await request('/api/insurance-level-configs/by-year', {
        method: 'DELETE',
        data: { year: selectedYear },
      });
      message.success('删除成功');
      fetchData();
      fetchYears();
    } catch (error: any) {
      message.error('删除失败');
    }
  };

  const columns = [
    {
      title: '代缴类别',
      dataIndex: 'payment_category',
      key: 'payment_category',
      width: 200,
      render: (text: string, record: InsuranceLevelConfig, index: number) => {
        // 计算当前代缴类别的行数
        const currentCategory = text;
        const categoryCount = data.filter(item => item.payment_category === currentCategory).length;
        
        // 找到当前代缴类别在数据中的第一个索引
        const firstIndex = data.findIndex(item => item.payment_category === currentCategory);
        
        // 如果是当前代缴类别的第一行，则显示文本并设置rowSpan
        if (index === firstIndex) {
          return {
            children: (
              <div>
                <strong>{text}</strong>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  {categoryCount} 个档次
                </div>
              </div>
            ),
            props: {
              rowSpan: categoryCount,
            },
          };
        }
        
        // 其他行返回空，不显示
        return {
          children: null,
          props: {
            rowSpan: 0,
          },
        };
      },
    },
    {
      title: '档次',
      dataIndex: 'level',
      key: 'level',
      width: 120,
      render: (level: string) => {
        let color = 'default';
        if (level.includes('大学生一档')) {
          color = 'purple';
        } else if (level.includes('大学生二档')) {
          color = 'magenta';
        } else if (level.includes('一档')) {
          color = 'blue';
        } else if (level.includes('二档')) {
          color = 'green';
        } else if (level.includes('大学生')) {
          color = 'purple';
        } else {
          color = 'orange';
        }
        return <Tag color={color} style={{ fontWeight: 'bold' }}>{level}</Tag>;
      },
    },
    {
      title: '资助代缴金额（元）',
      dataIndex: 'subsidy_amount',
      key: 'subsidy_amount',
      width: 150,
      render: (amount: any) => {
        const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
        return `¥${numAmount.toFixed(2)}`;
      },
    },
    {
      title: '个人实缴金额（元）',
      dataIndex: 'personal_amount',
      key: 'personal_amount',
      width: 150,
      render: (amount: any) => {
        const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
        return `¥${numAmount.toFixed(2)}`;
      },
    },
    {
      title: '标准执行起止时间',
      dataIndex: 'effective_period',
      key: 'effective_period',
      width: 180,
    },
    {
      title: '代缴资金支付部门',
      dataIndex: 'payment_department',
      key: 'payment_department',
      width: 200,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 150,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: InsuranceLevelConfig) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingRecord(record);
              form.setFieldsValue(record);
              setModalVisible(true);
            }}
            disabled={!access.canUpdateInsuranceLevelConfig}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这条记录吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            disabled={!access.canDeleteInsuranceLevelConfig}
          >
            <Button 
              type="link" 
              size="small" 
              danger 
              icon={<DeleteOutlined />}
              disabled={!access.canDeleteInsuranceLevelConfig}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <style>
        {`
          .group-start {
            background-color: #f8f9fa;
            border-top: 2px solid #1890ff;
          }
          .group-continue {
            background-color: #f8f9fa;
          }
          .group-start:hover {
            background-color: #e6f7ff !important;
          }
          .group-continue:hover {
            background-color: #e6f7ff !important;
          }
          .ant-table-tbody > tr > td {
            border-bottom: 1px solid #f0f0f0;
          }
          .ant-table-tbody > tr.group-start > td {
            border-top: 2px solid #1890ff;
          }
        `}
      </style>
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col>
            <Select
              value={selectedYear}
              onChange={setSelectedYear}
              style={{ width: 120 }}
              placeholder="选择年份"
            >
              {years.map(year => (
                <Option key={year} value={year}>{year}年</Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingRecord(null);
                form.resetFields();
                setModalVisible(true);
              }}
              disabled={!access.canCreateInsuranceLevelConfig}
            >
              新增配置
            </Button>
          </Col>
          <Col>
            <Button
              icon={<CopyOutlined />}
              onClick={() => {
                fetchTemplate();
                setTemplateYear(selectedYear + 1);
                setTemplateModalVisible(true);
              }}
              disabled={!access.canCreateInsuranceLevelConfig}
            >
              从模板创建
            </Button>
          </Col>
          <Col>
            <Popconfirm
              title={`确定要删除${selectedYear}年的所有配置吗？`}
              onConfirm={handleDeleteYear}
              okText="确定"
              cancelText="取消"
              disabled={!access.canDeleteInsuranceLevelConfig}
            >
              <Button danger disabled={!access.canDeleteInsuranceLevelConfig}>删除年份配置</Button>
            </Popconfirm>
          </Col>
          <Col>
            <Button
              icon={<UploadOutlined />}
              onClick={() => setImportModalVisible(true)}
              disabled={!access.canCreateInsuranceLevelConfig}
            >
              从Excel导入
            </Button>
          </Col>
        </Row>
        
        {/* 统计信息 */}
        {data.length > 0 && (
          <Row style={{ marginBottom: 16 }}>
            <Col>
              <div style={{ 
                background: '#f6ffed', 
                border: '1px solid #b7eb8f', 
                borderRadius: '6px', 
                padding: '8px 16px',
                fontSize: '14px'
              }}>
                <strong>{selectedYear}年配置统计：</strong>
                共 {data.length} 条配置，涉及 {new Set(data.map(item => item.payment_category)).size} 个代缴类别
              </div>
            </Col>
          </Row>
        )}

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 1200 }}
          rowClassName={(record, index) => {
            if (index === 0) return 'group-start';
            const prevRecord = data[index - 1];
            if (prevRecord && prevRecord.payment_category === record.payment_category) {
              return 'group-continue';
            }
            return 'group-start';
          }}
        />
      </Card>

      {/* 新增/编辑模态框 */}
      <Modal
        title={editingRecord ? '编辑配置' : '新增配置'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingRecord(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="payment_category"
                label="代缴类别"
                rules={[{ required: true, message: '请选择或输入代缴类别' }]}
              >
                <Select 
                  placeholder="请选择或输入代缴类别" 
                  showSearch
                  allowClear
                  mode="tags"
                  maxTagCount="responsive"
                >
                  {paymentCategories.map(category => (
                    <Option key={category} value={category}>{category}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="level"
                label="档次"
                rules={[{ required: true, message: '请选择或输入档次' }]}
              >
                <Select 
                  placeholder="请选择或输入档次"
                  showSearch
                  allowClear
                  mode="tags"
                  maxTagCount="responsive"
                >
                  {levels.map(level => (
                    <Option key={level} value={level}>{level}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="subsidy_amount"
                label="资助代缴金额（元）"
                rules={[{ required: true, message: '请输入资助代缴金额' }]}
              >
                <InputNumber
                  min={0}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="请输入金额"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="personal_amount"
                label="个人实缴金额（元）"
                rules={[{ required: true, message: '请输入个人实缴金额' }]}
              >
                <InputNumber
                  min={0}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="请输入金额"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="effective_period" label="标准执行起止时间">
                <Input placeholder="如：2024.10.1-2025.6.30" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="payment_department" label="代缴资金支付部门">
                <Input placeholder="如：区医保局" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                disabled={editingRecord ? !access.canUpdateInsuranceLevelConfig : !access.canCreateInsuranceLevelConfig}
              >
                {editingRecord ? '更新' : '创建'}
              </Button>
              <Button onClick={() => {
                setModalVisible(false);
                setEditingRecord(null);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 模板选择模态框 */}
      <Modal
        title="从模板创建配置"
        open={templateModalVisible}
        onCancel={() => setTemplateModalVisible(false)}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col>
              <span>输入要创建的年份：</span>
            </Col>
            <Col>
              <InputNumber
                value={templateYear}
                onChange={(value) => setTemplateYear(value || new Date().getFullYear())}
                style={{ width: 120 }}
                placeholder="如：2026"
                min={2020}
                max={2030}
                precision={0}
                addonAfter="年"
              />
            </Col>
          </Row>
          <Row gutter={16} align="middle" style={{ marginTop: 8 }}>
            <Col>
              <span>金额处理方式：</span>
            </Col>
            <Col>
              <Radio.Group value={amountOption} onChange={(e) => setAmountOption(e.target.value)}>
                <Radio value="zero">设置为0（需要手动确认）</Radio>
                <Radio value="keep">沿用原金额</Radio>
              </Radio.Group>
            </Col>
          </Row>
          <div style={{ marginTop: 8 }}>
            <p>
              将从最近年份的配置创建{templateYear}年的配置，
              {amountOption === 'zero' ? '金额将设为0，请确认后手动填写。' : '金额将沿用原配置。'}
            </p>
            <p style={{ fontSize: '12px', color: '#666' }}>
              提示：年份范围 2020-2030，可以输入新的年份（如：2026、2027等）。
            </p>
          </div>
        </div>
        <Table
          columns={[
            { title: '代缴类别', dataIndex: 'payment_category', key: 'payment_category' },
            { title: '档次', dataIndex: 'level', key: 'level' },
            { title: '原资助金额', dataIndex: 'subsidy_amount', key: 'subsidy_amount', render: (amount: any) => {
                const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
                return `¥${numAmount.toFixed(2)}`;
              } },
            { title: '原个人金额', dataIndex: 'personal_amount', key: 'personal_amount', render: (amount: any) => {
                const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
                return `¥${numAmount.toFixed(2)}`;
              } },
            { title: '将创建资助金额', key: 'new_subsidy_amount', render: (record: any) => {
                const numAmount = typeof record.subsidy_amount === 'number' ? record.subsidy_amount : parseFloat(record.subsidy_amount) || 0;
                const newAmount = amountOption === 'zero' ? 0 : numAmount;
                return <span style={{ color: amountOption === 'zero' ? '#ff4d4f' : '#52c41a' }}>¥{newAmount.toFixed(2)}</span>;
              } },
            { title: '将创建个人金额', key: 'new_personal_amount', render: (record: any) => {
                const numAmount = typeof record.personal_amount === 'number' ? record.personal_amount : parseFloat(record.personal_amount) || 0;
                const newAmount = amountOption === 'zero' ? 0 : numAmount;
                return <span style={{ color: amountOption === 'zero' ? '#ff4d4f' : '#52c41a' }}>¥{newAmount.toFixed(2)}</span>;
              } },
          ]}
          dataSource={templateData}
          rowKey="id"
          pagination={false}
          size="small"
        />
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Space>
            <Button onClick={() => setTemplateModalVisible(false)}>取消</Button>
            <Button 
              type="primary" 
              onClick={() => handleBatchCreate(templateYear)}
              disabled={!templateYear || templateYear < 2020 || templateYear > 2030 || !Number.isInteger(templateYear) || !access.canCreateInsuranceLevelConfig}
            >
              确认创建
            </Button>
          </Space>
        </div>
      </Modal>

      {/* 导入模态框 */}
      <Modal
        title="从Excel导入配置"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          setFileList([]);
          setValidationResult(null);
        }}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="导入说明"
            description={
              <div>
                <p>1. 请先下载模板文件，按照模板格式填写数据</p>
                <p>2. 支持.xls或.xlsx格式的Excel文件</p>
                <p>3. 文件大小不能超过10MB</p>
                <p>4. 导入时请选择是全量覆盖还是增量添加</p>
              </div>
            }
            type="info"
            showIcon
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleDownloadTemplate}
          >
            下载导入模板
          </Button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Radio.Group
            value={importMode}
            onChange={(e) => setImportMode(e.target.value)}
          >
            <Radio.Button value="append">增量添加</Radio.Button>
            <Radio.Button value="overwrite">全量覆盖</Radio.Button>
          </Radio.Group>
          <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
            {importMode === 'overwrite' ? 
              '全量覆盖：将删除所选年份的所有现有配置，并导入新配置' :
              '增量添加：保留现有配置，仅添加新的配置项'}
          </div>
        </div>

        <Upload.Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持单个.xls或.xlsx文件上传，文件大小不超过10MB
          </p>
        </Upload.Dragger>

        {validationResult && (
          <div style={{ marginTop: 16 }}>
            <Alert
              message={validationResult.valid ? "文件验证通过" : "文件验证失败"}
              description={validationResult.message}
              type={validationResult.valid ? "success" : "error"}
              showIcon
            />
            {validationResult.valid && validationResult.data && (
              <div style={{ marginTop: 8 }}>
                <div>预览：共{validationResult.data.length}条记录</div>
                <Table
                  columns={[
                    { title: '代缴类别', dataIndex: 'payment_category' },
                    { title: '档次', dataIndex: 'level' },
                    { title: '资助金额', dataIndex: 'subsidy_amount' },
                    { title: '个人金额', dataIndex: 'personal_amount' },
                  ]}
                  dataSource={validationResult.data.slice(0, 5)}
                  size="small"
                  pagination={false}
                  style={{ marginTop: 8 }}
                />
                {validationResult.data.length > 5 && (
                  <div style={{ textAlign: 'center', color: '#666', marginTop: 8 }}>
                    显示前5条记录...
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Space>
            <Button
              onClick={() => {
                setImportModalVisible(false);
                setFileList([]);
                setValidationResult(null);
              }}
            >
              取消
            </Button>
            <Button
              type="primary"
              onClick={handleUpload}
              disabled={!validationResult?.valid || uploading || !access.canCreateInsuranceLevelConfig}
              loading={uploading}
            >
              {uploading ? '导入中' : '确认导入'}
            </Button>
          </Space>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default InsuranceLevelConfigPage; 