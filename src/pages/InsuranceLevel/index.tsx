import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Popconfirm, Space, Tag, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { request, useAccess } from '@umijs/max';

interface InsuranceLevel {
  id: number;
  level_name: string;
  level_code: string;
  base_amount: number;
  max_amount: number;
  description?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

const InsuranceLevel: React.FC = () => {
  const access = useAccess();
  const [data, setData] = useState<InsuranceLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<InsuranceLevel | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await request('/api/insurance-levels', {
        method: 'GET',
      });
      if (response.code === 0) {
        setData(response.data || []);
      }
    } catch (error) {
      console.error('获取参保档次列表失败:', error);
      message.error('获取参保档次列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingItem) {
        await request(`/api/insurance-levels/${editingItem.id}`, {
          method: 'PUT',
          data: values,
        });
        message.success('更新成功');
      } else {
        await request('/api/insurance-levels', {
          method: 'POST',
          data: values,
        });
        message.success('创建成功');
      }
      setModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await request(`/api/insurance-levels/${id}`, {
        method: 'DELETE',
      });
      message.success('删除成功');
      fetchData();
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  const openModal = (item?: InsuranceLevel) => {
    setEditingItem(item || null);
    if (item) {
      form.setFieldsValue(item);
    } else {
      form.resetFields();
      form.setFieldsValue({
        status: 'active',
        base_amount: 0,
        max_amount: 0,
      });
    }
    setModalVisible(true);
  };

  const columns = [
    {
      title: '档次名称',
      dataIndex: 'level_name',
      key: 'level_name',
      render: (text: string) => (
        <span style={{ fontWeight: 'bold', color: '#262626' }}>{text}</span>
      ),
    },
    {
      title: '档次代码',
      dataIndex: 'level_code',
      key: 'level_code',
      render: (text: string) => (
        <Tag color="blue">{text}</Tag>
      ),
    },
    {
      title: '基数金额',
      dataIndex: 'base_amount',
      key: 'base_amount',
      render: (value: number) => (
        <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
          ¥{value.toLocaleString()}
        </span>
      ),
    },
    {
      title: '最高金额',
      dataIndex: 'max_amount',
      key: 'max_amount',
      render: (value: number) => (
        <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>
          ¥{value.toLocaleString()}
        </span>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => (
        <span style={{ color: text ? '#666' : '#999' }}>
          {text || '-'}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => (
        <span style={{ fontSize: '12px', color: '#666' }}>
          {new Date(text).toLocaleString()}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: InsuranceLevel) => (
        <Space size="middle">
          {access.canUpdateInsuranceLevel && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(record)}>
              编辑
            </Button>
          )}
          {access.canDeleteInsuranceLevel && (
            <Popconfirm title="确定要删除这个参保档次吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>参保档次配置</h2>
          {access.canCreateInsuranceLevel && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
              创建参保档次
            </Button>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          locale={{
            emptyText: '暂无数据',
          }}
        />
      </Card>

      <Modal
        title={editingItem ? '编辑参保档次' : '创建参保档次'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="level_name"
            label="档次名称"
            rules={[{ required: true, message: '请输入档次名称' }]}
          >
            <Input placeholder="请输入档次名称" />
          </Form.Item>

          <Form.Item
            name="level_code"
            label="档次代码"
            rules={[{ required: true, message: '请输入档次代码' }]}
          >
            <Input placeholder="请输入档次代码" />
          </Form.Item>

          <Form.Item
            name="base_amount"
            label="基数金额"
            rules={[{ required: true, message: '请输入基数金额' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入基数金额"
              min={0}
              precision={2}
            />
          </Form.Item>

          <Form.Item
            name="max_amount"
            label="最高金额"
            rules={[{ required: true, message: '请输入最高金额' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入最高金额"
              min={0}
              precision={2}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea placeholder="请输入描述" rows={3} />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Input.Group compact>
              <Button
                type="default"
                style={{ width: '50%' }}
                onClick={() => form.setFieldsValue({ status: 'active' })}
                className={form.getFieldValue('status') === 'active' ? 'ant-btn-primary' : ''}
              >
                启用
              </Button>
              <Button
                type="default"
                style={{ width: '50%' }}
                onClick={() => form.setFieldsValue({ status: 'inactive' })}
                className={form.getFieldValue('status') === 'inactive' ? 'ant-btn-primary' : ''}
              >
                禁用
              </Button>
            </Input.Group>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingItem ? '更新' : '创建'}
              </Button>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InsuranceLevel; 