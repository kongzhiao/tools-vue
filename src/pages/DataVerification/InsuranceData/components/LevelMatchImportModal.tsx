import React, { useState } from 'react';
import { Modal, Upload, Button, message, Alert, Space, Typography } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd/es/upload/interface';
import {
   importLevelMatch, 
   validateImportLevelMatch,  
   type InsuranceYear,
} from '@/services/insuranceData';


interface ImportResult {
  code: number;
  message: string;
  data?: {
    success_count: number;
    fail_count: number;
    total_rows: number;
    errors: string[];
  };
}


const { Text, Paragraph } = Typography;

interface LevelMatchImportModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  currentYear: InsuranceYear | undefined;
}
interface ImportModalState {
  fileList: UploadFile[];
  validating: boolean;
  validated: boolean;
  validationMessage: string;
  importing: boolean;
  importResult?: ImportResult;
}

const LevelMatchImportModal: React.FC<LevelMatchImportModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  currentYear,
}) => {
  const [importModalState, setImportModalState] = useState<ImportModalState>({
    fileList: [],
    validating: false,
    validated: false,
    validationMessage: '',
    importing: false,
  });


  // 重置导入状态
  const resetImportModalState = () => {
    setImportModalState({
      fileList: [],
      validating: false,
      validated: false,
      validationMessage: '',
      importing: false,
    });
  };


  // 处理文件上传改变
  const handleUploadChange: UploadProps['onChange'] = ({ fileList }) => {
    setImportModalState(prev => ({
      ...prev,
      fileList: fileList.slice(-1),
      validated: false,
      validationMessage: '',
    }));
  };

  // 导入数据
  const handleImportYear = async () => {
    console.log('=== handleImportYear 函数被调用 ===');
    console.log('importModalState:', importModalState);
    console.log('currentYear:', currentYear);
    
    // 检查 currentYear 是否存在
    if (!currentYear) {
      console.log('currentYear 未定义，显示错误');
      message.error('请先选择年份');
      return;
    }
    
    if (!importModalState.validated) {
      console.log('文件未验证，显示警告');
      message.warning('请先验证文件格式');
      return;
    }
    
    // 检查文件是否存在
    if (importModalState.fileList.length === 0) {
      console.log('文件列表为空，显示错误');
      message.error('请先选择要导入的文件');
      return;
    }
    
    const file = importModalState.fileList[0]?.originFileObj;
    if (!file) {
      console.log('文件对象不存在，显示错误');
      message.error('文件对象无效，请重新选择文件');
      return;
    }
    
    console.log('开始设置导入状态...');
    setImportModalState(prev => ({ ...prev, importing: true }));
    
    try {
      console.log('检查文件和年份...');
      console.log('文件:', file.name, '大小:', file.size);
      console.log('年份:', currentYear.year);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('year', currentYear.year.toString());
      
      console.log('FormData 创建完成，准备调用导入...');
      
      const response = await importLevelMatch(formData);
      
      // 存储导入结果
      setImportModalState(prev => ({
        ...prev,
        importResult: response
      }));
      
      if (response.code === 0) {
        message.success(`导入完成，成功${response.data.success_count}条，跳过${response.data.fail_count}条`);
        // 立即刷新数据
        onSuccess();
      } else {
        message.error(response.message || '匹配完成');
      }
    } catch (error) {
      console.error('导入失败:', error);
      message.error('导入失败');
    } finally {
      setImportModalState(prev => ({ ...prev, importing: false }));
    }
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


  // 验证文件格式
  const handleValidateFile = async () => {
    if (importModalState.fileList.length === 0) {
      message.warning('请先选择文件');
      return;
    }

    // 检查 currentYear 是否存在
    if (!currentYear) {
      message.error('请先选择年份');
      return;
    }

    setImportModalState(prev => ({ ...prev, validating: true }));
    try {
      // 检查文件是否存在
      if (importModalState.fileList.length === 0) {
        throw new Error('请先选择文件');
      }
      
      const file = importModalState.fileList[0]?.originFileObj;
      if (!file) {
        throw new Error('文件对象无效');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('year', currentYear.year.toString());
      
      const response = await validateImportLevelMatch(formData);
      if (response.code === 0) {
        setImportModalState(prev => ({
          ...prev,
          validated: true,
          validationMessage: '文件格式验证通过，可以开始导入',
        }));
        message.success('文件格式验证通过');
      } else {
        setImportModalState(prev => ({
          ...prev,
          validated: false,
          validationMessage: response.message || '文件格式验证失败',
        }));
        message.error(response.message || '文件格式验证失败');
      }
    } catch (error) {
      console.error('验证文件失败:', error);
      setImportModalState(prev => ({
        ...prev,
        validated: false,
        validationMessage: '验证文件时发生错误',
      }));
      message.error('验证文件时发生错误');
    } finally {
      setImportModalState(prev => ({ ...prev, validating: false }));
    }
  };

  // 处理取消
  const handleCancel = () => {
    onCancel();
    resetImportModalState();
  };

  return (
    <Modal
      title={`匹配${currentYear?.year || '未知'}年参保档次数据`}
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

        {/* 操作区域 */}
        <div style={{ marginBottom: 16 }}>
            <Button 
              icon={<DownloadOutlined />} 
              onClick={downloadTemplate}
              disabled={importModalState.importing}
            >
              下载模板
            </Button>
            <Text type="secondary">请先下载模板，按照格式填写数据</Text>
          <Upload.Dragger
            accept=".xlsx,.xls"
            maxCount={1}
            fileList={importModalState.fileList}
            onChange={handleUploadChange}
            beforeUpload={() => false}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持单个.xls或.xlsx文件上传，文件大小不超过10MB
            </p>
          </Upload.Dragger>

        </div>

        {importModalState.validationMessage && (
          <div style={{ marginTop: 16 }}>
            <Alert
              message={importModalState.validated ? "文件验证通过" : "文件验证失败"}
              description={importModalState.validationMessage}
              type={importModalState.validated ? "success" : "error"}
              showIcon
            />
          </div>
        )}

        {importModalState.importResult && (
          <div style={{ marginTop: 16 }}>
            <Alert
              message={importModalState.importResult.code === 0 && importModalState.importResult.data && importModalState.importResult.data.success_count > 0 ? "匹配成功" : "匹配完成"}
              description={importModalState.importResult.message}
              type={importModalState.importResult.code === 0 && importModalState.importResult.data && importModalState.importResult.data.success_count > 0 ? "success" : "error"}
              showIcon
            />
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Space>
          {importModalState.importResult ? (
            <Button
              type="primary"
              onClick={handleCancel}
            >
              关闭
            </Button>
          ) : (
            <>
              <Button
                onClick={handleCancel}
                disabled={importModalState.importing}
              >
                取消
              </Button>
              <Button
                type="default"
                onClick={handleValidateFile}
                loading={importModalState.validating}
                disabled={importModalState.fileList.length === 0 || importModalState.importing}
              >
                验证文件
              </Button>
              <Button
                type="primary"
                onClick={handleImportYear}
                loading={importModalState.importing}
                disabled={!importModalState.validated || importModalState.fileList.length === 0 || importModalState.importing}
              >
                {importModalState.importing ? '匹配中...' : '确认匹配'}
              </Button>
            </>
          )}
        </Space>
      </div>
    </Modal>
  );
};

export default LevelMatchImportModal; 