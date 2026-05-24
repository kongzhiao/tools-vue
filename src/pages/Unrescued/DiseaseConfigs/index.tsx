import React, { useEffect, useState } from 'react';
import {
  Button,
  Alert,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Upload,
} from 'antd';
import { CloudUploadOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, InboxOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { useAccess } from '@umijs/max';
import {
  createDiseaseConfig,
  deleteDiseaseConfig,
  getDiseaseConfigs,
  importDiseaseConfigs,
  updateDiseaseConfig,
} from '@/services/unrescued';

interface DiseaseConfig {
  id: number;
  disease_code: string;
  disease_name: string;
  status: number;
  source_batch?: string;
  remark?: string;
  created_at: string;
  updated_at: string;
}

const DiseaseConfigs: React.FC = () => {
  const access = useAccess();
  const [data, setData] = useState<DiseaseConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [editing, setEditing] = useState<DiseaseConfig | null>(null);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ keyword: '', status: undefined as number | undefined });
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async (page = current, size = pageSize) => {
    setLoading(true);
    try {
      const res = await getDiseaseConfigs({ page, page_size: size, ...filters });
      if (res.code === 0) {
        setData(res.data?.list || []);
        setTotal(res.data?.total || 0);
        setCurrent(res.data?.page || page);
        setPageSize(res.data?.page_size || size);
      }
    } catch (error) {
      message.error('获取重大疾病编码失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, pageSize);
    const handleTaskChanged = () => fetchData(1, pageSize);
    window.addEventListener('taskStatusChanged', handleTaskChanged);
    return () => window.removeEventListener('taskStatusChanged', handleTaskChanged);
  }, []);

  const handleSubmit = async (values: any) => {
    try {
      if (editing) {
        const res = await updateDiseaseConfig(editing.id, values);
        if (res.code !== 0) throw new Error(res.msg || '更新失败');
        message.success('更新成功');
      } else {
        const res = await createDiseaseConfig(values);
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

  const handleDelete = async (id: number) => {
    try {
      const res = await deleteDiseaseConfig(id);
      if (res.code !== 0) throw new Error(res.msg || '删除失败');
      message.success('删除成功');
      fetchData();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const handleImport = async () => {
    if (fileList.length === 0) {
      message.warning('请选择CSV文件');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileList[0] as any);
    setUploading(true);
    try {
      const res = await importDiseaseConfigs(formData);
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

  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/assets/templates/unrescued/导入-附件3：救助重大疾病编码模板.csv';
    link.download = '导入-附件3：救助重大疾病编码模板.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    { title: '病种编码', dataIndex: 'disease_code', key: 'disease_code', width: 180 },
    { title: '病种名称', dataIndex: 'disease_name', key: 'disease_name' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number) => <Tag color={status === 1 ? 'green' : 'default'}>{status === 1 ? '启用' : '停用'}</Tag>,
    },
    { title: '来源批次', dataIndex: 'source_batch', key: 'source_batch', width: 160, render: (v: string) => v || '-' },
    { title: '备注', dataIndex: 'remark', key: 'remark', render: (v: string) => v || '-' },
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
      render: (_: any, record: DiseaseConfig) => (
        <Space>
          {access.canUpdateDiseaseConfig && (
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
          {access.canDeleteDiseaseConfig && (
            <Popconfirm title="确定要删除该编码吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
              <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          allowClear
          placeholder="编码/名称"
          style={{ width: 220 }}
          value={filters.keyword}
          onChange={e => setFilters({ ...filters, keyword: e.target.value })}
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
        {access.canImportDiseaseConfig && (
          <Button icon={<CloudUploadOutlined />} onClick={() => setImportVisible(true)}>导入</Button>
        )}
        {access.canCreateDiseaseConfig && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldsValue({ status: 1 });
              setModalVisible(true);
            }}
          >
            新增编码
          </Button>
        )}
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
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
        title={editing ? '编辑重大疾病编码' : '新增重大疾病编码'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditing(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="disease_code" label="病种编码" rules={[{ required: true, message: '请输入病种编码' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="disease_name" label="病种名称" rules={[{ required: true, message: '请输入病种名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={1}>
            <Select options={[{ label: '启用', value: 1 }, { label: '停用', value: 0 }]} />
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
        title="导入重大疾病编码"
        open={importVisible}
        onCancel={() => {
          setImportVisible(false);
          setFileList([]);
        }}
        width={640}
        footer={[
          <Button key="cancel" onClick={() => {
            setImportVisible(false);
            setFileList([]);
          }}>关闭</Button>,
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
              <span>1. 请先下载模板文件，按照模板格式填写病种编码和病种名称</span>
              <span>2. 仅支持 .csv 格式，编码自动识别 UTF-8/GBK</span>
              <span>3. 相同“病种编码+病种名称”按更新处理，同编码不同名称会保留多条</span>
              <Button type="link" icon={<DownloadOutlined />} onClick={downloadTemplate} style={{ padding: 0, height: 'auto' }}>
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
          beforeUpload={file => {
            setFileList([file]);
            return false;
          }}
          onRemove={() => setFileList([])}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">选择或拖入 CSV 文件</p>
          <p className="ant-upload-hint">仅支持 .csv 格式</p>
        </Upload.Dragger>
      </Modal>
    </div>
  );
};

export default DiseaseConfigs;
