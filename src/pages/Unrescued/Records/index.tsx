import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Collapse,
  DatePicker,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Upload,
} from 'antd';
import {
  BankOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  InboxOutlined,
  ReloadOutlined,
  SendOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { useAccess, useModel } from '@umijs/max';
import dayjs from 'dayjs';
import { getTownOptions } from '@/services/town';
import {
  distributeUnrescuedRecords,
  executeUnrescuedWash,
  exportUnrescuedRecords,
  fillUnrescuedAccounts,
  getUnrescuedRecords,
  getUnrescuedStatistics,
  getUnrescuedWashConfig,
  getUnrescuedWashOptions,
  importUnrescuedAttachment1,
  importUnrescuedAttachment2,
  markUnrescuedReimbursement,
  notifyUnrescuedRecords,
  receiveUnrescuedRecords,
  saveUnrescuedWashConfig,
} from '@/services/unrescued';

const statusColors: Record<string, string> = {
  待处理: 'default',
  无救助金额: 'default',
  不通知: 'blue',
  拟通知: 'orange',
  已下放: 'cyan',
  已接收: 'purple',
  已通知: 'green',
};

const templateMap: Record<string, string> = {
  attachment1: '导入-附件1：未救助明细模板.csv',
  attachment2: '导入-附件2：救助对象名单模板.csv',
};

const exportMap: Record<string, { label: string; countKey: string; disabledText: string }> = {
  attachment1: {
    label: '导出 排查明细',
    countKey: 'exportAttachment1Count',
    disabledText: '请先导入未救助明细，再导出排查明细',
  },
  attachment2: {
    label: '导出 未报销台账',
    countKey: 'exportAttachment2Count',
    disabledText: '请先导入救助对象名单并确保存在未剔除数据，再导出未报销台账',
  },
  attachment3: {
    label: '导出 通知名单',
    countKey: 'exportAttachment3Count',
    disabledText: '请先导入救助对象名单并确保存在未剔除数据，再导出通知名单',
  },
  attachment4: {
    label: '导出 应退应补排查记录',
    countKey: 'exportAttachment4Count',
    disabledText: '暂无应退应补排查记录，不能导出应退应补排查记录',
  },
};

const statCards = [
  { key: 'total', label: '当前记录', color: '#1677ff' },
  { key: 'matchedObject', label: '已匹配对象', color: '#13a8a8' },
  { key: 'toNotice', label: '拟通知', color: '#fa8c16' },
  { key: 'pendingReceive', label: '待接收', color: '#722ed1' },
  { key: 'excluded', label: '已剔除', color: '#f5222d' },
  { key: 'paid', label: '已报销', color: '#52c41a' },
];

const cardStyle: React.CSSProperties = {
  borderRadius: 6,
  border: '1px solid #edf0f5',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
};

const fixedWashRules = [
  { code: 'medical_category_keep', name: '医疗类别', field: 'medical_category', action: 'keep', operator: 'in', values: ['普通住院', '住院双通道外购药', '儿童两病住院'], remark: '门诊救助', enabled: false },
  { code: 'hospital_keyword_exclude', name: '医药机构名称', field: 'hospital_name', action: 'exclude', operator: 'contains', values: ['诊所', '药店', '卫生室'], remark: '对象类别不符', enabled: false },
  { code: 'pool_equals_policy', name: '统筹报销金额', field: 'pool_fund_pay', action: 'exclude', operator: '=', compare_field: 'policy_fee', remark: '无救助金额', enabled: false },
  { code: 'large_equals_policy', name: '大额报销', field: 'large_amount_pay', action: 'exclude', operator: '=', compare_field: 'policy_fee', remark: '无救助金额', enabled: false },
  { code: 'serious_equals_policy', name: '大病报销', field: 'serious_illness_pay', action: 'exclude', operator: '=', compare_field: 'policy_fee', remark: '无救助金额', enabled: false },
  { code: 'normal_rescue_limit', name: '已使用普通住院救助金额', field: 'used_normal_rescue', action: 'exclude', operator: '=', value: '6000.00', remark: '无救助额度', enabled: false },
  { code: 'major_rescue_limit', name: '已使用重特大疾病救助金额', field: 'used_major_rescue', action: 'exclude', operator: '=', value: '100000.00', remark: '无救助额度', enabled: false },
  { code: 'large_fee_rescue_limit', name: '已使用大额费用住院救助', field: 'used_large_fee_rescue', action: 'exclude', operator: '=', value: '60000.00', remark: '无救助额度', enabled: false },
  { code: 'identity_exclude', name: '身份', field: 'priority_identity', action: 'exclude', operator: 'contains', values: ['返贫致贫人口', '低保边缘家庭成员', '因病致贫重病患者', '脱贫不稳定户', '边缘易致贫户', '突发严重困难户'], remark: '对象类别不符', enabled: false },
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
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>({});
  const [towns, setTowns] = useState<any[]>([]);
  const [washRules, setWashRules] = useState<any[]>([]);
  const [washOptions, setWashOptions] = useState<any>({ medical_categories: [], identities: [] });
  const [importVisible, setImportVisible] = useState(false);
  const [importType, setImportType] = useState<'attachment1' | 'attachment2'>('attachment1');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [accountVisible, setAccountVisible] = useState(false);
  const receivePromptRef = useRef(false);
  const [filters, setFilters] = useState<any>({
    settlement_period: dayjs().format('YYYYMM'),
    keyword: '',
  });
  const [accountForm] = Form.useForm();

  const isTownUser = Number(currentUser?.town_id || 0) > 0;
  const availableTowns = isTownUser
    ? towns.filter((item: any) => Number(item.id) === Number(currentUser?.town_id))
    : towns;

  const effectiveFilters = () => ({
    ...filters,
    ...(isTownUser ? { town_id: Number(currentUser?.town_id) } : {}),
  });

  const fetchData = async (page = current, size = pageSize) => {
    setLoading(true);
    try {
      const query = effectiveFilters();
      const res = await getUnrescuedRecords({ ...query, page, page_size: size });
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

  const loadBasics = async () => {
    try {
      const townRes = await getTownOptions();
      if (townRes.code === 0) setTowns(townRes.data || []);
      const washRes = await getUnrescuedWashConfig();
      if (washRes.code === 0) setWashRules(mergeWashRules(washRes.data?.data || []));
      if (washRes.code !== 0) setWashRules(mergeWashRules([]));
    } catch (error) {
      setWashRules(mergeWashRules([]));
      message.warning('基础配置加载失败');
    }
  };

  useEffect(() => {
    loadBasics();
    fetchData(1, pageSize);
    const handleTaskChanged = () => fetchData(1, pageSize);
    window.addEventListener('taskStatusChanged', handleTaskChanged);
    return () => window.removeEventListener('taskStatusChanged', handleTaskChanged);
  }, []);

  useEffect(() => {
    if (isTownUser && currentUser?.town_id) {
      setFilters((prev: any) => ({ ...prev, town_id: Number(currentUser.town_id) }));
    }
  }, [isTownUser, currentUser?.town_id]);

  useEffect(() => {
    if (!isTownUser || receivePromptRef.current || !filters.settlement_period || Number(stats.pendingReceive || 0) <= 0) {
      return;
    }

    receivePromptRef.current = true;
    Modal.confirm({
      title: '有未接收的下放记录',
      content: `当前清算期 ${filters.settlement_period} 存在 ${stats.pendingReceive} 条已下放记录，请确认接收后继续处理。`,
      okText: '确认接收',
      cancelButtonProps: { style: { display: 'none' } },
      maskClosable: false,
      keyboard: false,
      onOk: async () => {
        await handleReceive();
      },
      afterClose: () => {
        receivePromptRef.current = false;
      },
    });
  }, [isTownUser, stats.pendingReceive, filters.settlement_period]);

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

  const selectedIds = () => selectedRowKeys.map(id => Number(id));

  const requireSelection = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择记录');
      return false;
    }
    return true;
  };

  const handleReceive = async () => {
    const res = await receiveUnrescuedRecords({ settlement_period: filters.settlement_period });
    if (res.code === 0) {
      message.success('接收成功');
      fetchData();
    } else {
      message.error(res.message || res.msg || '接收失败');
    }
  };

  const handleNotify = async () => {
    if (!requireSelection()) return;
    const res = await notifyUnrescuedRecords({ ids: selectedIds() });
    if (res.code === 0) {
      message.success('已标记通知');
      setSelectedRowKeys([]);
      fetchData();
    }
  };

  const handleAccount = async (values: any) => {
    if (!requireSelection()) return;
    const res = await fillUnrescuedAccounts({ ids: selectedIds(), ...values });
    if (res.code === 0) {
      message.success('账户已回填');
      setAccountVisible(false);
      accountForm.resetFields();
      fetchData();
    }
  };

  const handleReimbursement = async (status: string) => {
    if (!requireSelection()) return;
    const res = await markUnrescuedReimbursement({ ids: selectedIds(), reimbursement_status: status });
    if (res.code === 0) {
      message.success('报销状态已更新');
      setSelectedRowKeys([]);
      fetchData();
    }
  };

  const handleWash = async () => {
    if (!filters.settlement_period) {
      message.warning('请先选择清算期');
      return;
    }
    const query = effectiveFilters();
    const res = await executeUnrescuedWash({ settlement_period: query.settlement_period, town_id: query.town_id });
    if (res.code === 0) {
      message.success(`清洗完成：剔除 ${res.data?.excluded_count || 0} 条，保留 ${res.data?.kept_count || 0} 条`);
      fetchData();
    } else {
      message.error(res.message || res.msg || '清洗失败');
    }
  };

  const handleSaveWash = async () => {
    const res = await saveUnrescuedWashConfig({ name: '未救助清洗规则', rules: washRules });
    if (res.code === 0) {
      message.success('规则已保存');
      setWashRules(res.data?.data || washRules);
    }
  };

  const handleDistribute = async () => {
    if (!filters.settlement_period || !filters.town_id) {
      message.warning('请选择清算期和镇街');
      return;
    }
    const res = await distributeUnrescuedRecords({
      settlement_period: filters.settlement_period,
      town_id: filters.town_id,
    });
    if (res.code === 0) {
      message.success(`下放成功：${res.data?.affected_rows || 0} 条`);
      fetchData();
    }
  };

  const doExport = async (type: string) => {
    const res = await exportUnrescuedRecords({ type, filters: effectiveFilters() });
    if (res.code === 0) {
      message.success('导出任务已提交，请在任务中心查看进度');
    } else {
      message.error(res.message || res.msg || '导出失败');
    }
  };

  const updateRule = (index: number, patch: any) => {
    setWashRules(prev => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  };

  const hasEnabledWashRules = washRules.some(rule => rule.enabled === true);

  const exportButtons = useMemo(() => {
    return Object.entries(exportMap).map(([type, item]) => {
      const count = Number(stats[item.countKey] || 0);
      const button = (
        <Button icon={<DownloadOutlined />} disabled={count <= 0}>
          {item.label}
        </Button>
      );

      if (count <= 0) {
        return (
          <Tooltip key={type} title={item.disabledText}>
            {button}
          </Tooltip>
        );
      }

      return (
        <Popconfirm
          key={type}
          title={`确定${item.label}吗？`}
          description={`当前筛选条件下将导出 ${count} 条记录。`}
          onConfirm={() => doExport(type)}
          okText="确定导出"
          cancelText="取消"
        >
          {button}
        </Popconfirm>
      );
    });
  }, [stats, filters]);

  const columns = [
    { title: '清算期', dataIndex: 'settlement_period', width: 100},
    { title: '序号', dataIndex: 'sequence_no', width: 90, ellipsis: true },
    { title: '姓名', dataIndex: 'name', width: 100, ellipsis: true, render: (v: string) => v || '-' },
    { title: '身份证号', dataIndex: 'id_card', width: 190, ellipsis: true },
    {
      title: '镇街',
      dataIndex: 'street_town',
      width: 150,
      ellipsis: true,
      render: (v: string, record: any) => (
        <Space size={4}>
          <span>{v || '-'}</span>
          {v && Number(record.town_id || 0) === 0 && <Tag color="red">未匹配</Tag>}
        </Space>
      ),
    },
    { title: '身份', dataIndex: 'priority_identity', width: 170, ellipsis: true, render: (v: string) => v || '-' },
    { title: '医疗类别', dataIndex: 'medical_category', width: 130, ellipsis: true },
    { title: '医药机构', dataIndex: 'hospital_name', width: 220, ellipsis: true },
    { title: '政策范围费用', dataIndex: 'policy_fee', width: 120 },
    { title: '统筹报销', dataIndex: 'pool_fund_pay', width: 110 },
    { title: '大额报销', dataIndex: 'large_amount_pay', width: 110 },
    { title: '大病报销', dataIndex: 'serious_illness_pay', width: 110 },
    { title: '进入报销金额', dataIndex: 'calc_reimbursement_amount', width: 130 },
    { title: '开户行', dataIndex: 'bank_name', width: 150, ellipsis: true , render: (v: string) => v || '-' },
    { title: '户名', dataIndex: 'bank_account_name', width: 120, ellipsis: true , render: (v: string) => v || '-' },
    { title: '账号录入', dataIndex: 'bank_account_no', width: 170, ellipsis: true , render: (v: string) => v || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (v: string) => <Tag color={statusColors[v] || 'default'}>{v}</Tag>,
    },
    {
      title: '剔除',
      dataIndex: 'exclude_status',
      width: 100,
      render: (v: string) => <Tag color={v === '已剔除' ? 'red' : 'green'}>{v}</Tag>,
    },
    {
      title: '报销',
      dataIndex: 'reimbursement_status',
      width: 100,
      render: (v: string) => <Tag color={v === '已报销' ? 'green' : 'default'}>{v}</Tag>,
    },
    { title: '备注', dataIndex: 'remark', width: 160, render: (v: string) => v || '-' },
  ];

  const washColumns = [
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean, _: any, index: number) => (
        <Switch size="small" checked={v !== false} onChange={checked => updateRule(index, { enabled: checked })} />
      ),
    },
    { title: '规则项', dataIndex: 'name', width: 220 },
    {
      title: '保留/剔除',
      width: 120,
      render: (_: any, record: any, index: number) => (
        <Select
          style={{ width: 96 }}
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
      width: 360,
      render: (_: any, record: any, index: number) => {
        const operator = record.operator || (record.type === 'contains' ? 'contains' : record.type === 'not_in' ? 'in' : '=');
        const isCategory = record.code === 'medical_category_keep';
        const isIdentity = record.code === 'identity_exclude';
        const isHospital = record.code === 'hospital_keyword_exclude';
        const isAmount = !isCategory && !isIdentity && !isHospital;

        if (isCategory || isIdentity) {
          const options = (isCategory ? washOptions.medical_categories : washOptions.identities)
            .map((value: string) => ({ label: value, value }));
          return (
            <Select
              mode="multiple"
              allowClear
              placeholder={isCategory ? '选择医疗类别' : '选择身份类别'}
              style={{ width: '100%' }}
              value={record.values || []}
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
                value={operator}
                onChange={value => updateRule(index, { operator: value })}
                options={[
                  { label: '包含', value: 'contains' },
                  { label: '不包含', value: 'not_contains' },
                ]}
              />
              <Input
                value={(record.values || []).join('、')}
                placeholder="多个关键字用顿号或逗号分隔"
                onChange={e => updateRule(index, {
                  values: e.target.value.split(/[、,，\n]/).map(item => item.trim()).filter(Boolean),
                })}
              />
            </Space.Compact>
          );
        }

        if (isAmount) {
          return (
            <Space.Compact style={{ width: '100%' }}>
              <Select
                style={{ width: 78 }}
                value={operator}
                onChange={value => updateRule(index, { operator: value })}
                options={['=', '>', '<', '>=', '<='].map(value => ({ label: value, value }))}
              />
              <Input
                value={record.compare_field ? '医保政策范围费用' : record.value}
                disabled={!!record.compare_field}
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
      title: '剔除备注',
      width: 240,
      render: (_: any, record: any, index: number) => (
        <Input
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
        <Space wrap>
          <DatePicker
            picker="month"
            allowClear={false}
            value={filters.settlement_period ? dayjs(filters.settlement_period, 'YYYYMM') : undefined}
            onChange={value => setFilters({ ...filters, settlement_period: value ? value.format('YYYYMM') : '' })}
          />
          <Input
            allowClear
            placeholder="身份证/姓名/序号"
            style={{ width: 210 }}
            value={filters.keyword}
            onChange={e => setFilters({ ...filters, keyword: e.target.value })}
          />
          <Select
            allowClear
            placeholder="镇街"
            style={{ width: 160 }}
            value={filters.town_id}
            disabled={isTownUser}
            onChange={value => setFilters({ ...filters, town_id: value })}
            options={availableTowns.map((item: any) => ({ label: item.name, value: item.id }))}
          />
          <Input
            allowClear
            placeholder="身份"
            style={{ width: 170 }}
            value={filters.priority_identity}
            onChange={e => setFilters({ ...filters, priority_identity: e.target.value })}
          />
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 130 }}
            value={filters.status}
            onChange={value => setFilters({ ...filters, status: value })}
            options={['待处理', '无救助金额', '不通知', '拟通知', '已下放', '已接收', '已通知'].map(v => ({ label: v, value: v }))}
          />
          <Select
            allowClear
            placeholder="剔除"
            style={{ width: 120 }}
            value={filters.exclude_status}
            onChange={value => setFilters({ ...filters, exclude_status: value })}
            options={['未剔除', '已剔除'].map(v => ({ label: v, value: v }))}
          />
          <Select
            allowClear
            placeholder="报销"
            style={{ width: 120 }}
            value={filters.reimbursement_status}
            onChange={value => setFilters({ ...filters, reimbursement_status: value })}
            options={['未报销', '已报销'].map(v => ({ label: v, value: v }))}
          />
          <Button type="primary" onClick={() => fetchData(1, pageSize)}>查询</Button>
          <Button icon={<ReloadOutlined />} onClick={() => fetchData(current, pageSize)} loading={loading}>刷新</Button>
        </Space>
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
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space wrap>
            {!isTownUser && access.canImportUnrescuedRecords && (
              <>
                <Button icon={<CloudUploadOutlined />} onClick={() => openImport('attachment1')}>导入 未救助明细</Button>
                <Button icon={<CloudUploadOutlined />} onClick={() => openImport('attachment2')}>导入 救助对象名单</Button>
              </>
            )}
            {!isTownUser && access.canWashUnrescuedRecords && (
              hasEnabledWashRules ? (
                <Popconfirm title="确定按当前规则执行清洗吗？" onConfirm={handleWash} okText="确定" cancelText="取消">
                  <Button>执行 清洗规则</Button>
                </Popconfirm>
              ) : (
                <Tooltip title="请配置并启用至少一条清洗规则">
                  <Button disabled>执行 清洗规则</Button>
                </Tooltip>
              )
            )}
            {!isTownUser && access.canDistributeUnrescuedRecords && (
              <Popconfirm title="确定下放当前清算期和镇街的未剔除数据吗？" onConfirm={handleDistribute} okText="确定" cancelText="取消">
                <Button icon={<SendOutlined />}>下放 镇街数据</Button>
              </Popconfirm>
            )}
          </Space>
          <Space wrap>
            {access.canNotifyUnrescuedRecords && (
              <Popconfirm title="确定将所选记录标记为已通知吗？" onConfirm={handleNotify} okText="确定" cancelText="取消">
                <Button disabled={!selectedRowKeys.length} icon={<CheckCircleOutlined />}>标记 已通知</Button>
              </Popconfirm>
            )}
            {access.canFillUnrescuedAccounts && (
              <Button disabled={!selectedRowKeys.length} icon={<BankOutlined />} onClick={() => setAccountVisible(true)}>回填 银行账户</Button>
            )}
            {!isTownUser && access.canMarkUnrescuedReimbursement && (
              <>
                <Popconfirm title="确定标记所选记录为已报销吗？" onConfirm={() => handleReimbursement('已报销')} okText="确定" cancelText="取消">
                  <Button disabled={!selectedRowKeys.length}>标记 已报销</Button>
                </Popconfirm>
                <Popconfirm title="确定标记所选记录为未报销吗？" onConfirm={() => handleReimbursement('未报销')} okText="确定" cancelText="取消">
                  <Button disabled={!selectedRowKeys.length}>标记 未报销</Button>
                </Popconfirm>
              </>
            )}
            {!isTownUser && access.canExportUnrescuedRecords && exportButtons}
          </Space>
        </Space>
      </Card>

      {!isTownUser && access.canWashUnrescuedRecords && (
        <Collapse
          style={{ marginBottom: 12, background: '#fff' }}
          items={[
            {
              key: 'wash-rules',
              label: '清洗规则配置',
              extra: <Button size="small" onClick={event => {
                event.stopPropagation();
                handleSaveWash();
              }}>保存清洗规则</Button>,
              children: (
                <>
                  <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 12 }}
                    message="固定规则项默认存在但未启用。医疗类别和身份选项来自通用筛选选项表及当前已导入明细。"
                  />
                  <Table
                    rowKey="code"
                    size="small"
                    pagination={false}
                    dataSource={washRules}
                    columns={washColumns}
                    scroll={{ x: 1120 }}
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
        columns={columns}
        dataSource={data}
        scroll={{ x: 1900 }}
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
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

      <Modal
        title="回填 银行账户"
        open={accountVisible}
        onCancel={() => setAccountVisible(false)}
        footer={null}
      >
        <Form form={accountForm} layout="vertical" onFinish={handleAccount}>
          <Form.Item name="bank_name" label="开户行" rules={[{ required: true, message: '请输入开户行' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="bank_account_name" label="户名" rules={[{ required: true, message: '请输入户名' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="bank_account_no" label="账号" rules={[{ required: true, message: '请输入账号' }]}>
            <Input />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">保存</Button>
            <Button onClick={() => setAccountVisible(false)}>取消</Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default UnrescuedRecords;
