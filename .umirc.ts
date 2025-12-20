import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {
    // 更新 Ant Design 配置
    configProvider: {
      button: {
        autoInsertSpace: false,
      },
    },
  },
  access: {},
  model: {},
  initialState: {},
  request: {},
  // 添加代理配置
  proxy: {
    '/api': {
      target: process.env.NODE_ENV === 'test'
        ? 'http://47.109.34.185:9510'
        : process.env.NODE_ENV === 'production'
          ? 'https://api.example.com'
          : 'http://localhost:9501',
      changeOrigin: true,
      secure: false,
    },
  },
  // 添加define配置，在构建时注入环境变量
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    // 移除API_BASE_URL的define配置，避免与我们的配置系统冲突
  },
  layout: {
    title: '共享救助信息服务平台2',
  },
  // 简化配置，移除有问题的 chainWebpack
  jsMinifier: 'terser',
  jsMinifierOptions: {
    compress: {
      drop_console: true,
    },
  },
  // 禁用 MFSU
  mfsu: false,
  routes: [
    {
      path: '/login',
      component: './Login',
      layout: false,
      wrappers: ['@/wrappers/auth'],
    },
    {
      path: '/m/login',
      component: './mobile/Login',
      layout: false,
      wrappers: ['@/wrappers/auth'],
    },
    {
      path: '/m',
      component: '@/layouts/MobileLayout',
      routes: [
        {
          path: '/m',
          redirect: '/m/medical/reimbursement',
        },
        {
          path: '/m/medical/reimbursement',
          component: './mobile/Medical/Reimbursement',
          wrappers: ['@/wrappers/auth'],
        },
      ],
    },
    {
      path: '/',
      redirect: '/dashboard',
      wrappers: ['@/wrappers/auth'],
    },
    {
      name: '仪表板',
      path: '/dashboard',
      component: './Dashboard',
      icon: 'HomeOutlined',
    },
    {
      name: '用户管理',
      path: '/user-management',
      icon: 'TeamOutlined',
      routes: [
        {
          name: '账户管理',
          path: 'accounts',
          component: './User',
          access: 'canAccessUser',
        },
        {
          name: '角色管理',
          path: 'roles',
          component: './Role',
          access: 'canAccessRole',
        },
        {
          name: '权限管理',
          path: 'permissions',
          component: './Permission',
          access: 'canAccessPermission',
        },
      ],
    },
    {
      name: '业务配置',
      path: '/business-config',
      icon: 'SettingOutlined',
      routes: [
        {
          name: '类别转换配置',
          path: 'config/category-conversion',
          component: './BussinessConfig/CategoryConversion',
          access: 'canAccessCategoryConversion',
        },
        {
          name: '参保档次配置',
          path: 'config/insurance-level-config',
          component: './BussinessConfig/InsuranceLevelConfig',
          access: 'canAccessInsuranceLevelConfig',
        },
        /** 优抚救助 2025-12-20 */
        {
          name: '类别额度配置',
          path: 'config/category-money-config',
          component: './BussinessConfig/CategoryMoneyConfig',
          access: 'canAccessCategoryMoneyConfig',
        },
      ],
    },
    {
      name: '数据核实',
      path: '/data-verification',
      icon: 'AuditOutlined',
      routes: [
        {
          name: '参保数据管理',
          path: 'insurance-data',
          component: './DataVerification/InsuranceData',
          access: 'canAccessInsuranceData',
        },
        /*
        {
          name: '身份信息核实',
          path: 'identity-verification',
          component: './DataVerification/IdentityVerification',
          access: 'canAccessIdentityVerification',
        },*/
        {
          name: '税务数据汇总',
          path: 'tax-summary',
          component: './DataVerification/TaxSummary',
          access: 'canAccessTaxSummary',
        },
        {
          name: '参保数据汇总',
          path: 'insurance-summary',
          component: './DataVerification/InsuranceSummary',
          access: 'canAccessInsuranceSummary',
        },
      ],
    },
    // 添加统计汇总路由
    {
      name: '统计汇总',
      path: '/statistics-summary',
      icon: 'BarChartOutlined',
      component: './StatisticsSummary',
      access: 'canAccessStatisticsSummary',
    },
    // 添加救助报销路由
    {
      name: '救助报销',
      path: '/medical-assistance',
      icon: 'MedicineBoxOutlined',
      routes: [
        {
          name: '受理记录',
          path: 'reimbursement',
          component: './MedicalAssistance/Reimbursement',
          access: 'canAccessReimbursementManagement',
        },
        {
          name: '就诊记录',
          path: 'records',
          component: './MedicalAssistance/Records',
          access: 'canAccessMedicalRecords',
        },
        {
          name: '患者管理',
          path: 'patients',
          component: './MedicalAssistance/Patients',
          access: 'canAccessPatientManagement',
        },
      ],
    },

    /** 优抚救助 2025-12-20 */
    {
      name: '联网结算',
      path: '/yf/settlement-online',
      component: './YfSettlement/Online',
      icon: 'GlobalOutlined',
    },
    {
      name: '非联网结算',
      path: '/yf/settlement-offline',
      component: './YfSettlement/Offline',
      icon: 'LogoutOutlined',
    },
    {
      name: '结算台账',
      path: '/yf/settlement-account',
      component: './YfSettlement/Account',
      icon: 'MoneyCollectOutlined',
    },
  ],
  npmClient: 'pnpm',
});