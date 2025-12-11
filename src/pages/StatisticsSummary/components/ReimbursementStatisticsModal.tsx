import React from 'react';
import { Modal, Button, Card, Table, Spin, message } from 'antd';
import { useAccess } from '@umijs/max';
import { exportReimbursementStatistics } from '@/services/statisticsSummary';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface ReimbursementStatisticsModalProps {
  visible: boolean;
  onCancel: () => void;
  data: any[];
  loading: boolean;
  projectIds: number[];
}

// 金额格式化：转为带¥的两位小数
const formatMoney = (value: number | undefined) => (value !== undefined ? `¥${value.toFixed(2)}` : '¥0.00');

// 报销比例格式化：计算"基本医保报销 / 符合医保报销"的百分比
const formatReimbursementRatio = (
  eligible: number,
  basic: number,
  serious: number,
  large: number,
  assistance: number,
  tilt: number
  ) => {
  if (eligible === 0) return '0.00%';
  const ratio = (basic + serious + large + assistance + tilt) / eligible * 100;
  return `${ratio.toFixed(2)}%`;
};

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
                  // 区内结算报销金额合计
                  {
                    title: '区内结算报销金额合计',
                    children: [
                      { title: '费用总额', dataIndex: 'innerTotalCost', key: 'innerTotalCost', align: 'right' as const, render: formatMoney },
                      { title: '符合医保报销金额', dataIndex: 'innerEligible', key: 'innerEligible', align: 'right' as const, render: formatMoney },
                      { title: '基本医保报销金额', dataIndex: 'innerBasic', key: 'innerBasic', align: 'right' as const, render: formatMoney },
                      { title: '大病报销金额', dataIndex: 'innerSerious', key: 'innerSerious', align: 'right' as const, render: formatMoney },
                      { title: '大额报销金额', dataIndex: 'innerLarge', key: 'innerLarge', align: 'right' as const, render: formatMoney },
                      { title: '医疗救助', dataIndex: 'innerAssistance', key: 'innerAssistance', align: 'right' as const, render: formatMoney },
                      { title: '倾斜救助', dataIndex: 'innerTilt', key: 'innerTilt', align: 'right' as const, render: formatMoney },
                      { 
                        title: '报销比例', 
                        dataIndex: 'innerRatio', 
                        key: 'innerRatio', 
                        align: 'center' as const, 
                        render: (_: any, record: any) => 
                          formatReimbursementRatio(
                            record.innerEligible || 0,
                            record.innerBasic || 0,
                            record.innerSerious || 0,
                            record.innerLarge || 0,
                            record.innerAssistance || 0,
                            record.innerTilt || 0
                          )
                      },
                    ],
                  },
                  // 跨区结算报销金额合计（黄色背景）
                  {
                    title: '跨区结算报销金额合计',
                    className: 'yellow-bg', // 自定义类名，用于设置黄色背景
                    children: [
                      { title: '费用总额', dataIndex: 'crossTotalCost', key: 'crossTotalCost', align: 'right' as const, render: formatMoney },
                      { title: '符合医保报销金额', dataIndex: 'crossEligible', key: 'crossEligible', align: 'right' as const, render: formatMoney },
                      { title: '基本医保报销金额', dataIndex: 'crossBasic', key: 'crossBasic', align: 'right' as const, render: formatMoney },
                      { title: '大病报销金额', dataIndex: 'crossSerious', key: 'crossSerious', align: 'right' as const, render: formatMoney },
                      { title: '大额报销金额', dataIndex: 'crossLarge', key: 'crossLarge', align: 'right' as const, render: formatMoney },
                      { title: '医疗救助', dataIndex: 'crossAssistance', key: 'crossAssistance', align: 'right' as const, render: formatMoney },
                      { title: '倾斜救助', dataIndex: 'crossTilt', key: 'crossTilt', align: 'right' as const, render: formatMoney },
                      { 
                        title: '报销比例', 
                        dataIndex: 'crossRatio', 
                        key: 'crossRatio', 
                        align: 'center' as const, 
                        render: (_: any, record: any) => 
                          formatReimbursementRatio(
                            record.crossEligible || 0,
                            record.crossBasic || 0,
                            record.crossSerious || 0,
                            record.crossLarge || 0,
                            record.crossAssistance || 0,
                            record.crossTilt || 0
                          )},
                    ],
                  },
                  // 手工结算报销金额合计
                  {
                    title: '手工结算报销金额合计',
                    children: [
                      { title: '费用总额', dataIndex: 'manualTotalCost', key: 'manualTotalCost', align: 'right' as const, render: formatMoney },
                      { title: '符合医保报销金额', dataIndex: 'manualEligible', key: 'manualEligible', align: 'right' as const, render: formatMoney },
                      { title: '基本医保报销金额', dataIndex: 'manualBasic', key: 'manualBasic', align: 'right' as const, render: formatMoney },
                      { title: '医疗救助', dataIndex: 'manualAssistance', key: 'manualAssistance', align: 'right' as const, render: formatMoney },
                      { 
                        title: '报销比例', 
                        dataIndex: 'manualRatio', 
                        key: 'manualRatio', 
                        align: 'center' as const, 
                        render: (_: any, record: any) => 
                          formatReimbursementRatio(
                            record.manualEligible || 0,
                            record.manualBasic || 0,
                            0,
                            0,
                            record.manualAssistance || 0,
                            0
                          )},
                    ],
                  },
                  // 合计
                  {
                    title: '合计',
                    children: [
                      { title: '费用总额', dataIndex: 'totalCost', key: 'totalCost', align: 'right' as const, render: formatMoney },
                      { title: '符合医保报销金额', dataIndex: 'totalEligible', key: 'totalEligible', align: 'right' as const, render: formatMoney },
                      { title: '基本医保报销金额（含大病大额）', dataIndex: 'totalBasic', key: 'totalBasic', align: 'right' as const, render: formatMoney },
                      { title: '医疗救助', dataIndex: 'totalAssistance', key: 'totalAssistance', align: 'right' as const, render: formatMoney },
                      { title: '倾斜救助', dataIndex: 'totalTilt', key: 'totalTilt', align: 'right' as const, render: formatMoney },
                      { title: '合计救助金额', dataIndex: 'totalSerious', key: 'totalSerious', align: 'right' as const, render: formatMoney },
                      { 
                        title: '符合政策范围内 报销比例（报销金额/符合医保报销金额）', 
                        dataIndex: 'totalRatio', 
                        key: 'totalRatio', 
                        align: 'center' as const,
                        render: (_: any, record: any) => {
                          const denominator = record.totalEligible || 0;
                          if (denominator === 0) return '-';
                          const numerator = (record.totalBasic || 0)
                            + (record.totalAssistance || 0)
                            + (record.totalTilt || 0);
                          const ratio = numerator / denominator * 100;
                          return `${ratio.toFixed(2)}%`;
                        },
                      },
                      { 
                        title: '综合报销率 \n\n 实际报销金额/总医疗费用', 
                        dataIndex: 'totalRatio', 
                        key: 'totalRatio', 
                        align: 'center' as const, 
                        render: (_: any, record: any) => {
                          const denominator = record.totalCost || 0;
                          if (denominator === 0) return '-';
                          const numerator = (record.totalBasic || 0)
                            + (record.totalAssistance || 0)
                            + (record.totalTilt || 0);
                          const ratio = numerator / denominator * 100;
                          return `${ratio.toFixed(2)}%`;
                        },
                      },
                    ],
                  },
];

// Excel多级表头生成函数
const generateExcelHeaders = (columnsConfig: any[]) => {
  const firstRowHeaders: string[] = []; // 第一行：分组标题
  const secondRowHeaders: string[] = []; // 第二行：具体字段
  const colWidths: any[] = [];
  const merges: any[] = []; // 合并单元格配置
  
  let colIndex = 0;
  
  columnsConfig.forEach((column) => {
    if (column.children) {
      // 有子列的情况，创建分组表头
      const groupTitle = column.title.includes('区内') ? '区内结算' : 
                        column.title.includes('跨区') ? '跨区结算' : 
                        column.title.includes('手工') ? '手工结算' : 
                        column.title.includes('合计') ? '合计' : column.title;
      
      const childCount = column.children.length;
      const startCol = colIndex;
      
      // 第一行：分组标题
      firstRowHeaders.push(groupTitle);
      
      // 第二行：具体字段标题
      column.children.forEach((child: any) => {
        const fieldTitle = child.title;
        secondRowHeaders.push(fieldTitle);
        
        // 设置列宽
        const width = Math.max(fieldTitle.length * 2, 12);
        colWidths.push({ wch: width });
        colIndex++;
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
      secondRowHeaders.push(column.title);
      
      const width = Math.max(column.title.length * 2, 12);
      colWidths.push({ wch: width });
      colIndex++;
    }
  });
  
  return { 
    firstRowHeaders, 
    secondRowHeaders, 
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
        if (child.dataIndex) {
          mapping[child.title] = child.dataIndex;
        }
      });
    } else if (column.dataIndex) {
      mapping[column.title] = column.dataIndex;
    }
  });
  
  return mapping;
};

const ReimbursementStatisticsModal: React.FC<ReimbursementStatisticsModalProps> = ({
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
      const { firstRowHeaders, secondRowHeaders, colWidths, merges } = generateExcelHeaders(columnsConfig);
      
      // 准备Excel数据
      const excelData = data.map((projectStats, index) => {
        // 计算报销比例
        const innerRatio = formatReimbursementRatio(
          projectStats.import_types['区内明细']?.eligible_reimbursement || 0,
          projectStats.import_types['区内明细']?.basic_medical_reimbursement || 0,
          projectStats.import_types['区内明细']?.serious_illness_reimbursement || 0,
          projectStats.import_types['区内明细']?.large_amount_reimbursement || 0,
          projectStats.import_types['区内明细']?.medical_assistance_amount || 0,
          projectStats.import_types['区内明细']?.tilt_assistance || 0
        );

        const crossRatio = formatReimbursementRatio(
          projectStats.import_types['跨区明细']?.eligible_reimbursement || 0,
          projectStats.import_types['跨区明细']?.basic_medical_reimbursement || 0,
          projectStats.import_types['跨区明细']?.serious_illness_reimbursement || 0,
          projectStats.import_types['跨区明细']?.large_amount_reimbursement || 0,
          projectStats.import_types['跨区明细']?.medical_assistance_amount || 0,
          projectStats.import_types['跨区明细']?.tilt_assistance || 0
        );

        const manualRatio = formatReimbursementRatio(
          projectStats.import_types['手工明细']?.eligible_reimbursement || 0,
          projectStats.import_types['手工明细']?.basic_medical_reimbursement || 0,
          0,
          0,
          projectStats.import_types['手工明细']?.medical_assistance_amount || 0,
          0
        );

        // 计算合计报销比例
        const totalEligible = projectStats.summary.eligible_reimbursement;
        const totalBasic = projectStats.summary.basic_medical_reimbursement 
                          + projectStats.summary.serious_illness_reimbursement 
                          + projectStats.summary.large_amount_reimbursement;
        const totalAssistance = projectStats.summary.medical_assistance_amount;
        const totalTilt = projectStats.summary.tilt_assistance;
        
        const totalRatio = totalEligible === 0 ? '0.00%' : 
          `${((totalBasic + totalAssistance + totalTilt) / totalEligible * 100).toFixed(2)}%`;
        
        // 计算综合报销率
        const totalCost = projectStats.summary.total_cost;
        const comprehensiveRatio = totalCost === 0 ? '0.00%' : 
          `${((totalBasic + totalAssistance + totalTilt) / totalCost * 100).toFixed(2)}%`;

        // 计算救助金额合计
        const totalSerious = totalAssistance + totalTilt;

        // 按照表头顺序返回数据数组
        return [
          projectStats.project_code, // 月份
          // 区内结算报销金额合计
          formatMoney(projectStats.import_types['区内明细']?.total_cost || 0), // 费用总额
          formatMoney(projectStats.import_types['区内明细']?.eligible_reimbursement || 0), // 符合医保报销金额
          formatMoney(projectStats.import_types['区内明细']?.basic_medical_reimbursement || 0), // 基本医保报销金额
          formatMoney(projectStats.import_types['区内明细']?.serious_illness_reimbursement || 0), // 大病报销金额
          formatMoney(projectStats.import_types['区内明细']?.large_amount_reimbursement || 0), // 大额报销金额
          formatMoney(projectStats.import_types['区内明细']?.medical_assistance_amount || 0), // 医疗救助
          formatMoney(projectStats.import_types['区内明细']?.tilt_assistance || 0), // 倾斜救助
          innerRatio, // 报销比例
          // 跨区结算报销金额合计
          formatMoney(projectStats.import_types['跨区明细']?.total_cost || 0), // 费用总额
          formatMoney(projectStats.import_types['跨区明细']?.eligible_reimbursement || 0), // 符合医保报销金额
          formatMoney(projectStats.import_types['跨区明细']?.basic_medical_reimbursement || 0), // 基本医保报销金额
          formatMoney(projectStats.import_types['跨区明细']?.serious_illness_reimbursement || 0), // 大病报销金额
          formatMoney(projectStats.import_types['跨区明细']?.large_amount_reimbursement || 0), // 大额报销金额
          formatMoney(projectStats.import_types['跨区明细']?.medical_assistance_amount || 0), // 医疗救助
          formatMoney(projectStats.import_types['跨区明细']?.tilt_assistance || 0), // 倾斜救助
          crossRatio, // 报销比例
          // 手工结算报销金额合计
          formatMoney(projectStats.import_types['手工明细']?.total_cost || 0), // 费用总额
          formatMoney(projectStats.import_types['手工明细']?.eligible_reimbursement || 0), // 符合医保报销金额
          formatMoney(projectStats.import_types['手工明细']?.basic_medical_reimbursement || 0), // 基本医保报销金额
          formatMoney(projectStats.import_types['手工明细']?.medical_assistance_amount || 0), // 医疗救助
          manualRatio, // 报销比例
          // 合计
          formatMoney(projectStats.summary.total_cost), // 费用总额
          formatMoney(projectStats.summary.eligible_reimbursement), // 符合医保报销金额
          formatMoney(totalBasic), // 基本医保报销金额（含大病大额）
          formatMoney(totalSerious), // 合计大病报销金额
          formatMoney(totalAssistance), // 医疗救助
          formatMoney(totalTilt), // 倾斜救助
          totalRatio, // 符合政策范围内报销比例
          comprehensiveRatio, // 综合报销率
        ];
      });

      // 创建工作簿
      const workbook = XLSX.utils.book_new();
      
      // 创建多行表头数据
      const headerData = [
        firstRowHeaders,
        secondRowHeaders,
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
      XLSX.utils.book_append_sheet(workbook, worksheet, '报销统计');
      
      // 生成Excel文件并下载
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // 生成文件名（包含当前日期）
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `报销统计_${dateStr}.xlsx`;
      
      saveAs(blob, filename);
        message.success('报销统计导出成功');
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
      title="报销统计结果"
      open={visible}
      onCancel={onCancel}
      width={1400}
      footer={[
        access.canExportStatisticsSummary && (
          <Button key="export" type="primary" onClick={handleExport}>
            导出报销统计
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
                    innerTotalCost: projectStats.import_types['区内明细']?.total_cost || 0,
                    innerEligible: projectStats.import_types['区内明细']?.eligible_reimbursement || 0,
                    innerBasic: projectStats.import_types['区内明细']?.basic_medical_reimbursement || 0,
                    innerSerious: projectStats.import_types['区内明细']?.serious_illness_reimbursement || 0,
                    innerLarge: projectStats.import_types['区内明细']?.large_amount_reimbursement || 0,
                    innerAssistance: projectStats.import_types['区内明细']?.medical_assistance_amount || 0,
                    innerTilt: projectStats.import_types['区内明细']?.tilt_assistance || 0,
              
                    // 跨区明细
                    crossTotalCost: projectStats.import_types['跨区明细']?.total_cost || 0,
                    crossEligible: projectStats.import_types['跨区明细']?.eligible_reimbursement || 0,
                    crossBasic: projectStats.import_types['跨区明细']?.basic_medical_reimbursement || 0,
                    crossSerious: projectStats.import_types['跨区明细']?.serious_illness_reimbursement || 0,
                    crossLarge: projectStats.import_types['跨区明细']?.large_amount_reimbursement || 0,
                    crossAssistance: projectStats.import_types['跨区明细']?.medical_assistance_amount || 0,
                    crossTilt: projectStats.import_types['跨区明细']?.tilt_assistance || 0,
              
                    // 手工明细
                    manualTotalCost: projectStats.import_types['手工明细']?.total_cost || 0,
                    manualEligible: projectStats.import_types['手工明细']?.eligible_reimbursement || 0,
                    manualBasic: projectStats.import_types['手工明细']?.basic_medical_reimbursement || 0,
                    manualSerious: projectStats.import_types['手工明细']?.serious_illness_reimbursement || 0,
                    manualLarge: projectStats.import_types['手工明细']?.large_amount_reimbursement || 0,
                    manualAssistance: projectStats.import_types['手工明细']?.medical_assistance_amount || 0,
                    manualTilt: projectStats.import_types['手工明细']?.tilt_assistance || 0,
              
                    // 合计
                    totalCost: projectStats.summary.total_cost,
                    totalEligible: projectStats.summary.eligible_reimbursement,
                    totalBasic: projectStats.summary.basic_medical_reimbursement 
                              + projectStats.summary.serious_illness_reimbursement 
                              + projectStats.summary.large_amount_reimbursement,
                    totalAssistance: projectStats.summary.medical_assistance_amount,
                    totalTilt: projectStats.summary.tilt_assistance,
                    totalSerious: projectStats.summary.medical_assistance_amount + projectStats.summary.tilt_assistance,
                  })),
                ]}
                columns={getColumnsConfig()}
                pagination={false}
                size="small"
                bordered
              />
              </div>
            </Card>
        </div>
      )}
    </Modal>
  );
};

export default ReimbursementStatisticsModal;
