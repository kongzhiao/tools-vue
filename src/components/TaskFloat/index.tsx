import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Badge, Tooltip } from 'antd';
import { CloudDownloadOutlined } from '@ant-design/icons';
import { getTaskCount } from '@/services/task';
import TaskCenter, { TaskCenterRef } from '@/components/TaskCenter';
import './TaskFloat.less';

const TaskFloat: React.FC = () => {
    const taskCenterRef = useRef<TaskCenterRef>(null);
    const [taskCount, setTaskCount] = useState(0);
    const [isPolling, setIsPolling] = useState(false);

    // 拖动相关状态
    const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [hasDragged, setHasDragged] = useState(false); // 是否发生过拖动
    const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

    // 获取任务数量
    const fetchCount = useCallback(async () => {
        try {
            const res = await getTaskCount();
            if (res.code === 200) {
                setTaskCount(res.data.count);
                setIsPolling(res.data.count > 0);
                return res.data.count;
            }
        } catch (error) {
            console.error('获取任务数量失败:', error);
        }
        return 0;
    }, []);

    // 初始化
    useEffect(() => {
        fetchCount();
    }, [fetchCount]);

    // 轮询逻辑：只有有未完成任务时才轮询
    useEffect(() => {
        if (!isPolling) return;

        const timer = setInterval(() => {
            fetchCount();
        }, 3000);

        return () => clearInterval(timer);
    }, [isPolling, fetchCount]);

    // 监听全局事件
    useEffect(() => {
        const handleOpen = () => {
            fetchCount();
            setIsPolling(true);
            taskCenterRef.current?.open();
        };
        const handleRefresh = () => {
            fetchCount();
            setIsPolling(true);
        };
        window.addEventListener('openTaskCenter', handleOpen);
        window.addEventListener('refreshTaskCount', handleRefresh);
        return () => {
            window.removeEventListener('openTaskCenter', handleOpen);
            window.removeEventListener('refreshTaskCount', handleRefresh);
        };
    }, [fetchCount]);

    // 处理任务数量变化
    const handleCountChange = (count: number) => {
        setTaskCount(count);
        setIsPolling(count > 0);
    };

    // 拖动开始
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setHasDragged(false);
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startPosX: position.x,
            startPosY: position.y,
        };
    };

    // 拖动中
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !dragRef.current) return;

            const dx = e.clientX - dragRef.current.startX;
            const dy = e.clientY - dragRef.current.startY;

            // 如果移动超过5px，认为是拖动
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                setHasDragged(true);
            }

            setPosition({
                x: Math.max(0, Math.min(window.innerWidth - 60, dragRef.current.startPosX + dx)),
                y: Math.max(0, Math.min(window.innerHeight - 60, dragRef.current.startPosY + dy)),
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            dragRef.current = null;
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // 点击打开任务中心（只有非拖动时才触发）
    const handleClick = () => {
        if (!hasDragged) {
            taskCenterRef.current?.open();
        }
    };

    return (
        <>
            <div
                className={`task-float-bubble ${isDragging ? 'dragging' : ''}`}
                style={{ left: position.x, top: position.y }}
                onMouseDown={handleMouseDown}
                onClick={handleClick}
            >
                <Tooltip title="任务中心" placement="right">
                    <Badge count={taskCount} size="small" offset={[-2, 2]}>
                        <CloudDownloadOutlined className="task-float-icon" />
                    </Badge>
                </Tooltip>
            </div>

            {/* 任务中心抽屉 */}
            <TaskCenter ref={taskCenterRef} onCountChange={handleCountChange} />
        </>
    );
};

export default TaskFloat;
