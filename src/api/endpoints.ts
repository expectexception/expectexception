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
        google: '/api/auth/google/',
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
        inApp: '/api/notifications/in-app/',
        inAppMarkRead: (id: number) => `/api/notifications/in-app/${id}/`,
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
        imageUpscale: '/api/services/image-upscale/',

        // Developer tools
        base64: '/api/services/base64/',
        hashGenerator: '/api/services/hash-generator/',
        uuidGenerator: '/api/services/uuid-generator/',
        colorConverter: '/api/services/color-converter/',
        markdownPreview: '/api/services/markdown-preview/',
        redirectInspector: '/api/services/redirect-inspector/',
        dnsLookup: '/api/services/dns-lookup/',
        tlsCheck: '/api/services/tls-check/',
        headerHardening: '/api/services/header-hardening/',
        corsPreflight: '/api/services/cors-preflight/',
        whoisRdap: '/api/services/whois-rdap/',
        sitemapRobots: '/api/services/sitemap-robots/',
        portCheck: '/api/services/port-check/',
        performanceSnapshot: '/api/services/performance-snapshot/',
        cacheDebug: '/api/services/cache-debug/',
        pingTraceroute: '/api/services/ping-traceroute/',
        subdomainEnum: '/api/services/subdomain-enum/',
        // Webhook inspector
        webhookCreate: '/api/services/webhook/create/',
        webhookRequests: (id: string) => `/api/services/webhook/${id}/requests/`,
        webhookRequestDetail: (endpointId: string, requestId: string) => `/api/services/webhook/${endpointId}/requests/${requestId}/`,
        webhookReplay: (endpointId: string, requestId: string) => `/api/services/webhook/${endpointId}/replay/${requestId}/`,
        jwtVerify: '/api/services/jwt-verify/',
        websiteDiagnostics: '/api/services/website-diagnostics/',
        uptimeRobot: '/api/services/uptime-robot/',
        uptimeTriggers: '/api/services/uptime-robot/triggers/',
        uptimeTriggerDetail: (id: string) => `/api/services/uptime-robot/triggers/${id}/`,
        speedTest: '/services/speed-test',
        audioSeparator: '/api/audio-separator/process',

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
        shareCreate: '/api/services/share/',
        shareRetrieve: (id: string) => `/api/services/share/${id}/`,
        toolAccess: '/api/services/tool-access/',
        toolAccessToggle: '/api/services/tool-access/toggle/',
        textToHandwriting: '/api/text-to-handwriting/generate/',
        secretSharer: {
            create: '/api/secret-sharer/create/',
            view: (id: string) => `/api/secret-sharer/view/${id}/`,
            createFile: '/api/secret-sharer/create-file/',
            viewFile: (id: string) => `/api/secret-sharer/view-file/${id}/`
        },
    },

    // Community Forum
    community: {
        categories: '/api/community/categories/',
        threads: '/api/community/threads/',
        threadDetail: (id: number) => `/api/community/threads/${id}/`,
        threadBySlug: (slug: string) => `/api/community/threads/?slug=${slug}`,
        threadVote: (id: number) => `/api/community/threads/${id}/vote/`,
        threadSolve: (id: number) => `/api/community/threads/${id}/mark_solved/`,
        replies: '/api/community/replies/',
        replyVote: (id: number) => `/api/community/replies/${id}/vote/`,
        replyAccept: (id: number) => `/api/community/replies/${id}/accept/`,
        bookmarks: '/api/community/bookmarks/',
        bookmarkToggle: (id: number) => `/api/community/bookmarks/${id}/`,
        stats: '/api/community/stats/',
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

    // Admin Dashboard
    admin: {
        users: '/api/services/admin/users/',
        userDetail: (id: number) => `/api/services/admin/users/${id}/`,
        blogs: '/api/services/admin/blogs/',
        blogDetail: (id: number) => `/api/services/admin/blogs/${id}/`,
        downloads: '/api/services/admin/downloads/',
        downloadDetail: (id: number) => `/api/services/admin/downloads/${id}/`,
        logs: '/api/services/admin/logs/',
        metrics: '/api/services/server-status-api/',
        ollama: {
            models: '/api/services/admin/ollama/models/',
            control: '/api/services/admin/ollama/control/',
            status: '/api/services/admin/ollama/status/',
        },
    },
};

export default endpoints;
