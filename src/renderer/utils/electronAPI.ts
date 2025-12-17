// 工具函数：安全地访问 electronAPI
export const getElectronAPI = () => {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI;
  }
  
  // 如果在浏览器环境中（开发模式下的热重载），返回一个模拟对象
  if (process.env.NODE_ENV === 'development') {
    console.warn('electronAPI is not available. Make sure you are running in Electron.');
  }
  
  throw new Error('electronAPI is not available. Please run this application in Electron.');
};

