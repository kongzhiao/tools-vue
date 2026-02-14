import { request } from '@umijs/max';

/** 获取类别额度列表 */
export async function getCategoryQuotas(params: {
    year?: number;
    category?: string;
    page?: number;
    page_size?: number;
}) {
    return request('/api/yf-category-quotas', {
        method: 'GET',
        params,
    });
}

/** 创建类别额度 */
export async function createCategoryQuota(data: any) {
    return request('/api/yf-category-quotas', {
        method: 'POST',
        data,
    });
}

/** 更新类别额度 */
export async function updateCategoryQuota(id: number, data: any) {
    return request(`/api/yf-category-quotas/${id}`, {
        method: 'PUT',
        data,
    });
}

/** 删除类别额度 */
export async function deleteCategoryQuota(id: number) {
    return request(`/api/yf-category-quotas/${id}`, {
        method: 'DELETE',
    });
}

/** 获取所有年份 */
export async function getQuotaYears() {
    return request('/api/yf-category-quotas/years', {
        method: 'GET',
    });
}

/** 根据年份获取已配置的优抚类别 */
export async function getQuotaCategories(params: { year: number }) {
    return request('/api/yf-category-quotas/categories', {
        method: 'GET',
        params,
    });
}

/** 克隆年度数据 */
export async function cloneCategoryQuotas(data: { from_year: number; to_year: number }) {
    return request('/api/yf-category-quotas/clone', {
        method: 'POST',
        data,
    });
}

/** 获取结算明细列表 */
export async function getYfSettlements(params: any) {
    return request('/api/yf-settlements', {
        method: 'GET',
        params,
    });
}

/** 获取结算统计 */
export async function getYfSettlementStats(params: any) {
    return request('/api/yf-settlements/statistics', {
        method: 'GET',
        params,
    });
}

/** 标记支付 (单条) */
export async function markYfPay(id: number, data: { pay_status?: number; pay_at?: string; remark?: string }) {
    return request(`/api/yf-settlements/${id}/pay`, {
        method: 'PUT',
        data,
    });
}

/** 批量标记支付 */
export async function batchMarkYfPay(data: { ids: number[]; pay_status?: number; pay_at?: string; remark?: string }) {
    return request('/api/yf-settlements/batch-pay', {
        method: 'POST',
        data,
    });
}

/** 异步导入结算明细 */
export async function importYfSettlements(data: FormData) {
    return request('/api/yf-settlements/import', {
        method: 'POST',
        data,
    });
}

/** 异步导出结算明细 */
export async function exportYfSettlements(params: any) {
    return request('/api/yf-settlements/export', {
        method: 'GET',
        params,
    });
}

/** 异步导出结算台账 */
export async function exportYfLedger(params: any) {
    return request('/api/yf-settlements/export-ledger', {
        method: 'GET',
        params,
    });
}

/** 批量重新计算 */
export async function recalculateYfSettlements(data: any) {
    return request('/api/yf-settlements/recalculate', {
        method: 'POST',
        data,
    });
}
