// 运行时配置
import { RuntimeConfig } from '@umijs/max';
import { message, Popconfirm, Modal } from 'antd';
import VConsole from 'vconsole';
import { getConfig } from './config';

// 在开发环境下初始化VConsole
if (process.env.NODE_ENV === 'development') {
  new VConsole();
}

// 获取当前环境配置
const config = getConfig();

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

// 转换菜单数据格式为UmiJS需要的格式
function convertMenuData(menuData: any[]): any[] {
  return menuData.map(menu => {
    const convertedMenu: any = {
      name: menu.name,
      path: menu.path,
      icon: menu.icon,
    };
    
    if (menu.component) {
      convertedMenu.component = menu.component;
    }
    
    if (menu.children && menu.children.length > 0) {
      convertedMenu.routes = convertMenuData(menu.children);
    }
    
    return convertedMenu;
  });
}

// 全局初始化数据配置，用于 Layout 用户信息和权限初始化
// 更多信息见文档：https://umijs.org/docs/api/runtime-config#getinitialstate
export async function getInitialState(): Promise<{
  name: string;
  currentUser?: {
    id: number;
    username: string;
    nickname: string;
    permissions: string[];
  };
  menus?: any[];
}> {
  // 强制清除缓存，确保每次都重新获取数据
  localStorage.removeItem('umi_initial_state');
  
  // 如果是登录页面，不需要获取用户信息
  if (window.location.pathname === '/login') {
    return { name: '未登录', menus: [] };
  }

  // 检查是否有 token
  const token = localStorage.getItem('token');
  if (!token) {
    // 如果没有token且不在登录页，重定向到登录页
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return { name: '未登录', menus: [] };
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/user/info`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    if (data.code === 0 && data.data) {
      const userData = data.data;
      
      // 获取用户菜单
      let menus = [];
      try {
        const menuResponse = await fetch(`${config.apiBaseUrl}/api/permissions/user/menus`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (menuResponse.ok) {
          const menuData = await menuResponse.json();
          console.log(menuData)
          if (menuData.code === 0) {
            menus = convertMenuData(menuData.data || []);
          }

          console.log(menus)
        }
      } catch (error) {
        console.error('获取菜单失败:', error);
      }

      return {
        name: userData.nickname || userData.username || '用户',
        currentUser: {
          id: userData.id || 0,
          username: userData.username || '',
          nickname: userData.nickname || '',
          permissions: Array.isArray(userData.permissions) ? userData.permissions : [],
        },
        menus,
      };
    }
  } catch (error) {
    console.error('获取用户信息失败:', error);
  }

  // 如果获取用户信息失败，清除token并重定向到登录页
  localStorage.removeItem('token');
  localStorage.removeItem('umi_initial_state');
  sessionStorage.clear();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
  return { name: '未登录', menus: [] };
}

export const layout = ({ initialState }: { initialState: any }) => {
  console.log(initialState)
  return {
    logo: 'https://img.alicdn.com/tfs/TB1YHEpwUT1gK0jSZFhXXaAtVXa-28-27.svg',
    menu: {
      locale: false,
      // 自定义菜单配置
      defaultOpenAll: false,
      ignoreFlatMenu: true,
      // 使用动态菜单数据
      data: initialState?.menus || [],
      menuFooterRender: () => ({ mode: 'horizontal' }),
      suppressSiderWhenMenuEmpty: true,
    },
    // 自定义右侧内容，显示用户信息（通过CSS移动到左侧）
    rightContentRender: () => {
      if (!initialState?.currentUser) return null;
      
      // 使用 React.createElement 创建元素
      const React = require('react');
      
      const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
      };
      
      return React.createElement('div', {
        style: {
        }
      }, 
        React.createElement(Popconfirm, {
          title: '确定要退出登录吗？',
          description: '退出后需要重新登录才能访问系统',
          onConfirm: handleLogout,
          okText: '确定',
          cancelText: '取消',
          placement: 'bottomRight'
        }, 
          React.createElement('div', {
            style: {
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: '6px',
              transition: 'background-color 0.3s',
            },
            onMouseEnter: (e: any) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.06)';
            },
            onMouseLeave: (e: any) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            },
          }, [
            React.createElement('img', {
              key: 'avatar',
              src: 'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png',
              alt: 'avatar',
              style: {
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                marginRight: '8px',
              }
            }),
            React.createElement('span', {
              key: 'username',
              style: {
                color: 'rgba(0, 0, 0, 0.88)',
                fontSize: '14px',
                fontWeight: 500,
              }
            }, initialState.currentUser.nickname || initialState.currentUser.username)
          ])
        )
      );
    },
    logout: () => {
      Modal.confirm({
        title: '确定要退出登录吗？',
        content: '退出后需要重新登录才能访问系统',
        okText: '确定',
        cancelText: '取消',
        onOk() {
          localStorage.removeItem('token');
          window.location.href = '/login';
        },
      });
    },
    // 添加菜单刷新功能
    onMenuHeaderClick: () => {
      // 点击logo时刷新菜单
      window.location.reload();
    },
  };
};

// 请求配置
export const request = {
  timeout: config.apiTimeout || 300000, // 使用配置的超时时间，默认5分钟
  baseURL: config.apiBaseUrl,
  errorConfig: {
    errorHandler: (error: any) => {
      console.error('请求错误:', error);
      // 检查是否是401错误
      if (error.response?.status === 401 || error.data?.code === 401) {
        // 清除token并跳转到登录页面
        localStorage.removeItem('token');
        localStorage.removeItem('umi_initial_state');
        sessionStorage.clear();
        window.location.href = '/login';
      }
    },
    errorThrower: () => {},
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
    (response: any) => {
      // 检查响应状态
      if (response.status === 401) {
        // 清除token并跳转到登录页面
        localStorage.removeItem('token');
        localStorage.removeItem('umi_initial_state');
        sessionStorage.clear();
        window.location.href = '/login';
        return response;
      }
      return response;
    },
  ],
};
