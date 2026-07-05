import React, { useMemo, useState } from 'react';
import {
    Box, Card, CardContent, TextField, Typography, Button, Stack, Grid,
    MenuItem, Paper, Snackbar,
} from '@mui/material';
import { Web, ContentCopy, Image as ImageIcon } from '@mui/icons-material';
import ServicePageShell from './ServicePageShell';

const escapeAttr = (s: string): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const TITLE_LIMIT = 60;
const DESC_LIMIT = 160;

const counterColor = (len: number, limit: number): string => {
    if (len === 0) return 'text.disabled';
    if (len <= limit) return 'success.main';
    return 'warning.main';
};

const hostFromUrl = (url: string): string => {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
};

const MetaTagGenerator: React.FC = () => {
    const [title, setTitle] = useState('ExpectException — Free Online Developer Tools');
    const [description, setDescription] = useState('Free browser-based developer tools: JSON formatting, QR codes, PDF conversion, and more. No sign-up required.');
    const [url, setUrl] = useState('https://example.com/page');
    const [imageUrl, setImageUrl] = useState('https://example.com/og-image.png');
    const [siteName, setSiteName] = useState('My Site');
    const [keywords, setKeywords] = useState('');
    const [ogType, setOgType] = useState('website');
    const [twitterCard, setTwitterCard] = useState('summary_large_image');
    const [twitterHandle, setTwitterHandle] = useState('');
    const [snackbar, setSnackbar] = useState(false);
    const [imgError, setImgError] = useState(false);

    const metaTags = useMemo(() => {
        const lines: string[] = [];
        lines.push(`<title>${escapeAttr(title || 'Page Title')}</title>`);
        if (description) lines.push(`<meta name="description" content="${escapeAttr(description)}" />`);
        if (keywords.trim()) lines.push(`<meta name="keywords" content="${escapeAttr(keywords.trim())}" />`);
        if (url) lines.push(`<link rel="canonical" href="${escapeAttr(url)}" />`);
        lines.push('');
        lines.push('<!-- Open Graph / Facebook -->');
        lines.push(`<meta property="og:type" content="${ogType}" />`);
        if (url) lines.push(`<meta property="og:url" content="${escapeAttr(url)}" />`);
        lines.push(`<meta property="og:title" content="${escapeAttr(title)}" />`);
        if (description) lines.push(`<meta property="og:description" content="${escapeAttr(description)}" />`);
        if (imageUrl) lines.push(`<meta property="og:image" content="${escapeAttr(imageUrl)}" />`);
        if (siteName) lines.push(`<meta property="og:site_name" content="${escapeAttr(siteName)}" />`);
        lines.push('');
        lines.push('<!-- Twitter -->');
        lines.push(`<meta name="twitter:card" content="${twitterCard}" />`);
        if (twitterHandle.trim()) {
            const handle = twitterHandle.trim().startsWith('@') ? twitterHandle.trim() : `@${twitterHandle.trim()}`;
            lines.push(`<meta name="twitter:site" content="${escapeAttr(handle)}" />`);
        }
        lines.push(`<meta name="twitter:title" content="${escapeAttr(title)}" />`);
        if (description) lines.push(`<meta name="twitter:description" content="${escapeAttr(description)}" />`);
        if (imageUrl) lines.push(`<meta name="twitter:image" content="${escapeAttr(imageUrl)}" />`);
        return lines.join('\n');
    }, [title, description, keywords, url, imageUrl, siteName, ogType, twitterCard, twitterHandle]);

    const handleCopy = () => {
        navigator.clipboard.writeText(metaTags);
        setSnackbar(true);
    };

    return (
        <ServicePageShell
            toolId={58}
            icon={Web}
            title="Meta Tag Generator"
            subtitle="Generate SEO, Open Graph, and Twitter Card meta tags — with live search & social previews"
            maxWidth="lg"
            seoTitle="Meta Tag Generator — SEO, Open Graph & Twitter Card Tags"
            keywords={['meta tag generator', 'open graph generator', 'twitter card generator', 'seo meta tags', 'og tags generator', 'social share preview', 'meta description generator', 'html head tags generator']}
            about="Fills in the exact set of <meta> tags a modern site needs for on-page SEO and rich social sharing — description, optional keywords, canonical link, a full Open Graph set (type, url, title, description, image, site name), and Twitter Card tags (card type, title, description, image, and an optional @handle) — then renders a ready-to-paste HTML block below. A live Google search-result preview and a social share-card preview update as you type, so you can see roughly how the tags will actually look before they go live, including whether your title and description run past the lengths search engines and social platforms typically display in full."
            howToSteps={[
                { name: 'Fill in your page details', text: 'Enter the Title, Description, canonical URL, and (optionally) a comma-separated Keywords list for the page you\'re tagging.' },
                { name: 'Add social sharing info', text: 'Provide an Image URL and Site Name so the Open Graph and Twitter Card previews have something to display when the link is shared.' },
                { name: 'Choose card types', text: 'Pick an Open Graph type (e.g. website or article) and a Twitter Card type (summary or summary large image) that match your content.' },
                { name: 'Check the previews', text: 'Look at the Google Search Result and Social Share Card previews to see roughly how the page will appear once these tags are live.' },
                { name: 'Copy the tags', text: 'Click Copy Meta Tags and paste the block directly into the <head> of your HTML page.' },
            ]}
            faq={[
                { question: 'Where do these tags go in my HTML?', answer: 'Paste the entire generated block inside the <head>...</head> section of your page, ideally near your other <meta> and <link> tags.' },
                { question: 'Why is there a recommended character count under Title and Description?', answer: 'Google typically truncates page titles around 50-60 characters and descriptions around 150-160 characters in search results, so staying under those limits reduces the chance of an awkward mid-word cutoff in the search snippet.' },
                { question: 'What\'s the difference between Open Graph and Twitter Card tags?', answer: 'Open Graph (og:*) tags are read by Facebook, LinkedIn, Slack, and most other platforms when generating a link preview; Twitter Card (twitter:*) tags are Twitter/X\'s own format for the same purpose, which is why both sets are usually included together.' },
                { question: 'Do I need the keywords meta tag?', answer: 'Google and most modern search engines ignore the keywords meta tag for ranking, so it\'s optional — this tool only includes it in the output if you actually type something into the Keywords field.' },
            ]}
        >
            <Grid container spacing={2.5} sx={{ flex: 1, minHeight: 0 }}>
                {/* Left: form */}
                <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
                    <Card sx={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <CardContent sx={{ p: 2.5, flex: 1, minHeight: 0, overflowY: 'auto' }}>
                            <TextField
                                fullWidth
                                label="Title"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                sx={{ mb: 0.5 }}
                                size="small"
                            />
                            <Typography variant="caption" color={counterColor(title.length, TITLE_LIMIT)} display="block" sx={{ mb: 1.5 }}>
                                {title.length}/{TITLE_LIMIT} recommended
                            </Typography>

                            <TextField
                                fullWidth
                                label="Description"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                multiline
                                rows={3}
                                sx={{ mb: 0.5 }}
                                size="small"
                            />
                            <Typography variant="caption" color={counterColor(description.length, DESC_LIMIT)} display="block" sx={{ mb: 1.5 }}>
                                {description.length}/{DESC_LIMIT} recommended
                            </Typography>

                            <TextField fullWidth label="Canonical URL" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/page" sx={{ mb: 1.5 }} size="small" />
                            <TextField fullWidth label="Image URL" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/og-image.png" sx={{ mb: 1.5 }} size="small" />
                            <TextField fullWidth label="Site Name" value={siteName} onChange={e => setSiteName(e.target.value)} sx={{ mb: 1.5 }} size="small" />
                            <TextField fullWidth label="Keywords (optional, comma-separated)" value={keywords} onChange={e => setKeywords(e.target.value)} sx={{ mb: 1.5 }} size="small" />

                            <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
                                <TextField select fullWidth label="Open Graph Type" value={ogType} onChange={e => setOgType(e.target.value)} size="small">
                                    <MenuItem value="website">website</MenuItem>
                                    <MenuItem value="article">article</MenuItem>
                                    <MenuItem value="product">product</MenuItem>
                                    <MenuItem value="profile">profile</MenuItem>
                                </TextField>
                                <TextField select fullWidth label="Twitter Card" value={twitterCard} onChange={e => setTwitterCard(e.target.value)} size="small">
                                    <MenuItem value="summary">summary</MenuItem>
                                    <MenuItem value="summary_large_image">summary_large_image</MenuItem>
                                </TextField>
                            </Stack>

                            <TextField fullWidth label="Twitter @handle (optional)" value={twitterHandle} onChange={e => setTwitterHandle(e.target.value)} placeholder="@yoursite" size="small" />
                        </CardContent>
                    </Card>
                </Grid>

                {/* Right: previews + output */}
                <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
                    <Card sx={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <CardContent sx={{ p: 2.5, flex: 1, minHeight: 0, overflowY: 'auto' }}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>
                                Google Search Result Preview
                            </Typography>
                            <Paper sx={{ p: 2, mb: 2.5, bgcolor: '#fff', borderRadius: 1.5 }}>
                                <Typography sx={{ color: '#1a0dab', fontSize: '1.15rem', lineHeight: 1.3, fontFamily: 'arial, sans-serif' }} noWrap>
                                    {title || 'Page Title'}
                                </Typography>
                                <Typography sx={{ color: '#006621', fontSize: '0.82rem', fontFamily: 'arial, sans-serif' }} noWrap>
                                    {url ? hostFromUrl(url) : 'example.com'} {url ? `› ${url.replace(/^https?:\/\/[^/]+/, '') || ''}` : ''}
                                </Typography>
                                <Typography sx={{ color: '#4d5156', fontSize: '0.87rem', fontFamily: 'arial, sans-serif' }}>
                                    {description || 'Page description will appear here.'}
                                </Typography>
                            </Paper>

                            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>
                                Social Share Card Preview
                            </Typography>
                            <Paper sx={{ mb: 2.5, bgcolor: '#fff', borderRadius: 1.5, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.12)', maxWidth: 420 }}>
                                {imageUrl && !imgError ? (
                                    <Box
                                        component="img"
                                        src={imageUrl}
                                        onError={() => setImgError(true)}
                                        sx={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
                                    />
                                ) : (
                                    <Box sx={{ width: '100%', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f1f3f4' }}>
                                        <ImageIcon sx={{ fontSize: 40, color: '#9aa0a6' }} />
                                    </Box>
                                )}
                                <Box sx={{ p: 1.5 }}>
                                    <Typography sx={{ color: '#657786', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        {siteName || (url ? hostFromUrl(url) : 'example.com')}
                                    </Typography>
                                    <Typography sx={{ color: '#0f1419', fontWeight: 700, fontSize: '0.95rem' }} noWrap>
                                        {title || 'Page Title'}
                                    </Typography>
                                    <Typography sx={{ color: '#536471', fontSize: '0.82rem' }} noWrap>
                                        {description || 'Page description will appear here.'}
                                    </Typography>
                                </Box>
                            </Paper>

                            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>
                                Generated Meta Tags
                            </Typography>
                            <Box
                                component="pre"
                                sx={{
                                    p: 2,
                                    borderRadius: '10px',
                                    bgcolor: 'rgba(0,0,0,0.3)',
                                    fontFamily: 'monospace',
                                    fontSize: '0.76rem',
                                    mb: 2,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    maxHeight: 260,
                                    overflowY: 'auto',
                                }}
                            >
                                {metaTags}
                            </Box>
                            <Button variant="contained" startIcon={<ContentCopy />} onClick={handleCopy}>
                                Copy Meta Tags
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Snackbar open={snackbar} autoHideDuration={2000} onClose={() => setSnackbar(false)} message="Meta tags copied to clipboard!" />
        </ServicePageShell>
    );
};

export default MetaTagGenerator;
