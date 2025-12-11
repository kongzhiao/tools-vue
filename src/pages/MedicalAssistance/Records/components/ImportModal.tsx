import React, { useState } from 'react';
import { Modal, Upload, Button, message, Alert, Space, Typography, Divider, Progress } from 'antd';
import { UploadOutlined, DownloadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { importAPI } from '@/services/medicalAssistance';

const { Text, Paragraph } = Typography;

interface ImportModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({
  visible,
  onCancel,
  onSuccess,
}) => {
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<any>(null);

  // 处理文件上传
  const handleUpload = async (file: File) => {
    // 验证文件类型
    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                   file.type === 'application/vnd.ms-excel';
    if (!isExcel) {
      message.error('只能上传 Excel 文件！');
      return false;
    }

    // 验证文件大小（10MB）
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('文件大小不能超过 10MB！');
      return false;
    }

    setUploading(true);
    setImportResult(null);

    try {
      const result = await importAPI.importExcel(file);
      
      if (result.code === 0) {
        setImportResult(result.data);
        message.success('Excel文件导入成功');
        onSuccess();
      } else {
        message.error(result.message || '导入失败');
      }
    } catch (error) {
      message.error('导入失败，请检查网络连接');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls',
    fileList,
    beforeUpload: (file) => {
      handleUpload(file);
      return false;
    },
    onChange: ({ fileList }) => {
      setFileList(fileList);
    },
  };

  // 下载模板
  const downloadTemplate = () => {
    // 创建Excel模板数据
    const templateData = [
      ['医疗救助数据导入模板'],
      ['姓名', '身份证号', '参保地', '就诊医疗机构名称', '医保就诊类别', '入院时间', '出院时间', '结算时间', '总费用', '医保政策范围内费用', '统筹报销金额', '大额报销金额', '大病报销金额', '医疗救助金额', '渝快保报销金额'],
      ['张三', '110101199001011234', '北京市朝阳区', '北京协和医院', '住院', '2024-01-01', '2024-01-10', '2024-01-15', '50000.00', '45000.00', '30000.00', '10000.00', '5000.00', '2000.00', '3000.00'],
      ['李四', '110101199001011235', '北京市海淀区', '北京大学第一医院', '门诊', '2024-01-05', '', '2024-01-05', '5000.00', '4500.00', '3000.00', '1000.00', '500.00', '200.00', '300.00'],
    ];

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    templateData.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    const templateUrl = '/assets/templates/medical-assistance/救助报销-就诊记录数据.xlsx';
    const link = document.createElement('a');
    link.href = templateUrl;
    link.download = '救助报销-就诊记录数据.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCancel = () => {
    setFileList([]);
    setImportResult(null);
    onCancel();
  };

  const renderImportResult = () => {
    if (!importResult) return null;

    const { patients, medical_records, summary } = importResult;
    
    return (
      <div style={{ marginTop: 16 }}>
        <Alert
          message="导入结果"
          description={
            <div>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>患者信息：</Text>
                  <Text type="success">成功导入 {patients.imported} 条</Text>
                  {patients.skipped > 0 && <Text type="warning">，跳过 {patients.skipped} 条</Text>}
                </div>
                <div>
                  <Text strong>就诊记录：</Text>
                  <Text type="success">成功导入 {medical_records.imported} 条</Text>
                  {medical_records.skipped > 0 && <Text type="warning">，跳过 {medical_records.skipped} 条</Text>}
                </div>
                <Divider />
                <div>
                  <Text strong>成功率：</Text>
                  <Text type="success">{summary.success_rate}%</Text>
                </div>
                {patients.errors.length > 0 || medical_records.errors.length > 0 ? (
                  <div>
                    <Text strong type="danger">错误详情：</Text>
                    <div style={{ 
                      maxHeight: '200px', 
                      overflow: 'auto', 
                      border: '1px solid #d9d9d9',
                      padding: '8px',
                      marginTop: '8px',
                      backgroundColor: '#fafafa'
                    }}>
                      {patients.errors.map((error: string, index: number) => (
                        <div key={`patient-${index}`} style={{ color: '#ff4d4f', fontSize: '12px', marginBottom: '4px' }}>
                          {error}
                        </div>
                      ))}
                      {medical_records.errors.map((error: string, index: number) => (
                        <div key={`record-${index}`} style={{ color: '#ff4d4f', fontSize: '12px', marginBottom: '4px' }}>
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </Space>
            </div>
          }
          type="success"
          showIcon
        />
      </div>
    );
  };

  return (
    <Modal
      title="导入医疗救助数据"
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          关闭
        </Button>
      ]}
      width={800}
    >
      <div style={{ padding: '20px 0' }}>
        {/* 说明信息 */}
        <Alert
          message="使用说明"
          description={
            <div>
              <Paragraph style={{ marginBottom: 8 }}>
                1. 请按照模板格式准备 Excel 文件，包含以下字段：
              </Paragraph>
              <ul style={{ marginBottom: 16 }}>
                <li><Text strong>患者信息</Text>：姓名、身份证号、参保地</li>
                <li><Text strong>就诊信息</Text>：就诊医疗机构名称、医保就诊类别、入院时间、出院时间、结算时间</li>
                <li><Text strong>费用信息</Text>：总费用、医保政策范围内费用、统筹报销金额、大额报销金额、大病报销金额、医疗救助金额、渝快保报销金额</li>
              </ul>
              <Paragraph style={{ marginBottom: 8 }}>
                2. 系统将自动识别字段并导入相应数据
              </Paragraph>
              <Paragraph style={{ marginBottom: 8 }}>
                3. 导入过程中会进行数据验证，重复的身份证号将被跳过
              </Paragraph>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {/* 字段验证说明 */}
        <Alert
          message="字段验证规则"
          description={
            <div>
              <ul>
                <li>身份证号：必须为有效的18位身份证号码</li>
                <li>就诊医疗机构名称：不能为空</li>
                <li>金额字段：必须为数字（总费用、医保政策范围内费用、各种报销金额）</li>
                <li>日期字段：支持多种格式，如 YYYY-MM-DD、YYYY/MM/DD 等</li>
                <li>文件格式：仅支持 .xlsx 和 .xls 格式</li>
                <li>文件大小：不超过 10MB</li>
              </ul>
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Divider />

        {/* 操作区域 */}
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Button 
              icon={<DownloadOutlined />} 
              onClick={downloadTemplate}
            >
              下载模板
            </Button>
            <Text type="secondary">请先下载模板，按照格式填写数据</Text>
          </Space>

          <Upload {...uploadProps}>
            <Button 
              icon={<UploadOutlined />} 
              loading={uploading}
              type="primary"
              size="large"
            >
              {uploading ? '正在导入...' : '选择文件并导入'}
            </Button>
          </Upload>

          {fileList.length > 0 && (
            <Text type="secondary">
              已选择文件：{fileList[0]?.name}
            </Text>
          )}
        </Space>

        {/* 导入结果 */}
        {renderImportResult()}

        {/* 注意事项 */}
        <Divider />
        <Alert
          message="注意事项"
          description={
            <ul style={{ margin: 0 }}>
              <li>导入前请确保Excel文件格式正确，包含必要的列标题</li>
              <li>系统会自动根据身份证号创建或关联患者信息</li>
              <li>每条记录都会创建对应的就诊记录</li>
              <li>重复的身份证号将被跳过，但会创建新的就诊记录</li>
              <li>导入过程中请勿关闭页面或刷新浏览器</li>
            </ul>
          }
          type="warning"
          showIcon
        />
      </div>
    </Modal>
  );
};

export default ImportModal; 