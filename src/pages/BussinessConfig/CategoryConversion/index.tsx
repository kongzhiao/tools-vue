import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Space,
  Tag,
  Select,
  Row,
  Col,
  Tooltip,
  Divider,
  Alert
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  SwapOutlined,
  InfoCircleOutlined,
  ImportOutlined
} from '@ant-design/icons';
import { request, useAccess } from '@umijs/max';
import ImportModal from './ImportModal';

const { Option } = Select;
const { TextArea } = Input;

interface CategoryConversion {
  id: number;
  tax_standard: string;
  medical_export_standard?: string;
  national_dict_name?: string;
  created_at: string;
  updated_at: string;
}

const CategoryConversion: React.FC = () => {
  const access = useAccess();
  const [data, setData] = useState<CategoryConversion[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<CategoryConversion | null>(null);
  const [form] = Form.useForm();

  // 权限检查
  if (!access.canAccessCategoryConversion) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Alert
          message="无权限访问"
          description="您没有权限访问类别转换配置功能，请联系管理员。"
          type="warning"
          showIcon
        />
      </div>
    );
  }

  // 筛选状态
  const [taxStandardFilter, setTaxStandardFilter] = useState('');
  const [medicalExportFilter, setMedicalExportFilter] = useState('');
  const [nationalDictFilter, setNationalDictFilter] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 15,
    total: 0,
  });

  const fetchData = async (page = 1, pageSize = 15) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (taxStandardFilter) params.append('tax_standard', taxStandardFilter);
      if (medicalExportFilter) params.append('medical_export_standard', medicalExportFilter);
      if (nationalDictFilter) params.append('national_dict_name', nationalDictFilter);

      const response = await request(`/api/category-conversions?${params.toString()}`, {
        method: 'GET',
      });

      if (response.code === 0) {
        setData(response.data.list || []);
        setPagination({
          current: response.data.page || 1,
          pageSize: response.data.page_size || 15,
          total: response.data.total || 0,
        });
      }
    } catch (error) {
      console.error('获取类别转换列表失败:', error);
      message.error('获取类别转换列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingItem) {
        await request(`/api/category-conversions/${editingItem.id}`, {
          method: 'PUT',
          data: values,
        });
        message.success('更新成功');
      } else {
        await request('/api/category-conversions', {
          method: 'POST',
          data: values,
        });
        message.success('创建成功');
      }
      setModalVisible(false);
      form.resetFields();
      fetchData(pagination.current, pagination.pageSize);
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await request(`/api/category-conversions/${id}`, {
        method: 'DELETE',
      });
      message.success('删除成功');
      fetchData(pagination.current, pagination.pageSize);
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  const openModal = (item?: CategoryConversion) => {
    setEditingItem(item || null);
    if (item) {
      form.setFieldsValue({
        tax_standard: item.tax_standard,
        medical_export_standard: item.medical_export_standard || '',
        national_dict_name: item.national_dict_name || '',
      });
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleSearch = () => {
    fetchData(1, pagination.pageSize);
  };

  const handleReset = () => {
    setTaxStandardFilter('');
    setMedicalExportFilter('');
    setNationalDictFilter('');
    fetchData(1, pagination.pageSize);
  };

  const handleTableChange = (pagination: any) => {
    fetchData(pagination.current, pagination.pageSize);
  };

  const columns = [
    {
      title: '税务代缴数据口径',
      dataIndex: 'tax_standard',
      key: 'tax_standard',
      width: 200,
      render: (text: string) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{text}</span>
      ),
    },
    {
      title: '医保数据导出对象口径',
      dataIndex: 'medical_export_standard',
      key: 'medical_export_standard',
      width: 250,
      render: (text: string) => (
        text ? (
          <Tag color="blue">{text}</Tag>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        )
      ),
    },
    {
      title: '国家字典值名称',
      dataIndex: 'national_dict_name',
      key: 'national_dict_name',
      width: 250,
      render: (text: string) => (
        text ? (
          <Tag color="green">{text}</Tag>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        )
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (text: string) => (
        <span style={{ fontSize: '12px', color: '#666' }}>
          {new Date(text).toLocaleString()}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: CategoryConversion) => (
        <Space size="middle">
          {access.canUpdateCategoryConversion && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(record)}>
              编辑
            </Button>
          )}
          {access.canDeleteCategoryConversion && (
            <Popconfirm title="确定要删除这个类别转换吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div>
      <Card>
        {/* 说明信息 */}
        <Alert
          message="类别转换说明"
          description="以税务代缴数据口径为标准，建立与医保数据导出对象口径和国家字典值名称的映射关系。当遇到医保数据导出对象口径或国家字典值名称时，会自动替换为对应的税务代缴数据口径。"
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 16 }}
        />

        {/* 搜索和筛选区域 */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="搜索税务代缴数据口径"
                value={taxStandardFilter}
                onChange={(e) => setTaxStandardFilter(e.target.value)}
                onPressEnter={handleSearch}
                prefix={<SearchOutlined />}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="搜索医保数据导出对象口径"
                value={medicalExportFilter}
                onChange={(e) => setMedicalExportFilter(e.target.value)}
                onPressEnter={handleSearch}
                prefix={<SearchOutlined />}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="搜索国家字典值名称"
                value={nationalDictFilter}
                onChange={(e) => setNationalDictFilter(e.target.value)}
                onPressEnter={handleSearch}
                prefix={<SearchOutlined />}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Space wrap>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                  搜索
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重置
                </Button>
                {access.canCreateCategoryConversion && (
                  <Button icon={<ImportOutlined />} onClick={() => setImportModalVisible(true)}>
                    导入
                  </Button>
                )}
                {access.canCreateCategoryConversion && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
                    创建转换规则
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
          locale={{
            emptyText: '暂无数据',
          }}
        />
      </Card>

      {(access.canCreateCategoryConversion || access.canUpdateCategoryConversion) && (
        <Modal
          title={editingItem ? '编辑类别转换' : '创建类别转换'}
          open={modalVisible}
          onCancel={() => {
            setModalVisible(false);
            form.resetFields();
          }}
          footer={null}
          width={600}
        >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="tax_standard"
            label="税务代缴数据口径（标准值）"
            rules={[{ required: true, message: '请输入税务代缴数据口径' }]}
            extra="这是转换后的标准值"
          >
            <Input placeholder="请输入税务代缴数据口径" />
          </Form.Item>

          <Form.Item
            name="medical_export_standard"
            label="医保数据导出对象口径"
            extra="当遇到此值时，将转换为上面的税务代缴数据口径"
          >
            <Input placeholder="请输入医保数据导出对象口径" />
          </Form.Item>

          <Form.Item
            name="national_dict_name"
            label="国家字典值名称"
            extra="当遇到此值时，将转换为上面的税务代缴数据口径"
          >
            <Input placeholder="请输入国家字典值名称" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingItem ? '更新' : '创建'}
              </Button>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
        </Modal>
      )}

      {access.canCreateCategoryConversion && (
        <ImportModal
          visible={importModalVisible}
          onCancel={() => setImportModalVisible(false)}
          onSuccess={() => {
            fetchData(pagination.current, pagination.pageSize);
          }}
        />
      )}
    </div>
  );
};

export default CategoryConversion; 