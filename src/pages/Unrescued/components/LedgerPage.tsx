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
import { useAccess } from '@umijs/max';
import dayjs from 'dayjs';
import { getTownOptions } from '@/services/town';
import { getDiseaseConfigs, getUnrescuedWashOptions } from '@/services/unrescued';
import { getTaskProgress } from '@/services/task';

type LedgerKind = 'unrescued' | 'refund';

type LedgerPageProps = {
  kind: LedgerKind;
  title: string;
  primaryImportLabel: string;
  primaryImport: (data: FormData) => Promise<any>;
  objectImport: (data: FormData) => Promise<any>;
  list: (params: any) => Promise<any>;
  statistics: (params: any) => Promise<any>;
  washConfig: () => Promise<any>;
  saveWashConfig: (data: any) => Promise<any>;
  executeWash: (data: any) => Promise<any>;
  washStatus?: (params: any) => Promise<any>;
  exportData: (data: any) => Promise<any>;
};

const statusColors: Record<string, string> = {
  待处理: 'default',
  无救助金额: 'default',
  拟通知1: 'blue',
  拟通知2: 'orange',
};

const allStatusOptions = ['待处理', '无救助金额', '拟通知1', '拟通知2'];
const matchStatusOptions = ['未匹配', '已匹配'];
const templateMap: Record<LedgerKind, Record<'primary' | 'object', string>> = {
  unrescued: {
    primary: '导入-附件1：未救助明细模板.csv',
    object: '导入-附件2：救助对象名单模板.csv',
  },
  refund: {
    primary: '导入-附件4：应补应退明细模板.csv',
    object: '导入-附件2：救助对象名单模板.csv',
  },
};

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

const baseWashRules = [
  {
    code: 'outpatient_major_disease',
    name: '门诊重大疾病匹配',
    field: 'medical_category',
    action: 'keep',
    operator: 'compound',
    medical_categories: ['门诊慢特病', '造口袋门诊'],
    disease_codes: ['M00500'],
    remark: '门诊重大疾病匹配，标记为拟通知2',
    condition_text: '医疗类别命中配置，且病种编码命中指定编码或已启用的重大疾病编码库',
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

const refundWashRules = [
  ...baseWashRules,
  {
    code: 'total_fee_offset_pair',
    name: '总费用正负抵消',
    field: 'total_fee',
    action: 'exclude',
    operator: 'custom',
    remark: '正负费用抵消',
    condition_text: '同一清算期 + 同一身份证号 + 总费用绝对值相同，正负成对剔除',
    enabled: true,
  },
  {
    code: 'medical_assistance_positive',
    name: '医疗救助金额大于0',
    field: 'medical_assistance_pay',
    action: 'exclude',
    operator: '>',
    value: '0.00',
    remark: '已享受医疗救助',
    condition_text: '医疗救助金额 > 0',
    enabled: true,
  },
];

const defaultWashRulesByKind = (kind: LedgerKind) => (kind === 'refund' ? refundWashRules : baseWashRules);

const mergeWashRules = (rules: any[] = [], kind: LedgerKind = 'unrescued') => {
  const map = new Map(rules.filter(item => item?.code).map(item => [item.code, item]));
  return defaultWashRulesByKind(kind).map(rule => ({ ...rule, ...(map.get(rule.code) || {}) }));
};

const defaultSettlementPeriod = (key: string) => {
  if (typeof window === 'undefined') return dayjs().format('YYYYMM');
  const stored = window.localStorage.getItem(key) || '';
  return /^\d{6}$/.test(stored) && dayjs(stored, 'YYYYMM').isValid() ? stored : dayjs().format('YYYYMM');
};

const isSuccessResponse = (res: any) => res?.code === 0 || res?.code === 200;

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
      <Typography.Text ellipsis={{ tooltip: text }} style={{ display: 'inline-block', flex: 1, minWidth: 0, margin: 0 }}>
        {text}
      </Typography.Text>
    </span>
  );
};

const LedgerPage: React.FC<LedgerPageProps> = props => {
  const access = useAccess();
  const storagePrefix = `unrescued.${props.kind}.records`;
  const settlementPeriodStorageKey = `${storagePrefix}.settlement_period`;
  const visibleColumnsStorageKey = `${storagePrefix}.visible_columns`;
  const fixedColumnsStorageKey = `${storagePrefix}.fixed_columns`;
  const columnOrderStorageKey = `${storagePrefix}.column_order`;
  const washTaskStoragePrefix = `${storagePrefix}.wash_task`;
  const washTaskStorageKey = (period: string) => `${washTaskStoragePrefix}.${period || 'default'}`;
  const requiredColumnKeys = ['settlement_period', 'name', 'id_card'];
  const allColumnKeys = [
    'settlement_period',
    'sequence_no',
    'name',
    'id_card',
    'match_status',
    'street_town',
    'village',
    'priority_identity',
    'medical_category',
    'disease_code',
    'disease_name',
    'hospital_name',
    'hospital_code',
    'admission_date',
    'discharge_date',
    'settlement_time',
    'total_fee',
    'policy_fee',
    'pool_fund_pay',
    'large_amount_pay',
    'serious_illness_pay',
    ...(props.kind === 'refund' ? ['medical_assistance_pay', 'yukuaibao_pay'] : []),
    'used_outpatient_rescue',
    'used_normal_rescue',
    'used_major_rescue',
    'used_large_fee_rescue',
    'calc_reimbursement_amount',
    'status',
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
    'match_status',
    'street_town',
    'priority_identity',
    'medical_category',
    'hospital_name',
    'calc_reimbursement_amount',
    'status',
    'exclude_status',
    'exclude_rule_code',
    'remark',
  ];

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>({});
  const [towns, setTowns] = useState<any[]>([]);
  const [diseaseOptions, setDiseaseOptions] = useState<any[]>([]);
  const [washOptions, setWashOptions] = useState<any>({ medical_categories: [], identities: [] });
  const [washRules, setWashRules] = useState<any[]>([]);
  const [savedWashRules, setSavedWashRules] = useState<any[]>([]);
  const [washEditing, setWashEditing] = useState(false);
  const [washTask, setWashTask] = useState<any>(null);
  const [importVisible, setImportVisible] = useState(false);
  const [importType, setImportType] = useState<'primary' | 'object'>('primary');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [sortState, setSortState] = useState<any>({});
  const [draggedColumnKey, setDraggedColumnKey] = useState('');
  const [filters, setFilters] = useState<any>({
    settlement_period: defaultSettlementPeriod(settlementPeriodStorageKey),
    keyword: '',
  });
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(() => {
    if (typeof window === 'undefined') return defaultVisibleColumnKeys;
    const stored = JSON.parse(window.localStorage.getItem(visibleColumnsStorageKey) || '[]');
    return Array.isArray(stored) && stored.length > 0
      ? Array.from(new Set([...stored.map(String).filter(key => allColumnKeys.includes(key)), ...requiredColumnKeys]))
      : defaultVisibleColumnKeys;
  });
  const [fixedColumnMap, setFixedColumnMap] = useState<Record<string, 'left' | 'right'>>(() => {
    if (typeof window === 'undefined') return defaultFixedColumnMap;
    try {
      const stored = JSON.parse(window.localStorage.getItem(fixedColumnsStorageKey) || '{}');
      return Object.entries(stored || {}).reduce((map, [key, value]) => {
        if (value === 'left' || value === 'right') map[key] = value;
        return map;
      }, { ...defaultFixedColumnMap } as Record<string, 'left' | 'right'>);
    } catch (error) {
      return defaultFixedColumnMap;
    }
  });
  const [columnOrderKeys, setColumnOrderKeys] = useState<string[]>(() => {
    if (typeof window === 'undefined') return allColumnKeys;
    try {
      const stored = JSON.parse(window.localStorage.getItem(columnOrderStorageKey) || '[]');
      if (!Array.isArray(stored) || stored.length === 0) return allColumnKeys;
      return [
        ...stored.map(String).filter(key => allColumnKeys.includes(key)),
        ...allColumnKeys.filter(key => !stored.includes(key)),
      ];
    } catch (error) {
      return allColumnKeys;
    }
  });

  const canImport = props.kind === 'refund' ? access.canImportRefundRecords : access.canImportUnrescuedRecords;
  const canWash = props.kind === 'refund' ? access.canWashRefundRecords : access.canWashUnrescuedRecords;
  const canExport = props.kind === 'refund' ? access.canExportRefundRecords : access.canExportUnrescuedRecords;

  const identityOptions = useMemo(() => {
    const values = new Set<string>();
    (washOptions.identities || []).forEach((value: string) => {
      if (value) values.add(value);
    });
    data.forEach(item => {
      if (item.priority_identity) values.add(item.priority_identity);
    });
    return Array.from(values).map(value => ({ label: value, value }));
  }, [washOptions.identities, data]);
  const medicalCategoryOptions = useMemo(() => {
    const values = new Set<string>();
    (washOptions.medical_categories || []).forEach((value: string) => {
      if (value) values.add(value);
    });
    data.forEach(item => {
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
    [...defaultWashRulesByKind(props.kind), ...savedWashRules].forEach(rule => {
      if (rule?.code) map.set(rule.code, rule.name || rule.code);
    });
    return map;
  }, [savedWashRules]);

  const sortable = (field: string) => ({
    sorter: true,
    sortOrder: sortState.field === field ? sortState.order : null,
  });
  const moneyCell = (value: any) => {
    if (value === null || value === undefined || value === '') return '-';
    const numberValue = Number(value);
    return Number.isNaN(numberValue) ? String(value) : numberValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const dateTimeCell = (value: any) => {
    if (!value) return '-';
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : String(value);
  };
  const renderWashRuleName = (code: string) => {
    if (!code) return '-';
    const name = washRuleNameByCode.get(code) || code;
    return (
      <Tooltip title={code}>
        <Tag color={name === code ? 'default' : 'blue'}>{name}</Tag>
      </Tooltip>
    );
  };

  const fetchData = async (page = current, size = pageSize, overrideFilters?: any, overrideSortState = sortState) => {
    setLoading(true);
    try {
      const query = overrideFilters || filters;
      const sortParams = overrideSortState?.field && overrideSortState?.order
        ? { sort_field: overrideSortState.field, sort_order: overrideSortState.order }
        : {};
      const [listRes, statRes] = await Promise.all([
        props.list({ ...query, ...sortParams, page, page_size: size }),
        props.statistics(query),
      ]);
      if (listRes.code === 0) {
        setData(listRes.data?.list || []);
        setTotal(listRes.data?.total || 0);
        setCurrent(listRes.data?.page || page);
        setPageSize(listRes.data?.page_size || size);
      }
      if (statRes.code === 0) setStats(statRes.data || {});
    } catch (error) {
      message.error(`获取${props.title}失败`);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (overrideFilters?: any) => {
    try {
      const statRes = await props.statistics(overrideFilters || filters);
      if (statRes.code === 0) setStats(statRes.data || {});
    } catch (error) {
      // Progress polling should stay quiet; table refreshes show user-facing errors.
    }
  };

  const loadBasics = async () => {
    try {
      const [townRes, washRes, diseaseRes, optionRes] = await Promise.all([
        getTownOptions(),
        props.washConfig(),
        getDiseaseConfigs({ page: 1, page_size: 1000, status: 1 }),
        getUnrescuedWashOptions({ settlement_period: filters.settlement_period }),
      ]);
      if (townRes.code === 0) setTowns(townRes.data || []);
      if (diseaseRes.code === 0) setDiseaseOptions(diseaseRes.data?.list || []);
      if (optionRes.code === 0) setWashOptions(optionRes.data || { medical_categories: [], identities: [] });
      const rules = washRes.code === 0 ? mergeWashRules(washRes.data?.data || [], props.kind) : mergeWashRules([], props.kind);
      setWashRules(rules);
      setSavedWashRules(rules);
    } catch (error) {
      const rules = mergeWashRules([], props.kind);
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
      if (!isSuccessResponse(res)) return;
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

    if (!props.washStatus) return;
    try {
      const res = await props.washStatus({ settlement_period: period });
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

  const openImport = (type: 'primary' | 'object') => {
    setImportType(type);
    setFileList([]);
    setImportVisible(true);
  };

  const handleImport = async () => {
    if (!filters.settlement_period) {
      message.warning('请先选择清算期');
      return;
    }
    if (!fileList.length) {
      message.warning('请选择CSV文件');
      return;
    }
    const formData = new FormData();
    formData.append('file', fileList[0] as any);
    formData.append('settlement_period', filters.settlement_period);
    setUploading(true);
    try {
      const res = importType === 'primary' ? await props.primaryImport(formData) : await props.objectImport(formData);
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
    const filename = templateMap[props.kind]?.[importType];
    if (!filename) return;
    const link = document.createElement('a');
    link.href = `/assets/templates/unrescued/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const submitWash = async () => {
    if (!filters.settlement_period) {
      message.warning('请先选择清算期');
      return;
    }
    const res = await props.executeWash({ settlement_period: filters.settlement_period });
    if (res.code === 0) {
      const uuid = res.data?.uuid;
      if (uuid) {
        cacheWashTask(filters.settlement_period, uuid);
        setWashTask({ uuid, status: 'pending', progress: 0, title: `${props.title}_筛查_筛查规则` });
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
    const res = await props.saveWashConfig({ name: `${props.title}筛查规则`, rules: normalizedRules });
    if (res.code === 0) {
      message.success('规则已保存');
      const nextRules = mergeWashRules(res.data?.data || washRules, props.kind);
      setWashRules(nextRules);
      setSavedWashRules(nextRules);
      setWashEditing(false);
    }
  };

  const resetFilters = () => {
    const nextFilters = { settlement_period: filters.settlement_period, keyword: '' };
    setFilters(nextFilters);
    setFilterExpanded(false);
    fetchData(1, pageSize, nextFilters);
  };

  const doExport = async () => {
    const count = Number(stats.exportCount || 0);
    if (count <= 0) {
      message.warning(`当前筛选条件下暂无未剔除数据，不能导出${props.title}表`);
      return;
    }
    Modal.confirm({
      title: `确定导出 ${props.title}表吗？`,
      content: `当前筛选条件下将导出 ${count} 条记录。`,
      okText: '确定导出',
      cancelText: '取消',
      onOk: async () => {
        const res = await props.exportData({ filters });
        if (res.code === 0) {
          message.success('导出任务已提交，请在任务中心查看进度');
          window.dispatchEvent(new CustomEvent('openTaskCenter'));
        } else {
          message.error(res.message || res.msg || '导出失败');
        }
      },
    });
  };

  const updateRule = (index: number, patch: any) => {
    if (!washEditing) return;
    setWashRules(prev => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  };

  const persistVisibleColumns = (keys: string[]) => {
    const nextKeys = Array.from(new Set([...keys, ...requiredColumnKeys]));
    setVisibleColumnKeys(nextKeys);
    window.localStorage.setItem(visibleColumnsStorageKey, JSON.stringify(nextKeys));
  };
  const persistFixedColumns = (nextMap: Record<string, 'left' | 'right'>) => {
    setFixedColumnMap(nextMap);
    window.localStorage.setItem(fixedColumnsStorageKey, JSON.stringify(nextMap));
  };
  const persistColumnOrder = (nextKeys: string[]) => {
    const normalizedKeys = [
      ...nextKeys.filter(key => allColumnKeys.includes(key)),
      ...allColumnKeys.filter(key => !nextKeys.includes(key)),
    ];
    setColumnOrderKeys(normalizedKeys);
    window.localStorage.setItem(columnOrderStorageKey, JSON.stringify(normalizedKeys));
  };
  const moveColumn = (sourceKey: string, targetKey: string) => {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    const nextKeys = [...columnOrderKeys];
    const sourceIndex = nextKeys.indexOf(sourceKey);
    const targetIndex = nextKeys.indexOf(targetKey);
    if (sourceIndex < 0 || targetIndex < 0) return;
    nextKeys.splice(sourceIndex, 1);
    nextKeys.splice(targetIndex, 0, sourceKey);
    persistColumnOrder(nextKeys);
  };
  const updateColumnFixed = (key: string, value: string) => {
    const nextMap = { ...fixedColumnMap };
    if (value === 'left' || value === 'right') nextMap[key] = value;
    else delete nextMap[key];
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
    { key: 'match_status', title: '匹配状态', dataIndex: 'match_status', width: 110, ...sortable('match_status'), render: (v: string) => <Tag color={v === '已匹配' ? 'green' : 'red'}>{v || '-'}</Tag> },
    { key: 'street_town', title: '镇街', dataIndex: 'street_town', width: 150, render: (v: string) => <EllipsisText value={v} maxWidth={132} /> },
    { key: 'village', title: '村社', dataIndex: 'village', width: 140, render: (v: string) => <EllipsisText value={v} maxWidth={122} /> },
    { key: 'priority_identity', title: '身份', dataIndex: 'priority_identity', width: 190, ...sortable('priority_identity'), render: (v: string) => <EllipsisText value={v} maxWidth={172} /> },
    { key: 'medical_category', title: '医疗类别', dataIndex: 'medical_category', width: 150, ...sortable('medical_category'), render: (v: string) => <EllipsisText value={v} maxWidth={112} /> },
    { key: 'disease_code', title: props.kind === 'refund' ? '疾病编码' : '病种编码', dataIndex: 'disease_code', width: 130, ...sortable('disease_code'), render: (v: string) => <EllipsisText value={v} maxWidth={112} /> },
    { key: 'disease_name', title: props.kind === 'refund' ? '疾病名称' : '病种名称', dataIndex: 'disease_name', width: 170, ...sortable('disease_name'), render: (v: string) => <EllipsisText value={v} maxWidth={152} /> },
    { key: 'hospital_name', title: '医药机构', dataIndex: 'hospital_name', width: 240, ...sortable('hospital_name'), render: (v: string) => <EllipsisText value={v} maxWidth={222} /> },
    { key: 'hospital_code', title: '机构编码', dataIndex: 'hospital_code', width: 190, ...sortable('hospital_code'), render: (v: string) => <EllipsisText value={v} maxWidth={132} /> },
    { key: 'admission_date', title: '入院时间', dataIndex: 'admission_date', width: 120, ...sortable('admission_date') },
    { key: 'discharge_date', title: '出院时间', dataIndex: 'discharge_date', width: 120, ...sortable('discharge_date') },
    { key: 'settlement_time', title: '结算时间', dataIndex: 'settlement_time', width: 180, ...sortable('settlement_time') },
    { key: 'total_fee', title: '医疗总费用', dataIndex: 'total_fee', width: 120, align: 'right' as const, ...sortable('total_fee'), render: moneyCell },
    { key: 'policy_fee', title: '政策范围费用', dataIndex: 'policy_fee', width: 140, align: 'right' as const, ...sortable('policy_fee'), render: moneyCell },
    { key: 'pool_fund_pay', title: '统筹报销', dataIndex: 'pool_fund_pay', width: 120, align: 'right' as const, ...sortable('pool_fund_pay'), render: moneyCell },
    { key: 'large_amount_pay', title: '大额报销', dataIndex: 'large_amount_pay', width: 120, align: 'right' as const, ...sortable('large_amount_pay'), render: moneyCell },
    { key: 'serious_illness_pay', title: '大病报销', dataIndex: 'serious_illness_pay', width: 120, align: 'right' as const, ...sortable('serious_illness_pay'), render: moneyCell },
    ...(props.kind === 'refund'
      ? [
        { key: 'medical_assistance_pay', title: '医疗救助金额', dataIndex: 'medical_assistance_pay', width: 140, align: 'right' as const, ...sortable('medical_assistance_pay'), render: moneyCell },
        { key: 'yukuaibao_pay', title: '渝快保报销金额', dataIndex: 'yukuaibao_pay', width: 150, align: 'right' as const, ...sortable('yukuaibao_pay'), render: moneyCell },
      ]
      : []),
    { key: 'used_outpatient_rescue', title: '已用门诊救助', dataIndex: 'used_outpatient_rescue', width: 140, align: 'right' as const, ...sortable('used_outpatient_rescue'), render: moneyCell },
    { key: 'used_normal_rescue', title: '已用普通住院救助', dataIndex: 'used_normal_rescue', width: 160, align: 'right' as const, ...sortable('used_normal_rescue'), render: moneyCell },
    { key: 'used_major_rescue', title: '已用重特大救助', dataIndex: 'used_major_rescue', width: 160, align: 'right' as const, ...sortable('used_major_rescue'), render: moneyCell },
    { key: 'used_large_fee_rescue', title: '已用大额费用救助', dataIndex: 'used_large_fee_rescue', width: 160, align: 'right' as const, ...sortable('used_large_fee_rescue'), render: moneyCell },
    { key: 'calc_reimbursement_amount', title: '进入报销金额', dataIndex: 'calc_reimbursement_amount', width: 150, align: 'right' as const, ...sortable('calc_reimbursement_amount'), render: moneyCell },
    { key: 'status', title: '状态', dataIndex: 'status', width: 110, ...sortable('status'), render: (v: string) => <Tag color={statusColors[v] || 'default'}>{v}</Tag> },
    { key: 'exclude_status', title: '剔除', dataIndex: 'exclude_status', width: 100, ...sortable('exclude_status'), render: (v: string) => <Tag color={v === '已剔除' ? 'red' : 'green'}>{v}</Tag> },
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
  const configuredVisibleColumns = orderedColumns.filter(column => visibleColumnKeys.includes(String(column.key))).map(column => {
    const fixed = fixedColumnMap[String(column.key)];
    return fixed ? { ...column, fixed } : { ...column, fixed: undefined };
  });
  const visibleColumns = [
    ...configuredVisibleColumns.filter(column => column.fixed === 'left'),
    ...configuredVisibleColumns.filter(column => !column.fixed),
    ...configuredVisibleColumns.filter(column => column.fixed === 'right'),
  ];
  const tableScrollX = Math.max(visibleColumns.reduce((sum, column) => sum + Number(column.width || 120), 0) + 64, 980);
  const columnSettingContent = (
    <Space direction="vertical" size={10} style={{ width: 360 }}>
      <div style={{ maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
        {orderedColumns.map(column => {
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
                moveColumn(event.dataTransfer.getData('text/plain') || draggedColumnKey, key);
                setDraggedColumnKey('');
              }}
              onDragEnd={() => setDraggedColumnKey('')}
              style={{ display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr) 68px', gap: 8, alignItems: 'center', padding: '5px 0', opacity: draggedColumnKey === key ? 0.45 : 1 }}
            >
              <HolderOutlined style={{ color: '#94a3b8', cursor: 'grab' }} />
              <Checkbox
                checked={checked}
                disabled={required}
                onChange={event => {
                  const nextKeys = event.target.checked ? [...visibleColumnKeys, key] : visibleColumnKeys.filter(item => item !== key);
                  persistVisibleColumns(nextKeys);
                }}
              >
                {column.title as React.ReactNode}
              </Checkbox>
              <Space size={2}>
                <Tooltip title={fixed === 'left' ? '取消左侧固定' : '固定左侧'}>
                  <Button size="small" type={fixed === 'left' ? 'primary' : 'text'} disabled={!checked} icon={<VerticalRightOutlined />} onClick={() => updateColumnFixed(key, fixed === 'left' ? 'none' : 'left')} style={{ width: 30 }} />
                </Tooltip>
                <Tooltip title={fixed === 'right' ? '取消右侧固定' : '固定右侧'}>
                  <Button size="small" type={fixed === 'right' ? 'primary' : 'text'} disabled={!checked} icon={<VerticalLeftOutlined />} onClick={() => updateColumnFixed(key, fixed === 'right' ? 'none' : 'right')} style={{ width: 30 }} />
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
    { title: '启用', dataIndex: 'enabled', width: 80, render: (v: boolean, _: any, index: number) => <Switch size="small" checked={v !== false} disabled={!washEditing} onChange={checked => updateRule(index, { enabled: checked })} /> },
    { title: '规则项', dataIndex: 'name', width: 220 },
    {
      title: '处理方式',
      width: 120,
      render: (_: any, record: any, index: number) => (
        <Select
          style={{ width: 96 }}
          disabled={!washEditing}
          value={record.action || 'exclude'}
          onChange={value => updateRule(index, { action: value })}
          options={[
            { label: '保留', value: 'keep' },
            { label: '剔除', value: 'exclude' },
          ]}
        />
      ),
    },
    {
      title: '条件值',
      width: 520,
      render: (_: any, record: any, index: number) => {
        if (record.code === 'outpatient_major_disease') {
          const categoryOptions = Array.from(new Set([
            ...medicalCategoryOptions.map((item: any) => item.value),
            ...(record.medical_categories || []),
          ].filter(Boolean))).map(value => ({ label: value, value }));
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
                  options={categoryOptions}
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
                message={<Typography.Text strong>命中后状态标记为“拟通知2”，并跳过后续规则。</Typography.Text>}
              />
            </Space>
          );
        }
        if (record.condition_text) {
          return <Typography.Text type="secondary">{record.condition_text}</Typography.Text>;
        }
        if (Array.isArray(record.values)) {
          return (
            <Select
              mode="tags"
              disabled={!washEditing}
              tokenSeparators={['、', ',', '，', '\n']}
              style={{ width: '100%' }}
              value={record.values || []}
              onChange={values => updateRule(index, { values })}
            />
          );
        }
        return (
          <Input
            disabled={!washEditing || !!record.compare_field}
            value={record.compare_field ? '医保政策范围费用' : record.value}
            onChange={event => updateRule(index, { value: event.target.value, compare_field: undefined })}
          />
        );
      },
    },
    { title: '筛查备注', width: 240, render: (_: any, record: any, index: number) => <Input disabled={!washEditing} value={record.remark} onChange={event => updateRule(index, { remark: event.target.value })} /> },
  ];
  const statCards = [
    { key: 'total', label: '当前记录', color: '#1677ff' },
    { key: 'matched', label: '已匹配', color: '#13a8a8' },
    { key: 'unmatched', label: '未匹配', color: '#faad14' },
    { key: 'toNotice1', label: '拟通知1', color: '#1677ff' },
    { key: 'toNotice2', label: '拟通知2', color: '#fa8c16' },
    { key: 'excluded', label: '已剔除', color: '#f5222d' },
    { key: 'exportCount', label: '可导出', color: '#52c41a' },
  ];
  const isWashRunning = !!washTask?.uuid && ['pending', 'processing'].includes(washTask.status);
  const canExecuteWash = !isWashRunning && !washEditing && savedWashRules.some(rule => rule.enabled === true);
  const washExecuteTip = isWashRunning ? '筛查任务正在执行中' : washEditing ? '请先保存或取消筛查规则编辑' : '请配置并启用至少一条筛查规则';

  return (
    <div>
      <Card size="small" style={{ ...cardStyle, marginBottom: 12 }}>
        <div style={filterRowStyle}>
          <DatePicker
            picker="month"
            allowClear={false}
            style={{ width: '100%' }}
            value={filters.settlement_period ? dayjs(filters.settlement_period, 'YYYYMM') : undefined}
            onChange={value => {
              const settlementPeriod = value ? value.format('YYYYMM') : '';
              if (settlementPeriod) window.localStorage.setItem(settlementPeriodStorageKey, settlementPeriod);
              const nextFilters = { ...filters, settlement_period: settlementPeriod };
              setFilters(nextFilters);
              fetchData(1, pageSize, nextFilters);
            }}
          />
          <Input allowClear placeholder="身份证/姓名/序号" value={filters.keyword} onChange={event => setFilters({ ...filters, keyword: event.target.value })} />
          <Select allowClear showSearch placeholder="医疗类别" value={filters.medical_category} onChange={value => setFilters({ ...filters, medical_category: value })} options={medicalCategoryOptions} />
          <Select allowClear showSearch mode="multiple" {...compactTagSelectProps} placeholder="身份类别" value={filters.priority_identity} onChange={value => setFilters({ ...filters, priority_identity: value })} options={identityOptions} />
          <div style={filterActionsStyle}>
            <Button type="primary" onClick={() => fetchData(1, pageSize)}>查询</Button>
            <Button icon={<ReloadOutlined />} onClick={() => fetchData(current, pageSize)} loading={loading}>刷新</Button>
            <Button onClick={resetFilters}>重置</Button>
            <Button icon={<MoreOutlined />} onClick={() => setFilterExpanded(value => !value)}>{filterExpanded ? '收起筛选' : '更多筛选'}</Button>
          </div>
        </div>
        {filterExpanded && (
          <div style={moreFilterRowStyle}>
            <Select allowClear placeholder="镇街" value={filters.town_id} onChange={value => setFilters({ ...filters, town_id: value })} options={towns.map((item: any) => ({ label: item.name, value: item.id }))} />
            <Input allowClear placeholder="机构名称" value={filters.hospital_name} onChange={event => setFilters({ ...filters, hospital_name: event.target.value })} />
            <Select allowClear mode="multiple" {...compactTagSelectProps} placeholder="状态" value={filters.status} onChange={value => setFilters({ ...filters, status: value })} options={allStatusOptions.map(value => ({ label: value, value }))} />
            <Select allowClear placeholder="匹配状态" value={filters.match_status} onChange={value => setFilters({ ...filters, match_status: value })} options={matchStatusOptions.map(value => ({ label: value, value }))} />
            <Select allowClear placeholder="剔除" value={filters.exclude_status} onChange={value => setFilters({ ...filters, exclude_status: value })} options={['未剔除', '已剔除'].map(value => ({ label: value, value }))} />
            <Select allowClear placeholder="筛查命中规则" value={filters.exclude_rule_code} onChange={value => setFilters({ ...filters, exclude_rule_code: value })} options={washRuleOptions} />
            <Select
              allowClear
              showSearch
              mode="tags"
              {...compactTagSelectProps}
              placeholder={props.kind === 'refund' ? '疾病编码/名称' : '病种编码/名称'}
              value={filters.disease_keyword}
              onChange={value => setFilters({ ...filters, disease_keyword: value, disease_code: undefined, disease_name: undefined })}
              options={diseaseOptions.map((item: any) => ({
                label: `${item.disease_code} ${item.disease_name}`,
                value: item.disease_code,
              }))}
              optionFilterProp="label"
            />
            <Input allowClear placeholder="备注" value={filters.remark} onChange={event => setFilters({ ...filters, remark: event.target.value })} />
          </div>
        )}
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

      <Card size="small" style={{ ...cardStyle, marginBottom: 12 }}>
        <div style={toolbarStyle}>
          <div style={toolbarSideStyle}>
            {canImport && (
              <>
                <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => openImport('primary')}>{props.primaryImportLabel}</Button>
                <Button icon={<CloudUploadOutlined />} onClick={() => openImport('object')}>导入 救助对象名单</Button>
                <div style={toolbarDividerStyle} />
              </>
            )}
            {canWash && (
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
            <Popover trigger="click" placement="bottomRight" title="列显示" content={columnSettingContent}>
              <Button icon={<SettingOutlined />}>列设置</Button>
            </Popover>
            {canExport && (
              <Button icon={<DownloadOutlined />} onClick={doExport}>
                导出 {props.title}表{Number(stats.exportCount || 0) > 0 ? `（${stats.exportCount}）` : ''}
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

      {canWash && (
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
                            <Button size="small" onClick={() => { setWashRules(savedWashRules); setWashEditing(false); }}>取消</Button>
                          </>
                        ) : (
                          <Button size="small" icon={<EditOutlined />} onClick={() => { setSavedWashRules(washRules); setWashEditing(true); }}>编辑</Button>
                        )}
                        <span>{washEditing ? '未救助明细与应补应退明细分别保存配置；可编辑当前台账规则后保存。' : '当前为只读状态，点击“编辑”后可修改当前台账筛查规则。'}</span>
                      </Space>
                    )}
                  />
                  <Table rowKey="code" size="small" pagination={false} dataSource={washRules} columns={washColumns} scroll={{ x: 1180 }} />
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
          showTotal: value => `共 ${value} 条记录`,
        }}
      />

      <Modal
        title={importType === 'primary' ? props.primaryImportLabel : '导入 救助对象名单'}
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
          description={(
            <Space direction="vertical" size={8}>
              <span>1. 当前清算期：{filters.settlement_period}</span>
              <span>2. 仅支持 .csv 格式，编码自动识别 UTF-8/GBK</span>
              <span>{importType === 'primary' ? `3. 导入${props.title}数据` : '3. 按身份证号匹配当月明细，补全镇街、村社和身份信息'}</span>
              <Button type="link" icon={<DownloadOutlined />} onClick={downloadTemplate} style={{ padding: 0, height: 'auto' }}>
                下载导入模板
              </Button>
            </Space>
          )}
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

export default LedgerPage;
