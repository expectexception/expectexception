import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Typography, Box, Paper, CircularProgress, Button } from '@mui/material';
import { ArrowForward, OpenInNew } from '@mui/icons-material';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';

const SharedResultPage: React.FC = () => {
    const { shortId } = useParams<{ shortId: string }>();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!shortId) return;
        apiClient.get(endpoints.services.shareRetrieve(shortId))
            .then(res => setData(res.data))
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [shortId]);

    return (
        <Container maxWidth="md" sx={{ py: 6 }}>
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
            ) : notFound ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Share link expired or not found</Typography>
                    <Typography color="text.secondary" sx={{ mb: 3 }}>Shared results are available for 24 hours.</Typography>
                    <Button component={Link} to="/services" variant="contained" startIcon={<ArrowForward />}>Browse Tools</Button>
                </Box>
            ) : (
                <>
                    <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>Shared Tool Result</Typography>
                    <Typography color="text.secondary" sx={{ mb: 3 }}>
                        Tool: <strong>{data?.tool_path}</strong>
                        {data?.tool_path && (
                            <Button component={Link} to={data.tool_path} size="small" startIcon={<OpenInNew />} sx={{ ml: 1 }}>Open Tool</Button>
                        )}
                    </Typography>
                    <Paper sx={{ p: 3, bgcolor: '#0d1117', borderRadius: 2 }}>
                        <Typography component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#c9d1d9', whiteSpace: 'pre-wrap', wordBreak: 'break-all', m: 0 }}>
                            {typeof data?.result_data === 'string' ? data.result_data : JSON.stringify(data?.result_data, null, 2)}
                        </Typography>
                    </Paper>
                </>
            )}
        </Container>
    );
};

export default SharedResultPage;
