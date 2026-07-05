import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Dropdown,
  Form,
  Input,
  message,
  Modal,
  Popover,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloudUploadOutlined,
  CopyOutlined,
  DownloadOutlined,
  EditOutlined,
  HolderOutlined,
  InboxOutlined,
  MoreOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SendOutlined,
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
  distributeNoticeRecords,
  exportNoticeRecords,
  feedbackNoticeRecords,
  getDiseaseConfigs,
  getNoticeRecords,
  getNoticeReceiveStatus,
  getNoticeStatistics,
  getUnrescuedWashOptions,
  importNoticeRecords,
  markNoticeReimbursement,
  notifyNoticeRecords,
  receiveNoticeRecords,
  saveNoticeAdminRemark,
  undistributeNoticeRecords,
  unnotifyNoticeRecords,
} from '@/services/unrescued';

const statusOptions = ['待下放', '已下放', '已接收', '已通知'];
const reimbursementOptions = ['未报销', '已报销'];

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

const markPaidButtonStyle: React.CSSProperties = {
  color: '#389e0d',
};

const markUnpaidButtonStyle: React.CSSProperties = {
  color: '#d46b08',
};

const filterRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '200px minmax(280px, 1fr) minmax(220px, 1fr) minmax(240px, 1fr) max-content',
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

const defaultSettlementPeriod = () => {
  if (typeof window === 'undefined') return dayjs().format('YYYYMM');
  const stored = window.localStorage.getItem('unrescued.notice.records.settlement_period') || '';
  return /^\d{6}$/.test(stored) && dayjs(stored, 'YYYYMM').isValid() ? stored : dayjs().format('YYYYMM');
};

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

const NoticeRecords: React.FC = () => {
  const access = useAccess();
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const isTownUser = Number(currentUser?.town_id || 0) > 0;
  const [editForm] = Form.useForm();
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [towns, setTowns] = useState<any[]>([]);
  const [diseaseOptions, setDiseaseOptions] = useState<any[]>([]);
  const [washOptions, setWashOptions] = useState<any>({ medical_categories: [], identities: [] });
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [importVisible, setImportVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [distributeVisible, setDistributeVisible] = useState(false);
  const [selectedTownIds, setSelectedTownIds] = useState<number[]>([]);
  const [editVisible, setEditVisible] = useState(false);
  const [editType, setEditType] = useState<'feedback' | 'admin_remark'>('feedback');
  const [receiveVisible, setReceiveVisible] = useState(false);
  const [pendingReceiveCount, setPendingReceiveCount] = useState(0);
  const [receiving, setReceiving] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [sortState, setSortState] = useState<any>({});
  const [draggedColumnKey, setDraggedColumnKey] = useState('');
  const [filters, setFilters] = useState<any>({
    settlement_period: defaultSettlementPeriod(),
    keyword: '',
  });

  const requiredColumnKeys = ['settlement_period', 'name', 'id_card'];
  const allColumnKeys = [
    'settlement_period',
    'sequence_no',
    'name',
    'id_card',
    'priority_identity',
    'street_town',
    'insurance_place',
    'insurance_category',
    'hospital_name',
    'medical_category',
    'disease_code',
    'disease_name',
    'admission_date',
    'discharge_date',
    'settlement_time',
    'total_fee',
    'policy_fee',
    'pool_fund_pay',
    'large_amount_pay',
    'serious_illness_pay',
    'medical_assistance_pay',
    'yukuaibao_pay',
    'personal_account_pay',
    'personal_cash_pay',
    ...(!isTownUser ? ['calc_reimbursement_amount'] : []),
    'status',
    'reimbursement_status',
    'system_remark',
    'contact_name',
    'contact_phone',
    'bank_name',
    'bank_account_name',
    'bank_account_no',
    'town_remark',
    ...(!isTownUser ? ['admin_remark'] : []),
    'distributed_at',
    'received_at',
    'notified_at',
    'reimbursed_at',
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
    'priority_identity',
    'street_town',
    'hospital_name',
    ...(!isTownUser ? ['calc_reimbursement_amount'] : []),
    'status',
    'reimbursement_status',
    'system_remark',
    'contact_name',
    'contact_phone',
    'bank_name',
    'bank_account_name',
    'bank_account_no',
    'town_remark',
    ...(!isTownUser ? ['admin_remark'] : []),
  ];
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(() => {
    if (typeof window === 'undefined') return defaultVisibleColumnKeys;
    try {
      const stored = JSON.parse(window.localStorage.getItem('unrescued.notice.records.visible_columns') || '[]');
      return Array.isArray(stored) && stored.length > 0
        ? Array.from(new Set([...stored.map(String).filter(key => allColumnKeys.includes(key)), ...requiredColumnKeys]))
        : defaultVisibleColumnKeys;
    } catch (error) {
      return defaultVisibleColumnKeys;
    }
  });
  const [fixedColumnMap, setFixedColumnMap] = useState<Record<string, 'left' | 'right'>>(() => {
    if (typeof window === 'undefined') return defaultFixedColumnMap;
    try {
      const stored = JSON.parse(window.localStorage.getItem('unrescued.notice.records.fixed_columns') || '{}');
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
      const stored = JSON.parse(window.localStorage.getItem('unrescued.notice.records.column_order') || '[]');
      if (!Array.isArray(stored) || stored.length === 0) return allColumnKeys;
      return [
        ...stored.map(String).filter(key => allColumnKeys.includes(key)),
        ...allColumnKeys.filter(key => !stored.includes(key)),
      ];
    } catch (error) {
      return allColumnKeys;
    }
  });

  useEffect(() => {
    if (isTownUser) {
      setVisibleColumnKeys(prev => prev.filter(key => !['calc_reimbursement_amount', 'admin_remark'].includes(key)));
      setColumnOrderKeys(prev => prev.filter(key => !['calc_reimbursement_amount', 'admin_remark'].includes(key)));
    }
  }, [isTownUser]);

  const townOptions = useMemo(() => towns.map((item: any) => ({ label: item.name, value: item.id })), [towns]);
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
  const selectedIds = () => selectedRowKeys.map(Number);
  const selectedRows = useMemo(() => data.filter(item => selectedRowKeys.includes(item.id)), [data, selectedRowKeys]);
  const sortable = (field: string) => ({ sorter: true, sortOrder: sortState.field === field ? sortState.order : null });
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
      const [listRes, statRes] = await Promise.all([
        getNoticeRecords({ ...query, ...sortParams, page, page_size: size }),
        getNoticeStatistics(query),
      ]);
      if (listRes.code === 0) {
        setData(listRes.data?.list || []);
        setTotal(listRes.data?.total || 0);
        setCurrent(listRes.data?.page || page);
        setPageSize(listRes.data?.page_size || size);
      }
      if (statRes.code === 0) setStats(statRes.data || {});
    } catch (error) {
      message.error('获取下放通知失败');
    } finally {
      setLoading(false);
    }
  };

  const checkPendingReceive = async (period = filters.settlement_period) => {
    if (!isTownUser || !period) {
      setReceiveVisible(false);
      setPendingReceiveCount(0);
      return;
    }
    try {
      const res = await getNoticeReceiveStatus({ settlement_period: period });
      if (res.code === 0) {
        const count = Number(res.data?.pending_count || 0);
        setPendingReceiveCount(count);
        setReceiveVisible(count > 0);
      }
    } catch (error) {
      // 列表刷新仍可继续，接收提示稍后重试。
    }
  };

  useEffect(() => {
    Promise.all([
      getTownOptions(),
      getDiseaseConfigs({ page: 1, page_size: 1000, status: 1 }),
      getUnrescuedWashOptions({ settlement_period: filters.settlement_period }),
    ]).then(([townRes, diseaseRes, optionRes]) => {
      if (townRes.code === 0) setTowns(townRes.data || []);
      if (diseaseRes.code === 0) setDiseaseOptions(diseaseRes.data?.list || []);
      if (optionRes.code === 0) setWashOptions(optionRes.data || { medical_categories: [], identities: [] });
    });
    fetchData(1, pageSize);
    checkPendingReceive(filters.settlement_period);
  }, []);

  useEffect(() => {
    checkPendingReceive(filters.settlement_period);
  }, [isTownUser, currentUser?.town_id, filters.settlement_period]);

  const resetFilters = () => {
    const nextFilters = { settlement_period: filters.settlement_period, keyword: '' };
    setFilters(nextFilters);
    setSelectedRowKeys([]);
    setFilterExpanded(false);
    fetchData(1, pageSize, nextFilters);
  };

  const submitImport = async () => {
    if (!fileList.length) {
      message.warning('请选择CSV文件');
      return;
    }
    const formData = new FormData();
    formData.append('file', fileList[0] as any);
    formData.append('settlement_period', filters.settlement_period);
    setUploading(true);
    try {
      const res = await importNoticeRecords(formData);
      if (res.code !== 0) throw new Error(res.message || res.msg || '导入失败');
      message.success('导入任务已提交，请在任务中心查看进度');
      window.dispatchEvent(new CustomEvent('openTaskCenter'));
      setImportVisible(false);
      setFileList([]);
    } catch (error: any) {
      message.error(error.message || '导入失败');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const filename = '导入-下放通知：通知明细模板.csv';
    const link = document.createElement('a');
    link.href = `/assets/templates/unrescued/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const submitDistribute = async () => {
    if (!selectedTownIds.length) {
      message.warning('请选择镇街');
      return;
    }
    const res = await distributeNoticeRecords({ settlement_period: filters.settlement_period, town_ids: selectedTownIds });
    if (res.code === 0) {
      message.success(res.message || `下放成功：${res.data?.affected_rows || 0} 条`);
      if (Number(res.data?.unmatchedTownCount || 0) > 0) {
        message.warning(`${res.data.unmatchedTownCount} 条待下放数据未匹配到镇街，请先修正镇街或补充镇街字典`);
      }
      setDistributeVisible(false);
      setSelectedTownIds([]);
      fetchData(1, pageSize);
    } else {
      message.error(res.message || res.msg || '下放失败');
    }
  };

  const submitReceive = async () => {
    if (!filters.settlement_period) {
      message.warning('请先选择清算期');
      return;
    }
    setReceiving(true);
    try {
      const res = await receiveNoticeRecords({ settlement_period: filters.settlement_period });
      if (res.code === 0) {
        message.success(`接收成功：${res.data?.affected_rows || 0} 条`);
        setReceiveVisible(false);
        setPendingReceiveCount(0);
        fetchData(1, pageSize);
      } else {
        message.error(res.message || res.msg || '接收失败');
      }
    } finally {
      setReceiving(false);
    }
  };

  const openEdit = (type: 'feedback' | 'admin_remark', record?: any) => {
    const nextKeys = record?.id ? [record.id] : selectedRowKeys;
    if (!nextKeys.length) {
      message.warning('请先选择记录');
      return;
    }
    setSelectedRowKeys(nextKeys);
    setEditType(type);
    editForm.resetFields();
    if (record?.id) {
      editForm.setFieldsValue(record);
    } else if (selectedRows.length === 1) {
      editForm.setFieldsValue(selectedRows[0]);
    }
    setEditVisible(true);
  };

  const submitEdit = async () => {
    const values = editForm.getFieldsValue();
    const payload = { ids: selectedIds(), ...values };
    const res = editType === 'feedback' ? await feedbackNoticeRecords(payload) : await saveNoticeAdminRemark(payload);
    if (res.code === 0) {
      message.success('保存成功');
      setEditVisible(false);
      setSelectedRowKeys([]);
      fetchData();
    } else {
      message.error(res.message || res.msg || '保存失败');
    }
  };

  const operationConfirmContent = (record: any | undefined, actionText: string, batchText: string): React.ReactNode => {
    if (!record) return batchText;
    const diseaseText = [record.disease_code, record.disease_name].filter(Boolean).join(' ');
    const fields = [
      ['姓名', record.name],
      ['身份证号', record.id_card],
      ['序号', record.sequence_no],
      ['清算期', record.settlement_period],
      ['就诊医疗机构', record.hospital_name],
      ['疾病', diseaseText],
      ['结算时间', record.settlement_time],
    ].filter(([, value]) => value !== null && value !== undefined && value !== '');
    return (
      <div>
        <div style={{ marginBottom: 10 }}>将对以下记录执行“{actionText}”操作，请核对后确认。</div>
        <div style={{ border: '1px solid #edf0f5', borderRadius: 6, padding: '10px 12px', background: '#fafafa' }}>
          {fields.map(([label, value]) => (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '86px minmax(0, 1fr)', gap: 8, lineHeight: '24px' }}>
              <span style={{ color: '#64748b' }}>{label}</span>
              <Typography.Text ellipsis={{ tooltip: String(value) }} style={{ margin: 0 }}>{String(value)}</Typography.Text>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const markReimbursement = (status: string, ids = selectedIds(), record?: any) => {
    if (!ids.length) {
      message.warning('请先选择记录');
      return;
    }
    Modal.confirm({
      centered: true,
      title: `确定标记为${status}吗？`,
      content: operationConfirmContent(record, `标记为${status}`, `将更新 ${ids.length} 条通知明细的报销状态。`),
      okText: '确认标记',
      cancelText: '取消',
      onOk: async () => {
        const res = await markNoticeReimbursement({ ids, reimbursement_status: status });
        if (res.code === 0) {
          message.success('报销状态已更新');
          setSelectedRowKeys([]);
          fetchData();
        } else {
          message.error(res.message || res.msg || '报销状态更新失败');
        }
      },
    });
  };

  const markNotify = (notified: boolean, ids = selectedIds(), record?: any) => {
    if (!ids.length) {
      message.warning('请先选择记录');
      return;
    }
    Modal.confirm({
      centered: true,
      title: notified ? '确定标记通知吗？' : '确定撤销通知吗？',
      content: operationConfirmContent(
        record,
        notified ? '标记通知' : '撤销通知',
        notified
          ? `将把 ${ids.length} 条已接收通知明细标记为已通知。`
          : `将把 ${ids.length} 条已通知明细恢复为已接收。`,
      ),
      okText: notified ? '确认通知' : '确认撤销',
      cancelText: '取消',
      okButtonProps: notified ? undefined : { danger: true },
      onOk: async () => {
        const res = notified
          ? await notifyNoticeRecords({ ids })
          : await unnotifyNoticeRecords({ ids });
        if (res.code === 0) {
          message.success(notified ? '已标记通知' : '已撤销通知');
          setSelectedRowKeys([]);
          fetchData();
        } else {
          message.error(res.message || res.msg || (notified ? '标记通知失败' : '撤销通知失败'));
        }
      },
    });
  };

  const rollbackDistribute = (ids = selectedIds(), record?: any) => {
    if (!ids.length) {
      message.warning('请先选择记录');
      return;
    }
    Modal.confirm({
      centered: true,
      title: '确定撤销下放吗？',
      content: operationConfirmContent(
        record,
        '撤销下放',
        '仅会撤销状态为“已下放”且镇街尚未接收的记录；已接收或已通知的数据不会被撤销。',
      ),
      okText: '确认撤销',
      cancelText: '取消',
      onOk: async () => {
        const res = await undistributeNoticeRecords({ ids });
        if (res.code === 0) {
          message.success(res.message || `撤销下放成功：${res.data?.affected || 0} 条`);
          if (Number(res.data?.skippedCount || 0) > 0) {
            message.warning(`${res.data.skippedCount} 条未撤销，可能已被镇街接收/通知或不是已下放状态`);
          }
          setSelectedRowKeys([]);
          fetchData();
        } else {
          message.error(res.message || res.msg || '撤销下放失败');
        }
      },
    });
  };

  const doExport = () => {
    Modal.confirm({
      title: '确定导出 通知明细吗？',
      content: `当前筛选条件下将导出 ${stats.total || 0} 条记录。`,
      okText: '确定导出',
      cancelText: '取消',
      onOk: async () => {
        const res = await exportNoticeRecords({ filters: effectiveFilters() });
        if (res.code === 0) {
          message.success('导出任务已提交，请在任务中心查看进度');
          window.dispatchEvent(new CustomEvent('openTaskCenter'));
        } else {
          message.error(res.message || res.msg || '导出失败');
        }
      },
    });
  };

  const persistVisibleColumns = (keys: string[]) => {
    const allowed = isTownUser ? keys.filter(key => !['calc_reimbursement_amount', 'admin_remark'].includes(key)) : keys;
    const nextKeys = Array.from(new Set([...allowed, ...requiredColumnKeys]));
    setVisibleColumnKeys(nextKeys);
    window.localStorage.setItem('unrescued.notice.records.visible_columns', JSON.stringify(nextKeys));
  };
  const persistFixedColumns = (nextMap: Record<string, 'left' | 'right'>) => {
    const map = { ...nextMap };
    if (isTownUser) {
      delete (map as any).calc_reimbursement_amount;
      delete (map as any).admin_remark;
    }
    setFixedColumnMap(map);
    window.localStorage.setItem('unrescued.notice.records.fixed_columns', JSON.stringify(map));
  };
  const persistColumnOrder = (nextKeys: string[]) => {
    const normalized = [
      ...nextKeys.filter(key => allColumnKeys.includes(key)),
      ...allColumnKeys.filter(key => !nextKeys.includes(key)),
    ];
    setColumnOrderKeys(normalized);
    window.localStorage.setItem('unrescued.notice.records.column_order', JSON.stringify(normalized));
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
    { key: 'priority_identity', title: '对象类别', dataIndex: 'priority_identity', width: 190, ...sortable('priority_identity'), render: (v: string) => <EllipsisText value={v} maxWidth={172} /> },
    { key: 'street_town', title: '镇街', dataIndex: 'street_town', width: 150, render: (v: string) => <EllipsisText value={v} maxWidth={132} /> },
    { key: 'insurance_place', title: '参保地', dataIndex: 'insurance_place', width: 140, render: (v: string) => <EllipsisText value={v} maxWidth={122} /> },
    { key: 'insurance_category', title: '参加险种', dataIndex: 'insurance_category', width: 140, render: (v: string) => <EllipsisText value={v} maxWidth={122} /> },
    { key: 'hospital_name', title: '就诊医疗机构', dataIndex: 'hospital_name', width: 240, ...sortable('hospital_name'), render: (v: string) => <EllipsisText value={v} maxWidth={222} /> },
    { key: 'medical_category', title: '医保就诊类别', dataIndex: 'medical_category', width: 150, ...sortable('medical_category'), render: (v: string) => <EllipsisText value={v} maxWidth={112} /> },
    { key: 'disease_code', title: '疾病编码', dataIndex: 'disease_code', width: 130, ...sortable('disease_code'), render: (v: string) => <EllipsisText value={v} maxWidth={112} /> },
    { key: 'disease_name', title: '疾病名称', dataIndex: 'disease_name', width: 170, ...sortable('disease_name'), render: (v: string) => <EllipsisText value={v} maxWidth={152} /> },
    { key: 'admission_date', title: '入院时间', dataIndex: 'admission_date', width: 120, ...sortable('admission_date') },
    { key: 'discharge_date', title: '出院时间', dataIndex: 'discharge_date', width: 120, ...sortable('discharge_date') },
    { key: 'settlement_time', title: '结算时间', dataIndex: 'settlement_time', width: 180, ...sortable('settlement_time') },
    { key: 'total_fee', title: '总费用', dataIndex: 'total_fee', width: 120, align: 'right' as const, ...sortable('total_fee'), render: moneyCell },
    { key: 'policy_fee', title: '政策范围费用', dataIndex: 'policy_fee', width: 140, align: 'right' as const, ...sortable('policy_fee'), render: moneyCell },
    { key: 'pool_fund_pay', title: '统筹报销', dataIndex: 'pool_fund_pay', width: 120, align: 'right' as const, ...sortable('pool_fund_pay'), render: moneyCell },
    { key: 'large_amount_pay', title: '大额报销', dataIndex: 'large_amount_pay', width: 120, align: 'right' as const, ...sortable('large_amount_pay'), render: moneyCell },
    { key: 'serious_illness_pay', title: '大病报销', dataIndex: 'serious_illness_pay', width: 120, align: 'right' as const, ...sortable('serious_illness_pay'), render: moneyCell },
    { key: 'medical_assistance_pay', title: '医疗救助金额', dataIndex: 'medical_assistance_pay', width: 140, align: 'right' as const, ...sortable('medical_assistance_pay'), render: moneyCell },
    { key: 'yukuaibao_pay', title: '渝快保报销金额', dataIndex: 'yukuaibao_pay', width: 150, align: 'right' as const, ...sortable('yukuaibao_pay'), render: moneyCell },
    { key: 'personal_account_pay', title: '个人账户支付', dataIndex: 'personal_account_pay', width: 140, align: 'right' as const, ...sortable('personal_account_pay'), render: moneyCell },
    { key: 'personal_cash_pay', title: '个人现金支付', dataIndex: 'personal_cash_pay', width: 140, align: 'right' as const, ...sortable('personal_cash_pay'), render: moneyCell },
    ...(!isTownUser ? [{ key: 'calc_reimbursement_amount', title: '进入报销金额', dataIndex: 'calc_reimbursement_amount', width: 150, align: 'right' as const, ...sortable('calc_reimbursement_amount'), render: moneyCell }] : []),
    {
      key: 'status',
      title: '下放状态',
      dataIndex: 'status',
      width: 110,
      ...sortable('status'),
      render: (v: string) => <Tag color={v === '已通知' ? 'purple' : v === '已接收' ? 'blue' : v === '已下放' ? 'green' : 'orange'}>{v || '-'}</Tag>,
    },
    { key: 'reimbursement_status', title: '报销状态', dataIndex: 'reimbursement_status', width: 110, ...sortable('reimbursement_status'), render: (v: string) => <Tag color={v === '已报销' ? 'green' : 'default'}>{v || '-'}</Tag> },
    { key: 'system_remark', title: '系统备注', dataIndex: 'system_remark', width: 180, render: (v: string) => <EllipsisText value={v} maxWidth={162} /> },
    { key: 'contact_name', title: '联系人', dataIndex: 'contact_name', width: 120, render: (v: string) => <EllipsisText value={v} maxWidth={102} /> },
    { key: 'contact_phone', title: '联系方式', dataIndex: 'contact_phone', width: 140, render: (v: string) => <EllipsisText value={v} maxWidth={122} /> },
    { key: 'bank_name', title: '开户行', dataIndex: 'bank_name', width: 180, render: (v: string) => <EllipsisText value={v} maxWidth={162} /> },
    { key: 'bank_account_name', title: '户名', dataIndex: 'bank_account_name', width: 120, render: (v: string) => <EllipsisText value={v} maxWidth={102} /> },
    { key: 'bank_account_no', title: '银行账号', dataIndex: 'bank_account_no', width: 180, render: (v: string) => <EllipsisText value={v} maxWidth={162} /> },
    { key: 'town_remark', title: '镇街备注', dataIndex: 'town_remark', width: 180, render: (v: string) => <EllipsisText value={v} maxWidth={162} /> },
    ...(!isTownUser ? [{ key: 'admin_remark', title: '管理员备注', dataIndex: 'admin_remark', width: 180, render: (v: string) => <EllipsisText value={v} maxWidth={162} /> }] : []),
    { key: 'distributed_at', title: '下放时间', dataIndex: 'distributed_at', width: 180, ...sortable('distributed_at'), render: dateTimeCell },
    { key: 'received_at', title: '接收时间', dataIndex: 'received_at', width: 180, ...sortable('received_at'), render: dateTimeCell },
    { key: 'notified_at', title: '通知时间', dataIndex: 'notified_at', width: 180, ...sortable('notified_at'), render: dateTimeCell },
    { key: 'reimbursed_at', title: '报销时间', dataIndex: 'reimbursed_at', width: 180, ...sortable('reimbursed_at'), render: dateTimeCell },
    { key: 'created_at', title: '创建时间', dataIndex: 'created_at', width: 180, ...sortable('created_at'), render: dateTimeCell },
    { key: 'updated_at', title: '更新时间', dataIndex: 'updated_at', width: 180, ...sortable('updated_at'), render: dateTimeCell },
  ];
  const actionColumn = {
    key: '__actions',
    title: '操作',
    width: isTownUser ? 170 : 210,
    fixed: 'right' as const,
    render: (_: any, record: any) => (
      <Space size={0} wrap>
        {isTownUser ? (
          <>
            <Button type="link" size="small" onClick={() => openEdit('feedback', record)}>回填</Button>
            {record.status === '已接收' && (
              <Button type="link" size="small" onClick={() => markNotify(true, [Number(record.id)], record)}>通知</Button>
            )}
            {record.status === '已通知' && (
              <Button type="link" danger size="small" onClick={() => markNotify(false, [Number(record.id)], record)}>撤销通知</Button>
            )}
          </>
        ) : (
          <>
            {access.canRemarkNoticeRecords && (
              <Button type="link" size="small" onClick={() => openEdit('admin_remark', record)}>备注</Button>
            )}
            {access.canDistributeNoticeRecords && record.status === '已下放' && (
              <Button type="link" danger size="small" onClick={() => rollbackDistribute([Number(record.id)], record)}>撤销下放</Button>
            )}
            {access.canMarkNoticeReimbursement && (
              <Button
                type="link"
                size="small"
                style={record.reimbursement_status === '已报销' ? markUnpaidButtonStyle : markPaidButtonStyle}
                onClick={() => markReimbursement(record.reimbursement_status === '已报销' ? '未报销' : '已报销', [Number(record.id)], record)}
              >
                {record.reimbursement_status === '已报销' ? '未报销' : '已报销'}
              </Button>
            )}
          </>
        )}
      </Space>
    ),
  };
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
    actionColumn,
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
  const batchMenuItems = [
    { key: 'feedback', label: '回填信息', icon: <EditOutlined />, disabled: !selectedRowKeys.length },
    ...(isTownUser ? [
      { type: 'divider' as const },
      { key: 'notify', label: '标记 通知', icon: <SendOutlined />, disabled: !selectedRowKeys.length },
      { key: 'unnotify', label: '撤销通知', icon: <RollbackOutlined />, danger: true, disabled: !selectedRowKeys.length },
    ] : []),
    ...(!isTownUser && access.canDistributeNoticeRecords ? [
      { type: 'divider' as const },
      { key: 'undistribute', label: '撤销下放', icon: <RollbackOutlined />, disabled: !selectedRowKeys.length },
    ] : []),
    ...(!isTownUser && access.canRemarkNoticeRecords ? [{ key: 'admin_remark', label: '管理员备注', icon: <EditOutlined />, disabled: !selectedRowKeys.length }] : []),
    ...(!isTownUser && access.canMarkNoticeReimbursement ? [
      { type: 'divider' as const },
      { key: 'paid', label: '标记 已报销', icon: <CheckCircleOutlined />, disabled: !selectedRowKeys.length },
      { key: 'unpaid', label: '标记 未报销', icon: <CloseCircleOutlined />, disabled: !selectedRowKeys.length },
    ] : []),
  ];
  const statCards = [
    { key: 'total', label: '当前记录', color: '#1677ff' },
    { key: 'pending', label: '待下放', color: '#fa8c16' },
    { key: 'distributed', label: '已下放', color: '#13a8a8' },
    { key: 'received', label: '已接收', color: '#1677ff' },
    { key: 'notified', label: '已通知', color: '#722ed1' },
    { key: 'unpaid', label: '未报销', color: '#faad14' },
    { key: 'paid', label: '已报销', color: '#52c41a' },
  ].filter(item => !isTownUser || !['pending', 'distributed'].includes(item.key));

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
              if (settlementPeriod) window.localStorage.setItem('unrescued.notice.records.settlement_period', settlementPeriod);
              const nextFilters = { ...filters, settlement_period: settlementPeriod };
              setFilters(nextFilters);
              setSelectedRowKeys([]);
              fetchData(1, pageSize, nextFilters);
            }}
          />
          <Input allowClear placeholder="身份证/姓名/序号" value={filters.keyword} onChange={event => setFilters({ ...filters, keyword: event.target.value })} />
          {!isTownUser ? (
            <Select allowClear showSearch placeholder="镇街" value={filters.town_id} onChange={value => setFilters({ ...filters, town_id: value })} options={townOptions} />
          ) : (
            <Select disabled placeholder="镇街" value={Number(currentUser?.town_id || 0) || undefined} options={[{ label: currentUser?.town_name || `镇街ID ${currentUser?.town_id}`, value: Number(currentUser?.town_id || 0) }]} />
          )}
          <Select allowClear mode="multiple" {...compactTagSelectProps} placeholder="下放状态" value={filters.status} onChange={value => setFilters({ ...filters, status: value })} options={statusOptions.map(value => ({ label: value, value }))} />
          <div style={filterActionsStyle}>
            <Button type="primary" onClick={() => fetchData(1, pageSize)}>查询</Button>
            <Button icon={<ReloadOutlined />} onClick={() => fetchData(current, pageSize)} loading={loading}>刷新</Button>
            <Button onClick={resetFilters}>重置</Button>
            <Button icon={<MoreOutlined />} onClick={() => setFilterExpanded(value => !value)}>{filterExpanded ? '收起筛选' : '更多筛选'}</Button>
          </div>
        </div>
        {filterExpanded && (
          <div style={moreFilterRowStyle}>
            <Select allowClear mode="multiple" {...compactTagSelectProps} placeholder="报销状态" value={filters.reimbursement_status} onChange={value => setFilters({ ...filters, reimbursement_status: value })} options={reimbursementOptions.map(value => ({ label: value, value }))} />
            <Select allowClear showSearch mode="multiple" {...compactTagSelectProps} placeholder="对象类别" value={filters.priority_identity} onChange={value => setFilters({ ...filters, priority_identity: value })} options={identityOptions} />
            <Select allowClear placeholder="医保就诊类别" value={filters.medical_category} onChange={value => setFilters({ ...filters, medical_category: value })} options={medicalCategoryOptions} />
            <Input allowClear placeholder="机构名称" value={filters.hospital_name} onChange={event => setFilters({ ...filters, hospital_name: event.target.value })} />
            <Select
              allowClear
              showSearch
              mode="tags"
              {...compactTagSelectProps}
              placeholder="疾病编码/名称"
              value={filters.disease_keyword}
              onChange={value => setFilters({ ...filters, disease_keyword: value, disease_code: undefined, disease_name: undefined })}
              options={diseaseOptions.map((item: any) => ({
                label: `${item.disease_code} ${item.disease_name}`,
                value: item.disease_code,
              }))}
              optionFilterProp="label"
            />
            <Input allowClear placeholder="联系人" value={filters.contact_name} onChange={event => setFilters({ ...filters, contact_name: event.target.value })} />
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
            {!isTownUser && access.canImportNoticeRecords && <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => setImportVisible(true)}>导入 通知明细</Button>}
            {!isTownUser && access.canDistributeNoticeRecords && <Button icon={<SendOutlined />} onClick={() => setDistributeVisible(true)}>批量下放</Button>}
            {!isTownUser && (access.canImportNoticeRecords || access.canDistributeNoticeRecords) && <div style={toolbarDividerStyle} />}
            <Dropdown
              menu={{
                items: batchMenuItems,
                onClick: ({ key }) => {
                  if (key === 'feedback') openEdit('feedback');
                  if (key === 'notify') markNotify(true);
                  if (key === 'unnotify') markNotify(false);
                  if (key === 'undistribute') rollbackDistribute();
                  if (key === 'admin_remark') openEdit('admin_remark');
                  if (key === 'paid') markReimbursement('已报销');
                  if (key === 'unpaid') markReimbursement('未报销');
                },
              }}
              trigger={['click']}
            >
              <Button icon={<MoreOutlined />}>批量操作{selectedRowKeys.length > 0 ? `（${selectedRowKeys.length}）` : ''}</Button>
            </Dropdown>
          </div>
          <div style={toolbarSideStyle}>
            <Popover trigger="click" placement="bottomRight" title="列显示" content={columnSettingContent}>
              <Button icon={<SettingOutlined />}>列设置</Button>
            </Popover>
            {(isTownUser || access.canExportNoticeRecords) && <Button icon={<DownloadOutlined />} onClick={doExport}>导出 通知明细</Button>}
          </div>
        </div>
      </Card>

      <Table
        rowKey="id"
        loading={loading}
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
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
        title="确认接收下放通知"
        open={receiveVisible}
        closable={false}
        maskClosable={false}
        keyboard={false}
        footer={[
          <Button key="receive" type="primary" loading={receiving} onClick={submitReceive}>
            确认接收
          </Button>,
        ]}
      >
        <Alert
          type="info"
          showIcon
          message={`当前清算期有 ${pendingReceiveCount} 条新下放数据`}
          description="确认接收后，列表将显示这些通知明细，镇街可继续回填信息、标记通知或撤销通知。"
        />
      </Modal>

      <Modal
        title="导入 通知明细"
        open={importVisible}
        onCancel={() => setImportVisible(false)}
        width={640}
        footer={[
          <Button key="cancel" onClick={() => setImportVisible(false)}>关闭</Button>,
          <Button key="upload" type="primary" icon={<UploadOutlined />} loading={uploading} disabled={!fileList.length} onClick={submitImport}>确认导入</Button>,
        ]}
      >
        <Alert
          message="导入说明"
          description={(
            <Space direction="vertical" size={8}>
              <span>1. 当前清算期：{filters.settlement_period}</span>
              <span>2. 仅支持 .csv 格式，编码自动识别 UTF-8/GBK</span>
              <span>
                3. 请先下载模板文件，管理员人工核验整理后的数据导入至下放通知，后续流程都基于通知明细处理。
                <Button type="link" icon={<DownloadOutlined />} onClick={downloadTemplate} style={{ padding: 0, height: 'auto', marginLeft: 4 }}>
                  下载模板
                </Button>
              </span>
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

      <Modal title="批量下放" open={distributeVisible} onCancel={() => setDistributeVisible(false)} onOk={submitDistribute} okText="确认下放" cancelText="取消">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert type="info" showIcon message={`当前清算期：${filters.settlement_period || '-'}`} description="仅下放待下放状态的通知明细；已下放数据不会重复变更状态。" />
          <Select mode="multiple" allowClear showSearch optionFilterProp="label" placeholder="请选择镇街" style={{ width: '100%' }} options={townOptions} value={selectedTownIds} onChange={setSelectedTownIds} />
          <Space>
            <Button size="small" onClick={() => setSelectedTownIds(towns.map((item: any) => Number(item.id)))}>全选</Button>
            <Button size="small" onClick={() => setSelectedTownIds([])}>清空</Button>
          </Space>
        </Space>
      </Modal>

      <Modal title={editType === 'feedback' ? '回填信息' : '管理员备注'} open={editVisible} onCancel={() => setEditVisible(false)} onOk={submitEdit} okText="保存" cancelText="取消">
        <Form form={editForm} layout="vertical">
          {editType === 'feedback' ? (
            <>
              <Form.Item name="contact_name" label="联系人"><Input /></Form.Item>
              <Form.Item name="contact_phone" label="联系方式"><Input /></Form.Item>
              <Form.Item name="bank_name" label="开户行"><Input /></Form.Item>
              <Form.Item name="bank_account_name" label="户名"><Input /></Form.Item>
              <Form.Item name="bank_account_no" label="银行账号"><Input /></Form.Item>
              <Form.Item name="town_remark" label="备注"><Input.TextArea rows={3} /></Form.Item>
            </>
          ) : (
            <Form.Item name="admin_remark" label="管理员备注"><Input.TextArea rows={4} /></Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default NoticeRecords;
