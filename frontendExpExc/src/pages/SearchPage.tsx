import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    TextField,
    InputAdornment,
    Grid,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Stack,
    Button
} from '@mui/material';
import { Search, Article, Build, Download, ArrowForward } from '@mui/icons-material';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';
import { motion } from 'framer-motion';

interface SearchResult {
    id: string;
    type: 'Blog' | 'Tool' | 'Download';
    title: string;
    description: string;
    url: string;
    image?: string;
    icon?: string;
    category?: string;
}

const SearchPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const q = params.get('q');
        if (q) {
            setQuery(q);
            performSearch(q);
        }
    }, [location.search]);

    const performSearch = async (searchTerm: string) => {
        setLoading(true);
        try {
            const response = await apiClient.get(`${endpoints.services.search}?q=${encodeURIComponent(searchTerm)}`);
            setResults(response.data);
        } catch (error) {
            console.error('Search failed:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query)}`);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'Blog': return <Article />;
            case 'Tool': return <Build />;
            case 'Download': return <Download />;
            default: return <Search />;
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'Blog': return 'primary';
            case 'Tool': return 'secondary';
            case 'Download': return 'success';
            default: return 'default';
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 6 }}>
            <Typography variant="h3" fontWeight={800} gutterBottom>
                Search Results
            </Typography>

            <Box component="form" onSubmit={handleSearch} sx={{ mb: 6 }}>
                <TextField
                    fullWidth
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for blogs, tools, and resources..."
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search />
                            </InputAdornment>
                        ),
                        sx: { fontSize: '1.2rem', py: 1 }
                    }}
                />
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {results.length > 0 ? (
                        results.map((result, index) => (
                            <Grid item xs={12} md={6} key={result.id}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                        <CardContent sx={{ flexGrow: 1 }}>
                                            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                                                <Chip
                                                    icon={getIcon(result.type)}
                                                    label={result.type}
                                                    color={getColor(result.type) as any}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                                {result.category && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {result.category}
                                                    </Typography>
                                                )}
                                            </Stack>

                                            <Typography variant="h6" gutterBottom component={Link} to={result.url} sx={{ textDecoration: 'none', color: 'inherit', fontWeight: 'bold', '&:hover': { color: 'primary.main' } }}>
                                                {result.title}
                                            </Typography>

                                            <Typography variant="body2" color="text.secondary">
                                                {result.description}
                                            </Typography>
                                        </CardContent>
                                        <Box sx={{ p: 2, pt: 0 }}>
                                            <Button component={Link} to={result.url} endIcon={<ArrowForward />}>
                                                View Details
                                            </Button>
                                        </Box>
                                    </Card>
                                </motion.div>
                            </Grid>
                        ))
                    ) : (
                        <Grid item xs={12}>
                            <Box sx={{ textAlign: 'center', py: 8 }}>
                                <Typography variant="h6" color="text.secondary">
                                    No results found for "{query}"
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Try checking your spelling or use different keywords.
                                </Typography>
                            </Box>
                        </Grid>
                    )}
                </Grid>
            )}
        </Container>
    );
};

export default SearchPage;
