import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Upload, Button, message, Alert } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { useAccess } from '@umijs/max';
import { Project, importStatistics } from '@/services/statisticsSummary';

const { Option } = Select;

interface ImportModalProps {
  visible: boolean;
  projects: Project[];
  selectedProjectId?: number | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({
  visible,
  projects,
  selectedProjectId,
  onCancel,
  onSuccess,
}) => {
  const access = useAccess();
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [selectedImportType, setSelectedImportType] = useState<string | undefined>(undefined);

  // 当selectedProjectId变化时，自动设置项目
  useEffect(() => {
    if (selectedProjectId && visible) {
      form.setFieldsValue({ project_id: selectedProjectId });
    }
  }, [selectedProjectId, visible, form]);

  // 导入类型选项及对应的模板文件映射
  const importTypes = [
    { value: '区内明细', label: '区内明细', template: '/assets/templates/statistics/统计汇总-区内明细.csv' },
    { value: '跨区明细', label: '跨区明细', template: '/assets/templates/statistics/统计汇总-跨区明细.csv' },
    { value: '手工明细', label: '手工明细', template: '/assets/templates/statistics/统计汇总-手工明细.csv' },
  ];

  // 获取当前选中类型的模板路径
  const getTemplateUrl = () => {
    const selectedType = importTypes.find(type => type.value === selectedImportType);
    return selectedType?.template;
  };

  const handleSubmit = async (values: any) => {
    if (fileList.length === 0) {
      message.error('请选择要上传的文件');
      return;
    }

    setUploading(true);
    try {
      const result = await importStatistics({
        project_id: values.project_id,
        import_type: values.import_type,
        file: fileList[0].originFileObj,
      });

      if (result.code === 200) {
        message.success('导入任务已提交，请在任务中心查看进度');
        // 触发全局事件打开任务中心并刷新计数
        window.dispatchEvent(new CustomEvent('openTaskCenter'));
        window.dispatchEvent(new CustomEvent('refreshTaskCount'));

        form.resetFields();
        setFileList([]);
        setSelectedImportType(undefined);
        onSuccess();
      } else {
        message.error(result.message || '导入失败');
      }
    } catch (error) {
      message.error('导入失败');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setFileList([]);
    setSelectedImportType(undefined);
    onCancel();
  };

  const handleImportTypeChange = (value: string) => {
    setSelectedImportType(value);
  };

  // 如果没有导入权限，不显示模态框
  if (!access.canImportStatisticsSummary) {
    return null;
  }

  const templateUrl = getTemplateUrl();

  return (
    <Modal
      title="导入数据"
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
          onClick={() => form.submit()}
        >
          确认导入
        </Button>
      ]}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="project_id"
          label="选择数据项"
          rules={[{ required: true, message: '请选择数据项' }]}
        >
          <Select placeholder="请选择数据项">
            {projects.map(project => (
              <Option key={project.id} value={project.id}>
                {project.code} - {project.dec}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="import_type"
          label=""
          rules={[{ required: true, message: '请选择导入类型' }]}
        >
          <Select
            placeholder="请选择导入类型"
            onChange={handleImportTypeChange}
          >
            {importTypes.map(type => (
              <Option key={type.value} value={type.value}>
                {type.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 模板下载提示 */}
        <Alert
          message="导入说明"
          description={
            <div>
              <p>1. 请先选择导入类型并下载对应的模板文件</p>
              <p>2. 仅支持 .csv 格式的文件</p>
              <p>3. 文件大小不能超过 128MB</p>
              {templateUrl && (
                <div style={{ marginTop: 8 }}>
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    href={templateUrl}
                    download
                    size="small"
                  >
                    下载 {selectedImportType} 模板
                  </Button>
                </div>
              )}
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form.Item
          label=""
          required
        >
          <Upload.Dragger
            accept=".csv"
            beforeUpload={() => false}
            maxCount={1}
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽CSV文件到此区域上传</p>
            <p className="ant-upload-hint">
              仅支持 .csv 格式，文件大小不超过 128MB
            </p>
          </Upload.Dragger>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ImportModal; 