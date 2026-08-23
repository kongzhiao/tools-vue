import { useState, useEffect } from 'react';
import { Form, Input, Button, Toast } from 'antd-mobile';
import { useModel } from '@umijs/max';
import { getConfig } from '@/config';
import TwoFactorLoginModal from '@/components/TwoFactorLoginModal';
import styles from './index.less';

interface LoginForm {
  username: string;
  password: string;
}

const MobileLogin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [twoFactor, setTwoFactor] = useState<{
    open: boolean;
    action: 'bind' | 'verify';
    challengeToken: string;
  }>({ open: false, action: 'verify', challengeToken: '' });
  const { initialState } = useModel('@@initialState');
  const config = getConfig();

  useEffect(() => {
    const appName = initialState?.initData?.app || '共享救助信息服务平台';
    document.title = `${appName} - 登录`;
  }, [initialState]);

  const finishLogin = (token: string) => {
    localStorage.setItem('token', token);
    Toast.show({ icon: 'success', content: '登录成功' });
    localStorage.removeItem('umi_initial_state');
    sessionStorage.clear();
    window.location.href = '/m/medical/reimbursement';
  };

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (data.code === 0) {
        finishLogin(data.data.token);
      } else if (data.code === 1001 || data.code === 1002) {
        setTwoFactor({
          open: true,
          action: data.code === 1001 ? 'bind' : 'verify',
          challengeToken: data.data?.challenge_token || '',
        });
      } else {
        Toast.show({
          icon: 'fail',
          content: data.msg || '登录失败',
        });
      }
    } catch (error) {
      console.error('登录错误:', error);
      Toast.show({
        icon: 'fail',
        content: '网络错误，请稍后重试',
      });
    } finally {
      setLoading(false);
    }
  };

  const appName = initialState?.initData?.app || '共享救助信息服务平台';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>{appName}</h1>
      </div>
      <Form
        layout='horizontal'
        onFinish={onFinish}
        footer={
          <Button
            block
            color='primary'
            loading={loading}
            type='submit'
            className={styles.submitButton}
          >
            登录
          </Button>
        }
      >
        <Form.Item
          name='username'
          label='用户名'
          rules={[{ required: true, message: '请输入用户名' }]}
        >
          <Input placeholder='请输入用户名' />
        </Form.Item>
        <Form.Item
          name='password'
          label='密码'
          rules={[{ required: true, message: '请输入密码' }]}
        >
          <Input type='password' placeholder='请输入密码' />
        </Form.Item>
      </Form>
      <TwoFactorLoginModal
        open={twoFactor.open}
        action={twoFactor.action}
        challengeToken={twoFactor.challengeToken}
        onCancel={() => setTwoFactor(current => ({ ...current, open: false }))}
        onSuccess={finishLogin}
      />
    </div>
  );
};

export default MobileLogin;
