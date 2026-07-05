import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, Form, Input, InputNumber, message, Modal, Popconfirm, Select, Space, Table, Tabs, Upload } from 'antd';
import { CloudUploadOutlined, CopyOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, InboxOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAccess } from '@umijs/max';
import {
  createEnrollConfig,
  deleteEnrollConfig,
  getEnrollConfigs,
  importEnrollConfigs,
  cloneEnrollConfigYear,
  updateEnrollConfig,
} from '@/services/enroll';

const cardStyle: React.CSSProperties = {
  borderRadius: 6,
  border: '1px solid #edf0f5',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
};

const tabItems = [
  { key: 'subsidy', label: '资助参保身份' },
  { key: 'medical', label: '医疗救助身份' },
  { key: 'identity_amount', label: '身份对应明细' },
  { key: 'uninsured_reason', label: '未参保原因' },
  { key: 'resident_payment_amount', label: '缴费金额' },
];

const filterOptionTypes = ['uninsured_reason', 'resident_payment_amount'];
const isFilterOptionType = (type: string) => filterOptionTypes.includes(type);

const attachmentMap: Record<string, string> = {
  subsidy: 'attachment1_config',
  medical: 'attachment2_config',
  identity_amount: 'attachment7_amount_config',
};

const templateMap: Record<string, string[]> = {
  subsidy: ['优先级', '资助参保身份', '资助档次', '资助标准', '个人实缴金额', '资助代缴金额'],
  medical: ['优先级', '医疗救助身份', '包含参保身份'],
  identity_amount: ['特殊人员身份', '实缴金额'],
};

const cloneTypeOptions = [
  { label: '资助参保身份', value: 'subsidy' },
  { label: '医疗救助身份', value: 'medical' },
  { label: '身份对应明细', value: 'identity_amount' },
];

const downloadCsvTemplate = (filename: string, headers: string[]) => {
  const content = `\uFEFF${headers.join(',')}\n`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const resolveUploadFile = (file?: any) => file?.originFileObj || file;

const currentYearValue = dayjs().year();
const yearOptions = Array.from({ length: 3 }, (_, index) => {
  const year = currentYearValue - index;
  return { label: `${year}`, value: year };
});

const tableScrollXMap: Record<string, number> = {
  subsidy: 1920,
  medical: 1500,
  identity_amount: 1450,
  uninsured_reason: 1000,
  resident_payment_amount: 1000,
};

const actionCellStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  width: '100%',
  whiteSpace: 'nowrap',
};

const buildConfigPayload = (values: any, activeType: string) => {
  if (isFilterOptionType(activeType)) {
    return {
      type: activeType,
      value: values.value,
      label: values.label,
      status: values.status ?? 1,
      sort: values.sort ?? 0,
      remark: values.remark,
    };
  }

  const common = {
    year: values.year,
    type: activeType,
    config_type: activeType,
    status: values.status ?? 1,
    remark: values.remark,
  };

  if (activeType === 'identity_amount') {
    return {
      ...common,
      special_identity: values.special_identity,
      included_identities: values.included_identities || [],
      paid_amount: values.paid_amount,
      sort: values.sort,
    };
  }

  if (activeType === 'medical') {
    return {
      ...common,
      priority: values.priority,
      identity_name: values.identity_name,
      included_identities: values.included_identities || [],
    };
  }

  return {
    ...common,
    priority: values.priority,
    identity_name: values.identity_name,
    insurance_level: values.insurance_level,
    subsidy_standard: values.subsidy_standard,
    personal_amount: values.personal_amount,
    subsidy_amount: values.subsidy_amount,
    included_identities: values.included_identities || [],
  };
};

const EnrollConfigsPage: React.FC = () => {
  const access = useAccess();
  const [filterForm] = Form.useForm();
  const [form] = Form.useForm();
  const [activeType, setActiveType] = useState('subsidy');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [cloneVisible, setCloneVisible] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [fileList, setFileList] = useState<any[]>([]);
  const [cloneSubmitting, setCloneSubmitting] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const currentConfigYear = Form.useWatch('year', filterForm);
  const [cloneForm] = Form.useForm();

  const fetchData = async (page = current, size = pageSize) => {
    setLoading(true);
    try {
      const values = isFilterOptionType(activeType) ? {} : filterForm.getFieldsValue();
      const res = await getEnrollConfigs({
        ...values,
        type: activeType,
        page,
        page_size: size,
      });
      if (res.code === 0) {
        setData(res.data?.list || []);
        setTotal(res.data?.total || 0);
        setCurrent(res.data?.page || page);
        setPageSize(res.data?.page_size || size);
      }
    } catch (error) {
      message.error('获取配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isFilterOptionType(activeType)) {
      const year = filterForm.getFieldValue('year') || currentYearValue;
      filterForm.setFieldsValue({ year });
    }
    fetchData(1, pageSize);
  }, [activeType]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue(
      isFilterOptionType(activeType)
        ? { type: activeType, status: 1, sort: 0 }
        : { year: filterForm.getFieldValue('year') || dayjs().year(), type: activeType, status: 1, priority: 0, sort: 0 },
    );
    setModalVisible(true);
  };

  const openEdit = (record: any) => {
    setEditing(record);
    const values = { ...record, type: activeType };
    if (activeType === 'resident_payment_amount') {
      values.value = record.value === undefined || record.value === null ? undefined : Number(record.value);
    }
    form.setFieldsValue(values);
    setModalVisible(true);
  };

  const openClone = () => {
    const targetYear = currentConfigYear || filterForm.getFieldValue('year') || currentYearValue;
    cloneForm.setFieldsValue({
      from_year: targetYear - 1,
      to_year: targetYear,
      types: [activeType],
      overwrite: false,
    });
    setCloneVisible(true);
  };

  const submitForm = async (values: any) => {
    try {
      const payload = buildConfigPayload(values, activeType);
      const res = editing ? await updateEnrollConfig(editing.id, payload) : await createEnrollConfig(payload);
      if (res.code !== 0) throw new Error(res.message || '保存失败');
      message.success('保存成功');
      setModalVisible(false);
      fetchData();
    } catch (error: any) {
      message.error(error.message || '保存失败');
    }
  };

  const submitImport = async () => {
    const uploadFile = resolveUploadFile(fileList[0]);
    if (!uploadFile) {
      message.warning('请选择导入文件');
      return;
    }
    const year = currentConfigYear || filterForm.getFieldValue('year') || dayjs().year();
    const formData = new FormData();
    formData.append('file', uploadFile as File);
    formData.append('year', String(year));
    formData.append('attachment_type', attachmentMap[activeType]);
    try {
      const res = await importEnrollConfigs(formData);
      if (res.code !== 0) throw new Error(res.message || '导入失败');
      message.success(`导入完成：总 ${res.data?.total || 0} 条，成功入库 ${res.data?.success || 0} 条，跳过 ${res.data?.skipped || 0} 条，失败 ${res.data?.failed || 0} 条`);
      setImportVisible(false);
      setFileList([]);
      fetchData(1, pageSize);
    } catch (error: any) {
      message.error(error.message || '导入失败');
    }
  };

  const submitClone = async (values: any) => {
    if (!Array.isArray(values.types) || values.types.length === 0) {
      message.warning('请至少选择一项要克隆的配置');
      return;
    }

    setCloneSubmitting(true);
    try {
      const res = await cloneEnrollConfigYear({
        from_year: values.from_year,
        to_year: values.to_year,
        types: values.types,
        overwrite: Boolean(values.overwrite),
      });
      if (res.code !== 0) throw new Error(res.message || '克隆失败');
      message.success(`克隆成功，共处理 ${res.data?.count || 0} 条配置`);
      setCloneVisible(false);
      filterForm.setFieldsValue({ year: values.to_year });
      fetchData(1, pageSize);
    } catch (error: any) {
      message.error(error.message || '克隆失败');
    } finally {
      setCloneSubmitting(false);
    }
  };

  const columns = useMemo(() => {
    const actionColumn = {
      title: '操作',
      width: 170,
      align: 'center' as const,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <span style={actionCellStyle}>
          {access.canUpdateEnrollConfigs && <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>}
          {access.canDeleteEnrollConfigs && (
            <Popconfirm title="确定删除该配置吗？" onConfirm={async () => {
              await deleteEnrollConfig(record.id, { type: activeType });
              message.success('删除成功');
              fetchData();
            }}>
              <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </span>
      ),
    };

    if (isFilterOptionType(activeType)) {
      return [
        {
          title: activeType === 'uninsured_reason' ? '未参保原因' : '缴费金额',
          dataIndex: 'value',
          width: 200,
          fixed: 'left' as const,
        },
        { title: '显示名称', dataIndex: 'label', width: 220 },
        { title: '排序', dataIndex: 'sort', width: 100 },
        { title: '状态', dataIndex: 'status', width: 100, render: (value: number) => value === 0 ? '停用' : '启用' },
        { title: '备注', dataIndex: 'remark', width: 260 },
        actionColumn,
      ];
    }

    if (activeType === 'identity_amount') {
      return [
        { title: '年份', dataIndex: 'year', width: 90, fixed: 'left' as const },
        { title: '特殊人员身份', dataIndex: 'special_identity', width: 220, fixed: 'left' as const },
        { title: '包含参保身份', dataIndex: 'included_identities', width: 360, render: (v: any[]) => Array.isArray(v) && v.length ? v.join('、') : '-' },
        { title: '实缴金额', dataIndex: 'paid_amount', width: 120 },
        { title: '排序', dataIndex: 'sort', width: 90 },
        { title: '备注', dataIndex: 'remark', width: 220 },
        actionColumn,
      ];
    }

    if (activeType === 'medical') {
      return [
        { title: '年份', dataIndex: 'year', width: 90, fixed: 'left' as const },
        { title: '优先级', dataIndex: 'priority', width: 90 },
        { title: '医疗救助身份', dataIndex: 'identity_name', width: 240, fixed: 'left' as const },
        { title: '包含参保身份', dataIndex: 'included_identities', width: 360, render: (v: any[]) => Array.isArray(v) && v.length ? v.join('、') : '-' },
        { title: '备注', dataIndex: 'remark', width: 220 },
        actionColumn,
      ];
    }

    return [
      { title: '年份', dataIndex: 'year', width: 90, fixed: 'left' as const },
      { title: '优先级', dataIndex: 'priority', width: 90 },
      { title: '资助参保身份', dataIndex: 'identity_name', width: 220, fixed: 'left' as const },
      { title: '资助/参保档次', dataIndex: 'insurance_level', width: 140 },
      { title: '资助标准', dataIndex: 'subsidy_standard', width: 140 },
      { title: '个人实缴金额', dataIndex: 'personal_amount', width: 130 },
      { title: '资助代缴金额', dataIndex: 'subsidy_amount', width: 130 },
      { title: '包含参保身份', dataIndex: 'included_identities', width: 360, render: (v: any[]) => Array.isArray(v) && v.length ? v.join('、') : '-' },
      { title: '备注', dataIndex: 'remark', width: 200 },
      actionColumn,
    ];
  }, [activeType, access]);

  return (
    <div style={{ padding: 16 }}>
      <Card style={cardStyle} bodyStyle={{ padding: 16 }}>
        <Form form={filterForm} layout="inline">
          {!isFilterOptionType(activeType) && (
            <Form.Item name="year">
              <Select
                style={{ width: 120 }}
                options={yearOptions}
                onChange={year => {
                  filterForm.setFieldsValue({ year });
                  fetchData(1, pageSize);
                }}
              />
            </Form.Item>
          )}
          <Form.Item>
            <Space>
              <Button type="primary" onClick={() => fetchData(1, pageSize)}>查询</Button>
              <Button icon={<ReloadOutlined />} onClick={() => fetchData(1, pageSize)}>刷新</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card
        style={{ ...cardStyle, marginTop: 12 }}
        bodyStyle={{ padding: 0 }}
        title={<Tabs activeKey={activeType} onChange={setActiveType} items={tabItems} />}
        extra={
          <Space>
            {access.canImportEnrollConfigs && !isFilterOptionType(activeType) && (
              <Button
                icon={<CloudUploadOutlined />}
                onClick={() => setImportVisible(true)}
              >
                导入
              </Button>
            )}
            {access.canCreateEnrollConfigs && !isFilterOptionType(activeType) && (
              <Button icon={<CopyOutlined />} onClick={openClone}>克隆年度</Button>
            )}
            {access.canCreateEnrollConfigs && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增</Button>}
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data}
          scroll={{ x: tableScrollXMap[activeType] || 1500 }}
          pagination={{ current, pageSize, total, showSizeChanger: true, showTotal: value => `共 ${value} 条` }}
          onChange={p => fetchData(p.current || 1, p.pageSize || pageSize)}
        />
      </Card>

      <Modal title={editing ? '编辑配置' : '新增配置'} open={modalVisible} onCancel={() => setModalVisible(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={submitForm}>
          {!isFilterOptionType(activeType) && (
            <Form.Item name="year" label="年份" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          )}
          {isFilterOptionType(activeType) ? (
            <>
              <Form.Item
                name="value"
                label={activeType === 'uninsured_reason' ? '未参保原因' : '缴费金额'}
                rules={[{ required: true }]}
              >
                {activeType === 'resident_payment_amount'
                  ? <InputNumber style={{ width: '100%' }} min={0} precision={2} />
                  : <Input />}
              </Form.Item>
              <Form.Item name="label" label="显示名称"><Input /></Form.Item>
              <Form.Item name="sort" label="排序"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="status" label="状态">
                <Select
                  options={[
                    { label: '启用', value: 1 },
                    { label: '停用', value: 0 },
                  ]}
                />
              </Form.Item>
            </>
          ) : activeType === 'identity_amount' ? (
            <>
              <Form.Item name="special_identity" label="特殊人员身份" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="included_identities" label="包含参保身份"><Select mode="tags" open={false} tokenSeparators={['、', ',', '，', ';', '；']} /></Form.Item>
              <Form.Item name="paid_amount" label="实缴金额"><InputNumber style={{ width: '100%' }} precision={2} /></Form.Item>
              <Form.Item name="sort" label="排序"><InputNumber style={{ width: '100%' }} /></Form.Item>
            </>
          ) : activeType === 'medical' ? (
            <>
              <Form.Item name="priority" label="优先级"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="identity_name" label="医疗救助身份" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="included_identities" label="包含参保身份"><Select mode="tags" open={false} tokenSeparators={['、', ',', '，', ';', '；']} /></Form.Item>
            </>
          ) : (
            <>
              <Form.Item name="priority" label="优先级"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="identity_name" label="资助参保身份" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="insurance_level" label="资助/参保档次"><Input /></Form.Item>
              <Form.Item name="subsidy_standard" label="资助标准"><Input /></Form.Item>
              <Form.Item name="personal_amount" label="个人实缴金额"><InputNumber style={{ width: '100%' }} precision={2} /></Form.Item>
              <Form.Item name="subsidy_amount" label="资助代缴金额"><InputNumber style={{ width: '100%' }} precision={2} /></Form.Item>
              <Form.Item name="included_identities" label="包含参保身份"><Select mode="tags" open={false} tokenSeparators={['、', ',', '，', ';', '；']} /></Form.Item>
            </>
          )}
          <Form.Item name="remark" label="备注"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`导入 ${tabItems.find(item => item.key === activeType)?.label || '参保配置'}`}
        open={importVisible}
        onCancel={() => setImportVisible(false)}
        width={640}
        footer={[
          <Button key="cancel" onClick={() => setImportVisible(false)}>关闭</Button>,
          <Button key="upload" type="primary" icon={<UploadOutlined />} disabled={!fileList.length} onClick={submitImport}>确认导入</Button>,
        ]}
      >
        <Alert
          message="导入说明"
          description={
            <Space direction="vertical" size={8}>
              <span>1. 当前年份：{currentConfigYear || filterForm.getFieldValue('year') || dayjs().year()}</span>
              <span>2. 仅支持 .csv 格式，编码自动识别 UTF-8/GBK</span>
              <span>3. 按程序层规则新增或更新配置，不依赖数据库唯一索引</span>
              <Button
                type="link"
                icon={<DownloadOutlined />}
                onClick={() => downloadCsvTemplate(`${tabItems.find(item => item.key === activeType)?.label || '参保配置'}_导入模板.csv`, templateMap[activeType] || [])}
                style={{ padding: 0, height: 'auto' }}
              >
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

      <Modal
        title="克隆年度配置"
        open={cloneVisible}
        onCancel={() => setCloneVisible(false)}
        onOk={() => cloneForm.submit()}
        confirmLoading={cloneSubmitting}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          message="克隆说明"
          description="会把勾选的参保配置从来源年份复制到目标年份。未勾选覆盖时，按程序规则新增或更新同名配置；勾选覆盖时，只会先清空目标年份中被勾选的配置。"
          style={{ marginBottom: 16 }}
        />
        <Form form={cloneForm} layout="vertical" onFinish={submitClone}>
          <Form.Item name="from_year" label="来源年份" rules={[{ required: true, message: '请选择来源年份' }]}>
            <Select options={yearOptions} />
          </Form.Item>
          <Form.Item name="to_year" label="目标年份" rules={[{ required: true, message: '请选择目标年份' }]}>
            <Select options={yearOptions} />
          </Form.Item>
          <Form.Item name="types" label="克隆内容" rules={[{ required: true, message: '请至少选择一项要克隆的配置' }]}>
            <Checkbox.Group options={cloneTypeOptions} />
          </Form.Item>
          <Form.Item name="overwrite" valuePropName="checked">
            <Checkbox>覆盖目标年份已有配置</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EnrollConfigsPage;
