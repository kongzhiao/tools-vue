import React, { useState, useEffect, useRef } from 'react';
import {
  Alert,
  Table,
  Button,
  Card,
  Dropdown,
  Modal,
  Form,
  Input,
  message,
  Space,
  Select,
  Switch,
  Tag,
  Tooltip,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { request, useAccess, useLocation } from '@umijs/max';

const cardStyle: React.CSSProperties = {
  borderRadius: 6,
  border: '1px solid #edf0f5',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
};

const filterToolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
};

interface User {
  id: number;
  username: string;
  nickname: string;
  status: 0 | 1;
  last_login_ip?: string | null;
  last_login_at?: string | null;
  town_id?: number;
  town?: { id: number; name: string };
  created_at: string;
  updated_at: string;
  roles: Array<{ id: number; name: string; description: string; }>;
  totp_required?: boolean;
  totp_effective_required?: boolean;
  totp_bound?: boolean;
  login_locked?: boolean;
  login_lock_remaining_seconds?: number;
}

interface Role {
  id: number;
  name: string;
  description: string;
}

const User: React.FC = () => {
  const access = useAccess();
  const location = useLocation();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [towns, setTowns] = useState<Array<{ id: number; name: string }>>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [resetTotpUser, setResetTotpUser] = useState<User | null>(null);
  const [resetTotpCode, setResetTotpCode] = useState('');
  const [resetTotpError, setResetTotpError] = useState('');
  const [resetTotpLoading, setResetTotpLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<any>({
    keyword: '',
    role_id: undefined,
    town_id: undefined,
  });
  const handledLocationSearchRef = useRef<string | null>(null);
  const [form] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [confirmationModal, confirmationContextHolder] = Modal.useModal();
  const editingAdministrator = Boolean(
    editingUser
    && (editingUser.id === 1 || editingUser.roles?.some(role => role.name === '管理员')),
  );

  // 获取用户列表
  const fetchUsers = async (page = current, limit = pageSize, customFilters = filters) => {
    setLoading(true);
    try {
      const response = await request('/api/users', {
        method: 'GET',
        params: {
          page,
          limit,
          ...customFilters,
        },
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
        setTotal(response.data?.total || 0);
        setCurrent(response.data?.page || page);
        setPageSize(response.data?.limit || limit);
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

  const fetchTowns = async () => {
    try {
      const response = await request('/api/towns/options', {
        method: 'GET',
      });
      if (response.code === 0) {
        setTowns(response.data || []);
      }
    } catch (error) {
      console.error('获取镇街列表失败:', error);
      setTowns([]);
    }
  };

  // 处理用户提交
  const handleSubmit = async (values: any) => {
    try {
      if (!access.canManageUserSecurity) {
        delete values.totp_required;
      }
      if (!editingUser || !access.canManageUserSecurity) {
        delete values.status;
      }
      // 如果是编辑用户且密码为空，则移除密码字段
      if (editingUser && (!values.password || values.password.trim() === '')) {
        delete values.password;
      }

      if (editingUser) {
        const response = await request(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          data: values,
        });
        if (response.code !== 0) {
          message.error(response.msg || '更新失败');
          return;
        }
        message.success('更新成功');
      } else {
        const response = await request('/api/users', {
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
      const response = await request(`/api/users/${id}`, {
        method: 'DELETE',
      });
      if (response.code !== 0) {
        message.error(response.msg || '删除失败');
        return;
      }
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
      const response = await request(`/api/users/${selectedUser.id}/roles`, {
        method: 'POST',
        data: values,
      });
      if (response.code !== 0) {
        message.error(response.msg || '角色分配失败');
        return;
      }
      message.success('角色分配成功');
      setRoleModalVisible(false);
      setSelectedUser(null);
      roleForm.resetFields();
      fetchUsers();
    } catch (error) {
      message.error('角色分配失败');
    }
  };

  const handleResetTotp = (record: User) => {
    setResetTotpUser(record);
    setResetTotpCode('');
    setResetTotpError('');
  };

  const closeResetTotp = () => {
    setResetTotpUser(null);
    setResetTotpCode('');
    setResetTotpError('');
  };

  const submitResetTotp = async () => {
    if (!resetTotpUser) return;
    setResetTotpLoading(true);
    setResetTotpError('');
    try {
      const response = await request(`/api/users/${resetTotpUser.id}/totp/reset`, {
        method: 'POST',
        data: { totp_code: resetTotpCode.trim() },
      });
      if (response.code !== 0) {
        setResetTotpError(response.msg || '重置失败');
        return;
      }
      message.success('2FA已重置');
      closeResetTotp();
      fetchUsers();
    } catch {
      setResetTotpError('重置失败，请稍后重试');
    } finally {
      setResetTotpLoading(false);
    }
  };

  const handleClearLoginLock = async (record: User) => {
    try {
      const response = await request(`/api/users/${record.id}/login-lock`, { method: 'DELETE' });
      if (response.code === 0) {
        message.success('登录锁定已解除');
        fetchUsers();
      } else {
        message.error(response.msg || '解除锁定失败');
      }
    } catch {
      message.error('解除锁定失败');
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchTowns();
  }, []);

  useEffect(() => {
    if (location.pathname !== '/user-management/accounts') return;
    if (handledLocationSearchRef.current === location.search) return;
    handledLocationSearchRef.current = location.search;

    const params = new URLSearchParams(window.location.search);
    const townId = params.get('town_id');
    const nextFilters = {
      keyword: '',
      role_id: undefined,
      town_id: undefined as number | undefined,
    };
    if (townId !== null) {
      nextFilters.town_id = townId === '0' ? 0 : Number(townId);
    }
    setFilters(nextFilters);
    fetchUsers(1, pageSize, nextFilters);
  }, [location.pathname, location.search]);

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
      title: '所属镇街',
      dataIndex: 'town',
      key: 'town',
      render: (_: any, record: User) => record.town?.name || '全局',
    },
    {
      title: '账号状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: User['status']) => status === 0
        ? <Tag color="error">禁用</Tag>
        : <Tag color="success">正常</Tag>,
    },
    {
      title: '双重验证',
      key: 'totp',
      width: 150,
      render: (_: any, record: User) => (
        <Space size={4} wrap>
          <Tag color={record.totp_effective_required ? 'blue' : 'default'}>
            {record.totp_effective_required ? '强制' : '可选'}
          </Tag>
          <Tag color={record.totp_bound ? 'success' : 'warning'}>
            {record.totp_bound ? '已绑定' : '未绑定'}
          </Tag>
        </Space>
      ),
    },
    {
      title: (
        <Tooltip title="同一账号15分钟内密码错误累计5次会临时锁定，锁定时长按10、30、60分钟递增。到期自动解除，管理员也可提前解除。">
          <span>登录锁定 <InfoCircleOutlined style={{ color: '#8c8c8c' }} /></span>
        </Tooltip>
      ),
      key: 'login_status',
      width: 110,
      render: (_: any, record: User) => record.login_locked
        ? <Tag color="error">已锁定</Tag>
        : <Tag>未锁定</Tag>,
    },
    {
      title: '最后登录IP',
      dataIndex: 'last_login_ip',
      key: 'last_login_ip',
      width: 160,
      ellipsis: true,
      render: (ip: User['last_login_ip']) => ip || '—',
    },
    {
      title: '最后登录时间',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      width: 180,
      render: (time: User['last_login_at']) => time ? new Date(time).toLocaleString() : '—',
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
      width: 260,
      render: (_: any, record: User) => {
        const moreItems: MenuProps['items'] = [];
        if (access.canManageUserSecurity && record.totp_bound) {
          moreItems.push({
            key: 'reset-totp',
            label: '重置2FA',
            onClick: () => handleResetTotp(record),
          });
        }
        if (access.canManageUserSecurity && record.login_locked) {
          moreItems.push({
            key: 'clear-login-lock',
            label: '解除锁定',
            onClick: () => confirmationModal.confirm({
              title: `确定立即解除 ${record.username} 的登录锁定吗？`,
              content: '解除后该账号可以立即重新尝试登录，账号禁用状态不受影响。',
              okText: '解除锁定',
              cancelText: '取消',
              onOk: () => handleClearLoginLock(record),
            }),
          });
        }
        if (access.canDeleteUser) {
          if (moreItems.length > 0) moreItems.push({ type: 'divider' });
          moreItems.push({
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => confirmationModal.confirm({
              title: `确定要删除用户 ${record.username} 吗？`,
              content: '删除后，该账号将无法登录，也无法在账号列表中查询到。',
              okText: '删除',
              okType: 'danger',
              cancelText: '取消',
              onOk: () => handleDelete(record.id),
            }),
          });
        }

        return (
          <Space size={4} style={{ whiteSpace: 'nowrap' }}>
            {access.canUpdateUser && (
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditingUser(record);
                  // 编辑时不设置密码字段，保持为空
                  const { password, ...userData } = record as any;
                  const administrator = record.id === 1
                    || record.roles?.some(role => role.name === '管理员');
                  form.setFieldsValue({
                    ...userData,
                    totp_required: administrator
                      ? true
                      : (record.totp_effective_required ?? record.totp_required ?? false),
                  });
                  setModalVisible(true);
                }}
              >
                编辑
              </Button>
            )}
            {access.canUpdateUser && (
              <Button
                type="link"
                size="small"
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
            {moreItems.length > 0 && (
              <Dropdown
                menu={{ items: moreItems }}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button type="link" size="small">
                  更多 <DownOutlined />
                </Button>
              </Dropdown>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      {confirmationContextHolder}
      <Card size="small" style={{ ...cardStyle, marginBottom: 12 }}>
        <div style={filterToolbarStyle}>
          <Input
            allowClear
            placeholder="用户名/昵称"
            style={{ width: 220 }}
            value={filters.keyword}
            onChange={e => setFilters({ ...filters, keyword: e.target.value })}
            onPressEnter={() => fetchUsers(1, pageSize)}
          />
          <Select
            allowClear
            placeholder="角色"
            style={{ width: 180 }}
            value={filters.role_id}
            onChange={value => setFilters({ ...filters, role_id: value })}
            options={roles.map(role => ({ label: role.name, value: role.id }))}
          />
          <Select
            allowClear
            placeholder="镇街"
            style={{ width: 180 }}
            value={filters.town_id}
            onChange={value => setFilters({ ...filters, town_id: value })}
            options={[
              { label: '全局账号', value: 0 },
              ...towns.map(town => ({ label: town.name, value: town.id })),
            ]}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchUsers(1, pageSize)}>查询</Button>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => {
            setFilters({ keyword: '', role_id: undefined, town_id: undefined });
            setTimeout(() => fetchUsers(1, pageSize), 0);
          }}>重置</Button>
          {access.canCreateUser && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingUser(null);
                form.resetFields();
                form.setFieldsValue({ totp_required: true });
                setModalVisible(true);
              }}
            >
              创建用户
            </Button>
          )}
        </div>
      </Card>

      <Card style={cardStyle} bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1700 }}
          pagination={{
            current,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, size) => {
              fetchUsers(page, size);
            },
          }}
          locale={{
            emptyText: '暂无数据',
          }}
        />
      </Card>

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
              ...(editingUser ? [] : [{ required: true, message: '请输入密码' }]),
              {
                validator: async (_, value) => {
                  if (!value && editingUser) return;
                  if (typeof value !== 'string' || value.length < 8) throw new Error('密码至少8位');
                  if (!/[A-Za-z]/.test(value)) throw new Error('密码必须包含字母');
                  if (!/[^A-Za-z0-9\s]/.test(value)) throw new Error('密码必须包含特殊符号');
                },
              },
            ]}
            extra={editingUser ? "不设置密码则保持不变" : undefined}
          >
            <Input.Password
              placeholder={editingUser ? "不设置密码则保持不变" : "请输入密码"}
            />
          </Form.Item>

          {editingUser && access.canManageUserSecurity && (
            <Form.Item
              name="status"
              label="账号状态"
              rules={[{ required: true, message: '请选择账号状态' }]}
              extra="禁用后该用户将无法登录，已有登录会失效。恢复正常后需重新登录。"
            >
              <Select options={[
                { label: '正常', value: 1 },
                { label: '禁用', value: 0 },
              ]} />
            </Form.Item>
          )}

          <Form.Item
            name="totp_required"
            label="强制开启双重验证"
            valuePropName="checked"
            extra={editingAdministrator
              ? '管理员角色必须开启双重验证，不能关闭。'
              : '开启后，用户登录时必须先绑定身份验证器，以后每次登录均需验证动态验证码。'}
          >
            <Switch
              checkedChildren="是"
              unCheckedChildren="否"
              disabled={!access.canManageUserSecurity || editingAdministrator}
            />
          </Form.Item>

          <Form.Item name="town_id" label="所属镇街">
            <Select
              allowClear
              placeholder="不选择则为全局账号"
              options={towns.map(town => ({
                label: town.name,
                value: town.id,
              }))}
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

      <Modal
        title={`重置 ${resetTotpUser?.username || ''} 的2FA`}
        open={!!resetTotpUser}
        onOk={submitResetTotp}
        onCancel={() => {
          if (!resetTotpLoading) closeResetTotp();
        }}
        okText="确认重置"
        cancelText="取消"
        confirmLoading={resetTotpLoading}
        okButtonProps={{ disabled: resetTotpLoading }}
      >
        <p>重置后该用户的全部会话会立即失效，下次登录必须重新绑定。</p>
        <p>请输入当前登录账号绑定的动态验证码，不能使用待重置用户的验证码。</p>
        <Input
          value={resetTotpCode}
          placeholder="当前登录账号的6位动态验证码"
          maxLength={6}
          inputMode="numeric"
          autoComplete="one-time-code"
          status={resetTotpError ? 'error' : undefined}
          onChange={event => {
            setResetTotpCode(event.target.value);
            setResetTotpError('');
          }}
        />
        {resetTotpError && <Alert type="error" showIcon message={resetTotpError} style={{ marginTop: 12 }} />}
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
                description: role.description,
                disabled: role.name === '管理员' && !access.canManageUserSecurity,
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
