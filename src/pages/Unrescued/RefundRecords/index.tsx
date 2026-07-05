import React from 'react';
import LedgerPage from '../components/LedgerPage';
import {
  executeRefundWash,
  exportRefundRecords,
  getRefundRecords,
  getRefundStatistics,
  getRefundWashConfig,
  getRefundWashStatus,
  importRefundDetail,
  importRefundObject,
  saveRefundWashConfig,
} from '@/services/unrescued';

const RefundRecords: React.FC = () => (
  <LedgerPage
    kind="refund"
    title="应补应退明细"
    primaryImportLabel="导入应补应退明细"
    primaryImport={importRefundDetail}
    objectImport={importRefundObject}
    list={getRefundRecords}
    statistics={getRefundStatistics}
    washConfig={getRefundWashConfig}
    saveWashConfig={saveRefundWashConfig}
    executeWash={executeRefundWash}
    washStatus={getRefundWashStatus}
    exportData={exportRefundRecords}
  />
);

export default RefundRecords;
