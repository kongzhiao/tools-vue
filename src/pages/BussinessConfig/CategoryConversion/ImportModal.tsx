import React, { useState } from 'react';
import { Modal, Upload, Button, message, Alert, Space } from 'antd';
import { DownloadOutlined, UploadOutlined, InboxOutlined } from '@ant-design/icons';
import { request, useAccess } from '@umijs/max';
import type { UploadFile } from 'antd/es/upload';

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

  const access = useAccess();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // 权限检查
  if (!access.canCreateCategoryConversion) {
    return (
      <Modal
        title="导入类别转换数据"
        open={visible}
        onCancel={onCancel}
        footer={null}
        width={500}
      >
        <Alert
          message="无权限操作"
          description="您没有权限执行导入操作，请联系管理员。"
          type="warning"
          showIcon
        />
      </Modal>
    );
  }

  // 重置状态
  const resetState = () => {
    setFileList([]);
    setUploading(false);
  };

  // 关闭弹窗
  const handleClose = () => {
    resetState();
    onCancel();
  };

  // 下载模板
  const handleDownloadTemplate = () => {
    const templateUrl = '/assets/templates/business-config/业务配置-类别转换.csv';
    const link = document.createElement('a');
    link.href = templateUrl;
    link.download = '业务配置-类别转换.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 上传文件
  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.error('请先选择文件');
      return;
    }

    const file = fileList[0].originFileObj;
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await request('/api/category-conversions/import/upload', {
        method: 'POST',
        data: formData,
        requestType: 'form',
      });

      if (response.code === 0) {
        const { imported, skipped, error_count } = response.data || {};
        message.success(response.data?.message || `导入完成：成功 ${imported} 条，跳过 ${skipped} 条，失败 ${error_count} 条`);
        handleClose();
        onSuccess();
      } else {
        message.error(response.message || '导入失败');
      }
    } catch (error: any) {
      message.error(error?.message || '导入失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      title="导入类别转换数据"
      open={visible}
      onCancel={handleClose}
      width={500}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          取消
        </Button>,
        <Button
          key="upload"
          type="primary"
          icon={<UploadOutlined />}
          loading={uploading}
          disabled={fileList.length === 0}
          onClick={handleUpload}
        >
          确认上传
        </Button>,
      ]}
    >
      <Alert
        message="导入说明"
        description={
          <Space direction="vertical" size={4}>
            <span>1. 仅支持 CSV 格式文件，编码自动识别（UTF-8/GBK）</span>
            <span>2. 相同数据将自动跳过，不会重复导入</span>
            <Button
              type="link"
              icon={<DownloadOutlined />}
              onClick={handleDownloadTemplate}
              style={{ padding: 0, height: 'auto' }}
            >
              下载导入模板
            </Button>
          </Space>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Upload.Dragger
        accept=".csv"
        maxCount={1}
        fileList={fileList}
        beforeUpload={() => false}
        onChange={({ fileList: newFileList }) => setFileList(newFileList)}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p className="ant-upload-hint">仅支持 CSV 格式文件</p>
      </Upload.Dragger>
    </Modal>
  );
};

export default ImportModal;