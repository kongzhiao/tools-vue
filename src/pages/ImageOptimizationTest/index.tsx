import React, { useState, useCallback } from 'react';
import { Card, Button, Upload, message, Space, Typography, Descriptions, Image } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { smartCompressImage, getImageInfo, shouldCompressImage } from '@/utils/imageUtils';
import type { UploadProps } from 'antd';

const { Title, Text } = Typography;

const ImageOptimizationTest: React.FC = () => {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [originalInfo, setOriginalInfo] = useState<any>(null);
  const [compressedInfo, setCompressedInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange: UploadProps['onChange'] = async (info) => {
    const file = info.file.originFileObj;
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      message.error('只能上传图片文件！');
      return;
    }

    setLoading(true);
    try {
      // 获取原始图片信息
      const original = await getImageInfo(file);
      setOriginalFile(file);
      setOriginalInfo(original);

      // 检查是否需要压缩
      const needCompress = await shouldCompressImage(file);
      
      if (needCompress) {
        // 压缩图片
        const compressed = await smartCompressImage(file);
        const compressedInfo = await getImageInfo(compressed);
        
        setCompressedFile(compressed);
        setCompressedInfo(compressedInfo);
        
        const sizeReduction = ((original.size - compressedInfo.size) / original.size * 100).toFixed(1);
        message.success(`图片已优化，大小减少 ${sizeReduction}%`);
      } else {
        message.info('图片无需优化');
        setCompressedFile(file);
        setCompressedInfo(original);
      }
    } catch (error) {
      console.error('图片处理失败:', error);
      message.error('图片处理失败');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDimensions = (width: number, height: number) => {
    return `${width} × ${height}`;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>图片优化测试</Title>
      
      <Card title="上传图片" style={{ marginBottom: '24px' }}>
        <Upload
          accept="image/*"
          showUploadList={false}
          onChange={handleFileChange}
          loading={loading}
        >
          <Button icon={<UploadOutlined />} loading={loading}>
            选择图片
          </Button>
        </Upload>
        
        <div style={{ marginTop: '16px' }}>
          <Text type="secondary">
            支持 JPG、PNG、GIF 格式，文件大小不超过 10MB
          </Text>
        </div>
      </Card>

      {originalFile && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Card title="原始图片信息">
            <Descriptions column={2}>
              <Descriptions.Item label="文件名">{originalFile.name}</Descriptions.Item>
              <Descriptions.Item label="文件类型">{originalInfo?.type}</Descriptions.Item>
              <Descriptions.Item label="文件大小">{formatFileSize(originalInfo?.size || 0)}</Descriptions.Item>
              <Descriptions.Item label="图片尺寸">{formatDimensions(originalInfo?.width || 0, originalInfo?.height || 0)}</Descriptions.Item>
            </Descriptions>
            
            <div style={{ marginTop: '16px' }}>
              <Image
                src={URL.createObjectURL(originalFile)}
                alt="原始图片"
                style={{ maxWidth: '100%', maxHeight: '300px' }}
              />
            </div>
          </Card>

          {compressedFile && compressedInfo && (
            <Card title="优化后图片信息">
              <Descriptions column={2}>
                <Descriptions.Item label="文件名">{compressedFile.name}</Descriptions.Item>
                <Descriptions.Item label="文件类型">{compressedInfo.type}</Descriptions.Item>
                <Descriptions.Item label="文件大小">{formatFileSize(compressedInfo.size)}</Descriptions.Item>
                <Descriptions.Item label="图片尺寸">{formatDimensions(compressedInfo.width, compressedInfo.height)}</Descriptions.Item>
                <Descriptions.Item label="大小减少">
                  <Text type="success">
                    {((originalInfo.size - compressedInfo.size) / originalInfo.size * 100).toFixed(1)}%
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="尺寸变化">
                  <Text type="info">
                    {originalInfo.width !== compressedInfo.width || originalInfo.height !== compressedInfo.height ? '已调整' : '未变化'}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
              
              <div style={{ marginTop: '16px' }}>
                <Image
                  src={URL.createObjectURL(compressedFile)}
                  alt="优化后图片"
                  style={{ maxWidth: '100%', maxHeight: '300px' }}
                />
              </div>
            </Card>
          )}
        </Space>
      )}
    </div>
  );
};

export default ImageOptimizationTest;
