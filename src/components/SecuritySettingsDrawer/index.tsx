import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  message,
  QRCode,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { KeyOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { bindTotp, getSecurityInfo, setupTotp } from '@/services/auth';
import ChangePasswordModal from '@/components/ChangePasswordModal';

interface SecuritySettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface SecurityState {
  totp_required: boolean;
  totp_bound: boolean;
  can_bind: boolean;
  verification_bypassed: boolean;
}

interface SetupState {
  challenge_token: string;
  secret: string;
  otpauth_uri: string;
}

const SecuritySettingsDrawer: React.FC<SecuritySettingsDrawerProps> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [binding, setBinding] = useState(false);
  const [security, setSecurity] = useState<SecurityState | null>(null);
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const loadSecurity = async () => {
    setLoading(true);
    try {
      const response = await getSecurityInfo();
      if (response.code === 0) {
        setSecurity(response.data);
      } else {
        message.error(response.msg || '获取安全状态失败');
      }
    } catch {
      message.error('获取安全状态失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSetup(null);
      form.resetFields();
      loadSecurity();
    }
  }, [open]);

  const startBinding = async () => {
    setBinding(true);
    try {
      const response = await setupTotp();
      if (response.code === 0) {
        setSetup(response.data);
      } else {
        message.error(response.msg || '获取绑定二维码失败');
      }
    } catch {
      message.error('获取绑定二维码失败');
    } finally {
      setBinding(false);
    }
  };

  const confirmBinding = async () => {
    if (!setup) return;
    const values = await form.validateFields();
    setBinding(true);
    try {
      const response = await bindTotp({
        challenge_token: setup.challenge_token,
        code: values.code,
      });
      if (response.code === 0) {
        message.success('身份验证器绑定成功');
        setSetup(null);
        form.resetFields();
        await loadSecurity();
      } else {
        message.error(response.msg || '动态验证码验证失败');
      }
    } catch {
      message.error('绑定失败，请稍后重试');
    } finally {
      setBinding(false);
    }
  };

  return (
    <>
      <Drawer title="安全设置" width={460} open={open} onClose={onClose} destroyOnHidden>
        <Spin spinning={loading}>
          <Space direction="vertical" size={18} style={{ width: '100%' }}>
            <div>
              <Typography.Title level={5}><KeyOutlined /> 登录密码</Typography.Title>
              <Typography.Paragraph type="secondary">
                新密码至少8位，并同时包含字母和特殊符号。
              </Typography.Paragraph>
              <Button onClick={() => setPasswordOpen(true)}>修改密码</Button>
            </div>

            <Divider style={{ margin: 0 }} />

            <div>
              <Typography.Title level={5}><SafetyCertificateOutlined /> 双重验证</Typography.Title>
              {security && (
                <Descriptions size="small" column={1} style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="要求">
                    {security.totp_required ? <Tag color="blue">强制开启</Tag> : <Tag>可选</Tag>}
                  </Descriptions.Item>
                  <Descriptions.Item label="状态">
                    {security.totp_bound ? <Tag color="success">已绑定</Tag> : <Tag color="warning">未绑定</Tag>}
                  </Descriptions.Item>
                </Descriptions>
              )}

              {security?.can_bind && !setup && (
                <Button type="primary" loading={binding} onClick={startBinding}>
                  绑定身份验证器
                </Button>
              )}

              {setup && (
                <Space direction="vertical" size={12} style={{ width: '100%', alignItems: 'center' }}>
                  <Alert
                    type="info"
                    showIcon
                    message="使用苹果“密码”、Microsoft Authenticator、2FAS 或 Google Authenticator 扫描二维码。"
                    style={{ width: '100%' }}
                  />
                  <QRCode value={setup.otpauth_uri} size={190} bordered={false} />
                  <Typography.Text type="secondary">无法扫码时手工输入密钥</Typography.Text>
                  <Typography.Text copyable code>{setup.secret}</Typography.Text>
                  <Form form={form} layout="vertical" style={{ width: '100%' }} onFinish={confirmBinding}>
                    <Form.Item
                      name="code"
                      label="动态验证码"
                      rules={[
                        { required: true, message: '请输入动态验证码' },
                        { pattern: /^\d{6}$/, message: '请输入6位数字验证码' },
                      ]}
                    >
                      <Input
                        inputMode="numeric"
                        maxLength={6}
                        autoComplete="one-time-code"
                        placeholder="6位动态验证码"
                      />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={binding} block>
                      验证并完成绑定
                    </Button>
                  </Form>
                </Space>
              )}
            </div>
          </Space>
        </Spin>
      </Drawer>

      <ChangePasswordModal visible={passwordOpen} onCancel={() => setPasswordOpen(false)} />
    </>
  );
};

export default SecuritySettingsDrawer;
