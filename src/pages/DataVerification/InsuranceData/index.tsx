import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Tag,
  Tooltip,
  Checkbox,
  Upload,
  App,
  Alert,
  Radio,
} from 'antd';
import { useAccess } from '@umijs/max';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  ClearOutlined,
  UploadOutlined,
  LoadingOutlined,
  DownloadOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { getConfig } from '../../../config';
import {
  getInsuranceDataList,
  getInsuranceData,
  updateInsuranceData,
  deleteInsuranceData,
  batchUpdateInsuranceData,
  getYears,
  getStreetTowns,
  getPaymentCategories,
  getLevels,
  getMedicalAssistanceCategories,
  getStatistics,
  createYear,
  importByYear,
  getYearList,
  updateYear,
  deleteYear,
  clearYearData,
  exportInsuranceData,
  getExportInfo,
  type InsuranceData,
  type InsuranceDataListParams,
  type StatisticsResult,
  type InsuranceYear,
} from '@/services/insuranceData';
import LevelMatchImportModal from './components/LevelMatchImportModal';
import ImportsTreetTowMatchModal from './components/ImportsTreetTowMatchModal';
import ImportModal from './components/ImportModal';
import EditableCell from './components/EditableCell';


const { Option } = Select;
const { TextArea } = Input;

interface FilterState {
  year: number;
  street_town: string;
  name: string;
  id_number: string;
  payment_category: string;
  level: string;
  medical_assistance_category: string;
  level_match_status: string;
  assistance_identity_match_status: string;
  street_town_match_status: string;
  match_status: string;
}

const initialFilters: FilterState = {
  year: new Date().getFullYear(),
  street_town: '',
  name: '',
  id_number: '',
  payment_category: '',
  level: '',
  medical_assistance_category: '',
  level_match_status: '',
  assistance_identity_match_status: '',
  street_town_match_status: '',
  match_status: '',
};

const InsuranceDataPage: React.FC = () => {
  const { message } = App.useApp();
  const access = useAccess();
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<InsuranceData[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [searchParams, setSearchParams] = useState<InsuranceDataListParams>({
    page: 1,
    page_size: 10,
  });
  const [statistics, setStatistics] = useState<StatisticsResult | null>(null);
  
  // 下拉选项数据
  const [years, setYears] = useState<number[]>([]);
  const [streetTowns, setStreetTowns] = useState<string[]>([]);
  const [paymentCategories, setPaymentCategories] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [medicalAssistanceCategories, setMedicalAssistanceCategories] = useState<string[]>([]);
  
  // 弹窗状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [yearModalVisible, setYearModalVisible] = useState(false);
  const [levelMatchModalVisible, setLevelMatchModalVisible] = useState(false);
  const [importsTreetTowMatchModalVisible, setImportsTreetTowMatchModalVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<InsuranceData>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(2025);
  const [currentYear, setCurrentYear] = useState<InsuranceYear>();
  const [importModalVisible, setImportModalVisible] = useState(false);
  
  // 年份管理相关状态
  const [yearList, setYearList] = useState<InsuranceYear[]>([]);
  const [yearListLoading, setYearListLoading] = useState(false);
  const [editYearModalVisible, setEditYearModalVisible] = useState(false);
  const [createYearModalVisible, setCreateYearModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [editYearForm] = Form.useForm();
  const [importForm] = Form.useForm();
  const [currentEditYear, setCurrentEditYear] = useState<InsuranceYear | null>(null);
  const [currentImportYear, setCurrentImportYear] = useState<InsuranceYear | null>(null);
  
  // 表单实例
  const [editForm] = Form.useForm();
  const [batchForm] = Form.useForm();
  const [yearForm] = Form.useForm();



  // 获取数据列表
  const fetchData = async (params: InsuranceDataListParams = {}) => {
    setLoading(true);
    try {
      const response = await getInsuranceDataList({
        ...filters,
        page: currentPage,
        page_size: pageSize,
        ...params,
      });
      if (response.code === 0) {
        setDataSource(response.data.list);
        setTotal(response.data.total);
      } else {
        message.error(response.message || '获取数据失败');
      }
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取统计数据
  /**
   * 获取统计数据
   * @param params 可选参数，允许传递过滤条件和年份
   */
  // 只允许接受一个 year 参数
  const fetchStatistics = async (year?: number) => {
    try {
      const currentYear = year !== undefined ? year : selectedYear;
      const response = await getStatistics(currentYear);
      if (response.code === 0) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  };

  // 获取下拉选项数据
  const fetchOptions = async () => {
    try {
      const [yearResponse, streetResponse, categoryResponse, levelResponse, medicalResponse] = await Promise.all([
        getYears(),
        getStreetTowns(),
        getPaymentCategories(),
        getLevels(),
        getMedicalAssistanceCategories(),
      ]);

      if (yearResponse.code === 0) setYears(yearResponse.data);
      if (streetResponse.code === 0) setStreetTowns(streetResponse.data);
      if (categoryResponse.code === 0) setPaymentCategories(categoryResponse.data);
      if (levelResponse.code === 0) setLevels(levelResponse.data);
      if (medicalResponse.code === 0) setMedicalAssistanceCategories(medicalResponse.data);
    } catch (error) {
      console.error('获取选项数据失败:', error);
    }
  };

  // 获取年份列表
  const fetchYearList = async () => {
    setYearListLoading(true);
    try {
      const response = await getYearList();
      if (response.code === 0) {
        setYearList(response.data);
      } else {
        message.error(response.message || '获取年份列表失败');
      }
    } catch (error) {
      console.error('获取年份列表失败:', error);
    } finally {
      setYearListLoading(false);
    }
  };

  // 初始化
  useEffect(() => {
    // 设置默认搜索参数
    if (!searchParams.year) {
      setSearchParams({ year: filters.year });
    }
    fetchData();
    fetchStatistics();
    fetchOptions();
    fetchYearList(); // 添加这行
  }, [currentPage, pageSize]);

  // 处理筛选条件变化
  const handleFilterChange = (key: keyof FilterState, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: key === 'year' ? Number(value) || new Date().getFullYear() : value,
    }));

    // 当选择年份后，立即更新filters中的year，并重置页码为1，重新请求对应年份的数据和统计
    if (key === 'year') {
      setSelectedYear(Number(value));
      setCurrentPage(1);
      // 注意：此处filters的year尚未立即更新，需手动传递新year
      fetchData({ ...filters, year: Number(value), page: 1 });
      // fetchStatistics 依赖filters.year，filters未立即生效，需手动传递新year
      fetchStatistics(Number(value));
    }
  };

  // 处理搜索
  const handleSearch = () => {
    setCurrentPage(1);
    fetchData({ ...filters, page: 1 });
    fetchStatistics();
  };

  // 处理重置
  const handleReset = () => {
    setFilters(initialFilters);
    setCurrentPage(1);
    fetchData({ page: 1 });
    fetchStatistics();
  };

  // 编辑记录
  const handleEdit = async (record: InsuranceData) => {
    setCurrentRecord(record);
    editForm.setFieldsValue({
      ...record,
      payment_date: record.payment_date ? dayjs(record.payment_date) : undefined,
    });
    setEditModalVisible(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    try {
      const values = await editForm.validateFields();
      if (!currentRecord) return;

      const updateData = {
        ...values,
        payment_date: values.payment_date ? values.payment_date.format('YYYY-MM-DD') : undefined,
      };

      const response = await updateInsuranceData(currentRecord.id, updateData);
      if (response.code === 0) {
        message.success('更新成功');
        setEditModalVisible(false);
        fetchData();
        fetchStatistics();
      } else {
        message.error(response.message || '更新失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  // 删除记录
  const handleDelete = async (id: number) => {
    try {
      const response = await deleteInsuranceData(id);
      if (response.code === 0) {
        message.success('删除成功');
        fetchData();
        fetchStatistics();
      } else {
        message.error(response.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 批量更新
  const handleBatchUpdate = async () => {
    try {
      const values = await batchForm.validateFields();
      if (selectedRowKeys.length === 0) {
        message.warning('请选择要更新的数据');
        return;
      }

      const updateData = {
        ...values,
        payment_date: values.payment_date ? values.payment_date.format('YYYY-MM-DD') : undefined,
      };

      const response = await batchUpdateInsuranceData({
        ids: selectedRowKeys as number[],
        update_data: updateData,
      });

      if (response.code === 0) {
        message.success(`成功更新 ${response.data.updated_count} 条数据`);
        setBatchModalVisible(false);
        setSelectedRowKeys([]);
        fetchData();
        fetchStatistics();
      } else {
        message.error(response.message || '批量更新失败');
      }
    } catch (error) {
      console.error('批量更新失败:', error);
    }
  };

  // 创建新年份
  const handleCreateYear = async () => {
    try {
      const values = await yearForm.validateFields();
      const response = await createYear(values.year);
      if (response.code === 0) {
        message.success(`成功创建${values.year}年数据`);
        setCreateYearModalVisible(false);
        yearForm.resetFields();
        fetchOptions(); // Refresh year list
        fetchYearList(); // Refresh year management list
      } else {
        message.error(response.message || '创建年份失败');
      }
    } catch (error) {
      console.error('创建年份失败:', error);
    }
  };

  // 编辑年份
  const handleEditYear = (year: InsuranceYear) => {
    setCurrentEditYear(year);
    editYearForm.setFieldsValue({
      description: year.description,
      is_active: year.is_active,
    });
    setEditYearModalVisible(true);
  };

  // 保存编辑年份
  const handleSaveEditYear = async () => {
    try {
      const values = await editYearForm.validateFields();
      if (!currentEditYear) return;

      const response = await updateYear(currentEditYear.id, values);
      if (response.code === 0) {
        message.success('年份更新成功');
        setEditYearModalVisible(false);
        editYearForm.resetFields();
        fetchYearList();
        fetchOptions(); // Refresh year list
      } else {
        message.error(response.message || '更新年份失败');
      }
    } catch (error) {
      console.error('更新年份失败:', error);
    }
  };

  // 删除年份
  const handleDeleteYear = async (year: InsuranceYear) => {
    try {
      const response = await deleteYear(year.id);
      if (response.code === 0) {
        message.success(`成功删除${year.year}年`);
        fetchYearList();
        fetchOptions(); // Refresh year list
      } else {
        message.error(response.message || '删除年份失败');
      }
    } catch (error) {
      console.error('删除年份失败:', error);
    }
  };

  // 显示导入模态框
  const handleShowImportModal = (year: InsuranceYear) => {
    setCurrentYear(year);
    setImportModalVisible(true);
  };

  // 显示导入参保档次模态框
  const handleShowImportLevelMatchModal = (year: InsuranceYear) => {
    setCurrentYear(year);
    setLevelMatchModalVisible(true);
  };
  

  // 显示导入认定区模态框
  const handleShowImportsTreetTowMatchModal = (year: InsuranceYear) => {
    setCurrentYear(year);
    setImportsTreetTowMatchModalVisible(true);
  };


  // 清空年份数据
  const handleClearYearData = async (year: InsuranceYear) => {
    try {
      const response = await clearYearData(year.id);
      if (response.code === 0) {
        message.success(`成功清空${year.year}年数据，共删除${response.data.deleted_count}条记录`);
        fetchYearList(); // Refresh year list
        fetchOptions(); // Refresh year list
        fetchData(); // Refresh current data
        fetchStatistics(); // Refresh statistics
      } else {
        message.error(response.message || '清空年份数据失败');
      }
    } catch (error) {
      console.error('清空年份数据失败:', error);
      message.error('清空年份数据失败');
    }
  };

  // 导出参保数据
  const handleExport = async () => {
    setExportLoading(true);
    try {
      // 先获取导出信息
      const infoResponse = await getExportInfo({
        ...filters,
        year: selectedYear,
      });
      
      if (infoResponse.code !== 0) {
        message.error(infoResponse.message || '获取导出信息失败');
        return;
      }
      
      const exportInfo = infoResponse.data;
      
      // 检查是否可以导出
      if (!exportInfo.can_export) {
        message.error('数据量过大，无法导出');
        return;
      }
      
      // 执行导出
      const response = await exportInsuranceData({
        ...filters,
        year: selectedYear,
      });
      
      // 创建下载链接
      const blob = new Blob([response], { 
        type: 'text/csv; charset=utf-8'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedYear}年参保数据.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success(`导出成功，共${exportInfo.total_count}条记录`);
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
    } finally {
      setExportLoading(false);
    }
  };

  // 处理参保档次匹配导入

  // 内联编辑保存逻辑
  const handleInlineEdit = async (record: InsuranceData, field: string, value: string) => {
    try {
      const response = await updateInsuranceData(record.id, { [field]: value });
      if (response.code === 0) {
        message.success('更新成功');
        // 更新本地数据
        setDataSource(prev => 
          prev.map(item => 
            item.id === record.id ? { ...item, [field]: value } : item
          )
        );
        // 刷新统计数据
        fetchStatistics();
      } else {
        message.error(response.message || '更新失败');
        throw new Error(response.message || '更新失败');
      }
    } catch (error) {
      message.error('更新失败');
      throw error;
    }
  };

  // 表格列定义
  const columns: ColumnsType<InsuranceData> = [
    {
      title: '序号',
      dataIndex: 'id',
      width: 100,
      align: 'center',
      fixed: 'left',
    },
    {
      title: '姓名',
      dataIndex: 'name',
      width: 80,
      fixed: 'left',
    },
    {
      title: '身份证号',
      dataIndex: 'id_number',
      width: 200,
    },
    {
      title: '档次匹配状态',
      dataIndex: 'level_match_status',
      width: 160,
      align: 'center',
      render: (text: string, record: InsuranceData) => (
        <EditableCell
          value={text || ''}
          record={record}
          field="level_match_status"
          onSave={handleInlineEdit}
          options={[
            { value: 'matched', label: '已匹配', color: 'success' },
            { value: 'unmatched', label: '未匹配', color: 'error' }
          ]}
        />
      ),
    },
    {
      title: '医疗救助匹配状态',
      dataIndex: 'assistance_identity_match_status',
      width: 160,
      render: (text: string, record: InsuranceData) => (
        <EditableCell
          value={text || ''}
          record={record}
          field="assistance_identity_match_status"
          onSave={handleInlineEdit}
          options={[
            { value: 'matched', label: '已匹配', color: 'success' },
            { value: 'unmatched', label: '未匹配', color: 'error' }
          ]}
        />
      ),
    },
    {
      title: '认定区匹配状态',
      dataIndex: 'street_town_match_status',
      width: 160,
      render: (text: string, record: InsuranceData) => (
        <EditableCell
          value={text || ''}
          record={record}
          field="street_town_match_status"
          onSave={handleInlineEdit}
          options={[
            { value: 'matched', label: '已匹配', color: 'success' },
            { value: 'unmatched', label: '未匹配', color: 'error' }
          ]}
        />
      ),
    },
    {
      title: '数据状态',
      dataIndex: 'match_status',
      width: 140,
      render: (text: string, record: InsuranceData) => (
        <EditableCell
          value={text || ''}
          record={record}
          field="match_status"
          onSave={handleInlineEdit}
          options={[
            { value: 'matched', label: '正常数据', color: 'success' },
            { value: 'unmatched', label: '疑点数据', color: 'error' },
            { value: '', label: '未匹配', color: 'default' }
          ]}
        />
      ),
    },
    {
      title: '街道乡镇',
      dataIndex: 'street_town',
      width: 120,
      ellipsis: true,
    },
    {
      title: '代缴类别',
      dataIndex: 'payment_category',
      width: 200,
    },
    {
      title: '档次',
      dataIndex: 'level',
      width: 120,
      render: (text: string) => text || '-',
    },
    {
      title: '医疗救助类别',
      dataIndex: 'medical_assistance_category',
      width: 120,
      ellipsis: true,
    },
    
    {
      title: '代缴金额',
      dataIndex: 'payment_amount',
      width: 100,
      align: 'right',
      render: (value) => value ? `¥${Number(value).toFixed(2)}` : '-',
    },
    {
      title: '个人实缴金额',
      dataIndex: 'personal_amount',
      width: 120,
      align: 'right',
      render: (value) => value ? `¥${Number(value).toFixed(2)}` : '-',
    },
    {
      title: '缴费日期',
      dataIndex: 'payment_date',
      width: 100,
      align: 'center',
      render: (value) => value ? dayjs(value).format('YYYY-MM-DD') : '-',
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          {access.canUpdateInsuranceData && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          )}
          {access.canDeleteInsuranceData && (
            <Popconfirm
              title="确定要删除这条记录吗？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 选项数据
  const streetOptions = streetTowns || [];
  const paymentCategoryOptions = paymentCategories || [];
  const levelOptions = levels || [];
  const medicalCategoryOptions = medicalAssistanceCategories || [];

  // 筛选表单
  const filterForm = (
    <div style={{ background: '#fff', padding: '12px 16px', marginBottom: '16px', borderRadius: '8px' }}>
      <Row gutter={[12, 12]}>
        {/* 第一行：基本信息 */}
        <Col span={6}>
          <Form.Item label="年份" style={{ marginBottom: 0 }}>
            <Select
              value={filters.year}
              onChange={(value) => handleFilterChange('year', value)}
              placeholder="请选择年份"
              style={{ width: '100%' }}
            >
              {years.sort((a, b) => b - a).map(year => (
                <Option key={year} value={year}>{year}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="姓名" style={{ marginBottom: 0 }}>
            <Input
              value={filters.name}
              onChange={(e) => handleFilterChange('name', e.target.value)}
              placeholder="请输入姓名"
              allowClear
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="身份证号" style={{ marginBottom: 0 }}>
            <Input
              value={filters.id_number}
              onChange={(e) => handleFilterChange('id_number', e.target.value)}
              placeholder="请输入身份证号"
              allowClear
              style={{ width: '180px' }}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="街道乡镇" style={{ marginBottom: 0 }}>
            <Select
              value={filters.street_town}
              onChange={(value) => handleFilterChange('street_town', value)}
              placeholder="请选择街道乡镇"
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="children"
              allowClear
            >
              {streetOptions.map(street => (
                <Option key={street} value={street}>{street}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        {/* 第二行：类别和档次 */}
        <Col span={6}>
          <Form.Item label="代缴类别" style={{ marginBottom: 0 }}>
            <Select
              value={filters.payment_category}
              onChange={(value) => handleFilterChange('payment_category', value)}
              placeholder="请选择代缴类别"
              style={{ width: '100%' }}
              allowClear
            >
              {paymentCategoryOptions.map(category => (
                <Option key={category} value={category}>{category}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="档次" style={{ marginBottom: 0 }}>
            <Select
              value={filters.level}
              onChange={(value) => handleFilterChange('level', value)}
              placeholder="请选择档次"
              style={{ width: '100%' }}
              allowClear
            >
              {levelOptions.map(level => (
                <Option key={level} value={level}>{level}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="医疗救助类别" style={{ marginBottom: 0 }}>
            <Select
              value={filters.medical_assistance_category}
              onChange={(value) => handleFilterChange('medical_assistance_category', value)}
              placeholder="请选择"
              style={{ width: '100%' }}
              allowClear
            >
              {medicalCategoryOptions.map(category => (
                <Option key={category} value={category}>{category}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="档次匹配状态" style={{ marginBottom: 0 }}>
            <Select
              value={filters.level_match_status}
              onChange={(value) => handleFilterChange('level_match_status', value)}
              placeholder="请选择"
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="matched">已匹配</Option>
              <Option value="unmatched">未匹配</Option>
            </Select>
          </Form.Item>
        </Col>

        {/* 第三行：匹配状态和按钮 */}
        <Col span={6}>
          <Form.Item label="医疗救助匹配状态" style={{ marginBottom: 0 }}>
            <Select
              style={{ width: '100%' }}
              placeholder="请选择"
              allowClear
              value={filters.assistance_identity_match_status}
              onChange={(value) => handleFilterChange('assistance_identity_match_status', value)}
            >
              <Option value="matched">已匹配</Option>
              <Option value="unmatched">未匹配</Option>
            </Select>
          </Form.Item>
        </Col>
         {/* 第四行：匹配状态和按钮 */}
        <Col span={6}>
          <Form.Item label="认定区匹配状态" style={{ marginBottom: 0 }}>
            <Select
              style={{ width: '100%' }}
              placeholder="请选择"
              allowClear
              value={filters.street_town_match_status}
              onChange={(value) => handleFilterChange('street_town_match_status', value)}
            >
              <Option value="matched">正常数据</Option>
              <Option value="unmatched">疑点数据</Option>
            </Select>
          </Form.Item>
        </Col>
         <Col span={6}>
          <Form.Item label="匹配状态" style={{ marginBottom: 0 }}>
            <Select
              style={{ width: '100%' }}
              placeholder="请选择"
              allowClear
              value={filters.match_status}
              onChange={(value) => handleFilterChange('match_status', value)}
            >
              <Option value="matched">正常数据</Option>
              <Option value="unmatched">疑点数据</Option>
              <Option value="unmatched_data">未匹配</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={6} style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', justifyContent: 'flex-end' }}>
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Col>
      </Row>
    </div>
  );

    // 统计卡片
  const statisticsCards = statistics && (
    <div style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总记录数"
              value={statistics.total}
              valueStyle={{ color: '#000' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="正确数据"
              value={statistics.matched_count}
              valueStyle={{ color: '#52c41a' }}
              // suffix={<span style={{ fontSize: '14px', color: '#666' }}>/ {statistics.total}</span>}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="待匹配数量"
              value={statistics.unmatched_data_count}
              valueStyle={{ color: '#1677ff' }}
              // suffix={<span style={{ fontSize: '14px', color: '#666' }}>/ {statistics.total}</span>}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="疑点数据"
              value={statistics.unmatched_count}
              valueStyle={{ color: '#ff4d4f' }}
              // suffix={<span style={{ fontSize: '14px', color: '#666' }}>/ {statistics.total}</span>}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总代缴金额"
              value={statistics.payment_formatted || statistics.total_payment || '0.00'}
              valueStyle={{ color: '#1890ff' }}
              prefix="¥"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );


  return (
    <PageContainer>
      {statisticsCards}
      {filterForm}
      
      <Card>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ margin: 0, color: '#1890ff' }}>
              参保数据 {selectedYear}年
            </h3>
            <Tag color="blue" style={{ fontSize: '14px', padding: '4px 8px' }}>
              共 {total} 条记录
            </Tag>
          </div>
          <Space>
            {access.canReadInsuranceData && (
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={() => {
                  fetchData();
                  fetchStatistics();
                }}
              >
                刷新
              </Button>
            )}
            {access.canImportInsuranceData && (
              <Button
                type="default"
                icon={<UploadOutlined />}
                onClick={() => {
                  if (!selectedYear) {
                    message.warning('请先选择年份');
                    return;
                  }
                  const currentYear = yearList.find(y => y.year === selectedYear);
                  if (currentYear) {
                    handleShowImportModal(currentYear);
                  } else {
                    message.warning('请先在年份管理中创建该年份');
                  }
                }}
              >
                导入原始数据
              </Button>
            )}


            {access.canImportInsuranceData && (
              <Button 
                type="default"
                icon={<UploadOutlined />} 
                  onClick={() => {
                    if (!selectedYear) {
                      message.warning('请先选择年份');
                      return;
                    }
                    const currentYear = yearList.find(y => y.year === selectedYear);
                    if (currentYear) {
                      handleShowImportLevelMatchModal(currentYear);
                    } else {
                      message.warning('请先在年份管理中创建该年份');
                    }
                  }}
              >
                导入参保档次匹配数据
              </Button>
            )}
            {access.canImportInsuranceData && (
              <Button 
                type="default"
                icon={<UploadOutlined />} 
                onClick={() => {
                  if (!selectedYear) {
                    message.warning('请先选择年份');
                    return;
                  }
                  const currentYear = yearList.find(y => y.year === selectedYear);
                  if (currentYear) {
                    handleShowImportsTreetTowMatchModal(currentYear);
                  } else {
                    message.warning('请先在年份管理中创建该年份');
                  }
                }}
              >
                匹配救助身份和认定区数据
              </Button>
            )}
            {access.canDeleteInsuranceData && (
              <Popconfirm
                title={`确定要清空${selectedYear}年的数据吗？`}
                description="清空后可以重新导入数据，但无法恢复已删除的数据"
                onConfirm={() => {
                  const currentYear = yearList.find(y => y.year === selectedYear);
                  if (currentYear) {
                    handleClearYearData(currentYear);
                  }
                }}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="default"
                  danger
                  icon={<ClearOutlined />}
                  disabled={!selectedYear || !yearList.find(y => y.year === selectedYear)?.data_count}
                >
                  清空数据
                </Button>
              </Popconfirm>
            )}

            {access.canExportInsuranceData && (
              <Button
                type="default"
                icon={<DownloadOutlined />}
                onClick={handleExport}
                loading={exportLoading}
              >
                导出CSV
              </Button>
            )}
            {access.canUpdateInsuranceData && (
              <Button
                type="default"
                disabled={selectedRowKeys.length === 0}
                onClick={() => setBatchModalVisible(true)}
              >
                批量更新 ({selectedRowKeys.length})
              </Button>
            )}
            {access.canCreateInsuranceData && (
              <Button
                type="default"
                onClick={() => {
                  setYearModalVisible(true);
                  fetchYearList();
                }}
              >
                年份管理
              </Button>
            )}
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1500 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
        />
      </Card>

      {/* 编辑弹窗 */}
      <Modal
        title="编辑参保数据"
        open={editModalVisible}
        onOk={handleSaveEdit}
        onCancel={() => setEditModalVisible(false)}
        width={800}
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          preserve={false}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="street_town" label="街道乡镇" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="id_number" label="身份证件号码" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="person_number" label="人员编号">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="payment_category" label="代缴类别" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="payment_amount" label="代缴金额" rules={[{ required: true }]}>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  placeholder="请输入代缴金额"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="level" label="档次">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="personal_amount" label="个人实缴金额">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  placeholder="请输入个人实缴金额"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="medical_assistance_category" label="医疗救助类别">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category_match" label="类别匹配">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="payment_date" label="缴费日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="serial_number" label="序号">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="level_match_status" label="档次匹配状态">
                <Select placeholder="请选择档次匹配状态" allowClear>
                  <Option value="matched">已匹配</Option>
                  <Option value="unmatched">未匹配</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="assistance_identity_match_status" label="医疗救助匹配状态">
                <Select placeholder="请选择医疗救助匹配状态" allowClear>
                  <Option value="matched">已匹配</Option>
                  <Option value="unmatched">未匹配</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="street_town_match_status" label="认定区匹配状态">
                <Select placeholder="请选择认定区匹配状态" allowClear>
                  <Option value="matched">已匹配</Option>
                  <Option value="unmatched">未匹配</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="match_status" label="数据状态">
                <Select placeholder="请选择数据状态" allowClear>
                  <Option value="matched">正常数据</Option>
                  <Option value="unmatched">疑点数据</Option>
                  <Option value="">未匹配</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remark" label="备注">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量更新弹窗 */}
      <Modal
        title="批量更新参保数据"
        open={batchModalVisible}
        onOk={handleBatchUpdate}
        onCancel={() => setBatchModalVisible(false)}
        width={600}
        destroyOnClose
      >
        <Form
          form={batchForm}
          layout="vertical"
          preserve={false}
        >
          <Form.Item label="选择要更新的字段">
            <Checkbox.Group>
              <Row gutter={16}>
                <Col span={12}>
                  <Checkbox value="level">档次</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="personal_amount">个人实缴金额</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="medical_assistance_category">医疗救助类别</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="category_match">类别匹配</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="payment_date">缴费日期</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="remark">备注</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="level_match_status">档次匹配状态</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="assistance_identity_match_status">医疗救助匹配状态</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="street_town_match_status">认定区匹配状态</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="match_status">数据状态</Checkbox>
                </Col>
              </Row>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item name="level" label="档次">
            <Input placeholder="请输入档次" />
          </Form.Item>
          <Form.Item name="personal_amount" label="个人实缴金额">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="请输入个人实缴金额"
            />
          </Form.Item>
          <Form.Item name="medical_assistance_category" label="医疗救助类别">
            <Input placeholder="请输入医疗救助类别" />
          </Form.Item>
          <Form.Item name="category_match" label="类别匹配">
            <Input placeholder="请输入类别匹配" />
          </Form.Item>
          <Form.Item name="payment_date" label="缴费日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
          <Form.Item name="level_match_status" label="档次匹配状态">
            <Select placeholder="请选择档次匹配状态" allowClear>
              <Option value="matched">已匹配</Option>
              <Option value="unmatched">未匹配</Option>
            </Select>
          </Form.Item>
          <Form.Item name="assistance_identity_match_status" label="医疗救助匹配状态">
            <Select placeholder="请选择医疗救助匹配状态" allowClear>
              <Option value="matched">已匹配</Option>
              <Option value="unmatched">未匹配</Option>
            </Select>
          </Form.Item>
          <Form.Item name="street_town_match_status" label="认定区匹配状态">
            <Select placeholder="请选择认定区匹配状态" allowClear>
              <Option value="matched">已匹配</Option>
              <Option value="unmatched">未匹配</Option>
            </Select>
          </Form.Item>
          <Form.Item name="match_status" label="数据状态">
            <Select placeholder="请选择数据状态" allowClear>
              <Option value="matched">正常数据</Option>
              <Option value="unmatched">疑点数据</Option>
              <Option value="">未匹配</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 年份管理弹窗 */}
      <Modal
        title="年份管理"
        open={yearModalVisible}
        onCancel={() => setYearModalVisible(false)}
        width={800}
        destroyOnClose
        footer={null}
      >
        <div style={{ marginBottom: 16 }}>
          {access.canCreateInsuranceData && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                yearForm.resetFields();
                setCreateYearModalVisible(true);
              }}
            >
              创建新年份
            </Button>
          )}
        </div>
        
        <Table
          dataSource={yearList}
          loading={yearListLoading}
          rowKey="id"
          pagination={false}
          columns={[
            {
              title: '年份',
              dataIndex: 'year',
              key: 'year',
              width: 100,
            },
            {
              title: '描述',
              dataIndex: 'description',
              key: 'description',
              width: 200,
            },
            {
              title: '数据条数',
              dataIndex: 'data_count',
              key: 'data_count',
              width: 100,
              align: 'center' as const,
            },
            {
              title: '状态',
              dataIndex: 'is_active',
              key: 'is_active',
              width: 100,
              align: 'center' as const,
              render: (isActive: boolean) => (
                <Tag color={isActive ? 'green' : 'red'}>
                  {isActive ? '激活' : '禁用'}
                </Tag>
              ),
            },
            {
              title: '创建时间',
              dataIndex: 'created_at',
              key: 'created_at',
              width: 150,
              render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
            },
            {
              title: '操作',
              key: 'action',
              width: 200,
              render: (_, record: InsuranceYear) => (
                <Space>
                  {access.canUpdateInsuranceData && (
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleEditYear(record)}
                    >
                      编辑
                    </Button>
                  )}
                  {access.canDeleteInsuranceData && (
                    <Popconfirm
                      title={`确定要删除${record.year}年吗？`}
                      description="删除后无法恢复，请谨慎操作"
                      onConfirm={() => handleDeleteYear(record)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={record.data_count > 0}
                      >
                        删除年份
                      </Button>
                    </Popconfirm>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Modal>

      {/* 创建年份模态框 */}
      <Modal
        title="创建新年份"
        open={createYearModalVisible}
        onOk={handleCreateYear}
        onCancel={() => setCreateYearModalVisible(false)}
        width={500}
        destroyOnClose
      >
        <Form form={yearForm} layout="vertical" preserve={false}>
          <Form.Item
            name="year"
            label="年份"
            rules={[
              { required: true, message: '请输入年份' },
              { type: 'number', min: 2020, max: 2030, message: '年份必须在2020-2030之间' }
            ]}
          >
            <InputNumber style={{ width: '100%' }} placeholder="请输入年份，如：2025" min={2020} max={2030} />
          </Form.Item>
          <div style={{ color: '#666', fontSize: '12px' }}>
            说明：创建新年份后，可以导入该年份的参保数据
          </div>
        </Form>
      </Modal>

      {/* 编辑年份模态框 */}
      <Modal
        title="编辑年份"
        open={editYearModalVisible}
        onOk={handleSaveEditYear}
        onCancel={() => setEditYearModalVisible(false)}
        width={500}
        destroyOnClose
      >
        <Form form={editYearForm} layout="vertical" preserve={false}>
          <Form.Item
            name="description"
            label="描述"
            rules={[{ required: true, message: '请输入描述' }]}
          >
            <Input placeholder="请输入年份描述" />
          </Form.Item>
          <Form.Item
            name="is_active"
            label="状态"
            valuePropName="checked"
          >
            <Checkbox>激活状态</Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      {/* 导入数据模态框 */}
      <ImportModal
        visible={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        onSuccess={() => {
          fetchData();
          fetchStatistics();
          fetchYearList();
        }}
        currentYear={currentYear}
      />

      {/* 参保档次匹配导入弹窗 */}
      <LevelMatchImportModal
        visible={levelMatchModalVisible}
        onCancel={() => setLevelMatchModalVisible(false)}
        onSuccess={() => {
          fetchData();
          fetchStatistics();
          fetchYearList();
        }}
        currentYear={currentYear}
      />

      {/* 认定区导入弹窗 */}
      <ImportsTreetTowMatchModal
        visible={importsTreetTowMatchModalVisible}
        onCancel={() => setImportsTreetTowMatchModalVisible(false)}
        onSuccess={() => {
          fetchData();
          fetchStatistics();
          fetchYearList();
        }}
        currentYear={currentYear}
      />
    </PageContainer>
  );
};

export default () => (
  <App>
    <InsuranceDataPage />
  </App>
); 