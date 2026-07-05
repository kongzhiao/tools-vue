import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, message, Modal, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { CopyOutlined, DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useAccess } from '@umijs/max';
import {
  createBusinessFilterOption,
  deleteBusinessFilterOption,
  getBusinessFilterOptions,
  updateBusinessFilterOption,
} from '@/services/system';

interface BusinessFilterOptionItem {
  id: number;
  module: string;
  type: string;
  value: string;
  label: string;
  status: number;
  sort: number;
  source_batch?: string;
  remark?: string;
  created_at: string;
  updated_at: string;
}

const cardStyle: React.CSSProperties = {
  borderRadius: 6,
  border: '1px solid #edf0f5',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
};

const moduleOptions = [
  { label: '未救助台账', value: 'unrescued' },
  { label: '参保台账', value: 'enroll' },
];

const typeOptions = [
  { label: '医疗类别', value: 'medical_category' },
  { label: '身份类别', value: 'priority_identity' },
  { label: '医药机构名称', value: 'hospital_name' },
  { label: '镇街', value: 'street_town' },
  { label: '病种名称', value: 'disease_name' },
  { label: '病种编码', value: 'disease_code' },
  { label: '参保镇街', value: 'town_name' },
  { label: '参保原始身份', value: 'raw_identity' },
  { label: '未参保原因', value: 'uninsured_reason' },
  { label: '缴费金额', value: 'resident_payment_amount' },
];

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    message.success('已复制');
  } catch (error) {
    message.error('复制失败');
  }
};

const EllipsisText: React.FC<{ value?: any; maxWidth?: number | string }> = ({ value, maxWidth = '100%' }) => {
  const text = value === null || value === undefined || value === '' ? '' : String(value);
  if (!text) return <>-</>;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth, width: '100%', minWidth: 0 }}>
      <Tooltip title="复制">
        <Button
          type="text"
          size="small"
          icon={<CopyOutlined />}
          onClick={event => {
            event.stopPropagation();
            copyToClipboard(text);
          }}
          style={{ width: 18, height: 18, padding: 0, flex: '0 0 18px' }}
        />
      </Tooltip>
      <Typography.Text ellipsis={{ tooltip: text }} style={{ display: 'inline-block', flex: 1, minWidth: 0 }}>
        {text}
      </Typography.Text>
    </span>
  );
};

const typeLabel = (value: string) => typeOptions.find(item => item.value === value)?.label || value;
const moduleLabel = (value: string) => moduleOptions.find(item => item.value === value)?.label || value;

const BusinessFilterOption: React.FC = () => {
  const access = useAccess();
  const [filterForm] = Form.useForm();
  const [form] = Form.useForm();
  const [data, setData] = useState<BusinessFilterOptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<BusinessFilterOptionItem | null>(null);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchData = async (page = current, size = pageSize) => {
    setLoading(true);
    try {
      const res = await getBusinessFilterOptions({ page, page_size: size, ...filterForm.getFieldsValue() });
      if (res.code === 0) {
        setData(res.data?.list || []);
        setTotal(res.data?.total || 0);
        setCurrent(res.data?.page || page);
        setPageSize(res.data?.page_size || size);
      }
    } catch (error) {
      message.error('获取业务筛选项失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, pageSize);
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ module: 'unrescued', status: 1, sort: 0 });
    setModalVisible(true);
  };

  const openEdit = (record: BusinessFilterOptionItem) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      const res = editing
        ? await updateBusinessFilterOption(editing.id, values)
        : await createBusinessFilterOption(values);
      if (res.code !== 0) throw new Error(res.msg || res.message || '保存失败');
      message.success(editing ? '更新成功' : '创建成功');
      setModalVisible(false);
      setEditing(null);
      form.resetFields();
      fetchData();
    } catch (error: any) {
      message.error(error.message || '保存失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await deleteBusinessFilterOption(id);
      if (res.code !== 0) throw new Error(res.msg || res.message || '删除失败');
      message.success('删除成功');
      fetchData();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const columns = [
    { title: '业务模块', dataIndex: 'module', key: 'module', width: 130, fixed: 'left' as const, render: (v: string) => <Tag color="blue">{moduleLabel(v)}</Tag> },
    { title: '选项类型', dataIndex: 'type', key: 'type', width: 150, render: (v: string) => typeLabel(v) },
    { title: '选项值', dataIndex: 'value', key: 'value', width: 220, render: (v: string) => <EllipsisText value={v} maxWidth={202} /> },
    { title: '显示名称', dataIndex: 'label', key: 'label', width: 220, render: (v: string) => <EllipsisText value={v} maxWidth={202} /> },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: number) => <Tag color={v === 1 ? 'green' : 'default'}>{v === 1 ? '启用' : '停用'}</Tag>,
    },
    { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
    { title: '来源', dataIndex: 'source_batch', key: 'source_batch', width: 140, render: (v: string) => <EllipsisText value={v} maxWidth={122} /> },
    { title: '备注', dataIndex: 'remark', key: 'remark', width: 180, render: (v: string) => <EllipsisText value={v} maxWidth={162} /> },
    { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 170, render: (v: string) => v || '-' },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: BusinessFilterOptionItem) => (
        <Space>
          {access.canUpdateBusinessFilterOption && (
            <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          )}
          {access.canDeleteBusinessFilterOption && (
            <Popconfirm title="确定要删除该筛选项吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
              <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Card style={cardStyle} bodyStyle={{ padding: 16 }}>
        <Form form={filterForm} layout="inline" style={{ rowGap: 12 }}>
          <Form.Item name="module">
            <Select allowClear placeholder="业务模块" style={{ width: 150 }} options={moduleOptions} />
          </Form.Item>
          <Form.Item name="type">
            <Select allowClear placeholder="选项类型" style={{ width: 160 }} options={typeOptions} />
          </Form.Item>
          <Form.Item name="status">
            <Select
              allowClear
              placeholder="状态"
              style={{ width: 120 }}
              options={[
                { label: '启用', value: 1 },
                { label: '停用', value: 0 },
              ]}
            />
          </Form.Item>
          <Form.Item name="keyword">
            <Input allowClear placeholder="选项值/名称/备注" style={{ width: 190 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchData(1, pageSize)}>查询</Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  filterForm.resetFields();
                  fetchData(1, pageSize);
                }}
              >
                重置
              </Button>
              {access.canCreateBusinessFilterOption && (
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增</Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card style={{ ...cardStyle, marginTop: 12 }} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data}
          scroll={{ x: 1540 }}
          pagination={{
            current,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: t => `共 ${t} 条`,
            onChange: fetchData,
          }}
        />
      </Card>

      <Modal
        title={editing ? '编辑业务筛选项' : '新增业务筛选项'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="module" label="业务模块" rules={[{ required: true, message: '请选择业务模块' }]}>
            <Select options={moduleOptions} />
          </Form.Item>
          <Form.Item name="type" label="选项类型" rules={[{ required: true, message: '请选择选项类型' }]}>
            <Select options={typeOptions} showSearch />
          </Form.Item>
          <Form.Item name="value" label="选项值" rules={[{ required: true, message: '请输入选项值' }]}>
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="label" label="显示名称">
            <Input maxLength={255} placeholder="为空时默认等于选项值" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={[{ label: '启用', value: 1 }, { label: '停用', value: 0 }]} />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="source_batch" label="来源">
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} maxLength={255} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BusinessFilterOption;
