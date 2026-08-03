import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Collapse,
  DatePicker,
  Input,
  message,
  Modal,
  Popover,
  Progress,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import {
  CloudUploadOutlined,
  CopyOutlined,
  DownloadOutlined,
  EditOutlined,
  HolderOutlined,
  InboxOutlined,
  MoreOutlined,
  ReloadOutlined,
  SettingOutlined,
  UploadOutlined,
  VerticalLeftOutlined,
  VerticalRightOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { useAccess, useModel } from '@umijs/max';
import dayjs from 'dayjs';
import { getTownOptions } from '@/services/town';
import {
  getDiseaseConfigs,
  executeUnrescuedWash,
  exportUnrescuedRecords,
  getUnrescuedRecords,
  getUnrescuedStatistics,
  getUnrescuedWashConfig,
  getUnrescuedWashOptions,
  getUnrescuedWashStatus,
  importUnrescuedAttachment1,
  importUnrescuedAttachment2,
  saveUnrescuedWashConfig,
} from '@/services/unrescued';
import { getTaskProgress } from '@/services/task';

const statusColors: Record<string, string> = {
  待处理: 'default',
  无救助金额: 'default',
  拟通知1: 'blue',
  拟通知2: 'orange',
};

const allStatusOptions = ['待处理', '无救助金额', '拟通知1', '拟通知2'];
const matchStatusOptions = ['未匹配', '已匹配'];

const templateMap: Record<string, string> = {
  attachment1: '导入-附件1：未救助明细模板.csv',
  attachment2: '导入-附件2：救助对象名单模板.csv',
};

const settlementPeriodStorageKey = 'unrescued.records.settlement_period';
const washTaskStoragePrefix = 'unrescued.records.wash_task';
const visibleColumnsStorageKey = 'unrescued.records.visible_columns';
const fixedColumnsStorageKey = 'unrescued.records.fixed_columns';
const columnOrderStorageKey = 'unrescued.records.column_order';
const requiredColumnKeys = ['settlement_period', 'name', 'id_card'];
const allColumnKeys = [
  'settlement_period',
  'name',
  'id_card',
  'sequence_no',
  'street_town',
  'village',
  'priority_identity',
  'medical_category',
  'disease_code',
  'disease_name',
  'cert_location',
  'hospital_name',
  'hospital_code',
  'in_out_city',
  'admission_date',
  'discharge_date',
  'settlement_time',
  'total_fee',
  'policy_fee',
  'pool_fund_pay',
  'large_amount_pay',
  'serious_illness_pay',
  'used_outpatient_rescue',
  'used_normal_rescue',
  'used_major_rescue',
  'used_large_fee_rescue',
  'calc_reimbursement_amount',
  'status',
  'match_status',
  'exclude_status',
  'exclude_rule_code',
  'remark',
  'created_at',
  'updated_at',
];
const defaultFixedColumnMap: Record<string, 'left' | 'right'> = {
  settlement_period: 'left',
  name: 'left',
  id_card: 'left',
};
const defaultVisibleColumnKeys = [
  'settlement_period',
  'sequence_no',
  'name',
  'id_card',
  'street_town',
  'priority_identity',
  'medical_category',
  'hospital_name',
  'calc_reimbursement_amount',
  'status',
  'match_status',
  'exclude_status',
  'exclude_rule_code',
  'remark',
];

const defaultSettlementPeriod = () => {
  if (typeof window === 'undefined') {
    return dayjs().format('YYYYMM');
  }
  let stored = '';
  try {
    stored = window.localStorage.getItem(settlementPeriodStorageKey) || '';
  } catch (error) {
    stored = '';
  }
  return /^\d{6}$/.test(stored) && dayjs(stored, 'YYYYMM').isValid()
    ? stored
    : dayjs().format('YYYYMM');
};

const washTaskStorageKey = (period: string) => `${washTaskStoragePrefix}.${period || 'default'}`;

const isSuccessResponse = (res: any) => res?.code === 0 || res?.code === 200;

const statCards = [
  { key: 'total', label: '当前记录', color: '#1677ff' },
  { key: 'matched', label: '已匹配', color: '#13a8a8' },
  { key: 'unmatched', label: '未匹配', color: '#faad14' },
  { key: 'toNotice1', label: '拟通知1', color: '#1677ff' },
  { key: 'toNotice2', label: '拟通知2', color: '#fa8c16' },
  { key: 'excluded', label: '已剔除', color: '#f5222d' },
  { key: 'exportCount', label: '可导出', color: '#52c41a' },
];

const cardStyle: React.CSSProperties = {
  borderRadius: 6,
  border: '1px solid #edf0f5',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
};

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
};

const toolbarSideStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};

const toolbarDividerStyle: React.CSSProperties = {
  width: 1,
  height: 22,
  background: '#edf0f5',
};

const filterRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '200px minmax(280px, 1fr) minmax(220px, 1fr) minmax(260px, 1fr) max-content',
  gap: 8,
  alignItems: 'center',
};

const townFilterRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '200px minmax(260px, 1fr) minmax(220px, 1fr) minmax(220px, 1fr) max-content',
  gap: 8,
  alignItems: 'center',
};

const moreFilterRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 8,
  alignItems: 'center',
  marginTop: 8,
};

const filterActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  justifyContent: 'flex-end',
  whiteSpace: 'nowrap',
  minWidth: 'max-content',
};

const compactTagSelectProps = {
  className: 'unrescued-compact-tag-select',
  maxTagCount: 1,
  maxTagTextLength: 14,
  maxTagPlaceholder: (omittedValues: any[]) => `+${omittedValues.length}`,
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

const fixedWashRules = [
  {
    code: 'outpatient_major_disease',
    name: '门诊重大疾病匹配',
    field: 'medical_category',
    action: 'keep',
    operator: 'compound',
    medical_categories: ['门诊慢特病', '造口袋门诊'],
    disease_codes: ['M00500'],
    remark: '门诊重大疾病匹配',
    condition_text: '进入报销金额 > 300，且医疗类别和病种编码命中配置',
    enabled: true,
  },
  { code: 'medical_category_keep', name: '医疗类别', field: 'medical_category', action: 'keep', operator: 'in', values: [], remark: '门诊救助', enabled: false },
  { code: 'hospital_keyword_exclude', name: '医药机构名称', field: 'hospital_name', action: 'exclude', operator: 'contains', values: [], remark: '对象类别不符', enabled: false },
  { code: 'pool_equals_policy', name: '统筹报销金额', field: 'pool_fund_pay', action: 'exclude', operator: '=', compare_field: 'policy_fee', remark: '无救助金额', enabled: false },
  { code: 'large_equals_policy', name: '大额报销', field: 'large_amount_pay', action: 'exclude', operator: '=', compare_field: 'policy_fee', remark: '无救助金额', enabled: false },
  { code: 'serious_equals_policy', name: '大病报销', field: 'serious_illness_pay', action: 'exclude', operator: '=', compare_field: 'policy_fee', remark: '无救助金额', enabled: false },
  { code: 'normal_rescue_limit', name: '已使用普通住院救助金额', field: 'used_normal_rescue', action: 'exclude', operator: '=', value: '6000.00', remark: '无救助额度', enabled: false },
  { code: 'major_rescue_limit', name: '已使用重特大疾病救助金额', field: 'used_major_rescue', action: 'exclude', operator: '=', value: '100000.00', remark: '无救助额度', enabled: false },
  { code: 'large_fee_rescue_limit', name: '已使用大额费用住院救助', field: 'used_large_fee_rescue', action: 'exclude', operator: '=', value: '60000.00', remark: '无救助额度', enabled: false },
  { code: 'identity_exclude', name: '身份', field: 'priority_identity', action: 'exclude', operator: 'contains', values: [], remark: '对象类别不符', enabled: false },
];

const mergeWashRules = (rules: any[] = []) => {
  const map = new Map(rules.filter(item => item?.code).map(item => [item.code, item]));
  return fixedWashRules.map(rule => ({ ...rule, ...(map.get(rule.code) || {}) }));
};

const UnrescuedRecords: React.FC = () => {
  const access = useAccess();
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortState, setSortState] = useState<any>({});
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(() => {
    if (typeof window === 'undefined') {
      return defaultVisibleColumnKeys;
    }
    try {
      const stored = JSON.parse(window.localStorage.getItem(visibleColumnsStorageKey) || '[]');
      return Array.isArray(stored) && stored.length > 0
        ? Array.from(new Set([...stored.map(String), ...requiredColumnKeys]))
        : defaultVisibleColumnKeys;
    } catch (error) {
      return defaultVisibleColumnKeys;
    }
  });
  const [fixedColumnMap, setFixedColumnMap] = useState<Record<string, 'left' | 'right'>>(() => {
    if (typeof window === 'undefined') {
      return defaultFixedColumnMap;
    }
    try {
      const storedText = window.localStorage.getItem(fixedColumnsStorageKey);
      if (!storedText) {
        return defaultFixedColumnMap;
      }
      const stored = JSON.parse(storedText);
      if (!stored || typeof stored !== 'object') {
        return defaultFixedColumnMap;
      }
      return Object.entries(stored).reduce((map, [key, value]) => {
        if (value === 'left' || value === 'right') {
          map[key] = value;
        }
        return map;
      }, {} as Record<string, 'left' | 'right'>);
    } catch (error) {
      return defaultFixedColumnMap;
    }
  });
  const [columnOrderKeys, setColumnOrderKeys] = useState<string[]>(() => {
    if (typeof window === 'undefined') {
      return allColumnKeys;
    }
    try {
      const stored = JSON.parse(window.localStorage.getItem(columnOrderStorageKey) || '[]');
      if (!Array.isArray(stored) || stored.length === 0) {
        return allColumnKeys;
      }
      return [
        ...stored.map(String).filter(key => allColumnKeys.includes(key)),
        ...allColumnKeys.filter(key => !stored.includes(key)),
      ];
    } catch (error) {
      return allColumnKeys;
    }
  });
  const [draggedColumnKey, setDraggedColumnKey] = useState<string>('');
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>({});
  const [towns, setTowns] = useState<any[]>([]);
  const [washRules, setWashRules] = useState<any[]>([]);
  const [savedWashRules, setSavedWashRules] = useState<any[]>([]);
  const [washEditing, setWashEditing] = useState(false);
  const [washOptions, setWashOptions] = useState<any>({ medical_categories: [], identities: [] });
  const [diseaseOptions, setDiseaseOptions] = useState<any[]>([]);
  const [washTask, setWashTask] = useState<any>(null);
  const [importVisible, setImportVisible] = useState(false);
  const [importType, setImportType] = useState<'attachment1' | 'attachment2'>('attachment1');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [filters, setFilters] = useState<any>({
    settlement_period: defaultSettlementPeriod(),
    keyword: '',
  });

  const isTownUser = Number(currentUser?.town_id || 0) > 0;
  const statusOptions = allStatusOptions;
  const townNameById = useMemo(() => {
    const map = new Map<number, string>();
    towns.forEach((item: any) => map.set(Number(item.id), item.name));
    if (isTownUser && currentUser?.town_id && currentUser?.town_name) {
      map.set(Number(currentUser.town_id), currentUser.town_name);
    }
    return map;
  }, [towns, isTownUser, currentUser?.town_id, currentUser?.town_name]);
  const availableTowns = useMemo(() => {
    if (!isTownUser) {
      return towns;
    }
    const matched = towns.filter((item: any) => Number(item.id) === Number(currentUser?.town_id));
    if (matched.length > 0) {
      return matched;
    }
    return currentUser?.town_id
      ? [{ id: Number(currentUser.town_id), name: currentUser?.town_name || `镇街ID ${currentUser.town_id}` }]
      : [];
  }, [towns, isTownUser, currentUser?.town_id, currentUser?.town_name]);
  const identityOptions = useMemo(() => {
    const values = new Set<string>();
    (washOptions.identities || []).forEach((value: string) => {
      if (value) values.add(value);
    });
    data.forEach((item: any) => {
      if (item.priority_identity) values.add(item.priority_identity);
    });
    return Array.from(values).map(value => ({ label: value, value }));
  }, [washOptions.identities, data]);
  const medicalCategoryOptions = useMemo(() => {
    const values = new Set<string>();
    (washOptions.medical_categories || []).forEach((value: string) => {
      if (value) values.add(value);
    });
    data.forEach((item: any) => {
      if (item.medical_category) values.add(item.medical_category);
    });
    return Array.from(values).map(value => ({ label: value, value }));
  }, [washOptions.medical_categories, data]);
  const washRuleOptions = useMemo(() => savedWashRules.map(rule => ({
    label: rule.name || rule.code,
    value: rule.code,
  })).filter(item => item.value), [savedWashRules]);
  const washRuleNameByCode = useMemo(() => {
    const map = new Map<string, string>();
    [...fixedWashRules, ...savedWashRules].forEach(rule => {
      if (rule?.code) {
        map.set(rule.code, rule.name || rule.code);
      }
    });
    return map;
  }, [savedWashRules]);
  const sortable = (field: string) => ({
    sorter: true,
    sortOrder: sortState.field === field ? sortState.order : null,
  });
  const renderWashRuleName = (code: string) => {
    if (!code) return '-';
    const name = washRuleNameByCode.get(code) || code;
    return (
      <Tooltip title={code}>
        <Tag color={name === code ? 'default' : 'blue'}>{name}</Tag>
      </Tooltip>
    );
  };
  const moneyCell = (value: any) => {
    if (value === null || value === undefined || value === '') return '-';
    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) return String(value);
    return numberValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const dateTimeCell = (value: any) => {
    if (!value) return '-';
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : String(value);
  };

  const effectiveFilters = (baseFilters = filters) => ({
    ...baseFilters,
    ...(isTownUser ? { town_id: Number(currentUser?.town_id) } : {}),
  });

  const fetchData = async (page = current, size = pageSize, overrideFilters?: any, overrideSortState = sortState) => {
    setLoading(true);
    try {
      const query = effectiveFilters(overrideFilters);
      const sortParams = overrideSortState?.field && overrideSortState?.order
        ? { sort_field: overrideSortState.field, sort_order: overrideSortState.order }
        : {};
      const res = await getUnrescuedRecords({ ...query, ...sortParams, page, page_size: size });
      if (res.code === 0) {
        setData(res.data?.list || []);
        setTotal(res.data?.total || 0);
        setCurrent(res.data?.page || page);
        setPageSize(res.data?.page_size || size);
      }
      const statRes = await getUnrescuedStatistics(query);
      if (statRes.code === 0) setStats(statRes.data || {});
      const optionRes = await getUnrescuedWashOptions({ settlement_period: query.settlement_period });
      if (optionRes.code === 0) setWashOptions(optionRes.data || { medical_categories: [], identities: [] });
    } catch (error) {
      message.error('获取未救助明细失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (overrideFilters?: any) => {
    try {
      const statRes = await getUnrescuedStatistics(effectiveFilters(overrideFilters));
      if (statRes.code === 0) setStats(statRes.data || {});
    } catch (error) {
      // The table refresh path will surface user-facing errors; progress polling can stay quiet.
    }
  };

  const loadBasics = async () => {
    try {
      const townRes = await getTownOptions();
      if (townRes.code === 0) setTowns(townRes.data || []);
      const washRes = await getUnrescuedWashConfig();
      const rules = washRes.code === 0 ? mergeWashRules(washRes.data?.data || []) : mergeWashRules([]);
      setWashRules(rules);
      setSavedWashRules(rules);
      const diseaseRes = await getDiseaseConfigs({ page: 1, page_size: 1000, status: 1 });
      if (diseaseRes.code === 0) {
        setDiseaseOptions(diseaseRes.data?.list || []);
      }
    } catch (error) {
      const rules = mergeWashRules([]);
      setWashRules(rules);
      setSavedWashRules(rules);
      message.warning('基础配置加载失败');
    }
  };

  const clearWashTaskCache = (period: string) => {
    try {
      window.localStorage.removeItem(washTaskStorageKey(period));
    } catch (error) {
      // Ignore storage failures.
    }
  };

  const cacheWashTask = (period: string, uuid: string) => {
    try {
      window.localStorage.setItem(washTaskStorageKey(period), uuid);
    } catch (error) {
      // Ignore storage failures; polling still works during this session.
    }
  };

  const readCachedWashTask = (period: string) => {
    try {
      return window.localStorage.getItem(washTaskStorageKey(period)) || '';
    } catch (error) {
      return '';
    }
  };

  const syncWashTask = async (uuid: string, period = filters.settlement_period, silent = false) => {
    if (!uuid) return;
    try {
      const res = await getTaskProgress(uuid);
      if (!isSuccessResponse(res)) {
        return;
      }
      const task = res.data;
      setWashTask(task);
      if (['completed', 'failed', 'cancelled'].includes(task?.status)) {
        clearWashTaskCache(period);
        setWashTask(null);
        if (task.status === 'completed') {
          if (!silent) message.success('筛查任务已完成');
          fetchData(1, pageSize);
        } else if (!silent) {
          message.error('筛查任务执行失败，请查看任务中心或后端日志');
        }
      }
    } catch (error) {
      // Polling failures are transient; keep the cached uuid and retry later.
    }
  };

  const loadWashTaskStatus = async (period = filters.settlement_period) => {
    if (!period) {
      setWashTask(null);
      return;
    }

    const cachedUuid = readCachedWashTask(period);
    if (cachedUuid) {
      await syncWashTask(cachedUuid, period);
    }

    try {
      const res = await getUnrescuedWashStatus({ settlement_period: period });
      if (isSuccessResponse(res) && res.data?.uuid) {
        cacheWashTask(period, res.data.uuid);
        setWashTask(res.data);
      }
    } catch (error) {
      // Status query is best-effort; task center still has the canonical state.
    }
  };

  useEffect(() => {
    loadBasics();
    fetchData(1, pageSize);
    loadWashTaskStatus(filters.settlement_period);
    const handleTaskChanged = () => {
      fetchData(1, pageSize);
      loadWashTaskStatus(filters.settlement_period);
    };
    window.addEventListener('taskStatusChanged', handleTaskChanged);
    return () => window.removeEventListener('taskStatusChanged', handleTaskChanged);
  }, []);

  useEffect(() => {
    if (!washTask?.uuid || !['pending', 'processing'].includes(washTask.status)) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      syncWashTask(washTask.uuid, filters.settlement_period);
      fetchStats();
    }, 2000);

    return () => window.clearInterval(timer);
  }, [washTask?.uuid, washTask?.status, filters.settlement_period]);

  useEffect(() => {
    if (isTownUser && currentUser?.town_id) {
      setFilters((prev: any) => ({
        ...prev,
        town_id: Number(currentUser.town_id),
      }));
    }
  }, [isTownUser, currentUser?.town_id]);

  const openImport = (type: 'attachment1' | 'attachment2') => {
    setImportType(type);
    setFileList([]);
    setImportVisible(true);
  };

  const handleImport = async () => {
    if (!filters.settlement_period) {
      message.warning('请先选择清算期');
      return;
    }
    if (fileList.length === 0) {
      message.warning('请选择CSV文件');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileList[0] as any);
    formData.append('settlement_period', filters.settlement_period);
    setUploading(true);
    try {
      const res = importType === 'attachment1'
        ? await importUnrescuedAttachment1(formData)
        : await importUnrescuedAttachment2(formData);
      if (res.code !== 0) throw new Error(res.message || res.msg || '导入提交失败');
      message.success('导入任务已提交，请在任务中心查看进度');
      window.dispatchEvent(new CustomEvent('openTaskCenter'));
      setImportVisible(false);
      setFileList([]);
    } catch (error: any) {
      message.error(error.message || '导入提交失败');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const filename = templateMap[importType];
    const link = document.createElement('a');
    link.href = `/assets/templates/unrescued/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const visibleStatCards = statCards;

  const submitWash = async () => {
    if (!filters.settlement_period) {
      message.warning('请先选择清算期');
      return;
    }
    const query = effectiveFilters();
    const res = await executeUnrescuedWash({ settlement_period: query.settlement_period, town_id: query.town_id });
    if (res.code === 0) {
      const uuid = res.data?.uuid;
      if (uuid) {
        cacheWashTask(query.settlement_period, uuid);
        setWashTask({ uuid, status: 'pending', progress: 0, title: '未救助台账_筛查_筛查规则' });
      }
      message.success('筛查任务已提交，执行期间不可重复提交');
    } else {
      message.error(res.message || res.msg || '筛查失败');
    }
  };

  const handleWash = () => {
    if (!filters.settlement_period) {
      message.warning('请先选择清算期');
      return;
    }

    Modal.confirm({
      title: '确定执行筛查规则吗？',
      content: `将按当前已保存并启用的筛查规则处理 ${filters.settlement_period} 清算期数据。执行期间不可重复提交。`,
      okText: '确认执行',
      cancelText: '再检查一下',
      onOk: submitWash,
    });
  };

  const handleSaveWash = async () => {
    const invalidPriorityRule = washRules.find(rule => rule.code === 'outpatient_major_disease' && rule.enabled !== false && !(rule.medical_categories || []).length);
    if (invalidPriorityRule) {
      message.warning('门诊重大疾病匹配规则至少需要配置一个医疗类别');
      return;
    }
    const normalizedRules = washRules.map(rule => rule.code === 'outpatient_major_disease'
      ? { ...rule, disease_codes: (rule.disease_codes || []).map((code: string) => code.trim().toUpperCase()).filter(Boolean) }
      : rule);
    const res = await saveUnrescuedWashConfig({ name: '未救助筛查规则', rules: normalizedRules });
    if (res.code === 0) {
      message.success('规则已保存');
      const nextRules = res.data?.data || washRules;
      setWashRules(nextRules);
      setSavedWashRules(nextRules);
      setWashEditing(false);
    }
  };

  const handleCancelWashEdit = () => {
    setWashRules(savedWashRules);
    setWashEditing(false);
  };

  const resetFilters = () => {
    const nextFilters = {
      settlement_period: filters.settlement_period,
      keyword: '',
      ...(isTownUser ? { town_id: Number(currentUser?.town_id), status: undefined } : {}),
    };
    setFilters(nextFilters);
    setFilterExpanded(false);
    fetchData(1, pageSize, nextFilters);
  };

  const doExport = async (type: string) => {
    const res = await exportUnrescuedRecords({ type, filters: effectiveFilters() });
    if (res.code === 0) {
      message.success('导出任务已提交，请在任务中心查看进度');
      window.dispatchEvent(new CustomEvent('openTaskCenter'));
    } else {
      message.error(res.message || res.msg || '导出失败');
    }
  };

  const updateRule = (index: number, patch: any) => {
    if (!washEditing) return;
    setWashRules(prev => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  };

  const isWashRunning = !!washTask?.uuid && ['pending', 'processing'].includes(washTask.status);
  const canExecuteWash = !isWashRunning && !washEditing && savedWashRules.some(rule => rule.enabled === true);
  const washExecuteTip = isWashRunning ? '筛查任务正在执行中' : washEditing ? '请先保存或取消筛查规则编辑' : '请配置并启用至少一条筛查规则';

  const confirmExport = () => {
    const count = Number(stats.exportCount || 0);
    if (count <= 0) {
      message.warning('当前筛选条件下暂无未剔除数据，不能导出未救助明细表');
      return;
    }

    Modal.confirm({
      title: '确定导出 未救助明细表吗？',
      content: `当前筛选条件下将导出 ${count} 条记录。`,
      okText: '确定导出',
      cancelText: '取消',
      onOk: () => doExport('unrescued'),
    });
  };

  const persistVisibleColumns = (keys: string[]) => {
    const nextKeys = Array.from(new Set([...keys, ...requiredColumnKeys]));
    setVisibleColumnKeys(nextKeys);
    try {
      window.localStorage.setItem(visibleColumnsStorageKey, JSON.stringify(nextKeys));
    } catch (error) {
      // Ignore storage failures; the setting still works in memory.
    }
  };

  const persistFixedColumns = (nextMap: Record<string, 'left' | 'right'>) => {
    setFixedColumnMap(nextMap);
    try {
      window.localStorage.setItem(fixedColumnsStorageKey, JSON.stringify(nextMap));
    } catch (error) {
      // Ignore storage failures; the setting still works in memory.
    }
  };

  const persistColumnOrder = (nextKeys: string[]) => {
    const normalizedKeys = [
      ...nextKeys.filter(key => allColumnKeys.includes(key)),
      ...allColumnKeys.filter(key => !nextKeys.includes(key)),
    ];
    setColumnOrderKeys(normalizedKeys);
    try {
      window.localStorage.setItem(columnOrderStorageKey, JSON.stringify(normalizedKeys));
    } catch (error) {
      // Ignore storage failures; the setting still works in memory.
    }
  };

  const moveColumn = (sourceKey: string, targetKey: string) => {
    if (!sourceKey || !targetKey || sourceKey === targetKey) {
      return;
    }
    const nextKeys = [...columnOrderKeys];
    const sourceIndex = nextKeys.indexOf(sourceKey);
    const targetIndex = nextKeys.indexOf(targetKey);
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }
    nextKeys.splice(sourceIndex, 1);
    nextKeys.splice(targetIndex, 0, sourceKey);
    persistColumnOrder(nextKeys);
  };

  const updateColumnFixed = (key: string, value: string) => {
    const nextMap = { ...fixedColumnMap };
    if (value === 'left' || value === 'right') {
      nextMap[key] = value;
    } else {
      delete nextMap[key];
    }
    persistFixedColumns(nextMap);
  };

  const resetColumnSettings = () => {
    persistVisibleColumns(defaultVisibleColumnKeys);
    persistFixedColumns(defaultFixedColumnMap);
    persistColumnOrder(allColumnKeys);
  };

  const handleTableChange = (pagination: any, _tableFilters: any, sorter: any) => {
    const activeSorter = Array.isArray(sorter) ? sorter.find(item => item?.order) : sorter;
    const nextSortState = activeSorter?.field && activeSorter?.order
      ? { field: String(activeSorter.field), order: activeSorter.order }
      : {};
    setSortState(nextSortState);
    fetchData(pagination?.current || current, pagination?.pageSize || pageSize, undefined, nextSortState);
  };

  const columns = [
    { key: 'settlement_period', title: '清算期', dataIndex: 'settlement_period', width: 120, ...sortable('settlement_period'), render: (v: string) => <EllipsisText value={v} maxWidth={84} /> },
    { key: 'name', title: '姓名', dataIndex: 'name', width: 130, ...sortable('name'), render: (v: string) => <EllipsisText value={v} maxWidth={130} /> },
    { key: 'id_card', title: '身份证号', dataIndex: 'id_card', width: 220, render: (v: string) => <EllipsisText value={v} maxWidth={220} /> },
    { key: 'sequence_no', title: '序号', dataIndex: 'sequence_no', width: 160, ...sortable('sequence_no'), render: (v: string) => <EllipsisText value={v} maxWidth={150} /> },
    {
      key: 'street_town',
      title: '镇街',
      dataIndex: 'street_town',
      width: 150,
      render: (v: string, record: any) => {
        const townId = Number(record.town_id || 0);
        const matchedTownName = townId > 0 ? townNameById.get(townId) : '';
        const displayTown = v || matchedTownName || '-';
        return (
          <Space size={4} wrap style={{ maxWidth: 132 }}>
            <EllipsisText value={displayTown} maxWidth={v && townId === 0 ? 76 : 128} />
            {v && townId === 0 && <Tag color="red">未匹配</Tag>}
          </Space>
        );
      },
    },
    { key: 'village', title: '村社', dataIndex: 'village', width: 140, render: (v: string) => <EllipsisText value={v} maxWidth={122} /> },
    {
      key: 'priority_identity',
      title: '身份',
      dataIndex: 'priority_identity',
      width: 190,
      ...sortable('priority_identity'),
      render: (v: string) => <EllipsisText value={v} maxWidth={172} />,
    },
    { key: 'medical_category', title: '医疗类别', dataIndex: 'medical_category', width: 150, ...sortable('medical_category'), render: (v: string) => <EllipsisText value={v} maxWidth={112} /> },
    { key: 'disease_code', title: '病种编码', dataIndex: 'disease_code', width: 130, ...sortable('disease_code'), render: (v: string) => <EllipsisText value={v} maxWidth={112} /> },
    { key: 'disease_name', title: '病种名称', dataIndex: 'disease_name', width: 170, ...sortable('disease_name'), render: (v: string) => <EllipsisText value={v} maxWidth={152} /> },
    { key: 'cert_location', title: '认定地', dataIndex: 'cert_location', width: 110, ...sortable('cert_location'), render: (v: string) => <EllipsisText value={v} maxWidth={92} /> },
    { key: 'hospital_name', title: '医药机构', dataIndex: 'hospital_name', width: 240, ...sortable('hospital_name'), render: (v: string) => <EllipsisText value={v} maxWidth={222} /> },
    { key: 'hospital_code', title: '机构编码', dataIndex: 'hospital_code', width: 190, ...sortable('hospital_code'), render: (v: string) => <EllipsisText value={v} maxWidth={132} /> },
    { key: 'in_out_city', title: '市内/外', dataIndex: 'in_out_city', width: 100, ...sortable('in_out_city'), render: (v: string) => <EllipsisText value={v} maxWidth={82} /> },
    { key: 'admission_date', title: '入院时间', dataIndex: 'admission_date', width: 120, ...sortable('admission_date') },
    { key: 'discharge_date', title: '出院时间', dataIndex: 'discharge_date', width: 120, ...sortable('discharge_date') },
    { key: 'settlement_time', title: '结算时间', dataIndex: 'settlement_time', width: 180, ...sortable('settlement_time') },
    { key: 'total_fee', title: '医疗总费用', dataIndex: 'total_fee', width: 120, align: 'right' as const, ...sortable('total_fee'), render: moneyCell },
    { key: 'policy_fee', title: '政策范围费用', dataIndex: 'policy_fee', width: 140, align: 'right' as const, ...sortable('policy_fee'), render: moneyCell },
    { key: 'pool_fund_pay', title: '统筹报销', dataIndex: 'pool_fund_pay', width: 120, align: 'right' as const, ...sortable('pool_fund_pay'), render: moneyCell },
    { key: 'large_amount_pay', title: '大额报销', dataIndex: 'large_amount_pay', width: 120, align: 'right' as const, ...sortable('large_amount_pay'), render: moneyCell },
    { key: 'serious_illness_pay', title: '大病报销', dataIndex: 'serious_illness_pay', width: 120, align: 'right' as const, ...sortable('serious_illness_pay'), render: moneyCell },
    { key: 'used_outpatient_rescue', title: '已用门诊救助', dataIndex: 'used_outpatient_rescue', width: 140, align: 'right' as const, ...sortable('used_outpatient_rescue'), render: moneyCell },
    { key: 'used_normal_rescue', title: '已用普通住院救助', dataIndex: 'used_normal_rescue', width: 160, align: 'right' as const, ...sortable('used_normal_rescue'), render: moneyCell },
    { key: 'used_major_rescue', title: '已用重特大救助', dataIndex: 'used_major_rescue', width: 160, align: 'right' as const, ...sortable('used_major_rescue'), render: moneyCell },
    { key: 'used_large_fee_rescue', title: '已用大额费用救助', dataIndex: 'used_large_fee_rescue', width: 160, align: 'right' as const, ...sortable('used_large_fee_rescue'), render: moneyCell },
    { key: 'calc_reimbursement_amount', title: '进入报销金额', dataIndex: 'calc_reimbursement_amount', width: 150, align: 'right' as const, ...sortable('calc_reimbursement_amount'), render: moneyCell },
    {
      key: 'status',
      title: '状态',
      dataIndex: 'status',
      width: 110,
      ...sortable('status'),
      render: (v: string) => <Tag color={statusColors[v] || 'default'}>{v}</Tag>,
    },
    {
      key: 'match_status',
      title: '匹配状态',
      dataIndex: 'match_status',
      width: 110,
      ...sortable('match_status'),
      render: (v: string) => <Tag color={v === '已匹配' ? 'green' : 'red'}>{v || '-'}</Tag>,
    },
    {
      key: 'exclude_status',
      title: '剔除',
      dataIndex: 'exclude_status',
      width: 100,
      ...sortable('exclude_status'),
      render: (v: string) => <Tag color={v === '已剔除' ? 'red' : 'green'}>{v}</Tag>,
    },
    { key: 'exclude_rule_code', title: '筛查命中规则', dataIndex: 'exclude_rule_code', width: 170, ...sortable('exclude_rule_code'), render: renderWashRuleName },
    { key: 'remark', title: '系统备注', dataIndex: 'remark', width: 160, render: (v: string) => <EllipsisText value={v} maxWidth={142} /> },
    { key: 'created_at', title: '创建时间', dataIndex: 'created_at', width: 180, ...sortable('created_at'), render: dateTimeCell },
    { key: 'updated_at', title: '更新时间', dataIndex: 'updated_at', width: 180, ...sortable('updated_at'), render: dateTimeCell },
  ];

  const columnOrderIndex = new Map(columnOrderKeys.map((key, index) => [key, index]));
  const orderedColumns = [...columns].sort((left, right) => {
    const leftIndex = columnOrderIndex.get(String(left.key)) ?? allColumnKeys.length;
    const rightIndex = columnOrderIndex.get(String(right.key)) ?? allColumnKeys.length;
    return leftIndex - rightIndex;
  });
  const configurableColumns = orderedColumns;
  const configuredVisibleColumns = orderedColumns.filter(column => {
    const key = String(column.key);
    return visibleColumnKeys.includes(key);
  }).map(column => {
    const fixed = fixedColumnMap[String(column.key)];
    return fixed ? { ...column, fixed } : { ...column, fixed: undefined };
  });
  const visibleColumns = [
    ...configuredVisibleColumns.filter(column => column.fixed === 'left'),
    ...configuredVisibleColumns.filter(column => !column.fixed),
    ...configuredVisibleColumns.filter(column => column.fixed === 'right'),
  ];
  const tableScrollX = Math.max(
    visibleColumns.reduce((sum, column) => sum + Number(column.width || 120), 0) + 64,
    980,
  );
  const columnSettingContent = (
    <Space direction="vertical" size={10} style={{ width: 360 }}>
      <div style={{ maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
        {configurableColumns.map(column => {
          const key = String(column.key);
          const checked = visibleColumnKeys.includes(key);
          const required = requiredColumnKeys.includes(key);
          const fixed = fixedColumnMap[key];
          return (
            <div
              key={key}
              draggable
              onDragStart={event => {
                setDraggedColumnKey(key);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', key);
              }}
              onDragOver={event => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
              }}
              onDrop={event => {
                event.preventDefault();
                const sourceKey = event.dataTransfer.getData('text/plain') || draggedColumnKey;
                moveColumn(sourceKey, key);
                setDraggedColumnKey('');
              }}
              onDragEnd={() => setDraggedColumnKey('')}
              style={{
                display: 'grid',
                gridTemplateColumns: '20px minmax(0, 1fr) 68px',
                gap: 8,
                alignItems: 'center',
                padding: '5px 0',
                opacity: draggedColumnKey === key ? 0.45 : 1,
              }}
            >
              <HolderOutlined style={{ color: '#94a3b8', cursor: 'grab' }} />
              <Checkbox
                checked={checked}
                disabled={required}
                onChange={event => {
                  const nextKeys = event.target.checked
                    ? [...visibleColumnKeys, key]
                    : visibleColumnKeys.filter(item => item !== key);
                  persistVisibleColumns(nextKeys);
                }}
              >
                {column.title as React.ReactNode}
              </Checkbox>
              <Space size={2}>
                <Tooltip title={fixed === 'left' ? '取消左侧固定' : '固定左侧'}>
                  <Button
                    size="small"
                    type={fixed === 'left' ? 'primary' : 'text'}
                    disabled={!checked}
                    icon={<VerticalRightOutlined />}
                    onClick={() => updateColumnFixed(key, fixed === 'left' ? 'none' : 'left')}
                    style={{ width: 30 }}
                  />
                </Tooltip>
                <Tooltip title={fixed === 'right' ? '取消右侧固定' : '固定右侧'}>
                  <Button
                    size="small"
                    type={fixed === 'right' ? 'primary' : 'text'}
                    disabled={!checked}
                    icon={<VerticalLeftOutlined />}
                    onClick={() => updateColumnFixed(key, fixed === 'right' ? 'none' : 'right')}
                    style={{ width: 30 }}
                  />
                </Tooltip>
              </Space>
            </div>
          );
        })}
      </div>
      <Space>
        <Button size="small" onClick={resetColumnSettings}>恢复默认</Button>
        <Button size="small" onClick={() => persistVisibleColumns(orderedColumns.map(column => String(column.key)))}>显示全部</Button>
      </Space>
    </Space>
  );

  const washColumns = [
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean, _: any, index: number) => (
        <Switch
          size="small"
          checked={v !== false}
          disabled={!washEditing}
          onChange={checked => updateRule(index, { enabled: checked })}
        />
      ),
    },
    { title: '规则项', dataIndex: 'name', width: 220 },
    {
      title: '保留/剔除',
      width: 120,
      render: (_: any, record: any, index: number) => (
        <Select
          style={{ width: 96 }}
          disabled={!washEditing}
          value={record.action || (record.type === 'not_in' ? 'keep' : 'exclude')}
          onChange={value => updateRule(index, { action: value })}
          options={[
            { label: '保留', value: 'keep' },
            { label: '剔除', value: 'exclude' },
          ]}
        />
      ),
    },
    {
      title: '条件',
      width: 520,
      render: (_: any, record: any, index: number) => {
        const operator = record.operator || (record.type === 'contains' ? 'contains' : record.type === 'not_in' ? 'in' : '=');
        if (record.code === 'outpatient_major_disease') {
          const options = Array.from(new Set([
            ...washOptions.medical_categories,
            ...(record.medical_categories || []),
          ].filter(Boolean))).map((value: string) => ({ label: value, value }));
          return (
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space.Compact style={{ width: '100%' }}>
                <Input value="医疗类别" disabled style={{ width: 110 }} />
                <Select
                  mode="tags"
                  allowClear
                  disabled={!washEditing}
                  tokenSeparators={['、', ',', '，', '\n']}
                  style={{ width: '100%' }}
                  value={record.medical_categories || []}
                  options={options}
                  onChange={medical_categories => updateRule(index, { medical_categories })}
                />
              </Space.Compact>
              <Space.Compact style={{ width: '100%' }}>
                <Input value="指定病种编码" disabled style={{ width: 110 }} />
                <Select
                  mode="tags"
                  allowClear
                  disabled={!washEditing}
                  tokenSeparators={['、', ',', '，', '\n']}
                  style={{ width: '100%' }}
                  value={record.disease_codes || []}
                  onChange={disease_codes => updateRule(index, { disease_codes })}
                />
              </Space.Compact>
              <Typography.Text type="secondary">同时自动精确匹配重大疾病编码库中已启用的病种编码。</Typography.Text>
              <Alert
                type="warning"
                showIcon
                message={<Typography.Text strong>仅金额＞300元参与匹配，命中后跳过后续规则。</Typography.Text>}
              />
            </Space>
          );
        }
        const isCategory = record.code === 'medical_category_keep';
        const isIdentity = record.code === 'identity_exclude';
        const isHospital = record.code === 'hospital_keyword_exclude';
        const isAmount = !isCategory && !isIdentity && !isHospital;

        if (isCategory || isIdentity) {
          const optionSource = [
            ...(isCategory ? washOptions.medical_categories : washOptions.identities),
            ...(record.values || []),
          ];
          const options = Array.from(new Set(optionSource.filter(Boolean)))
            .map((value: string) => ({ label: value, value }));
          const optionValues = new Set(options.map((item: any) => item.value));
          const selectedValues = (record.values || []).filter((value: string) => optionValues.has(value));
          return (
            <Select
              mode="tags"
              allowClear
              disabled={!washEditing}
              tokenSeparators={['、', ',', '，', '\n']}
              placeholder={
                isCategory
                  ? '选择医疗类别，或输入关键词后回车'
                  : '选择身份类别，或输入关键词后回车'
              }
              style={{ width: '100%' }}
              value={selectedValues}
              options={options}
              onChange={values => updateRule(index, { operator: 'contains', values })}
            />
          );
        }

        if (isHospital) {
          return (
            <Space.Compact style={{ width: '100%' }}>
              <Select
                style={{ width: 110 }}
                disabled={!washEditing}
                value={operator}
                onChange={value => updateRule(index, { operator: value })}
                options={[
                  { label: '包含', value: 'contains' },
                  { label: '不包含', value: 'not_contains' },
                ]}
              />
              <Select
                mode="tags"
                allowClear
                disabled={!washEditing}
                tokenSeparators={['、', ',', '，', '\n']}
                style={{ width: '100%' }}
                value={record.values || []}
                placeholder="输入关键字后回车"
                onChange={values => updateRule(index, { values })}
              />
            </Space.Compact>
          );
        }

        if (isAmount) {
          return (
            <Space.Compact style={{ width: '100%' }}>
              <Select
                style={{ width: 78 }}
                disabled={!washEditing}
                value={operator}
                onChange={value => updateRule(index, { operator: value })}
                options={['=', '>', '<', '>=', '<='].map(value => ({ label: value, value }))}
              />
              <Input
                value={record.compare_field ? '医保政策范围费用' : record.value}
                disabled={!washEditing || !!record.compare_field}
                placeholder="数值"
                onChange={e => updateRule(index, { value: e.target.value, compare_field: undefined })}
              />
            </Space.Compact>
          );
        }

        return null;
      },
    },
    {
      title: '筛查备注',
      width: 240,
      render: (_: any, record: any, index: number) => (
        <Input
          disabled={!washEditing}
          placeholder="命中剔除时写入备注"
          value={record.remark}
          onChange={e => updateRule(index, { remark: e.target.value })}
        />
      ),
    },
  ];

  return (
    <div>
      <Card size="small" style={{ ...cardStyle, marginBottom: 12 }}>
        <div style={isTownUser ? townFilterRowStyle : filterRowStyle}>
          <DatePicker
            picker="month"
            allowClear={false}
            style={{ width: '100%' }}
            value={filters.settlement_period ? dayjs(filters.settlement_period, 'YYYYMM') : undefined}
            onChange={value => {
              const settlementPeriod = value ? value.format('YYYYMM') : '';
              if (settlementPeriod) {
                try {
                  window.localStorage.setItem(settlementPeriodStorageKey, settlementPeriod);
                } catch (error) {
                  // Ignore storage failures; the selected value still applies in memory.
                }
              }
              const nextFilters = { ...filters, settlement_period: settlementPeriod };
              setFilters(nextFilters);
              fetchData(1, pageSize, nextFilters);
              loadWashTaskStatus(settlementPeriod);
            }}
          />
          <Input
            allowClear
            placeholder="身份证/姓名/序号"
            value={filters.keyword}
            onChange={e => setFilters({ ...filters, keyword: e.target.value })}
          />
          {isTownUser ? (
            <>
              <Select
                disabled
                placeholder="镇街"
                value={Number(currentUser?.town_id || filters.town_id || 0) || undefined}
                options={availableTowns.map((item: any) => ({ label: item.name, value: item.id }))}
              />
              <Select
                allowClear
                placeholder="状态"
                mode="multiple"
                {...compactTagSelectProps}
                value={filters.status}
                onChange={value => setFilters({ ...filters, status: value })}
                options={statusOptions.map(v => ({ label: v, value: v }))}
              />
            </>
          ) : (
            <>
              <Select
                allowClear
                showSearch
                placeholder="医疗类别"
                value={filters.medical_category}
                onChange={value => setFilters({ ...filters, medical_category: value })}
                options={medicalCategoryOptions}
              />
              <Select
                allowClear
                showSearch
                placeholder="身份类别"
                mode="multiple"
                {...compactTagSelectProps}
                value={filters.priority_identity}
                onChange={value => setFilters({ ...filters, priority_identity: value })}
                options={identityOptions}
              />
            </>
          )}
          <div style={filterActionsStyle}>
            <Button type="primary" onClick={() => fetchData(1, pageSize)}>查询</Button>
            <Button icon={<ReloadOutlined />} onClick={() => fetchData(current, pageSize)} loading={loading}>刷新</Button>
            <Button onClick={resetFilters}>重置</Button>
            <Button icon={<MoreOutlined />} onClick={() => setFilterExpanded(value => !value)}>
              {filterExpanded ? '收起筛选' : '更多筛选'}
            </Button>
          </div>
        </div>
        {filterExpanded && (
          <div style={moreFilterRowStyle}>
            {!isTownUser && (
              <>
                <Select
                  allowClear
                  placeholder="镇街"
                  value={filters.town_id}
                  onChange={value => setFilters({ ...filters, town_id: value })}
                  options={availableTowns.map((item: any) => ({ label: item.name, value: item.id }))}
                />
                <Input
                  allowClear
                  placeholder="机构名称"
                  value={filters.hospital_name}
                  onChange={e => setFilters({ ...filters, hospital_name: e.target.value })}
                />
                <Select
                  allowClear
                  placeholder="状态"
                  mode="multiple"
                  {...compactTagSelectProps}
                  value={filters.status}
                  onChange={value => setFilters({ ...filters, status: value })}
                  options={statusOptions.map(v => ({ label: v, value: v }))}
                />
                <Select
                  allowClear
                  placeholder="匹配状态"
                  value={filters.match_status}
                  onChange={value => setFilters({ ...filters, match_status: value })}
                  options={matchStatusOptions.map(v => ({ label: v, value: v }))}
                />
                <Select
                  allowClear
                  placeholder="剔除"
                  value={filters.exclude_status}
                  onChange={value => setFilters({ ...filters, exclude_status: value })}
                  options={['未剔除', '已剔除'].map(v => ({ label: v, value: v }))}
                />
                <Select
                  allowClear
                  placeholder="筛查命中规则"
                  value={filters.exclude_rule_code}
                  onChange={value => setFilters({ ...filters, exclude_rule_code: value })}
                  options={washRuleOptions}
                />
              </>
            )}
            <Select
              allowClear
              showSearch
              mode="tags"
              {...compactTagSelectProps}
              placeholder="病种编码/名称"
              value={filters.disease_keyword}
              onChange={value => setFilters({ ...filters, disease_keyword: value, disease_code: undefined, disease_name: undefined })}
              options={diseaseOptions.map((item: any) => ({
                label: `${item.disease_code} ${item.disease_name}`,
                value: item.disease_code,
              }))}
              optionFilterProp="label"
            />
            <Select
              allowClear
              placeholder="市内/外"
              value={filters.in_out_city}
              onChange={value => setFilters({ ...filters, in_out_city: value })}
              options={['市内', '市外'].map(v => ({ label: v, value: v }))}
            />
            <Input
              allowClear
              placeholder="备注"
              value={filters.remark}
              onChange={e => setFilters({ ...filters, remark: e.target.value })}
            />
          </div>
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 12 }}>
        {visibleStatCards.map(item => (
          <div key={item.key} style={{ ...cardStyle, background: '#fff', padding: '14px 16px' }}>
            <div style={{ color: '#64748b', fontSize: 13 }}>{item.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <span style={{ color: item.color, fontSize: 28, fontWeight: 600, lineHeight: 1 }}>{stats[item.key] || 0}</span>
              <span style={{ color: '#94a3b8', fontSize: 12 }}>条</span>
            </div>
          </div>
        ))}
      </div>

      <Card size="small" style={{ ...cardStyle, marginBottom: 12 }}>
        <div style={toolbarStyle}>
          <div style={toolbarSideStyle}>
            {!isTownUser && access.canImportUnrescuedRecords && (
              <>
                <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => openImport('attachment1')}>
                  导入 未救助明细
                </Button>
                <Button icon={<CloudUploadOutlined />} onClick={() => openImport('attachment2')}>
                  导入 救助对象名单
                </Button>
                <div style={toolbarDividerStyle} />
              </>
            )}

            {!isTownUser && access.canWashUnrescuedRecords && (
              canExecuteWash ? (
                <Button onClick={handleWash}>执行筛查规则</Button>
              ) : (
                <Tooltip title={washExecuteTip}>
                  <Button disabled loading={isWashRunning}>{isWashRunning ? '筛查执行中' : '执行筛查规则'}</Button>
                </Tooltip>
              )
            )}
          </div>

          <div style={toolbarSideStyle}>
            <Popover
              trigger="click"
              placement="bottomRight"
              title="列显示"
              content={columnSettingContent}
            >
              <Button icon={<SettingOutlined />}>列设置</Button>
            </Popover>
            {(isTownUser || access.canExportUnrescuedRecords) && (
              <Button icon={<DownloadOutlined />} onClick={confirmExport}>
                导出 未救助明细表{Number(stats.exportCount || 0) > 0 ? `（${stats.exportCount}）` : ''}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {isWashRunning && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={`筛查任务执行中：${filters.settlement_period}`}
          description={
            <Progress
              percent={Math.min(Number(washTask?.progress || 0), 99.9)}
              status="active"
              size="small"
            />
          }
        />
      )}

      {!isTownUser && access.canWashUnrescuedRecords && (
        <Collapse
          style={{ marginBottom: 12, background: '#fff' }}
          items={[
            {
              key: 'wash-rules',
              label: '筛查规则配置',
              children: (
                <>
                  <Alert
                    type={washEditing ? 'info' : 'warning'}
                    showIcon
                    style={{ marginBottom: 12 }}
                    message={(
                      <Space wrap>
                        {washEditing ? (
                          <>
                            <Button size="small" type="primary" onClick={handleSaveWash}>保存</Button>
                            <Button size="small" onClick={handleCancelWashEdit}>取消</Button>
                          </>
                        ) : (
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => {
                              setSavedWashRules(washRules);
                              setWashEditing(true);
                            }}
                          >
                            编辑
                          </Button>
                        )}
          <span>{washEditing ? '当前仅编辑未救助明细的筛查配置；医疗类别和身份选项来自业务筛选表。' : '当前为只读状态，点击“编辑”后可修改未救助明细筛查规则。'}</span>
                      </Space>
                    )}
                  />
                  <Table
                    rowKey="code"
                    size="small"
                    pagination={false}
                    dataSource={washRules}
                    columns={washColumns}
                    scroll={{ x: 1280 }}
                  />
                </>
              ),
            },
          ]}
        />
      )}

      <Table
        rowKey="id"
        loading={loading}
        columns={visibleColumns}
        dataSource={data}
        scroll={{ x: tableScrollX }}
        onChange={handleTableChange}
        pagination={{
          current,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: n => `共 ${n} 条记录`,
        }}
      />

      <Modal
        title={importType === 'attachment1' ? '导入 未救助明细' : '导入 救助对象名单'}
        open={importVisible}
        onCancel={() => setImportVisible(false)}
        width={640}
        footer={[
          <Button key="cancel" onClick={() => setImportVisible(false)}>关闭</Button>,
          <Button key="upload" type="primary" icon={<UploadOutlined />} loading={uploading} disabled={!fileList.length} onClick={handleImport}>确认导入</Button>,
        ]}
      >
        <Alert
          message="导入说明"
          description={
            <Space direction="vertical" size={8}>
              <span>1. 当前清算期：{filters.settlement_period}</span>
              <span>2. 仅支持 .csv 格式，编码自动识别 UTF-8/GBK</span>
              <span>{importType === 'attachment1' ? '3. 按“清算期 + 序号”新增或更新未救助明细' : '3. 按身份证号匹配当月明细，补全镇街、村社和身份信息'}</span>
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

export default UnrescuedRecords;
