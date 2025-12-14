import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  Card,
  Button,
  Space,
  Form,
  Select,
  Table,
  Statistic,
  Row,
  Col,
  message,
  App,
  Typography,
  Divider,
  Tooltip,
} from 'antd';
import { useAccess } from '@umijs/max';
import {
  DownloadOutlined,
  ReloadOutlined,
  FileExcelOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { 
  getYears, 
  getStatistics,
  type StatisticsResult,
} from '@/services/insuranceData';
import { getTaxSummary, exportTaxSummary } from '@/services/taxSummary';

const { Title, Text } = Typography;
const { Option } = Select;

interface TaxSummaryData {
  category: string;
  count: number;
  amount: number;
  percentage?: number;
}

interface TaxSummaryResponse {
  data: TaxSummaryData[];
  total_count: number;
  total_amount: number;
  year: number;
}

const TaxSummaryPage: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const access = useAccess();
  
  // 状态管理
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [years, setYears] = useState<number[]>([]);
  const [statistics, setStatistics] = useState<StatisticsResult | null>(null);
  const [taxSummaryData, setTaxSummaryData] = useState<TaxSummaryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  // 获取年份列表
  const fetchYears = async () => {
    try {
      const response = await getYears();
      if (response.code === 0) {
        setYears(response.data);
      }
    } catch (error) {
      console.error('获取年份列表失败:', error);
    }
  };

  // 获取统计数据
  const fetchStatistics = async () => {
    try {
      const response = await getStatistics(currentYear);
      if (response.code === 0) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  };

  // 获取税务汇总数据
  const fetchTaxSummary = async () => {
    setLoading(true);
    try {
      const response = await getTaxSummary(currentYear);
      if (response.code === 0) {
        const data = response.data.data;
        const total = response.data.total_amount;
        
        // 计算百分比
        const dataWithPercentage = data.map((item: TaxSummaryData) => ({
          ...item,
          percentage: total > 0 ? (item.amount / total * 100) : 0
        }));
        
        setTaxSummaryData(dataWithPercentage);
        setTotalCount(response.data.total_count);
        setTotalAmount(response.data.total_amount);
      } else {
        messageApi.error(response.message || '获取税务汇总数据失败');
      }
    } catch (error) {
      console.error('获取税务汇总数据失败:', error);
      messageApi.error('获取税务汇总数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 导出税务汇总数据
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const response = await exportTaxSummary(currentYear);
      if (response.code === 0) {
        // 解码base64内容
        const binaryString = atob(response.data.content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // 创建下载链接
        const blob = new Blob([bytes], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = response.data.filename || `${currentYear}年税务代缴汇总表.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        messageApi.success('导出成功');
      } else {
        messageApi.error(response.message || '导出失败');
      }
    } catch (error) {
      console.error('导出失败:', error);
      messageApi.error('导出失败');
    } finally {
      setExportLoading(false);
    }
  };

  // 初始化
  useEffect(() => {
    fetchYears();
  }, []);

  useEffect(() => {
    fetchStatistics();
    fetchTaxSummary();
  }, [currentYear]);

  // 表格列定义
  const columns: ColumnsType<TaxSummaryData> = [
    {
      title: '序号',
      dataIndex: 'index',
      key: 'index',
      width: 80,
      render: (_, __, index) => index + 1,
    },
    {
      title: '代缴类别',
      dataIndex: 'category',
      key: 'category',
      width: 200,
    },
    {
      title: '人数',
      dataIndex: 'count',
      key: 'count',
      width: 120,
      align: 'right',
      render: (value) => value.toLocaleString(),
    },
    {
      title: '代缴金额（元）',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      align: 'right',
      render: (value) => `¥${value.toLocaleString()}`,
    }
  ];

  return (
    <PageContainer>
      <Card>
        {/* 年份选择和统计信息 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Form.Item label="选择年份">
              <Select
                value={currentYear}
                onChange={setCurrentYear}
                style={{ width: '100%' }}
              >
                {years.map(year => (
                  <Option key={year} value={year}>{year}年</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={18}>
            {statistics && (
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="总记录数"
                    value={statistics.total}
                    valueStyle={{ color: '#000' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="正确数据"
                    value={statistics.matched_count}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="待匹配数量"
                    value={statistics.unmatched_data_count}
                    valueStyle={{ color: '#1677ff' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="疑点数据"
                    value={statistics.unmatched_count}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Col>
              </Row>
            )}
          </Col>
        </Row>

        <Divider />

        
        {/* 操作按钮 */}
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Space>
            {access.canReadTaxSummary && (
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchTaxSummary}
                loading={loading}
              >
                刷新数据
              </Button>
            )}
            {access.canExportTaxSummary && (
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExport}
                loading={exportLoading}
              >
                导出Excel
              </Button>
            )}
          </Space>
        </div>

        {/* 税务汇总表格 */}
        <Card title={`${currentYear}年税务代缴汇总表`} size="small">
          <Table
            columns={columns}
            dataSource={taxSummaryData}
            rowKey="category"
            loading={loading}
            pagination={false}
            scroll={{ x: 800 }}
            summary={() => (
              <Table.Summary.Row style={{ fontWeight: 'bold', backgroundColor: '#fafafa' }}>
                <Table.Summary.Cell index={0}>合计</Table.Summary.Cell>
                <Table.Summary.Cell index={1}>-</Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  {totalCount.toLocaleString()}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  ¥{totalAmount.toLocaleString()}
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </Card>

        {/* 说明信息 */}
        <div style={{ marginTop: 16, padding: 16, backgroundColor: '#f6f8fa', borderRadius: 6 }}>
          <Text type="secondary">
            <strong>说明：</strong>
            <br />
            • 本表统计了{currentYear}年度（已匹配正确的数据）各代缴类别的人数和代缴金额
            <br />
            • 数据来源于参保数据管理系统
            <br />
            • 支持导出Excel格式，方便进一步分析和处理
          </Text>
        </div>
      </Card>
    </PageContainer>
  );
};

export default () => (
  <App>
    <TaxSummaryPage />
  </App>
); 