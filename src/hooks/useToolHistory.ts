import { useState, useCallback } from 'react';

const STORAGE_KEY = 'expexc_tool_history';
const MAX_HISTORY = 10;

export interface ToolHistoryEntry {
    id: number;
    title: string;
    path: string;
    visitedAt: string;
}

function load(): ToolHistoryEntry[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function save(entries: ToolHistoryEntry[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {}
}

export function useToolHistory() {
    const [history, setHistory] = useState<ToolHistoryEntry[]>(load);

    const addToHistory = useCallback((tool: { id: number; title: string; path: string }) => {
        setHistory(prev => {
            const filtered = prev.filter(e => e.id !== tool.id);
            const next = [
                { ...tool, visitedAt: new Date().toISOString() },
                ...filtered,
            ].slice(0, MAX_HISTORY);
            save(next);
            return next;
        });
    }, []);

    const clearHistory = useCallback(() => {
        save([]);
        setHistory([]);
    }, []);

    return { history, addToHistory, clearHistory };
}
