import type { MenuProps } from 'antd';
import { Dropdown, Empty, List, Modal, Popover, Spin, Tooltip } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { DownOutlined, FileTextOutlined, LockOutlined, LogoutOutlined, QuestionCircleOutlined, UserOutlined } from '@ant-design/icons';
import { getConfig } from '@/config';
import ChangePasswordModal from '../ChangePasswordModal';
import './index.less';

interface RightContentProps {
    currentUser?: {
        nickname?: string;
        username?: string;
    };
    compact?: boolean;
}

interface HelpDocument {
    filename: string;
    title: string;
    url: string;
    updated_at?: string;
}

const RightContent: React.FC<RightContentProps> = ({ currentUser, compact: compactProp = false }) => {
    const [visible, setVisible] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [helpLoading, setHelpLoading] = useState(false);
    const [helpDocuments, setHelpDocuments] = useState<HelpDocument[]>([]);
    const compact = compactProp;
    const config = useMemo(() => getConfig(), []);

    const getHelpUrl = (url: string) => {
        const apiBase = config.apiBaseUrl.replace(/\/$/, '');
        return `${apiBase}${url}`;
    };

    const getHelpListUrl = () => {
        const apiBase = config.apiBaseUrl.replace(/\/$/, '');
        return `${apiBase}/api/helps`;
    };

    const fetchHelpDocuments = async () => {
        if (helpLoading || helpDocuments.length > 0) return;

        try {
            setHelpLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(getHelpListUrl(), {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            const data = await response.json();
            if (data.code === 0) {
                setHelpDocuments(Array.isArray(data.data) ? data.data : []);
            }
        } catch (error) {
            console.error('获取帮助文档失败:', error);
            setHelpDocuments([]);
        } finally {
            setHelpLoading(false);
        }
    };

    useEffect(() => {
        if (helpOpen) {
            fetchHelpDocuments();
        }
    }, [helpOpen]);

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

    const helpContent = (
        <div className="help-popover-content">
            <Spin spinning={helpLoading}>
                {helpDocuments.length > 0 ? (
                    <List
                        size="small"
                        dataSource={helpDocuments}
                        renderItem={item => (
                            <List.Item className="help-doc-item">
                                <a
                                    href={getHelpUrl(item.url)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="help-doc-link"
                                >
                                    <FileTextOutlined className="help-doc-icon" />
                                    <span className="help-doc-title">{item.title}</span>
                                </a>
                            </List.Item>
                        )}
                    />
                ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无帮助文档" />
                )}
            </Spin>
        </div>
    );

    return (
        <div className={`right-content ${compact ? 'right-content-compact' : ''}`}>
            {!compact && (
                <Popover
                    title="使用说明"
                    content={helpContent}
                    trigger="hover"
                    placement="topLeft"
                    open={helpOpen}
                    onOpenChange={setHelpOpen}
                >
                    <Tooltip title="使用说明">
                        <button type="button" className="help-trigger" aria-label="使用说明">
                            <QuestionCircleOutlined />
                        </button>
                    </Tooltip>
                </Popover>
            )}
            <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']}>
                <div className="user-info">
                    {compact ? (
                        <UserOutlined className="user-compact-icon" />
                    ) : (
                        <>
                            <img
                                src="https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png"
                                alt="avatar"
                                className="user-avatar"
                            />
                            <span className="user-name">
                                {currentUser.nickname || currentUser.username}
                            </span>
                            <DownOutlined className="user-action-icon" />
                        </>
                    )}
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
