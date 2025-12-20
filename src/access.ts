export default (initialState: {
  name: string;
  currentUser?: {
    id: number;
    username: string;
    nickname: string;
    permissions: string[];
  };
}) => {
  const { currentUser } = initialState || {};
  // 确保 permissions 是数组
  const permissions = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];

  const isAdmin = currentUser?.username === 'admin' || currentUser?.nickname === '超级管理员';

  const hasPermission = (permission: string) => {
    if (!Array.isArray(permissions)) return false;
    return isAdmin || permissions.includes(permission) || permissions.includes('*');
  };

  const hasModulePermission = (module: string) => {
    if (!Array.isArray(permissions)) return false;
    try {
      return isAdmin ||
             permissions.includes('*') ||
             permissions.some((p: string) => p && typeof p === 'string' && p.startsWith(`${module}:`));
    } catch (error) {
      console.error('权限检查错误:', error);
      return false;
    }
  };

  return {
    canSeeAdmin: !!(initialState && initialState.name !== 'dontHaveAccess'),
    
    // 用户管理权限
    canReadUser: hasPermission('账户管理:查看'),
    canCreateUser: hasPermission('账户管理:创建'),
    canUpdateUser: hasPermission('账户管理:编辑'),
    canDeleteUser: hasPermission('账户管理:删除'),
    canAccessUser: hasModulePermission('账户管理'),
    
    // 角色管理权限
    canReadRole: hasPermission('角色管理:查看'),
    canCreateRole: hasPermission('角色管理:创建'),
    canUpdateRole: hasPermission('角色管理:编辑'),
    canDeleteRole: hasPermission('角色管理:删除'),
    canAccessRole: hasModulePermission('角色管理'),
    canAssignRole: hasPermission('角色管理:分配权限'),
    
    // 权限管理权限
    canReadPermission: hasPermission('权限管理:查看'),
    canCreatePermission: hasPermission('权限管理:创建'),
    canUpdatePermission: hasPermission('权限管理:编辑'),
    canDeletePermission: hasPermission('权限管理:删除'),
    canAccessPermission: hasModulePermission('权限管理'),
    
    // 仪表板权限 - 所有已登录用户都可以访问
    canAccessDashboard: !!currentUser,
    
    // 业务配置权限
    canAccessBusinessConfig: hasModulePermission('业务配置'),
    
    // 类别转换权限
    canReadCategoryConversion: hasPermission('类别转换配置:查看'),
    canCreateCategoryConversion: hasPermission('类别转换配置:创建'),
    canUpdateCategoryConversion: hasPermission('类别转换配置:编辑'),
    canDeleteCategoryConversion: hasPermission('类别转换配置:删除'),
    canAccessCategoryConversion: hasModulePermission('类别转换配置'),
    
    // 参保档次权限
    canReadInsuranceLevel: hasPermission('参保档次配置:查看'),
    canCreateInsuranceLevel: hasPermission('参保档次配置:创建'),
    canUpdateInsuranceLevel: hasPermission('参保档次配置:编辑'),
    canDeleteInsuranceLevel: hasPermission('参保档次配置:删除'),
    canAccessInsuranceLevel: hasModulePermission('参保档次配置'),
    
    // 参保资助档次配置权限
    canReadInsuranceLevelConfig: hasPermission('参保档次配置:查看'),
    canCreateInsuranceLevelConfig: hasPermission('参保档次配置:创建'),
    canUpdateInsuranceLevelConfig: hasPermission('参保档次配置:编辑'),
    canDeleteInsuranceLevelConfig: hasPermission('参保档次配置:删除'),
    canAccessInsuranceLevelConfig: hasModulePermission('参保档次配置'),
    
    // 数据核实权限
    canReadInsuranceData: hasPermission('参保数据管理:查看'),
    canCreateInsuranceData: hasPermission('参保数据管理:创建'),
    canUpdateInsuranceData: hasPermission('参保数据管理:编辑'),
    canDeleteInsuranceData: hasPermission('参保数据管理:删除'),
    canExportInsuranceData: hasPermission('参保数据管理:导出'),
    canImportInsuranceData: hasPermission('参保数据管理:导入'),
    canAccessInsuranceData: hasModulePermission('参保数据管理'),
    
    canReadIdentityVerification: hasPermission('身份信息核实:查看'),
    canExecuteIdentityVerification: hasPermission('身份信息核实:执行'),
    canAccessIdentityVerification: hasModulePermission('身份信息核实'),
    
    canReadTaxSummary: hasPermission('税务数据汇总:查看'),
    canExportTaxSummary: hasPermission('税务数据汇总:导出'),
    canAccessTaxSummary: hasModulePermission('税务数据汇总'),
    
    canReadInsuranceSummary: hasPermission('参保数据汇总:查看'),
    canExportInsuranceSummary: hasPermission('参保数据汇总:导出'),
    canAccessInsuranceSummary: hasModulePermission('参保数据汇总'),

    // 统计汇总权限
    canReadStatisticsSummary: hasPermission('统计汇总:查看'),
    canCreateStatisticsSummary: hasPermission('统计汇总:创建'),
    canUpdateStatisticsSummary: hasPermission('统计汇总:编辑'),
    canDeleteStatisticsSummary: hasPermission('统计汇总:删除'),
    canExportStatisticsSummary: hasPermission('统计汇总:导出明细'),
    canExportStatisticsSummaryData: hasPermission('统计汇总:导出统计数据'),
    canImportStatisticsSummary: hasPermission('统计汇总:导入'),
    canClearStatisticsSummary: hasPermission('统计汇总:清空数据'),
    canBatchDeleteStatisticsSummary: hasPermission('统计汇总:批量删除'),
    canAccessStatisticsSummary: hasModulePermission('统计汇总'),
    
    // 救助报销权限
    canReadMedicalAssistance: hasPermission('救助报销:查看'),
    canCreateMedicalAssistance: hasPermission('救助报销:创建'),
    canUpdateMedicalAssistance: hasPermission('救助报销:编辑'),
    canDeleteMedicalAssistance: hasPermission('救助报销:删除'),
    canAccessMedicalAssistance: hasModulePermission('救助报销'),
    
    // 患者管理权限
    canReadPatientManagement: hasPermission('患者管理:查看'),
    canCreatePatientManagement: hasPermission('患者管理:创建'),
    canUpdatePatientManagement: hasPermission('患者管理:编辑'),
    canDeletePatientManagement: hasPermission('患者管理:删除'),
    canExportPatientManagement: hasPermission('患者管理:导出'),
    canAccessPatientManagement: hasModulePermission('患者管理'),
    
    // 就诊记录权限
    canReadMedicalRecords: hasPermission('就诊记录:查看'),
    canCreateMedicalRecords: hasPermission('就诊记录:创建'),
    canUpdateMedicalRecords: hasPermission('就诊记录:编辑'),
    canDeleteMedicalRecords: hasPermission('就诊记录:删除'),
    canBatchDeleteMedicalRecords: hasPermission('就诊记录:批量删除'),
    canExportMedicalRecords: hasPermission('就诊记录:导出'),
    canAccessMedicalRecords: hasModulePermission('就诊记录'),
    
    // 受理记录权限
    canReadReimbursementManagement: hasPermission('受理记录:查看'),
    canCreateReimbursementManagement: hasPermission('受理记录:创建'),
    canUpdateReimbursementManagement: hasPermission('受理记录:编辑'),
    canDeleteReimbursementManagement: hasPermission('受理记录:删除'),
    canExportReimbursementManagement: hasPermission('受理记录:导出'),
    canAccessReimbursementManagement: hasModulePermission('受理记录'),


    /** 优抚救助 2025-12-20 */
    // 类别额度配置
    canReadCategoryMoneyConfig: hasPermission('类别额度配置:查看'),
    canCreateCategoryMoneyConfig: hasPermission('类别额度配置:创建'),
    canUpdateCategoryMoneyConfig: hasPermission('类别额度配置:编辑'),
    canDeleteCategoryMoneyConfig: hasPermission('类别额度配置:删除'),
    canAccessCategoryMoneyConfig: hasModulePermission('类别额度配置'),

    // 联网结算
    canReadOnlineSettlement: hasPermission('联网结算:查看'),
    canImportOnlineSettlement: hasPermission('联网结算:导入'),
    canExportOnlineSettlement: hasPermission('联网结算:导出'),
    canTagOnlineSettlement: hasPermission('联网结算:标记'),
    canDeleteOnlineSettlement: hasPermission('联网结算:删除'),
    canAccessOnlineSettlement: hasModulePermission('联网结算'),
    
    // 非联网结算
    canReadOfflineSettlement: hasPermission('非联网结算:查看'),
    canImportOfflineSettlement: hasPermission('非联网结算:导入'),
    canExportOfflineSettlement: hasPermission('非联网结算:导出'),
    canTagOfflineSettlement: hasPermission('非联网结算:标记'),
    canDeleteOfflineSettlement: hasPermission('非联网结算:删除'),
    canAccessOfflineSettlement: hasModulePermission('非联网结算'),
    
    // 结算台账
    canReadSettlementAccount: hasPermission('结算台账:查看'),
    canImportSettlementAccount: hasPermission('结算台账:导入'),
    canExportSettlementAccount: hasPermission('结算台账:导出'),
    canTagSettlementAccount: hasPermission('结算台账:标记'),
    canDeleteSettlementAccount: hasPermission('结算台账:删除'),
    canAccessSettlementAccount: hasModulePermission('结算台账'),
    


    // 通用权限检查函数
    hasPermission,
    hasModulePermission,
  };
};
