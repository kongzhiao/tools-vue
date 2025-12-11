import React from 'react';
import { Outlet } from '@umijs/max';
import styles from './index.less';

const MobileLayout: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
};

export default MobileLayout; 