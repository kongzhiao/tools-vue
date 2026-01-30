import React from 'react';
import { Popconfirm } from 'antd';
import './index.less';

interface RightContentProps {
    currentUser?: {
        nickname?: string;
        username?: string;
    };
}

const RightContent: React.FC<RightContentProps> = ({ currentUser }) => {
    // 退出登录
    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    if (!currentUser) return null;

    return (
        <div className="right-content">
            {/* 用户信息 */}
            <Popconfirm
                title="确定要退出登录吗？"
                description="退出后需要重新登录才能访问系统"
                onConfirm={handleLogout}
                okText="确定"
                cancelText="取消"
                placement="bottomRight"
            >
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
            </Popconfirm>
        </div>
    );
};

export default RightContent;
