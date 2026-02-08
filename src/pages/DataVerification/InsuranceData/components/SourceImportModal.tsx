import React, { useState } from 'react';
import { Modal, Upload, Button, message, Alert, Space, Typography, Divider } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { importLevelMatch } from '@/services/insuranceData';

const { Text, Paragraph } = Typography;

interface SourceImportModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  year: number;
}

const SourceImportModal: React.FC<SourceImportModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  year,
}) => {
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);

  // 确认导入
  const handleConfirmImport = async () => {
    if (fileList.length === 0) {
      message.error('请先选择文件');
      return;
    }

    const file = fileList[0];
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('year', String(year));

    try {
      const response = await importLevelMatch(formData);
      if (response.code === 0) {
        message.success(`导入完成，已匹配上${response.data.success_count}条，已忽略${response.data.fail_count}条`);
        onSuccess();
        handleCancel();
      } else {
        message.error(response.message || '导入失败');
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
    const templateUrl = '/assets/templates/data-verification/数据核实-匹配档次数据.csv';
    const link = document.createElement('a');
    link.href = templateUrl;
    link.download = '数据核实-匹配档次数据.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCancel = () => {
    setFileList([]);
    onCancel();
  };

  return (
    <Modal
      title="导入参保档次匹配数据"
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          关闭
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={uploading}
          disabled={fileList.length === 0}
          onClick={handleConfirmImport}
        >
          确认导入
        </Button>
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
              <p>2. 系统将根据身份证号自动匹配参保档次</p>
              <p>3. 仅支持 .csv 格式，文件大小不超过 128MB</p>
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

        {/* 注意事项 */}
        <Alert
          message="注意事项"
          description={
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li>导入前请确保参保档次配置已正确设置</li>
              <li>身份证号必须在系统中存在对应的参保数据</li>
              <li>个人实缴金额必须与配置完全匹配</li>
              <li>导入过程中请勿关闭或刷新页面</li>
            </ul>
          }
          type="warning"
          showIcon
        />
      </div>
    </Modal>
  );
};

export default SourceImportModal; 