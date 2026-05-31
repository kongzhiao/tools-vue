import React, { useEffect, useState } from 'react';
import { Button, Card, DatePicker, Form, Input, message, Modal, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { CopyOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { getOperationLogs } from '@/services/system';

const { RangePicker } = DatePicker;

interface OperationLogItem {
  id: number;
  user_id?: number;
  username?: string;
  module: string;
  action: string;
  target_type?: string;
  target_id?: string;
  description?: string;
  params?: any;
  ip?: string;
  user_agent?: string;
  status: string;
  error_message?: string;
  created_at: string;
}

const cardStyle: React.CSSProperties = {
  borderRadius: 6,
  border: '1px solid #edf0f5',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    message.success('已复制');
  } catch (error) {
    message.error('复制失败');
  }
};

const EllipsisText: React.FC<{ value?: any; maxWidth?: number | string }> = ({ value, maxWidth = '100%' }) => {
  const text = value === null || value === undefined || value === '' ? '' : String(value);
  if (!text) return <>-</>;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth, width: '100%', minWidth: 0 }}>
      <Tooltip title="复制">
        <Button
          type="text"
          size="small"
          icon={<CopyOutlined />}
          onClick={event => {
            event.stopPropagation();
            copyToClipboard(text);
          }}
          style={{ width: 18, height: 18, padding: 0, flex: '0 0 18px' }}
        />
      </Tooltip>
      <Typography.Text ellipsis={{ tooltip: text }} style={{ display: 'inline-block', flex: 1, minWidth: 0 }}>
        {text}
      </Typography.Text>
    </span>
  );
};

const OperationLog: React.FC = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState<OperationLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<OperationLogItem | null>(null);

  const fetchData = async (page = current, size = pageSize) => {
    const values = form.getFieldsValue();
    const range = values.created_range || [];
    const params = {
      page,
      page_size: size,
      ...values,
      created_range: undefined,
      start_at: range[0] ? range[0].format('YYYY-MM-DD 00:00:00') : undefined,
      end_at: range[1] ? range[1].format('YYYY-MM-DD 23:59:59') : undefined,
    };

    setLoading(true);
    try {
      const res = await getOperationLogs(params);
      if (res.code === 0) {
        setData(res.data?.list || []);
        setTotal(res.data?.total || 0);
        setCurrent(res.data?.page || page);
        setPageSize(res.data?.page_size || size);
      }
    } catch (error) {
      message.error('获取操作记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, pageSize);
  }, []);

  const columns = [
    { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 170, fixed: 'left' as const, render: (v: string) => v || '-' },
    { title: '账号', dataIndex: 'username', key: 'username', width: 120, render: (v: string) => <EllipsisText value={v} maxWidth={102} /> },
    { title: '模块', dataIndex: 'module', key: 'module', width: 130, render: (v: string) => <EllipsisText value={v} maxWidth={112} /> },
    { title: '操作', dataIndex: 'action', key: 'action', width: 110, render: (v: string) => <Tag color="blue">{v || '-'}</Tag> },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: string) => <Tag color={v === 'success' ? 'green' : 'red'}>{v === 'success' ? '成功' : '失败'}</Tag>,
    },
    { title: '对象类型', dataIndex: 'target_type', key: 'target_type', width: 130, render: (v: string) => <EllipsisText value={v} maxWidth={112} /> },
    { title: '对象ID', dataIndex: 'target_id', key: 'target_id', width: 130, render: (v: string) => <EllipsisText value={v} maxWidth={112} /> },
    { title: '说明', dataIndex: 'description', key: 'description', width: 220, render: (v: string) => <EllipsisText value={v} maxWidth={202} /> },
    { title: 'IP', dataIndex: 'ip', key: 'ip', width: 150, render: (v: string) => <EllipsisText value={v} maxWidth={132} /> },
    {
      title: '详情',
      key: 'action',
      width: 90,
      fixed: 'right' as const,
      render: (_: any, record: OperationLogItem) => (
        <Button type="link" onClick={() => setDetail(record)}>查看</Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Card style={cardStyle} bodyStyle={{ padding: 16 }}>
        <Form form={form} layout="inline" style={{ rowGap: 12 }}>
          <Form.Item name="module">
            <Input allowClear placeholder="模块" style={{ width: 150 }} />
          </Form.Item>
          <Form.Item name="action">
            <Input allowClear placeholder="操作" style={{ width: 130 }} />
          </Form.Item>
          <Form.Item name="username">
            <Input allowClear placeholder="账号" style={{ width: 130 }} />
          </Form.Item>
          <Form.Item name="status">
            <Select
              allowClear
              placeholder="状态"
              style={{ width: 120 }}
              options={[
                { label: '成功', value: 'success' },
                { label: '失败', value: 'failed' },
              ]}
            />
          </Form.Item>
          <Form.Item name="keyword">
            <Input allowClear placeholder="说明/IP/对象" style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="created_range">
            <RangePicker />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchData(1, pageSize)}>查询</Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  form.resetFields();
                  fetchData(1, pageSize);
                }}
              >
                重置
              </Button>
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
          scroll={{ x: 1420 }}
          pagination={{
            current,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: t => `共 ${t} 条`,
            onChange: fetchData,
          }}
        />
      </Card>

      <Modal
        title="操作详情"
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        width={760}
      >
        <pre style={{ maxHeight: 520, overflow: 'auto', padding: 12, margin: 0, background: '#f6f8fa', borderRadius: 6 }}>
          {detail ? JSON.stringify(detail, null, 2) : ''}
        </pre>
      </Modal>
    </div>
  );
};

export default OperationLog;
