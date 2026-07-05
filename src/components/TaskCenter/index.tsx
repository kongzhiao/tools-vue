import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback, useRef } from 'react';
import { Drawer, Tag, Button, Space, Tooltip, Calendar, TimePicker, Modal, Popover, message } from 'antd';
import { ReloadOutlined, DownloadOutlined, CloseOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
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

const buildRecentRange = (days: number): [Dayjs, Dayjs] => [
    dayjs().subtract(days - 1, 'day').startOf('day'),
    dayjs().endOf('day'),
];

const QUICK_RANGES = [
    { label: '近7天', value: () => buildRecentRange(7) },
    { label: '近30天', value: () => buildRecentRange(30) },
    { label: '近90天', value: () => buildRecentRange(90) },
    { label: '本月', value: () => [dayjs().startOf('month'), dayjs().endOf('day')] as [Dayjs, Dayjs] },
    { label: '上月', value: () => [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] as [Dayjs, Dayjs] },
    { label: '本年', value: () => [dayjs().startOf('year'), dayjs().endOf('day')] as [Dayjs, Dayjs] },
];

const formatRangeTime = (range: [Dayjs, Dayjs]) => [
    range[0].format('YYYY-MM-DD HH:mm:ss'),
    range[1].format('YYYY-MM-DD HH:mm:ss'),
];

const resolveQuickDays = (range: [Dayjs, Dayjs]) => {
    const [startAt, endAt] = formatRangeTime(range);
    const matched = QUICK_RANGES.find(item => {
        const [quickStartAt, quickEndAt] = formatRangeTime(item.value());
        return startAt === quickStartAt && endAt === quickEndAt;
    });
    return matched?.label || '';
};

const mergeDateAndTime = (date: Dayjs, time: Dayjs) => date
    .hour(time.hour())
    .minute(time.minute())
    .second(time.second());

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const waitMinimum = async (startedAt: number, minDuration = 400) => {
    const remaining = minDuration - (Date.now() - startedAt);
    if (remaining > 0) await delay(remaining);
};

const rangeDateClassName = (date: Dayjs, range: [Dayjs, Dayjs]) => {
    const current = date.startOf('day').valueOf();
    const start = range[0].startOf('day').valueOf();
    const end = range[1].startOf('day').valueOf();
    const classNames = ['task-center-calendar-date-cell'];
    if (current >= start && current <= end) classNames.push('in-range');
    if (current === start) classNames.push('range-start');
    if (current === end) classNames.push('range-end');
    return classNames.join(' ');
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
    const [quickLabel, setQuickLabel] = useState('近30天');
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(() => buildRecentRange(30));
    const [pendingRange, setPendingRange] = useState<[Dayjs, Dayjs]>(() => buildRecentRange(30));
    const [rangeOpen, setRangeOpen] = useState(false);
    const [rangeApplying, setRangeApplying] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const lastTaskStatuses = useRef<Record<string, string>>({});

    // 获取任务列表
    const fetchData = useCallback(async (
        currentPage = page,
        currentPageSize = pageSize,
        range: [Dayjs, Dayjs] = dateRange,
    ) => {
        setLoading(true);
        try {
            const res = await getTaskList({
                page: currentPage,
                page_size: currentPageSize,
                start_at: range[0].format('YYYY-MM-DD HH:mm:ss'),
                end_at: range[1].format('YYYY-MM-DD HH:mm:ss'),
            });
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
    }, [page, pageSize, dateRange]);

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
            setPage(1);
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

    const openRangePicker = () => {
        setPendingRange(dateRange);
        setRangeOpen(true);
    };

    const applyQuickRange = (range: [Dayjs, Dayjs]) => {
        setPendingRange(range);
    };

    const applyRange = async () => {
        if (!pendingRange?.[0] || !pendingRange?.[1]) {
            message.warning('请选择开始时间和结束时间');
            return;
        }
        if (pendingRange[0].isAfter(pendingRange[1])) {
            message.warning('开始时间不能晚于结束时间');
            return;
        }
        const nextRange: [Dayjs, Dayjs] = [pendingRange[0], pendingRange[1]];
        setQuickLabel(resolveQuickDays(nextRange));
        setDateRange(nextRange);
        setPage(1);
        setRangeApplying(true);
        const startedAt = Date.now();
        try {
            await fetchData(1, pageSize, nextRange);
            await waitMinimum(startedAt);
            setRangeOpen(false);
        } finally {
            setRangeApplying(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        const startedAt = Date.now();
        try {
            await fetchData(page, pageSize);
            await fetchCount();
            await waitMinimum(startedAt);
        } finally {
            setRefreshing(false);
        }
    };

    const rangeLabel = quickLabel
        ? quickLabel
        : `${dateRange[0].format('YYYY-MM-DD HH:mm')} ~ ${dateRange[1].format('YYYY-MM-DD HH:mm')}`;

    const rangeContent = (
        <div className="task-center-range-panel">
            <div className="task-center-range-presets">
                {QUICK_RANGES.map(item => (
                    <Button
                        key={item.label}
                        type={resolveQuickDays(pendingRange) === item.label ? 'primary' : 'text'}
                        block
                        onClick={() => applyQuickRange(item.value())}
                    >
                        {item.label}
                    </Button>
                ))}
            </div>
            <div className="task-center-range-main">
                <div className="task-center-calendar-grid">
                    <div className="task-center-calendar-panel">
                        <div className="task-center-range-label">开始日期</div>
                        <Calendar
                            fullscreen={false}
                            value={pendingRange[0]}
                            onSelect={value => setPendingRange([mergeDateAndTime(value, pendingRange[0]), pendingRange[1]])}
                            fullCellRender={(current, info) => info.type === 'date' ? (
                                <div className={rangeDateClassName(current, pendingRange)}>
                                    <span>{current.date()}</span>
                                </div>
                            ) : info.originNode}
                        />
                        <div className="task-center-time-row">
                            <span>开始时间</span>
                            <TimePicker
                                allowClear={false}
                                value={pendingRange[0]}
                                format="HH:mm:ss"
                                onChange={value => value && setPendingRange([mergeDateAndTime(pendingRange[0], value), pendingRange[1]])}
                                popupClassName="task-center-date-dropdown"
                            />
                        </div>
                    </div>
                    <div className="task-center-calendar-panel">
                        <div className="task-center-range-label">结束日期</div>
                        <Calendar
                            fullscreen={false}
                            value={pendingRange[1]}
                            onSelect={value => setPendingRange([pendingRange[0], mergeDateAndTime(value, pendingRange[1])])}
                            fullCellRender={(current, info) => info.type === 'date' ? (
                                <div className={rangeDateClassName(current, pendingRange)}>
                                    <span>{current.date()}</span>
                                </div>
                            ) : info.originNode}
                        />
                        <div className="task-center-time-row">
                            <span>结束时间</span>
                            <TimePicker
                                allowClear={false}
                                value={pendingRange[1]}
                                format="HH:mm:ss"
                                onChange={value => value && setPendingRange([pendingRange[0], mergeDateAndTime(pendingRange[1], value)])}
                                popupClassName="task-center-date-dropdown"
                            />
                        </div>
                    </div>
                </div>
                <div className="task-center-range-actions">
                    <Button size="small" onClick={() => setRangeOpen(false)}>取消</Button>
                    <Button size="small" type="primary" loading={rangeApplying} onClick={applyRange}>确定</Button>
                </div>
            </div>
        </div>
    );

    // 处理下载
    const handleDownload = (record: TaskItem) => {
        // 构建完整的下载 URL (使用 UUID 中转)
        Modal.confirm({
            centered: true,
            title: '确定下载该任务文件吗？',
            content: (
                <div>
                    <div style={{ marginBottom: 8 }}>请确认要下载以下任务生成的文件：</div>
                    <div style={{ color: '#1f2937', wordBreak: 'break-all' }}>{record.title}</div>
                </div>
            ),
            okText: '确认下载',
            cancelText: '取消',
            onOk: () => {
                const downloadUrl = `${config.apiBaseUrl}/api/download?uuid=${record.uuid}`;
                window.open(downloadUrl, '_blank');
            },
        });
    };

    // 渲染单个任务卡片
    const renderTaskItem = (record: TaskItem) => {
        const statusConfig = STATUS_CONFIG[record.status] || { color: 'default', text: record.status };
        const isCompleted = record.status === 'completed';
        const percent = record.progress || 0;

        // 计算有效期（url_at + 7天）。只有有文件产出的任务才展示下载相关信息。
        const urlAt = record.url_at || record.updated_at;
        const expiredTime = record.url_at ? dayjs(record.url_at).add(7, 'days') : null;
        const isExpired = expiredTime ? dayjs().isAfter(expiredTime) : false;
        const hasFile = Boolean(record.has_file);
        const canDownload = isCompleted && hasFile && !isExpired;

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
                {record.status === 'failed' && record.failure_reason && (
                    <Tooltip title={record.failure_reason} placement="topLeft">
                        <div className="task-failure-reason">
                            <span className="task-failure-label">失败原因：</span>
                            <span className="task-failure-text">{record.failure_reason}</span>
                        </div>
                    </Tooltip>
                )}
                <div className="task-item-footer">
                    <div className="task-item-info">
                        <span className="task-item-time">{record.created_at}</span>
                        {isCompleted && hasFile && expiredTime && (
                            <span className={`task-expire-time ${isExpired ? 'expired' : ''}`}>
                                {isExpired ? '已过期' : `有效期至: ${expiredTime.format('MM-DD HH:mm')}`}
                            </span>
                        )}
                    </div>
                    {hasFile && (
                        <Tooltip title={isExpired ? "文件已过期(7天)" : canDownload ? "下载文件" : "文件未就绪"}>
                            <Button
                                type="link"
                                size="small"
                                icon={<DownloadOutlined />}
                                disabled={!canDownload}
                                onClick={() => canDownload && handleDownload(record)}
                                style={{ color: canDownload ? '#1890ff' : '#d9d9d9' }}
                            >
                                {isExpired ? '已过期' : '下载'}
                            </Button>
                        </Tooltip>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Drawer
            title={
                <div className="task-center-header">
                    <span>任务中心</span>
                    <div className="task-center-header-actions">
                        <Popover
                            trigger="click"
                            placement="bottomRight"
                            open={rangeOpen}
                            onOpenChange={open => open ? openRangePicker() : setRangeOpen(false)}
                            content={rangeContent}
                            overlayClassName="task-center-range-popover"
                            getPopupContainer={() => document.body}
                        >
                            <Button className="task-center-range-button" icon={<CalendarOutlined />} onClick={openRangePicker}>
                                <span className="task-center-range-text">{rangeLabel}</span>
                            </Button>
                        </Popover>
                        <Button
                            type="text"
                            icon={<ReloadOutlined />}
                            onClick={handleRefresh}
                            loading={refreshing}
                        />
                    </div>
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
