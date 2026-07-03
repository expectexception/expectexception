import { useState, useCallback } from 'react';

const STORAGE_KEY = 'expexc_bookmarked_tools';

function load(): number[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function save(ids: number[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {}
}

export function useToolBookmarks() {
    const [bookmarked, setBookmarked] = useState<number[]>(load);

    const toggle = useCallback((toolId: number) => {
        setBookmarked(prev => {
            const next = prev.includes(toolId)
                ? prev.filter(id => id !== toolId)
                : [...prev, toolId];
            save(next);
            return next;
        });
    }, []);

    const isBookmarked = useCallback((toolId: number) => bookmarked.includes(toolId), [bookmarked]);

    return { bookmarked, toggle, isBookmarked };
}
