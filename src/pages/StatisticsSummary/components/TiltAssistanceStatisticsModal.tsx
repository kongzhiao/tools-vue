import React from 'react';
import { Modal, Button, Card, Table, Spin, message } from 'antd';
import { useAccess } from '@umijs/max';
import { exportTiltAssistanceStatistics } from '@/services/statisticsSummary';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface TiltAssistanceStatisticsModalProps {
  visible: boolean;
  onCancel: () => void;
  data: any[];
  loading: boolean;
  projectIds: number[];
}

const TiltAssistanceStatisticsModal: React.FC<TiltAssistanceStatisticsModalProps> = ({
  visible,
  onCancel,
  data,
  loading,
  projectIds,
}) => {
  const access = useAccess();
  const handleExport = () => {
    try {
      // 准备Excel数据
      const excelData = data.map((projectStats, index) => ({
        '月份': projectStats.project_code,
        '人次': projectStats.summary.total_count,
        '倾斜救助金额': projectStats.summary.total_tilt_assistance,
      }));

      // 创建工作簿
      const workbook = XLSX.utils.book_new();
      
      // 创建工作表
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // 设置列宽
      const colWidths = [
        { wch: 15 }, // 月份
        { wch: 10 }, // 人次
        { wch: 20 }, // 倾斜救助金额
      ];
      worksheet['!cols'] = colWidths;
      
      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, '倾斜救助统计');
      
      // 生成Excel文件并下载
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // 生成文件名（包含当前日期）
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `倾斜救助统计_${dateStr}.xlsx`;
      
      saveAs(blob, filename);
      message.success('倾斜救助统计导出成功');
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
      title="倾斜救助统计结果"
      open={visible}
      onCancel={onCancel}
      width={1200}
      footer={[
        access.canExportStatisticsSummary && (
          <Button key="export" type="primary" onClick={handleExport}>
            导出倾斜救助统计
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
                        // 汇总
                        summaryCount: projectStats.summary.total_count,
                        summaryTiltAssistance: projectStats.summary.total_tilt_assistance,
                      })),
                  ]}
                  columns={[
                    {
                      title: '月份',
                      key: 'month',
                      align: 'center', 
                      dataIndex: 'month',
                      width: 80,
                      fixed: 'left' as const,
                    },
                    { 
                        title: '人次', 
                        dataIndex: 'summaryCount', 
                        key: 'summaryCount', 
                        align: 'center',
                        width: 80,
                    },
                    { 
                        title: '倾斜救助金额', 
                        dataIndex: 'summaryTiltAssistance', 
                        key: 'summaryTiltAssistance', 
                        align: 'right', 
                        width: 150,
                        render: (v) => `¥${v.toFixed(2)}`,
                        ellipsis: false,
                    },
                  ]}
                  pagination={false}
                  size="small"
                  bordered
                  scroll={{ x: 400 }}
                />
              </div>
            </Card>
        </div>
      )}
    </Modal>
  );
};

export default TiltAssistanceStatisticsModal;
