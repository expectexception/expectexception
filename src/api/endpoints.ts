/**
 * API Endpoints
 * Centralized location for all API endpoint paths
 */

export const endpoints = {
    // Authentication
    auth: {
        login: '/api/auth/login/',
        register: '/api/auth/register/',
        logout: '/api/auth/logout/',
        refreshToken: '/api/auth/refresh/',
        profile: '/api/auth/profile/',
    },

    // Blog Posts
    blog: {
        posts: '/api/blog/posts/',
        postDetail: (id: number) => `/api/blog/posts/${id}/`,
        postPublish: (id: number) => `/api/blog/posts/${id}/publish/`,
        postLike: (id: number) => `/api/blog/posts/${id}/like/`,
        postBookmark: (id: number) => `/api/blog/posts/${id}/bookmark/`,

        // New endpoints for enhanced features
        autoSave: '/api/blog/posts/auto_save/',
        revisions: (id: number) => `/api/blog/posts/${id}/revisions/`,
        restoreRevision: (id: number) => `/api/blog/posts/${id}/restore_revision/`,
        analytics: (id: number) => `/api/blog/posts/${id}/analytics/`,
        incrementView: (id: number) => `/api/blog/posts/${id}/increment_view/`,

        // Series
        series: '/api/blog/series/',
        seriesDetail: (slug: string) => `/api/blog/series/${slug}/`,

        // Media Library
        media: '/api/blog/media/',
        mediaDetail: (id: number) => `/api/blog/media/${id}/`,

        // Tags and Comments
        tags: '/api/blog/tags/',
        comments: '/api/blog/comments/',
        likes: '/api/blog/likes/',
        bookmarks: '/api/blog/bookmarks/',
        uploadImage: '/api/blog/upload-image/',
    },

    // Videos
    videos: {
        list: '/api/videos/',
        detail: (id: number) => `/api/videos/${id}/`,
    },

    // Profiles
    profiles: {
        get: (username: string) => `/api/auth/profiles/${username}/`,
        update: (username: string) => `/api/auth/profiles/${username}/`,
    },

    // Notifications
    notifications: {
        list: '/api/notifications/',
    },

    // Services & Tools
    services: {
        // Tool listing
        tools: '/api/services/tools/',

        // Individual services
        qrGenerator: '/api/services/qr-generator/',
        jsonFormatter: '/api/services/json-formatter/',
        urlDownloader: '/api/services/url-downloader/',
        ytDownloader: '/api/services/yt-downloader/',
        tts: '/api/services/tts/',
        imageCompressor: '/api/services/compress-image/',

        // Document tools
        pdfToDoc: '/api/services/pdf-to-doc/',
        docToPdf: '/api/services/doc-to-pdf/',
        pdfMerge: '/api/services/pdf-merge/',
        pdfSplit: '/api/services/pdf-split/',
        imageToPdf: '/api/services/image-to-pdf/',

        // Image tools
        imageResize: '/api/services/image-resize/',
        backgroundRemove: '/api/services/background-remove/',
        imageToText: '/api/services/image-to-text/',
        imageConvert: '/api/services/image-convert/',

        // Developer tools
        base64: '/api/services/base64/',
        hashGenerator: '/api/services/hash-generator/',
        uuidGenerator: '/api/services/uuid-generator/',
        colorConverter: '/api/services/color-converter/',
        markdownPreview: '/api/services/markdown-preview/',

        // Downloadable resources
        downloads: '/api/services/downloads/',
        downloadDetail: (id: number) => `/api/services/downloads/${id}/`,
        downloadFile: (id: number) => `/api/services/downloads/${id}/download/`,
        downloadStats: '/api/services/downloads/stats/',

        // Download history & analytics
        history: {
            list: '/api/services/history/',
            stats: '/api/services/history/stats/',
            export: '/api/services/history/export/',
        },

        // User dashboard
        dashboard: {
            activity: '/api/services/dashboard/activity/',
            favorites: '/api/services/dashboard/favorites/',
            toggleFavorite: '/api/services/dashboard/toggle_favorite/',
        },
        search: '/api/services/search/',
    },

    // AI Image Detector
    aiDetector: {
        analyze: '/api/ai-detector/analyze/',
        analyzeSync: '/api/ai-detector/analyze/?sync=true',
        taskStatus: (taskId: string) => `/api/ai-detector/status/${taskId}/`,
        history: '/api/ai-detector/history/',
        detail: (id: number) => `/api/ai-detector/history/${id}/`,
        health: '/api/ai-detector/health/',
        models: '/api/ai-detector/models/',
    },
};

export default endpoints;
