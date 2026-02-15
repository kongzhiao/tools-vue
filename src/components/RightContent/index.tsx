import type { MenuProps } from 'antd';
import { Dropdown, Modal } from 'antd';
import React, { useState } from 'react';
import { LockOutlined, LogoutOutlined } from '@ant-design/icons';
import ChangePasswordModal from '../ChangePasswordModal';
import './index.less';

interface RightContentProps {
    currentUser?: {
        nickname?: string;
        username?: string;
    };
}

const RightContent: React.FC<RightContentProps> = ({ currentUser }) => {
    const [visible, setVisible] = useState(false);

    // 退出登录
    const handleLogout = () => {
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
    };

    if (!currentUser) return null;

    const items: MenuProps['items'] = [
        {
            key: 'password',
            icon: <LockOutlined />,
            label: '修改密码',
            onClick: () => setVisible(true),
        },
        {
            type: 'divider',
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: '退出登录',
            onClick: handleLogout,
        },
    ];

    return (
        <div className="right-content">
            <Dropdown menu={{ items }} placement="bottomRight">
                <div className="user-info">
                    <img
                        src="https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png"
                        alt="avatar"
                        className="user-avatar"
                    />
                    <span className="user-name">
                        {currentUser.nickname || currentUser.username}
                    </span>
                </div>
            </Dropdown>
            
            <ChangePasswordModal 
                visible={visible} 
                onCancel={() => setVisible(false)} 
            />
        </div>
    );
};

export default RightContent;
