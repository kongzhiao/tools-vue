import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Drawer,
  Dropdown,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Popover,
  Radio,
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
  MoreOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  UploadOutlined,
  CopyOutlined,
  HistoryOutlined,
  RollbackOutlined,
  SendOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAccess, useModel } from '@umijs/max';
import {
  exportEnrollLedgers,
  dispatchEnrollLedgers,
  getEnrollLedgerOptions,
  getEnrollLedgerStatistics,
  getEnrollLedgers,
  getEnrollReviewBatchItems,
  getEnrollReviewBatches,
  confirmEnrollPaymentCheck,
  deleteEnrollLedger,
  importEnrollAttachment3,
  importEnrollAttachment3Return,
  importEnrollAttachment4,
  importEnrollAttachment5,
  importEnrollAttachment6,
  recallEnrollLedgers,
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

const moreFilterRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 8,
  alignItems: 'center',
  marginTop: 8,
};

const yearOptions = [0, 1, 2].map(i => ({ label: `${dayjs().year() - i}`, value: dayjs().year() - i }));
const monthOptions = Array.from({ length: 12 }, (_, index) => {
  const value = index + 1;
  return { label: `${String(value).padStart(2, '0')}月`, value };
});
const yesNoOptions = ['是', '否'].map(value => ({ label: value, value }));
const yesNoPendingOptions = ['是', '否', '待核实'].map(value => ({ label: value, value }));
const toSelectOptions = (values?: string[]) => (values || []).map(value => ({ label: value, value }));
const unmatchedInsuranceCategory = '未匹配';
const reviewStatusColorMap: Record<string, string> = {
  未下放: 'default',
  待填报: 'processing',
  已填报: 'success',
  已收回: 'default',
  已下放: 'processing',
  部分收回: 'warning',
};
const renderReviewStatus = (value?: string) => {
  if (!value) return '-';
  return <Tag color={reviewStatusColorMap[value] || 'default'}>{value}</Tag>;
};
const renderPaymentCheckStatus = (value?: string) => {
  if (!value) return '-';
  const color = value === '待核查' ? 'warning' : value === '已核查' ? 'processing' : value === '一致' ? 'success' : 'default';
  return <Tag color={color}>{value}</Tag>;
};
const shortBatchNo = (value?: string) => value ? `${value.slice(0, 10)}...${value.slice(-4)}` : '-';
const renderBatchNo = (value?: string, maxWidth: number | string = '100%') => {
  if (!value) return <>-</>;
  return (
    <Tooltip title={value}>
      <Typography.Text ellipsis style={{ display: 'inline-block', maxWidth }}>
        {value}
      </Typography.Text>
    </Tooltip>
  );
};
const dispatchModeLabelMap: Record<string, string> = {
  town: '按镇街',
  manual: '勾选记录',
  filter: '按筛选',
};
const exportTypeLabelMap: Record<string, string> = {
  attachment1: '资助参保对象-汇总名单',
  attachment2: '资助参保对象-对比结果',
  attachment3: '特殊对象资助参保台账',
};

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

const adminStatCards = [
  { key: 'total', label: '当前记录', color: '#1677ff' },
  { key: 'newCount', label: '新增', color: '#13a8a8' },
  { key: 'changedCount', label: '变更', color: '#fa8c16' },
  { key: 'cancelledCount', label: '取消', color: '#f5222d' },
  { key: 'insuredCount', label: '已参保', color: '#52c41a' },
  { key: 'eligibleCount', label: '符合资助', color: '#722ed1' },
  { key: 'reviewPendingCount', label: '待填报', color: '#faad14' },
  { key: 'paymentPendingCount', label: '待核查', color: '#fa541c' },
];

const townStatCards = [
  { key: 'total', label: '当前下放', color: '#1677ff' },
  { key: 'reviewPendingCount', label: '待填报', color: '#faad14' },
  { key: 'reviewFilledCount', label: '已填报', color: '#52c41a' },
  { key: 'paymentPendingCount', label: '待核查', color: '#fa541c' },
  { key: 'insuredCount', label: '已参保', color: '#13a8a8' },
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
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const isTownUser = Number(currentUser?.town_id || 0) > 0;
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [dispatchForm] = Form.useForm();
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
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [dispatchVisible, setDispatchVisible] = useState(false);
  const [dispatchSubmitting, setDispatchSubmitting] = useState(false);
  const [batchVisible, setBatchVisible] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchData, setBatchData] = useState<any[]>([]);
  const [batchCurrent, setBatchCurrent] = useState(1);
  const [batchPageSize, setBatchPageSize] = useState(10);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchItemsLoading, setBatchItemsLoading] = useState(false);
  const [batchItems, setBatchItems] = useState<any[]>([]);
  const [batchItemsCurrent, setBatchItemsCurrent] = useState(1);
  const [batchItemsPageSize, setBatchItemsPageSize] = useState(10);
  const [batchItemsTotal, setBatchItemsTotal] = useState(0);
  const [activeBatch, setActiveBatch] = useState<any>(null);
  const selectedYear = Form.useWatch('year', form);
  const editTownIsInsured = Form.useWatch('town_is_insured', editForm);
  const currentImportMeta = importMetas[importType] || importMetas.attachment3;
  const currentStatCards = isTownUser ? townStatCards : adminStatCards;
  const canEditLedgerRecord = (record: any) => access.canUpdateEnrollLedgers && (!isTownUser || ['待填报', '已填报'].includes(record.review_status));
  const canConfirmPaymentCheck = (record: any) => access.canUpdateEnrollLedgers && !isTownUser && record.payment_amount_check_status === '待核查';

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
        setSelectedRowKeys([]);
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
      window.dispatchEvent(new CustomEvent('openTaskCenter'));
      setImportVisible(false);
      setFileList([]);
    } catch (error: any) {
      message.error(error.message || '导入失败');
    } finally {
      setSubmitting(false);
    }
  };

  const submitExport = async (type: string) => {
    try {
      const res = await exportEnrollLedgers({ ...buildParams(1, pageSize), type });
      if (res.code !== 0) throw new Error(res.message || '导出失败');
      message.success('导出任务已提交，请在任务中心查看');
      window.dispatchEvent(new CustomEvent('openTaskCenter'));
    } catch (error: any) {
      message.error(error.message || '导出失败');
    }
  };

  const handleExport = (type: string) => {
    Modal.confirm({
      title: '确认提交导出？',
      content: `将按当前筛选条件导出《${exportTypeLabelMap[type] || '参保台账'}》。`,
      okText: '确认导出',
      cancelText: '取消',
      onOk: () => submitExport(type),
    });
  };

  const openEdit = (record: any) => {
    setEditingRecord(record);
    editForm.resetFields();
    editForm.setFieldsValue({
      town_is_insured: record.town_is_insured,
      town_uninsured_reason: record.town_uninsured_reason,
      town_resident_payment_amount: record.town_resident_payment_amount,
      town_death_time: record.town_death_time ? dayjs(record.town_death_time) : null,
      town_remark: record.town_remark,
      manual_remark: record.manual_remark,
    });
    setEditVisible(true);
  };

  const submitEdit = async () => {
    if (!editingRecord?.id) return;
    setEditSubmitting(true);
    try {
      const allValues = editForm.getFieldsValue();
      const fillFields = ['town_is_insured', 'town_uninsured_reason', 'town_resident_payment_amount', 'town_death_time', 'town_remark'];
      const payload: Record<string, any> = {};

      fillFields.forEach(field => {
        if (editForm.isFieldTouched(field)) {
          payload[field] = allValues[field];
        }
      });
      if (editForm.isFieldTouched('manual_remark')) {
        payload.manual_remark = allValues.manual_remark;
      }
      if (Object.prototype.hasOwnProperty.call(payload, 'town_death_time')) {
        payload.town_death_time = allValues.town_death_time ? dayjs(allValues.town_death_time).format('YYYY-MM-DD') : null;
      }
      if (editForm.isFieldTouched('town_is_insured')) {
        if (allValues.town_is_insured === '是') {
          payload.town_uninsured_reason = null;
        }
        if (allValues.town_is_insured === '否') {
          payload.town_resident_payment_amount = null;
        }
      }

      if (Object.keys(payload).length === 0) {
        message.warning('没有修改内容');
        return;
      }

      const res = await updateEnrollLedger(editingRecord.id, payload);
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

  const confirmPaymentCheck = (record: any) => {
    Modal.confirm({
      title: '确认标记为已核查？',
      content: (
        <div>
          <div>姓名：{record.name || '-'}</div>
          <div>身份证号：{record.id_card || '-'}</div>
          <div>镇街填报缴费金额：{record.town_resident_payment_amount ?? '-'}</div>
          <div>附件4缴费金额：{record.resident_payment_amount ?? '-'}</div>
          <div>核查说明：{record.payment_amount_check_remark || '-'}</div>
        </div>
      ),
      okText: '标记已核查',
      cancelText: '取消',
      onOk: async () => {
        const res = await confirmEnrollPaymentCheck(record.id);
        if (res.code !== 0) throw new Error(res.message || res.msg || '标记失败');
        message.success('已标记为已核查');
        fetchData(current, pageSize);
      },
    });
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

  const buildDispatchFilters = () => {
    const values = buildParams(1, pageSize);
    delete values.page;
    delete values.page_size;
    delete values.sort_field;
    delete values.sort_order;
    return values;
  };

  const openDispatchModal = () => {
    dispatchForm.resetFields();
    dispatchForm.setFieldsValue({
      town_names: [],
    });
    setDispatchVisible(true);
  };

  const doDispatch = async (payload: any) => {
    setDispatchSubmitting(true);
    try {
      const res = await dispatchEnrollLedgers({
        year: selectedYear || dayjs().year(),
        ...payload,
      });
      if (res.code !== 0) throw new Error(res.message || res.msg || '下放失败');
      message.success(`下放成功，共 ${res.data?.total_count || 0} 条`);
      setDispatchVisible(false);
      fetchData(current, pageSize);
    } catch (error: any) {
      message.error(error.message || '下放失败');
    } finally {
      setDispatchSubmitting(false);
    }
  };

  const submitDispatch = async () => {
    try {
      const values = await dispatchForm.validateFields();
      if (!Array.isArray(values.town_names) || values.town_names.length === 0) {
        message.warning('请选择要下放的镇街');
        return;
      }
      Modal.confirm({
        title: '确认按镇街下放？',
        content: `将向 ${values.town_names.length} 个镇街下放当前筛选范围内的记录：${values.town_names.join('、')}`,
        okText: '确认下放',
        cancelText: '取消',
        onOk: () => doDispatch({
          town_names: values.town_names,
          filters: buildDispatchFilters(),
          remark: values.remark,
        }),
      });
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error.message || '下放失败');
    }
  };

  const dispatchSelectedRows = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先勾选要下放的记录');
      return;
    }
    Modal.confirm({
      title: '确认下放勾选记录？',
      content: `将下放已勾选的 ${selectedRowKeys.length} 条参保台账记录。`,
      okText: '确认下放',
      cancelText: '取消',
      onOk: () => doDispatch({ ids: selectedRowKeys }),
    });
  };

  const dispatchCurrentFilters = () => {
    Modal.confirm({
      title: '确认下放当前筛选？',
      content: `将按当前筛选条件下放匹配到的记录，当前列表匹配约 ${total} 条。`,
      okText: '确认下放',
      cancelText: '取消',
      onOk: () => doDispatch({ filters: buildDispatchFilters() }),
    });
  };

  const recallByIds = async (ids: React.Key[]) => {
    if (ids.length === 0) {
      message.warning('请先勾选要收回的记录');
      return;
    }
    try {
      const res = await recallEnrollLedgers({ ids });
      if (res.code !== 0) throw new Error(res.message || res.msg || '收回失败');
      message.success(`收回成功，共 ${res.data?.affected_rows || 0} 条`);
      fetchData(current, pageSize);
    } catch (error: any) {
      message.error(error.message || '收回失败');
    }
  };

  const recallBatch = async (batchId: number) => {
    try {
      const res = await recallEnrollLedgers({ batch_id: batchId });
      if (res.code !== 0) throw new Error(res.message || res.msg || '收回失败');
      message.success(`收回成功，共 ${res.data?.affected_rows || 0} 条`);
      fetchData(current, pageSize);
      fetchBatches(batchCurrent, batchPageSize);
      if (activeBatch?.id === batchId) {
        setActiveBatch({ ...activeBatch, status: '已收回' });
        fetchBatchItems(batchId, batchItemsCurrent, batchItemsPageSize);
      }
    } catch (error: any) {
      message.error(error.message || '收回失败');
    }
  };

  const fetchBatches = async (page = batchCurrent, size = batchPageSize) => {
    setBatchLoading(true);
    try {
      const res = await getEnrollReviewBatches({ year: selectedYear || dayjs().year(), page, page_size: size });
      if (res.code !== 0) throw new Error(res.message || '获取下放批次失败');
      setBatchData(res.data?.list || []);
      setBatchTotal(res.data?.total || 0);
      setBatchCurrent(res.data?.page || page);
      setBatchPageSize(res.data?.page_size || size);
    } catch (error: any) {
      message.error(error.message || '获取下放批次失败');
    } finally {
      setBatchLoading(false);
    }
  };

  const openBatchModal = () => {
    setBatchVisible(true);
    setActiveBatch(null);
    setBatchItems([]);
    setBatchItemsTotal(0);
    fetchBatches(1, batchPageSize);
  };

  const fetchBatchItems = async (batchId: number, page = batchItemsCurrent, size = batchItemsPageSize) => {
    setBatchItemsLoading(true);
    try {
      const res = await getEnrollReviewBatchItems(batchId, { page, page_size: size });
      if (res.code !== 0) throw new Error(res.message || '获取下放明细失败');
      setBatchItems(res.data?.list || []);
      setBatchItemsTotal(res.data?.total || 0);
      setBatchItemsCurrent(res.data?.page || page);
      setBatchItemsPageSize(res.data?.page_size || size);
    } catch (error: any) {
      message.error(error.message || '获取下放明细失败');
    } finally {
      setBatchItemsLoading(false);
    }
  };

  const openBatchItems = (batch: any) => {
    setActiveBatch(batch);
    fetchBatchItems(batch.id, 1, batchItemsPageSize);
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
    { title: '镇街填报缴费金额', dataIndex: 'town_resident_payment_amount', key: 'town_resident_payment_amount', width: 160 },
    { title: '资助金额', dataIndex: 'subsidy_amount', key: 'subsidy_amount', width: 120, sorter: true },
    {
      title: '参保类别',
      dataIndex: 'insurance_category',
      key: 'insurance_category',
      width: 130,
      render: (value: string) => value ? value : <Tag color="default">{unmatchedInsuranceCategory}</Tag>,
    },
    { title: '是否参保', dataIndex: 'is_insured', key: 'is_insured', width: 100 },
    { title: '未参保原因', dataIndex: 'uninsured_reason', key: 'uninsured_reason', width: 160 },
    { title: '镇街填报是否参保', dataIndex: 'town_is_insured', key: 'town_is_insured', width: 150 },
    { title: '镇街填报未参保原因', dataIndex: 'town_uninsured_reason', key: 'town_uninsured_reason', width: 180 },
    { title: '镇街填报死亡时间', dataIndex: 'town_death_time', key: 'town_death_time', width: 160 },
    { title: '缴费核查状态', dataIndex: 'payment_amount_check_status', key: 'payment_amount_check_status', width: 130, render: renderPaymentCheckStatus },
    { title: '是否符合资助', dataIndex: 'is_eligible_for_subsidy', key: 'is_eligible_for_subsidy', width: 130 },
    { title: '是否获得资助', dataIndex: 'is_subsidy_obtained', key: 'is_subsidy_obtained', width: 130 },
    { title: '资助方式', dataIndex: 'subsidy_method', key: 'subsidy_method', width: 130 },
    { title: '区外备注', dataIndex: 'insurance_place_remark', key: 'insurance_place_remark', width: 180 },
    { title: '死亡备注', dataIndex: 'death_remark', key: 'death_remark', width: 180 },
    { title: '镇街备注', dataIndex: 'town_remark', key: 'town_remark', width: 180, render: (v: string) => <EllipsisText value={v} maxWidth={162} /> },
    { title: '管理员备注', dataIndex: 'manual_remark', key: 'manual_remark', width: 180, render: (v: string) => <EllipsisText value={v} maxWidth={162} /> },
    { title: '下放状态', dataIndex: 'review_status', key: 'review_status', width: 110, render: renderReviewStatus },
    { title: '镇街填报状态', dataIndex: 'town_submit_status', key: 'town_submit_status', width: 130 },
    { title: '最近附件3月份', dataIndex: 'last_attachment3_period', key: 'last_attachment3_period', width: 140 },
    { title: '最近附件4月份', dataIndex: 'last_attachment4_period', key: 'last_attachment4_period', width: 140 },
    { title: '最近附件5月份', dataIndex: 'last_attachment5_period', key: 'last_attachment5_period', width: 140 },
    { title: '最近附件6月份', dataIndex: 'last_attachment6_period', key: 'last_attachment6_period', width: 140 },
    {
      title: '操作',
      key: 'action',
      width: 230,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size={4}>
          {canEditLedgerRecord(record) && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          )}
          {canConfirmPaymentCheck(record) && (
            <Button type="link" size="small" onClick={() => confirmPaymentCheck(record)}>标记已核查</Button>
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
  ], [access.canUpdateEnrollLedgers, access.canDeleteEnrollLedgers, current, pageSize, isTownUser]);

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

  const batchColumns = [
    {
      title: '批次号',
      dataIndex: 'batch_no',
      key: 'batch_no',
      width: 180,
      fixed: 'left' as const,
      render: (value: string) => renderBatchNo(value, 164),
    },
    {
      title: '镇街',
      dataIndex: 'town_names',
      key: 'town_names',
      width: 220,
      render: (value: string[]) => Array.isArray(value) && value.length ? <EllipsisText value={value.join('、')} maxWidth={220} /> : '-',
    },
    { title: '下放方式', dataIndex: 'dispatch_mode', key: 'dispatch_mode', width: 110, render: (value: string) => dispatchModeLabelMap[value] || value || '-' },
    { title: '记录数', dataIndex: 'total_count', key: 'total_count', width: 90 },
    { title: '有效', dataIndex: 'active_count', key: 'active_count', width: 80 },
    { title: '待填报', dataIndex: 'pending_count', key: 'pending_count', width: 90 },
    { title: '已填报', dataIndex: 'filled_count', key: 'filled_count', width: 90 },
    { title: '已收回', dataIndex: 'recalled_count', key: 'recalled_count', width: 90 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: renderReviewStatus },
    { title: '下放时间', dataIndex: 'dispatched_at', key: 'dispatched_at', width: 170 },
    {
      title: '操作',
      key: 'action',
      width: 90,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size={4} onClick={event => event.stopPropagation()}>
          {access.canRecallEnrollLedgers && record.status !== '已收回' ? (
            <Popconfirm
              title={`确认收回批次 ${shortBatchNo(record.batch_no)}？`}
              description={`将收回该批次的 ${record.total_count || 0} 条记录镇街填报权限。`}
              okText="收回"
              cancelText="取消"
              onConfirm={() => recallBatch(record.id)}
            >
              <Button type="link" size="small" danger>收回</Button>
            </Popconfirm>
          ) : (
            <Typography.Text type="secondary">-</Typography.Text>
          )}
        </Space>
      ),
    },
  ];

  const batchItemColumns = [
    { title: '姓名', key: 'name', width: 100, fixed: 'left' as const, render: (_: any, record: any) => record.ledger?.name || '-' },
    { title: '身份证号码', key: 'id_card', width: 190, render: (_: any, record: any) => record.ledger?.id_card || '-' },
    { title: '镇街', dataIndex: 'town_name', key: 'town_name', width: 120 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: renderReviewStatus },
    { title: '是否参保', key: 'town_is_insured', width: 110, render: (_: any, record: any) => record.ledger?.town_is_insured || '-' },
    { title: '未参保原因', key: 'town_uninsured_reason', width: 150, render: (_: any, record: any) => record.ledger?.town_uninsured_reason || '-' },
    { title: '缴费金额', key: 'town_resident_payment_amount', width: 120, render: (_: any, record: any) => record.ledger?.town_resident_payment_amount ?? '-' },
    { title: '死亡时间', key: 'town_death_time', width: 130, render: (_: any, record: any) => record.ledger?.town_death_time || '-' },
    { title: '填报时间', dataIndex: 'submitted_at', key: 'submitted_at', width: 170 },
    { title: '收回时间', dataIndex: 'recalled_at', key: 'recalled_at', width: 170 },
  ];

  const batchMenuItems = [
    ...(access.canDispatchEnrollLedgers ? [
      { key: 'dispatch_town', label: '按镇街下放', icon: <SendOutlined /> },
      { key: 'dispatch_selected', label: '下放勾选记录', icon: <SendOutlined />, disabled: selectedRowKeys.length === 0 },
      { key: 'dispatch_filter', label: '下放当前筛选', icon: <SearchOutlined /> },
    ] : []),
    ...(access.canDispatchEnrollLedgers && access.canRecallEnrollLedgers ? [{ type: 'divider' as const }] : []),
    ...(access.canRecallEnrollLedgers ? [
      { key: 'recall_selected', label: '收回勾选记录', icon: <RollbackOutlined />, danger: true, disabled: selectedRowKeys.length === 0 },
    ] : []),
  ];

  return (
    <div style={{ padding: 16 }}>
      <Card size="small" style={{ ...cardStyle, marginBottom: 12 }}>
        <Form form={form} component={false}>
          <div
            style={{
              ...filterRowStyle,
              gridTemplateColumns: isTownUser
                ? '110px minmax(190px, 260px) minmax(130px, 160px) auto'
                : filterRowStyle.gridTemplateColumns,
            }}
          >
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
            {!isTownUser && (
              <Form.Item name="town_name" noStyle>
                <Select allowClear showSearch placeholder="镇街" options={toSelectOptions(options.town_names)} />
              </Form.Item>
            )}
            <Form.Item name="change_status" noStyle>
              <Select allowClear placeholder="身份变更" options={toSelectOptions(options.change_statuses)} />
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
              <Button icon={<MoreOutlined />} onClick={() => setFilterExpanded(value => !value)}>
                {filterExpanded ? '收起筛选' : '更多筛选'}
              </Button>
            </div>
          </div>
          {filterExpanded && (
            <div style={moreFilterRowStyle}>
              <Form.Item name="medical_identity" noStyle>
                <Select allowClear showSearch placeholder="医疗救助身份" options={toSelectOptions(options.medical_identities)} />
              </Form.Item>
              <Form.Item name="subsidy_identity" noStyle>
                <Select allowClear showSearch placeholder="资助参保身份" options={toSelectOptions(options.subsidy_identities)} />
              </Form.Item>
              <Form.Item name="insurance_category" noStyle>
                <Select allowClear showSearch placeholder="参保类别" options={toSelectOptions(options.insurance_categories)} />
              </Form.Item>
              <Form.Item name="is_insured" noStyle>
                <Select allowClear placeholder="是否参保" options={yesNoOptions} />
              </Form.Item>
              <Form.Item name="is_eligible_for_subsidy" noStyle>
                <Select allowClear placeholder="是否符合资助" options={yesNoPendingOptions} />
              </Form.Item>
              <Form.Item name="is_subsidy_obtained" noStyle>
                <Select allowClear placeholder="是否获得资助" options={yesNoPendingOptions} />
              </Form.Item>
              <Form.Item name="subsidy_method" noStyle>
                <Select allowClear showSearch placeholder="资助方式" options={toSelectOptions(options.subsidy_methods)} />
              </Form.Item>
              <Form.Item name="review_status" noStyle>
                <Select allowClear placeholder="下放状态" options={toSelectOptions(options.review_statuses)} />
              </Form.Item>
              <Form.Item name="payment_amount_check_status" noStyle>
                <Select allowClear placeholder="缴费核查状态" options={toSelectOptions(options.payment_amount_check_statuses)} />
              </Form.Item>
            </div>
          )}
        </Form>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 12, marginBottom: 12 }}>
        {currentStatCards.map(item => (
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
            {batchMenuItems.length > 0 && (
              <Dropdown
                menu={{
                  items: batchMenuItems,
                  onClick: ({ key }) => {
                    if (key === 'dispatch_town') openDispatchModal();
                    if (key === 'dispatch_selected') dispatchSelectedRows();
                    if (key === 'dispatch_filter') dispatchCurrentFilters();
                    if (key === 'recall_selected') {
                      Modal.confirm({
                        title: '确认批量收回？',
                        content: `将收回已勾选的 ${selectedRowKeys.length} 条记录的镇街填报权限。`,
                        okText: '收回',
                        cancelText: '取消',
                        onOk: () => recallByIds(selectedRowKeys),
                      });
                    }
                  },
                }}
                trigger={['click']}
              >
                <Button icon={<MoreOutlined />}>批量操作{selectedRowKeys.length > 0 ? `（${selectedRowKeys.length}）` : ''}</Button>
              </Dropdown>
            )}
          </div>
          <div style={toolbarSideStyle}>
            {access.canReadEnrollReviewBatches && (
              <Button icon={<HistoryOutlined />} onClick={openBatchModal}>下放批次</Button>
            )}
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
          rowSelection={{
            selectedRowKeys,
            onChange: keys => setSelectedRowKeys(keys),
            preserveSelectedRowKeys: false,
          }}
          scroll={{ x: 3500 }}
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
        title="批量按镇街下放"
        open={dispatchVisible}
        onCancel={() => setDispatchVisible(false)}
        onOk={submitDispatch}
        confirmLoading={dispatchSubmitting}
        width={560}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          message="下放说明"
          description="系统会自动生成下放批次。可多选镇街；镇街填报后，只要未收回仍可继续修改，收回后不可继续填报。"
          style={{ marginBottom: 16 }}
        />
        <Form form={dispatchForm} layout="vertical">
          <Form.Item name="town_names" label="下放镇街" rules={[{ required: true, message: '请选择镇街' }]}>
            <Select
              mode="multiple"
              allowClear
              showSearch
              placeholder="请选择镇街"
              options={toSelectOptions(options.town_names)}
            />
          </Form.Item>
          <Space style={{ marginBottom: 16 }}>
            <Button size="small" onClick={() => dispatchForm.setFieldsValue({ town_names: options.town_names || [] })}>全选</Button>
            <Button size="small" onClick={() => dispatchForm.setFieldsValue({ town_names: [] })}>清空</Button>
          </Space>
          <Form.Item name="remark" label="下放备注">
            <Input.TextArea rows={3} maxLength={255} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="下放批次"
        open={batchVisible}
        onClose={() => {
          setBatchVisible(false);
          setActiveBatch(null);
        }}
        width="72vw"
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 116px)', minWidth: 0 }}>
          <div style={{ flex: '0 0 auto', overflow: 'hidden', display: 'flex', flexDirection: 'column', paddingBottom: 12, borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Typography.Text strong>选择批次</Typography.Text>
            </div>
            <Table
              rowKey="id"
              loading={batchLoading}
              columns={batchColumns}
              dataSource={batchData}
              size="small"
              scroll={{ x: 1310, y: 176 }}
              rowClassName={record => record.id === activeBatch?.id ? 'ant-table-row-selected' : ''}
              onRow={record => ({
                onClick: () => openBatchItems(record),
              })}
              pagination={{
                current: batchCurrent,
                pageSize: batchPageSize,
                total: batchTotal,
                showSizeChanger: true,
                showTotal: value => `共 ${value} 条`,
                onChange: fetchBatches,
              }}
            />
          </div>
          <div style={{ minHeight: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', paddingTop: 12 }}>
            {activeBatch ? (
              <>
                <div style={{ borderLeft: '3px solid #1677ff', padding: '8px 12px', marginBottom: 10, background: '#f6fbff', flex: '0 0 auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <Space wrap size={[10, 6]} style={{ minWidth: 0, flex: 1 }}>
                      <Space size={4}>
                        <Typography.Text strong>批次</Typography.Text>
                        {renderBatchNo(activeBatch.batch_no, 220)}
                      </Space>
                      {renderReviewStatus(activeBatch.status)}
                      <Tag>{dispatchModeLabelMap[activeBatch.dispatch_mode] || activeBatch.dispatch_mode || '-'}</Tag>
                      <Typography.Text type="secondary">年份：{activeBatch.year || '-'}</Typography.Text>
                      <Typography.Text type="secondary">记录数：{activeBatch.total_count || 0}</Typography.Text>
                      <Typography.Text type="secondary">下放人：{activeBatch.created_by_name || '-'}</Typography.Text>
                      <Typography.Text type="secondary">下放时间：{activeBatch.dispatched_at || '-'}</Typography.Text>
                      <Typography.Text
                        type="secondary"
                        ellipsis={{ tooltip: Array.isArray(activeBatch.town_names) ? activeBatch.town_names.join('、') : '-' }}
                        style={{ maxWidth: 360 }}
                      >
                        镇街：{Array.isArray(activeBatch.town_names) && activeBatch.town_names.length ? activeBatch.town_names.join('、') : '-'}
                      </Typography.Text>
                    </Space>
                    {access.canRecallEnrollLedgers && activeBatch.status !== '已收回' && (
                      <Popconfirm
                        title={`确认收回批次 ${shortBatchNo(activeBatch.batch_no)}？`}
                        description={`将收回该批次的 ${activeBatch.total_count || 0} 条记录镇街填报权限。`}
                        okText="收回"
                        cancelText="取消"
                        onConfirm={() => recallBatch(activeBatch.id)}
                      >
                        <Button danger icon={<RollbackOutlined />}>收回批次</Button>
                      </Popconfirm>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flex: '0 0 auto' }}>
                  <Typography.Text strong>批次明细</Typography.Text>
                </div>
                <Table
                  rowKey="id"
                  loading={batchItemsLoading}
                  columns={batchItemColumns}
                  dataSource={batchItems}
                  size="small"
                  scroll={{ x: 1530, y: 'calc(100vh - 548px)' }}
                  pagination={{
                    current: batchItemsCurrent,
                    pageSize: batchItemsPageSize,
                    total: batchItemsTotal,
                    showSizeChanger: true,
                    showTotal: value => `共 ${value} 条`,
                    onChange: (page, size) => activeBatch?.id && fetchBatchItems(activeBatch.id, page, size),
                  }}
                />
              </>
            ) : (
              <div style={{ border: '1px dashed #d9d9d9', borderRadius: 6, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c8c8c' }}>
                选择上方批次查看明细
              </div>
            )}
          </div>
        </div>
      </Drawer>

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
          <Form.Item label="是否参保" name="town_is_insured">
            <Radio.Group
              options={yesNoOptions}
              optionType="button"
              onChange={value => {
                const nextValue = value?.target?.value;
                if (nextValue === '是') {
                  editForm.setFieldsValue({ town_uninsured_reason: null });
                }
                if (nextValue === '否') {
                  editForm.setFieldsValue({ town_resident_payment_amount: null });
                }
              }}
            />
          </Form.Item>
          {editTownIsInsured !== '是' && (
            <Form.Item label="未参保原因" name="town_uninsured_reason">
              <Select allowClear showSearch options={toSelectOptions(options.uninsured_reasons)} />
            </Form.Item>
          )}
          {editTownIsInsured !== '否' && (
            <Form.Item label="缴费金额" name="town_resident_payment_amount">
              <Select allowClear showSearch options={toSelectOptions(options.resident_payment_amounts)} />
            </Form.Item>
          )}
          <Form.Item label="死亡时间" name="town_death_time">
            <DatePicker
              allowClear
              inputReadOnly
              format="YYYY-MM-DD"
              placeholder="请选择死亡时间"
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="镇街备注" name="town_remark">
            <Input.TextArea allowClear rows={3} />
          </Form.Item>
          {!isTownUser && (
            <Form.Item label="管理员备注" name="manual_remark">
              <Input.TextArea allowClear rows={3} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default EnrollLedgersPage;
