import { request } from '@umijs/max';

/** 修改密码 */
export async function changePassword(data: { old_password: string; new_password: string }) {
  return request('/api/user/change-password', {
    method: 'POST',
    data,
  });
}

/** 获取当前账号安全状态 */
export async function getSecurityInfo() {
  return request('/api/user/security', { method: 'GET' });
}

/** 当前账号开始绑定TOTP */
export async function setupTotp() {
  return request('/api/user/totp/setup', { method: 'POST' });
}

/** 当前账号确认绑定TOTP */
export async function bindTotp(data: { challenge_token: string; code: string }) {
  return request('/api/user/totp/bind', { method: 'POST', data });
}

/** 服务端退出登录 */
export async function logout() {
  return request('/api/logout', { method: 'POST' });
}
