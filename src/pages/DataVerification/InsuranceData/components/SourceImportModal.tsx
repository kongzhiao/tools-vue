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

  // 处理文件上传
  const handleUpload = async (file: File) => {
    // 验证文件类型
    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                   file.type === 'application/vnd.ms-excel';
    if (!isExcel) {
      message.error('只能上传 Excel 文件！');
      return false;
    }

    // 验证文件大小（5MB）
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('文件大小不能超过 5MB！');
      return false;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('year', String(year));

    try {
      const response = await importLevelMatch(formData);
      if (response.code === 0) {
        message.success(`导入完成，已匹配上${response.data.success_count}条，已忽略${response.data.fail_count}条`);
        // 立即调用成功回调刷新数据
        onSuccess();
        // 延迟关闭模态框，让用户看到完成状态
        setTimeout(() => {
          onCancel();
        }, 2000);
      } else {
        message.error(response.message || '导入失败');
      }
    } catch (error) {
      message.error('导入失败，请检查网络连接');
      console.error(error);
    } finally {
      setUploading(false);
      setFileList([]);
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
    const templateUrl = '/assets/templates/data-verification/数据核实-匹配档次数据.xlsx';
    const link = document.createElement('a');
    link.href = templateUrl;
    link.download = '数据核实-匹配档次数据.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal
      title="导入参保档次匹配数据"
      open={visible}
      onCancel={() => {
        onCancel();
      }}
      footer={null}
      width={800}
    >
      <div style={{ padding: '20px 0' }}>
        {/* 说明信息 */}
        <Alert
          message="使用说明"
          description={
            <div>
              <Paragraph style={{ marginBottom: 8 }}>
                1. 请按照模板格式准备 Excel 文件，包含以下列：
              </Paragraph>
              <ul style={{ marginBottom: 16 }}>
                <li><Text strong>身份证号</Text>：参保人员的身份证号码</li>
                <li><Text strong>个人实缴金额</Text>：该人员的个人实际缴费金额</li>
              </ul>
              <Paragraph style={{ marginBottom: 8 }}>
                2. 系统将根据身份证号匹配参保数据，并根据代缴类别和个人实缴金额自动匹配对应的参保档次
              </Paragraph>
              <Paragraph style={{ marginBottom: 8 }}>
                3. 匹配成功的数据将自动更新档次和个人实缴金额，并将匹配状态设置为已匹配
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
                <li>个人实缴金额：必须为数字，且与参保档次配置中的金额匹配</li>
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
              disabled={uploading}
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
              disabled={uploading}
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

        {/* 注意事项 */}
        <Divider />
        <Alert
          message="注意事项"
          description={
            <ul style={{ margin: 0 }}>
              <li>导入前请确保参保档次配置已正确设置</li>
              <li>身份证号必须在系统中存在对应的参保数据</li>
              <li>个人实缴金额必须与参保档次配置中的金额完全匹配</li>
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

export default SourceImportModal; 