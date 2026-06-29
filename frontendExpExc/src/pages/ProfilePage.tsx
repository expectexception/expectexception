import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { endpoints } from '../api/endpoints';
import apiClient from '../api/config';
import { Box, Avatar, Typography, TextField, Button, CircularProgress, Divider, Stack, Paper, Chip, Grid } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    AddCircleOutline as CreateIcon,
    CloudUpload as UploadIcon,
    AdminPanelSettings as AdminIcon,
    Language as WebsiteIcon,
    History as ActivityIcon,
    Favorite as FavoriteIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';

interface ProfileData {
    id: number;
    user: number;
    bio: string;
    avatar: string | null;
    website: string | null;
    followers: number[];
    email_verified: boolean;
}

const BorderBeam: React.FC<{ activeColor?: string }> = ({ activeColor }) => {
  const theme = useTheme();
  const color = activeColor || theme.palette.primary.main;
  
  return (
    <Box
      className="border-beam-overlay"
      sx={{
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        border: '1.5px solid transparent',
        background: `linear-gradient(90deg, ${color}, #00e5ff) border-box`,
        WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        opacity: 0,
        pointerEvents: 'none',
        transition: 'opacity 0.4s ease',
        zIndex: 10,
        backgroundSize: '200% 200%',
        '@keyframes rotateGradient': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        animation: 'rotateGradient 4s linear infinite',
      }}
    />
  );
};

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

    const theme = useTheme();
    const primaryColor = theme.palette.primary.main;

    useEffect(() => {
        const fetchProfile = async () => {
            if (!email) return;
            try {
                const res = await apiClient.get(endpoints.profiles.get(email));
                const profileData = res.data.profile;
                setProfile(profileData);
                setBio(profileData.bio || '');
                setWebsite(profileData.website || '');

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
            setProfile(res.data);
            setEditing(false);
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60dvh' }}>
                <CircularProgress color="primary" />
            </Box>
        );
    }

    if (!profile) {
        return (
            <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h5" color="error">Profile not found.</Typography>
            </Box>
        );
    }

    const isOwnProfile = user && user.email === email;

    return (
        <Box sx={{ maxWidth: 1000, mx: 'auto', p: { xs: 2, md: 4 }, py: { xs: 4, md: 8 } }}>
            {/* Header Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Paper
                    sx={{
                        p: { xs: 3, md: 5 },
                        mb: 4,
                        position: 'relative',
                        overflow: 'hidden',
                        background: 'linear-gradient(135deg, rgba(13, 14, 18, 0.7) 0%, rgba(13, 14, 18, 0.4) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '20px',
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: 'center',
                        gap: 4,
                    }}
                >
                    <Box sx={{ position: 'relative' }}>
                        <Avatar
                            src={profile.avatar || undefined}
                            sx={{
                                width: 110,
                                height: 110,
                                border: `3px solid ${alpha(primaryColor, 0.25)}`,
                                boxShadow: `0 0 25px ${alpha(primaryColor, 0.15)}`,
                                fontSize: '2.5rem',
                                bgcolor: alpha(primaryColor, 0.1),
                                color: primaryColor,
                            }}
                        >
                            {email.charAt(0).toUpperCase()}
                        </Avatar>
                        {profile.email_verified && (
                            <Chip
                                label="VERIFIED"
                                size="small"
                                color="primary"
                                sx={{
                                    position: 'absolute',
                                    bottom: -10,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    fontWeight: 750,
                                    fontSize: '0.65rem',
                                    height: 20,
                                }}
                            />
                        )}
                    </Box>

                    <Box sx={{ textAlign: { xs: 'center', sm: 'left' }, flexGrow: 1 }}>
                        <Typography variant="h3" fontWeight="900" sx={{ mb: 1, letterSpacing: '-0.02em' }}>
                            {email}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-start' }, gap: 1 }}>
                            {website ? (
                                <>
                                    <WebsiteIcon sx={{ fontSize: 18, color: primaryColor }} />
                                    <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" style={{ color: primaryColor, textDecoration: 'none', fontWeight: 600 }}>
                                        {website}
                                    </a>
                                </>
                            ) : (
                                'No website linked'
                            )}
                        </Typography>
                    </Box>
                </Paper>
            </motion.div>

            {/* Profile Content */}
            <Grid container spacing={4}>
                {/* Left Column: About/Bio */}
                <Grid item xs={12} md={6}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                        <Paper
                            sx={{
                                p: 4,
                                height: '100%',
                                background: 'rgba(13, 14, 18, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: '16px',
                                position: 'relative',
                                overflow: 'hidden',
                                '&:hover .border-beam-overlay': { opacity: 1 },
                            }}
                        >
                            <BorderBeam />
                            <Typography variant="h5" fontWeight="800" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                About Me
                            </Typography>
                            <Divider sx={{ mb: 3 }} />

                            {editing ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    <TextField
                                        label="Bio"
                                        multiline
                                        rows={4}
                                        value={bio}
                                        onChange={e => setBio(e.target.value)}
                                        fullWidth
                                    />
                                    <TextField
                                        label="Website"
                                        value={website}
                                        onChange={e => setWebsite(e.target.value)}
                                        fullWidth
                                    />
                                    <Stack direction="row" spacing={2}>
                                        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
                                            Save
                                        </Button>
                                        <Button variant="outlined" startIcon={<CancelIcon />} onClick={() => setEditing(false)}>
                                            Cancel
                                        </Button>
                                    </Stack>
                                </Box>
                            ) : (
                                <Box>
                                    <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.7, mb: 4, fontStyle: profile.bio ? 'normal' : 'italic' }}>
                                        {profile.bio || 'No bio written yet. Click edit to add details about your skills and interests.'}
                                    </Typography>
                                    {isOwnProfile && (
                                        <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => setEditing(true)} sx={{ borderRadius: '8px' }}>
                                            Edit Profile
                                        </Button>
                                    )}
                                </Box>
                            )}
                        </Paper>
                    </motion.div>
                </Grid>

                {/* Right Column: Favorites & Activity */}
                <Grid item xs={12} md={6}>
                    <Stack spacing={4}>
                        {/* Favorite Tools */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                            <Paper
                                sx={{
                                    p: 4,
                                    background: 'rgba(13, 14, 18, 0.4)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    borderRadius: '16px',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&:hover .border-beam-overlay': { opacity: 1 },
                                }}
                            >
                                <BorderBeam activeColor="#00e5ff" />
                                <Typography variant="h5" fontWeight="800" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <FavoriteIcon sx={{ color: '#f43f5e' }} /> Favorite Tools
                                </Typography>
                                <Divider sx={{ mb: 3 }} />

                                {favorites.length === 0 ? (
                                    <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                        No bookmarked tools yet. Browse our services to add favorites.
                                    </Typography>
                                ) : (
                                    <Stack spacing={1.5}>
                                        {favorites.map((fav: any) => (
                                            <Paper
                                                key={fav.id}
                                                component={Link}
                                                to={`/services/${fav.service.slug || ''}`}
                                                sx={{
                                                    p: 2,
                                                    display: 'block',
                                                    textDecoration: 'none',
                                                    color: 'inherit',
                                                    background: 'rgba(255, 255, 255, 0.02)',
                                                    border: '1px solid rgba(255, 255, 255, 0.03)',
                                                    borderRadius: '10px',
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        borderColor: alpha(primaryColor, 0.3),
                                                        bgcolor: alpha(primaryColor, 0.04),
                                                        transform: 'translateX(4px)',
                                                    }
                                                }}
                                            >
                                                <Typography variant="subtitle2" fontWeight="700">
                                                    {fav.service.title}
                                                </Typography>
                                            </Paper>
                                        ))}
                                    </Stack>
                                )}
                            </Paper>
                        </motion.div>

                        {/* Recent Activity */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
                            <Paper
                                sx={{
                                    p: 4,
                                    background: 'rgba(13, 14, 18, 0.4)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    borderRadius: '16px',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&:hover .border-beam-overlay': { opacity: 1 },
                                }}
                            >
                                <BorderBeam activeColor={primaryColor} />
                                <Typography variant="h5" fontWeight="800" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <ActivityIcon sx={{ color: primaryColor }} /> Recent Activity
                                </Typography>
                                <Divider sx={{ mb: 3 }} />

                                {activity.length === 0 ? (
                                    <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>No recent activity.</Typography>
                                ) : (
                                    <Stack spacing={2}>
                                        {activity.slice(0, 5).map((act: any) => (
                                            <Box key={act.id} sx={{ pb: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.05)', '&:last-child': { borderBottom: 0, pb: 0 } }}>
                                                <Typography variant="body2" fontWeight="700" color="#ffffff">{act.action}</Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                                    {act.details}
                                                </Typography>
                                                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                                                    {new Date(act.created_at).toLocaleDateString()}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                )}
                            </Paper>
                        </motion.div>
                    </Stack>
                </Grid>
            </Grid>

            {/* Admin Actions Panel */}
            {token && user?.is_staff && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
                    <Paper
                        sx={{
                            mt: 5,
                            p: 4,
                            background: 'linear-gradient(135deg, rgba(13, 14, 18, 0.8) 0%, rgba(13, 14, 18, 0.4) 100%)',
                            border: `1px solid ${alpha(primaryColor, 0.15)}`,
                            borderRadius: '16px',
                            position: 'relative',
                            overflow: 'hidden',
                            '&:hover .border-beam-overlay': { opacity: 1 },
                        }}
                    >
                        <BorderBeam activeColor={primaryColor} />
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                            <AdminIcon sx={{ mr: 1.5, color: primaryColor }} />
                            <Typography variant="h5" fontWeight="800">Admin Controls</Typography>
                        </Box>
                        <Divider sx={{ mb: 3 }} />
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <Button
                                component={Link}
                                to="/admin/create-blog"
                                variant="contained"
                                startIcon={<CreateIcon />}
                                sx={{ borderRadius: '8px', fontWeight: 700 }}
                            >
                                Create Blog Post
                            </Button>
                            <Button
                                component={Link}
                                to="/admin/upload-resource"
                                variant="outlined"
                                startIcon={<UploadIcon />}
                                sx={{ borderRadius: '8px', fontWeight: 700 }}
                            >
                                Upload Resource
                            </Button>
                        </Stack>
                    </Paper>
                </motion.div>
            )}
        </Box>
    );
};

export default ProfilePage;
