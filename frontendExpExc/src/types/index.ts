export interface Tag {
    id: number;
    name: string;
}

export interface User {
    id: number;
    email: string;
    username: string;
    first_name?: string;
    last_name?: string;
    is_staff: boolean;
    profile_image?: string;
    avatar_url?: string;
    auth_provider?: 'email' | 'google';
}

export interface Post {
    id: number;
    title: string;
    slug: string;
    content: string;
    author: User;
    tags: Tag[];
    created_at: string;
    likes_count: number;
    comments: Comment[];
    bookmarked: boolean;
    liked: boolean;
    seo_title?: string;
    seo_description?: string;
    keywords?: string;
    cover_image?: string;
}

export interface Comment {
    id: number;
    post: number;
    author: User;
    content: string;
    created_at: string;
    active: boolean;
    parent?: number | null;
    replies?: Comment[];
}


export interface Service {
    id: number;
    title: string;
    description: string;
    icon: string;
    path: string;
    category: string;
    popularity: number;
    tags: string[];
    color: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
    requires_login?: boolean;
}

export interface DownloadableResource {
    id: number;
    name: string;
    file: string;
    category: 'doc' | 'img' | 'video' | 'audio' | 'archive' | 'other';
    size: string;
    downloads: number;
    version: string;
    created_at: string;
}
