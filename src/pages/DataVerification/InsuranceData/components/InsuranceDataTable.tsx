import React, { useEffect, useState } from 'react';
import { Table, Tag, Space, Button, message } from 'antd';
import { request } from '@umijs/max';

interface InsuranceDataTableProps {
  onDataChange?: () => void;
}

const InsuranceDataTable: React.FC<InsuranceDataTableProps> = ({ onDataChange }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const fetchData = async (params = {}) => {
    setLoading(true);
    try {
      const response = await request('/api/insurance-data', {
        method: 'GET',
        params: {
          page: pagination.current,
          page_size: pagination.pageSize,
          ...params,
        },
      });
      if (response.code === 200) {
        setData(response.data.list);
        setPagination({
          ...pagination,
          total: response.data.total,
        });
        if (onDataChange) {
          onDataChange();
        }
      }
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination.current, pagination.pageSize]);

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '身份证号',
      dataIndex: 'id_card',
      key: 'id_card',
    },
    {
      title: '匹配状态',
      dataIndex: 'match_status',
      key: 'match_status',
      render: (text: string) => (
        <Tag color={text === '数据正确' ? 'success' : 'error'}>{text}</Tag>
      ),
    },
    {
      title: '档次匹配状态',
      dataIndex: 'level_match_status',
      key: 'level_match_status',
      render: (text: string) => (
        <Tag color={text === 'matched' ? 'success' : 'error'}>
          {text === 'matched' ? '已匹配' : '未匹配'}
        </Tag>
      ),
    },
    {
      title: '救助身份匹配状态',
      dataIndex: 'assistance_identity_match_status',
      key: 'assistance_identity_match_status',
      render: (text: string) => (
        <Tag color={text === '已匹配' ? 'success' : 'error'}>{text}</Tag>
      ),
    },
    {
      title: '认定区匹配状态',
      dataIndex: 'street_town_match_status',
      key: 'street_town_match_status',
      render: (text: string) => (
        <Tag color={text === '已匹配' ? 'success' : 'error'}>{text}</Tag>
      ),
    },
    {
      title: '档次',
      dataIndex: 'level',
      key: 'level',
      render: (text: string) => (
        <Tag color={text ? 'blue' : 'red'}>{text || '未设置'}</Tag>
      ),
    },
    {
      title: '医疗救助类别',
      dataIndex: 'medical_assistance_category',
      key: 'medical_assistance_category',
      render: (text: string) => (
        <Tag color={text ? 'blue' : 'red'}>{text || '未设置'}</Tag>
      ),
    },
    {
      title: '代缴金额',
      dataIndex: 'payment_amount',
      key: 'payment_amount',
      render: (amount: number) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '个人实缴金额',
      dataIndex: 'personal_amount',
      key: 'personal_amount',
      render: (amount: number) => `¥${amount.toFixed(2)}`,
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
      loading={loading}
      pagination={{
        ...pagination,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条记录`,
      }}
      onChange={(newPagination) => {
        setPagination({
          ...pagination,
          current: newPagination.current || 1,
          pageSize: newPagination.pageSize || 10,
        });
      }}
    />
  );
};

export default InsuranceDataTable; 