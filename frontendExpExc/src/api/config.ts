import axios, { AxiosInstance, AxiosError } from 'axios';

const isReactSnap = () => typeof navigator !== 'undefined' && navigator.userAgent === 'ReactSnap';

// Get base URL from environment variable or use default
// Get base URL - support dynamic origin for production while keeping localhost default for dev
const getBaseUrl = () => {
    if (process.env.REACT_APP_API_BASE_URL) return process.env.REACT_APP_API_BASE_URL;
    if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
            return origin;
        }
    }
    return 'http://localhost:8000';
};

const API_BASE_URL = getBaseUrl();
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

export { apiClient, API_BASE_URL, WS_BASE_URL };
export default apiClient;
