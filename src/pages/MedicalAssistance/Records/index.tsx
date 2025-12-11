import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  InputNumber,
  Tooltip,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  SearchOutlined,
  FileTextOutlined,
  CalendarOutlined,
  DollarOutlined,
  UserOutlined,
  ReloadOutlined,
  ImportOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { medicalRecordAPI, MedicalRecord, patientAPI, Patient } from '@/services/medicalAssistance';
import ImportModal from './components/ImportModal';
import { useAccess } from '@umijs/max';

const { Option } = Select;
const { TextArea } = Input;

const Records: React.FC = () => {
  const access = useAccess();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 15,
    total: 0,
  });
  const [patients, setPatients] = useState<Patient[]>([]);
  const [visitTypes, setVisitTypes] = useState<string[]>([]);
  const [hospitals, setHospitals] = useState<string[]>([]);
  const [processingStatuses, setProcessingStatuses] = useState<string[]>([]);

  // 获取就诊记录列表
  const fetchRecords = async (page = 1, pageSize = 15, filters = {}) => {
    setLoading(true);
    try {
      const response = await medicalRecordAPI.getMedicalRecords({
        page,
        page_size: pageSize,
        ...filters,
      });
      
      if (response.code === 0) {
        setRecords(response.data.data);
        setPagination({
          current: response.data.page,
          pageSize: response.data.page_size,
          total: response.data.total,
        });
      } else {
        message.error(response.message || '获取就诊记录失败');
      }
    } catch (error) {
      message.error('获取就诊记录失败');
      console.error('获取就诊记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取患者列表
  const fetchPatients = async () => {
    try {
      const response = await patientAPI.getPatients({ page: 1, page_size: 1000 });
      if (response.code === 0) {
        console.log('患者数据:', response.data.data); // 调试信息
        setPatients(response.data.data);
      }
    } catch (error) {
      console.error('获取患者列表失败:', error);
    }
  };

  // 获取就诊类别
  const fetchVisitTypes = async () => {
    try {
      const response = await medicalRecordAPI.getVisitTypes();
      if (response.code === 0) {
        setVisitTypes(response.data);
      }
    } catch (error) {
      console.error('获取就诊类别失败:', error);
    }
  };

  // 获取医院名称
  const fetchHospitals = async () => {
    try {
      const response = await medicalRecordAPI.getHospitals();
      if (response.code === 0) {
        setHospitals(response.data);
      }
    } catch (error) {
      console.error('获取医院名称失败:', error);
    }
  };

  // 获取处理状态
  const fetchProcessingStatuses = async () => {
    try {
      const response = await medicalRecordAPI.getProcessingStatuses();
      if (response.code === 0) {
        setProcessingStatuses(response.data);
      }
    } catch (error) {
      console.error('获取处理状态失败:', error);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchPatients();
    fetchVisitTypes();
    fetchHospitals();
    fetchProcessingStatuses();
  }, []);

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleView = (record: MedicalRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({
      person_id: record.person_id,
      hospital_name: record.hospital_name,
      visit_type: record.visit_type,
      admission_date: record.admission_date ? dayjs(record.admission_date) : null,
      discharge_date: record.discharge_date ? dayjs(record.discharge_date) : null,
      settlement_date: record.settlement_date ? dayjs(record.settlement_date) : null,
      total_cost: record.total_cost,
      policy_covered_cost: record.policy_covered_cost,
      pool_reimbursement_amount: record.pool_reimbursement_amount,
      large_amount_reimbursement_amount: record.large_amount_reimbursement_amount,
      critical_illness_reimbursement_amount: record.critical_illness_reimbursement_amount,
      medical_assistance_amount: record.medical_assistance_amount,
      excess_reimbursement_amount: record.excess_reimbursement_amount,
      processing_status: record.processing_status,
    });
    setModalVisible(true);
  };


  // 处理导入成功
  const handleImportSuccess = () => {
    // 刷新就诊记录列表
    fetchRecords(pagination.current, pagination.pageSize);
    // 关闭导入模态框
    setImportModalVisible(false);
  };

  // 批量删除就诊记录
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的就诊记录');
      return;
    }

    Modal.confirm({
      title: '确认批量删除',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>您确定要删除选中的 {selectedRowKeys.length} 条就诊记录吗？</p>
          <p style={{ color: '#ff4d4f', marginTop: 8 }}>
            <strong>注意：</strong>删除就诊记录时，相关的受理记录也会被自动处理：
          </p>
          <ul style={{ color: '#666', marginLeft: 16, marginTop: 4 }}>
            <li>如果受理记录中只包含被删除的就诊记录，整个受理记录将被删除</li>
            <li>如果受理记录中包含多个就诊记录，将从中移除被删除的记录并重新计算金额</li>
          </ul>
        </div>
      ),
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      width: 520,
      onOk: async () => {
        try {
          const response = await medicalRecordAPI.batchDeleteMedicalRecords(selectedRowKeys as number[]);
          if (response.code === 0) {
            message.success(response.message);
            setSelectedRowKeys([]);
            fetchRecords(pagination.current, pagination.pageSize);
          } else {
            message.error(response.message || '批量删除失败');
          }
        } catch (error) {
          message.error('批量删除失败');
          console.error('批量删除失败:', error);
        }
      },
    });
  };

  // 单个删除就诊记录
  const handleDelete = (record: MedicalRecord) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>您确定要删除这条就诊记录吗？</p>
          <p style={{ color: '#ff4d4f', marginTop: 8 }}>
            <strong>注意：</strong>删除就诊记录时，相关的受理记录也会被自动处理：
          </p>
          <ul style={{ color: '#666', marginLeft: 16, marginTop: 4 }}>
            <li>如果受理记录中只包含此就诊记录，整个受理记录将被删除</li>
            <li>如果受理记录中包含多个就诊记录，将从中移除此记录并重新计算金额</li>
          </ul>
        </div>
      ),
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      width: 520,
      onOk: async () => {
        try {
          const response = await medicalRecordAPI.deleteMedicalRecord(record.id);
          if (response.code === 0) {
            message.success(response.message);
            fetchRecords(pagination.current, pagination.pageSize);
          } else {
            message.error(response.message || '删除失败');
          }
        } catch (error) {
          message.error('删除失败');
          console.error('删除失败:', error);
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 转换日期格式
      const recordData = {
        ...values,
        admission_date: values.admission_date ? values.admission_date.format('YYYY-MM-DD') : null,
        discharge_date: values.discharge_date ? values.discharge_date.format('YYYY-MM-DD') : null,
        settlement_date: values.settlement_date ? values.settlement_date.format('YYYY-MM-DD') : null,
      };

      if (editingRecord) {
        // 更新就诊记录
        const response = await medicalRecordAPI.updateMedicalRecord(editingRecord.id, recordData);
        if (response.code === 0) {
        message.success('就诊记录更新成功');
          setModalVisible(false);
          fetchRecords(pagination.current, pagination.pageSize);
        } else {
          message.error(response.message || '更新失败');
        }
      } else {
        // 创建就诊记录
        const response = await medicalRecordAPI.createMedicalRecord(recordData);
        if (response.code === 0) {
          message.success('就诊记录创建成功');
      setModalVisible(false);
          fetchRecords(pagination.current, pagination.pageSize);
        } else {
          message.error(response.message || '创建失败');
        }
      }
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  const handleSearch = () => {
    const values = searchForm.getFieldsValue();
    const filters: Record<string, any> = {};
    
    // 过滤空值
    Object.keys(values).forEach(key => {
      if (values[key] !== undefined && values[key] !== '') {
        if (key === 'admission_date_start' || key === 'admission_date_end') {
          filters[key] = values[key] ? values[key].format('YYYY-MM-DD') : '';
        } else {
          filters[key] = values[key];
        }
      }
    });
    
    fetchRecords(1, pagination.pageSize, filters);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleReset = () => {
    searchForm.resetFields();
    fetchRecords(1, pagination.pageSize);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (pagination: any) => {
    const values = searchForm.getFieldsValue();
    const filters: Record<string, any> = {};
    
    Object.keys(values).forEach(key => {
      if (values[key] !== undefined && values[key] !== '') {
        if (key === 'admission_date_start' || key === 'admission_date_end') {
          filters[key] = values[key] ? values[key].format('YYYY-MM-DD') : '';
        } else {
          filters[key] = values[key];
        }
      }
    });
    
    fetchRecords(pagination.current, pagination.pageSize, filters);
  };

  const getPatientName = (personId: number) => {
    const patient = patients.find(p => p.id === personId);
    return patient ? patient.name : `患者${personId}`;
  };

  const getStatusTag = (status: string) => {
    const statusMap = {
      unreimbursed: { color: 'orange', text: '未报销' },
      reimbursed: { color: 'green', text: '已报销' },
      returned: { color: 'red', text: '已退回' },
    };
    const config = statusMap[status as keyof typeof statusMap] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns: ColumnsType<MedicalRecord> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '患者姓名',
      key: 'patient_name',
      width: 120,
      render: (_, record) => getPatientName(record.person_id),
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
      title: '统筹基金支付',
      dataIndex: 'pool_reimbursement_amount',
      key: 'pool_reimbursement_amount',
      width: 120,
      render: (text) => {
        const amount = typeof text === 'string' ? parseFloat(text) : text;
        return isNaN(amount) ? '¥0.00' : `¥${amount.toFixed(2)}`;
      },
    },
    {
      title: '大额医疗费用补助',
      dataIndex: 'large_amount_reimbursement_amount',
      key: 'large_amount_reimbursement_amount',
      width: 120,
      render: (text) => {
        const amount = typeof text === 'string' ? parseFloat(text) : text;
        return isNaN(amount) ? '¥0.00' : `¥${amount.toFixed(2)}`;
      },
    },
    {
      title: '大病保险支付',
      dataIndex: 'critical_illness_reimbursement_amount',
      key: 'critical_illness_reimbursement_amount',
      width: 120,
      render: (text) => {
        const amount = typeof text === 'string' ? parseFloat(text) : text;
        return isNaN(amount) ? '¥0.00' : `¥${amount.toFixed(2)}`;
      },
    },
    {
      title: '医疗救助支付',
      dataIndex: 'medical_assistance_amount',
      key: 'medical_assistance_amount',
      width: 120,
      render: (text) => {
        const amount = typeof text === 'string' ? parseFloat(text) : text;
        return isNaN(amount) ? '¥0.00' : `¥${amount.toFixed(2)}`;
      },
    },
    {
      title: '渝快保支付',
      dataIndex: 'excess_reimbursement_amount',
      key: 'excess_reimbursement_amount',
      width: 120,
      render: (text) => {
        const amount = typeof text === 'string' ? parseFloat(text) : text;
        return isNaN(amount) ? '¥0.00' : `¥${amount.toFixed(2)}`;
      },
    },
    {
      title: '处理状态',
      dataIndex: 'processing_status',
      key: 'processing_status',
      width: 100,
      render: (text) => getStatusTag(text),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          {access.canDeleteMedicalRecords && (
            <Button
              type="link"
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              danger
            >
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="就诊记录总数"
              value={pagination.total}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="未报销"
              value={records.filter(r => r.processing_status === 'unreimbursed').length}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已报销"
              value={records.filter(r => r.processing_status === 'reimbursed').length}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已退回"
              value={records.filter(r => r.processing_status === 'returned').length}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 搜索表单 */}
      <Card style={{ marginBottom: 16 }}>
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearch}
          style={{ marginBottom: 16 }}
        >
          <Form.Item name="person_id" label="患者">
            <Select
              placeholder="请选择患者"
              allowClear
              style={{ width: 200 }}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) => {
                if (!option?.children) return false;
                const searchText = input.toLowerCase();
                
                // 获取患者数据用于搜索
                const patient = patients.find(p => p.id === option?.value);
                if (!patient) return false;
                
                // 可以按姓名或完整身份证号搜索
                const nameMatch = patient.name.toLowerCase().includes(searchText);
                const idCardMatch = patient.id_card?.toLowerCase().includes(searchText) || false;
                
                return nameMatch || idCardMatch;
              }}
            >
              {patients.map(patient => {
                const idCardSuffix = patient.id_card && patient.id_card.length >= 6 
                  ? patient.id_card.slice(-6) 
                  : patient.id_card || '';
                return (
                  <Option key={patient.id} value={patient.id}>
                    {patient.name} ({idCardSuffix})
                  </Option>
                );
              })}
            </Select>
          </Form.Item>
          <Form.Item name="hospital_name" label="医院名称">
            <Input placeholder="请输入医院名称" allowClear />
          </Form.Item>
          <Form.Item name="visit_type" label="就诊类别">
            <Select
              placeholder="请选择就诊类别"
              allowClear
              style={{ width: 150 }}
            >
              {visitTypes.map(type => (
                <Option key={type} value={type}>{type}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="processing_status" label="处理状态">
            <Select
              placeholder="请选择处理状态"
              allowClear
              style={{ width: 150 }}
            >
              {processingStatuses.map(status => (
                <Option key={status} value={status}>
                  {status === 'unreimbursed' ? '未报销' : 
                   status === 'reimbursed' ? '已报销' : '已退回'}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="admission_date_start" label="入院时间开始">
            <DatePicker placeholder="开始日期" />
          </Form.Item>
          <Form.Item name="admission_date_end" label="入院时间结束">
            <DatePicker placeholder="结束日期" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 数据表格 */}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space>
            {access.canCreateMedicalRecords && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                新增就诊记录
              </Button>
            )}
            {access.canCreateMedicalRecords && (
              <Button 
                type="primary" 
                icon={<ImportOutlined />} 
                onClick={() => setImportModalVisible(true)}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                导入数据
              </Button>
            )}
            {access.canBatchDeleteMedicalRecords && selectedRowKeys.length > 0 && (
              <Button 
                type="primary" 
                danger
                icon={<DeleteOutlined />} 
                onClick={handleBatchDelete}
              >
                批量删除 ({selectedRowKeys.length})
              </Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={() => fetchRecords()}>
              刷新
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={records}
          rowKey="id"
          loading={loading}
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys,
            onChange: (selectedRowKeys) => {
              setSelectedRowKeys(selectedRowKeys);
            },
            getCheckboxProps: (record) => ({
              disabled: !access.canBatchDeleteMedicalRecords,
            }),
          }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* 新增/编辑模态框 */}
      <Modal
        title={editingRecord ? '查看就诊记录' : '新增就诊记录'}
        open={modalVisible}
        onOk={editingRecord ? undefined : handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={800}
        okText={editingRecord ? undefined : "确定"}
        cancelText="取消"
        destroyOnClose
        footer={editingRecord ? [
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>
        ] : undefined}
      >
        <Form
          form={form}
          layout="vertical"
          disabled={!!editingRecord}
          initialValues={{
            person_id: undefined,
            hospital_name: '',
            visit_type: '',
            admission_date: null,
            discharge_date: null,
            settlement_date: null,
            total_cost: 0,
            policy_covered_cost: 0,
            pool_reimbursement_amount: 0,
            large_amount_reimbursement_amount: 0,
            critical_illness_reimbursement_amount: 0,
            medical_assistance_amount: 0,
            excess_reimbursement_amount: 0,
            processing_status: 'unreimbursed',
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="person_id"
                label="患者"
                rules={[{ required: true, message: '请选择患者' }]}
              >
                <Select
                  placeholder="请选择患者"
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) => {
                    if (!option?.children) return false;
                    const text = option.children.toString().toLowerCase();
                    const searchText = input.toLowerCase();
                    
                    // 获取患者数据用于搜索
                    const patient = patients.find(p => p.id === option?.value);
                    if (!patient) return false;
                    
                    // 可以按姓名或完整身份证号搜索
                    const nameMatch = patient.name.toLowerCase().includes(searchText);
                    const idCardMatch = patient.id_card?.toLowerCase().includes(searchText) || false;
                    
                    return nameMatch || idCardMatch;
                  }}
                >
                  {patients.map(patient => {
                    const idCardSuffix = patient.id_card && patient.id_card.length >= 6 
                      ? patient.id_card.slice(-6) 
                      : patient.id_card || '';
                    return (
                      <Option key={patient.id} value={patient.id}>
                        {patient.name} {idCardSuffix}
                      </Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="hospital_name"
                label="医院名称"
                rules={[{ required: true, message: '请输入医院名称' }]}
              >
                <Input placeholder="请输入医院名称" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="visit_type"
                label="就诊类别"
                rules={[{ required: true, message: '请选择就诊类别' }]}
              >
                <Select placeholder="请选择就诊类别">
                  {visitTypes.map(type => (
                    <Option key={type} value={type}>{type}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="processing_status"
                label="处理状态"
                rules={[{ required: true, message: '请选择处理状态' }]}
              >
                <Select placeholder="请选择处理状态">
                  {processingStatuses.map(status => (
                    <Option key={status} value={status}>
                      {status === 'unreimbursed' ? '未报销' : 
                       status === 'reimbursed' ? '已报销' : '已退回'}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="admission_date"
                label="入院时间"
                rules={[{ required: true, message: '请选择入院时间' }]}
              >
                <DatePicker style={{ width: '100%' }} placeholder="请选择入院时间" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="discharge_date"
                label="出院时间"
              >
                <DatePicker style={{ width: '100%' }} placeholder="请选择出院时间" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="settlement_date"
                label="结算时间"
              >
                <DatePicker style={{ width: '100%' }} placeholder="请选择结算时间" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="total_cost"
                label="总费用"
                rules={[{ required: true, message: '请输入总费用' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入总费用"
                  min={0}
                  precision={2}
                  addonAfter="元"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="policy_covered_cost"
                label="政策内费用"
                rules={[{ required: true, message: '请输入政策内费用' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入政策内费用"
                  min={0}
                  precision={2}
                  addonAfter="元"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="pool_reimbursement_amount"
                label="统筹报销金额"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入统筹报销金额"
                  min={0}
                  precision={2}
                  addonAfter="元"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="large_amount_reimbursement_amount"
                label="大额报销金额"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入大额报销金额"
                  min={0}
                  precision={2}
                  addonAfter="元"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="critical_illness_reimbursement_amount"
                label="重疾报销金额"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入重疾报销金额"
                  min={0}
                  precision={2}
                  addonAfter="元"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="medical_assistance_amount"
                label="医疗救助金额"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入医疗救助金额"
                  min={0}
                  precision={2}
                  addonAfter="元"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="excess_reimbursement_amount"
                label="超限报销金额"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入超限报销金额"
                  min={0}
                  precision={2}
                  addonAfter="元"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 导入模态框 */}
      <ImportModal
        visible={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
};

export default Records; 