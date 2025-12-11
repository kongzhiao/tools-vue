import React from 'react';
import { Modal, Button, Card, Table, Spin, message } from 'antd';
import { useAccess } from '@umijs/max';
import { exportPersonTimeStatistics } from '@/services/statisticsSummary';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface PersonTimeStatisticsModalProps {
  visible: boolean;
  onCancel: () => void;
  data: any[];
  loading: boolean;
  projectIds: number[];
}

// 统一的columns配置
const getColumnsConfig = () => [
  {
    title: '月份',
    key: 'month',
    align: 'center' as const, 
    dataIndex: 'month',
    width: 80,
    fixed: 'left' as const,
  },
  // 区内明细
  {
    title: '区内明细',
    children: [
      {
        title: '门诊',
        children: [
          { 
            title: '人次', 
            dataIndex: 'innerOutpatientCount', 
            key: 'innerOutpatientCount', 
            align: 'center' as const,
            width: 60,
          },
          { 
            title: '金额', 
            dataIndex: 'innerOutpatientAmount', 
            key: 'innerOutpatientAmount', 
            align: 'right' as const, 
            width: 120,
            render: (v: number) => `¥${v.toFixed(2)}`,
            ellipsis: false,
          },
        ],
      },
      {
        title: '住院',
        children: [
          { 
            title: '人次', 
            dataIndex: 'innerInpatientCount', 
            key: 'innerInpatientCount', 
            align: 'center' as const,
            width: 60,
          },
          { 
            title: '金额', 
            dataIndex: 'innerInpatientAmount', 
            key: 'innerInpatientAmount', 
            align: 'right' as const, 
            width: 120,
            render: (v: number) => `¥${v.toFixed(2)}`,
            ellipsis: false,
          },
        ],
      },
      {
        title: '合计',
        children: [
          { 
            title: '人次', 
            dataIndex: 'innerTotalCount', 
            key: 'innerTotalCount', 
            align: 'center' as const,
            width: 60,
          },
          { 
            title: '金额', 
            dataIndex: 'innerTotalAmount', 
            key: 'innerTotalAmount', 
            align: 'right' as const, 
            width: 120,
            render: (v: number) => `¥${v.toFixed(2)}`,
            ellipsis: false,
          },
        ],
      },
    ],
  },
  // 跨区明细
  {
    title: '跨区明细',
    children: [
      {
        title: '门诊',
        children: [
          { 
            title: '人次', 
            dataIndex: 'crossOutpatientCount', 
            key: 'crossOutpatientCount', 
            align: 'center' as const,
            width: 60,
          },
          { 
            title: '金额', 
            dataIndex: 'crossOutpatientAmount', 
            key: 'crossOutpatientAmount', 
            align: 'right' as const, 
            width: 120,
            render: (v: number) => `¥${v.toFixed(2)}`,
            ellipsis: false,
          },
        ],
      },
      {
        title: '住院',
        children: [
          { 
            title: '人次', 
            dataIndex: 'crossInpatientCount', 
            key: 'crossInpatientCount', 
            align: 'center' as const,
            width: 60,
          },
          { 
            title: '金额', 
            dataIndex: 'crossInpatientAmount', 
            key: 'crossInpatientAmount', 
            align: 'right' as const, 
            width: 120,
            render: (v: number) => `¥${v.toFixed(2)}`,
            ellipsis: false,
          },
        ],
      },
      {
        title: '合计',
        children: [
          { 
            title: '人次', 
            dataIndex: 'crossTotalCount', 
            key: 'crossTotalCount', 
            align: 'center' as const,
            width: 60,
          },
          { 
            title: '金额', 
            dataIndex: 'crossTotalAmount', 
            key: 'crossTotalAmount', 
            align: 'right' as const, 
            width: 120,
            render: (v: number) => `¥${v.toFixed(2)}`,
            ellipsis: false,
          },
        ],
      },
    ],
  },
  // 手工明细
  {
    title: '手工明细',
    children: [
      
      {
        title: '门诊',
        children: [
          { 
            title: '人次', 
            dataIndex: 'manualOutpatientCount', 
            key: 'manualOutpatientCount', 
            align: 'center' as const,
            width: 60,
          },
          { 
            title: '金额', 
            dataIndex: 'manualOutpatientAmount', 
            key: 'manualOutpatientAmount', 
            align: 'right' as const, 
            width: 120,
            render: (v: number) => `¥${v.toFixed(2)}`,
            ellipsis: false,
          },
        ],
      },
      {
        title: '住院',
        children: [
          { 
            title: '人次', 
            dataIndex: 'manualInpatientCount', 
            key: 'manualInpatientCount', 
            align: 'center' as const,
            width: 60,
          },
          { 
            title: '金额', 
            dataIndex: 'manualInpatientAmount', 
            key: 'manualInpatientAmount', 
            align: 'right' as const, 
            width: 120,
            render: (v: number) => `¥${v.toFixed(2)}`,
            ellipsis: false,
          },
        ],
      },
      {
        title: '合计',
        children: [
          { 
            title: '人次', 
            dataIndex: 'manualTotalCount', 
            key: 'manualTotalCount', 
            align: 'center' as const,
            width: 60,
          },
          { 
            title: '金额', 
            dataIndex: 'manualTotalAmount', 
            key: 'manualTotalAmount', 
            align: 'right' as const, 
            width: 120,
            render: (v: number) => `¥${v.toFixed(2)}`,
            ellipsis: false,
          },
        ],
      },
    ],
  },
  // 汇总（红色表头）
  {
    title: '汇总',
    className: 'red-header', // 自定义类名，用于设置红色样式
    children: [
      {
        title: '门诊',
        children: [
          { 
            title: '人次', 
            dataIndex: 'summaryOutpatientCount', 
            key: 'summaryOutpatientCount', 
            align: 'center' as const,
            width: 60,
          },
          { 
            title: '金额', 
            dataIndex: 'summaryOutpatientAmount', 
            key: 'summaryOutpatientAmount', 
            align: 'right' as const, 
            width: 120,
            render: (v: number) => `¥${v.toFixed(2)}`,
            ellipsis: false,
          },
        ],
      },
      {
        title: '住院',
        children: [
          { 
            title: '人次', 
            dataIndex: 'summaryInpatientCount', 
            key: 'summaryInpatientCount', 
            align: 'center' as const,
            width: 60,
          },
          { 
            title: '金额', 
            dataIndex: 'summaryInpatientAmount', 
            key: 'summaryInpatientAmount', 
            align: 'right' as const, 
            width: 120,
            render: (v: number) => `¥${v.toFixed(2)}`,
            ellipsis: false,
          },
        ],
      },
      {
        title: '共计',
        children: [
          { 
            title: '人次', 
            dataIndex: 'summaryTotalCount', 
            key: 'summaryTotalCount', 
            align: 'center' as const,
            width: 60,
          },
          { 
            title: '金额', 
            dataIndex: 'summaryTotalAmount', 
            key: 'summaryTotalAmount', 
            align: 'right' as const, 
            width: 120,
            render: (v: number) => `¥${v.toFixed(2)}`,
            ellipsis: false,
          },
        ],
      },
    ],
  },
];

// Excel多级表头生成函数
const generateExcelHeaders = (columnsConfig: any[]) => {
  const firstRowHeaders: string[] = []; // 第一行：分组标题
  const secondRowHeaders: string[] = []; // 第二行：具体字段
  const thirdRowHeaders: string[] = []; // 第三行：具体字段
  const colWidths: any[] = [];
  const merges: any[] = []; // 合并单元格配置
  
  let colIndex = 0;
  
  columnsConfig.forEach((column) => {
    if (column.children) {
      // 有子列的情况，创建分组表头
      const groupTitle = column.title.includes('区内') ? '区内明细' : 
                        column.title.includes('跨区') ? '跨区明细' : 
                        column.title.includes('手工') ? '手工明细' : 
                        column.title.includes('汇总') ? '汇总' : column.title;
      
      // 需要考虑children下还可能有children（即三级表头的情况）
      let childCount = 0;
      column.children.forEach((child: any) => {
        if (child.children) {
          childCount += child.children.length;
        } else {
          childCount += 1;
        }
      });
      const startCol = colIndex;
      
      // 第一行：分组标题
      firstRowHeaders.push(groupTitle);
      
      // 第二行：具体字段标题
      column.children.forEach((child: any, index: number) => {

        if (child.children) {
          // 三级表头：分组 -> 类型 -> 字段
          const typeTitle = child.title;
          const typeStartCol = colIndex;
          
          child.children.forEach((grandChild: any) => {
            const fieldTitle = grandChild.title;
            secondRowHeaders.push(typeTitle);
            thirdRowHeaders.push(fieldTitle);
            // 设置列宽
            const width = Math.max(fieldTitle.length * 2, 12);
            colWidths.push({ wch: width });
            colIndex++;
          });
          
          // 如果该类型下有多个字段，需要合并第二行的类型标题
          if (child.children.length > 1) {
            merges.push({
              s: { r: 1, c: typeStartCol },
              e: { r: 1, c: typeStartCol + child.children.length - 1 }
            });
          }
        } else {
          // 二级表头：分组 -> 字段
          const fieldTitle = child.title;
          secondRowHeaders.push(''); // 第二行为空
          thirdRowHeaders.push(fieldTitle);
          
          // 设置列宽
          const width = Math.max(fieldTitle.length * 2, 12);
          colWidths.push({ wch: width });
          colIndex++;
        }
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
      
      
    } else {
      // 没有子列的情况，跨两行
      firstRowHeaders.push(column.title);
      secondRowHeaders.push('');
      thirdRowHeaders.push('');
      
      const width = Math.max(column.title.length * 2, 12);
      colWidths.push({ wch: width });
      colIndex++;
    }
  });
  
  return { 
    firstRowHeaders, 
    secondRowHeaders, 
    thirdRowHeaders,
    colWidths, 
    merges 
  };
};

// 根据columns配置生成Excel数据字段映射
const generateExcelDataMapping = (columnsConfig: any[]) => {
  const mapping: { [key: string]: string } = {};
  
  columnsConfig.forEach((column) => {
    if (column.children) {
      column.children.forEach((child: any) => {
        if (child.children) {
          child.children.forEach((grandChild: any) => {
            if (grandChild.dataIndex) {
              mapping[grandChild.title] = grandChild.dataIndex;
            }
          });
        } else if (child.dataIndex) {
          mapping[child.title] = child.dataIndex;
        }
      });
    } else if (column.dataIndex) {
      mapping[column.title] = column.dataIndex;
    }
  });
  
  return mapping;
};

const PersonTimeStatisticsModal: React.FC<PersonTimeStatisticsModalProps> = ({
  visible,
  onCancel,
  data,
  loading,
  projectIds,
}) => {
  const access = useAccess();
  const handleExport = () => {
    try {
      // 获取统一的columns配置
      const columnsConfig = getColumnsConfig();
      
      // 生成Excel多级表头配置
      const { firstRowHeaders, secondRowHeaders, thirdRowHeaders,colWidths, merges } = generateExcelHeaders(columnsConfig);
      
      // 准备Excel数据
      const excelData = data.map((projectStats, index) => {
        // 按照表头顺序返回数据数组
        return [
          projectStats.project_code, // 月份
          // 区内明细
          (projectStats.import_types['区内明细']?.outpatient_count || 0) + (projectStats.import_types['区内明细']?.inpatient_count || 0), // 合计_人次
          projectStats.import_types['区内明细']?.total_amount || 0, // 合计_金额
          projectStats.import_types['区内明细']?.outpatient_count || 0, // 门诊_人次
          projectStats.import_types['区内明细']?.outpatient_amount || 0, // 门诊_金额
          projectStats.import_types['区内明细']?.inpatient_count || 0, // 住院_人次
          projectStats.import_types['区内明细']?.inpatient_amount || 0, // 住院_金额
        // 跨区明细
          (projectStats.import_types['跨区明细']?.outpatient_count || 0) + (projectStats.import_types['跨区明细']?.inpatient_count || 0), // 合计_人次
          projectStats.import_types['跨区明细']?.total_amount || 0, // 合计_金额
          projectStats.import_types['跨区明细']?.outpatient_count || 0, // 门诊_人次
          projectStats.import_types['跨区明细']?.outpatient_amount || 0, // 门诊_金额
          projectStats.import_types['跨区明细']?.inpatient_count || 0, // 住院_人次
          projectStats.import_types['跨区明细']?.inpatient_amount || 0, // 住院_金额
        // 手工明细
          (projectStats.import_types['手工明细']?.outpatient_count || 0) + (projectStats.import_types['手工明细']?.inpatient_count || 0), // 合计_人次
          projectStats.import_types['手工明细']?.total_amount || 0, // 合计_金额
          projectStats.import_types['手工明细']?.outpatient_count || 0, // 门诊_人次
          projectStats.import_types['手工明细']?.outpatient_amount || 0, // 门诊_金额
          projectStats.import_types['手工明细']?.inpatient_count || 0, // 住院_人次
          projectStats.import_types['手工明细']?.inpatient_amount || 0, // 住院_金额
          // 汇总
          projectStats.summary.total_outpatient_count + projectStats.summary.total_inpatient_count, // 共计_人次
          projectStats.summary.total_outpatient_amount + projectStats.summary.total_inpatient_amount, // 共计_金额
          projectStats.summary.total_outpatient_count, // 门诊_人次
          projectStats.summary.total_outpatient_amount, // 门诊_金额
          projectStats.summary.total_inpatient_count, // 住院_人次
          projectStats.summary.total_inpatient_amount, // 住院_金额
        ];
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
      XLSX.utils.book_append_sheet(workbook, worksheet, '人次统计');
      
      // 生成Excel文件并下载
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // 生成文件名（包含当前日期）
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `人次统计_${dateStr}.xlsx`;
      
      saveAs(blob, filename);
      message.success('人次统计导出成功');
    } catch (error) {
      message.error('导出失败: ' + (error as Error).message);
    }
  };

  // 如果没有查看权限，不显示模态框
  if (!access.canReadStatisticsSummary) {
    return null;
  }

  return (
    <Modal
      title="人次统计结果"
      open={visible}
      onCancel={onCancel}
      width={1200}
      footer={[
        access.canExportStatisticsSummary && (
          <Button key="export" type="primary" onClick={handleExport}>
            导出人次统计
          </Button>
        ),
        <Button key="close" onClick={onCancel}>
          关闭
        </Button>
      ].filter(Boolean)}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>正在统计中...</div>
        </div>
      ) : (
        <div>
            <Card style={{ marginBottom: 16 }}>
              <div style={{ 
                overflowX: 'auto',
                fontSize: '12px'
              }}>
                <Table
                  dataSource={[
                    ...data.map((projectStats, index) => (
                      {
                        month: projectStats.project_code,
                        // 区内明细
                        innerTotalCount: (projectStats.import_types['区内明细']?.outpatient_count || 0) + (projectStats.import_types['区内明细']?.inpatient_count || 0),
                        innerTotalAmount: projectStats.import_types['区内明细']?.total_amount || 0,
                        innerOutpatientCount: projectStats.import_types['区内明细']?.outpatient_count || 0,
                        innerOutpatientAmount: projectStats.import_types['区内明细']?.outpatient_amount || 0,
                        innerInpatientCount: projectStats.import_types['区内明细']?.inpatient_count || 0,
                        innerInpatientAmount: projectStats.import_types['区内明细']?.inpatient_amount || 0,
                    
                        // 跨区明细
                        crossTotalCount: (projectStats.import_types['跨区明细']?.outpatient_count || 0) + (projectStats.import_types['跨区明细']?.inpatient_count || 0),
                        crossTotalAmount: projectStats.import_types['跨区明细']?.total_amount || 0,
                        crossOutpatientCount: projectStats.import_types['跨区明细']?.outpatient_count || 0,
                        crossOutpatientAmount: projectStats.import_types['跨区明细']?.outpatient_amount || 0,
                        crossInpatientCount: projectStats.import_types['跨区明细']?.inpatient_count || 0,
                        crossInpatientAmount: projectStats.import_types['跨区明细']?.inpatient_amount || 0,
                    
                        // 手工明细
                        manualTotalCount: (projectStats.import_types['手工明细']?.outpatient_count || 0) + (projectStats.import_types['手工明细']?.inpatient_count || 0),
                        manualTotalAmount: projectStats.import_types['手工明细']?.total_amount || 0,
                        manualOutpatientCount: projectStats.import_types['手工明细']?.outpatient_count || 0,
                        manualOutpatientAmount: projectStats.import_types['手工明细']?.outpatient_amount || 0,
                        manualInpatientCount: projectStats.import_types['手工明细']?.inpatient_count || 0,
                        manualInpatientAmount: projectStats.import_types['手工明细']?.inpatient_amount || 0,
                    
                        // 汇总
                        summaryTotalCount: projectStats.summary.total_outpatient_count + projectStats.summary.total_inpatient_count,
                        summaryTotalAmount: projectStats.summary.total_outpatient_amount + projectStats.summary.total_inpatient_amount,
                        summaryOutpatientCount: projectStats.summary.total_outpatient_count,
                        summaryOutpatientAmount: projectStats.summary.total_outpatient_amount,
                        summaryInpatientCount: projectStats.summary.total_inpatient_count,
                        summaryInpatientAmount: projectStats.summary.total_inpatient_amount,
                      })),
                  ]}
                  columns={getColumnsConfig()}
                  pagination={false}
                  size="small"
                  bordered
                  scroll={{ x: 1600 }}
                />
              </div>
            </Card>
        </div>
      )}
    </Modal>
  );
};

export default PersonTimeStatisticsModal;
