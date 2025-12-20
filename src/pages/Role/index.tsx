import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, message, Popconfirm, Space, Tree, Select, Tag, Card, Row, Col,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import { request, useAccess } from '@umijs/max';

const { Option } = Select;

interface Role {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  permissions?: Permission[];
}

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

const Role: React.FC = () => {
  const access = useAccess();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [form] = Form.useForm();
  const [permissionForm] = Form.useForm();
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);

  const fetchRoles = async () => {
    try {
      const response = await request('/api/roles', {
        method: 'GET',
      });
      if (response.code === 0) {
        setRoles(response.data);
      }
    } catch (error) {
      console.error('获取角色列表失败:', error);
      message.error('获取角色列表失败');
    }
  };

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
      if (editingRole) {
        await request(`/api/roles/${editingRole.id}`, {
          method: 'PUT',
          data: values,
        });
        message.success('更新成功');
      } else {
        await request('/api/roles', {
          method: 'POST',
          data: values,
        });
        message.success('创建成功');
      }
      setModalVisible(false);
      form.resetFields();
      fetchRoles();
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await request(`/api/roles/${id}`, {
        method: 'DELETE',
      });
      message.success('删除成功');
      fetchRoles();
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  const openPermissionModal = async (role: Role) => {
    setSelectedRole(role);
    try {
      const response = await request(`/api/roles/${role.id}/permissions`, {
        method: 'GET',
      });
      if (response.code === 0) {
        const rolePermissionsTree = response.data;
        console.log('角色权限树形数据:', rolePermissionsTree); // 调试信息

        // 从树形结构中提取已分配的权限ID
        const extractPermissionIds = (permissions: any[]): number[] => {
          const ids: number[] = [];
          permissions.forEach(permission => {
            if (permission.has_permission) {
              ids.push(permission.id);
            }
            if (permission.children && permission.children.length > 0) {
              ids.push(...extractPermissionIds(permission.children));
            }
          });
          return ids;
        };

        const permissionIds = extractPermissionIds(rolePermissionsTree);
        console.log('权限ID数组:', permissionIds); // 调试信息
        setCheckedKeys(permissionIds);
        permissionForm.setFieldsValue({ permission_ids: permissionIds });
      }
    } catch (error) {
      console.error('获取角色权限失败:', error);
      message.error('获取角色权限失败');
    }
    setPermissionModalVisible(true);
  };

  const handleAssignPermissions = async (values: any) => {
    if (!selectedRole) return;

    console.log('提交的权限数据:', values); // 调试信息

    try {
      await request(`/api/roles/${selectedRole.id}/permissions`, {
        method: 'POST',
        data: values,
      });
      message.success('权限分配成功');
      setPermissionModalVisible(false);
      permissionForm.resetFields();

      // 强制刷新角色列表数据
      await fetchRoles();

      // 更新选中的角色数据 - 使用权限分配API获取最新数据
      if (selectedRole) {
        const response = await request(`/api/roles/${selectedRole.id}/permissions`, {
          method: 'GET',
        });
        if (response.code === 0) {
          // 提取已分配的权限ID
          const extractPermissionIds = (permissions: any[]): number[] => {
            const ids: number[] = [];
            permissions.forEach(permission => {
              if (permission.has_permission) {
                ids.push(permission.id);
              }
              if (permission.children && permission.children.length > 0) {
                ids.push(...extractPermissionIds(permission.children));
              }
            });
            return ids;
          };

          const permissionIds = extractPermissionIds(response.data);

          // 构建权限显示数据
          const buildDisplayPermissions = (permissions: any[]): any[] => {
            const displayPermissions: any[] = [];
            permissions.forEach(permission => {
              if (permission.has_permission) {
                const displayPermission = {
                  id: permission.id,
                  name: permission.name,
                  type: permission.type,
                  description: permission.description,
                  children: permission.children ? buildDisplayPermissions(permission.children) : []
                };
                displayPermissions.push(displayPermission);
              }
            });
            return displayPermissions;
          };

          const displayPermissions = buildDisplayPermissions(response.data);

          // 更新角色列表中的对应角色
          setRoles(prevRoles =>
            prevRoles.map(role =>
              role.id === selectedRole.id
                ? { ...role, permissions: displayPermissions }
                : role
            )
          );
        }
      }
    } catch (error) {
      console.error('权限分配失败:', error);
      message.error('权限分配失败');
    }
  };

  const openModal = (role?: Role) => {
    setEditingRole(role || null);
    if (role) {
      form.setFieldsValue(role);
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  // 构建权限树形数据
  const buildPermissionTree = (permissions: Permission[]): any[] => {
    const buildNode = (permission: Permission): any => {
      return {
        key: permission.id,
        title: (
          <Space>
            <span>{permission.name}</span>
            <Tag color={permission.type === 'menu' ? 'blue' : 'green'}>
              {permission.type === 'menu' ? '菜单' : '操作'}
            </Tag>
            {permission.description && (
              <span style={{ color: '#666', fontSize: '12px' }}>({permission.description})</span>
            )}
          </Space>
        ),
        children: permission.children ? permission.children.map(buildNode) : undefined,
      };
    };

    return permissions.map(buildNode);
  };

  // 构建权限显示树形结构（用于列表中显示）
  const buildPermissionDisplayTree = (permissions: Permission[]): any[] => {
    const buildDisplayNode = (permission: Permission): any => {
      return {
        key: permission.id,
        title: (
          <Space>
            <span>{permission.name}</span>
            <Tag color={permission.type === 'menu' ? 'blue' : 'green'}>
              {permission.type === 'menu' ? '菜单' : '操作'}
            </Tag>
          </Space>
        ),
        children: permission.children ? permission.children.map(buildDisplayNode) : undefined,
      };
    };

    return permissions.map(buildDisplayNode);
  };

  const columns = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '权限',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: Permission[]) => {
        if (!permissions || permissions.length === 0) {
          return <span style={{ color: '#999' }}>无权限</span>;
        }

        // 如果权限数据有children字段，使用树形显示
        if (permissions.some(p => p.children)) {
          return (
            <div style={{ maxHeight: '200px', overflow: 'auto' }}>
              <Tree
                treeData={buildPermissionDisplayTree(permissions)}
                defaultExpandAll={false}
                showLine={true}
                style={{ fontSize: '12px' }}
              />
            </div>
          );
        }

        // 否则使用标签显示
        return (
          <div style={{ maxHeight: '200px', overflow: 'auto' }}>
            {permissions.map(permission => (
              <Tag key={permission.id} color={permission.type === 'menu' ? 'blue' : 'green'} style={{ marginBottom: '4px' }}>
                {permission.name}
              </Tag>
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
      width: 250,
      render: (_: any, record: Role) => (
        <Space size="middle">
          {access.canUpdateRole && (
            <Button type="link" icon={<EditOutlined />} onClick={() => openModal(record)}>
              编辑
            </Button>
          )}
          {access.canAssignRole && (
            <Button
              type="link"
              icon={<SettingOutlined />}
              onClick={() => openPermissionModal(record)}
            >
              分配权限
            </Button>
          )}
          {access.canDeleteRole && (
            <Popconfirm title="确定要删除这个角色吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
              <Button type="link" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  return (
    <div>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col><h2>角色管理</h2></Col>
          <Col>
            {access.canCreateRole && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
                创建角色
              </Button>
            )}
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={roles}
          rowKey="id"
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

      {/* 角色创建/编辑模态框 */}
      <Modal
        title={editingRole ? '编辑角色' : '创建角色'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="name"
            label="角色名称"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="请输入角色名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="角色描述"
          >
            <Input.TextArea placeholder="请输入角色描述" rows={3} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingRole ? '更新' : '创建'}
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

      {/* 权限分配模态框 */}
      <Modal
        title={`为 ${selectedRole?.name} 分配权限`}
        open={permissionModalVisible}
        onCancel={() => {
          setPermissionModalVisible(false);
          permissionForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={permissionForm} onFinish={handleAssignPermissions} layout="vertical">
          <Form.Item
            name="permission_ids"
            label="选择权限"
            rules={[{ required: true, message: '请选择权限' }]}
          >
            <Tree
              checkable
              treeData={buildPermissionTree(permissions)}
              defaultExpandAll
              checkStrictly={false}
              checkedKeys={checkedKeys}
              onCheck={(checkedKeys, info) => {
                console.log('Tree选中状态变化:', checkedKeys); // 调试信息
                const keys = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked;
                setCheckedKeys(keys);
                permissionForm.setFieldsValue({ permission_ids: keys });
              }}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
              <Button onClick={() => {
                const currentValues = permissionForm.getFieldsValue();
                console.log('当前表单值:', currentValues); // 调试信息
                alert(`当前表单值: ${JSON.stringify(currentValues)}`);
              }}>
                调试
              </Button>
              <Button onClick={() => {
                setPermissionModalVisible(false);
                permissionForm.resetFields();
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

export default Role; 