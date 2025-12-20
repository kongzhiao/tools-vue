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
  Popconfirm,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  InputNumber,
  Tooltip,
} from 'antd';
import './index.css';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  DollarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { reimbursementAPI, ReimbursementDetail, patientAPI, Patient, medicalRecordAPI, MedicalRecord } from '@/services/medicalAssistance';
import { useAccess } from '@umijs/max';

const { Option } = Select;
const { TextArea } = Input;

const Reimbursement: React.FC = () => {
  const access = useAccess();

  // 安全的数字格式化函数
  const formatCurrency = (value: any): string => {
    if (value === null || value === undefined || value === '') {
      return '¥0.00';
    }

    const num = typeof value === 'string' ? parseFloat(value) : Number(value);

    if (isNaN(num)) {
      return '¥0.00';
    }

    return `¥${num.toFixed(2)}`;
  };

  const [reimbursements, setReimbursements] = useState<ReimbursementDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingReimbursement, setEditingReimbursement] = useState<ReimbursementDetail | null>(null);
  const [selectedReimbursement, setSelectedReimbursement] = useState<ReimbursementDetail | null>(null);
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 15,
    total: 0,
  });
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [banks, setBanks] = useState<string[]>([]);
  const [reimbursementStatuses, setReimbursementStatuses] = useState<string[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [patientRecords, setPatientRecords] = useState<MedicalRecord[]>([]);
  const [patientRecordsLoading, setPatientRecordsLoading] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<number[]>([]);
  const [exportLoading, setExportLoading] = useState(false);

  // 获取报销明细列表
  const fetchReimbursements = async (page = 1, pageSize = 15, filters = {}) => {
    setLoading(true);
    try {
      const response = await reimbursementAPI.getReimbursements({
        page,
        page_size: pageSize,
        ...filters,
      });

      if (response.code === 0) {
        setReimbursements(response.data.data);
        setPagination({
          current: response.data.page,
          pageSize: response.data.page_size,
          total: response.data.total,
        });
      } else {
        message.error(response.message || '获取报销明细失败');
      }
    } catch (error) {
      message.error('获取报销明细失败');
      console.error('获取报销明细失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取患者列表
  const fetchPatients = async () => {
    try {
      const response = await patientAPI.getPatients({ page: 1, page_size: 1000 });
      if (response.code === 0) {
        setPatients(response.data.data);
      }
    } catch (error) {
      console.error('获取患者列表失败:', error);
    }
  };

  // 获取就诊记录列表
  const fetchMedicalRecords = async () => {
    try {
      const response = await medicalRecordAPI.getMedicalRecords({ page: 1, page_size: 1000 });
      if (response.code === 0) {
        setMedicalRecords(response.data.data);
      }
    } catch (error) {
      console.error('获取就诊记录失败:', error);
    }
  };

  // 获取银行名称
  const fetchBanks = async () => {
    try {
      const response = await reimbursementAPI.getBanks();
      if (response.code === 0) {
        setBanks(response.data);
      }
    } catch (error) {
      console.error('获取银行名称失败:', error);
    }
  };

  // 获取受理状态
  const fetchReimbursementStatuses = async () => {
    try {
      const response = await reimbursementAPI.getReimbursementStatuses();
      if (response.code === 0) {
        setReimbursementStatuses(response.data);
      }
    } catch (error) {
      console.error('获取受理状态失败:', error);
    }
  };

  // 根据患者ID获取就诊记录
  const fetchRecordsByPersonId = async (personId: number) => {
    if (!personId) {
      setPatientRecords([]);
      return;
    }

    setPatientRecordsLoading(true);
    try {
      const response = await medicalRecordAPI.getMedicalRecords({
        person_id: personId,
        page: 1,
        page_size: 1000,
      });
      if (response.code === 0) {
        setPatientRecords(response.data.data);
      } else {
        message.error(response.message || '获取就诊记录失败');
        setPatientRecords([]);
      }
    } catch (error) {
      message.error('获取就诊记录失败');
      console.error('获取就诊记录失败:', error);
      setPatientRecords([]);
    } finally {
      setPatientRecordsLoading(false);
    }
  };

  // 患者选择处理
  const handlePersonChange = (personId: number) => {
    // 清空之前的记录
    setPatientRecords([]);
    setSelectedRecordIds([]);
    form.setFieldsValue({
      medical_record_ids: [],
    });

    if (personId) {
      fetchRecordsByPersonId(personId);
    }
  };

  // 获取报销统计
  const fetchStatistics = async () => {
    try {
      const response = await reimbursementAPI.getStatistics();
      if (response.code === 0) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('获取报销统计失败:', error);
    }
  };

  useEffect(() => {
    fetchReimbursements();
    fetchPatients();
    fetchMedicalRecords();
    fetchBanks();
    fetchReimbursementStatuses();
    fetchStatistics();
  }, []);

  const handleAdd = () => {
    setEditingReimbursement(null);
    form.resetFields();
    setPatientRecords([]);
    setSelectedRecordIds([]);
    setModalVisible(true);
  };

  const handleEdit = (record: ReimbursementDetail) => {
    setEditingReimbursement(record);
    form.setFieldsValue({
      person_id: record.person_id,
      bank_name: record.bank_name,
      bank_account: record.bank_account,
      account_name: record.account_name,
      total_amount: record.total_amount,
      policy_covered_amount: record.policy_covered_amount,
      pool_reimbursement_amount: record.pool_reimbursement_amount,
      large_amount_reimbursement_amount: record.large_amount_reimbursement_amount,
      critical_illness_reimbursement_amount: record.critical_illness_reimbursement_amount,
      pool_reimbursement_ratio: record.pool_reimbursement_ratio,
      large_amount_reimbursement_ratio: record.large_amount_reimbursement_ratio,
      critical_illness_reimbursement_ratio: record.critical_illness_reimbursement_ratio,
      reimbursement_status: record.reimbursement_status,
    });

    // 编辑模式：只显示当前报销明细中已关联的就诊记录
    if (record.medical_records && record.medical_records.length > 0) {
      const recordIds = record.medical_records.map(r => r.id);
      setSelectedRecordIds(recordIds);
      form.setFieldsValue({
        medical_record_ids: recordIds,
      });
      // 直接设置就诊记录列表为当前报销明细中的记录
      setPatientRecords(record.medical_records);
    } else {
      setSelectedRecordIds([]);
      form.setFieldsValue({
        medical_record_ids: [],
      });
      setPatientRecords([]);
    }

    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await reimbursementAPI.deleteReimbursement(id);
      if (response.code === 0) {
        message.success('报销明细删除成功');
        fetchReimbursements(pagination.current, pagination.pageSize);
        fetchStatistics();
      } else {
        message.error(response.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
      console.error('删除报销明细失败:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingReimbursement) {
        // 更新报销明细 - 编辑时可以更新就诊记录关联
        const updateData = {
          ...values,
        };
        delete updateData.person_id; // 编辑时不允许修改患者

        const response = await reimbursementAPI.updateReimbursement(editingReimbursement.id, updateData);
        if (response.code === 0) {
          message.success('报销明细更新成功');
          setModalVisible(false);
          // 清空表单状态
          form.resetFields();
          setPatientRecords([]);
          setSelectedRecordIds([]);
          fetchReimbursements(pagination.current, pagination.pageSize);
          fetchStatistics();
        } else {
          message.error(response.message || '更新失败');
        }
      } else {
        // 批量创建报销明细
        // 检查是否选择了已报销的记录
        const selectedRecords = patientRecords.filter(record =>
          values.medical_record_ids && values.medical_record_ids.includes(record.id)
        );
        const reimbursedRecords = selectedRecords.filter(record =>
          record.processing_status === 'reimbursed'
        );

        if (reimbursedRecords.length > 0) {
          message.error('不能选择已报销的就诊记录');
          return;
        }

        const response = await reimbursementAPI.batchCreateReimbursements({
          person_id: values.person_id,
          medical_record_ids: values.medical_record_ids || [],
          bank_name: values.bank_name,
          bank_account: values.bank_account,
          account_name: values.account_name,
          reimbursement_status: values.reimbursement_status,
        });
        if (response.code === 0) {
          message.success(`成功创建受理记录`);
          setModalVisible(false);
          // 清空表单状态
          form.resetFields();
          setPatientRecords([]);
          setSelectedRecordIds([]);
          fetchReimbursements(pagination.current, pagination.pageSize);
          fetchStatistics();
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
        filters[key] = values[key];
      }
    });

    fetchReimbursements(1, pagination.pageSize, filters);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleReset = () => {
    searchForm.resetFields();
    fetchReimbursements(1, pagination.pageSize);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (pagination: any) => {
    const values = searchForm.getFieldsValue();
    const filters: Record<string, any> = {};

    Object.keys(values).forEach(key => {
      if (values[key] !== undefined && values[key] !== '') {
        filters[key] = values[key];
      }
    });

    fetchReimbursements(pagination.current, pagination.pageSize, filters);
  };

  const handleViewDetail = (record: ReimbursementDetail) => {
    setSelectedReimbursement(record);
    setDetailModalVisible(true);
  };


  // 导出受理台账
  const handleExportLedger = async () => {
    setExportLoading(true);
    try {
      // 获取当前搜索表单的筛选条件
      const values = searchForm.getFieldsValue();
      const filters: Record<string, any> = {};

      // 过滤空值
      Object.keys(values).forEach(key => {
        if (values[key] !== undefined && values[key] !== '') {
          filters[key] = values[key];
        }
      });

      const response = await reimbursementAPI.exportLedger(filters);
      if (response.code === 0) {
        // 解码base64内容
        const binaryString = atob(response.data.content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // 创建下载链接
        const blob = new Blob([bytes], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = response.data.filename || '受理台账.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        message.success('受理台账导出成功');
      } else {
        message.error(response.message || '导出失败');
      }
    } catch (error) {
      message.error('导出失败');
      console.error('导出失败:', error);
    } finally {
      setExportLoading(false);
    }
  };

  // 表格选择处理
  const handleTableSelectionChange = (selectedRowKeys: React.Key[], selectedRows: MedicalRecord[]) => {
    setSelectedRecordIds(selectedRowKeys as number[]);
    form.setFieldsValue({
      medical_record_ids: selectedRowKeys,
    });
  };

  // 就诊记录表格列定义
  const recordColumns: ColumnsType<MedicalRecord> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '处理状态',
      dataIndex: 'processing_status',
      key: 'processing_status',
      width: 100,
      render: (text) => {
        const statusMap = {
          unreimbursed: { color: 'blue', text: '未报销' },
          reimbursed: { color: 'red', text: '已报销' },
          returned: { color: 'orange', text: '已退回' },
        };
        const config = statusMap[text as keyof typeof statusMap] || { color: 'default', text: text };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
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
      width: 100,
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
      width: 100,
      render: (text) => formatCurrency(text),
    },
    {
      title: '政策内费用',
      dataIndex: 'policy_covered_cost',
      key: 'policy_covered_cost',
      width: 120,
      render: (text) => formatCurrency(text),
    },
    {
      title: '统筹报销',
      dataIndex: 'pool_reimbursement_amount',
      key: 'pool_reimbursement_amount',
      width: 100,
      render: (text) => formatCurrency(text),
    },
    {
      title: '大额报销',
      dataIndex: 'large_amount_reimbursement_amount',
      key: 'large_amount_reimbursement_amount',
      width: 100,
      render: (text) => formatCurrency(text),
    },
    {
      title: '重疾报销',
      dataIndex: 'critical_illness_reimbursement_amount',
      key: 'critical_illness_reimbursement_amount',
      width: 100,
      render: (text) => formatCurrency(text),
    }
  ];

  const getPatientName = (record: ReimbursementDetail) => {
    // 优先使用person_info中的姓名
    if (record.person_info && record.person_info.name) {
      return record.person_info.name;
    }

    // 从patients数组中查找
    const patient = patients.find(p => p.id === record.person_id);
    if (patient && patient.name) {
      return patient.name;
    }

    // 如果都找不到，尝试通过API获取患者信息
    if (record.person_id && patients.length > 0) {
      // 如果patients数组已加载但没找到，可能是数据不同步
      console.warn(`患者ID ${record.person_id} 在patients数组中未找到`);
    }

    // 最后的备用方案：显示ID，但提供更友好的提示
    return `患者ID: ${record.person_id}`;
  };

  const getMedicalRecordInfo = (record: ReimbursementDetail) => {
    // 使用medical_records数组中的信息
    if (record.medical_records && record.medical_records.length > 0) {
      return `${record.medical_records.length} 条就诊记录`;
    }
    // 兼容旧数据，从medicalRecords数组中查找
    if (record.medical_record_ids && record.medical_record_ids.length > 0) {
      return `${record.medical_record_ids.length} 条就诊记录`;
    }
    return '无就诊记录';
  };

  const getDetailedMedicalRecordInfo = (record: ReimbursementDetail) => {
    // 使用medical_records数组中的信息
    if (record.medical_records && record.medical_records.length > 0) {
      const recordInfo = record.medical_records.map(medicalRecord =>
        `${medicalRecord.hospital_name} - ${medicalRecord.visit_type}`
      ).join(', ');
      return recordInfo;
    }
    // 兼容旧数据，从medicalRecords数组中查找
    if (record.medical_record_ids && record.medical_record_ids.length > 0) {
      const recordInfo = record.medical_record_ids.map(id => {
        const medicalRecord = medicalRecords.find(r => r.id === id);
        return medicalRecord ? `${medicalRecord.hospital_name} - ${medicalRecord.visit_type}` : `记录${id}`;
      }).join(', ');
      return recordInfo;
    }
    return '无就诊记录';
  };

  const getStatusTag = (status: string) => {
    const statusMap = {
      pending: { color: 'orange', text: '未申请' },
      processed: { color: 'green', text: '已受理' },
      void: { color: 'red', text: '作废' },
    };
    const config = statusMap[status as keyof typeof statusMap] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns: ColumnsType<ReimbursementDetail> = [
    {
      title: '受理ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '患者姓名',
      key: 'patient_name',
      width: 120,
      render: (_, record) => getPatientName(record),
    },
    {
      title: '受理状态',
      dataIndex: 'reimbursement_status',
      key: 'reimbursement_status',
      width: 100,
      render: (text) => getStatusTag(text),
    },
    {
      title: '就诊记录',
      key: 'medical_record_info',
      width: 200,
      render: (_, record) => getMedicalRecordInfo(record),
    },
    {
      title: '银行名称',
      dataIndex: 'bank_name',
      key: 'bank_name',
      width: 150,
    },
    {
      title: '银行账号',
      dataIndex: 'bank_account',
      key: 'bank_account',
      width: 180,
      render: (text) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '户名',
      dataIndex: 'account_name',
      key: 'account_name',
      width: 120,
    },
    {
      title: '总金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      render: (text) => formatCurrency(text),
    },
    {
      title: '政策内金额',
      dataIndex: 'policy_covered_amount',
      key: 'policy_covered_amount',
      width: 120,
      render: (text) => formatCurrency(text),
    },
    {
      title: '统筹报销',
      dataIndex: 'pool_reimbursement_amount',
      key: 'pool_reimbursement_amount',
      width: 120,
      render: (text) => formatCurrency(text),
    },
    {
      title: '大额报销',
      dataIndex: 'large_amount_reimbursement_amount',
      key: 'large_amount_reimbursement_amount',
      width: 120,
      render: (text) => formatCurrency(text),
    },
    {
      title: '重疾报销',
      dataIndex: 'critical_illness_reimbursement_amount',
      key: 'critical_illness_reimbursement_amount',
      width: 120,
      render: (text) => formatCurrency(text),
    },
    {
      title: '统筹报销比例',
      dataIndex: 'pool_reimbursement_ratio',
      key: 'pool_reimbursement_ratio',
      width: 120,
      render: (text) => text ? `${text}%` : '-',
    },
    {
      title: '大额报销比例',
      dataIndex: 'large_amount_reimbursement_ratio',
      key: 'large_amount_reimbursement_ratio',
      width: 120,
      render: (text) => text ? `${text}%` : '-',
    },
    {
      title: '重疾报销比例',
      dataIndex: 'critical_illness_reimbursement_ratio',
      key: 'critical_illness_reimbursement_ratio',
      width: 120,
      render: (text) => text ? `${text}%` : '-',
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
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          {record.reimbursement_status !== 'void' && access.canUpdateReimbursementManagement && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          )}
          {record.reimbursement_status !== 'processed' && access.canDeleteReimbursementManagement && (
            <Popconfirm
              title="确定要删除这个报销明细吗？"
              description="删除后将无法恢复，请谨慎操作。"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Popconfirm>
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
              title="报销明细总数"
              value={statistics?.total_count || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="未申请"
              value={statistics?.pending_count || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已受理"
              value={statistics?.processed_count || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总金额"
              value={statistics?.total_amount || 0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#722ed1' }}
              suffix="元"
              precision={2}
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
          className="search-form"
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

          <Form.Item name="bank_name" label="银行名称">
            <Input placeholder="请输入银行名称" allowClear />
          </Form.Item>
          <Form.Item name="reimbursement_status" label="受理状态">
            <Select
              placeholder="请选择受理状态"
              allowClear
              style={{ width: 150 }}
            >
              {reimbursementStatuses.map(status => (
                <Option key={status} value={status}>
                  {status === 'pending' ? '未申请' :
                    status === 'processed' ? '已受理' : '作废'}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="account_name" label="户名">
            <Input placeholder="请输入户名" allowClear />
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
            {access.canCreateReimbursementManagement && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                发起受理
              </Button>
            )}
            {access.canExportReimbursementManagement && (
              <Button
                icon={<FileTextOutlined />}
                onClick={handleExportLedger}
                loading={exportLoading}
              >
                导出受理台账
              </Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={() => fetchReimbursements()}>
              刷新
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={reimbursements}
          rowKey="id"
          loading={loading}
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
          scroll={{ x: 1840 }}
        />
      </Card>

      {/* 新增/编辑模态框 */}
      <Modal
        title={editingReimbursement ? '编辑报销明细' : '批量新增报销明细'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          setPatientRecords([]);
          setSelectedRecordIds([]);
        }}
        width={1000}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            person_id: undefined,
            medical_record_ids: [],
            bank_name: '',
            bank_account: '',
            account_name: '',
            total_amount: 0,
            policy_covered_amount: 0,
            pool_reimbursement_amount: 0,
            large_amount_reimbursement_amount: 0,
            critical_illness_reimbursement_amount: 0,
            pool_reimbursement_ratio: 0,
            large_amount_reimbursement_ratio: 0,
            critical_illness_reimbursement_ratio: 0,
            reimbursement_status: 'pending',
          }}
        >

          {/* 隐藏字段，用于存储选中的就诊记录ID */}
          <Form.Item name="medical_record_ids" hidden>
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="person_id"
                label="患者"
                rules={[{ required: true, message: '请选择患者' }]}
              >
                {editingReimbursement ? (
                  <Input
                    value={editingReimbursement.person_info?.name || `患者ID: ${editingReimbursement.person_id}`}
                    disabled
                    placeholder="患者姓名"
                  />
                ) : (
                  <Select
                    placeholder="请选择患者"
                    showSearch
                    optionFilterProp="children"
                    onChange={handlePersonChange}
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
                )}
              </Form.Item>
            </Col>

          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="bank_name"
                label="银行名称"
                rules={[{ required: true, message: '请输入银行名称' }]}
              >
                <Input placeholder="请输入银行名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="bank_account"
                label="银行账号"
                rules={[{ required: true, message: '请输入银行账号' }]}
              >
                <Input placeholder="请输入银行账号" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="account_name"
                label="户名"
                rules={[{ required: true, message: '请输入户名' }]}
              >
                <Input placeholder="请输入户名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="reimbursement_status"
                label="受理状态"
                rules={[{ required: true, message: '请选择受理状态' }]}
              >
                <Select placeholder="请选择受理状态">
                  {(() => {
                    // 根据新增/编辑模式以及当前状态来过滤可选状态
                    let availableStatuses = reimbursementStatuses;

                    // 如果状态数组还没有加载，使用默认状态
                    if (reimbursementStatuses.length === 0) {
                      availableStatuses = ['pending', 'processed', 'void'];
                    }

                    if (!editingReimbursement) {
                      // 新增时：只能选择未申请和已受理
                      availableStatuses = availableStatuses.filter(status =>
                        status === 'pending' || status === 'processed'
                      );
                    } else {
                      // 编辑时：根据当前状态限制可选状态，但保留当前状态
                      const currentStatus = editingReimbursement.reimbursement_status;
                      console.log('当前编辑的报销状态:', currentStatus);
                      console.log('所有可用状态:', availableStatuses);
                      console.log('编辑模式:', !!editingReimbursement);

                      if (currentStatus === 'pending') {
                        // 未申请状态：可以改成已受理和作废，保留当前状态
                        availableStatuses = availableStatuses.filter(status =>
                          status === 'pending' || status === 'processed' || status === 'void'
                        );
                      } else if (currentStatus === 'processed') {
                        // 已受理状态：可以改成作废，保留当前状态
                        availableStatuses = availableStatuses.filter(status =>
                          status === 'processed' || status === 'void'
                        );
                      } else if (currentStatus === 'void') {
                        // 作废状态：保留当前状态，不允许改成其他状态
                        availableStatuses = availableStatuses.filter(status =>
                          status === 'void'
                        );
                      }
                    }

                    console.log('过滤后的可用状态:', availableStatuses);

                    return availableStatuses.map(status => (
                      <Option key={status} value={status}>
                        {status === 'pending' ? '未申请' :
                          status === 'processed' ? '已受理' : '作废'}
                      </Option>
                    ));
                  })()}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* 金额字段展示 - 仅在编辑模式下显示 */}
          {editingReimbursement && (
            <>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="total_amount"
                    label="总金额"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(value) => value!.replace(/\¥\s?|(,*)/g, '')}
                      disabled
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="policy_covered_amount"
                    label="政策内金额"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(value) => value!.replace(/\¥\s?|(,*)/g, '')}
                      disabled
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="pool_reimbursement_amount"
                    label="统筹报销金额"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(value) => value!.replace(/\¥\s?|(,*)/g, '')}
                      disabled
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="large_amount_reimbursement_amount"
                    label="大额报销金额"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(value) => value!.replace(/\¥\s?|(,*)/g, '')}
                      disabled
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
                      formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(value) => value!.replace(/\¥\s?|(,*)/g, '')}
                      disabled
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="pool_reimbursement_ratio"
                    label="统筹报销比例"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={(value) => `${value}%`}
                      parser={(value) => value!.replace('%', '')}
                      disabled
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="large_amount_reimbursement_ratio"
                    label="大额报销比例"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={(value) => `${value}%`}
                      parser={(value) => value!.replace('%', '')}
                      disabled
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="critical_illness_reimbursement_ratio"
                    label="重疾报销比例"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={(value) => `${value}%`}
                      parser={(value) => value!.replace('%', '')}
                      disabled
                    />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}


          {/* 就诊记录选择表格 */}
          {(
            <div style={{ marginTop: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <h4>就诊记录选择</h4>
                <p style={{ color: '#666', fontSize: 12 }}>
                  {editingReimbursement
                    ? '当前显示的是该报销明细中已关联的就诊记录。您可以取消选择某些记录，但无法添加新的就诊记录。'
                    : '请先选择患者，然后在下表中选择需要报销的就诊记录。已报销的记录将无法选择。选中的记录将自动添加到报销明细中。'
                  }
                </p>
              </div>

              {patientRecords.length > 0 ? (
                <Table
                  columns={recordColumns}
                  dataSource={patientRecords}
                  rowKey="id"
                  loading={patientRecordsLoading}
                  rowSelection={{
                    selectedRowKeys: selectedRecordIds,
                    onChange: handleTableSelectionChange,
                    getCheckboxProps: (record) => ({
                      disabled: record.processing_status === 'reimbursed' && !editingReimbursement,
                    }),
                  }}
                  pagination={false}
                  size="small"
                  scroll={{ x: 1200 }}
                  style={{ marginTop: 8 }}
                />
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#999',
                  backgroundColor: '#fafafa',
                  border: '1px dashed #d9d9d9',
                  borderRadius: 6
                }}>
                  {patientRecordsLoading ? (
                    <div>正在加载就诊记录...</div>
                  ) : (
                    <div>
                      <div style={{ marginBottom: 8 }}>暂无就诊记录</div>
                      <div style={{ fontSize: 12 }}>
                        {editingReimbursement ? '该患者暂无就诊记录' : '请先选择患者以查看其就诊记录'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Form>
      </Modal>

      {/* 详情查看模态框 */}
      <Modal
        title="报销明细详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={1000}
        destroyOnClose
      >
        {selectedReimbursement && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <p><strong>患者姓名：</strong>{selectedReimbursement.person_info?.name || `患者ID: ${selectedReimbursement.person_id}`}</p>
                <p><strong>银行名称：</strong>{selectedReimbursement.bank_name}</p>
                <p><strong>银行账号：</strong>{selectedReimbursement.bank_account}</p>
                <p><strong>户名：</strong>{selectedReimbursement.account_name}</p>
              </Col>
              <Col span={12}>
                <p><strong>总金额：</strong>{formatCurrency(selectedReimbursement.total_amount)}</p>
                <p><strong>政策内金额：</strong>{formatCurrency(selectedReimbursement.policy_covered_amount)}</p>
                <p><strong>统筹报销金额：</strong>{formatCurrency(selectedReimbursement.pool_reimbursement_amount)}</p>
                <p><strong>大额报销金额：</strong>{formatCurrency(selectedReimbursement.large_amount_reimbursement_amount)}</p>
                <p><strong>重疾报销金额：</strong>{formatCurrency(selectedReimbursement.critical_illness_reimbursement_amount)}</p>
                <p><strong>统筹报销比例：</strong>{selectedReimbursement.pool_reimbursement_ratio}%</p>
                <p><strong>大额报销比例：</strong>{selectedReimbursement.large_amount_reimbursement_ratio}%</p>
                <p><strong>重疾报销比例：</strong>{selectedReimbursement.critical_illness_reimbursement_ratio}%</p>
                <p><strong>受理状态：</strong>{getStatusTag(selectedReimbursement.reimbursement_status)}</p>
              </Col>
            </Row>
            <Row>
              <Col span={24}>
                <p><strong>创建时间：</strong>{dayjs(selectedReimbursement.created_at).format('YYYY-MM-DD HH:mm:ss')}</p>
                <p><strong>更新时间：</strong>{dayjs(selectedReimbursement.updated_at).format('YYYY-MM-DD HH:mm:ss')}</p>
              </Col>
            </Row>

            {/* 就诊记录表格 */}
            <div style={{ marginTop: 24 }}>
              <h4>就诊记录详情</h4>
              {selectedReimbursement.medical_records && selectedReimbursement.medical_records.length > 0 ? (
                <Table
                  columns={recordColumns}
                  dataSource={selectedReimbursement.medical_records}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 1200 }}
                />
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '20px',
                  color: '#999',
                  backgroundColor: '#fafafa',
                  border: '1px dashed #d9d9d9',
                  borderRadius: 6
                }}>
                  暂无就诊记录
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default Reimbursement; 