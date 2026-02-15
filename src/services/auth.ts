import { request } from '@umijs/max';

/** 修改密码 */
export async function changePassword(data: { old_password: string; new_password: string }) {
  return request('/api/user/change-password', {
    method: 'POST',
    data,
  });
}
