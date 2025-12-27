import React, { useState } from 'react';
import {
    Container, Card, CardContent, Typography, Button, Box, TextField,
    ToggleButton, ToggleButtonGroup, List, ListItem, ListItemText, IconButton, Slider
} from '@mui/material';
import { Fingerprint, ContentCopy, Refresh, Delete } from '@mui/icons-material';
import Seo from '../seo/Seo';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';

const UuidGenerator: React.FC = () => {
    const [version, setVersion] = useState('4');
    const [count, setCount] = useState(5);
    const [uuids, setUuids] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get(endpoints.services.uuidGenerator, {
                params: { version, count },
            });
            setUuids(response.data.uuids);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (uuid: string) => {
        navigator.clipboard.writeText(uuid);
    };

    const handleCopyAll = () => {
        navigator.clipboard.writeText(uuids.join('\n'));
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Seo
                title="UUID / GUID Generator - v1 & v4 Random IDs"
                toolId={21}
            />


            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
                UUID Generator
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
                Generate unique identifiers (UUIDs/GUIDs)
            </Typography>

            <Card>
                <CardContent sx={{ p: 4 }}>
                    <Box sx={{ mb: 3 }}>
                        <Typography gutterBottom>Version</Typography>
                        <ToggleButtonGroup
                            value={version}
                            exclusive
                            onChange={(_, v) => v && setVersion(v)}
                            color="primary"
                        >
                            <ToggleButton value="1">v1 (Time-based)</ToggleButton>
                            <ToggleButton value="4">v4 (Random)</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography gutterBottom>Count: {count}</Typography>
                        <Slider
                            value={count}
                            onChange={(_, v) => setCount(v as number)}
                            min={1}
                            max={100}
                            marks={[{ value: 1, label: '1' }, { value: 50, label: '50' }, { value: 100, label: '100' }]}
                        />
                    </Box>

                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleGenerate}
                        disabled={loading}
                        startIcon={<Fingerprint />}
                        sx={{ py: 1.5, mb: 3 }}
                    >
                        {loading ? 'Generating...' : `Generate ${count} UUID${count > 1 ? 's' : ''}`}
                    </Button>

                    {uuids.length > 0 && (
                        <>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle2">Generated UUIDs</Typography>
                                <Button size="small" startIcon={<ContentCopy />} onClick={handleCopyAll}>
                                    Copy All
                                </Button>
                            </Box>
                            <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, maxHeight: 400, overflow: 'auto' }}>
                                <List dense>
                                    {uuids.map((uuid, i) => (
                                        <ListItem
                                            key={i}
                                            secondaryAction={
                                                <IconButton edge="end" onClick={() => handleCopy(uuid)}>
                                                    <ContentCopy fontSize="small" />
                                                </IconButton>
                                            }
                                        >
                                            <ListItemText
                                                primary={uuid}
                                                primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Box>
                        </>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
};

export default UuidGenerator;
