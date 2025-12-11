import { Outlet, useLocation, useModel, history } from '@umijs/max';
import { useEffect, useRef } from 'react';
import { isMobile } from '@/utils/device';

const Auth = () => {
  const { initialState } = useModel('@@initialState');
  const location = useLocation();
  const isLoginPage = location.pathname === '/login' || location.pathname === '/m/login';
  const isMobileDevice = isMobile();
  const redirecting = useRef(false);
  const initialized = useRef(false);
  const lastRedirectPath = useRef('');

  // 调试日志
  const logRedirect = (from: string, to: string, reason: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Redirect] From: ${from} To: ${to} Reason: ${reason}`);
    }
  };

  // 检查是否需要重定向
  const needsRedirect = (currentPath: string): string | null => {
    const isOnMobilePath = currentPath.startsWith('/m/');
    
    // 如果设备类型和路径不匹配
    if (isMobileDevice !== isOnMobilePath) {
      if (isMobileDevice) {
        return isLoginPage ? '/m/login' : `/m${currentPath}`;
      } else {
        return isLoginPage ? '/login' : currentPath.replace('/m/', '/');
      }
    }

    // 处理登录状态
    if (isLoginPage && initialState?.currentUser) {
      return isMobileDevice ? '/m/medical/reimbursement' : '/dashboard';
    }

    if (!isLoginPage && !initialState?.currentUser) {
      return isMobileDevice ? '/m/login' : '/login';
    }

    return null;
  };

  useEffect(() => {
    if (redirecting.current) {
      return;
    }

    const targetPath = needsRedirect(location.pathname);
    
    if (targetPath && targetPath !== location.pathname && targetPath !== lastRedirectPath.current) {
      redirecting.current = true;
      lastRedirectPath.current = targetPath;
      
      logRedirect(
        location.pathname,
        targetPath,
        isMobileDevice ? 'Mobile Device Detected' : 'Desktop Device Detected'
      );

      // 使用 history.replace 进行重定向
      history.replace(targetPath);
      
      // 重置重定向状态
      setTimeout(() => {
        redirecting.current = false;
      }, 100);
    }
  }, [location.pathname, initialState?.currentUser, isMobileDevice]);

  return <Outlet />;
};

export default Auth; 