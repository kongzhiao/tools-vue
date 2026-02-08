import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback, useRef } from 'react';
import { Drawer, Tag, Progress, Button, Space, Tooltip, message } from 'antd';
import { ReloadOutlined, DownloadOutlined, CloseOutlined } from '@ant-design/icons';
import { getTaskList, getTaskCount, TaskItem } from '@/services/task';
import { getConfig } from '@/config';
import './index.less';

const config = getConfig();

// 状态颜色映射
const STATUS_CONFIG: Record<string, { color: string; text: string }> = {
    pending: { color: 'default', text: '待执行' },
    processing: { color: 'processing', text: '执行中' },
    completed: { color: 'success', text: '已完成' },
    failed: { color: 'error', text: '失败' },
    cancelled: { color: 'warning', text: '已取消' },
};

export interface TaskCenterRef {
    open: () => void;
    close: () => void;
    refresh: () => void;
    refreshCount: () => Promise<number>;
}

interface TaskCenterProps {
    onCountChange?: (count: number) => void;
}

const TaskCenter = forwardRef<TaskCenterRef, TaskCenterProps>(({ onCountChange }, ref) => {
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<TaskItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [pendingCount, setPendingCount] = useState(0); // 未完成任务数

    const lastTaskStatuses = useRef<Record<string, string>>({});

    // 获取任务列表
    const fetchData = useCallback(async (currentPage = page, currentPageSize = pageSize) => {
        setLoading(true);
        try {
            const res = await getTaskList({ page: currentPage, page_size: currentPageSize });
            if (res.code === 200) {
                const newList = res.data.list;

                // 检测任务状态变迁
                let hasStatusChanged = false;
                newList.forEach(task => {
                    const prevStatus = lastTaskStatuses.current[task.uuid];
                    // 如果任务从 进行中/排队中 变为 完成/失败
                    if (prevStatus && (prevStatus === 'processing' || prevStatus === 'pending') &&
                        (task.status === 'completed' || task.status === 'failed')) {
                        hasStatusChanged = true;
                    }
                    // 更新记录
                    lastTaskStatuses.current[task.uuid] = task.status;
                });

                if (hasStatusChanged) {
                    console.log('检测到任务完成，派发刷新事件');
                    window.dispatchEvent(new CustomEvent('taskStatusChanged'));
                }

                setData(newList);
                setTotal(res.data.total);
            }
        } catch (error) {
            console.error('获取任务列表失败:', error);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize]);

    // 获取未完成任务数量
    const fetchCount = useCallback(async (): Promise<number> => {
        try {
            const res = await getTaskCount();
            if (res.code === 200) {
                const count = res.data.count;
                setPendingCount(count);
                onCountChange?.(count);
                return count;
            }
        } catch (error) {
            console.error('获取任务数量失败:', error);
        }
        return 0;
    }, [onCountChange]);

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
        open: () => {
            setVisible(true);
            fetchData(1, pageSize);
            fetchCount();
        },
        close: () => setVisible(false),
        refresh: () => fetchData(page, pageSize),
        refreshCount: fetchCount,
    }));

    // 只有抽屉打开且有未完成任务时才轮询
    useEffect(() => {
        if (!visible || pendingCount === 0) return;

        const timer = setInterval(() => {
            fetchData(page, pageSize);
            fetchCount();
        }, 3000);

        return () => clearInterval(timer);
    }, [visible, pendingCount, page, pageSize, fetchData, fetchCount]);

    // 处理下载
    const handleDownload = (record: TaskItem) => {
        if (!record.file_url) {
            message.warning('文件不存在');
            return;
        }
        // 构建完整的下载 URL
        const downloadUrl = `${config.apiBaseUrl}${record.file_url}`;
        window.open(downloadUrl, '_blank');
    };

    // 渲染单个任务卡片
    const renderTaskItem = (record: TaskItem) => {
        const statusConfig = STATUS_CONFIG[record.status] || { color: 'default', text: record.status };
        const canDownload = record.status === 'completed' && record.file_url;
        const percent = record.progress || 0;

        // 进度显示：未到100%显示1位小数，100%显示整数
        const percentText = percent >= 100 ? '100%' : `${percent.toFixed(1)}%`;

        // 进度条颜色
        const progressColor = record.status === 'failed' ? '#ff4d4f'
            : record.status === 'completed' ? '#52c41a'
                : '#1890ff';

        return (
            <div className="task-item" key={record.uuid}>
                <div className="task-item-header">
                    <span className="task-item-title">{record.title}</span>
                    <Tag color={statusConfig.color}>{statusConfig.text}</Tag>
                </div>
                <div className="task-item-progress">
                    {/* 内嵌百分比进度条 */}
                    <div className="progress-bar">
                        <div
                            className="progress-inner"
                            style={{ width: `${percent}%`, backgroundColor: progressColor }}
                        >
                            {percent >= 20 && <span className="progress-text">{percentText}</span>}
                        </div>
                        {percent < 20 && <span className="progress-text-outer">{percentText}</span>}
                    </div>
                </div>
                <div className="task-item-footer">
                    <span className="task-item-time">{record.created_at}</span>
                    <Tooltip title={canDownload ? "下载文件" : "文件未就绪"}>
                        <Button
                            type="link"
                            size="small"
                            icon={<DownloadOutlined />}
                            disabled={!canDownload}
                            onClick={() => canDownload && handleDownload(record)}
                            style={{ color: canDownload ? '#1890ff' : '#d9d9d9' }}
                        >
                            下载
                        </Button>
                    </Tooltip>
                </div>
            </div>
        );
    };

    return (
        <Drawer
            title={
                <div className="task-center-header">
                    <span>任务中心</span>
                    <Button
                        type="text"
                        icon={<ReloadOutlined />}
                        onClick={() => fetchData(page, pageSize)}
                        loading={loading}
                    />
                </div>
            }
            placement="right"
            width={600}
            open={visible}
            onClose={() => setVisible(false)}
            closeIcon={<CloseOutlined />}
            className="task-center-drawer"
        >
            <div className="task-list">
                {loading && data.length === 0 ? (
                    <div className="task-list-loading">加载中...</div>
                ) : data.length === 0 ? (
                    <div className="task-list-empty">暂无任务</div>
                ) : (
                    data.map(renderTaskItem)
                )}
            </div>
            {total > 0 && (
                <div className="task-pagination">
                    <span className="task-pagination-info">共 {total} 条</span>
                    <Space>
                        <Button
                            size="small"
                            disabled={page <= 1}
                            onClick={() => { setPage(page - 1); fetchData(page - 1, pageSize); }}
                        >
                            上一页
                        </Button>
                        <span>{page} / {Math.ceil(total / pageSize)}</span>
                        <Button
                            size="small"
                            disabled={page >= Math.ceil(total / pageSize)}
                            onClick={() => { setPage(page + 1); fetchData(page + 1, pageSize); }}
                        >
                            下一页
                        </Button>
                    </Space>
                </div>
            )}
        </Drawer>
    );
});

TaskCenter.displayName = 'TaskCenter';

export default TaskCenter;
