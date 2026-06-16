import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Dropdown,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Popover,
  Select,
  Space,
  Table,
  Tag,
  Upload,
  Tooltip,
  Typography,
} from 'antd';
import {
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  InboxOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  UploadOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAccess } from '@umijs/max';
import {
  exportEnrollLedgers,
  getEnrollLedgerOptions,
  getEnrollLedgerStatistics,
  getEnrollLedgers,
  deleteEnrollLedger,
  importEnrollAttachment3,
  importEnrollAttachment3Return,
  importEnrollAttachment4,
  importEnrollAttachment5,
  importEnrollAttachment6,
  updateEnrollLedger,
} from '@/services/enroll';

const cardStyle: React.CSSProperties = {
  borderRadius: 6,
  border: '1px solid #edf0f5',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
};

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
};

const toolbarSideStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
};

const filterRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '110px minmax(190px, 240px) minmax(150px, 180px) minmax(130px, 160px) auto',
  gap: 8,
  alignItems: 'center',
};

const filterActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  justifyContent: 'flex-start',
  whiteSpace: 'nowrap',
};

const yearOptions = [0, 1, 2].map(i => ({ label: `${dayjs().year() - i}`, value: dayjs().year() - i }));
const monthOptions = Array.from({ length: 12 }, (_, index) => {
  const value = index + 1;
  return { label: `${String(value).padStart(2, '0')}月`, value };
});

const importMetas: Record<string, { title: string; button: string; endpoint: (data: FormData) => Promise<any>; template: string[]; rule: string }> = {
  attachment3: {
    title: '导入附件3《资助参保对象全量明细》',
    button: '导入 附件3全量明细',
    endpoint: importEnrollAttachment3,
    template: ['序号', '身份证号', '姓名', '医疗救助身份', '镇（街）', '村（居）', '纳入资助时间', '缴费时间'],
    rule: '按“年份 + 身份证号”新增或更新参保台账，并按本月导入前年度台账状态计算新增、变更、取消',
  },
  attachment4: {
    title: '导入附件4《困难人员参保核实》',
    button: '导入 附件4参保核实',
    endpoint: importEnrollAttachment4,
    template: ['姓名', '身份证号', '居民医保所属区划', '职工医保所属区划', '资助金额', '个人缴费金额', '是否参保职工', '是否参保居民', '参保类型', '金保号', '参保年度(职工)', '参保年度(居民)', '居民医保参保状态', '大学生医保参保状态', '职工医保参保状态', '特殊人员身份类别'],
    rule: '按“年份 + 身份证号”匹配既有台账，写入居民医保缴费金额和区外参保备注，并重新计算参保与资助字段',
  },
  attachment5: {
    title: '导入附件5《税务请款明细》',
    button: '导入 附件5税务请款',
    endpoint: importEnrollAttachment5,
    template: ['序号', '镇（街）', '姓名', '身份证号码', '人员编号', '代缴类别', '参保类别', '代缴金额', '个人缴费金额', '缴费总额', '请款批次'],
    rule: '按“年份 + 身份证号”匹配既有台账，写入资助金额、获得资助身份类别、请款批次，并重新计算参保与资助字段',
  },
  attachment6: {
    title: '导入附件6《死亡人员名单》',
    button: '导入 附件6死亡名单',
    endpoint: importEnrollAttachment6,
    template: ['序号', '姓名', '身份证号码', '死亡时间', '镇街', '备注'],
    rule: '按“年份 + 身份证号”匹配既有台账，写入备注（卫健委死亡时间）',
  },
  attachment3Return: {
    title: '回导附件3《特殊对象资助参保台账》',
    button: '回导 附件3人工调整',
    endpoint: importEnrollAttachment3Return,
    template: ['序号', '纳入资助时间', '身份取消时间', '身份变更情况', '镇（街）', '村（居）', '姓名', '身份证号码', '缴费时间', '资助地或参保地（区外备注）', '备注（卫健委死亡时间）', '未参保原因', '人工备注'],
    rule: '用于导出附件3后回导人工调整内容，仅按“年份 + 身份证号”更新缴费时间、未参保原因、区外备注、死亡备注、人工备注，不新增人员',
  },
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

const statCards = [
  { key: 'total', label: '当前记录', color: '#1677ff' },
  { key: 'newCount', label: '新增', color: '#13a8a8' },
  { key: 'changedCount', label: '变更', color: '#fa8c16' },
  { key: 'cancelledCount', label: '取消', color: '#f5222d' },
  { key: 'insuredCount', label: '已参保', color: '#52c41a' },
  { key: 'eligibleCount', label: '符合资助', color: '#722ed1' },
];

const buildPeriod = (year?: number, month?: number) => {
  if (!year || !month) return undefined;
  return `${year}-${String(month).padStart(2, '0')}`;
};

const resolveUploadFile = (file?: any) => file?.originFileObj || file;

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

const EnrollLedgersPage: React.FC = () => {
  const access = useAccess();
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>({});
  const [options, setOptions] = useState<any>({});
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [importVisible, setImportVisible] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>([]);
  const [importMonth, setImportMonth] = useState(dayjs().month() + 1);
  const [importType, setImportType] = useState('attachment3');
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const selectedYear = Form.useWatch('year', form);
  const currentImportMeta = importMetas[importType] || importMetas.attachment3;

  const openImportModal = (type: string) => {
    setImportType(type);
    setFileList([]);
    setImportVisible(true);
  };

  const buildParams = (page = current, size = pageSize) => {
    const values = form.getFieldsValue();
    return {
      ...values,
      page,
      page_size: size,
    };
  };

  const fetchData = async (page = current, size = pageSize) => {
    setLoading(true);
    try {
      const params = buildParams(page, size);
      const [listRes, statRes] = await Promise.all([
        getEnrollLedgers(params),
        getEnrollLedgerStatistics(params),
      ]);
      if (listRes.code === 0) {
        setData(listRes.data?.list || []);
        setTotal(listRes.data?.total || 0);
        setCurrent(listRes.data?.page || page);
        setPageSize(listRes.data?.page_size || size);
      }
      if (statRes.code === 0) {
        setStats(statRes.data || {});
      }
    } catch (error) {
      message.error('获取参保台账失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const values = form.getFieldsValue();
      const res = await getEnrollLedgerOptions({ year: values.year || dayjs().year() });
      if (res.code === 0) setOptions(res.data || {});
    } catch (error) {
      // 静默处理，筛选项不影响主列表
    }
  };

  const reloadAfterPeriodChange = (values: Record<string, any>) => {
    form.setFieldsValue(values);
    if (values.year) {
      fetchOptions();
    }
    fetchData(1, pageSize);
  };

  useEffect(() => {
    form.setFieldsValue({ year: dayjs().year() });
    fetchOptions();
    fetchData(1, pageSize);
  }, []);

  const submitImport = async () => {
    const uploadFile = resolveUploadFile(fileList[0]);
    if (!uploadFile) {
      message.warning('请选择导入文件');
      return;
    }
    if (!selectedYear || !importMonth) {
      message.warning('请先选择年份和导入月份');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile as File);
      formData.append('year', String(selectedYear));
      formData.append('period', buildPeriod(selectedYear, importMonth) || '');
      const res = await currentImportMeta.endpoint(formData);
      if (res.code !== 0) throw new Error(res.message || '导入失败');
      message.success('导入任务已提交，请在任务中心查看进度');
      setImportVisible(false);
      setFileList([]);
    } catch (error: any) {
      message.error(error.message || '导入失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async (type: string) => {
    try {
      const res = await exportEnrollLedgers({ ...buildParams(1, pageSize), type });
      if (res.code !== 0) throw new Error(res.message || '导出失败');
      message.success('导出任务已提交，请在任务中心查看');
    } catch (error: any) {
      message.error(error.message || '导出失败');
    }
  };

  const openEdit = (record: any) => {
    setEditingRecord(record);
    editForm.setFieldsValue({
      payment_time: record.payment_time,
      uninsured_reason: record.uninsured_reason,
      insurance_place_remark: record.insurance_place_remark,
      death_remark: record.death_remark,
      manual_remark: record.manual_remark,
    });
    setEditVisible(true);
  };

  const submitEdit = async () => {
    if (!editingRecord?.id) return;
    setEditSubmitting(true);
    try {
      const values = editForm.getFieldsValue();
      const res = await updateEnrollLedger(editingRecord.id, values);
      if (res.code !== 0) throw new Error(res.message || '保存失败');
      message.success('保存成功');
      setEditVisible(false);
      setEditingRecord(null);
      fetchData(current, pageSize);
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (record: any) => {
    try {
      const res = await deleteEnrollLedger(record.id);
      if (res.code !== 0) throw new Error(res.message || '删除失败');
      message.success('删除成功');
      fetchData(current, pageSize);
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const columns = useMemo(() => [
    { title: '姓名', dataIndex: 'name', key: 'name', width: 100, fixed: 'left' as const },
    { title: '身份证号码', dataIndex: 'id_card', key: 'id_card', width: 190, fixed: 'left' as const },
    { title: '镇街', dataIndex: 'town_name', key: 'town_name', width: 120, fixed: 'left' as const },
    { title: '村居', dataIndex: 'village_name', key: 'village_name', width: 230, render: (v: string) => <EllipsisText value={v} maxWidth={230} /> },
    { title: '医疗救助身份', dataIndex: 'medical_identity', key: 'medical_identity', width: 230, render: (v: string) => <EllipsisText value={v} maxWidth={230} /> },
    { title: '资助参保身份', dataIndex: 'subsidy_identity', key: 'subsidy_identity', width: 230, render: (v: string) => <EllipsisText value={v} maxWidth={230} /> },
    {
      title: '身份变更',
      dataIndex: 'change_status',
      key: 'change_status',
      width: 110,
      render: (value: string) => {
        const color = value === '新增' ? 'green' : value === '变更' ? 'orange' : value === '取消' ? 'red' : 'blue';
        return value ? <Tag color={color}>{value}</Tag> : '-';
      },
    },
    { title: '纳入资助时间', dataIndex: 'included_month', key: 'included_month', width: 130 },
    { title: '身份取消时间', dataIndex: 'cancel_month', key: 'cancel_month', width: 130 },
    { title: '缴费时间', dataIndex: 'payment_time', key: 'payment_time', width: 130, sorter: true },
    { title: '居民医保缴费金额', dataIndex: 'resident_payment_amount', key: 'resident_payment_amount', width: 160, sorter: true },
    { title: '资助金额', dataIndex: 'subsidy_amount', key: 'subsidy_amount', width: 120, sorter: true },
    { title: '参保类别', dataIndex: 'insurance_category', key: 'insurance_category', width: 130 },
    { title: '是否参保', dataIndex: 'is_insured', key: 'is_insured', width: 100 },
    { title: '未参保原因', dataIndex: 'uninsured_reason', key: 'uninsured_reason', width: 160 },
    { title: '是否符合资助', dataIndex: 'is_eligible_for_subsidy', key: 'is_eligible_for_subsidy', width: 130 },
    { title: '是否获得资助', dataIndex: 'is_subsidy_obtained', key: 'is_subsidy_obtained', width: 130 },
    { title: '资助方式', dataIndex: 'subsidy_method', key: 'subsidy_method', width: 130 },
    { title: '区外备注', dataIndex: 'insurance_place_remark', key: 'insurance_place_remark', width: 180 },
    { title: '死亡备注', dataIndex: 'death_remark', key: 'death_remark', width: 180 },
    { title: '人工备注', dataIndex: 'manual_remark', key: 'manual_remark', width: 180 },
    { title: '最近附件3月份', dataIndex: 'last_attachment3_period', key: 'last_attachment3_period', width: 140 },
    { title: '最近附件4月份', dataIndex: 'last_attachment4_period', key: 'last_attachment4_period', width: 140 },
    { title: '最近附件5月份', dataIndex: 'last_attachment5_period', key: 'last_attachment5_period', width: 140 },
    { title: '最近附件6月份', dataIndex: 'last_attachment6_period', key: 'last_attachment6_period', width: 140 },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size={4}>
          {access.canUpdateEnrollLedgers && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          )}
          {access.canDeleteEnrollLedgers && (
            <Popconfirm
              title="确认删除这条台账明细？"
              description="删除后不可在列表中恢复。"
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record)}
            >
              <Button danger type="link" size="small" icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ], [access.canUpdateEnrollLedgers, access.canDeleteEnrollLedgers, current, pageSize]);

  useEffect(() => {
    setVisibleColumnKeys(columns.map(item => String(item.key)));
  }, [columns]);

  const visibleColumns = columns.filter(item => visibleColumnKeys.includes(String(item.key)));
  const currentPeriod = buildPeriod(selectedYear, importMonth) || '-';
  const columnSettingContent = (
    <div style={{ width: 260, maxHeight: 360, overflowY: 'auto' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <Button size="small" onClick={() => setVisibleColumnKeys(columns.map(item => String(item.key)))}>显示全部</Button>
          <Button size="small" onClick={() => setVisibleColumnKeys(['name', 'id_card', 'town_name', 'medical_identity', 'subsidy_identity', 'change_status'])}>恢复默认</Button>
        </Space>
        {columns.map(item => {
          const key = String(item.key);
          const disabled = ['name', 'id_card', 'town_name'].includes(key);
          return (
            <Checkbox
              key={key}
              checked={visibleColumnKeys.includes(key)}
              disabled={disabled}
              onChange={event => {
                setVisibleColumnKeys(prev => event.target.checked ? [...prev, key] : prev.filter(itemKey => itemKey !== key));
              }}
            >
              {String(item.title)}
            </Checkbox>
          );
        })}
      </Space>
    </div>
  );

  return (
    <div style={{ padding: 16 }}>
      <Card size="small" style={{ ...cardStyle, marginBottom: 12 }}>
        <Form form={form} component={false}>
          <div style={filterRowStyle}>
            <Form.Item name="year" noStyle>
              <Select
                style={{ width: '100%' }}
                options={yearOptions}
                onChange={year => reloadAfterPeriodChange({ year })}
              />
            </Form.Item>
            <Form.Item name="keyword" noStyle>
              <Input allowClear placeholder="姓名/身份证/村居" />
            </Form.Item>
            <Form.Item name="town_name" noStyle>
              <Select allowClear showSearch placeholder="镇街" options={(options.town_names || []).map((v: string) => ({ label: v, value: v }))} />
            </Form.Item>
            <Form.Item name="change_status" noStyle>
              <Select allowClear placeholder="身份变更" options={(options.change_statuses || []).map((v: string) => ({ label: v, value: v }))} />
            </Form.Item>
            <div style={filterActionsStyle}>
              <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchData(1, pageSize)}>查询</Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  const { year } = form.getFieldsValue();
                  form.resetFields();
                  form.setFieldsValue({ year });
                  fetchData(1, pageSize);
                }}
              >
                重置
              </Button>
            </div>
          </div>
        </Form>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 12 }}>
        {statCards.map(item => (
          <div key={item.key} style={{ ...cardStyle, background: '#fff', padding: '14px 16px' }}>
            <div style={{ color: '#64748b', fontSize: 13 }}>{item.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <span style={{ color: item.color, fontSize: 28, fontWeight: 600, lineHeight: 1 }}>{stats[item.key] || 0}</span>
              <span style={{ color: '#94a3b8', fontSize: 12 }}>条</span>
            </div>
          </div>
        ))}
      </div>

      <Card size="small" style={{ ...cardStyle, marginTop: 12, marginBottom: 12 }}>
        <div style={toolbarStyle}>
          <div style={toolbarSideStyle}>
            {access.canImportEnrollLedgers && (
              <Dropdown
                menu={{
                  items: Object.entries(importMetas).map(([key, meta]) => ({ key, label: meta.button })),
                  onClick: ({ key }) => openImportModal(String(key)),
                }}
                trigger={['click']}
              >
                <Button type="primary" icon={<CloudUploadOutlined />}>导入</Button>
              </Dropdown>
            )}
          </div>
          <div style={toolbarSideStyle}>
            <Popover trigger="click" placement="bottomRight" title="列显示" content={columnSettingContent}>
              <Button icon={<SettingOutlined />}>列设置</Button>
            </Popover>
            {access.canExportEnrollLedgers && (
              <Dropdown
                menu={{
                  items: [
                    { key: 'attachment1', label: '导出 资助参保对象-汇总名单' },
                    { key: 'attachment2', label: '导出 资助参保对象-对比结果' },
                    { key: 'attachment3', label: '导出 特殊对象资助参保台账' },
                  ],
                  onClick: ({ key }) => handleExport(String(key)),
                }}
                trigger={['click']}
              >
                <Button icon={<DownloadOutlined />}>导出</Button>
              </Dropdown>
            )}
          </div>
        </div>
      </Card>

      <Card style={cardStyle} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          loading={loading}
          columns={visibleColumns}
          dataSource={data}
          scroll={{ x: 2730 }}
          pagination={{
            current,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: value => `共 ${value} 条`,
          }}
          onChange={(pagination, _filters, sorter: any) => {
            const values: any = {};
            if (sorter?.field && sorter?.order) {
              values.sort_field = sorter.field;
              values.sort_order = sorter.order;
            }
            form.setFieldsValue(values);
            fetchData(pagination.current || 1, pagination.pageSize || pageSize);
          }}
        />
      </Card>

      <Modal
        title={currentImportMeta.title}
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
          <Button key="upload" type="primary" icon={<UploadOutlined />} loading={submitting} disabled={!fileList.length} onClick={submitImport}>确认导入</Button>,
        ]}
      >
        <Alert
          message="导入说明"
          description={
            <Space direction="vertical" size={8}>
              <span>1. 当前导入月份：{currentPeriod}</span>
              <span>2. 仅支持 .csv 格式，编码自动识别 UTF-8/GBK</span>
              <span>3. {currentImportMeta.rule}</span>
              <Button
                type="link"
                icon={<DownloadOutlined />}
                onClick={() => downloadCsvTemplate(`${currentImportMeta.title.replace(/[《》]/g, '_')}_导入模板.csv`, currentImportMeta.template)}
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
        <div style={{ marginBottom: 16 }}>
          <span style={{ marginRight: 8 }}>导入月份</span>
          <Select
            value={importMonth}
            style={{ width: 120 }}
            options={monthOptions}
            onChange={setImportMonth}
          />
        </div>
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
        title={editingRecord ? `编辑参保台账：${editingRecord.name || ''}` : '编辑参保台账'}
        open={editVisible}
        onCancel={() => {
          setEditVisible(false);
          setEditingRecord(null);
        }}
        width={560}
        footer={[
          <Button key="cancel" onClick={() => {
            setEditVisible(false);
            setEditingRecord(null);
          }}>取消</Button>,
          <Button key="save" type="primary" loading={editSubmitting} onClick={submitEdit}>保存</Button>,
        ]}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item label="缴费时间" name="payment_time">
            <Input allowClear placeholder="如 2026-01 或 2026-01-15" />
          </Form.Item>
          <Form.Item label="未参保原因" name="uninsured_reason">
            <Input.TextArea allowClear rows={2} />
          </Form.Item>
          <Form.Item label="区外备注" name="insurance_place_remark">
            <Input.TextArea allowClear rows={2} />
          </Form.Item>
          <Form.Item label="死亡备注" name="death_remark">
            <Input allowClear />
          </Form.Item>
          <Form.Item label="人工备注" name="manual_remark">
            <Input.TextArea allowClear rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EnrollLedgersPage;
