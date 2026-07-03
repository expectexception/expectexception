export const isReactSnap = (): boolean => {
  return typeof navigator !== 'undefined' && navigator.userAgent === 'ReactSnap';
};
