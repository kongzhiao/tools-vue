import { request } from '@umijs/max';

export interface TaskItem {
    uuid: string;
    title: string;
    progress: number;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    file_url: string | null;
    url_at: string | null;
    file_size: string | null;
    created_at: string;
    updated_at: string;
}

export interface TaskListResponse {
    code: number;
    message: string;
    data: {
        list: TaskItem[];
        total: number;
        page: number;
        page_size: number;
    };
}

export interface TaskCountResponse {
    code: number;
    message: string;
    data: {
        count: number;
    };
}

// 获取任务列表
export async function getTaskList(params: {
    page?: number;
    page_size?: number;
    status?: number;
}): Promise<TaskListResponse> {
    return request('/api/tasks', {
        method: 'GET',
        params,
    });
}

// 获取未完成任务数量
export async function getTaskCount(): Promise<TaskCountResponse> {
    return request('/api/tasks/count', {
        method: 'GET',
    });
}

// 获取单个任务进度
export async function getTaskProgress(uuid: string) {
    return request('/api/tasks/progress', {
        method: 'GET',
        params: { uuid },
    });
}
