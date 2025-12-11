export const isMobile = () => {
  const userAgent = navigator.userAgent;
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|HarmonyOS|HUAWEI/i.test(
    userAgent
  );
  
  // 添加调试信息
  if (process.env.NODE_ENV === 'development') {
    console.log('User Agent:', userAgent);
    console.log('Is Mobile Device:', isMobileDevice);
  }
  
  return isMobileDevice;
}; 