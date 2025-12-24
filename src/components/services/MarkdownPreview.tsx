import React, { useState } from 'react';
import {
    Container, Card, CardContent, Typography, TextField, Box, Grid
} from '@mui/material';
import { Article } from '@mui/icons-material';
import Seo from '../seo/Seo';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';

const MarkdownPreview: React.FC = () => {
    const [markdown, setMarkdown] = useState('# Hello World\n\nThis is a **markdown** preview tool.\n\n## Features\n\n- Live preview\n- GitHub Flavored Markdown\n- Code highlighting\n\n```javascript\nconst hello = "world";\nconsole.log(hello);\n```');
    const [html, setHtml] = useState('');
    const [loading, setLoading] = useState(false);

    // Convert on change with debounce
    React.useEffect(() => {
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
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Seo
                title="Live Markdown Preview & Editor - GitHub Flavor"
                description="Write and preview GitHub Flavored Markdown in real-time. Fast, responsive editor with live HTML rendering and syntax highlighting."
                keywords={['markdown preview', 'online markdown editor', 'github flavored markdown', 'markdown to html', 'live markdown viewer', 'markdown editor', 'markdown previewer', 'md to html converter']}
            />


            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
                Markdown Preview
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
                Write Markdown and see live HTML preview
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                                Markdown
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={25}
                                value={markdown}
                                onChange={(e) => setMarkdown(e.target.value)}
                                placeholder="Write your markdown here..."
                                sx={{
                                    '& .MuiInputBase-input': {
                                        fontFamily: 'monospace',
                                        fontSize: '0.9rem',
                                    },
                                }}
                            />
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                                Preview
                            </Typography>
                            <Box
                                sx={{
                                    minHeight: 500,
                                    p: 2,
                                    borderRadius: 1,
                                    bgcolor: 'grey.50',
                                    '& h1, & h2, & h3, & h4': {
                                        mt: 2,
                                        mb: 1,
                                        fontWeight: 700,
                                    },
                                    '& p': { mb: 1.5 },
                                    '& ul, & ol': { pl: 3 },
                                    '& code': {
                                        bgcolor: 'grey.200',
                                        px: 0.5,
                                        py: 0.25,
                                        borderRadius: 0.5,
                                        fontFamily: 'monospace',
                                        fontSize: '0.85em',
                                    },
                                    '& pre': {
                                        bgcolor: 'grey.900',
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
                                        '& th': { bgcolor: 'grey.100' },
                                    },
                                }}
                                dangerouslySetInnerHTML={{ __html: html }}
                            />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
};

export default MarkdownPreview;
