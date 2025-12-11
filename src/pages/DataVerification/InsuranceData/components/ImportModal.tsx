import React, { useState } from 'react';
import { Modal, Upload, Button, message, Alert, Space, Radio,Typography } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd/es/upload/interface';
const { Text, Paragraph } = Typography;

import { getConfig } from '../../../../config';
import {
  validateInsuranceDataFile,
  importInsuranceData,
  type InsuranceYear,
} from '@/services/insuranceData';

interface ImportResult {
  code: number;
  message: string;
  data?: {
    imported_count: number;
    skipped_count: number;
    error_rows: Array<{
      row: number;
      reason: string;
      data?: any;
    }>;
    total_rows?: number;
    debug_info?: {
      total_rows: number;
      column_map: Record<string, string>;
      start_row: number;
      end_row: number;
    };
  };
}

interface ImportModalState {
  fileList: UploadFile[];
  importType: 'increment' | 'full';
  validating: boolean;
  validated: boolean;
  validationMessage: string;
  importing: boolean;
  importResult?: ImportResult;
}

interface ImportModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  currentYear: InsuranceYear | undefined;
}

const ImportModal: React.FC<ImportModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  currentYear,
}) => {
  const [importModalState, setImportModalState] = useState<ImportModalState>({
    fileList: [],
    importType: 'increment',
    validating: false,
    validated: false,
    validationMessage: '',
    importing: false,
  });

  // 重置导入状态
  const resetImportModalState = () => {
    setImportModalState({
      fileList: [],
      importType: 'increment',
      validating: false,
      validated: false,
      validationMessage: '',
      importing: false,
      importResult: undefined,
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

  // 处理导入类型改变
  const handleImportTypeChange = (value: 'increment' | 'full') => {
    setImportModalState(prev => ({
      ...prev,
      importType: value,
    }));
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
      
      const response = await validateInsuranceDataFile(formData);
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
      console.log('导入类型:', importModalState.importType);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('year', currentYear.year.toString());
      formData.append('import_type', importModalState.importType);
      
      console.log('FormData 创建完成，准备调用导入...');
      
      const response = await importInsuranceData(formData);
      
      // 存储导入结果
      setImportModalState(prev => ({
        ...prev,
        importResult: response
      }));
      
      if (response.code === 0) {
        message.success(`导入完成，成功${response.data.imported_count}条，跳过${response.data.skipped_count}条`);
        // 立即刷新数据
        onSuccess();
      } else {
        message.error(response.message || '导入失败');
      }
    } catch (error) {
      console.error('导入失败:', error);
      message.error('导入失败');
    } finally {
      setImportModalState(prev => ({ ...prev, importing: false }));
    }
  };

  // 处理取消
  const handleCancel = () => {
    onCancel();
    resetImportModalState();
  };

  return (
    <Modal
      title={`导入${currentYear?.year || '未知'}年数据`}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={800}
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          message="导入说明"
          description={
            <div>
              <Paragraph style={{ marginBottom: 8 }}>
                1. 导入的数据需在第一个 sheet，确保表头在导入文件的第一行。
              </Paragraph>
              <Paragraph style={{ marginBottom: 8 }}>
                2. 请按照模板格式准备 Excel 文件，必须包含以下列：
              </Paragraph>
              <ul style={{ marginBottom: 16 }}>
                <li><strong>姓名</strong>：参保人员的姓名</li>
                <li><strong>身份证号</strong>：参保人员的身份证号码</li>
                <li><strong>代缴类别</strong>：参保人员的代缴类别</li>
                <li><strong>街道乡镇</strong>：参保人员的街道乡镇</li>
                <li><strong>代缴金额</strong>：参保人员的代缴金额</li>
              </ul>
              <Paragraph style={{ marginBottom: 8 }}>
                3. 系统将根据身份证号匹配参保数据，并根据代缴类别和个人实缴金额自动匹配对应的参保档次
              </Paragraph>
              <Paragraph style={{ marginBottom: 0 }}>
                4. 匹配成功的数据将自动更新档次和个人实缴金额，并将匹配状态设置为已匹配
              </Paragraph>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

      <div style={{ marginBottom: 16 }}>
        <Button
          icon={<DownloadOutlined />}
          onClick={() => {
            const templateUrl = '/assets/templates/data-verification/数据核实-原始数据.xlsx';
            const link = document.createElement('a');
            link.href = templateUrl;
            link.download = '数据核实-原始数据.xlsx';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
        >
          下载导入模板
        </Button>
        <Text type="secondary">请先下载模板，按照格式填写数据</Text>

      </div>

      </div>

      <div style={{ marginBottom: 16 }}>
        <Radio.Group
          value={importModalState.importType}
          onChange={(e) => handleImportTypeChange(e.target.value)}
        >
          <Radio.Button value="increment">增量导入</Radio.Button>
          <Radio.Button value="full">全量导入</Radio.Button>
        </Radio.Group>
        <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
          {importModalState.importType === 'full' ? 
            '全量导入：将删除所选年份的所有现有数据，并导入新数据' :
            '增量导入：保留现有数据，仅添加新的数据'}
        </div>
      </div>

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
            message={
              importModalState.importResult.code === 0 && importModalState.importResult.data && importModalState.importResult.data.imported_count > 0
                ? "导入成功"
                : "导入失败"
            }
            description={
              <div>
                <div style={{ marginBottom: 12 }}>
                  <Text strong>{importModalState.importResult.message}</Text>
                </div>
                {importModalState.importResult.data && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: 12 }}>
                      <div>
                        <Text type="secondary">总行数：</Text>
                        <Text strong>{importModalState.importResult.data.total_rows ?? importModalState.importResult.data.debug_info?.total_rows ?? '-'}</Text>
                      </div>
                      <div>
                        <Text type="secondary">成功导入：</Text>
                        <Text strong style={{ color: '#52c41a' }}>{importModalState.importResult.data.imported_count ?? 0}</Text>
                      </div>
                      <div>
                        <Text type="secondary">跳过行数：</Text>
                        <Text strong style={{ color: '#faad14' }}>{importModalState.importResult.data.skipped_count ?? 0}</Text>
                      </div>
                      <div>
                        <Text type="secondary">匹配失败：</Text>
                        <Text strong style={{ color: '#ff4d4f' }}>{importModalState.importResult.data.error_rows ? importModalState.importResult.data.error_rows.length : 0}</Text>
                      </div>
                    </div>
                    
                    {importModalState.importResult.data.error_rows && importModalState.importResult.data.error_rows.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <Text type="secondary">匹配详情：</Text>
                        <div style={{ 
                          maxHeight: '200px', 
                          overflowY: 'auto', 
                          border: '1px solid #f0f0f0', 
                          borderRadius: '4px', 
                          padding: '8px',
                          marginTop: '4px',
                          backgroundColor: '#fafafa'
                        }}>
                          {importModalState.importResult.data.error_rows.map((error, index) => (
                            <div key={index} style={{ marginBottom: '4px', fontSize: '12px' }}>
                              <Text type="danger">第{error.row}行：</Text>
                              <Text>{error.reason}</Text>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            }
            type={
              importModalState.importResult.code === 0 && importModalState.importResult.data && importModalState.importResult.data.imported_count > 0
                ? "success"
                : "error"
            }
            showIcon
          />
        </div>
      )}

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
                {importModalState.importing ? '导入中...' : '确认导入'}
              </Button>
            </>
          )}
        </Space>
      </div>
    </Modal>
  );
};

export default ImportModal;
