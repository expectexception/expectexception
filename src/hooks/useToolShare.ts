import { useState, useCallback } from 'react';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';

export function useToolShare(toolPath: string) {
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [sharing, setSharing] = useState(false);
    const [copied, setCopied] = useState(false);

    const share = useCallback(async (resultData: unknown) => {
        setSharing(true);
        try {
            const res = await apiClient.post(endpoints.services.shareCreate, {
                tool_path: toolPath,
                result_data: resultData,
            });
            const url = `${window.location.origin}/share/${res.data.short_id}`;
            setShareUrl(url);
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch {}
        setSharing(false);
    }, [toolPath]);

    return { share, shareUrl, sharing, copied };
}
