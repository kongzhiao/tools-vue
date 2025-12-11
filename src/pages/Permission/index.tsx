import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, message, Popconfirm, Space, Tree, Select, Tag, Card, Row, Col, Tabs, Switch,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined, FileOutlined } from '@ant-design/icons';
import { Access, request, useAccess } from '@umijs/max';

const { Option } = Select;
const { TabPane } = Tabs;

// 自定义样式
const tableStyles = `
  .parent-row {
    background-color: #fafafa;
    font-weight: 500;
  }
  .parent-row:hover {
    background-color: #f0f0f0 !important;
  }
  .child-row {
    background-color: #fefefe;
  }
  .child-row:hover {
    background-color: #f5f5f5 !important;
  }
  .grandchild-row {
    background-color: #ffffff;
  }
  .grandchild-row:hover {
    background-color: #fafafa !important;
  }
  .ant-table-tbody > tr > td {
    border-bottom: 1px solid #f0f0f0;
    vertical-align: middle;
  }
  .ant-table-tbody > tr:hover > td {
    background-color: transparent !important;
  }
  .ant-table-expand-icon-col {
    width: 24px;
    min-width: 24px;
  }
`;

interface Permission {
  id: number;
  name: string;
  description: string;
  type: 'menu' | 'operation';
  parent_id: number;
  path?: string;
  component?: string;
  icon?: string;
  sort: number;
  children?: Permission[];
}

const Permission: React.FC = () => {
  const access = useAccess();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('tree');

  const fetchPermissions = async () => {
    try {
      const response = await request('/api/permissions', {
        method: 'GET',
      });
      if (response.code === 0) {
        setPermissions(response.data);
      }
    } catch (error) {
      console.error('获取权限列表失败:', error);
      message.error('获取权限列表失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingPermission) {
        await request(`/api/permissions/${editingPermission.id}`, {
          method: 'PUT',
          data: values,
        });
        message.success('更新成功');
      } else {
        await request('/api/permissions', {
          method: 'POST',
          data: values,
        });
        message.success('创建成功');
      }
      setModalVisible(false);
      form.resetFields();
      fetchPermissions();
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await request(`/api/permissions/${id}`, {
        method: 'DELETE',
      });
      message.success('删除成功');
      fetchPermissions();
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  const openModal = (permission?: Permission) => {
    setEditingPermission(permission || null);
    if (permission) {
      form.setFieldsValue(permission);
    } else {
      form.resetFields();
      // 设置默认值
      form.setFieldsValue({
        type: 'operation',
        parent_id: 0,
        sort: 0,
      });
    }
    setModalVisible(true);
  };

  const renderPermissionTree = (data: Permission[]): any[] => {
    return data.map((item) => ({
      key: item.id,
      title: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Space>
            {item.type === 'menu' ? <FolderOutlined style={{ color: '#1890ff' }} /> : <FileOutlined style={{ color: '#52c41a' }} />}
            <span>{item.name}</span>
            <Tag color={item.type === 'menu' ? 'blue' : 'green'}>{item.type === 'menu' ? '菜单' : '操作'}</Tag>
            {item.path && <Tag color="orange">{item.path}</Tag>}
            {item.description && <span style={{ color: '#666', fontSize: '12px' }}>({item.description})</span>}
          </Space>
          <Space>
            {access.canUpdatePermission && (
              <Button type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openModal(item); }}>编辑</Button>
            )}
            {access.canDeletePermission && (
              <Popconfirm title="确定要删除这个权限吗？" onConfirm={() => handleDelete(item.id)} okText="确定" cancelText="取消">
                <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()}>删除</Button>
              </Popconfirm>
            )}
          </Space>
        </div>
      ),
      children: item.children ? renderPermissionTree(item.children) : undefined,
    }));
  };

  // 获取所有权限选项（用于父权限选择）
  const getAllPermissions = (permissions: Permission[]): Permission[] => {
    let all: Permission[] = [];
    permissions.forEach(permission => {
      all.push(permission);
      if (permission.children) {
        all = all.concat(getAllPermissions(permission.children));
      }
    });
    return all;
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 300,
      render: (text: string, record: Permission) => (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden'
        }}>
          {record.type === 'menu' ? (
            <FolderOutlined style={{ color: '#1890ff', fontSize: '16px', marginRight: 8 }} />
          ) : (
            <FileOutlined style={{ color: '#52c41a', fontSize: '14px', marginRight: 8 }} />
          )}
          <span style={{ 
            fontWeight: record.parent_id === 0 ? '600' : 'normal',
            color: record.parent_id === 0 ? '#262626' : '#595959',
            fontSize: '14px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {text}
          </span>
        </div>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      render: (description: string) => (
        <span style={{ color: '#8c8c8c', fontSize: '13px' }}>
          {description || '-'}
        </span>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'menu' ? 'blue' : 'green'} style={{ margin: 0 }}>
          {type === 'menu' ? '菜单' : '操作'}
        </Tag>
      ),
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      width: 150,
      render: (path: string) => (
        <span style={{ 
          color: path ? '#1890ff' : '#8c8c8c',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          {path || '-'}
        </span>
      ),
    },
    {
      title: '组件',
      dataIndex: 'component',
      key: 'component',
      width: 150,
      render: (component: string) => (
        <span style={{ 
          color: component ? '#1890ff' : '#8c8c8c',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          {component || '-'}
        </span>
      ),
    },
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
      width: 120,
      render: (icon: string) => (
        <span style={{ 
          color: icon ? '#722ed1' : '#8c8c8c',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          {icon || '-'}
        </span>
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 80,
      render: (sort: number) => (
        <span style={{ 
          color: '#8c8c8c',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          {sort}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: Permission) => (
        <Space size="middle">
          {access.canUpdatePermission && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(record)}>
              编辑
            </Button>
          )}
          {access.canDeletePermission && (
            <Popconfirm title="确定要删除这个权限吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
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
    fetchPermissions();
  }, []);

  return (
    <div>
      <style>{tableStyles}</style>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col><h2>权限管理</h2></Col>
          <Col>
            {access.canCreatePermission && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
                创建权限
              </Button>
            )}
          </Col>
        </Row>

        {access.canReadPermission && (
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="树形视图" key="tree">
            <Tree showLine defaultExpandAll treeData={renderPermissionTree(permissions)} />
          </TabPane>
          <TabPane tab="列表视图" key="list">
            <Table
              columns={columns}
              dataSource={permissions}
              rowKey="id"
              scroll={{ x: 1200 }}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
              locale={{
                emptyText: '暂无数据',
              }}
              size="middle"
              bordered={false}
              style={{
                backgroundColor: '#fff',
                borderRadius: '8px',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)'
              }}
              rowClassName={(record: Permission) => {
                if (record.parent_id === 0) {
                  return 'parent-row';
                }
                return 'child-row';
              }}
              expandable={{
                defaultExpandAllRows: true,
                expandRowByClick: false,
                // 使用默认的展开图标，不自定义
              }}
            />
          </TabPane>
        </Tabs>
        )}

      </Card>

      <Modal
        title={editingPermission ? '编辑权限' : '创建权限'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="权限名称"
                rules={[{ required: true, message: '请输入权限名称' }]}
              >
                <Input placeholder="请输入权限名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="权限类型"
                rules={[{ required: true, message: '请选择权限类型' }]}
              >
                <Select placeholder="请选择权限类型">
                  <Option value="menu">菜单</Option>
                  <Option value="operation">操作</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="权限描述"
          >
            <Input.TextArea placeholder="请输入权限描述" rows={2} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="parent_id"
                label="父权限"
              >
                <Select placeholder="请选择父权限" allowClear>
                  <Option value={0}>顶级权限</Option>
                  {getAllPermissions(permissions).map(permission => (
                    <Option key={permission.id} value={permission.id}>
                      {permission.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="sort"
                label="排序"
              >
                <Input type="number" placeholder="请输入排序" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="path"
                label="路径"
              >
                <Input placeholder="请输入路径" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="component"
                label="组件"
              >
                <Input placeholder="请输入组件路径" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="icon"
            label="图标"
          >
            <Input placeholder="请输入图标名称" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingPermission ? '更新' : '创建'}
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

export default Permission; 