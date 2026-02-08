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

  // 确认导入
  const handleConfirmImport = async () => {
    if (fileList.length === 0) {
      message.error('请先选择文件');
      return;
    }

    const file = fileList[0];
    setUploading(true);
    setImportResult(null);

    try {
      const result = await importAPI.importExcel(file);

      if (result.code === 0 && result.data?.uuid) {
        message.success('导入任务已提交，请在任务中心查看进度');
        // 触发全局事件打开任务中心并刷新计数
        window.dispatchEvent(new CustomEvent('openTaskCenter'));
        window.dispatchEvent(new CustomEvent('refreshTaskCount'));

        handleCancel(); // 提交成功后自动关闭弹窗
        onSuccess();
      } else if (result.code === 0) {
        // 兼容同步返回（如果以后有的话）
        setImportResult(result.data);
        message.success('导入成功');
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
    accept: '.csv',
    fileList,
    beforeUpload: (file) => {
      // 验证文件类型
      const isCsv = file.type === 'text/csv' || file.name.endsWith('.csv');
      if (!isCsv) {
        message.error('只能上传 CSV 文件！');
        return false;
      }

      // 验证文件大小（128MB）
      const isLt128M = file.size / 1024 / 1024 < 128;
      if (!isLt128M) {
        message.error('文件大小不能超过 128MB！');
        return false;
      }

      setFileList([file]);
      return false; // 阻止自动上传
    },
    onRemove: () => {
      setFileList([]);
    },
  };

  // 下载模板
  const downloadTemplate = () => {
    const templateUrl = '/assets/templates/medical-assistance/救助报销-就诊记录数据.csv';
    const link = document.createElement('a');
    link.href = templateUrl;
    link.download = '救助报销-就诊记录数据.csv';
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
    if (!importResult || !importResult.patients) return null;

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
                <Divider style={{ margin: '8px 0' }} />
                <div>
                  <Text strong>成功率：</Text>
                  <Text type="success">{summary.success_rate}%</Text>
                </div>
                {(patients.errors.length > 0 || medical_records.errors.length > 0) && (
                  <div>
                    <Text strong type="danger">错误详情：</Text>
                    <div style={{
                      maxHeight: '150px',
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
                )}
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
      title="导入医疗救助就诊数据"
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          关闭
        </Button>,
        !importResult && (
          <Button
            key="submit"
            type="primary"
            loading={uploading}
            disabled={fileList.length === 0}
            onClick={handleConfirmImport}
          >
            确认导入
          </Button>
        )
      ]}
      width={600}
    >
      <div style={{ padding: '10px 0' }}>
        {/* 说明信息 */}
        <Alert
          message="导入说明"
          description={
            <div>
              <p>1. 请先下载模板文件，按照模板格式填写数据</p>
              <p>2. 仅支持 .csv 格式的 CSV 文件</p>
              <p>3. 文件大小不超过 128MB</p>
              <p>4. 包含字段：患者信息、就诊信息、费用信息等</p>
              <div style={{ marginTop: 8 }}>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={downloadTemplate}
                  disabled={uploading}
                  size="small"
                >
                  下载导入模板
                </Button>
              </div>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* 操作区域 */}
        <div style={{ marginBottom: 16 }}>
          <Upload.Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽CSV文件到此区域上传</p>
            <p className="ant-upload-hint">
              仅支持 .csv 格式，文件大小不超过 128MB
            </p>
          </Upload.Dragger>
        </div>

        {/* 导入结果 */}
        {renderImportResult()}

        {/* 注意事项 */}
        {!importResult && (
          <Alert
            message="注意事项"
            description={
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                <li>系统会自动根据身份证号关联患者信息</li>
                <li>记录重复将被跳过，但会创建新的就诊记录</li>
                <li>导入过程中请勿关闭或刷新页面</li>
              </ul>
            }
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </div>
    </Modal>
  );
};

export default ImportModal;