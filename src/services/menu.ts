import { request } from '@umijs/max';

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  type: 'menu' | 'operation';
  parent_id: number;
  path?: string;
  component?: string;
  icon?: string;
  sort: number;
  children?: MenuItem[];
}

export interface MenuResponse {
  code: number;
  msg: string;
  data: MenuItem[];
}

/**
 * 获取用户菜单
 */
export async function getUserMenus(): Promise<MenuResponse> {
  return request('/api/permissions/user/menus', {
    method: 'GET',
  });
}

/**
 * 获取所有菜单（树形结构）
 */
export async function getMenuTree(): Promise<MenuResponse> {
  return request('/api/permissions/menus', {
    method: 'GET',
  });
} 