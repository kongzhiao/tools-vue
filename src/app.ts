// 运行时配置
import { request as umiRequest, RuntimeConfig } from '@umijs/max';
import React from 'react';
import { Input, message, Modal } from 'antd';
import VConsole from 'vconsole';
import { getConfig } from './config';
import RightContent from '@/components/RightContent';
import TaskFloat from '@/components/TaskFloat';
import WorkspaceTabs from '@/components/WorkspaceTabs';
// VConsole 已关闭
// if (process.env.NODE_ENV === 'development') {
//   new VConsole();
// }

// 获取当前环境配置
const config = getConfig();

let sessionReauthPromise: Promise<boolean> | null = null;

const clearLoginState = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('umi_initial_state');
  sessionStorage.clear();
};

const requestSessionReauth = (authAction: string, prompt: string): Promise<boolean> => {
  if (sessionReauthPromise) return sessionReauthPromise;

  sessionReauthPromise = new Promise<boolean>((resolve) => {
    let code = '';
    const needsTotp = authAction === 'reauth_totp';

    Modal.confirm({
      title: '会话安全验证',
      content: needsTotp
        ? React.createElement(Input, {
          placeholder: '请输入6位动态验证码',
          maxLength: 6,
          inputMode: 'numeric',
          autoComplete: 'one-time-code',
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => { code = event.target.value; },
        })
        : prompt,
      okText: '验证并继续',
      cancelText: '退出登录',
      maskClosable: false,
      async onOk() {
        const sessionToken = localStorage.getItem('token') || '';
        const response = await fetch(`${config.apiBaseUrl}/api/auth/session/reauth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_token: sessionToken, code }),
        });
        const data = await response.json();
        if (data.code !== 0 || !data.data?.token) {
          message.error(data.msg || '会话验证失败');
          throw new Error(data.msg || '会话验证失败');
        }

        localStorage.setItem('token', data.data.token);
        message.success('验证成功，会话已续期');
        sessionReauthPromise = null;
        resolve(true);
      },
      onCancel() {
        clearLoginState();
        sessionReauthPromise = null;
        resolve(false);
        window.location.href = '/login';
      },
    });
  });

  return sessionReauthPromise;
};

// 抑制findDOMNode警告
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args[0];
    if (typeof message === 'string' && message.includes('findDOMNode')) {
      return; // 抑制findDOMNode警告
    }
    originalWarn.apply(console, args);
  };
}

// 全局初始化数据配置，用于 Layout 用户信息和权限初始化
// 更多信息见文档：https://umijs.org/docs/api/runtime-config#getinitialstate
export async function getInitialState(): Promise<{
  name: string;
  currentUser?: {
    id: number;
    username: string;
    nickname: string;
    town_id?: number;
    town_name?: string;
    admin_capability?: boolean;
    permissions: string[];
  };
  menus?: any[];
  initData?: {
    app: string;
    env: string;
  };
}> {
  // 强制清除缓存，确保每次都重新获取数据
  localStorage.removeItem('umi_initial_state');

  // 获取全局初始化配置
  let initData;
  try {
    const initResponse = await fetch(`${config.apiBaseUrl}/api/init`);
    if (initResponse.ok) {
      const res = await initResponse.json();
      if (res.code === 0) {
        initData = res.data;
      }
    }
  } catch (error) {
    console.error('获取初始化数据失败:', error);
  }

  // 如果是登录页面，不需要获取用户信息
  if (window.location.pathname === '/login' || window.location.pathname === '/m/login') {
    return { name: '未登录', menus: [], initData };
  }

  // 检查是否有 token
  const token = localStorage.getItem('token');
  if (!token) {
    // 如果没有token且不在登录页，重定向到登录页
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return { name: '未登录', menus: [], initData };
  }

  try {
    let response = await fetch(`${config.apiBaseUrl}/api/user/info`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    let data = await response.json();
    if (data.code === 401 && data.data?.reauth_required) {
      const renewed = await requestSessionReauth(data.data.auth_action, data.msg || '会话已过期');
      if (renewed) {
        const renewedToken = localStorage.getItem('token') || '';
        response = await fetch(`${config.apiBaseUrl}/api/user/info`, {
          headers: { 'Authorization': `Bearer ${renewedToken}` },
        });
        data = await response.json();
      }
    }

    if (!response.ok) throw new Error('Network response was not ok');
    if (data.code === 0 && data.data) {
      const userData = data.data;
      const permissions = Array.isArray(userData.permissions) ? userData.permissions : [];

      return {
        name: userData.nickname || userData.username || '用户',
        currentUser: {
          id: userData.id || 0,
          username: userData.username || '',
          nickname: userData.nickname || '',
          town_id: userData.town_id,
          town_name: userData.town_name,
          admin_capability: Boolean(userData.admin_capability),
          permissions,
        },
        initData,
      };
    }
  } catch (error) {
    console.error('获取用户信息失败:', error);
  }

  // 如果获取用户信息失败，清除token并重定向到登录页
  clearLoginState();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
  return { name: '未登录', menus: [], initData };
}

export const layout = ({ initialState }: { initialState: any }) => {
  const appName = initialState?.initData?.app || '共享救助信息服务平台3';

  return {
    title: appName,
    logo: 'https://img.alicdn.com/tfs/TB1YHEpwUT1gK0jSZFhXXaAtVXa-28-27.svg',
    layout: 'side', // 强制设置为侧边模式以确保看到左下角
    contentStyle: {
      paddingBlock: 0,
      paddingInline: 0,
    },
    // 自定义页面标题
    pageTitleRender: (props: any, defaultPageTitle: any, info: any) => {
      if (info?.pageName) {
        return `${appName} - ${info.pageName}`;
      }
      return appName;
    },
    menu: {
      locale: false,
      // 自定义菜单配置
      defaultOpenAll: false,
      ignoreFlatMenu: true,
      menuFooterRender: false,
      suppressSiderWhenMenuEmpty: false,
    },
    // 自定义右侧内容，显示任务中心和用户信息
    rightContentRender: (props: any) => {
      if (!initialState?.currentUser) return null;

      const React = require('react');
      return React.createElement(RightContent, {
        currentUser: initialState.currentUser,
        compact: !!props?.collapsed,
      });
    },
    logout: () => {
      Modal.confirm({
        title: '确定要退出登录吗？',
        content: '退出后需要重新登录才能访问系统',
        okText: '确定',
        cancelText: '取消',
        async onOk() {
          const token = localStorage.getItem('token');
          try {
            await fetch(`${config.apiBaseUrl}/api/logout`, {
              method: 'POST',
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
          } finally {
            clearLoginState();
            window.location.href = '/login';
          }
        },
      });
    },
    // 添加菜单刷新功能
    onMenuHeaderClick: () => {
      // 点击logo时刷新菜单
      window.location.reload();
    },
    // 在页面内容外层添加任务浮层，默认避开左下角账户区域
    childrenRender: (children: any) => {
      const React = require('react');
      if (!initialState?.currentUser) return children;
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          WorkspaceTabs,
          { userId: initialState.currentUser.id },
          children,
        ),
        React.createElement(TaskFloat)
      );
    },
  };
};

// 全局拦截标识，防止重复弹窗
let isRedirecting = false;

// 统一处理登录失效
const handleUnauthenticated = (data: any = {}) => {
  const authAction = data?.data?.auth_action;
  if (data?.data?.reauth_required && (authAction === 'reauth_totp' || authAction === 'reauth')) {
    requestSessionReauth(authAction, data.msg || '会话已过期');
    return;
  }
  if (isRedirecting) return;
  isRedirecting = true;

  Modal.error({
    title: '登录失效',
    content: data.msg || data.message || '登录已失效，请重新登录',
    okText: '重新登录',
    onOk: () => {
      clearLoginState();
      window.location.href = '/login';
    },
  });
};

// 请求配置
export const request = {
  timeout: config.apiTimeout || 300000, // 使用配置的超时时间，默认5分钟
  baseURL: config.apiBaseUrl,
  errorConfig: {
    errorHandler: (error: any) => {
      console.error('请求错误:', error);
      // 检查网络状态码或业务代码
      const status = error.response?.status;
      const bizCode = error.data?.code;
      const msg = error.data?.msg || error.data?.message || '';

      if (status === 401 || bizCode === 401) {
        handleUnauthenticated(error.data || { msg: msg || '登录失效，请重新登录' });
      }
    },
    errorThrower: () => { },
  },
  requestInterceptors: [
    (config: any) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
  ],
  responseInterceptors: [
    async (response: any) => {
      const { data, status } = response;
      // 兼容业务代码返回 401 的场景
      if (status === 401 || data?.code === 401) {
        const authAction = data?.data?.auth_action;
        const canReauth = data?.data?.reauth_required
          && (authAction === 'reauth_totp' || authAction === 'reauth');
        const originalConfig = response.config || {};
        if (canReauth && !originalConfig.__sessionRetried) {
          const renewed = await requestSessionReauth(authAction, data.msg || '会话已过期');
          if (renewed) {
            const token = localStorage.getItem('token') || '';
            return umiRequest(originalConfig.url || '', {
              ...originalConfig,
              headers: {
                ...(originalConfig.headers || {}),
                Authorization: `Bearer ${token}`,
              },
              __sessionRetried: true,
              getResponse: true,
            });
          }
        }
        handleUnauthenticated(data || { msg: '登录失效，请重新登录' });
      }
      return response;
    },
  ],
};
