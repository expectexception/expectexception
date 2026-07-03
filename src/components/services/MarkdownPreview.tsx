import React, { useState } from 'react';
import {
    Card, CardContent, Typography, TextField, Box, Grid,
} from '@mui/material';
import { Article } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';
import { isReactSnap } from '../../utils/isReactSnap';

const MarkdownPreview: React.FC = () => {
    const [markdown, setMarkdown] = useState('# Hello World\n\nThis is a **markdown** preview tool.\n\n## Features\n\n- Live preview\n- GitHub Flavored Markdown\n- Code highlighting\n\n```javascript\nconst hello = "world";\nconsole.log(hello);\n```');
    const [html, setHtml] = useState('');
    const [loading, setLoading] = useState(false);

    // Convert on change with debounce
    React.useEffect(() => {
        if (isReactSnap()) {
            return;
        }
        const timer = setTimeout(async () => {
            if (!markdown.trim()) {
                setHtml('');
                return;
            }
            setLoading(true);
            try {
                const response = await apiClient.post(endpoints.services.markdownPreview, {
                    markdown,
                });
                setHtml(response.data.html);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [markdown]);

    return (
        <ServicePageShell
            icon={Article}
            title="Markdown Preview"
            subtitle="Write Markdown and see live HTML preview"
            maxWidth="md"
        >
            <Seo
                title="Live Markdown Preview & Editor - GitHub Flavor"
                toolId={23}
            />

            <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
                <Grid item xs={12} md={6} sx={{ display: 'flex', minHeight: { xs: 220, md: 0 } }}>
                    <Card sx={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <CardContent sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, flexShrink: 0 }}>
                                Markdown
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                value={markdown}
                                onChange={(e) => setMarkdown(e.target.value)}
                                placeholder="Write your markdown here..."
                                sx={{
                                    flex: 1,
                                    minHeight: 0,
                                    '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' },
                                    '& .MuiInputBase-input': {
                                        fontFamily: 'monospace',
                                        fontSize: '0.85rem',
                                        height: '100% !important',
                                        overflowY: 'auto !important',
                                    },
                                }}
                            />
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6} sx={{ display: 'flex', minHeight: { xs: 220, md: 0 } }}>
                    <Card sx={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <CardContent sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, flexShrink: 0 }}>
                                Preview {loading && '(updating...)'}
                            </Typography>
                            <Box
                                sx={{
                                    flex: 1,
                                    minHeight: 0,
                                    overflowY: 'auto',
                                    p: 2,
                                    borderRadius: 1,
                                    bgcolor: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    '& h1, & h2, & h3, & h4': {
                                        mt: 2,
                                        mb: 1,
                                        fontWeight: 700,
                                    },
                                    '& p': { mb: 1.5 },
                                    '& ul, & ol': { pl: 3 },
                                    '& code': {
                                        bgcolor: 'rgba(255,255,255,0.08)',
                                        px: 0.5,
                                        py: 0.25,
                                        borderRadius: 0.5,
                                        fontFamily: 'monospace',
                                        fontSize: '0.85em',
                                    },
                                    '& pre': {
                                        bgcolor: 'rgba(0,0,0,0.4)',
                                        color: 'grey.100',
                                        p: 2,
                                        borderRadius: 1,
                                        overflow: 'auto',
                                        '& code': {
                                            bgcolor: 'transparent',
                                            color: 'inherit',
                                        },
                                    },
                                    '& a': { color: 'primary.main' },
                                    '& blockquote': {
                                        borderLeft: '4px solid',
                                        borderColor: 'primary.main',
                                        pl: 2,
                                        ml: 0,
                                        color: 'text.secondary',
                                    },
                                    '& table': {
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        '& th, & td': {
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            p: 1,
                                        },
                                        '& th': { bgcolor: 'rgba(255,255,255,0.06)' },
                                    },
                                }}
                                dangerouslySetInnerHTML={{ __html: html }}
                            />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </ServicePageShell>
    );
};

export default MarkdownPreview;
