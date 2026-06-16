import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Select, Space, Table, Tag } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getEnrollImportBatches } from '@/services/enroll';

const cardStyle: React.CSSProperties = {
  borderRadius: 6,
  border: '1px solid #edf0f5',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
};

const attachmentOptions = [
  { label: '附件1配置', value: 'attachment1_config' },
  { label: '附件2配置', value: 'attachment2_config' },
  { label: '附件3全量明细', value: 'attachment3_full_list' },
  { label: '附件4参保核实', value: 'attachment4_verify' },
  { label: '附件5税务请款', value: 'attachment5_tax' },
  { label: '附件6死亡名单', value: 'attachment6_death' },
  { label: '附件7身份对应明细', value: 'attachment7_amount_config' },
  { label: '缴费时间', value: 'payment_time' },
];

const statusColor: Record<string, string> = {
  pending: 'default',
  running: 'processing',
  completed: 'green',
  failed: 'red',
};

const yearOptions = [0, 1, 2].map(i => ({ label: `${dayjs().year() - i}`, value: dayjs().year() - i }));

const EnrollImportBatchesPage: React.FC = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const fetchData = async (page = current, size = pageSize) => {
    setLoading(true);
    try {
      const res = await getEnrollImportBatches({ ...form.getFieldsValue(), page, page_size: size });
      if (res.code === 0) {
        setData(res.data?.list || []);
        setTotal(res.data?.total || 0);
        setCurrent(res.data?.page || page);
        setPageSize(res.data?.pageSize || res.data?.page_size || size);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    form.setFieldsValue({ year: dayjs().year() });
    fetchData(1, pageSize);
  }, []);

  const reloadAfterFilterChange = (values: Record<string, any>) => {
    form.setFieldsValue(values);
    fetchData(1, pageSize);
  };

  const columns = [
    { title: '任务UUID', dataIndex: 'uuid', width: 190, fixed: 'left' as const },
    { title: '年份', dataIndex: 'year', width: 90 },
    { title: '月份', dataIndex: 'period', width: 110 },
    {
      title: '附件类型',
      dataIndex: 'attachment_type',
      width: 170,
      render: (value: string) => attachmentOptions.find(item => item.value === value)?.label || value,
    },
    { title: '文件名', dataIndex: 'file_name', width: 220 },
    { title: '总行数', dataIndex: 'total_rows', width: 100 },
    { title: '成功', dataIndex: 'success_rows', width: 100 },
    { title: '失败', dataIndex: 'failed_rows', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (value: string) => <Tag color={statusColor[value] || 'default'}>{value}</Tag>,
    },
    { title: '结果', dataIndex: 'message', width: 260, ellipsis: true },
    { title: '创建时间', dataIndex: 'created_at', width: 170 },
    { title: '更新时间', dataIndex: 'updated_at', width: 170 },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Card style={cardStyle} bodyStyle={{ padding: 16 }}>
        <Form form={form} layout="inline">
          <Form.Item name="year">
            <Select
              allowClear
              placeholder="年份"
              style={{ width: 120 }}
              options={yearOptions}
              onChange={year => reloadAfterFilterChange({ year })}
            />
          </Form.Item>
          <Form.Item name="attachment_type">
            <Select
              allowClear
              placeholder="附件类型"
              style={{ width: 180 }}
              options={attachmentOptions}
              onChange={attachment_type => reloadAfterFilterChange({ attachment_type })}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchData(1, pageSize)}>查询</Button>
              <Button icon={<ReloadOutlined />} onClick={() => fetchData(1, pageSize)}>刷新</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
      <Card style={{ ...cardStyle, marginTop: 12 }} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data}
          scroll={{ x: 1900 }}
          pagination={{ current, pageSize, total, showSizeChanger: true, showTotal: value => `共 ${value} 条` }}
          onChange={p => fetchData(p.current || 1, p.pageSize || pageSize)}
        />
      </Card>
    </div>
  );
};

export default EnrollImportBatchesPage;
