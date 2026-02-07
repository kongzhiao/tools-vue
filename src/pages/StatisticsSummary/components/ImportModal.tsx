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
    { value: '区内明细', label: '区内明细', template: '/assets/templates/statistics/统计汇总-区内明细.xlsx' },
    { value: '跨区明细', label: '跨区明细', template: '/assets/templates/statistics/统计汇总-跨区明细.xlsx' },
    { value: '手工明细', label: '手工明细', template: '/assets/templates/statistics/统计汇总-手工明细.xlsx' },
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
        message.success(`数据导入成功，共导入 ${result.data.imported_count} 条记录`);
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
      footer={null}
      width={560}
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
          label="导入类型"
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
        {templateUrl && (
          <Alert
            message="模板下载"
            description={
              <div>
                请先下载模板文件，按照模板格式填写数据后再上传。
                <div style={{ marginTop: 8 }}>
                  <Button
                    type="link"
                    icon={<DownloadOutlined />}
                    href={templateUrl}
                    download
                    style={{ padding: 0 }}
                  >
                    下载 {selectedImportType} 模板
                  </Button>
                </div>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item
          label="上传文件"
          required
        >
          <Upload
            accept=".xlsx,.xls"
            beforeUpload={() => false}
            maxCount={1}
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
          >
            <Button icon={<UploadOutlined />}>选择文件</Button>
          </Upload>
        </Form.Item>

        <Form.Item style={{ marginTop: 16, textAlign: 'right', marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" loading={uploading}>
            开始导入
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ImportModal; 