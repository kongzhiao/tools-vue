import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  Card,
  Table,
  Button,
  Space,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Row,
  Col,
  Statistic,
  Tag,
  Modal,
  Badge,
  Tooltip,
  Alert,
  Upload,
  Radio,
  Typography,
  Dropdown,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
  FileExcelOutlined,
  PrinterOutlined,
  DownOutlined,
  UpOutlined,
  InboxOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useAccess } from '@umijs/max';
import {
  getYfSettlements,
  getYfSettlementStats,
  batchMarkYfPay,
  markYfPay,
  importYfSettlements,
  exportYfSettlements,
  exportYfLedger,
  getQuotaCategories,
  recalculateYfSettlements,
  deleteYfSettlement,
  batchDeleteYfSettlements,
} from '@/services/yfSettlement';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const YfSettlementOnlinePage: React.FC = () => {
  const access = useAccess();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [stats, setStats] = useState<any>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [payModalVisible, setPayModalVisible] = useState(false);
  const [payForm] = Form.useForm();
  const [currentRecord, setCurrentRecord] = useState<any>(null);

  const [importModalVisible, setImportModalVisible] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // 新增状态
  const [collapsed, setCollapsed] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const selectedYear = Form.useWatch('year', form);

  // 获取数据
  const fetchData = async (page = 1, size = 15) => {
    setLoading(true);
    try {
      const values = form.getFieldsValue();
      const params: any = {
        ...values,
        page,
        page_size: size,
      };

      // 拆分日期范围
      if (values.admissionDateRange) {
        params.admission_date_start = values.admissionDateRange[0].format('YYYY-MM-DD');
        params.admission_date_end = values.admissionDateRange[1].format('YYYY-MM-DD');
        delete params.admissionDateRange;
      }
      if (values.dischargeDateRange) {
        params.discharge_date_start = values.dischargeDateRange[0].format('YYYY-MM-DD');
        params.discharge_date_end = values.dischargeDateRange[1].format('YYYY-MM-DD');
        delete params.dischargeDateRange;
      }
      if (values.settlementDateRange) {
        params.settlement_date_start = values.settlementDateRange[0].format('YYYY-MM-DD');
        params.settlement_date_end = values.settlementDateRange[1].format('YYYY-MM-DD');
        delete params.settlementDateRange;
      }
      if (values.payAtRange) {
        params.pay_at_start = values.payAtRange[0].format('YYYY-MM-DD');
        params.pay_at_end = values.payAtRange[1].format('YYYY-MM-DD');
        delete params.payAtRange;
      }

      const res = await getYfSettlements(params);
      if (res.code === 0) {
        setData(res.data.list || []);
        setTotal(res.data.total || 0);
      }

      const statsRes = await getYfSettlementStats(params);
      if (statsRes.code === 0) {
        setStats(statsRes.data || {});
      }
    } catch (error) {
      message.error('获取联网结算数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取优抚类别下拉
  const fetchCategories = async (year: number) => {
    try {
      const res = await getQuotaCategories({ year });
      if (res.code === 0) {
        setCategories(res.data || []);
      }
    } catch (error) {
      console.error('获取类别失败');
    }
  };

  useEffect(() => {
    if (selectedYear) {
      fetchCategories(selectedYear);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchData(currentPage, pageSize);
  }, [currentPage, pageSize]);

  // 监听任务中心状态变化(异步任务完成)
  useEffect(() => {
    const handleTaskChange = () => {
      console.log('检测到异步任务完成，刷新列表');
      fetchData(currentPage, pageSize);
    };
    window.addEventListener('taskStatusChanged', handleTaskChange);
    return () => window.removeEventListener('taskStatusChanged', handleTaskChange);
  }, [currentPage, pageSize]);

  // 重置
  const handleReset = () => {
    form.resetFields();
    fetchData(1, pageSize);
  };

  // 批量标记
  const handleBatchPay = async (values: any) => {
    try {
      await batchMarkYfPay({
        ids: selectedRowKeys as number[],
        ...values,
        pay_at: values.pay_at?.format('YYYY-MM-DD HH:mm:ss'),
      });
      message.success('批量标注成功');
      setPayModalVisible(false);
      setSelectedRowKeys([]);
      fetchData(currentPage, pageSize);
    } catch (error) {
      message.error('标注失败');
    }
  };

  // 导入明细 (重构)
  const handleImport = async () => {
    if (fileList.length === 0) {
      message.error('请选择要上传的文件');
      return;
    }
    const formData = new FormData();
    formData.append('file', fileList[0]);

    setUploading(true);
    try {
      const res = await importYfSettlements(formData);
      if (res.code === 0) {
        message.success('导入结算任务已提交，请在大文件导入任务中心查看进度');
        setImportModalVisible(false);
        setFileList([]);
        // 唤起任务中心进度抽屉
        window.dispatchEvent(new CustomEvent('openTaskCenter'));
      } else {
        message.error(res.message || '导入失败');
      }
    } catch (error) {
      message.error('导入出错');
    } finally {
      setUploading(false);
    }
  };

  // 导出明细
  const handleExport = () => {
    Modal.confirm({
      title: '导出明细确认',
      content: '确定要导出 结算明细 吗？文件将在后台生成，完成后可在“任务中心”下载',
      okText: '确认导出',
      cancelText: '取消',
      onOk: async () => {
        try {
          const values = form.getFieldsValue();
          const res = await exportYfSettlements(values);
          if (res.code === 0) {
            message.success('导出任务已提交，请前往“任务中心”下载');
            window.dispatchEvent(new CustomEvent('openTaskCenter'));
          }
        } catch (error) {
          message.error('导出失败');
        }
      },
    });
  };

  // 导出台账
  const handleExportLedger = () => {
    Modal.confirm({
      title: '导出结算台账确认',
      content: '确定要导出 结算台账 吗？文件将在后台生成，完成后可在“任务中心”下载',
      okText: '确认导出',
      cancelText: '取消',
      onOk: async () => {
        try {
          const values = form.getFieldsValue();
          const res = await exportYfLedger(values);
          if (res.code === 0) {
            message.success('台账导出任务已提交，请前往“任务中心”下载');
            window.dispatchEvent(new CustomEvent('openTaskCenter'));
          }
        } catch (error) {
          message.error('台账导出失败');
        }
      },
    });
  };

  // 重新计算
  const handleRecalculate = () => {
    Modal.confirm({
      title: '重新计算确认',
      content: '确定要重新计算吗？将根据最新的配置重新计算补助金额，可能需要较长时间。',
      okText: '确定重算',
      cancelText: '取消',
      onOk: async () => {
        const values = form.getFieldsValue();
        setLoading(true);
        try {
          const res = await recalculateYfSettlements(values);
          if (res.code === 0) {
            message.success(res.message || '重算任务已提交');
            fetchData(currentPage, pageSize);
          }
        } catch (error) {
          message.error('重算失败');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // 单条删除
  const handleDelete = (record: any) => {
    Modal.confirm({
      title: '删除确认',
      content: (
        <div>
          <p style={{ color: '#ff4d4f', fontWeight: 'bold' }}>删除后无法恢复，确定要继续吗？</p>
          <Card size="small" style={{ backgroundColor: '#fafafa' }}>
            <div style={{ marginBottom: 4 }}><b>姓名：</b>{record.name}</div>
            <div style={{ marginBottom: 4 }}><b>身份证号：</b>{record.id_card}</div>
            <div style={{ marginBottom: 4 }}><b>优抚类别：</b>{record.category || '-'}</div>
            <div style={{ marginBottom: 4 }}><b>所属期：</b>{record.period_belong || '-'}</div>
            <div style={{ marginBottom: 4 }}><b>年度额度：</b>¥{Number(record.annual_quota || 0).toFixed(2)}</div>
            <div style={{ marginBottom: 4 }}><b>本次补助：</b><span style={{ color: '#52c41a', fontWeight: 'bold' }}>¥{Number(record.current_subsidy || 0).toFixed(2)}</span></div>
            <div><b>剩余额度：</b>¥{Number(record.remaining_amount || 0).toFixed(2)}</div>
          </Card>
        </div>
      ),
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await deleteYfSettlement(record.id);
          if (res.code === 0) {
            message.success('删除成功');
            fetchData(currentPage, pageSize);
          }
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  // 批量删除
  const handleBatchDelete = () => {
    // 检查选中项中是否包含已支付记录
    const paidItems = data.filter(item => selectedRowKeys.includes(item.id) && item.pay_status === 1);

    if (paidItems.length > 0) {
      Modal.warning({
        title: '操作拦截',
        content: `选中的记录中包含 ${paidItems.length} 条“已支付”数据，已支付记录不允许删除。请取消勾选后再试。`,
      });
      return;
    }

    Modal.confirm({
      title: '批量删除确认',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条结算记录吗？`,
      okText: '确定批量删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await batchDeleteYfSettlements({ ids: selectedRowKeys });
          if (res.code === 0) {
            message.success('批量删除成功');
            setSelectedRowKeys([]);
            fetchData(currentPage, pageSize);
          }
        } catch (error) {
          message.error('批量删除失败');
        }
      },
    });
  };

  // 专门的联网结算打印功能 (全字段对齐)
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printColumns = [
      '姓名', '身份证号', '优抚类别', '医保类别', '清算期', '所属期', '医疗机构',
      '入院日期', '出院日期', '结算日期', '费用总额', '符合范围', '基金支出',
      '大病补充', '大额补充', '进入救助', '医疗救助', '倾斜救助', '扶贫济困',
      '渝快保', '个账支付', '现金支付', '医保报销+救助', '符合优抚计算',
      '年度额度', '已使用', '本次补助', '剩余额度', '支付状态', '支付时间', '导入时间', '备注'
    ];

    const tableHtml = `
      <html>
        <head>
          <title>优抚联网结算明细打印</title>
          <style>
            table { width: 100%; border-collapse: collapse; font-size: 8px; font-family: SimSun, serif; }
            th, td { border: 1px solid #000; padding: 2px 1px; text-align: center; word-break: break-all; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .title { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 15px; }
            @page { size: A4 landscape; margin: 0.5cm; }
          </style>
        </head>
        <body>
          <div class="title">优抚人员医疗补助联网结算明细报表</div>
          <table>
            <thead>
              <tr>${printColumns.map(col => `<th>${col}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${data.map(item => {
      let statusText = '待支付';
      if (item.pay_status === 1) statusText = '已支付';
      if (item.pay_status === -1) statusText = '不需支付';

      return `
                <tr>
                  <td>${item.name || ''}</td>
                  <td>${item.id_card || ''}</td>
                  <td>${item.category || ''}</td>
                  <td>${item.medical_category || ''}</td>
                  <td>${item.period_clearing || ''}</td>
                  <td>${item.period_belong || ''}</td>
                  <td>${item.hospital_name || ''}</td>
                  <td>${item.admission_date || ''}</td>
                  <td>${item.discharge_date || ''}</td>
                  <td>${item.settlement_date || ''}</td>
                  <td>${Number(item.total_amount || 0).toFixed(2)}</td>
                  <td>${Number(item.eligible_amount || 0).toFixed(2)}</td>
                  <td>${Number(item.fund_pay || 0).toFixed(2)}</td>
                  <td>${Number(item.serious_illness_pay || 0).toFixed(2)}</td>
                  <td>${Number(item.large_amount_pay || 0).toFixed(2)}</td>
                  <td>${Number(item.enter_medical_assistance || 0).toFixed(2)}</td>
                  <td>${Number(item.medical_assistance || 0).toFixed(2)}</td>
                  <td>${Number(item.slant_assistance || 0).toFixed(2)}</td>
                  <td>${Number(item.poverty_assistance || 0).toFixed(2)}</td>
                  <td>${Number(item.yukaibao_pay || 0).toFixed(2)}</td>
                  <td>${Number(item.personal_account_pay || 0).toFixed(2)}</td>
                  <td>${Number(item.personal_cash_pay || 0).toFixed(2)}</td>
                  <td>${Number(item.ins_assist_total || 0).toFixed(2)}</td>
                  <td>${Number(item.yf_eligible_amount || 0).toFixed(2)}</td>
                  <td>${Number(item.annual_quota || 0).toFixed(2)}</td>
                  <td>${Number(item.used_amount || 0).toFixed(2)}</td>
                  <td>${Number(item.current_subsidy || 0).toFixed(2)}</td>
                  <td>${Number(item.remaining_amount || 0).toFixed(2)}</td>
                  <td>${statusText}</td>
                  <td>${item.pay_at ? dayjs(item.pay_at).format('YYYY-MM-DD HH:mm:ss') : '-'}</td>
                  <td>${item.created_at ? dayjs(item.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}</td>
                  <td>${item.remark || ''}</td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
          <div style="margin-top: 10px; font-size: 10px; text-align: right;">
            打印时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(tableHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left' as const,
      width: 80,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '身份证号',
      dataIndex: 'id_card',
      key: 'id_card',
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Space size={4}>
            <Typography.Text copyable={{ text: text, tooltips: ['点击复制', '已复制'] }} />
            <span>{text}</span>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: '优抚类别',
      dataIndex: 'category',
      key: 'category',
      width: 140,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '医保类别',
      dataIndex: 'medical_category',
      key: 'medical_category',
      width: 90,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '清算期',
      dataIndex: 'period_clearing',
      key: 'period_clearing',
      width: 90,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '所属期',
      dataIndex: 'period_belong',
      key: 'period_belong',
      width: 90,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '就诊地',
      dataIndex: 'visit_address',
      key: 'visit_address',
      width: 90,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '医疗机构',
      dataIndex: 'hospital_name',
      key: 'hospital_name',
      width: 140,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '病种名称',
      dataIndex: 'disease_name',
      key: 'disease_name',
      width: 150,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    { title: '入院日期', dataIndex: 'admission_date', key: 'admission_date', width: 110, ellipsis: true, render: (v: any) => v || '-' },
    { title: '出院日期', dataIndex: 'discharge_date', key: 'discharge_date', width: 110, ellipsis: true, render: (v: any) => v || '-' },
    { title: '结算日期', dataIndex: 'settlement_date', key: 'settlement_date', width: 110, ellipsis: true, render: (v: any) => v || '-' },
    { title: '费用总额 ¥', dataIndex: 'total_amount', key: 'total_amount', width: 110, render: (v: any) => Number(v || 0).toFixed(2) },
    { title: '符合范围 ¥', dataIndex: 'eligible_amount', key: 'eligible_amount', width: 110, render: (v: any) => Number(v || 0).toFixed(2) },
    { title: '基金支出 ¥', dataIndex: 'fund_pay', key: 'fund_pay', width: 110, render: (v: any) => Number(v || 0).toFixed(2) },
    { title: '大病补充 ¥', dataIndex: 'serious_illness_pay', key: 'serious_illness_pay', width: 110, render: (v: any) => Number(v || 0).toFixed(2) },
    { title: '大额补充 ¥', dataIndex: 'large_amount_pay', key: 'large_amount_pay', width: 110, render: (v: any) => Number(v || 0).toFixed(2) },
    { title: '进入救助 ¥', dataIndex: 'enter_medical_assistance', key: 'enter_medical_assistance', width: 110, render: (v: any) => Number(v || 0).toFixed(2) },
    { title: '医疗救助 ¥', dataIndex: 'medical_assistance', key: 'medical_assistance', width: 110, render: (v: any) => Number(v || 0).toFixed(2) },
    { title: '倾斜救助 ¥', dataIndex: 'slant_assistance', key: 'slant_assistance', width: 110, render: (v: any) => Number(v || 0).toFixed(2) },
    { title: '扶贫济困 ¥', dataIndex: 'poverty_assistance', key: 'poverty_assistance', width: 110, render: (v: any) => Number(v || 0).toFixed(2) },
    { title: '渝快保 ¥', dataIndex: 'yukaibao_pay', key: 'yukaibao_pay', width: 110, render: (v: any) => Number(v || 0).toFixed(2) },
    { title: '个账支付 ¥', dataIndex: 'personal_account_pay', key: 'personal_account_pay', width: 110, render: (v: any) => Number(v || 0).toFixed(2) },
    { title: '现金支付 ¥', dataIndex: 'personal_cash_pay', key: 'personal_cash_pay', width: 110, render: (v: any) => Number(v || 0).toFixed(2) },
    {
      title: '医保报销+救助 ¥',
      dataIndex: 'ins_assist_total',
      key: 'ins_assist_total',
      width: 140,
      render: (v: any) => <span style={{ color: '#1890ff' }}>{Number(v || 0).toFixed(2)}</span>
    },
    {
      title: '符合优抚计算 ¥',
      dataIndex: 'yf_eligible_amount',
      key: 'yf_eligible_amount',
      width: 130,
      render: (v: any) => <span style={{ fontWeight: 'bold' }}>{Number(v || 0).toFixed(2)}</span>
    },
    { title: '已使用 ¥', dataIndex: 'used_amount', key: 'used_amount', width: 110, render: (v: any) => Number(v || 0).toFixed(2) },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 150,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '支付时间',
      dataIndex: 'pay_at',
      key: 'pay_at',
      width: 160,
      ellipsis: true,
      render: (v: any) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: '导入时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      ellipsis: true,
      render: (v: any) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: '年度额度 ¥',
      dataIndex: 'annual_quota',
      key: 'annual_quota',
      fixed: 'right' as const,
      width: 110,
      render: (v: any) => Number(v || 0).toFixed(2)
    },
    {
      title: '本次补助 ¥',
      dataIndex: 'current_subsidy',
      key: 'current_subsidy',
      fixed: 'right' as const,
      width: 110,
      render: (v: any) => <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{Number(v || 0).toFixed(2)}</span>
    },
    {
      title: '剩余额度',
      dataIndex: 'remaining_amount',
      key: 'remaining_amount',
      fixed: 'right' as const,
      width: 110,
      render: (v: any) => Number(v || 0).toFixed(2)
    },
    {
      title: '支付状态',
      dataIndex: 'pay_status',
      key: 'pay_status',
      fixed: 'right' as const,
      width: 100,
      render: (status: number) => {
        if (status === -1) return <Tag color="default">不需支付</Tag>;
        if (status === 1) return <Tag color="success">已支付</Tag>;
        return <Tag color="warning">待支付</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 140,
      render: (_: any, record: any) => {
        const showTag = record.pay_status !== -1 && access.canTagOnlineSettlement;
        const showDelete = access.canDeleteOnlineSettlement;

        if (showTag && showDelete) {
          return (
            <Space size={0}>
              <Button
                type="link"
                size="small"
                style={{ paddingRight: 4 }}
                onClick={() => {
                  setCurrentRecord(record);
                  payForm.setFieldsValue({
                    pay_at: dayjs(),
                    remark: '指定标注'
                  });
                  setPayModalVisible(true);
                }}
              >
                标记支付
              </Button>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'delete',
                      label: '删除',
                      danger: true,
                      disabled: record.pay_status === 1,
                      onClick: () => handleDelete(record),
                    },
                  ],
                }}
                placement="bottomRight"
              >
                <Button type="link" size="small" style={{ paddingLeft: 0, paddingRight: 4, marginLeft: -4 }}>
                  <DownOutlined style={{ fontSize: '10px' }} />
                </Button>
              </Dropdown>
            </Space>
          );
        }

        if (showTag) {
          return (
            <Button
              type="link"
              size="small"
              onClick={() => {
                setCurrentRecord(record);
                payForm.setFieldsValue({
                  pay_at: dayjs(),
                  remark: '指定标注'
                });
                setPayModalVisible(true);
              }}
            >
              标记支付
            </Button>
          );
        }

        if (showDelete) {
          return (
            <Button
              type="link"
              size="small"
              danger
              disabled={record.pay_status === 1}
              onClick={() => handleDelete(record)}
            >
              删除
            </Button>
          );
        }

        return '-';
      },
    },
  ];

  return (
    <PageContainer>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic title="总记录数" value={stats.total_count} suffix="条" />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic
              title="医疗费总额"
              value={stats.total_medical_cost}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#595959' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic
              title="总补助金额"
              value={stats.total_yf_subsidy}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic
              title="已支付统计"
              value={stats.paid_amount}
              precision={2}
              prefix="¥"
              suffix={<span style={{ fontSize: 12, marginLeft: 4 }}>({stats.paid_count}条)</span>}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic
              title="待支付统计"
              value={stats.pending_pay_amount}
              precision={2}
              prefix="¥"
              suffix={<span style={{ fontSize: 12, marginLeft: 4 }}>({stats.pending_pay_count}条)</span>}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Form
          form={form}
          initialValues={{ year: dayjs().year() }}
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px' }}
        >
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="year" label="年度" style={{ marginBottom: 12 }}>
                <Select
                  placeholder="选择年度"
                  onChange={() => {
                    // 年份改变时自动触发数据刷新
                    fetchData(1, pageSize);
                  }}
                >
                  {[dayjs().year() + 1, dayjs().year(), dayjs().year() - 1, dayjs().year() - 2].map(y => (
                    <Option key={y} value={y}>{y}年度</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="month" label="月份" style={{ marginBottom: 12 }}>
                <Select placeholder="所有月份" allowClear>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <Option key={m} value={m}>{m}月</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="pay_status" label="支付状态" style={{ marginBottom: 12 }}>
                <Select placeholder="所有状态" allowClear>
                  <Option value={0}>待支付</Option>
                  <Option value={1}>已支付</Option>
                  <Option value={-1}>不需支付</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="id_card" label="身份证号" style={{ marginBottom: 12 }}>
                <Input placeholder="请输入身份证号" />
              </Form.Item>
            </Col>
          </Row>

          {!collapsed && (
            <>
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item name="name" label="姓名" style={{ marginBottom: 12 }}>
                    <Input placeholder="请输入姓名" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="category" label="优抚类别" style={{ marginBottom: 12 }}>
                    <Select placeholder="请选择类别" allowClear showSearch>
                      {categories.map(c => <Option key={c} value={c}>{c}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="符合金额" style={{ marginBottom: 12 }}>
                    <Input.Group compact>
                      <Form.Item name="yf_eligible_amount_min" noStyle><Input style={{ width: '45%', textAlign: 'center' }} placeholder="最小" /></Form.Item>
                      <Input style={{ width: '10%', borderLeft: 0, pointerEvents: 'none', backgroundColor: '#fff' }} placeholder="~" disabled />
                      <Form.Item name="yf_eligible_amount_max" noStyle><Input style={{ width: '45%', textAlign: 'center', borderLeft: 0 }} placeholder="最大" /></Form.Item>
                    </Input.Group>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="剩余金额" style={{ marginBottom: 12 }}>
                    <Input.Group compact>
                      <Form.Item name="remaining_amount_min" noStyle><Input style={{ width: '45%', textAlign: 'center' }} placeholder="最小" /></Form.Item>
                      <Input style={{ width: '10%', borderLeft: 0, pointerEvents: 'none', backgroundColor: '#fff' }} placeholder="~" disabled />
                      <Form.Item name="remaining_amount_max" noStyle><Input style={{ width: '45%', textAlign: 'center', borderLeft: 0 }} placeholder="最大" /></Form.Item>
                    </Input.Group>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item name="admissionDateRange" label="入院日期" style={{ marginBottom: 12 }}>
                    <RangePicker style={{ width: '100%', fontSize: '12px' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="dischargeDateRange" label="出院日期" style={{ marginBottom: 12 }}>
                    <RangePicker style={{ width: '100%', fontSize: '12px' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="settlementDateRange" label="结算日期" style={{ marginBottom: 12 }}>
                    <RangePicker style={{ width: '100%', fontSize: '12px' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="payAtRange" label="支付时间" style={{ marginBottom: 12 }}>
                    <RangePicker style={{ width: '100%', fontSize: '12px' }} />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          <Row>
            <Col span={24} style={{ textAlign: 'right' }}>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchData(1, pageSize)}>查询</Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
                <a style={{ fontSize: 12 }} onClick={() => setCollapsed(!collapsed)}>
                  {collapsed ? <><DownOutlined /> 展开</> : <><UpOutlined /> 收起</>}
                </a>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space>
            {access.canImportOnlineSettlement && (
              <Button
                type="primary"
                icon={<CloudUploadOutlined />}
                onClick={() => setImportModalVisible(true)}
              >
                导入
              </Button>
            )}
            {access.canExportDetailsOnlineSettlement && (
              <Button
                icon={<CloudDownloadOutlined />}
                onClick={handleExport}
              >
                导出明细
              </Button>
            )}
            {access.canExportLedgerOnlineSettlement && (
              <Button
                icon={<FileExcelOutlined />}
                onClick={handleExportLedger}
              >
                导出结算台账
              </Button>
            )}
            <Button
              icon={<PrinterOutlined />}
              onClick={handlePrint}
            >
              打印
            </Button>
            {access.canRecalculateOnlineSettlement && (
              <Button
                danger
                icon={<ReloadOutlined />}
                loading={loading}
                onClick={handleRecalculate}
              >
                重新计算
              </Button>
            )}
            {selectedRowKeys.length > 0 && access.canTagOnlineSettlement && (
              <Button
                onClick={() => {
                  const payableIds = data.filter(item => selectedRowKeys.includes(item.id) && item.pay_status !== -1).map(item => item.id);
                  if (payableIds.length === 0) {
                    message.warning('选中项中没有需要支付的记录');
                    return;
                  }
                  if (payableIds.length < selectedRowKeys.length) {
                    message.info(`已自动为您处理选中的 ${payableIds.length} 条待支付记录`);
                    setSelectedRowKeys(payableIds);
                  }
                  setCurrentRecord(null);
                  payForm.setFieldsValue({
                    pay_at: dayjs(),
                    remark: '批量标注'
                  });
                  setPayModalVisible(true);
                }}
              >
                批量标注支付 ({data.filter(i => selectedRowKeys.includes(i.id) && i.pay_status !== -1).length})
              </Button>
            )}
            {selectedRowKeys.length > 0 && access.canDeleteOnlineSettlement && (
              <Button
                danger
                onClick={handleBatchDelete}
              >
                批量删除 ({selectedRowKeys.length})
              </Button>
            )}
          </Space>
        </div>

        {selectedRowKeys.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Alert
              message={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    已选择 <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{selectedRowKeys.length}</span> 项记录
                    {(() => {
                      const payableCount = data.filter(i => selectedRowKeys.includes(i.id) && i.pay_status !== -1).length;
                      const hasFilterable = data.some(i => selectedRowKeys.includes(i.id) && i.pay_status === -1);
                      if (hasFilterable) {
                        return (
                          <span style={{ marginLeft: 16 }}>
                            其中 <Tag color="success">{payableCount}</Tag> 项可标注支付，
                            <Tag color="default">{selectedRowKeys.length - payableCount}</Tag> 项不需支付 (已为您自动跳过)
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </span>
                  <Space>
                    <Button
                      size="small"
                      type="link"
                      onClick={() => {
                        const payableIds = data.filter(i => selectedRowKeys.includes(i.id) && i.pay_status !== -1).map(i => i.id);
                        setSelectedRowKeys(payableIds);
                        message.success('已自动过滤不需支付记录');
                      }}
                    >
                      仅选可支付项
                    </Button>
                    <Button size="small" type="link" onClick={() => setSelectedRowKeys([])}>清空选择</Button>
                  </Space>
                </div>
              }
              type="info"
              showIcon
            />
          </div>
        )}

        <Table
          rowSelection={(access.canTagOnlineSettlement || access.canDeleteOnlineSettlement) ? {
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          } : undefined}
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          scroll={{ x: 3800 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            onChange: (p, s) => {
              setCurrentPage(p);
              setPageSize(s);
            },
          }}
        />
      </Card>

      {/* 标记支付 Modal */}
      <Modal
        title={currentRecord ? '标记支付' : '完成批量支付标注'}
        open={payModalVisible}
        onCancel={() => setPayModalVisible(false)}
        onOk={() => payForm.submit()}
      >
        <Form form={payForm} layout="vertical" onFinish={currentRecord ?
          (vals) => markYfPay(currentRecord.id, { ...vals, pay_at: vals.pay_at?.format('YYYY-MM-DD HH:mm:ss') }).then(() => {
            message.success('已标注支付');
            setPayModalVisible(false);
            fetchData(currentPage, pageSize);
          }) : handleBatchPay
        }>
          <Form.Item name="pay_status" label="支付状态" initialValue={1}>
            <Select>
              <Option value={1}>已支付</Option>
              <Option value={0}>待支付</Option>
            </Select>
          </Form.Item>
          <Form.Item name="pay_at" label="支付时间" initialValue={dayjs()}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="选填，记录支付相关备注" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 导入 Modal (已重构) */}
      <Modal
        title="从CSV导入结算明细"
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
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="导入说明"
            description={
              <div>
                <Typography.Text>
                  1. 请上传标准格式的结算 CSV 文件。<br />
                  2. 系统将自动从文件的“费款所属期”解析年度和月份。<br />
                  3. 重复导入相同流水将产生冗余数据，请仔细核对。
                </Typography.Text>
                <div style={{ marginTop: 12 }}>
                  <Button
                    type="primary"
                    size="small"
                    icon={<CloudDownloadOutlined />}
                    href="/assets/templates/yf-settlement/联网结算明细.csv"
                    target="_blank"
                    style={{ borderRadius: 4 }}
                  >
                    下载导入模板
                  </Button>
                </div>
              </div>
            }
            type="info"
            showIcon
          />
        </div>

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
          <p className="ant-upload-text">点击或拖拽结算CSV文件到此区域</p>
          <p className="ant-upload-hint">仅支持 .csv 格式，文件大小不超过 128MB</p>
        </Upload.Dragger>
      </Modal>
    </PageContainer>
  );
};

export default YfSettlementOnlinePage;