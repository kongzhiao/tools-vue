import React, { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, message, Modal, QRCode, Space, Spin, Typography } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { getConfig } from '@/config';

type TwoFactorAction = 'bind' | 'verify';

interface TwoFactorLoginModalProps {
  open: boolean;
  action: TwoFactorAction;
  challengeToken: string;
  onSuccess: (token: string) => void;
  onCancel: () => void;
}

interface SetupData {
  secret: string;
  otpauth_uri: string;
}

const TwoFactorLoginModal: React.FC<TwoFactorLoginModalProps> = ({
  open,
  action,
  challengeToken,
  onSuccess,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const config = getConfig();

  useEffect(() => {
    if (!open) {
      setSetupData(null);
      return;
    }
    form.resetFields();
    if (action !== 'bind' || !challengeToken) return;

    let active = true;
    const loadSetup = async () => {
      setSetupLoading(true);
      try {
        const response = await fetch(`${config.apiBaseUrl}/api/auth/totp/login-setup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ challenge_token: challengeToken }),
        });
        const data = await response.json();
        if (!active) return;
        if (data.code === 0) {
          setSetupData(data.data);
        } else {
          message.error(data.msg || '获取绑定信息失败');
          onCancel();
        }
      } catch {
        if (active) message.error('获取绑定信息失败，请重新登录');
      } finally {
        if (active) setSetupLoading(false);
      }
    };
    loadSetup();
    return () => {
      active = false;
    };
  }, [action, challengeToken, open]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      const endpoint = action === 'bind'
        ? '/api/auth/totp/login-bind'
        : '/api/auth/totp/login-verify';
      const response = await fetch(`${config.apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge_token: challengeToken, code: values.code }),
      });
      const data = await response.json();
      if (data.code === 0 && data.data?.token) {
        form.resetFields();
        onSuccess(data.data.token);
      } else {
        message.error(data.msg || '动态验证码验证失败');
      }
    } catch {
      message.error('验证请求失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={(
        <Space>
          <SafetyCertificateOutlined style={{ color: '#1677ff' }} />
          {action === 'bind' ? '绑定身份验证器' : '双重验证'}
        </Space>
      )}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={action === 'bind' ? 520 : 420}
      maskClosable={false}
      destroyOnHidden
    >
      <Spin spinning={setupLoading}>
        {action === 'bind' && setupData && (
          <Space direction="vertical" size={14} style={{ width: '100%', alignItems: 'center' }}>
            <Alert
              type="info"
              showIcon
              message="请使用苹果“密码”、Microsoft Authenticator、2FAS 或 Google Authenticator 扫描二维码。"
              style={{ width: '100%' }}
            />
            <QRCode value={setupData.otpauth_uri} size={190} bordered={false} />
            <Typography.Text type="secondary">无法扫码时，可手工输入下方密钥</Typography.Text>
            <Typography.Text copyable code>{setupData.secret}</Typography.Text>
          </Space>
        )}

        {action === 'verify' && (
          <Alert
            type="info"
            showIcon
            message="请输入身份验证器当前显示的6位动态验证码。"
            style={{ marginBottom: 18 }}
          />
        )}

        <Form form={form} layout="vertical" style={{ marginTop: 18 }} onFinish={handleSubmit}>
          <Form.Item
            name="code"
            label="动态验证码"
            rules={[
              { required: true, message: '请输入动态验证码' },
              { pattern: /^\d{6}$/, message: '请输入6位数字验证码' },
            ]}
          >
            <Input inputMode="numeric" maxLength={6} placeholder="6位动态验证码" autoComplete="one-time-code" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            {action === 'bind' ? '验证并完成绑定' : '验证并登录'}
          </Button>
        </Form>
      </Spin>
    </Modal>
  );
};

export default TwoFactorLoginModal;
