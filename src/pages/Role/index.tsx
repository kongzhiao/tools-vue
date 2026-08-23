import React, { useState, useEffect, useMemo } from 'react';
import {
  Table, Button, Modal, Form, Input, message, Popconfirm, Space, Tree, Select, Tag, Card, Row, Col,
  Switch,
  Tooltip,
  Typography,
  Upload,
  Spin,
  Popover,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined, CopyOutlined, SearchOutlined, FolderOpenOutlined, FolderOutlined, CheckSquareOutlined, ClearOutlined } from '@ant-design/icons';
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
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);

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
        const response = await request(`/api/roles/${editingRole.id}`, {
          method: 'PUT',
          data: values,
        });
        if (response.code !== 0) {
          message.error(response.msg || '更新失败');
          return;
        }
        message.success('更新成功');
      } else {
        const response = await request('/api/roles', {
          method: 'POST',
          data: values,
        });
        if (response.code !== 0) {
          message.error(response.msg || '创建失败');
          return;
        }
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
      const response = await request(`/api/roles/${id}`, {
        method: 'DELETE',
      });
      if (response.code !== 0) {
        message.error(response.msg || '删除失败');
        return;
      }
      message.success('删除成功');
      fetchRoles();
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  const openPermissionModal = async (role: Role) => {
    setSelectedRole(role);
    setPermissionModalVisible(true);
    setPermissionLoading(true);
    setPermissionSearch('');
    setExpandedKeys(getAllPermissionKeys(permissions));
    setAutoExpandParent(true);

    try {
      const response = await request(`/api/roles/${role.id}/permissions`, {
        method: 'GET',
      });
      if (response.code === 0) {
        const rolePermissionsTree = response.data;

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
        setCheckedKeys(permissionIds);
        permissionForm.setFieldsValue({ permission_ids: permissionIds });
      }
    } catch (error) {
      console.error('获取角色权限失败:', error);
      message.error('获取角色权限失败');
    } finally {
      setPermissionLoading(false);
    }
  };

  const handleAssignPermissions = async (values: any) => {
    if (!selectedRole) return;

    try {
      await request(`/api/roles/${selectedRole.id}/permissions`, {
        method: 'POST',
        data: values,
      });
      message.success('权限分配成功');
      setPermissionModalVisible(false);
      permissionForm.resetFields();
      setPermissionSearch('');
      setExpandedKeys([]);

      await fetchRoles();
    } catch (error) {
      console.error('权限分配失败:', error);
      message.error('权限分配失败');
    }
  };

  const flattenPermissions = (items: Permission[]): Permission[] => {
    return items.reduce<Permission[]>((result, item) => {
      result.push(item);
      if (item.children?.length) {
        result.push(...flattenPermissions(item.children));
      }
      return result;
    }, []);
  };

  const getAllPermissionKeys = (items: Permission[]): React.Key[] => {
    return flattenPermissions(items).map(item => item.id);
  };

  const countPermissionTypes = (items: Permission[]) => {
    return flattenPermissions(items).reduce(
      (result, item) => {
        result.total += 1;
        if (item.type === 'menu') {
          result.menu += 1;
        } else {
          result.operation += 1;
        }
        return result;
      },
      { total: 0, menu: 0, operation: 0 },
    );
  };

  const countFlatPermissionTypes = (items: Permission[]) => {
    return items.reduce(
      (result, item) => {
        result.total += 1;
        if (item.type === 'menu') {
          result.menu += 1;
        } else {
          result.operation += 1;
        }
        return result;
      },
      { total: 0, menu: 0, operation: 0 },
    );
  };

  const filterPermissions = (items: Permission[], keyword: string): Permission[] => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return items;

    return items.reduce<Permission[]>((result, item) => {
      const children = item.children ? filterPermissions(item.children, keyword) : [];
      const text = [item.name, item.description, item.path].filter(Boolean).join(' ').toLowerCase();
      if (text.includes(normalizedKeyword) || children.length > 0) {
        result.push({ ...item, children });
      }
      return result;
    }, []);
  };

  const getSearchExpandedKeys = (items: Permission[], keyword: string): React.Key[] => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return getAllPermissionKeys(items);

    const keys = new Set<React.Key>();
    const walk = (nodes: Permission[], ancestors: React.Key[] = []) => {
      nodes.forEach(node => {
        const text = [node.name, node.description, node.path].filter(Boolean).join(' ').toLowerCase();
        const matched = text.includes(normalizedKeyword);
        if (matched) {
          ancestors.forEach(key => keys.add(key));
          keys.add(node.id);
        }
        if (node.children?.length) {
          walk(node.children, [...ancestors, node.id]);
        }
      });
    };
    walk(items);
    return Array.from(keys);
  };

  const permissionStats = useMemo(() => countPermissionTypes(permissions), [permissions]);
  const selectedPermissionStats = useMemo(() => {
    const selectedKeySet = new Set(checkedKeys);
    return flattenPermissions(permissions).reduce(
      (result, item) => {
        if (!selectedKeySet.has(item.id)) return result;
        result.total += 1;
        if (item.type === 'menu') {
          result.menu += 1;
        } else {
          result.operation += 1;
        }
        return result;
      },
      { total: 0, menu: 0, operation: 0 },
    );
  }, [checkedKeys, permissions]);

  const visiblePermissions = useMemo(
    () => filterPermissions(permissions, permissionSearch),
    [permissions, permissionSearch],
  );

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
      const isMenu = permission.type === 'menu';
      return {
        key: permission.id,
        title: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0, padding: '2px 0' }}>
            <Tag color={isMenu ? 'blue' : 'green'} style={{ flex: '0 0 auto', marginInlineEnd: 0 }}>
              {isMenu ? '菜单' : '操作'}
            </Tag>
            <Typography.Text strong={isMenu} style={{ flex: '0 0 auto' }}>
              {permission.name}
            </Typography.Text>
            {permission.description ? (
              <Typography.Text type="secondary" ellipsis style={{ minWidth: 0, flex: 1, fontSize: 12 }}>
                {permission.description}
              </Typography.Text>
            ) : (
              <span style={{ flex: 1 }} />
            )}
            {permission.path && (
              <Typography.Text code ellipsis style={{ maxWidth: 180, fontSize: 12 }}>
                {permission.path}
              </Typography.Text>
            )}
          </div>
        ),
        children: permission.children ? permission.children.map(buildNode) : undefined,
      };
    };

    return permissions.map(buildNode);
  };

const copyToClipboard = async (text: string) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    message.success('已复制');
  } catch (error) {
    message.error('复制失败');
  }
};

const EllipsisText: React.FC<{ value?: any; maxWidth?: number | string }> = ({ value, maxWidth = '100%' }) => {
  const text = value === null || value === undefined || value === '' ? '' : String(value);
  if (!text) return <>-</>;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth, width: '100%', minWidth: 0, verticalAlign: 'middle' }}>
      {/* <Tooltip title="复制">
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
      </Tooltip> */}
      <Typography.Text
        ellipsis={{ tooltip: text }}
        style={{ display: 'inline-block', flex: 1, minWidth: 0, maxWidth: '100%', margin: 0 }}
      >
        {text}
      </Typography.Text>
    </span>
  );
};

  // 构建权限摘要和悬浮完整列表（用于列表中显示）
  const renderPermissionTag = (permission: Permission, maxWidth = 150) => {
    const color = permission.type === 'menu' ? 'blue' : 'green';
    const tooltip = [permission.name, permission.description].filter(Boolean).join('：');

    return (
      <Tooltip key={permission.id} title={tooltip}>
        <Tag
          color={color}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            maxWidth,
            height: 22,
            margin: '0 4px 4px 0',
            lineHeight: '20px',
            verticalAlign: 'top',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              maxWidth: maxWidth - 18,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {permission.name}
          </span>
        </Tag>
      </Tooltip>
    );
  };

  const renderPermissionPopoverContent = (items: Permission[]) => {
    const stats = countFlatPermissionTypes(items);
    const menuItems = items.filter(item => item.type === 'menu');
    const operationItems = items.filter(item => item.type === 'operation');

    return (
      <div style={{ width: 560, maxWidth: '70vw' }}>
        <Space size={8} wrap style={{ marginBottom: 10 }}>
          <Tag color="processing">共 {stats.total}</Tag>
          <Tag color="blue">菜单 {stats.menu}</Tag>
          <Tag color="green">操作 {stats.operation}</Tag>
        </Space>
        <div style={{ maxHeight: 340, overflow: 'auto', paddingRight: 4 }}>
          {menuItems.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>
                菜单权限
              </Typography.Text>
              <div>{menuItems.map(item => renderPermissionTag(item, 180))}</div>
            </div>
          )}
          {operationItems.length > 0 && (
            <div>
              <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>
                操作权限
              </Typography.Text>
              <div>{operationItems.map(item => renderPermissionTag(item, 210))}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPermissionSummary = (items: Permission[]) => {
    const flattenedItems = flattenPermissions(items);
    if (flattenedItems.length === 0) {
      return <span style={{ color: '#999' }}>无权限</span>;
    }

    const visibleItems = flattenedItems.slice(0, 14);
    const hiddenCount = flattenedItems.length - visibleItems.length;
    const stats = countFlatPermissionTypes(flattenedItems);

    return (
      <Popover
        placement="topLeft"
        trigger="hover"
        title="完整权限"
        content={renderPermissionPopoverContent(flattenedItems)}
      >
        <div
          style={{
            height: 56,
            maxHeight: 56,
            overflow: 'hidden',
            cursor: 'default',
            padding: '2px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 0 }}>
            {visibleItems.map(item => renderPermissionTag(item, 150))}
            {hiddenCount > 0 && (
              <Tag color="default" style={{ height: 22, margin: '0 4px 4px 0', lineHeight: '20px' }}>
                +{hiddenCount}
              </Tag>
            )}
            <Tag color="processing" style={{ height: 22, margin: '0 4px 4px 0', lineHeight: '20px' }}>
              共{stats.total}
            </Tag>
          </div>
        </div>
      </Popover>
    );
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
      width: 100,
      render: (v: string) => <EllipsisText value={v} maxWidth={100} />
    },
    {
      title: '权限',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: Permission[]) => {
        if (!permissions?.length) {
          return (
            <div style={{ height: 56, display: 'flex', alignItems: 'center' }}>
              <span style={{ color: '#999' }}>无权限</span>
            </div>
          );
        }
        return renderPermissionSummary(permissions);
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
          {access.canDeleteRole && record.name !== '管理员' && (
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
            <Input
              placeholder="请输入角色名称"
              disabled={editingRole?.name === '管理员'}
            />
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
          setPermissionSearch('');
          setExpandedKeys([]);
        }}
        width={900}
        destroyOnClose
        bodyStyle={{ paddingTop: 12 }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setPermissionModalVisible(false);
              permissionForm.resetFields();
              setPermissionSearch('');
              setExpandedKeys([]);
            }}
          >
            取消
          </Button>,
          <Button key="submit" type="primary" loading={permissionLoading} onClick={() => permissionForm.submit()}>
            保存权限
          </Button>,
        ]}
      >
        <Form form={permissionForm} onFinish={handleAssignPermissions} layout="vertical">
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '12px 16px', marginBottom: 12, background: '#f8fafc' }}>
            <Row gutter={[16, 12]} align="middle">
              <Col flex="auto">
                <Space direction="vertical" size={2}>
                  <Typography.Text type="secondary">当前角色</Typography.Text>
                  <Typography.Title level={5} style={{ margin: 0 }}>
                    {selectedRole?.name || '-'}
                  </Typography.Title>
                  {selectedRole?.description && (
                    <Typography.Text type="secondary">{selectedRole.description}</Typography.Text>
                  )}
                </Space>
              </Col>
              <Col>
                <Space size={8} wrap>
                  <Tag color="processing">已选 {selectedPermissionStats.total}</Tag>
                  <Tag color="blue">菜单 {selectedPermissionStats.menu}/{permissionStats.menu}</Tag>
                  <Tag color="green">操作 {selectedPermissionStats.operation}/{permissionStats.operation}</Tag>
                </Space>
              </Col>
            </Row>
          </div>

          <Row gutter={[12, 12]} align="middle" style={{ marginBottom: 12 }}>
            <Col flex="auto">
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="搜索权限名称、说明或路径"
                value={permissionSearch}
                onChange={event => {
                  const value = event.target.value;
                  setPermissionSearch(value);
                  setExpandedKeys(getSearchExpandedKeys(permissions, value));
                  setAutoExpandParent(true);
                }}
              />
            </Col>
            <Col>
              <Space wrap>
                <Button
                  icon={<FolderOpenOutlined />}
                  onClick={() => {
                    setExpandedKeys(getAllPermissionKeys(permissions));
                    setAutoExpandParent(true);
                  }}
                >
                  展开
                </Button>
                <Button
                  icon={<FolderOutlined />}
                  onClick={() => {
                    setExpandedKeys([]);
                    setAutoExpandParent(false);
                  }}
                >
                  收起
                </Button>
                <Button
                  icon={<CheckSquareOutlined />}
                  onClick={() => {
                    const keys = getAllPermissionKeys(permissions);
                    setCheckedKeys(keys);
                    permissionForm.setFieldsValue({ permission_ids: keys });
                  }}
                >
                  全选
                </Button>
                <Button
                  icon={<ClearOutlined />}
                  onClick={() => {
                    setCheckedKeys([]);
                    permissionForm.setFieldsValue({ permission_ids: [] });
                  }}
                >
                  清空
                </Button>
              </Space>
            </Col>
          </Row>

          <Form.Item
            name="permission_ids"
            rules={[
              {
                validator: () => checkedKeys.length > 0
                  ? Promise.resolve()
                  : Promise.reject(new Error('请选择权限')),
              },
            ]}
            style={{ marginBottom: 0 }}
          >
            <Spin spinning={permissionLoading}>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, minHeight: 360, maxHeight: '58vh', overflow: 'auto', padding: 12, background: '#fff' }}>
                <Tree
                  checkable
                  showLine
                  treeData={buildPermissionTree(visiblePermissions)}
                  checkStrictly={false}
                  checkedKeys={checkedKeys}
                  expandedKeys={expandedKeys}
                  autoExpandParent={autoExpandParent}
                  onExpand={keys => {
                    setExpandedKeys(keys);
                    setAutoExpandParent(false);
                  }}
                  onCheck={(checkedKeys) => {
                    const keys = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked;
                    setCheckedKeys(keys);
                    permissionForm.setFieldsValue({ permission_ids: keys });
                  }}
                />
                {!permissionLoading && visiblePermissions.length === 0 && (
                  <div style={{ padding: '72px 0', textAlign: 'center', color: '#94a3b8' }}>
                    没有匹配的权限
                  </div>
                )}
              </div>
            </Spin>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Role; 
