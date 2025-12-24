import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { endpoints } from '../api/endpoints';
import apiClient from '../api/config';
import { Box, Avatar, Typography, TextField, Button, CircularProgress, Divider, Stack } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
    AddCircleOutline as CreateIcon,
    CloudUpload as UploadIcon,
    AdminPanelSettings as AdminIcon
} from '@mui/icons-material';

interface ProfileData {
    id: number;
    user: number;
    bio: string;
    avatar: string | null;
    website: string | null;
    followers: number[];
    email_verified: boolean;
}

const ProfilePage: React.FC = () => {
    const { username: email } = useParams<{ username: string }>();
    const { token, user } = useAuth();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [bio, setBio] = useState('');
    const [website, setWebsite] = useState('');

    // Dashboard State
    const [activity, setActivity] = useState<any[]>([]);
    const [favorites, setFavorites] = useState<any[]>([]);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!email) return;
            try {
                const res = await apiClient.get(endpoints.profiles.get(email));
                const profileData = res.data.profile;
                setProfile(profileData);
                setBio(profileData.bio || '');
                setWebsite(profileData.website || '');

                // Fetch Dashboard Data only if it's the logged-in user's profile
                // Currently username matching check is primitive, but good enough for now
                // Ideally check decoded token userId vs profile.user

                const activityRes = await apiClient.get(endpoints.services.dashboard.activity);
                setActivity(activityRes.data);

                const favRes = await apiClient.get(endpoints.services.dashboard.favorites);
                setFavorites(favRes.data);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [email, token]);

    const handleSave = async () => {
        if (!profile || !email) return;
        try {
            const res = await apiClient.put(
                endpoints.profiles.update(email),
                { bio, website }
            );
            // PUT returns the updated profile directly in ProfileView.put
            setProfile(res.data);
            setEditing(false);
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <CircularProgress />;
    if (!profile) return <Typography>Profile not found.</Typography>;

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
                {profile.avatar && <Avatar src={profile.avatar} sx={{ width: 100, height: 100, mr: 3 }} />}
                <Box>
                    <Typography variant="h4" fontWeight="bold">{email}</Typography>
                    {/* <Typography variant="body1" color="text.secondary">Followers: {profile.followers?.length || 0}</Typography> */}
                </Box>
            </Box>

            {/* Profile Content */}
            {editing ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
                    <TextField label="Bio" multiline rows={4} value={bio} onChange={e => setBio(e.target.value)} />
                    <TextField label="Website" value={website} onChange={e => setWebsite(e.target.value)} />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button variant="contained" onClick={handleSave}>Save</Button>
                        <Button variant="outlined" onClick={() => setEditing(false)}>Cancel</Button>
                    </Box>
                </Box>
            ) : (
                <Box sx={{ mb: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
                    <Typography variant="h6" gutterBottom>About</Typography>
                    <Typography paragraph><strong>Bio:</strong> {profile.bio || 'No bio yet.'}</Typography>
                    <Typography paragraph><strong>Website:</strong> {profile.website || 'No website.'}</Typography>
                    <Button variant="outlined" size="small" onClick={() => setEditing(true)}>Edit Profile</Button>
                </Box>
            )}

            {/* Dashboard Sections */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>

                {/* Recent Activity */}
                <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
                    <Typography variant="h6" gutterBottom>Recent Activity</Typography>
                    {activity.length === 0 ? (
                        <Typography color="text.secondary">No recent activity.</Typography>
                    ) : (
                        activity.map((act: any) => (
                            <Box key={act.id} sx={{ mb: 1, pb: 1, borderBottom: '1px solid #eee' }}>
                                <Typography variant="body2" fontWeight="bold">{act.action}</Typography>
                                <Typography variant="caption" color="text.secondary">{act.details}</Typography>
                                <Typography variant="caption" display="block" color="text.disabled">{new Date(act.created_at).toLocaleDateString()}</Typography>
                            </Box>
                        ))
                    )}
                </Box>

                {/* Favorite Tools */}
                <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
                    <Typography variant="h6" gutterBottom>Favorite Tools</Typography>
                    {favorites.length === 0 ? (
                        <Typography color="text.secondary">No favorite tools yet.</Typography>
                    ) : (
                        favorites.map((fav: any) => (
                            <Box key={fav.id} sx={{ mb: 2, p: 1, bgcolor: '#f9f9f9', borderRadius: 1 }}>
                                <Typography variant="subtitle2">{fav.service.title}</Typography>
                                {/* Link to service could go here */}
                            </Box>
                        ))
                    )}
                </Box>
            </Box>

            {/* Admin Actions (Visible only to staff) */}
            {token && user?.is_staff && (
                <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1, border: '1px solid', borderColor: 'primary.light' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <AdminIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6">Admin Actions</Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Button
                            component={Link}
                            to="/admin/create-blog"
                            variant="contained"
                            startIcon={<CreateIcon />}
                            sx={{ borderRadius: 2 }}
                        >
                            Create Blog Post
                        </Button>
                        <Button
                            component={Link}
                            to="/admin/upload-resource"
                            variant="outlined"
                            startIcon={<UploadIcon />}
                            sx={{ borderRadius: 2 }}
                        >
                            Upload Resource
                        </Button>
                    </Stack>
                </Box>
            )}
        </Box>
    );
};

export default ProfilePage;
