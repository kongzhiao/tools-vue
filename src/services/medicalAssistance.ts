import { request } from '@umijs/max';

// 患者信息接口
export interface Patient {
  id: number;
  name: string;
  id_card: string;
  insurance_area: string;
  created_at: string;
  updated_at: string;
}

// 就诊记录接口
export interface MedicalRecord {
  id: number;
  person_id: number;
  hospital_name: string;
  visit_type: string;
  admission_date: string;
  discharge_date?: string;
  settlement_date?: string;
  total_cost: number;
  policy_covered_cost: number;
  pool_reimbursement_amount: number;
  large_amount_reimbursement_amount: number;
  critical_illness_reimbursement_amount: number;
  medical_assistance_amount: number;
  excess_reimbursement_amount: number;
  processing_status: 'unreimbursed' | 'reimbursed' | 'returned';
  created_at: string;
  updated_at: string;
}

// 报销明细接口
export interface ReimbursementDetail {
  id: number;
  person_id: number;
  medical_record_ids: number[];
  bank_name: string;
  bank_account: string;
  account_name: string;
  total_amount: number;
  policy_covered_amount: number;
  pool_reimbursement_amount: number;
  large_amount_reimbursement_amount: number;
  critical_illness_reimbursement_amount: number;
  pool_reimbursement_ratio: number;
  large_amount_reimbursement_ratio: number;
  critical_illness_reimbursement_ratio: number;
  reimbursement_status: 'pending' | 'processed' | 'void';
  created_at: string;
  updated_at: string;
  medical_records: MedicalRecord[];
  person_info: Patient;
}

// 分页响应接口
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

// 统计信息接口
export interface ReimbursementStatistics {
  total_count: number;
  pending_count: number;
  processed_count: number;
  void_count: number;
  total_amount: string;
  pool_amount: string;
  large_amount: string;
  critical_illness_amount: string;
}

// 患者管理API
export const patientAPI = {
  // 获取患者列表
  getPatients: (params: {
    page?: number;
    page_size?: number;
    name?: string;
    id_card?: string;
    insurance_area?: string;
  }) => request<{ code: number; message: string; data: PaginatedResponse<Patient> }>('/api/medical-assistance/patients', {
    method: 'GET',
    params,
  }),

  // 创建患者
  createPatient: (data: Partial<Patient>) => request<{ code: number; message: string; data: Patient }>('/api/medical-assistance/patients', {
    method: 'POST',
    data,
  }),

  // 获取患者详情
  getPatient: (id: number) => request<{ code: number; message: string; data: Patient }>(`/api/medical-assistance/patients/${id}`, {
    method: 'GET',
  }),

  // 更新患者
  updatePatient: (id: number, data: Partial<Patient>) => request<{ code: number; message: string; data: Patient }>(`/api/medical-assistance/patients/${id}`, {
    method: 'PUT',
    data,
  }),

  // 删除患者
  deletePatient: (id: number, cascade: boolean = false) => request<{ code: number; message: string; data: null }>(`/api/medical-assistance/patients/${id}`, {
    method: 'DELETE',
    params: { cascade },
  }),

  /**
   * 批量删除患者
   * @param ids 患者ID数组
   * @param cascade 是否级联删除关联记录
   */
  batchDeletePatients: (ids: number[], cascade: boolean = false) => {
    return request('/api/medical-assistance/patients/batch-delete', {
      method: 'POST',
      data: { ids, cascade },
    });
  },

  // 获取参保地区
  getInsuranceAreas: () => request<{ code: number; message: string; data: string[] }>('/api/medical-assistance/patients/insurance-areas', {
    method: 'GET',
  }),

  // 获取患者完整信息
  getPatientCompleteInfo: (id: number) => request<{ code: number; message: string; data: any }>(`/api/medical-assistance/patients/${id}/complete-info`, {
    method: 'GET',
  }),
};

// 就诊记录管理API
export const medicalRecordAPI = {
  // 获取就诊记录列表
  getMedicalRecords: (params: {
    page?: number;
    page_size?: number;
    person_id?: number;
    hospital_name?: string;
    visit_type?: string;
    processing_status?: string;
    admission_date_start?: string;
    admission_date_end?: string;
  }) => request<{ code: number; message: string; data: PaginatedResponse<MedicalRecord> }>('/api/medical-assistance/medical-records', {
    method: 'GET',
    params,
  }),

  // 根据身份证号获取就诊记录
  getMedicalRecordsByIdCard: (idCard: string) => request<{ code: number; message: string; data: { patient: Patient; records: MedicalRecord[] } }>('/api/medical-assistance/medical-records/by-id-card', {
    method: 'GET',
    params: { id_card: idCard },
  }),

  // 创建就诊记录
  createMedicalRecord: (data: Partial<MedicalRecord>) => request<{ code: number; message: string; data: MedicalRecord }>('/api/medical-assistance/medical-records', {
    method: 'POST',
    data,
  }),

  // 获取就诊记录详情
  getMedicalRecord: (id: number) => request<{ code: number; message: string; data: MedicalRecord }>(`/api/medical-assistance/medical-records/${id}`, {
    method: 'GET',
  }),

  // 更新就诊记录
  updateMedicalRecord: (id: number, data: Partial<MedicalRecord>) => request<{ code: number; message: string; data: MedicalRecord }>(`/api/medical-assistance/medical-records/${id}`, {
    method: 'PUT',
    data,
  }),

  // 删除就诊记录
  deleteMedicalRecord: (id: number) => request<{ code: number; message: string; data: null }>(`/api/medical-assistance/medical-records/${id}`, {
    method: 'DELETE',
  }),

  // 批量删除就诊记录
  batchDeleteMedicalRecords: (ids: number[]) => request<{ 
    code: number; 
    message: string; 
    data: {
      deleted_medical_records: number[];
      deleted_reimbursements: number[];
      updated_reimbursements: number[];
      deleted_count: number;
    } 
  }>('/api/medical-assistance/medical-records/batch-delete', {
    method: 'POST',
    data: { ids },
  }),

  // 获取就诊类别
  getVisitTypes: () => request<{ code: number; message: string; data: string[] }>('/api/medical-assistance/medical-records/visit-types', {
    method: 'GET',
  }),

  // 获取医院名称
  getHospitals: () => request<{ code: number; message: string; data: string[] }>('/api/medical-assistance/medical-records/hospitals', {
    method: 'GET',
  }),

  // 获取处理状态
  getProcessingStatuses: () => request<{ code: number; message: string; data: string[] }>('/api/medical-assistance/medical-records/processing-statuses', {
    method: 'GET',
  }),

  // 批量更新状态
  batchUpdateStatus: (data: { ids: number[]; processing_status: string }) => request<{ code: number; message: string; data: { updated_count: number } }>('/api/medical-assistance/medical-records/batch-update-status', {
    method: 'POST',
    data,
  }),
};

// 报销管理API
export const reimbursementAPI = {
  // 获取报销明细列表
  getReimbursements: (params: {
    page?: number;
    page_size?: number;
    person_id?: number;
    medical_record_id?: number;
    bank_name?: string;
    reimbursement_status?: string;
    account_name?: string;
  }) => request<{ code: number; message: string; data: PaginatedResponse<ReimbursementDetail> }>('/api/medical-assistance/reimbursements', {
    method: 'GET',
    params,
  }),

  // 创建报销明细
  createReimbursement: (data: Partial<ReimbursementDetail>) => request<{ code: number; message: string; data: ReimbursementDetail }>('/api/medical-assistance/reimbursements', {
    method: 'POST',
    data,
  }),

  // 获取报销明细详情
  getReimbursement: (id: number) => request<{ code: number; message: string; data: ReimbursementDetail }>(`/api/medical-assistance/reimbursements/${id}`, {
    method: 'GET',
  }),

  // 更新报销明细
  updateReimbursement: (id: number, data: Partial<ReimbursementDetail>) => request<{ code: number; message: string; data: ReimbursementDetail }>(`/api/medical-assistance/reimbursements/${id}`, {
    method: 'PUT',
    data,
  }),

  // 删除报销明细
  deleteReimbursement: (id: number) => request<{ code: number; message: string; data: null }>(`/api/medical-assistance/reimbursements/${id}`, {
    method: 'DELETE',
  }),

  // 获取银行名称
  getBanks: () => request<{ code: number; message: string; data: string[] }>('/api/medical-assistance/reimbursements/banks', {
    method: 'GET',
  }),

  // 获取报销状态
  getReimbursementStatuses: () => request<{ code: number; message: string; data: string[] }>('/api/medical-assistance/reimbursements/statuses', {
    method: 'GET',
  }),

  // 获取报销统计
  getStatistics: () => request<{ code: number; message: string; data: ReimbursementStatistics }>('/api/medical-assistance/reimbursements/statistics', {
    method: 'GET',
  }),

  // 批量更新状态
  batchUpdateStatus: (data: { ids: number[]; reimbursement_status: string }) => request<{ code: number; message: string; data: { updated_count: number } }>('/api/medical-assistance/reimbursements/batch-update-status', {
    method: 'POST',
    data,
  }),

  // 批量创建报销明细
  batchCreateReimbursements: (data: {
    person_id: number;
    medical_record_ids: number[];
    bank_name: string;
    bank_account: string;
    account_name: string;
    reimbursement_status: string;
  }) => request<{ code: number; message: string; data: ReimbursementDetail }>('/api/medical-assistance/reimbursements/batch-create', {
    method: 'POST',
    data,
  }),

  // 导出受理台账
  exportLedger: (filters?: Record<string, any>) => request<{ code: number; message: string; data: { filename: string; content: string; content_type: string } }>('/api/medical-assistance/reimbursements/export-ledger', {
    method: 'GET',
    params: filters,
  }),
};

// Excel导入API
export const importAPI = {
  // 导入Excel文件
  importExcel: (file: File) => {
    const formData = new FormData();
    formData.append('excel_file', file);
    
    return request<{ code: number; message: string; data: any }>('/api/medical-assistance/import-excel', {
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
}; 