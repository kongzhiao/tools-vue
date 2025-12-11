import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Space,
  Select,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { request, useAccess } from '@umijs/max';

const { Option } = Select;

interface User {
  id: number;
  username: string;
  nickname: string;
  created_at: string;
  updated_at: string;
  roles: Array<{ id: number; name: string; description: string; }>;
}

interface Role {
  id: number;
  name: string;
  description: string;
}

const User: React.FC = () => {
  const access = useAccess();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [roleForm] = Form.useForm();

  // 获取用户列表
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await request('/api/users', {
        method: 'GET',
      });
      if (response.code === 0) {
        // 后端返回的数据结构是 {data: {list: [...], total: 2, page: 1, limit: 10}}
        const userList = response.data?.list || [];
        // 确保每个用户对象都有正确的结构
        const processedUsers = userList.map((user: any) => ({
          ...user,
          roles: Array.isArray(user.roles) ? user.roles : [],
        }));
        setUsers(processedUsers);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
      message.error('获取用户列表失败');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // 获取角色列表
  const fetchRoles = async () => {
    try {
      const response = await request('/api/users/roles', {
        method: 'GET',
      });
      if (response.code === 0) {
        setRoles(response.data || []);
      }
    } catch (error) {
      console.error('获取角色列表失败:', error);
      message.error('获取角色列表失败');
      setRoles([]);
    }
  };

  // 处理用户提交
  const handleSubmit = async (values: any) => {
    try {
      // 如果是编辑用户且密码为空，则移除密码字段
      if (editingUser && (!values.password || values.password.trim() === '')) {
        delete values.password;
      }
      
      if (editingUser) {
        await request(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          data: values,
        });
        message.success('更新成功');
      } else {
        await request('/api/users', {
          method: 'POST',
          data: values,
        });
        message.success('创建成功');
      }
      setModalVisible(false);
      setEditingUser(null);
      form.resetFields();
      fetchUsers();
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 处理删除
  const handleDelete = async (id: number) => {
    try {
      await request(`/api/users/${id}`, {
        method: 'DELETE',
      });
      message.success('删除成功');
      fetchUsers();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 处理角色分配
  const handleAssignRoles = async (values: any) => {
    if (!selectedUser) return;
    
    try {
      await request(`/api/users/${selectedUser.id}/roles`, {
        method: 'POST',
        data: values,
      });
      message.success('角色分配成功');
      setRoleModalVisible(false);
      setSelectedUser(null);
      roleForm.resetFields();
      fetchUsers();
    } catch (error) {
      message.error('角色分配失败');
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
    },
    {
      title: '角色',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles: User['roles']) => {
        if (!roles || !Array.isArray(roles) || roles.length === 0) {
          return <span style={{ color: '#999' }}>无角色</span>;
        }
        return (
          <div>
            {roles.map(role => (
              <Tag key={role.id} color="blue">{role.name}</Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: User) => (
        <Space size="middle">
          {access.canUpdateUser && (
            <Button 
              type="link" 
              icon={<EditOutlined />} 
              onClick={() => {
                setEditingUser(record);
                // 编辑时不设置密码字段，保持为空
                const { password, ...userData } = record as any;
                form.setFieldsValue(userData);
                setModalVisible(true);
              }}
            >
              编辑
            </Button>
          )}
          {access.canUpdateUser && (
            <Button 
              type="link" 
              icon={<SettingOutlined />} 
              onClick={() => {
                setSelectedUser(record);
                const roleIds = record.roles && Array.isArray(record.roles) 
                  ? record.roles.map(role => role.id) 
                  : [];
                roleForm.setFieldsValue({ role_ids: roleIds });
                setRoleModalVisible(true);
              }}
            >
              分配角色
            </Button>
          )}
          {access.canDeleteUser && (
            <Popconfirm
              title="确定要删除这个用户吗？"
              onConfirm={() => handleDelete(record.id)}
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
    <div>
      <div style={{ marginBottom: 16 }}>
        {access.canCreateUser && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingUser(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            创建用户
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={users}
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

      {/* 用户创建/编辑模态框 */}
      <Modal
        title={editingUser ? '编辑用户' : '创建用户'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingUser(null);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            name="nickname"
            label="昵称"
            rules={[{ required: true, message: '请输入昵称' }]}
          >
            <Input placeholder="请输入昵称" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[
              ...(editingUser ? [] : [{ required: true, message: '请输入密码' }])
            ]}
            extra={editingUser ? "不设置密码则保持不变" : undefined}
          >
            <Input.Password 
              placeholder={editingUser ? "不设置密码则保持不变" : "请输入密码"} 
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingUser ? '更新' : '创建'}
              </Button>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  setEditingUser(null);
                  form.resetFields();
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 角色分配模态框 */}
      <Modal
        title={`为 ${selectedUser?.nickname || selectedUser?.username} 分配角色`}
        open={roleModalVisible}
        onCancel={() => {
          setRoleModalVisible(false);
          setSelectedUser(null);
          roleForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form form={roleForm} onFinish={handleAssignRoles} layout="vertical">
          <Form.Item name="role_ids" label="选择角色">
            <Select
              mode="multiple"
              placeholder="请选择角色"
              options={roles.map(role => ({
                label: role.name,
                value: role.id,
                description: role.description
              }))}
              optionLabelProp="label"
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
              <Button
                onClick={() => {
                  setRoleModalVisible(false);
                  setSelectedUser(null);
                  roleForm.resetFields();
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default User; 