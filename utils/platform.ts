// utils/platform.ts
export type Platform = 'ios' | 'android' | 'desktop';

export const detectPlatform = (): Platform => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  }
  
  if (/android/.test(userAgent)) {
    return 'android';
  }
  
  return 'desktop';
};

export const isMobile = (): boolean => {
  const platform = detectPlatform();
  return platform === 'ios' || platform === 'android';
};

export const isIOS = (): boolean => detectPlatform() === 'ios';
export const isAndroid = (): boolean => detectPlatform() === 'android';