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
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  CloudDownloadOutlined,
  FileExcelOutlined,
  PrinterOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { useAccess } from '@umijs/max';
import {
  getYfSettlements,
  getYfSettlementStats,
  exportYfLedger,
  getQuotaCategories,
} from '@/services/yfSettlement';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const YfSettlementAccountPage: React.FC = () => {
  const access = useAccess();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [stats, setStats] = useState<any>({});
  const [collapsed, setCollapsed] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const selectedYear = Form.useWatch('year', form);

  // 获取数据
  const fetchData = async (page = 1, size = 15) => {
    setLoading(true);
    try {
      const values = form.getFieldsValue();
      const params = {
        ...values,
        page,
        page_size: size,
      };
      if (values.settlementDateRange) {
        params.settlement_date_start = values.settlementDateRange[0].format('YYYY-MM-DD');
        params.settlement_date_end = values.settlementDateRange[1].format('YYYY-MM-DD');
        delete params.settlementDateRange;
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
      message.error('获取台账数据失败');
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

  const handleExportLedger = async () => {
    try {
      const values = form.getFieldsValue();
      const res = await exportYfLedger(values);
      if (res.code === 0) {
        message.success('台账导出任务已提交');
      }
    } catch (error) {
      message.error('台账导出失败');
    }
  };

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name', width: 100 },
    { title: '身份证号', dataIndex: 'id_card', key: 'id_card', width: 180 },
    { title: '费款所属期', dataIndex: 'period_belong', key: 'period_belong', width: 110 },
    { title: '优抚类别', dataIndex: 'category', key: 'category', width: 150 },
    { title: '就诊机构', dataIndex: 'hospital_name', key: 'hospital_name', width: 180, ellipsis: true },
    { title: '符合医保范围金额', dataIndex: 'eligible_amount', key: 'eligible_amount', width: 150, render: (v: any) => Number(v || 0).toFixed(2) },
    { title: '医保报销+救助', dataIndex: 'ins_assist_total', key: 'ins_assist_total', width: 150, render: (v: any) => Number(v || 0).toFixed(2) },
    { title: '符合优抚计算', dataIndex: 'yf_eligible_amount', key: 'yf_eligible_amount', width: 140, render: (v: any) => Number(v || 0).toFixed(2) },
    { title: '年度补助限额', dataIndex: 'annual_quota', key: 'annual_quota', width: 130, render: (v: any) => Number(v || 0).toFixed(2) },
    { title: '已使用额度', dataIndex: 'used_amount', key: 'used_amount', width: 120, render: (v: any) => Number(v || 0).toFixed(2) },
    { title: '本次补助', dataIndex: 'current_subsidy', key: 'current_subsidy', width: 110, render: (v: any) => <span style={{ color: '#52c41a' }}>{Number(v || 0).toFixed(2)}</span> },
    { title: '剩余额度', dataIndex: 'remaining_amount', key: 'remaining_amount', width: 110, render: (v: any) => Number(v || 0).toFixed(2) },
    { title: '支付状态', dataIndex: 'pay_status', key: 'pay_status', width: 100, render: (s: number) => s === 1 ? '已支付' : (s === -1 ? '不需支付' : '待支付') },
  ];

  return (
    <PageContainer>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic title="总补助笔数" value={stats.total_count} suffix="笔" />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="累计补助发放" value={stats.total_yf_subsidy} precision={2} prefix="¥" valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="医疗总费用汇总" value={stats.total_medical_cost} precision={2} prefix="¥" />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical" initialValues={{ year: dayjs().year() }}>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="pay_status" label="支付状态">
                <Select placeholder="所有状态" allowClear>
                  <Option value={0}>待支付</Option>
                  <Option value={1}>已支付</Option>
                  <Option value={-1}>不需支付</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="id_card" label="身份证号">
                <Input placeholder="请输入身份证号" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="name" label="姓名">
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="year" label="年度">
                <Select placeholder="选择年度">
                  {[dayjs().year() + 1, dayjs().year(), dayjs().year() - 1, dayjs().year() - 2].map(y => (
                    <Option key={y} value={y}>{y}年</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {!collapsed && (
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="month" label="月份">
                  <Select placeholder="所有月份" allowClear>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <Option key={m} value={m}>{m}月</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="category" label="优抚类别">
                  <Select placeholder="请选择类别" allowClear showSearch>
                    {categories.map(c => <Option key={c} value={c}>{c}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={10}>
                <Form.Item name="settlementDateRange" label="结算日期范围">
                  <RangePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row>
            <Col span={24} style={{ textAlign: 'right' }}>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchData(1, pageSize)}>查询</Button>
                <Button icon={<ReloadOutlined />} onClick={() => { form.resetFields(); fetchData(1, pageSize); }}>重置</Button>
                <Button
                  icon={<CloudDownloadOutlined />}
                  onClick={handleExportLedger}
                  disabled={!access.canExportSettlementAccount}
                >
                  导出台账
                </Button>
                <Button
                  icon={<PrinterOutlined />}
                  onClick={() => window.print()}
                >
                  打印
                </Button>
                <a style={{ fontSize: 12 }} onClick={() => setCollapsed(!collapsed)}>
                  {collapsed ? <><DownOutlined /> 展开</> : <><UpOutlined /> 收起</>}
                </a>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card title="结算台账明细">
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          scroll={{ x: 2000 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            onChange: (p, s) => {
              setCurrentPage(p);
              setPageSize(s);
            }
          }}
        />
      </Card>
    </PageContainer>
  );
};

export default YfSettlementAccountPage;