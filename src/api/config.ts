import axios, { AxiosInstance, AxiosError } from 'axios';

const isReactSnap = () => typeof navigator !== 'undefined' && navigator.userAgent === 'ReactSnap';

// API_BASE_URL: basic CRUD/auth/blog/community → Render HA backend
// HEAVY_API_BASE_URL: chatbot/AI/video → local GPU server via Cloudflare tunnel
const getBaseUrl = (): string => {
    if (process.env.REACT_APP_API_BASE_URL) {
        return process.env.REACT_APP_API_BASE_URL;
    }
    // Dev fallback
    if (typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:8000';
    }
    // Production: env var MUST be set. Log a clear error so it's immediately visible.
    console.error(
        '[config.ts] REACT_APP_API_BASE_URL is not set. ' +
        'All API calls will fail. Set this env var in your Vercel project settings ' +
        'to your Render backend URL (e.g. https://expectexception-api.onrender.com).'
    );
    return 'https://expectexception-api.onrender.com';
};

const getHeavyBaseUrl = (): string => {
    if (process.env.REACT_APP_HEAVY_API_BASE_URL) {
        return process.env.REACT_APP_HEAVY_API_BASE_URL;
    }
    // Heavy services fall back to the same base URL if no dedicated GPU server is configured.
    return getBaseUrl();
};

const API_BASE_URL = getBaseUrl();
const HEAVY_API_BASE_URL = getHeavyBaseUrl();
const WS_BASE_URL = API_BASE_URL.replace('http', 'ws');

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 300000, // 5 minutes to accommodate AI model loading
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for adding auth token and handling FormData
apiClient.interceptors.request.use(
    (config) => {
        // During react-snap prerender we don't want network calls (they fail and spam logs)
        if (isReactSnap()) {
            return Promise.reject(new axios.Cancel('ReactSnap prerender: request skipped'));
        }

        // Dynamic routing for heavy AI/ML endpoints
        if (config.url) {
            const isHeavy = [
                '/api/chatbot',
                '/api/ai-detector',
                '/api/services/audio-separator',
                '/api/services/background-remover',
                '/api/services/image-upscaler',
                '/api/services/pdf-to-doc',
                '/api/services/doc-to-pdf',
                '/api/services/yt-downloader',
                '/api/services/image-to-text',
            ].some(path => config.url?.startsWith(path));

            if (isHeavy) {
                config.baseURL = HEAVY_API_BASE_URL;
            }
        }

        // Get token from localStorage if available
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Remove Content-Type header for FormData to let browser set it with boundary
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest: any = error.config;

        // Handle 401 Unauthorized - token expired
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Try to refresh token
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    const response = await axios.post(`${API_BASE_URL}/api/auth/token/refresh/`, {
                        refresh: refreshToken,
                    });

                    const { access } = response.data;
                    localStorage.setItem('accessToken', access);

                    // Retry original request with new token
                    originalRequest.headers.Authorization = `Bearer ${access}`;
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed, clear tokens and redirect to login
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export { apiClient, API_BASE_URL, HEAVY_API_BASE_URL, WS_BASE_URL };
export default apiClient;
