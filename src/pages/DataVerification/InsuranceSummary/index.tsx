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
  App,
  Typography,
  Divider,
} from 'antd';
import { useAccess } from '@umijs/max';
import {
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getYears, getStatistics } from '@/services/insuranceData';
import { getInsuranceSummary, CategoryLevelMapping } from '@/services/insuranceSummary';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const { Text } = Typography;
const { Option } = Select;

interface InsuranceSummaryData {
  street_town: string;
  categories: {
    [key: string]: {
      count: number;
      amount: number;
      levels: {
        [key: string]: { count: number; amount: number };
      };
    };
  };
  total_count: number;
  total_amount: number;
}


const InsuranceSummaryPage: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const access = useAccess();

  // 状态管理
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [years, setYears] = useState<number[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<InsuranceSummaryData[]>([]);
  const [categoriesLevelsMapping, setCategoriesLevelsMapping] = useState<CategoryLevelMapping[]>([]);
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

  // 获取参保汇总数据
  const fetchInsuranceSummary = async () => {
    setLoading(true);
    try {
      const response = await getInsuranceSummary(currentYear);
      if (response.code === 0) {
        setSummaryData(response.data.data);
        setCategoriesLevelsMapping(response.data.categories_levels_mapping);
        setTotalCount(response.data.total_count);
        setTotalAmount(response.data.total_amount);
      } else {
        messageApi.error(response.message || '获取参保汇总数据失败');
      }
    } catch (error) {
      console.error('获取参保汇总数据失败:', error);
      messageApi.error('获取参保汇总数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 生成Excel多级表头配置
  const generateExcelHeaders = () => {
    const firstRowHeaders: string[] = [];
    const secondRowHeaders: string[] = [];
    const thirdRowHeaders: string[] = [];
    const colWidths: any[] = [];
    const merges: any[] = [];

    let colIndex = 0;

    firstRowHeaders.push('镇街');
    secondRowHeaders.push('');
    thirdRowHeaders.push('');
    colWidths.push({ wch: 15 });
    colIndex += 1;

    merges.push({
      s: { r: 0, c: 0 },
      e: { r: 2, c: 0 }
    });

    categoriesLevelsMapping.forEach(categoryMapping => {
      const { category, levels: categoryLevels } = categoryMapping;
      const childCount = categoryLevels.length * 2;
      const startCol = colIndex;

      firstRowHeaders.push(category);
      categoryLevels.forEach(level => {
        secondRowHeaders.push(`${level}`);
        secondRowHeaders.push(`${level}`);
        thirdRowHeaders.push(`人数`);
        thirdRowHeaders.push(`金额（元）`);
        colWidths.push({ wch: 10 });
        colWidths.push({ wch: 12 });

        merges.push({
          s: { r: 1, c: colIndex },
          e: { r: 1, c: colIndex + 1 }
        });

        colIndex += 2;
      });

      if (childCount > 1) {
        merges.push({
          s: { r: 0, c: startCol },
          e: { r: 0, c: startCol + childCount - 1 }
        });
      }

      for (let i = 1; i < childCount; i++) {
        firstRowHeaders.push('');
      }
    });

    firstRowHeaders.push('总计');
    firstRowHeaders.push('');
    secondRowHeaders.push('');
    secondRowHeaders.push('');
    thirdRowHeaders.push('总人数');
    thirdRowHeaders.push('总金额（元）');
    colWidths.push({ wch: 12 });
    colWidths.push({ wch: 15 });

    merges.push({
      s: { r: 0, c: colIndex },
      e: { r: 1, c: colIndex + 1 }
    });

    return { firstRowHeaders, secondRowHeaders, thirdRowHeaders, colWidths, merges };
  };

  // 导出参保汇总数据
  const handleExport = () => {
    setExportLoading(true);
    try {
      const { firstRowHeaders, secondRowHeaders, thirdRowHeaders, colWidths, merges } = generateExcelHeaders();

      const excelData = summaryData.map((item) => {
        const rowData = [item.street_town];
        categoriesLevelsMapping.forEach(categoryMapping => {
          const { category, levels: categoryLevels } = categoryMapping;
          categoryLevels.forEach(level => {
            const count = item.categories[category]?.levels?.[level]?.count || 0;
            const amount = item.categories[category]?.levels?.[level]?.amount || 0;
            rowData.push(count.toString(), amount.toString());
          });
        });
        rowData.push(item.total_count.toString(), item.total_amount.toString());
        return rowData;
      });

      const workbook = XLSX.utils.book_new();
      const headerData = [firstRowHeaders, secondRowHeaders, thirdRowHeaders, ...excelData];
      const worksheet = XLSX.utils.aoa_to_sheet(headerData);
      worksheet['!cols'] = colWidths;
      if (merges.length > 0) worksheet['!merges'] = merges;

      XLSX.utils.book_append_sheet(workbook, worksheet, '参保数据汇总');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const filename = `${currentYear}年参保数据汇总表_${new Date().getTime()}.xlsx`;
      saveAs(blob, filename);
      messageApi.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      messageApi.error('导出失败');
    } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  useEffect(() => {
    fetchStatistics();
    fetchInsuranceSummary();
  }, [currentYear]);

  // 生成表格列定义
  const generateColumns = (): ColumnsType<any> => {
    const baseColumns: ColumnsType<any> = [
      {
        title: '镇街',
        dataIndex: 'street_town',
        key: 'street_town',
        width: 150,
        fixed: 'left',
        align: 'center',
      },
    ];

    categoriesLevelsMapping.forEach(categoryMapping => {
      const { category, levels: categoryLevels } = categoryMapping;
      const categoryChildren: ColumnsType<any> = [];

      categoryLevels.forEach(level => {
        categoryChildren.push({
          title: level,
          key: `${category}_${level}`,
          children: [
            {
              title: '人数',
              dataIndex: ['categories', category, 'levels', level, 'count'],
              key: `${category}_${level}_count`,
              width: 80,
              align: 'right',
              render: (value) => value?.toLocaleString() || '0',
            },
            {
              title: '金额（元）',
              dataIndex: ['categories', category, 'levels', level, 'amount'],
              key: `${category}_${level}_amount`,
              width: 100,
              align: 'right',
              render: (value) => value ? `¥${value.toLocaleString()}` : '¥0',
            }
          ]
        });
      });

      baseColumns.push({
        title: category,
        children: categoryChildren,
        key: category,
      });
    });

    baseColumns.push({
      title: '总计',
      children: [
        {
          title: '人数',
          dataIndex: 'total_count',
          key: 'total_count',
          width: 100,
          align: 'right',
          render: (value) => value?.toLocaleString() || '0',
        },
        {
          title: '金额（元）',
          dataIndex: 'total_amount',
          key: 'total_amount',
          width: 120,
          align: 'right',
          render: (value) => value ? `¥${value.toLocaleString()}` : '¥0',
        },
      ],
    });

    return baseColumns;
  };

  return (
    <PageContainer>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small">
            <Form layout="vertical">
              <Form.Item label="年度" style={{ marginBottom: 0 }}>
                <Select
                  value={currentYear}
                  onChange={setCurrentYear}
                  style={{ width: '100%' }}
                >
                  {years.sort((a, b) => b - a).map(year => (
                    <Option key={year} value={year}>{year}年</Option>
                  ))}
                </Select>
              </Form.Item>
            </Form>
          </Card>
        </Col>
        {statistics && (
          <>
            <Col span={5}>
              <Card size="small">
                <Statistic
                  title="总记录数"
                  value={statistics.total}
                  valueStyle={{ color: '#595959', fontSize: '18px' }}
                />
              </Card>
            </Col>
            <Col span={5}>
              <Card size="small">
                <Statistic
                  title="正确数据"
                  value={statistics.matched_count}
                  valueStyle={{ color: '#52c41a', fontSize: '18px' }}
                />
              </Card>
            </Col>
            <Col span={5}>
              <Card size="small">
                <Statistic
                  title="待匹配数量"
                  value={statistics.unmatched_data_count}
                  valueStyle={{ color: '#1677ff', fontSize: '18px' }}
                />
              </Card>
            </Col>
            <Col span={5}>
              <Card size="small">
                <Statistic
                  title="疑点数据"
                  value={statistics.unmatched_count}
                  valueStyle={{ color: '#ff4d4f', fontSize: '18px' }}
                />
              </Card>
            </Col>
          </>
        )}
      </Row>

      <Card>
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Space>
            {access.canReadInsuranceSummary && (
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchInsuranceSummary}
                loading={loading}
              >
                刷新数据
              </Button>
            )}
            {access.canExportInsuranceSummary && (
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

        <Card title={`${currentYear}年参保数据汇总表`} size="small">
          <Table
            columns={generateColumns()}
            dataSource={summaryData}
            rowKey="street_town"
            loading={loading}
            pagination={false}
            scroll={{ x: 'max-content' }}
            summary={() => {
              const summaryCells = [];
              let cellIndex = 1;

              summaryCells.push(
                <Table.Summary.Cell key="total" index={0}>合计</Table.Summary.Cell>
              );

              categoriesLevelsMapping.forEach(categoryMapping => {
                const { category, levels: categoryLevels } = categoryMapping;
                categoryLevels.forEach(level => {
                  const levelCount = summaryData.reduce((sum, item) => {
                    const count = item.categories[category]?.levels?.[level]?.count || 0;
                    return sum + count;
                  }, 0);
                  const levelAmount = summaryData.reduce((sum, item) => {
                    const amount = item.categories[category]?.levels?.[level]?.amount || 0;
                    return sum + amount;
                  }, 0);

                  summaryCells.push(
                    <Table.Summary.Cell key={`${category}_${level}_count`} index={cellIndex++} align="right">
                      {levelCount.toLocaleString()}
                    </Table.Summary.Cell>
                  );
                  summaryCells.push(
                    <Table.Summary.Cell key={`${category}_${level}_amount`} index={cellIndex++} align="right">
                      ¥{levelAmount.toLocaleString()}
                    </Table.Summary.Cell>
                  );
                });
              });

              summaryCells.push(
                <Table.Summary.Cell key="total_count" index={cellIndex++} align="right">
                  {totalCount.toLocaleString()}
                </Table.Summary.Cell>
              );
              summaryCells.push(
                <Table.Summary.Cell key="total_amount" index={cellIndex++} align="right">
                  ¥{totalAmount.toLocaleString()}
                </Table.Summary.Cell>
              );

              return (
                <Table.Summary.Row style={{ fontWeight: 'bold', backgroundColor: '#fafafa' }}>
                  {summaryCells}
                </Table.Summary.Row>
              );
            }}
          />
        </Card>

        <div style={{ marginTop: 16, padding: 16, backgroundColor: '#f6f8fa', borderRadius: 6 }}>
          <Text type="secondary">
            <strong>说明：</strong>
            <br />
            • 本表按镇街和代缴类别统计{currentYear}年度（已匹配正确的数据）参保人数和金额
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
    <InsuranceSummaryPage />
  </App>
);