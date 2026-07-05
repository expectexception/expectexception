import React, { useState } from 'react';
import {
    Card, CardContent, Typography, Button, Box,
    ToggleButton, ToggleButtonGroup, List, ListItem, ListItemText, IconButton, Slider,
} from '@mui/material';
import { Fingerprint, ContentCopy } from '@mui/icons-material';
import Seo from '../seo/Seo';
import ServicePageShell from './ServicePageShell';
import apiClient from '../../api/config';
import { endpoints } from '../../api/endpoints';

const UuidGenerator: React.FC = () => {
    const [version, setVersion] = useState('4');
    const [count, setCount] = useState(5);
    const [uuids, setUuids] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get(endpoints.services.uuidGenerator, {
                params: { version, count },
            });
            setUuids(response.data.uuids);
        } catch (err: any) {
            setError(err.response?.data?.error || 'UUID generation failed');
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
        <ServicePageShell
            icon={Fingerprint}
            title="UUID Generator"
            subtitle="Generate unique identifiers (UUIDs/GUIDs)"
            about="Generates UUIDs (universally unique identifiers, also called GUIDs) in version 1 (time-based) or version 4 (random) format, in bulk — up to 100 at once. Generation for both versions happens on the backend, which returns the requested count as a JSON array. Useful for seeding database primary keys, generating test/mock IDs, or anywhere you need guaranteed-unique identifiers without coordinating with anyone else."
            howToSteps={[
                { name: 'Pick a version', text: 'Choose v1 (Time-based) or v4 (Random) from the Version toggle.' },
                { name: 'Choose how many', text: 'Drag the Count slider to choose how many UUIDs to generate, from 1 to 100.' },
                { name: 'Generate', text: 'Click Generate N UUIDs to request them.' },
                { name: 'Copy what you need', text: 'Click the copy icon next to any individual UUID in the list, or click Copy All to copy the entire list (one per line) at once.' },
            ]}
            faq={[
                { question: 'What is the difference between v1 and v4 UUIDs?', answer: 'v1 UUIDs are time-based — they encode the timestamp of creation, so they sort roughly chronologically but can leak information about when they were generated. v4 UUIDs are fully random and reveal nothing about their origin, which is why v4 is the more common default today.' },
                { question: 'How many can I generate at once?', answer: 'Up to 100 per request, controlled by the Count slider.' },
                { question: 'Is generation done in my browser or on a server?', answer: 'On the server — the tool calls a backend endpoint with your chosen version and count and gets the UUIDs back as JSON, so it does involve a network request (unlike, say, the Password Generator on this site, which is fully local).' },
                { question: 'Are these guaranteed to be unique?', answer: "Practically, yes — the probability of a v4 collision is astronomically small, and v1 UUIDs combine a timestamp with additional bits specifically to avoid collisions between rapidly-generated IDs." },
            ]}
        >
            <Seo
                title="UUID / GUID Generator - v1 & v4 Random IDs"
                toolId={21}
            />

            <Card sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    <Box sx={{ mb: 2, flexShrink: 0 }}>
                        <Typography gutterBottom variant="body2">Version</Typography>
                        <ToggleButtonGroup
                            value={version}
                            exclusive
                            onChange={(_, v) => v && setVersion(v)}
                            color="primary"
                            size="small"
                        >
                            <ToggleButton value="1">v1 (Time-based)</ToggleButton>
                            <ToggleButton value="4">v4 (Random)</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    <Box sx={{ mb: 2, flexShrink: 0 }}>
                        <Typography gutterBottom variant="body2">Count: {count}</Typography>
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
                        sx={{ py: 1.25, mb: 2, flexShrink: 0 }}
                    >
                        {loading ? 'Generating...' : `Generate ${count} UUID${count > 1 ? 's' : ''}`}
                    </Button>

                    {error && (
                        <Typography variant="body2" color="error" sx={{ mb: 2, flexShrink: 0 }}>
                            {error}
                        </Typography>
                    )}

                    {uuids.length > 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexShrink: 0 }}>
                                <Typography variant="subtitle2">Generated UUIDs</Typography>
                                <Button size="small" startIcon={<ContentCopy />} onClick={handleCopyAll}>
                                    Copy All
                                </Button>
                            </Box>
                            <Box sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2, flex: 1, minHeight: 0, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
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
                        </Box>
                    )}
                </CardContent>
            </Card>
        </ServicePageShell>
    );
};

export default UuidGenerator;
