import React from 'react';
import { NavBar, List, Button, Toast } from 'antd-mobile';
import { history, useLocation } from '@umijs/max';
import styles from './index.less';

interface LocationState {
  data: {
    text: string;
    items: Array<{
      key: string;
      value: string;
    }>;
  };
}

const ResultPage: React.FC = () => {
  const location = useLocation();
  const { data } = (location.state as LocationState) || { data: { items: [] } };

  const handleBack = () => {
    history.back();
  };

  const handleConfirm = () => {
    // TODO: 处理确认逻辑
    Toast.show({
      icon: 'success',
      content: '提交成功',
    });
    history.push('/m/medical/list');
  };

  return (
    <div className={styles.container}>
      <NavBar onBack={handleBack}>识别结果</NavBar>
      <div className={styles.content}>
        <List header="识别结果">
          {data.items.map((item) => (
            <List.Item key={item.key} extra={item.value}>
              {item.key}
            </List.Item>
          ))}
        </List>
      </div>
      <div className={styles.footer}>
        <Button block color="primary" onClick={handleConfirm}>
          确认提交
        </Button>
      </div>
    </div>
  );
};

export default ResultPage; 