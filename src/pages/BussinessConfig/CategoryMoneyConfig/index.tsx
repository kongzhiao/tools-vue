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
  Upload,
  Radio,
  Alert,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { request, useAccess } from '@umijs/max';
import {
  getCategoryQuotas,
  createCategoryQuota,
  updateCategoryQuota,
  deleteCategoryQuota,
  getQuotaYears,
  cloneCategoryQuotas,
} from '@/services/yfSettlement';
import type { UploadFile } from 'antd/es/upload/interface';

const { Option } = Select;

interface CategoryQuota {
  id: number;
  year: number;
  category: string;
  quota_amount: number;
  remark?: string;
}

const CategoryMoneyConfigPage: React.FC = () => {
  const access = useAccess();
  const [data, setData] = useState<CategoryQuota[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CategoryQuota | null>(null);
  const [form] = Form.useForm();

  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [cloneModalVisible, setCloneModalVisible] = useState(false);
  const [cloneForm] = Form.useForm();

  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importMode, setImportMode] = useState<'overwrite' | 'append'>('append');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // 获取所有年份
  const fetchYears = async () => {
    try {
      const res = await getQuotaYears();
      if (res.code === 0) {
        setYears(res.data || []);
        if (res.data?.length > 0 && !res.data.includes(selectedYear)) {
          // 不强制切换，但确保列表有值
        }
      }
    } catch (error) {
      console.error('获取年份失败', error);
    }
  };

  // 获取数据
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getCategoryQuotas({ year: selectedYear, page_size: 1000 });
      if (res.code === 0) {
        setData(res.data.list || []);
      }
    } catch (error) {
      message.error('获取配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  // 提交新增/修改
  const handleSubmit = async (values: any) => {
    try {
      if (editingRecord) {
        await updateCategoryQuota(editingRecord.id, values);
        message.success('更新成功');
      } else {
        await createCategoryQuota({ ...values, year: selectedYear });
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
      await deleteCategoryQuota(id);
      message.success('删除成功');
      fetchData();
    } catch (error: any) {
      message.error('删除失败');
    }
  };

  // 克隆年度数据
  const handleClone = async (values: any) => {
    try {
      await cloneCategoryQuotas(values);
      message.success('克隆成功');
      setCloneModalVisible(false);
      fetchYears();
      fetchData();
    } catch (error: any) {
      message.error(error.message || '克隆失败');
    }
  };

  // 导入
  const handleImport = async () => {
    if (fileList.length === 0) {
      message.error('请选择要上传的文件');
      return;
    }
    const formData = new FormData();
    formData.append('file', fileList[0] as any);
    formData.append('year', selectedYear.toString());
    formData.append('mode', importMode);

    setUploading(true);
    try {
      const res = await request('/api/yf-category-quotas/import', {
        method: 'POST',
        data: formData,
      });
      if (res.code === 0) {
        message.success(`导入成功，新增 ${res.data.imported} 条`);
        setImportModalVisible(false);
        setFileList([]);
        fetchData();
      } else {
        message.error(res.message || '导入失败');
      }
    } catch (error) {
      message.error('导入出错');
    } finally {
      setUploading(false);
    }
  };

  const columns = [
    { title: '优抚类别', dataIndex: 'category', key: 'category' },
    {
      title: '补助限额金额（元/年）',
      dataIndex: 'quota_amount',
      key: 'quota_amount',
      render: (val: any) => `¥${Number(val || 0).toFixed(2)}`
    },
    { title: '备注', dataIndex: 'remark', key: 'remark' },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: CategoryQuota) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingRecord(record);
              form.setFieldsValue(record);
              setModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm title="确定删除吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="选择年份"
            style={{ width: 120 }}
            value={selectedYear}
            onChange={setSelectedYear}
          >
            {[...new Set([...years, new Date().getFullYear()])].sort((a, b) => b - a).map(y => (
              <Option key={y} value={y}>{y}年</Option>
            ))}
          </Select>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingRecord(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            新增类别
          </Button>
          <Button
            icon={<CopyOutlined />}
            onClick={() => {
              cloneForm.setFieldsValue({ to_year: selectedYear });
              setCloneModalVisible(true);
            }}
          >
            年度克隆
          </Button>
          <Button
            icon={<CloudUploadOutlined />}
            onClick={() => setImportModalVisible(true)}
          >
            导入
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 20 }}
        />
      </Card>

      {/* 新增/编辑 Modal */}
      <Modal
        title={editingRecord ? '编辑类别' : '新增类别'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="category" label="优抚类别" rules={[{ required: true }]}>
            <Input placeholder="输入优抚类别名称" />
          </Form.Item>
          <Form.Item name="quota_amount" label="补助限额 (元/年)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} precision={2} min={0} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 克隆 Modal */}
      <Modal
        title="克隆年度配置"
        open={cloneModalVisible}
        onCancel={() => setCloneModalVisible(false)}
        onOk={() => cloneForm.submit()}
      >
        <Form form={cloneForm} layout="vertical" onFinish={handleClone}>
          <Form.Item name="from_year" label="源年份" rules={[{ required: true }]}>
            <Select placeholder="选择来源年份">
              {years.map(y => <Option key={y} value={y}>{y}年</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="to_year" label="目标年份" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} placeholder="输入目标年份" />
          </Form.Item>
          <p style={{ color: '#fa8c16' }}>* 克隆会将源年份的所有类别及限额复制到目标年份。</p>
        </Form>
      </Modal>

      {/* 导入 Modal */}
      <Modal
        title="从CSV导入配置"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          setFileList([]);
        }}
        onOk={handleImport}
        confirmLoading={uploading}
        width={600}
        okText="确认导入"
        cancelText="关闭"
      >
        <Alert
          type="info"
          showIcon={false}
          style={{ backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', marginBottom: 20 }}
          description={
            <div style={{ padding: '8px 4px' }}>
              <Typography.Title level={5} style={{ marginTop: 0 }}>导入说明</Typography.Title>
              <ol style={{ paddingLeft: 20, marginBottom: 16 }}>
                <li>请先下载模板文件，按照模板格式填写数据</li>
                <li>仅支持 .csv 格式，文件大小不超过 128MB</li>
                <li>导入时请选择是全量覆盖还是增量添加</li>
              </ol>
              <Button
                type="primary"
                icon={<CloudDownloadOutlined />}
                href="/assets/templates/yf-settlement/业务配置-优抚人员类别额度配置.csv"
                target="_blank"
                style={{ borderRadius: 4 }}
              >
                下载导入模板
              </Button>
            </div>
          }
        />

        <div style={{ marginBottom: 20 }}>
          <Space align="center">
            <span>导入目标年份：</span>
            <Select
              style={{ width: 120 }}
              value={selectedYear}
              onChange={setSelectedYear}
            >
              {[...new Set([...years, new Date().getFullYear(), new Date().getFullYear() + 1])].sort((a, b) => b - a).map(y => (
                <Option key={y} value={y}>{y}年</Option>
              ))}
            </Select>
          </Space>
        </div>

        <div style={{ marginBottom: 20 }}>
          <Radio.Group value={importMode} onChange={e => setImportMode(e.target.value)}>
            <Radio value="overwrite">全量覆盖</Radio>
            <Radio value="append">增量添加</Radio>
          </Radio.Group>
        </div>

        {importMode === 'overwrite' && (
          <div style={{ marginBottom: 20 }}>
            <Typography.Text type="warning" style={{ color: '#faad14', fontWeight: 'bold' }}>
              ⚠️ 导入将删除 {selectedYear} 年的所有现有配置，并导入新配置
            </Typography.Text>
          </div>
        )}

        <Upload.Dragger
          accept=".csv"
          fileList={fileList}
          beforeUpload={file => {
            setFileList([file]);
            return false;
          }}
          onRemove={() => setFileList([])}
          multiple={false}
          style={{ padding: '20px 0' }}
        >
          <p className="ant-upload-drag-icon">
            <CloudUploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">点击或拖拽CSV文件到此区域上传</p>
          <p className="ant-upload-hint">仅支持 .csv 格式，文件大小不超过 128MB</p>
        </Upload.Dragger>
      </Modal>
    </PageContainer>
  );
};

export default CategoryMoneyConfigPage;