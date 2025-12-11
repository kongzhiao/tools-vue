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
import { getYears, getStatistics } from '@/services/insuranceData';
import { getInsuranceSummary, CategoryLevelMapping, InsuranceSummaryResponse } from '@/services/insuranceSummary';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const { Title, Text } = Typography;
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
  const [categories, setCategories] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
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
        setCategories(response.data.categories);
        setLevels(response.data.levels);
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
    const firstRowHeaders: string[] = []; // 第一行：分组标题
    const secondRowHeaders: string[] = []; // 第二行：具体字段
    const thirdRowHeaders: string[] = []; // 第三行：人数和金额字段
    const colWidths: any[] = [];
    const merges: any[] = []; // 合并单元格配置
    
    let colIndex = 0;
    
    // 添加镇街列
    firstRowHeaders.push('镇街');
    secondRowHeaders.push('');
    thirdRowHeaders.push('');
    colWidths.push({ wch: 10 }); // 人数列
    colWidths.push({ wch: 12 }); // 金额列
    colIndex += 1;
    
    // 合并镇街列
    merges.push({
      s: { r: 0, c: 0 },
      e: { r: 3, c: 0 }
    });
    
    // 使用categories_levels_mapping来生成列，确保显示所有配置的类别-档次组合
    categoriesLevelsMapping.forEach(categoryMapping => {
      const { category, levels: categoryLevels } = categoryMapping;
      
      const childCount = categoryLevels.length * 2; // 每个档次有2列：人数和金额
      const startCol = colIndex;
      
      // 第一行：类别标题
      firstRowHeaders.push(category);
      
      // 第二行和第三行：为每个档次添加标题
      categoryLevels.forEach(level => {
        secondRowHeaders.push(`${level}`);
        secondRowHeaders.push(`${level}`); // 每个档次需要两列
        thirdRowHeaders.push(`人数`);
        thirdRowHeaders.push(`金额（元）`);
        colWidths.push({ wch: 10 }); // 人数列
        colWidths.push({ wch: 12 }); // 金额列
        
        // 合并第二行的档次标题
        merges.push({
          s: { r: 1, c: colIndex },
          e: { r: 1, c: colIndex + 1 }
        });
        
        colIndex += 2;
      });
      
      // 如果子列数量大于1，需要合并第一行的单元格
      if (childCount > 1) {
        merges.push({
          s: { r: 0, c: startCol },
          e: { r: 0, c: startCol + childCount - 1 }
        });
      }
      
      // 为第一行添加空标题（除了第一个）
      for (let i = 1; i < childCount; i++) {
        firstRowHeaders.push('');
      }
    });
    
    // 添加合计列
    firstRowHeaders.push('合计');
    firstRowHeaders.push(''); // 第一行需要两个单元格，第二个为空
    secondRowHeaders.push('');
    secondRowHeaders.push(''); // 第二行需要两个空字符串
    thirdRowHeaders.push('总人数');
    thirdRowHeaders.push('总金额（元）');
    colWidths.push({ wch: 10 });
    colWidths.push({ wch: 12 });
    

    // 合并总计列
    merges.push({
      s: { r: 0, c: colIndex},
      e: { r: 1, c: colIndex + 1 }
    });
    
    return { 
      firstRowHeaders, 
      secondRowHeaders, 
      thirdRowHeaders,
      colWidths, 
      merges 
    };
  };

  // 导出参保汇总数据
  const handleExport = () => {
    setExportLoading(true);
    try {
      // 生成Excel多级表头配置
      const { firstRowHeaders, secondRowHeaders, thirdRowHeaders,colWidths, merges } = generateExcelHeaders();
      
      // 准备Excel数据
      const excelData = summaryData.map((item) => {
        const rowData = [item.street_town]; // 镇街
        
        // 按照categories_levels_mapping的顺序添加数据
        categoriesLevelsMapping.forEach(categoryMapping => {
          const { category, levels: categoryLevels } = categoryMapping;
          
          categoryLevels.forEach(level => {
            const count = item.categories[category]?.levels?.[level]?.count || 0;
            const amount = item.categories[category]?.levels?.[level]?.amount || 0;
            rowData.push(count.toString(), amount.toString());
          });
        });
        
        // 添加合计数据
        rowData.push(item.total_count.toString(), item.total_amount.toString());
        
        return rowData;
      });
      
      // 创建工作簿
      const workbook = XLSX.utils.book_new();
      
      // 创建多行表头数据
      const headerData = [
        firstRowHeaders,
        secondRowHeaders,
        thirdRowHeaders,
        ...excelData
      ];
      
      // 创建工作表
      const worksheet = XLSX.utils.aoa_to_sheet(headerData);
      
      // 设置列宽
      worksheet['!cols'] = colWidths;
      
      // 设置合并单元格
      if (merges.length > 0) {
        worksheet['!merges'] = merges;
      }
      
      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, '参保数据汇总');
      
      // 生成Excel文件并下载
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // 生成文件名（包含当前日期）
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `${currentYear}年参保数据汇总表_${dateStr}.xlsx`;
      
      saveAs(blob, filename);
      messageApi.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      messageApi.error('导出失败: ' + (error as Error).message);
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
    fetchInsuranceSummary();
  }, [currentYear]);

  // 生成表格列定义
  const generateColumns = (): ColumnsType<any> => {
    const baseColumns: ColumnsType<any> = [
      {
        title: '镇街',
        dataIndex: 'street_town',
        key: 'street_town',
        width: 120,
        fixed: 'left',
      },
    ];

    // 使用categories_levels_mapping来生成列，确保显示所有配置的类别-档次组合
    categoriesLevelsMapping.forEach(categoryMapping => {
      const { category, levels: categoryLevels } = categoryMapping;
      
      // 为每个类别创建子列
      const categoryChildren: ColumnsType<any> = [];
      
      categoryLevels.forEach(level => {
        // 为每个档次创建子列组
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

      // 添加类别列组
      baseColumns.push({
        title: category,
        children: categoryChildren,
        key: category,
      });
    });

    // 添加合计列
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
                <Col span={8}>
                  <Statistic
                    title="正确数据"
                    value={statistics.matched_count}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="待匹配数量"
                    value={statistics.unmatched_data_count}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
                <Col span={8}>
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

        {/* 参保汇总表格 */}
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
               
               // 添加镇街列
               summaryCells.push(
                 <Table.Summary.Cell key="total" index={0}>总计</Table.Summary.Cell>
               );
               
               // 使用categories_levels_mapping来生成汇总行，确保与列结构一致
               categoriesLevelsMapping.forEach(categoryMapping => {
                 const { category, levels: categoryLevels } = categoryMapping;
                 
                 // 为每个配置的档次添加合计单元格（人数和金额）
                 categoryLevels.forEach(level => {
                   const levelCount = summaryData.reduce((sum, item) => {
                     const count = item.categories[category]?.levels?.[level]?.count || 0;
                     return sum + (typeof count === 'number' ? count : 0);
                   }, 0);
                   const levelAmount = summaryData.reduce((sum, item) => {
                     const amount = item.categories[category]?.levels?.[level]?.amount || 0;
                     return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
                   }, 0);
                   
                   // 人数单元格
                   summaryCells.push(
                     <Table.Summary.Cell key={`${category}_${level}_count`} index={cellIndex++} align="right">
                       {levelCount.toLocaleString()}
                     </Table.Summary.Cell>
                   );
                   // 金额单元格
                   summaryCells.push(
                     <Table.Summary.Cell key={`${category}_${level}_amount`} index={cellIndex++} align="right">
                       ¥{levelAmount.toLocaleString()}
                     </Table.Summary.Cell>
                   );
                 });
               });
               
               // 添加总计列
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

        {/* 说明信息 */}
        <div style={{ marginTop: 16, padding: 16, backgroundColor: '#f6f8fa', borderRadius: 6 }}>
          <Text type="secondary">
            <strong>说明：</strong>
            <br />
            • 本表按镇街和代缴类别统计{currentYear}年度参保人数和金额
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