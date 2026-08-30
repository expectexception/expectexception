import React, { useMemo, useState } from 'react';
import {
    Card, CardContent, Box, Typography, TextField, Button, IconButton,
    Snackbar, Divider,
} from '@mui/material';
import { Android, ContentCopy, Add, Delete } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

interface RuleGroup {
    userAgent: string;
    disallow: string[];
    allow: string[];
}

function buildRobotsTxt(groups: RuleGroup[], sitemapUrl: string, crawlDelay: string): string {
    const lines: string[] = [];

    groups.forEach((group, i) => {
        if (i > 0) lines.push('');
        lines.push(`User-agent: ${group.userAgent.trim() || '*'}`);
        if (crawlDelay.trim() !== '' && !Number.isNaN(Number(crawlDelay))) {
            lines.push(`Crawl-delay: ${crawlDelay.trim()}`);
        }
        group.allow.filter(p => p.trim() !== '').forEach(p => lines.push(`Allow: ${p.trim()}`));
        group.disallow.filter(p => p.trim() !== '').forEach(p => lines.push(`Disallow: ${p.trim()}`));
        if (group.allow.every(p => p.trim() === '') && group.disallow.every(p => p.trim() === '')) {
            lines.push('Disallow:');
        }
    });

    if (sitemapUrl.trim() !== '') {
        lines.push('');
        lines.push(`Sitemap: ${sitemapUrl.trim()}`);
    }

    return lines.join('\n') + '\n';
}

const PRESETS: { label: string; disallow: string[] }[] = [
    { label: 'Allow everything', disallow: [] },
    { label: 'Block /admin', disallow: ['/admin/'] },
    { label: 'Block /wp-admin (WordPress)', disallow: ['/wp-admin/'] },
    { label: 'Block everything', disallow: ['/'] },
];

const RobotsTxtGenerator: React.FC = () => {
    const [groups, setGroups] = useState<RuleGroup[]>([{ userAgent: '*', disallow: ['/admin/'], allow: [] }]);
    const [sitemapUrl, setSitemapUrl] = useState('https://example.com/sitemap.xml');
    const [crawlDelay, setCrawlDelay] = useState('');
    const [snackbar, setSnackbar] = useState(false);

    const output = useMemo(() => buildRobotsTxt(groups, sitemapUrl, crawlDelay), [groups, sitemapUrl, crawlDelay]);

    const updateGroup = (index: number, patch: Partial<RuleGroup>) => {
        setGroups(prev => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)));
    };
    const addGroup = () => setGroups(prev => [...prev, { userAgent: '', disallow: [''], allow: [] }]);
    const removeGroup = (index: number) => setGroups(prev => prev.filter((_, i) => i !== index));

    const addRule = (groupIndex: number, field: 'allow' | 'disallow') => {
        setGroups(prev => prev.map((g, i) => (i === groupIndex ? { ...g, [field]: [...g[field], ''] } : g)));
    };
    const updateRule = (groupIndex: number, field: 'allow' | 'disallow', ruleIndex: number, value: string) => {
        setGroups(prev => prev.map((g, i) => {
            if (i !== groupIndex) return g;
            const next = [...g[field]];
            next[ruleIndex] = value;
            return { ...g, [field]: next };
        }));
    };
    const removeRule = (groupIndex: number, field: 'allow' | 'disallow', ruleIndex: number) => {
        setGroups(prev => prev.map((g, i) => (i === groupIndex ? { ...g, [field]: g[field].filter((_, j) => j !== ruleIndex) } : g)));
    };

    const applyPreset = (disallow: string[]) => {
        setGroups([{ userAgent: '*', disallow: disallow.length ? disallow : [''], allow: [] }]);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(output);
        setSnackbar(true);
    };

    return (
        <ServicePageShell
            icon={Android}
            title="Robots.txt Generator"
            subtitle="Build a robots.txt with per-user-agent allow and disallow rules, a crawl delay, and a sitemap reference"
            maxWidth="md"
            toolId={85}
            seoTitle="Robots.txt Generator | Build a robots.txt File Online"
            seoDescription="Free robots.txt generator. Add user-agent rule groups with allow and disallow paths, an optional crawl delay, and a sitemap URL, and get a ready-to-use robots.txt back instantly."
            keywords={['robots.txt generator', 'create robots.txt', 'robots.txt builder', 'seo robots file generator', 'disallow generator', 'crawl delay generator']}
            about="Builds a robots.txt file: the plain-text file crawlers check before indexing a site, telling well-behaved bots which paths they may or may not request. You can define separate rule groups for different user agents, add Allow and Disallow paths to each, set an optional Crawl-delay, and reference your sitemap, all reflected live in the generated text on the right."
            howToSteps={[
                { name: 'Pick a starting point', text: 'Use a preset like Allow everything or Block /admin, or start from the default group and edit it.' },
                { name: 'Add allow/disallow paths', text: 'Add as many Allow and Disallow paths as you need under each user-agent group.' },
                { name: 'Add more user-agent groups if needed', text: 'Click Add user-agent group to set different rules for a specific crawler, like Googlebot, versus everyone else.' },
                { name: 'Set a sitemap and copy the result', text: 'Add your sitemap URL, then copy the generated robots.txt into the root of your site.' },
            ]}
            faq={[
                {
                    question: 'Where does robots.txt need to live?',
                    answer: 'At the root of your domain, so a browser can reach it at exactly https://example.com/robots.txt. Crawlers will not look for it anywhere else, and a robots.txt placed in a subdirectory is simply ignored.',
                },
                {
                    question: 'Does robots.txt actually stop a page from being indexed?',
                    answer: "Not reliably by itself. Disallow tells well-behaved crawlers not to request a path, but a URL that's already linked from elsewhere can still show up in search results without a description, since the search engine never fetched the page to know otherwise. To reliably keep a specific page out of search results, use a noindex meta tag or HTTP header on that page instead, which requires the crawler to actually fetch it once to see the instruction.",
                },
                {
                    question: 'What does an empty Disallow line mean, versus Disallow: /?',
                    answer: 'An empty Disallow value (just "Disallow:" with nothing after it) means nothing is disallowed, equivalent to allowing everything. "Disallow: /" blocks the entire site, since every path on a site starts with /. That one-character difference is a common, expensive mistake to make by hand.',
                },
                {
                    question: 'Do all crawlers respect robots.txt?',
                    answer: "The major search engines generally do, but robots.txt is a voluntary convention, not an enforcement mechanism. A crawler that ignores it faces no technical barrier from the file itself, so robots.txt should be treated as guidance for cooperative bots, not as a security or access control measure for anything sensitive.",
                },
            ]}
        >
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                <Card sx={{
                    background: 'rgba(13, 14, 18, 0.4)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '20px',
                    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                    p: 3,
                    overflowY: 'auto',
                }}>
                    <CardContent sx={{ p: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Quick presets</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                            {PRESETS.map(preset => (
                                <Button key={preset.label} size="small" variant="outlined" onClick={() => applyPreset(preset.disallow)}>
                                    {preset.label}
                                </Button>
                            ))}
                        </Box>

                        {groups.map((group, gi) => (
                            <Box key={gi} sx={{ mb: 3, p: 2, borderRadius: '12px', bgcolor: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'center' }}>
                                    <TextField
                                        size="small"
                                        label="User-agent"
                                        value={group.userAgent}
                                        onChange={e => updateGroup(gi, { userAgent: e.target.value })}
                                        placeholder="*"
                                        sx={{ flex: 1 }}
                                    />
                                    {groups.length > 1 && (
                                        <IconButton size="small" onClick={() => removeGroup(gi)} aria-label="Remove user-agent group">
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    )}
                                </Box>

                                <Typography variant="caption" color="text.secondary">Disallow</Typography>
                                {group.disallow.map((path, ri) => (
                                    <Box key={ri} sx={{ display: 'flex', gap: 1, mt: 0.75 }}>
                                        <TextField
                                            size="small"
                                            fullWidth
                                            value={path}
                                            onChange={e => updateRule(gi, 'disallow', ri, e.target.value)}
                                            placeholder="/admin/"
                                            inputProps={{ style: { fontFamily: 'monospace' } }}
                                        />
                                        <IconButton size="small" onClick={() => removeRule(gi, 'disallow', ri)} aria-label="Remove disallow rule">
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </Box>
                                ))}
                                <Button size="small" startIcon={<Add />} onClick={() => addRule(gi, 'disallow')} sx={{ mt: 0.5, mb: 1.5 }}>
                                    Add disallow
                                </Button>

                                <Typography variant="caption" color="text.secondary">Allow</Typography>
                                {group.allow.map((path, ri) => (
                                    <Box key={ri} sx={{ display: 'flex', gap: 1, mt: 0.75 }}>
                                        <TextField
                                            size="small"
                                            fullWidth
                                            value={path}
                                            onChange={e => updateRule(gi, 'allow', ri, e.target.value)}
                                            placeholder="/public/"
                                            inputProps={{ style: { fontFamily: 'monospace' } }}
                                        />
                                        <IconButton size="small" onClick={() => removeRule(gi, 'allow', ri)} aria-label="Remove allow rule">
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </Box>
                                ))}
                                <Button size="small" startIcon={<Add />} onClick={() => addRule(gi, 'allow')} sx={{ mt: 0.5 }}>
                                    Add allow
                                </Button>
                            </Box>
                        ))}

                        <Button size="small" startIcon={<Add />} onClick={addGroup} sx={{ mb: 3 }}>
                            Add user-agent group
                        </Button>

                        <Divider sx={{ mb: 2 }} />

                        <TextField
                            fullWidth
                            size="small"
                            label="Sitemap URL (optional)"
                            value={sitemapUrl}
                            onChange={e => setSitemapUrl(e.target.value)}
                            sx={{ mb: 2 }}
                            inputProps={{ style: { fontFamily: 'monospace' } }}
                        />
                        <TextField
                            size="small"
                            label="Crawl-delay in seconds (optional)"
                            value={crawlDelay}
                            onChange={e => setCrawlDelay(e.target.value.replace(/[^0-9]/g, ''))}
                            sx={{ width: 220 }}
                        />
                    </CardContent>
                </Card>

                <Card sx={{
                    background: 'rgba(13, 14, 18, 0.4)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '20px',
                    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
                    p: 3,
                    height: 'fit-content',
                }}>
                    <CardContent sx={{ p: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Generated robots.txt</Typography>
                        <Box sx={{
                            p: 2,
                            borderRadius: '12px',
                            bgcolor: 'rgba(0,0,0,0.4)',
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            border: '1px solid rgba(255,255,255,0.08)',
                            mb: 2,
                            minHeight: 200,
                        }}>
                            {output}
                        </Box>
                        <Button fullWidth variant="contained" startIcon={<ContentCopy />} onClick={handleCopy}>
                            Copy robots.txt
                        </Button>
                    </CardContent>
                </Card>
            </Box>

            <Snackbar open={snackbar} autoHideDuration={2000} onClose={() => setSnackbar(false)} message="robots.txt copied to clipboard!" />
        </ServicePageShell>
    );
};

export default RobotsTxtGenerator;
