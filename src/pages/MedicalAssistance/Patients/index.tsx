import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  AutoComplete,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Tooltip,
  Checkbox,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  UserOutlined,
  FileTextOutlined,
  DollarOutlined,
  ReloadOutlined,
  ImportOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { patientAPI, Patient, medicalRecordAPI, MedicalRecord } from '@/services/medicalAssistance';
import { useAccess } from '@umijs/max';

const { Option } = Select;

const Patients: React.FC = () => {
  const access = useAccess();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 15,
    total: 0,
  });
  const [insuranceAreas, setInsuranceAreas] = useState<string[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [recordsModalVisible, setRecordsModalVisible] = useState(false);
  const [currentPatientRecords, setCurrentPatientRecords] = useState<MedicalRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePatientId, setDeletePatientId] = useState<number | null>(null);
  const [cascadeDelete, setCascadeDelete] = useState(false);
  const [batchDeleteModalVisible, setBatchDeleteModalVisible] = useState(false);
  const [batchCascadeDelete, setBatchCascadeDelete] = useState(false);

  // 获取患者列表
  const fetchPatients = async (page = 1, pageSize = 15, filters = {}) => {
    setLoading(true);
    try {
      const response = await patientAPI.getPatients({
        page,
        page_size: pageSize,
        ...filters,
      });
      
      if (response.code === 0) {
        setPatients(response.data.data);
        setPagination({
          current: response.data.page,
          pageSize: response.data.page_size,
          total: response.data.total,
        });
      } else {
        message.error(response.message || '获取患者列表失败');
      }
    } catch (error) {
      message.error('获取患者列表失败');
      console.error('获取患者列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取参保地区
  const fetchInsuranceAreas = async () => {
    try {
      const response = await patientAPI.getInsuranceAreas();
      if (response.code === 0) {
        setInsuranceAreas(response.data);
      }
    } catch (error) {
      console.error('获取参保地区失败:', error);
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchInsuranceAreas();
  }, []);

  const handleAdd = () => {
    setEditingPatient(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Patient) => {
    setEditingPatient(record);
    form.setFieldsValue({
      name: record.name,
      id_card: record.id_card,
      insurance_area: record.insurance_area,
    });
    setModalVisible(true);
  };

  const showDeleteConfirm = (id: number) => {
    setDeletePatientId(id);
    setDeleteModalVisible(true);
    setCascadeDelete(false);
  };

  const handleDelete = async () => {
    if (!deletePatientId) return;
    
    try {
      const response = await patientAPI.deletePatient(deletePatientId, cascadeDelete);
      if (response.code === 0) {
        message.success('患者信息删除成功');
        setDeleteModalVisible(false);
        fetchPatients(pagination.current, pagination.pageSize);
      } else {
        message.error(response.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
      console.error('删除患者失败:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingPatient) {
        // 更新患者
        const response = await patientAPI.updatePatient(editingPatient.id, values);
        if (response.code === 0) {
        message.success('患者信息更新成功');
          setModalVisible(false);
          fetchPatients(pagination.current, pagination.pageSize);
        } else {
          message.error(response.message || '更新失败');
        }
      } else {
        // 创建患者
        const response = await patientAPI.createPatient(values);
        if (response.code === 0) {
          message.success('患者信息创建成功');
      setModalVisible(false);
          fetchPatients(pagination.current, pagination.pageSize);
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
    
    fetchPatients(1, pagination.pageSize, filters);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleReset = () => {
    searchForm.resetFields();
    fetchPatients(1, pagination.pageSize);
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
    
    fetchPatients(pagination.current, pagination.pageSize, filters);
  };

  // 批量删除
  const showBatchDeleteConfirm = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的患者');
      return;
    }
    setBatchDeleteModalVisible(true);
    setBatchCascadeDelete(false);
  };

  const handleBatchDelete = async () => {
    try {
      const response = await patientAPI.batchDeletePatients(
        selectedRowKeys as number[],
        batchCascadeDelete
      );
      if (response.code === 0) {
        message.success(response.message || '批量删除成功');
        setBatchDeleteModalVisible(false);
        setSelectedRowKeys([]);
        fetchPatients(pagination.current, pagination.pageSize);
      } else {
        message.error(response.message || '批量删除失败');
      }
    } catch (error) {
      message.error('批量删除失败');
      console.error('批量删除患者失败:', error);
    }
  };

  // 查看就诊记录
  const handleViewRecords = async (patientId: number) => {
    setRecordsLoading(true);
    try {
      const response = await medicalRecordAPI.getMedicalRecords({
        person_id: patientId,
        page: 1,
        page_size: 1000,
      });
      
      if (response.code === 0) {
        setCurrentPatientRecords(response.data.data);
        setRecordsModalVisible(true);
      } else {
        message.error(response.message || '获取就诊记录失败');
      }
    } catch (error) {
      message.error('获取就诊记录失败');
      console.error('获取就诊记录失败:', error);
    } finally {
      setRecordsLoading(false);
    }
  };

  const recordColumns: ColumnsType<MedicalRecord> = [
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
      title: '处理状态',
      dataIndex: 'processing_status',
      key: 'processing_status',
      width: 100,
      render: (status) => {
        const statusMap = {
          unreimbursed: { color: 'orange', text: '未报销' },
          reimbursed: { color: 'green', text: '已报销' },
          returned: { color: 'red', text: '已退回' },
        };
        const config = statusMap[status as keyof typeof statusMap] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
  ];

  const columns: ColumnsType<Patient> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '身份证号',
      dataIndex: 'id_card',
      key: 'id_card',
      width: 180,
      render: (text) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '参保地区',
      dataIndex: 'insurance_area',
      key: 'insurance_area',
      width: 200,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
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
            onClick={() => handleViewRecords(record.id)}
          >
            就诊记录
          </Button>
          {access.canUpdatePatientManagement && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          )}
          {access.canDeletePatientManagement && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => showDeleteConfirm(record.id)}
            >
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };



  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="患者总数"
              value={pagination.total}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月新增"
              value={0}
              prefix={<PlusOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃患者"
              value={0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理"
              value={0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#fa8c16' }}
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
          <Form.Item name="name" label="姓名">
            <Input placeholder="请输入患者姓名" allowClear />
          </Form.Item>
          <Form.Item name="id_card" label="身份证号">
            <Input placeholder="请输入身份证号" allowClear />
          </Form.Item>
          <Form.Item name="insurance_area" label="参保地区">
            <AutoComplete
              placeholder="请选择或输入参保地区"
              allowClear
              style={{ width: 200 }}
              dataSource={insuranceAreas}
              filterOption={(inputValue, option) =>
                typeof option?.value === 'string' && 
                option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
              }
            />
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
            {access.canCreatePatientManagement && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                新增患者
              </Button>
            )}
            {access.canDeletePatientManagement && (
              <Popconfirm
                title="确定要删除选中的患者吗？"
                description="删除后将无法恢复，请谨慎操作。"
                onConfirm={showBatchDeleteConfirm}
                okText="确定"
                cancelText="取消"
                disabled={selectedRowKeys.length === 0}
              >
                <Button 
                  danger 
                  icon={<DeleteOutlined />}
                  disabled={selectedRowKeys.length === 0}
                >
                  批量删除
                </Button>
              </Popconfirm>
            )}
            <Button icon={<ReloadOutlined />} onClick={() => fetchPatients()}>
              刷新
            </Button>
          </Space>
          {selectedRowKeys.length > 0 && (
            <span style={{ marginLeft: 8 }}>
              已选择 {selectedRowKeys.length} 项
            </span>
          )}
        </div>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={patients}
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
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 新增/编辑模态框 */}
      <Modal
        title={editingPatient ? '编辑患者信息' : '新增患者信息'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            name: '',
            id_card: '',
            insurance_area: '',
          }}
        >
              <Form.Item
                name="name"
            label="姓名"
                rules={[{ required: true, message: '请输入患者姓名' }]}
              >
                <Input placeholder="请输入患者姓名" />
              </Form.Item>
              <Form.Item
            name="id_card"
                label="身份证号"
                rules={[
                  { required: true, message: '请输入身份证号' },
              { pattern: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/, message: '请输入正确的身份证号' }
                ]}
              >
                <Input placeholder="请输入身份证号" />
          </Form.Item>
          <Form.Item
            name="insurance_area"
            label="参保地区"
            rules={[{ required: true, message: '请选择或输入参保地区' }]}
          >
            <AutoComplete
              placeholder="请选择或输入参保地区"
              dataSource={insuranceAreas}
              filterOption={(inputValue, option) =>
                typeof option?.value === 'string' && 
                option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
              }
            />
          </Form.Item>
        </Form>
      </Modal>



      {/* 就诊记录模态框 */}
      <Modal
        title="就诊记录"
        open={recordsModalVisible}
        onCancel={() => setRecordsModalVisible(false)}
        width={1200}
        footer={[
          <Button key="close" onClick={() => setRecordsModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        <Table
          columns={recordColumns}
          dataSource={currentPatientRecords}
          rowKey="id"
          loading={recordsLoading}
          pagination={false}
          scroll={{ y: 400 }}
        />
      </Modal>

      {/* 删除确认模态框 */}
      <Modal
        title="确认删除"
        open={deleteModalVisible}
        onOk={handleDelete}
        onCancel={() => setDeleteModalVisible(false)}
        okText="确认"
        cancelText="取消"
      >
        <p>确定要删除这个患者吗？</p>
        <Form.Item>
          <Checkbox
            checked={cascadeDelete}
            onChange={(e) => setCascadeDelete(e.target.checked)}
          >
            同时删除关联的就诊记录和受理记录
          </Checkbox>
        </Form.Item>
        {!cascadeDelete && (
          <p style={{ color: '#ff4d4f' }}>
            注意：如果患者存在关联记录且未选择级联删除，删除操作将会失败
          </p>
        )}
      </Modal>

      {/* 批量删除确认模态框 */}
      <Modal
        title="确认批量删除"
        open={batchDeleteModalVisible}
        onOk={handleBatchDelete}
        onCancel={() => setBatchDeleteModalVisible(false)}
        okText="确认"
        cancelText="取消"
      >
        <p>确定要删除选中的 {selectedRowKeys.length} 个患者吗？</p>
        <Form.Item>
          <Checkbox
            checked={batchCascadeDelete}
            onChange={(e) => setBatchCascadeDelete(e.target.checked)}
          >
            同时删除关联的就诊记录和受理记录
          </Checkbox>
        </Form.Item>
        {!batchCascadeDelete && (
          <p style={{ color: '#ff4d4f' }}>
            注意：如果选中的患者存在关联记录且未选择级联删除，删除操作将会失败
          </p>
        )}
      </Modal>
    </div>
  );
};

export default Patients; 