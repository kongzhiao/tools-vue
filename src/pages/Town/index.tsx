import React, { useEffect, useState } from 'react';
import { Alert, Button, Checkbox, Dropdown, Form, Input, InputNumber, message, Modal, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography, Upload } from 'antd';
import { CloudUploadOutlined, CopyOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, InboxOutlined, PlusOutlined, ReloadOutlined, SettingOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { history, request, useAccess } from '@umijs/max';
import { createTown, deleteTown, getTowns, updateTown } from '@/services/town';

interface TownItem {
  id: number;
  name: string;
  code?: string;
  status: number;
  sort: number;
  remark?: string;
  users_count?: number;
  created_at: string;
  updated_at: string;
}

const copyToClipboard = async (text: string) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    message.success('已复制');
  } catch (error) {
    message.error('复制失败');
  }
};

const EllipsisText: React.FC<{ value?: any; maxWidth?: number | string }> = ({ value, maxWidth = '100%' }) => {
  const text = value === null || value === undefined || value === '' ? '' : String(value);
  if (!text) return <>-</>;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth, width: '100%', minWidth: 0, verticalAlign: 'middle' }}>
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
      <Typography.Text
        ellipsis={{ tooltip: text }}
        style={{ display: 'inline-block', flex: 1, minWidth: 0, maxWidth: '100%', margin: 0 }}
      >
        {text}
      </Typography.Text>
    </span>
  );
};

const Town: React.FC = () => {
  const access = useAccess();
  const [data, setData] = useState<TownItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [editing, setEditing] = useState<TownItem | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ name: '', status: undefined as number | undefined });
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name',
    'code',
    'status',
    'users_count',
    'sort',
    'remark',
    'created_at',
    'updated_at',
    'action',
  ]);
  const [form] = Form.useForm();

  const fetchData = async (page = current, size = pageSize) => {
    setLoading(true);
    try {
      const res = await getTowns({ page, page_size: size, ...filters });
      if (res.code === 0) {
        setData(res.data?.list || []);
        setTotal(res.data?.total || 0);
        setCurrent(res.data?.page || page);
        setPageSize(res.data?.page_size || size);
      }
    } catch (error) {
      message.error('获取镇街列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, pageSize);
  }, []);

  const handleSubmit = async (values: any) => {
    try {
      if (editing) {
        const res = await updateTown(editing.id, values);
        if (res.code !== 0) throw new Error(res.msg || '更新失败');
        message.success('更新成功');
      } else {
        const res = await createTown(values);
        if (res.code !== 0) throw new Error(res.msg || '创建失败');
        message.success('创建成功');
      }
      setModalVisible(false);
      setEditing(null);
      form.resetFields();
      fetchData();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const columnOptions = [
    { label: '镇街名称', value: 'name', disabled: true },
    // { label: '编码', value: 'code' },
    { label: '状态', value: 'status' },
    { label: '账户数量', value: 'users_count' },
    { label: '排序', value: 'sort' },
    { label: '备注', value: 'remark' },
    { label: '创建时间', value: 'created_at' },
    { label: '更新时间', value: 'updated_at' },
    { label: '操作', value: 'action', disabled: true },
  ];

  const columns = [
    { title: '镇街名称', dataIndex: 'name', key: 'name', width: 200, render: (v: string) => <EllipsisText value={v} maxWidth={182} /> },
    // { title: '编码', dataIndex: 'code', key: 'code', render: (v: string) => v || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number) => <Tag color={status === 1 ? 'green' : 'default'}>{status === 1 ? '启用' : '停用'}</Tag>,
    },
    {
      title: '账户数量',
      dataIndex: 'users_count',
      key: 'users_count',
      width: 110,
      render: (count: number, record: TownItem) => (
        <Button
          type="link"
          style={{ padding: 0 }}
          onClick={() => history.push(`/user-management/accounts?town_id=${record.id}`)}
        >
          {count || 0}
        </Button>
      ),
    },
    { title: '排序', dataIndex: 'sort', key: 'sort', width: 90 },
    { title: '备注', dataIndex: 'remark', key: 'remark', width: 160, render: (v: string) => <EllipsisText value={v} maxWidth={142} /> },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text: string) => text ? new Date(text).toLocaleString() : '-',
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (text: string) => text ? new Date(text).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: TownItem) => (
        <Space>
          {access.canUpdateTown && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(record);
                form.setFieldsValue(record);
                setModalVisible(true);
              }}
            >
              编辑
            </Button>
          )}
          {access.canDeleteTown && (
            <Popconfirm title="确定要删除该镇街吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
              <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ].filter(column => visibleColumns.includes(column.key as string));

  const handleDelete = async (id: number) => {
    try {
      const res = await deleteTown(id);
      if (res.code !== 0) throw new Error(res.msg || '删除失败');
      message.success('删除成功');
      fetchData();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/assets/templates/unrescued/镇街管理-镇街导入.csv';
    link.download = '镇街管理-镇街导入.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    if (fileList.length === 0) {
      message.error('请先选择文件');
      return;
    }

    const file = fileList[0].originFileObj;
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await request('/api/towns/import', {
        method: 'POST',
        data: formData,
      });

      if (res.code !== 0) throw new Error(res.msg || '导入提交失败');
      message.success('导入任务已提交，请在任务中心查看进度');
      setImportVisible(false);
      setFileList([]);
    } catch (error: any) {
      message.error(error.message || '导入提交失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          allowClear
          placeholder="镇街名称"
          style={{ width: 200 }}
          value={filters.name}
          onChange={e => setFilters({ ...filters, name: e.target.value })}
        />
        <Select
          allowClear
          placeholder="状态"
          style={{ width: 120 }}
          value={filters.status}
          onChange={value => setFilters({ ...filters, status: value })}
          options={[{ label: '启用', value: 1 }, { label: '停用', value: 0 }]}
        />
        <Button onClick={() => fetchData(1, pageSize)}>查询</Button>
        <Button icon={<ReloadOutlined />} onClick={() => fetchData(current, pageSize)} loading={loading}>
          刷新
        </Button>
        <Dropdown
          trigger={['click']}
          dropdownRender={() => (
            <div style={{ padding: 12, background: '#fff', boxShadow: '0 3px 12px rgba(0,0,0,0.12)' }}>
              <Checkbox.Group
                value={visibleColumns}
                options={columnOptions}
                onChange={values => {
                  const next = Array.from(new Set(['name', ...values.map(String), 'action']));
                  setVisibleColumns(next);
                }}
                style={{ display: 'grid', gap: 8 }}
              />
            </div>
          )}
        >
          <Button icon={<SettingOutlined />}>显示字段</Button>
        </Dropdown>
        {access.canCreateTown && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldsValue({ status: 1, sort: 0 });
              setModalVisible(true);
            }}
          >
            新增镇街
          </Button>
        )}
        {access.canImportTown && (
          <Button icon={<CloudUploadOutlined />} onClick={() => setImportVisible(true)}>
            导入
          </Button>
        )}
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        scroll={{ x: 1020 }}
        pagination={{
          current,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: n => `共 ${n} 条记录`,
          onChange: fetchData,
        }}
      />

      <Modal
        title={editing ? '编辑镇街' : '新增镇街'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditing(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="镇街名称" rules={[{ required: true, message: '请输入镇街名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="编码">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={1}>
            <Select options={[{ label: '启用', value: 1 }, { label: '停用', value: 0 }]} />
          </Form.Item>
          <Form.Item name="sort" label="排序" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">{editing ? '更新' : '创建'}</Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="从CSV导入镇街"
        open={importVisible}
        onCancel={() => {
          setImportVisible(false);
          setFileList([]);
        }}
        width={640}
        footer={[
          <Button key="cancel" onClick={() => setImportVisible(false)}>关闭</Button>,
          <Button
            key="upload"
            type="primary"
            icon={<UploadOutlined />}
            loading={uploading}
            disabled={fileList.length === 0}
            onClick={handleImport}
          >
            确认导入
          </Button>,
        ]}
      >
        <Alert
          message="导入说明"
          description={
            <Space direction="vertical" size={8}>
              <span>1. 请先下载模板文件，按照模板格式填写数据</span>
              <span>2. 仅支持 .csv 格式，编码自动识别 UTF-8/GBK</span>
              <span>3. 镇街编码存在时按编码更新；编码为空时按镇街名称更新</span>
              <Button type="link" icon={<DownloadOutlined />} onClick={handleDownloadTemplate} style={{ padding: 0, height: 'auto' }}>
                下载导入模板
              </Button>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Upload.Dragger
          accept=".csv"
          maxCount={1}
          fileList={fileList}
          beforeUpload={() => false}
          onChange={({ fileList: nextFileList }) => setFileList(nextFileList)}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">点击或拖拽CSV文件到此区域上传</p>
          <p className="ant-upload-hint">仅支持 .csv 格式</p>
        </Upload.Dragger>
      </Modal>
    </div>
  );
};

export default Town;
