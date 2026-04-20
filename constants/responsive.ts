export const BREAKPOINTS = {
  smallPhone: 360,
  tablet: 768,
  largeTablet: 1024,
} as const;

export const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

export const getDeviceFlags = (width: number) => {
  return {
    isSmallPhone: width < BREAKPOINTS.smallPhone,
    isTablet: width >= BREAKPOINTS.tablet,
    isLargeTablet: width >= BREAKPOINTS.largeTablet,
  };
};
