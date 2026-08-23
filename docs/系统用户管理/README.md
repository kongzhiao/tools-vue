# 系统用户管理

## 功能目标

管理后台登录账号、角色、镇街范围、密码安全、登录锁和 TOTP 双重验证。这里的用户是系统操作人员，不是参保人、救助对象或患者。

## 页面入口

- 登录：`/login`
- 账户管理：`/user-management/accounts`
- 本人安全设置：点击页面左下角用户名，选择“安全设置”
- 关联页面：角色管理、权限管理、镇街管理、操作记录

## 已实现能力

- 账号密码登录后，根据后端状态进入 TOTP 首次绑定或动态码验证。
- 支持苹果“密码”、Microsoft Authenticator、2FAS 和 Google Authenticator 等 RFC 6238 兼容应用。
- 新密码至少 8 位，并同时包含字母和特殊符号。
- 创建用户时“强制开启双重验证”默认选中。
- 账户列表展示 TOTP 要求、绑定状态和登录锁状态。
- 超级管理员和精确名称为“管理员”的角色可设置普通用户的 TOTP 要求、重置他人 TOTP 和清除登录锁。
- 修改本人密码后清除本地登录状态并返回登录页。
- 会话过期时，已绑定 TOTP 的用户可以在当前页面验证动态码恢复会话；无需重新加载并丢失当前页面状态。

## 业务保护

- 超级管理员 `id=1` 不出现在普通账户列表。
- “管理员”角色不能改名、删除或重复创建，页面同步隐藏或禁用相应操作。
- 只有超级管理员或现有“管理员”角色能授予或移除“管理员”角色。
- 普通用户不能关闭或重新绑定 TOTP；需要更换设备时由另一名具备安全管理能力的账号重置。
- 非 `prod` 环境后端不校验 TOTP 动态码，页面会显示开发环境提示。
- 用户没有启停状态和软删除，删除前必须确认。

## 前端代码位置

- 登录：`src/pages/Login/index.tsx`、`src/pages/mobile/Login/index.tsx`
- TOTP 登录：`src/components/TwoFactorLoginModal/index.tsx`
- 本人安全设置：`src/components/SecuritySettingsDrawer/index.tsx`
- 会话恢复：`src/app.ts`
- 账户管理：`src/pages/User/index.tsx`
- 角色保护：`src/pages/Role/index.tsx`
- 权限能力：`src/access.ts`
- 接口：`src/services/auth.ts`

## 主要接口

| 方法 | 路径 | 用途 |
|---|---|---|
| POST | `/api/login` | 账号密码登录或取得 TOTP 挑战 |
| POST | `/api/auth/totp/login-setup` | 首次登录取得绑定信息 |
| POST | `/api/auth/totp/login-bind` | 首次绑定并登录 |
| POST | `/api/auth/totp/login-verify` | 已绑定用户验证并登录 |
| POST | `/api/auth/session/reauth` | 会话过期后通过 TOTP 恢复 |
| POST | `/api/logout` | 注销服务端会话 |
| GET | `/api/user/security` | 本人安全状态 |
| POST | `/api/user/totp/setup` | 本人首次绑定准备 |
| POST | `/api/user/totp/bind` | 本人完成首次绑定 |
| POST | `/api/user/change-password` | 修改本人密码 |
| POST | `/api/users/{id}/totp/reset` | 重置他人 TOTP |
| DELETE | `/api/users/{id}/login-lock` | 清除账号锁定 |
