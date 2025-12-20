import React, { useState } from 'react';
import {
  Modal,
  Upload,
  Button,
  Table,
  message,
  Progress,
  Space,
  Alert,
  Typography,
  Divider,
  Tag
} from 'antd';
import {
  DownloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { request, useAccess } from '@umijs/max';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const { Text } = Typography;

interface ImportData {
  tax_standard: string;
  medical_export_standard?: string;
  national_dict_name?: string;
  row: number;
  status: 'valid' | 'invalid';
  errors?: string[];
}

interface ImportError {
  row: number;
  error: string;
}

interface ImportResult {
  success_count: number;
  error_count: number;
  errors: ImportError[];
}

interface ImportModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ visible, onCancel, onSuccess }) => {
  const access = useAccess();
  const [fileList, setFileList] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<ImportData[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  // 权限检查
  if (!access.canCreateCategoryConversion) {
    return (
      <Modal
        title="导入类别转换数据"
        open={visible}
        onCancel={onCancel}
        footer={null}
        width={600}
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

  // 下载模板
  const handleDownloadTemplate = () => {
    const templateUrl = '/assets/templates/business-config/业务配置-类别转换.xls';
    const link = document.createElement('a');
    link.href = templateUrl;
    link.download = '业务配置-类别转换.xls';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('模板下载成功');
  };

  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    if (!file) return false;

    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                   file.type === 'application/vnd.ms-excel';
    
    if (!isExcel) {
      message.error('只能上传Excel文件!');
      return false;
    }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('文件大小不能超过10MB!');
      return false;
    }

    try {
      setStep('preview');
      const data = await parseExcelFile(file);
      setPreviewData(data);
      setFileList([file]);
    } catch (error) {
      console.error('解析文件失败:', error);
      message.error('解析文件失败');
    }

    return false; // 阻止自动上传
  };

  // 解析Excel文件
  const parseExcelFile = (file: File): Promise<ImportData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // 跳过表头，从第二行开始
          const rows = jsonData.slice(1);
          const parsedData: ImportData[] = [];

          rows.forEach((row: any, index: number) => {
            const rowNumber = index + 2; // Excel行号从1开始，跳过表头
            const taxStandard = row[1]?.toString().trim() || ''; // 税务代缴数据口径
            const medicalExportStandard = row[0]?.toString().trim() || ''; // 医保数据导出对象口径
            const nationalDictName = row[2]?.toString().trim() || ''; // 国家字典值名称

            const errors: string[] = [];
            
            // 验证必填字段
            if (!taxStandard) {
              errors.push('税务代缴数据口径不能为空');
            }

            // 验证至少有一个映射字段
            if (!medicalExportStandard && !nationalDictName) {
              errors.push('医保数据导出对象口径和国家字典值名称至少填写一项');
            }

            // 验证数据长度
            if (taxStandard.length > 255) {
              errors.push('税务代缴数据口径长度不能超过255个字符');
            }
            if (medicalExportStandard.length > 255) {
              errors.push('医保数据导出对象口径长度不能超过255个字符');
            }
            if (nationalDictName.length > 255) {
              errors.push('国家字典值名称长度不能超过255个字符');
            }

            const importItem: ImportData = {
              tax_standard: taxStandard,
              medical_export_standard: medicalExportStandard || undefined,
              national_dict_name: nationalDictName || undefined,
              row: rowNumber,
              status: errors.length > 0 ? 'invalid' : 'valid',
              errors: errors.length > 0 ? errors : undefined
            };

            parsedData.push(importItem);
          });

          resolve(parsedData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // 确认导入
  const handleConfirmImport = async () => {
    const validData = previewData.filter(item => item.status === 'valid');
    
    if (validData.length === 0) {
      message.error('没有有效的数据可以导入');
      return;
    }

    setImporting(true);
    setStep('importing');
    setImportProgress(0);
    setImportErrors([]);
    setShowErrorDetails(false);

    try {
      // 模拟进度
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await request('/api/category-conversions/import/confirm', {
        method: 'POST',
        data: {
          data: validData.map(item => ({
            tax_standard: item.tax_standard,
            medical_export_standard: item.medical_export_standard,
            national_dict_name: item.national_dict_name
          }))
        }
      });

      clearInterval(progressInterval);
      setImportProgress(100);

      if (response.code === 0) {
        const result: ImportResult = response.data;
        message.success(`成功导入 ${result.success_count} 条记录`);
        
        if (result.error_count > 0) {
          setImportErrors(result.errors || []);
          setShowErrorDetails(true);
          message.warning(`${result.error_count} 条记录导入失败，请查看详细错误信息`);
        } else {
          onSuccess();
          handleCancel();
        }
      } else {
        message.error(response.message || '导入失败');
      }
    } catch (error) {
      console.error('导入失败:', error);
      message.error('导入失败');
    } finally {
      setImporting(false);
    }
  };

  // 取消操作
  const handleCancel = () => {
    setFileList([]);
    setPreviewData([]);
    setImporting(false);
    setImportProgress(0);
    setStep('upload');
    setImportErrors([]);
    setShowErrorDetails(false);
    onCancel();
  };

  // 预览表格列定义
  const previewColumns = [
    {
      title: '行号',
      dataIndex: 'row',
      key: 'row',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        status === 'valid' ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>有效</Tag>
        ) : (
          <Tag color="red" icon={<CloseCircleOutlined />}>无效</Tag>
        )
      ),
    },
    {
      title: '税务代缴数据口径',
      dataIndex: 'tax_standard',
      key: 'tax_standard',
      width: 200,
      render: (text: string) => (
        <Text strong style={{ color: '#1890ff' }}>{text}</Text>
      ),
    },
    {
      title: '医保数据导出对象口径',
      dataIndex: 'medical_export_standard',
      key: 'medical_export_standard',
      width: 250,
      render: (text: string) => (
        text ? (
          <Tag color="blue">{text}</Tag>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        )
      ),
    },
    {
      title: '国家字典值名称',
      dataIndex: 'national_dict_name',
      key: 'national_dict_name',
      width: 250,
      render: (text: string) => (
        text ? (
          <Tag color="green">{text}</Tag>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        )
      ),
    },
    {
      title: '错误信息',
      dataIndex: 'errors',
      key: 'errors',
      render: (errors: string[]) => (
        errors ? (
          <div>
            {errors.map((error, index) => (
              <div key={index} style={{ color: '#ff4d4f', fontSize: '12px' }}>
                {error}
              </div>
            ))}
          </div>
        ) : (
          <span style={{ color: '#52c41a' }}>✓</span>
        )
      ),
    },
  ];

  const validCount = previewData.filter(item => item.status === 'valid').length;
  const invalidCount = previewData.filter(item => item.status === 'invalid').length;

  return (
    <Modal
      title="导入类别转换数据"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={1000}
      destroyOnClose
      styles={{
        body: {
          maxHeight: '80vh',
          overflowY: 'auto',
        }
      }}
    >
      <style>{`
        .error-row {
          background-color: #fff2f0 !important;
        }
        .error-row:hover {
          background-color: #ffebe8 !important;
        }
      `}</style>
      {step === 'upload' && (
        <div>
          <Alert
            message="导入说明"
            description="请先下载模板，按照模板格式填写数据，然后上传Excel文件进行导入。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Space direction="vertical" size="large">
              <Button 
                type="primary" 
                icon={<DownloadOutlined />} 
                size="large"
                onClick={handleDownloadTemplate}
              >
                下载导入模板
              </Button>
              
              <Divider>或</Divider>
              
              <Upload
                accept=".xlsx,.xls"
                beforeUpload={handleFileUpload}
                fileList={fileList}
                onRemove={() => setFileList([])}
                maxCount={1}
              >
                <Button icon={<UploadOutlined />} size="large">
                  选择Excel文件
                </Button>
              </Upload>
              
              <div style={{ fontSize: '12px', color: '#666' }}>
                支持 .xlsx 和 .xls 格式，文件大小不超过 10MB
              </div>
            </Space>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div>
          <Alert
            message={`数据预览 (共 ${previewData.length} 条记录)`}
            description={
              <div>
                <span style={{ color: '#52c41a' }}>有效数据: {validCount} 条</span>
                {invalidCount > 0 && (
                  <span style={{ color: '#ff4d4f', marginLeft: 16 }}>
                    无效数据: {invalidCount} 条
                  </span>
                )}
                {invalidCount > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <span style={{ color: '#ff4d4f', fontSize: '12px' }}>
                      ⚠️ 请修正无效数据后再进行导入，无效数据将被跳过
                    </span>
                  </div>
                )}
              </div>
            }
            type={invalidCount > 0 ? 'warning' : 'success'}
            showIcon
            style={{ marginBottom: 16 }}
          />

          {/* 错误汇总 */}
          {invalidCount > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Alert
                message="数据验证错误汇总"
                description={
                  <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {previewData
                      .filter(item => item.status === 'invalid')
                      .slice(0, 10) // 只显示前10个错误
                      .map((item, index) => (
                        <div key={index} style={{ marginBottom: '4px', fontSize: '12px' }}>
                          <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>第{item.row}行：</span>
                          <span style={{ color: '#666' }}>{item.errors?.join('; ')}</span>
                        </div>
                      ))}
                    {invalidCount > 10 && (
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                        还有 {invalidCount - 10} 条错误记录，请在表格中查看详情
                      </div>
                    )}
                  </div>
                }
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
              />
            </div>
          )}

          <Table
            columns={previewColumns}
            dataSource={previewData}
            rowKey="row"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
            }}
            scroll={{ x: 1000, y: 400 }}
            size="small"
            rowClassName={(record) => record.status === 'invalid' ? 'error-row' : ''}
          />

          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCancel}>取消</Button>
              <Button 
                type="primary" 
                onClick={handleConfirmImport}
                disabled={validCount === 0}
              >
                确认导入 ({validCount} 条有效数据)
              </Button>
            </Space>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Progress 
            type="circle" 
            percent={importProgress} 
            format={percent => `${percent}%`}
            style={{ marginBottom: 24 }}
          />
          <div style={{ fontSize: '16px', color: '#666' }}>
            {importing ? '正在导入数据...' : '导入完成'}
          </div>
          
          {/* 错误详情展示 */}
          {showErrorDetails && importErrors.length > 0 && (
            <div style={{ marginTop: 24, textAlign: 'left' }}>
              <Alert
                message={`导入完成，但有 ${importErrors.length} 条记录失败`}
                description={
                  <div>
                    <p>请检查以下错误信息并修正数据后重新导入：</p>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: '4px', padding: '8px', backgroundColor: '#fafafa' }}>
                      {importErrors.map((error, index) => (
                        <div key={index} style={{ marginBottom: '4px', fontSize: '12px' }}>
                          <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>第{error.row}行：</span>
                          <span style={{ color: '#666' }}>{error.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                }
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <div style={{ textAlign: 'center' }}>
                <Space>
                  <Button onClick={handleCancel}>
                    关闭
                  </Button>
                  <Button type="primary" onClick={() => {
                    setShowErrorDetails(false);
                    setStep('upload');
                  }}>
                    重新导入
                  </Button>
                </Space>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ImportModal; 