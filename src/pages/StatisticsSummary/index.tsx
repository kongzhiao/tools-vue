import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
  Row,
  Col,
  Statistic,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  UploadOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { request, useAccess } from '@umijs/max';
import ImportModal from './components/ImportModal';
import PersonTimeStatisticsModal from './components/PersonTimeStatisticsModal';
import ReimbursementStatisticsModal from './components/ReimbursementStatisticsModal';
import TiltAssistanceStatisticsModal from './components/TiltAssistanceStatisticsModal';
import {
  getStatisticsList,
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  clearProjectData,
  getPersonTimeStatistics,
  getReimbursementStatistics,
  getTiltAssistanceStatistics,
  exportDetailStatistics,
  Project,
  StatisticsData
} from '@/services/statisticsSummary';

const { Option } = Select;

const StatisticsSummary: React.FC = () => {
  const access = useAccess();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StatisticsData[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [projects, setProjects] = useState<Project[]>([]);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [projectModalVisible, setProjectModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<StatisticsData[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTotal, setDetailTotal] = useState(0);
  const [detailCurrent, setDetailCurrent] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(10);
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [detailSearchForm] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [statisticsModalVisible, setStatisticsModalVisible] = useState(false);
  const [statisticsData, setStatisticsData] = useState<any[]>([]);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [reimbursementModalVisible, setReimbursementModalVisible] = useState(false);
  const [reimbursementData, setReimbursementData] = useState<any[]>([]);
  const [reimbursementLoading, setReimbursementLoading] = useState(false);
  const [tiltAssistanceModalVisible, setTiltAssistanceModalVisible] = useState(false);
  const [tiltAssistanceData, setTiltAssistanceData] = useState<any[]>([]);
  const [tiltAssistanceLoading, setTiltAssistanceLoading] = useState(false);

  useEffect(() => {
    fetchData();
    fetchProjects();
  }, [current, pageSize]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const searchValues = searchForm.getFieldsValue();
      const params = {
        page: current,
        pageSize,
        ...searchValues,
      };

      const response = await getStatisticsList(params);
      setData(response.data.data || []);
      setTotal(response.data.total || 0);


    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await getProjects();
      setProjects(response.data || []);
    } catch (error) {
      message.error('获取项目列表失败');
    }
  };

  // 处理金额格式化
  const formatAmount = (value: any): string => {
    if (value === null || value === undefined || value === '') {
      return '¥0.00';
    }

    // 确保转换为数字
    const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);

    if (isNaN(numValue)) {
      return '¥0.00';
    }

    return `¥${numValue.toFixed(2)}`;
  };

  const handleSearch = () => {
    setCurrent(1);
    fetchData();
  };

  const handleReset = () => {
    searchForm.resetFields();
    setCurrent(1);
    fetchData();
  };

  const handleTableChange = (pagination: any) => {
    setCurrent(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const handleImportSuccess = () => {
    setImportModalVisible(false);
    fetchData();
    // 如果数据明细弹窗是打开的，刷新数据明细
    if (detailModalVisible && selectedProjectId) {
      console.log('刷新数据明细:', { selectedProjectId, detailCurrent, detailPageSize });
      fetchDetailData(selectedProjectId, detailCurrent, detailPageSize);
    } else {
      console.log('数据明细弹窗状态:', { detailModalVisible, selectedProjectId });
    }
    // 确保 selectedProjectId 不被重置，保持按钮可用
    message.success('数据导入成功');
  };

  const handleProjectSubmit = async (values: { code: string; dec: string }) => {
    try {
      if (editingProject) {
        await updateProject(editingProject.id, values);
        message.success('项目更新成功');
      } else {
        await createProject(values);
        message.success('项目创建成功');
      }
      setProjectModalVisible(false);
      form.resetFields();
      setEditingProject(null);
      fetchProjects();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDeleteProject = async (id: number) => {
    try {
      await deleteProject(id);
      message.success('项目删除成功');
      fetchProjects();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 批量删除项目
  const handleBatchDeleteProjects = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的项目');
      return;
    }

    try {
      // 批量删除选中的项目
      await Promise.all(selectedRowKeys.map(id => deleteProject(Number(id))));
      message.success(`成功删除 ${selectedRowKeys.length} 个项目`);
      setSelectedRowKeys([]);
      fetchProjects();
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  // 人次统计
  const handleStatistics = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要统计的项目');
      return;
    }

    setStatisticsLoading(true);
    setStatisticsModalVisible(true);

    try {
      const projectIds = selectedRowKeys.map(id => Number(id));
      const response = await getPersonTimeStatistics({ project_ids: projectIds });

      if (response.code === 200) {
        setStatisticsData(response.data);
      } else {
        message.error(response.message || '统计失败');
      }
    } catch (error) {
      message.error('统计失败');
    } finally {
      setStatisticsLoading(false);
    }
  };

  // 报销统计
  const handleReimbursementStatistics = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要统计的项目');
      return;
    }

    setReimbursementLoading(true);
    setReimbursementModalVisible(true);

    try {
      const projectIds = selectedRowKeys.map(id => Number(id));
      const response = await getReimbursementStatistics({ project_ids: projectIds });

      if (response.code === 200) {
        setReimbursementData(response.data);
      } else {
        message.error(response.message || '报销统计失败');
      }
    } catch (error) {
      message.error('报销统计失败');
    } finally {
      setReimbursementLoading(false);
    }
  };

  // 倾斜救助统计
  const handleTiltAssistanceStatistics = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要统计的项目');
      return;
    }

    setTiltAssistanceLoading(true);
    setTiltAssistanceModalVisible(true);

    try {
      const projectIds = selectedRowKeys.map(id => Number(id));
      const response = await getTiltAssistanceStatistics({ project_ids: projectIds });

      if (response.code === 200) {
        setTiltAssistanceData(response.data);
      } else {
        message.error(response.message || '倾斜救助统计失败');
      }
    } catch (error) {
      message.error('倾斜救助统计失败');
    } finally {
      setTiltAssistanceLoading(false);
    }
  };

  // 导出明细统计
  const handleExportDetailStatistics = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要导出的项目');
      return;
    }

    try {
      const projectIds = selectedRowKeys.map(id => Number(id));
      const response = await exportDetailStatistics({ project_ids: projectIds });

      if (response.code === 200) {
        // 创建下载链接
        const blob = new Blob([Uint8Array.from(atob(response.data.content), c => c.charCodeAt(0))], {
          type: response.data.content_type
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = response.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        message.success('明细统计导出成功');
      } else {
        message.error(response.message || '导出失败');
      }
    } catch (error) {
      message.error('导出失败');
    }
  };


  // 查看项目数据明细
  const handleViewProjectDetails = async (projectId: number) => {
    setSelectedProjectId(projectId);
    setDetailModalVisible(true);
    setDetailCurrent(1);
    setDetailPageSize(10);
    detailSearchForm.resetFields();
    fetchDetailData(projectId, 1, 10);
  };

  // 获取数据明细
  const fetchDetailData = async (projectId: number, page: number = 1, pageSize: number = 10) => {
    setDetailLoading(true);
    try {
      const searchValues = detailSearchForm.getFieldsValue();
      const params = {
        page,
        pageSize,
        project_id: projectId.toString(),
        ...searchValues,
      };

      console.log('fetchDetailData 参数:', params);
      const response = await getStatisticsList(params);
      console.log('fetchDetailData 响应:', response.data);
      setDetailData(response.data.data || []);
      setDetailTotal(response.data.total || 0);
    } catch (error) {
      console.error('fetchDetailData 错误:', error);
      message.error('获取数据明细失败');
    } finally {
      setDetailLoading(false);
    }
  };

  // 数据明细分页变化处理
  const handleDetailTableChange = (pagination: any) => {
    if (selectedProjectId) {
      setDetailCurrent(pagination.current);
      setDetailPageSize(pagination.pageSize);
      fetchDetailData(selectedProjectId, pagination.current, pagination.pageSize);
    }
  };

  // 数据明细搜索处理
  const handleDetailSearch = () => {
    if (selectedProjectId) {
      setDetailCurrent(1);
      fetchDetailData(selectedProjectId, 1, detailPageSize);
    }
  };

  // 数据明细重置处理
  const handleDetailReset = () => {
    if (selectedProjectId) {
      detailSearchForm.resetFields();
      setDetailCurrent(1);
      fetchDetailData(selectedProjectId, 1, detailPageSize);
    }
  };

  // 项目导入功能
  const handleProjectImport = (projectId: number) => {
    if (!projectId) {
      message.error('项目ID无效');
      return;
    }

    setSelectedProjectId(projectId);
    setImportModalVisible(true);
  };

  // 清空项目数据
  const handleClearProjectData = async (projectId: number) => {
    if (!projectId) {
      message.error('项目ID无效');
      return;
    }

    try {
      await clearProjectData(projectId);
      message.success('数据清空成功');
      // 刷新数据明细
      if (selectedProjectId === projectId) {
        fetchDetailData(projectId, detailCurrent, detailPageSize);
      }
    } catch (error) {
      message.error('清空数据失败');
    }
  };

  const columns = [
    {
      title: '项目ID',
      dataIndex: 'project_id',
      key: 'project_id',
      width: 120,
    },
    {
      title: '数据类型',
      dataIndex: 'import_type',
      key: 'import_type',
      width: 100,
      render: (text: string) => {
        const colorMap: Record<string, string> = {
          '区内明细': 'blue',
          '跨区明细': 'green',
          '手工明细': 'orange',
        };
        return <Tag color={colorMap[text]}>{text}</Tag>;
      },
    },
    {
      title: '街道/乡镇',
      dataIndex: 'street_town',
      key: 'street_town',
      width: 120,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: '证件号码',
      dataIndex: 'id_number',
      key: 'id_number',
      width: 150,
    },
    {
      title: '医保分类',
      dataIndex: 'medical_category',
      key: 'medical_category',
      width: 100,
    },
    {
      title: '费用总额',
      dataIndex: 'total_cost',
      key: 'total_cost',
      width: 120,
      render: (text: any) => formatAmount(text),
    },
    {
      title: '符合医保报销金额',
      dataIndex: 'eligible_reimbursement',
      key: 'eligible_reimbursement',
      width: 150,
      render: (text: any) => formatAmount(text),
    },
    {
      title: '基本医疗保险报销金额',
      dataIndex: 'basic_medical_reimbursement',
      key: 'basic_medical_reimbursement',
      width: 180,
      render: (text: any) => formatAmount(text),
    },
    {
      title: '大病报销金额',
      dataIndex: 'serious_illness_reimbursement',
      key: 'serious_illness_reimbursement',
      width: 130,
      render: (text: any) => formatAmount(text),
    },
    {
      title: '大额报销金额',
      dataIndex: 'large_amount_reimbursement',
      key: 'large_amount_reimbursement',
      width: 130,
      render: (text: any) => formatAmount(text),
    },
    {
      title: '医疗救助',
      dataIndex: 'medical_assistance',
      key: 'medical_assistance',
      width: 100,
      render: (text: any) => formatAmount(text),
    },
    {
      title: '倾斜救助',
      dataIndex: 'tilt_assistance',
      key: 'tilt_assistance',
      width: 100,
      render: (text: any) => formatAmount(text),
    },
    {
      title: '代缴类别',
      dataIndex: 'payment_category',
      key: 'payment_category',
      width: 100,
    },
    {
      title: '代缴金额',
      dataIndex: 'payment_amount',
      key: 'payment_amount',
      width: 120,
      render: (text: any) => formatAmount(text),
    },
    {
      title: '代缴日期',
      dataIndex: 'payment_date',
      key: 'payment_date',
      width: 120,
    },
    {
      title: '档次',
      dataIndex: 'level',
      key: 'level',
      width: 80,
    },
    {
      title: '个人支付',
      dataIndex: 'personal_amount',
      key: 'personal_amount',
      width: 120,
      render: (text: any) => formatAmount(text),
    },
    {
      title: '医疗救助类别',
      dataIndex: 'medical_assistance_category',
      key: 'medical_assistance_category',
      width: 120,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 150,
    },
    {
      title: '导入批次',
      dataIndex: 'import_batch',
      key: 'import_batch',
      width: 150,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (text: string) => text ? new Date(text).toLocaleString() : '-',
    },
  ];

  const projectColumns = [
    {
      title: '年月号',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '描述',
      dataIndex: 'dec',
      key: 'dec',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => text ? new Date(text).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Project) => (
        <Space size="middle">
          {access.canUpdateStatisticsSummary && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingProject(record);
                form.setFieldsValue(record);
                setProjectModalVisible(true);
              }}
            >
              编辑
            </Button>
          )}

          {access.canReadStatisticsSummary && (
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewProjectDetails(record.id)}
            >
              数据明细
            </Button>
          )}
          {access.canDeleteStatisticsSummary && (
            <Popconfirm
              title="确定要删除这个项目吗？"
              onConfirm={() => handleDeleteProject(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>


      {/* 项目管理卡片 */}
      <Card
        title="数据管理"
        extra={
          <Space>
            {access.canCreateStatisticsSummary && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingProject(null);
                  form.resetFields();
                  setProjectModalVisible(true);
                }}
              >
                新建数据项
              </Button>
            )}
            {access.canReadStatisticsSummary && (
              <Button
                type={selectedRowKeys.length > 0 ? "primary" : "default"}
                icon={<SearchOutlined />}
                onClick={handleStatistics}
                disabled={selectedRowKeys.length === 0}
              >
                人次统计 {selectedRowKeys.length > 0 ? `(${selectedRowKeys.length})` : ''}
              </Button>
            )}
            {access.canReadStatisticsSummary && (
              <Button
                type={selectedRowKeys.length > 0 ? "primary" : "default"}
                icon={<SearchOutlined />}
                onClick={handleReimbursementStatistics}
                disabled={selectedRowKeys.length === 0}
              >
                报销统计 {selectedRowKeys.length > 0 ? `(${selectedRowKeys.length})` : ''}
              </Button>
            )}
            {access.canReadStatisticsSummary && (
              <Button
                type={selectedRowKeys.length > 0 ? "primary" : "default"}
                icon={<SearchOutlined />}
                onClick={handleTiltAssistanceStatistics}
                disabled={selectedRowKeys.length === 0}
              >
                倾斜救助统计 {selectedRowKeys.length > 0 ? `(${selectedRowKeys.length})` : ''}
              </Button>
            )}
            {access.canExportStatisticsSummary && (
              <Button
                type={selectedRowKeys.length > 0 ? "primary" : "default"}
                icon={<UploadOutlined />}
                onClick={handleExportDetailStatistics}
                disabled={selectedRowKeys.length === 0}
              >
                导出明细 {selectedRowKeys.length > 0 ? `(${selectedRowKeys.length})` : ''}
              </Button>
            )}
            {selectedRowKeys.length > 0 && access.canBatchDeleteStatisticsSummary && (
              <Popconfirm
                title={`确定要删除选中的 ${selectedRowKeys.length} 个项目吗？`}
                onConfirm={handleBatchDeleteProjects}
                okText="确定"
                cancelText="取消"
              >
                <Button danger icon={<DeleteOutlined />}>
                  批量删除 ({selectedRowKeys.length})
                </Button>
              </Popconfirm>
            )}
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Table
          columns={projectColumns}
          dataSource={projects}
          rowKey="id"
          pagination={false}
          size="small"
          rowSelection={{
            selectedRowKeys,
            onChange: (newSelectedRowKeys) => {
              setSelectedRowKeys(newSelectedRowKeys);
            },
          }}
        />
      </Card>



      {/* 导入弹窗 */}
      {access.canImportStatisticsSummary && (
        <ImportModal
          visible={importModalVisible}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onCancel={() => {
            setImportModalVisible(false);
            // 不重置 selectedProjectId，保持按钮可用
          }}
          onSuccess={() => {
            setImportModalVisible(false);
            handleImportSuccess();
          }}
        />
      )}

      {/* 项目编辑弹窗 */}
      {access.canCreateStatisticsSummary || access.canUpdateStatisticsSummary ? (
        <Modal
          title={editingProject ? '编辑项目' : '新建项目'}
          open={projectModalVisible}
          onCancel={() => {
            setProjectModalVisible(false);
            setEditingProject(null);
            form.resetFields();
          }}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleProjectSubmit}
          >
            <Form.Item
              name="code"
              label="年月号"
              rules={[{ required: true, message: '请输入年月号' }]}
            >
              <Input placeholder="请输入年月号" />
            </Form.Item>
            <Form.Item
              name="dec"
              label="描述"
            >
              <Input placeholder="请输入描述" />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingProject ? '更新' : '创建'}
                </Button>
                <Button onClick={() => {
                  setProjectModalVisible(false);
                  setEditingProject(null);
                  form.resetFields();
                }}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      ) : null}

      {/* 数据明细弹窗 */}
      {access.canReadStatisticsSummary && (
        <Modal
          title={selectedProjectId ? `${projects.find(p => p.id === selectedProjectId)?.dec || ''}的数据明细` : '项目数据明细'}
          open={detailModalVisible}
          onCancel={() => {
            setDetailModalVisible(false);
            setSelectedProjectId(null);
            setDetailData([]);
            setDetailTotal(0);
            setDetailCurrent(1);
            setDetailPageSize(10);
            detailSearchForm.resetFields();
          }}
          width={1200}
          footer={[
            <Button key="close" onClick={() => {
              setDetailModalVisible(false);
              setSelectedProjectId(null);
              setDetailData([]);
              setDetailTotal(0);
              setDetailCurrent(1);
              setDetailPageSize(10);
              detailSearchForm.resetFields();
            }}>
              关闭
            </Button>
          ]}
        >
          {/* 搜索表单 */}
          <Card style={{ marginBottom: 16 }}>
            <Form
              form={detailSearchForm}
              layout="inline"
              style={{ marginBottom: 16 }}
            >
              <Form.Item name="data_type" label="数据类型">
                <Select
                  placeholder="请选择数据类型"
                  allowClear
                  style={{ width: 120 }}
                >
                  <Select.Option value="区内明细">区内明细</Select.Option>
                  <Select.Option value="跨区明细">跨区明细</Select.Option>
                  <Select.Option value="手工明细">手工明细</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="street_town" label="街道/乡镇">
                <Input placeholder="请输入街道/乡镇" style={{ width: 120 }} />
              </Form.Item>
              <Form.Item name="name" label="姓名">
                <Input placeholder="请输入姓名" style={{ width: 120 }} />
              </Form.Item>
              <Form.Item name="id_number" label="证件号码">
                <Input placeholder="请输入证件号码" style={{ width: 150 }} />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" onClick={handleDetailSearch}>
                    搜索
                  </Button>
                  <Button onClick={handleDetailReset}>
                    重置
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>

          {/* 导入数据按钮 */}
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Space>
              {access.canImportStatisticsSummary && (
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  onClick={() => selectedProjectId && handleProjectImport(selectedProjectId)}
                  disabled={!selectedProjectId}
                >
                  导入数据
                </Button>
              )}
              {access.canClearStatisticsSummary && (
                <Popconfirm
                  title="确定要清空该项目的所有数据吗？"
                  description="清空后可以重新导入数据，但无法恢复已删除的数据"
                  onConfirm={() => selectedProjectId && handleClearProjectData(selectedProjectId)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    disabled={!selectedProjectId}
                  >
                    清空数据
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </div>

          <Table
            columns={columns}
            dataSource={detailData}
            rowKey="id"
            loading={detailLoading}
            pagination={{
              current: detailCurrent,
              pageSize: detailPageSize,
              total: detailTotal,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
            }}
            onChange={handleDetailTableChange}
            scroll={{ x: 2000 }}
            size="small"
          />
        </Modal>
      )}

      {/* 人次统计结果弹窗 */}
      {access.canReadStatisticsSummary && (
        <PersonTimeStatisticsModal
          visible={statisticsModalVisible}
          onCancel={() => setStatisticsModalVisible(false)}
          data={statisticsData}
          loading={statisticsLoading}
          projectIds={selectedRowKeys.map(id => Number(id))}
        />
      )}

      {/* 报销统计结果弹窗 */}
      {access.canReadStatisticsSummary && (
        <ReimbursementStatisticsModal
          visible={reimbursementModalVisible}
          onCancel={() => setReimbursementModalVisible(false)}
          data={reimbursementData}
          loading={reimbursementLoading}
          projectIds={selectedRowKeys.map(id => Number(id))}
        />
      )}

      {/* 倾斜救助统计结果弹窗 */}
      {access.canReadStatisticsSummary && (
        <TiltAssistanceStatisticsModal
          visible={tiltAssistanceModalVisible}
          onCancel={() => setTiltAssistanceModalVisible(false)}
          data={tiltAssistanceData}
          loading={tiltAssistanceLoading}
          projectIds={selectedRowKeys.map(id => Number(id))}
        />
      )}
    </PageContainer>
  );
};

export default StatisticsSummary; 