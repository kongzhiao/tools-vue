import React, { useState } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { changePassword } from '@/services/auth';

interface ChangePasswordModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  visible,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const res = await changePassword({
        old_password: values.old_password,
        new_password: values.new_password,
      });

      if (res.code === 0) {
        message.success('密码修改成功，请重新登录');
        form.resetFields();
        onCancel();
        if (onSuccess) {
          onSuccess();
        } else {
          // 默认逻辑：清除token并跳转登录
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      } else {
        message.error(res.msg || '修改失败');
      }
    } catch (error) {
      console.error('Validate Failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="修改密码"
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        name="change_password_form"
      >
        <Form.Item
          name="old_password"
          label="原密码"
          rules={[{ required: true, message: '请输入原密码' }]}
        >
          <Input.Password placeholder="请输入原密码" />
        </Form.Item>
        <Form.Item
          name="new_password"
          label="新密码"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '新密码不能少于6位' }
          ]}
        >
          <Input.Password placeholder="请输入新密码" />
        </Form.Item>
        <Form.Item
          name="confirm_password"
          label="确认新密码"
          dependencies={['new_password']}
          rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('new_password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="请确认新密码" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ChangePasswordModal;
