import React, { useState } from 'react';
import { Modal, Upload, Button, message, Alert, Space, Radio, Typography } from 'antd';
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
    imported_count?: number;
    skipped_count?: number;
    error_rows?: Array<{
      row?: number;
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

      if (response.code === 0 && response.data?.uuid) {
        message.success('导入任务已提交，请在任务中心查看进度');
        window.dispatchEvent(new CustomEvent('openTaskCenter'));
        onSuccess();
        handleCancel(); // Close modal after submitting task
      } else if (response.code === 0) {
        message.success(`导入完成，成功${response.data?.imported_count ?? 0}条，跳过${response.data?.skipped_count ?? 0}条`);
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
      footer={[
        <Button
          key="cancel"
          onClick={handleCancel}
          disabled={importModalState.importing}
        >
          {importModalState.importResult ? '关闭' : '取消'}
        </Button>,
        !importModalState.importResult && (
          <Button
            key="validate"
            onClick={handleValidateFile}
            loading={importModalState.validating}
            disabled={importModalState.fileList.length === 0 || importModalState.importing}
          >
            验证文件
          </Button>
        ),
        !importModalState.importResult && (
          <Button
            key="submit"
            type="primary"
            onClick={handleImportYear}
            loading={importModalState.importing}
            disabled={!importModalState.validated || importModalState.fileList.length === 0 || importModalState.importing}
          >
            {importModalState.importing ? '导入中...' : '确认导入'}
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
              <p>2. 仅支持 .csv 格式，文件大小不超过 128MB</p>
              <p>3. 包含字段：姓名、身份证号、代缴类别、街道乡镇、代缴金额</p>
              <div style={{ marginTop: 8 }}>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    const templateUrl = '/assets/templates/data-verification/数据核实-原始数据.csv';
                    const link = document.createElement('a');
                    link.href = templateUrl;
                    link.download = '数据核实-原始数据.csv';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
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

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <Text strong>导入模式</Text>
          </div>
          <Radio.Group
            value={importModalState.importType}
            onChange={(e) => handleImportTypeChange(e.target.value)}
          >
            <Radio.Button value="increment">增量导入</Radio.Button>
            <Radio.Button value="full">全量覆盖</Radio.Button>
          </Radio.Group>
          <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
            {importModalState.importType === 'full' ?
              '全量覆盖：将删除所选年份的所有现有数据，并导入新数据' :
              '增量导入：保留现有数据，仅添加新的数据'}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Upload.Dragger
            accept=".csv"
            maxCount={1}
            fileList={importModalState.fileList}
            onChange={handleUploadChange}
            beforeUpload={() => false}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽CSV文件到此区域上传</p>
            <p className="ant-upload-hint">
              仅支持 .csv 格式，文件大小不超过 128MB
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
              message={
                importModalState.importResult.code === 0
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
                          <Text type="secondary">失败行数：</Text>
                          <Text strong style={{ color: '#ff4d4f' }}>{importModalState.importResult.data.error_rows ? importModalState.importResult.data.error_rows.length : 0}</Text>
                        </div>
                      </div>

                      {importModalState.importResult.data.error_rows && importModalState.importResult.data.error_rows.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <Text type="secondary">失败详情：</Text>
                          <div style={{
                            maxHeight: '150px',
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
              type={importModalState.importResult.code === 0 ? "success" : "error"}
              showIcon
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ImportModal;
