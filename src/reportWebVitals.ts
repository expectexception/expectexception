import { ReportHandler } from 'web-vitals';
import { sendToAnalytics } from './utils/analytics';

const reportWebVitals = (onPerfEntry?: ReportHandler) => {
  // If a custom handler is passed, use it (development), otherwise send to GA4
  const handler = onPerfEntry || sendToAnalytics;

  if (handler && handler instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(handler);
      getFID(handler);
      getFCP(handler);
      getLCP(handler);
      getTTFB(handler);
    });
  }
};

export default reportWebVitals;
