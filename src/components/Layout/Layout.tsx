import React, { useState, useEffect } from 'react';
import {
    AppBar,
    Toolbar,
    Grid,
    Container,
    Button,
    IconButton,
    Drawer,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Box,
    Typography,
    Avatar,
    Tooltip,
    Badge,
    Menu,
    MenuItem,
    Stack,
    Divider,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
    Menu as MenuIcon,
    Home,
    Build,
    Article,
    Notifications,
    Search,
    Person,
    Close,
    Dashboard,
    Login,
    Logout,
    AppRegistration,
    Code,
    AdminPanelSettings,
    ChatBubbleOutline,
    SportsEsports,
    Forum,
    DarkMode,
    LightMode,
    SettingsBrightness,
} from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useCustomTheme } from '../../context/CustomThemeContext';
import ScrollToTop from '../layout/ScrollToTop';
import SearchDialog from '../layout/SearchDialog';
import CommandPalette from '../layout/CommandPalette';
import ChatbotWidget from '../layout/ChatbotWidget';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, logout, user } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [chatbotOpen, setChatbotOpen] = useState(false);
    const theme = useTheme();
    const location = useLocation();
    const { colorMode, setColorMode } = useCustomTheme();

    const cycleModeIcon = colorMode === 'dark' ? <DarkMode sx={{ fontSize: 20 }} />
        : colorMode === 'light' ? <LightMode sx={{ fontSize: 20 }} />
        : <SettingsBrightness sx={{ fontSize: 20 }} />;
    const nextMode = colorMode === 'dark' ? 'light' : colorMode === 'light' ? 'system' : 'dark';
    const modeLabel = colorMode === 'dark' ? 'Switch to Light Mode' : colorMode === 'light' ? 'Switch to System Mode' : 'Switch to Dark Mode';

    // Scroll detection for navbar effects
    React.useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Profile Menu
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleProfileMenuClose = () => {
        setAnchorEl(null);
    };
    const handleLogout = () => {
        logout();
        handleProfileMenuClose();
    };

    // Notification Menu
    const { notifications, inAppNotifications, unreadCount, markAllRead, markOneRead } = useNotifications();
    const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null);

    const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
        setNotificationAnchorEl(event.currentTarget);
    };

    const handleNotificationClose = () => {
        setNotificationAnchorEl(null);
    };

    const handleNotificationItemClick = (id: number, url?: string) => {
        markOneRead(id);
        handleNotificationClose();
        if (url) window.location.href = url;
    };

    // Search / Command Palette
    const [searchOpen, setSearchOpen] = useState(false);
    const [cmdOpen, setCmdOpen] = useState(false);
    const handleSearchOpen = () => setCmdOpen(true);
    const handleSearchClose = () => setSearchOpen(false);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(o => !o); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const navItems = [
        { label: 'Home', path: '/', icon: <Home /> },
        { label: 'Services', path: '/services', icon: <Build /> },
        { label: 'Sandbox', path: '/sandbox', icon: <SportsEsports /> },
        { label: 'Community', path: '/community', icon: <Forum /> },
        { label: 'Blogs', path: '/blogs', icon: <Article /> },
        { label: 'Daemon', onClick: () => setChatbotOpen(true), icon: <ChatBubbleOutline /> },
    ];

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const drawer = (
        <Box sx={{
            width: 280,
            height: '100%',
            bgcolor: '#0d0e12',
            display: 'flex',
            flexDirection: 'column',
            backgroundImage: `linear-gradient(to bottom, ${alpha(theme.palette.primary.main, 0.03)}, transparent)`,
            borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
        }}>
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        borderRadius: '6px',
                        border: '1.5px solid',
                        borderColor: 'primary.main',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                    }}>
                        <Code sx={{ fontSize: 16 }} />
                    </Box>
                    <Typography variant="h6" color="#ffffff" fontWeight="800" sx={{ letterSpacing: '-0.03em' }}>
                        Expect<span style={{ color: theme.palette.primary.main }}>Exception</span>
                    </Typography>
                </Stack>
                <IconButton onClick={handleDrawerToggle} sx={{ bgcolor: alpha('#ffffff', 0.05), color: '#ffffff' }}>
                    <Close fontSize="small" />
                </IconButton>
            </Box>

            <List sx={{ px: 2, flexGrow: 1 }}>
                {navItems.map((item) => {
                    const isSelected = item.path ? location.pathname === item.path : false;
                    const itemProps = item.path
                        ? { component: Link as any, to: item.path, onClick: handleDrawerToggle }
                        : {
                            component: 'div' as any,
                            onClick: () => {
                                item.onClick?.();
                                handleDrawerToggle();
                            },
                            style: { cursor: 'pointer' }
                        };
                    return (
                        <ListItem
                            key={item.label}
                            {...itemProps}
                            sx={{
                                borderRadius: 2,
                                mb: 1,
                                py: 1.25,
                                bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                                color: isSelected ? 'primary.main' : '#94a3b8',
                                border: '1px solid',
                                borderColor: isSelected ? alpha(theme.palette.primary.main, 0.15) : 'transparent',
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                                    color: 'primary.main',
                                },
                                transition: 'all 0.2s',
                            }}
                        >
                            <ListItemIcon sx={{
                                color: isSelected ? 'primary.main' : '#94a3b8',
                                minWidth: 36
                            }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText
                                primary={item.label}
                                primaryTypographyProps={{
                                    fontWeight: isSelected ? 700 : 500,
                                    fontSize: '0.9rem'
                                }}
                            />
                        </ListItem>
                    );
                })}

                {/* Admin Dashboard - Only visible for admin users in mobile drawer */}
                {isAuthenticated && user?.is_staff && (
                    <ListItem
                        component={Link}
                        to="/admin/dashboard"
                        onClick={handleDrawerToggle}
                        sx={{
                            borderRadius: 2,
                            mb: 1,
                            py: 1.25,
                            bgcolor: location.pathname === '/admin/dashboard' ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                            color: location.pathname === '/admin/dashboard' ? 'primary.main' : '#94a3b8',
                            border: '1px solid',
                            borderColor: location.pathname === '/admin/dashboard' ? alpha(theme.palette.primary.main, 0.15) : 'transparent',
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                color: 'primary.main',
                            },
                            transition: 'all 0.2s',
                        }}
                    >
                        <ListItemIcon sx={{
                            color: location.pathname === '/admin/dashboard' ? 'primary.main' : '#94a3b8',
                            minWidth: 36
                        }}>
                            <AdminPanelSettings />
                        </ListItemIcon>
                        <ListItemText
                            primary="Admin"
                            primaryTypographyProps={{
                                fontWeight: location.pathname === '/admin/dashboard' ? 700 : 500,
                                fontSize: '0.9rem'
                            }}
                        />
                    </ListItem>
                )}
            </List>

            {/* Mobile Auth Section */}
            <Box sx={{ p: 3, borderTop: '1px solid rgba(255, 255, 255, 0.05)', bgcolor: 'rgba(5, 5, 5, 0.4)' }}>
                {isAuthenticated ? (
                    <Stack spacing={2}>
                        <Box sx={{
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                            border: '1px solid',
                            borderColor: alpha(theme.palette.primary.main, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5
                        }}>
                            <Avatar sx={{
                                bgcolor: 'primary.main',
                                color: '#000000',
                                fontWeight: 700,
                                width: 36,
                                height: 36,
                                border: '2px solid rgba(255,255,255,0.1)'
                            }}>
                                {user?.email?.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle2" fontWeight="bold" noWrap color="#ffffff">
                                    {user?.email?.split('@')[0]}
                                </Typography>
                                <Typography variant="caption" color="#94a3b8" noWrap display="block">
                                    {user?.email}
                                </Typography>
                            </Box>
                        </Box>
                        <Button
                            component={Link}
                            to={`/profile/${user?.email}`}
                            onClick={handleDrawerToggle}
                            variant="outlined"
                            startIcon={<Person />}
                            fullWidth
                            sx={{ borderRadius: 2 }}
                        >
                            My Profile
                        </Button>
                        <Button
                            onClick={handleLogout}
                            variant="text"
                            color="error"
                            startIcon={<Logout />}
                            fullWidth
                            sx={{ borderRadius: 2 }}
                        >
                            Logout
                        </Button>
                    </Stack>
                ) : (
                    <Stack spacing={2}>
                        <Button
                            component={Link}
                            to="/login"
                            onClick={handleDrawerToggle}
                            variant="outlined"
                            startIcon={<Login />}
                            fullWidth
                            sx={{
                                borderRadius: 2,
                                py: 1.25,
                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                color: '#ffffff',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    bgcolor: alpha(theme.palette.primary.main, 0.05)
                                }
                            }}
                        >
                            Sign In
                        </Button>
                        <Button
                            component={Link}
                            to="/register"
                            onClick={handleDrawerToggle}
                            variant="contained"
                            startIcon={<AppRegistration />}
                            fullWidth
                            sx={{
                                borderRadius: 2,
                                py: 1.25,
                                background: theme.palette.primary.main,
                                color: '#000000',
                                fontWeight: 700,
                                '&:hover': {
                                    background: theme.palette.primary.light,
                                    transform: 'translateY(-1px)',
                                }
                            }}
                        >
                            Register
                        </Button>
                    </Stack>
                )}
            </Box>
        </Box >
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#050505' }}>
            {/* App Bar - Hidden on chat page */}
            {!location.pathname.startsWith('/chat') && (
                <AppBar
                    position="sticky"
                    elevation={0}
                    sx={{
                        bgcolor: scrolled ? 'rgba(10, 11, 14, 0.85)' : 'rgba(10, 11, 14, 0.4)',
                        borderBottom: scrolled ? `1px solid ${alpha(theme.palette.primary.main, 0.15)}` : '1px solid rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(20px)',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: scrolled ? `0 10px 30px -10px rgba(0,0,0,0.5), 0 1px 0 0 ${alpha(theme.palette.primary.main, 0.1)}` : 'none',
                    }}
                >
                    <Container maxWidth="xl">
                        <Toolbar sx={{ px: { xs: 1, sm: 2 }, minHeight: { xs: 58, sm: 64, md: 72 }, flexWrap: 'nowrap' }}>
                            {/* Logo */}
                            <Box sx={{ display: 'flex', alignItems: 'center', mr: { xs: 1, md: 4 }, flexShrink: 0 }}>
                                <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', gap: 8 }}>
                                    <Box sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 32,
                                        height: 32,
                                        borderRadius: '8px',
                                        border: '2px solid',
                                        borderColor: 'primary.main',
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        color: 'primary.main',
                                        boxShadow: `0 0 12px ${alpha(theme.palette.primary.main, 0.2)}`,
                                    }}>
                                        <Code sx={{ fontSize: 18 }} />
                                    </Box>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontWeight: 850,
                                            fontSize: { xs: '1rem', sm: '1.15rem', md: '1.35rem' },
                                            letterSpacing: '-0.03em',
                                            color: '#ffffff',
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}
                                    >
                                        Expect<span style={{ color: theme.palette.primary.main, marginLeft: '2px' }}>Exception</span>
                                    </Typography>
                                </Link>
                            </Box>

                            {/* Desktop Navigation */}
                            <Box sx={{ display: { xs: 'none', md: 'flex' }, flexGrow: 1, gap: 1, ml: 2 }}>
                                {navItems.map((item) => {
                                    const isSelected = item.path ? location.pathname === item.path : false;
                                    const buttonProps = item.path
                                        ? { component: Link as any, to: item.path }
                                        : { onClick: item.onClick };
                                    return (
                                        <Button
                                            key={item.label}
                                            {...buttonProps}
                                            size="small"
                                            sx={{
                                                color: isSelected ? 'primary.main' : '#94a3b8',
                                                fontWeight: isSelected ? 700 : 500,
                                                fontSize: '0.9rem',
                                                px: 2,
                                                py: 0.75,
                                                minWidth: 'auto',
                                                position: 'relative',
                                                whiteSpace: 'nowrap',
                                                transition: 'all 0.3s ease',
                                                '&::after': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    bottom: 2,
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    width: isSelected ? '50%' : '0%',
                                                    height: '2px',
                                                    bgcolor: 'primary.main',
                                                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    boxShadow: `0 0 8px ${theme.palette.primary.main}`,
                                                },
                                                '&:hover': {
                                                    color: 'primary.main',
                                                    bgcolor: 'transparent',
                                                    textShadow: `0 0 10px ${alpha(theme.palette.primary.main, 0.5)}`,
                                                    '&::after': {
                                                        width: '50%',
                                                    },
                                                },
                                            }}
                                        >
                                            {item.label}
                                        </Button>
                                    );
                                })}

                                {/* Admin Dashboard - Only visible for admin users */}
                                {isAuthenticated && user?.is_staff && (
                                    <Button
                                        component={Link}
                                        to="/admin/dashboard"
                                        size="small"
                                        sx={{
                                            color: location.pathname === '/admin/dashboard' ? 'primary.main' : '#94a3b8',
                                            fontWeight: location.pathname === '/admin/dashboard' ? 700 : 505,
                                            fontSize: '0.9rem',
                                            px: 2,
                                            py: 0.75,
                                            minWidth: 'auto',
                                            position: 'relative',
                                            whiteSpace: 'nowrap',
                                            '&::after': {
                                                content: '""',
                                                position: 'absolute',
                                                bottom: 2,
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                width: location.pathname === '/admin/dashboard' ? '50%' : '0%',
                                                height: '2px',
                                                bgcolor: 'primary.main',
                                                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            },
                                            '&:hover': {
                                                color: 'primary.main',
                                                bgcolor: 'transparent',
                                                '&::after': {
                                                    width: '50%',
                                                },
                                            },
                                        }}
                                    >
                                        Admin
                                    </Button>
                                )}
                            </Box>

                            {/* Right Side Actions */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5, md: 2 }, ml: 'auto' }}>
                                <Tooltip title="Search  ⌘K">
                                    <IconButton onClick={handleSearchOpen} size="small" sx={{ p: 1, color: '#94a3b8', '&:hover': { color: 'primary.main' } }}>
                                        <Search sx={{ fontSize: 22 }} />
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title={modeLabel}>
                                    <IconButton onClick={() => setColorMode(nextMode)} size="small" sx={{ p: 1, color: '#94a3b8', '&:hover': { color: 'primary.main' } }}>
                                        {cycleModeIcon}
                                    </IconButton>
                                </Tooltip>

                                {/* LET'S TALK CTA Button */}
                                <Button
                                    component={Link}
                                    to="/hire"
                                    variant="contained"
                                    size="small"
                                    sx={{
                                        display: { xs: 'none', sm: 'inline-flex' },
                                        borderRadius: '30px',
                                        px: 3.5,
                                        py: 1,
                                        fontWeight: 800,
                                        fontSize: '0.85rem',
                                        letterSpacing: '0.05em',
                                        background: theme.palette.primary.main,
                                        color: '#000000',
                                        animation: 'pulseGlow 2s infinite alternate',
                                        '@keyframes pulseGlow': {
                                            '0%': { boxShadow: '0 0 4px ' + alpha(theme.palette.primary.main, 0.3) },
                                            '100%': { boxShadow: '0 0 16px ' + alpha(theme.palette.primary.main, 0.7) }
                                        },
                                        '&:hover': {
                                            background: theme.palette.primary.light,
                                            boxShadow: '0 0 24px ' + alpha(theme.palette.primary.main, 0.8),
                                        }
                                    }}
                                >
                                    LET'S TALK
                                </Button>

                                {/* Desktop Auth / Profile */}
                                <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center' }}>
                                    {isAuthenticated ? (
                                        <>
                                            {/* Notification Bell */}
                                            <Tooltip title="Notifications">
                                                <IconButton onClick={handleNotificationClick} size="small" sx={{ p: 1, color: '#94a3b8', '&:hover': { color: 'primary.main' }, mr: 0.5 }}>
                                                    <Badge badgeContent={unreadCount > 0 ? unreadCount : undefined} color="error" max={9}>
                                                        <Notifications sx={{ fontSize: 22 }} />
                                                    </Badge>
                                                </IconButton>
                                            </Tooltip>
                                            <Menu
                                                anchorEl={notificationAnchorEl}
                                                open={Boolean(notificationAnchorEl)}
                                                onClose={handleNotificationClose}
                                                PaperProps={{ sx: { mt: 1.5, minWidth: 320, maxWidth: 360, bgcolor: '#0d0e12', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, maxHeight: 400, overflow: 'auto' } }}
                                                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                                            >
                                                <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                    <Typography variant="subtitle2" fontWeight={700}>Notifications</Typography>
                                                    {unreadCount > 0 && (
                                                        <Button size="small" onClick={markAllRead} sx={{ fontSize: '0.7rem', color: 'primary.main', p: 0 }}>Mark all read</Button>
                                                    )}
                                                </Box>
                                                {inAppNotifications.length === 0 ? (
                                                    <MenuItem disabled sx={{ py: 2, justifyContent: 'center', color: 'text.secondary', fontSize: '0.85rem' }}>
                                                        No notifications yet
                                                    </MenuItem>
                                                ) : (
                                                    inAppNotifications.slice(0, 15).map(n => (
                                                        <MenuItem key={n.id} onClick={() => handleNotificationItemClick(n.id, n.url)} sx={{ py: 1.5, px: 2, opacity: n.is_read ? 0.6 : 1, alignItems: 'flex-start', gap: 1 }}>
                                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: n.is_read ? 'transparent' : 'primary.main', mt: 0.75, flexShrink: 0 }} />
                                                            <Box sx={{ minWidth: 0 }}>
                                                                <Typography variant="body2" fontWeight={n.is_read ? 400 : 600} sx={{ lineHeight: 1.3 }}>{n.title}</Typography>
                                                                {n.body && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{n.body}</Typography>}
                                                            </Box>
                                                        </MenuItem>
                                                    ))
                                                )}
                                            </Menu>
                                            <IconButton onClick={handleProfileMenuOpen} size="small" sx={{ p: 0.5 }}>
                                                <Avatar sx={{
                                                    bgcolor: 'primary.main',
                                                    color: '#000000',
                                                    fontWeight: 700,
                                                    width: 34,
                                                    height: 34,
                                                    fontSize: '0.9rem',
                                                    border: '2px solid rgba(255,255,255,0.1)'
                                                }}>
                                                    {user?.email?.charAt(0).toUpperCase() || <Person />}
                                                </Avatar>
                                            </IconButton>
                                            <Menu
                                                anchorEl={anchorEl}
                                                open={Boolean(anchorEl)}
                                                onClose={handleProfileMenuClose}
                                                PaperProps={{
                                                    sx: {
                                                        mt: 1.5,
                                                        minWidth: 200,
                                                        bgcolor: '#0d0e12',
                                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                                        borderRadius: 2,
                                                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                                                    }
                                                }}
                                                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                                            >
                                                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255, 255, 255, 0.05)', mb: 1 }}>
                                                    <Typography variant="subtitle2" fontWeight="bold" color="#ffffff">Account</Typography>
                                                    <Typography variant="caption" color="#94a3b8" noWrap display="block">{user?.email}</Typography>
                                                </Box>
                                                <MenuItem
                                                    component={Link}
                                                    to={`/profile/${user?.email}`}
                                                    onClick={handleProfileMenuClose}
                                                    sx={{ borderRadius: 1, mx: 1, color: '#ffffff', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
                                                >
                                                    <ListItemIcon><Person fontSize="small" sx={{ color: 'primary.main' }} /></ListItemIcon>
                                                    My Profile
                                                </MenuItem>
                                                <MenuItem
                                                    onClick={handleLogout}
                                                    sx={{ borderRadius: 1, mx: 1, color: 'error.main', '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.05) } }}
                                                >
                                                    <ListItemIcon><Logout fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
                                                    Logout
                                                </MenuItem>
                                            </Menu>
                                        </>
                                    ) : (
                                        <Button
                                            component={Link}
                                            to="/login"
                                            variant="outlined"
                                            size="small"
                                            sx={{
                                                fontSize: '0.85rem',
                                                borderRadius: '8px',
                                                px: 2.5,
                                                borderColor: 'rgba(255, 255, 255, 0.15)',
                                                color: '#ffffff',
                                                '&:hover': {
                                                    borderColor: 'primary.main',
                                                    color: 'primary.main',
                                                    bgcolor: 'transparent',
                                                }
                                            }}
                                        >
                                            Sign In
                                        </Button>
                                    )}
                                </Box>

                                {/* Mobile Menu Button */}
                                <IconButton
                                    color="inherit"
                                    edge="end"
                                    onClick={handleDrawerToggle}
                                    sx={{ display: { xs: 'flex', md: 'none' }, color: '#ffffff' }}
                                >
                                    <MenuIcon />
                                </IconButton>
                            </Box>
                        </Toolbar>
                    </Container>
                </AppBar>
            )}

            {/* Mobile Drawer */}
            <Drawer
                variant="temporary"
                anchor="right"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280, bgcolor: 'transparent' },
                }}
            >
                {drawer}
            </Drawer>

            {/* Main Content */}
            <Box component="main" sx={{ flexGrow: 1 }}>
                {children}
            </Box>

            {/* Footer - Hidden on chat page */}
            {!location.pathname.startsWith('/chat') && (
                <Box
                    component="footer"
                    sx={{
                        bgcolor: 'rgba(10, 11, 14, 0.95)',
                        backdropFilter: 'blur(16px)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        py: 8,
                        mt: 'auto',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    {/* Glowing Top Border Line */}
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '1px',
                        background: `linear-gradient(90deg, transparent, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, transparent)`,
                        opacity: 0.4,
                    }} />

                    {/* Subtle grid background */}
                    <Box sx={{ position: 'absolute', inset: 0, opacity: 0.02, backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />

                    <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
                        <Grid container spacing={5} sx={{ mb: 6 }}>
                            {/* Column 1: Brand & Bio */}
                            <Grid item xs={12} md={4}>
                                <Stack spacing={2.5}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 32,
                                            height: 32,
                                            borderRadius: '8px',
                                            border: '2px solid',
                                            borderColor: 'primary.main',
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            color: 'primary.main',
                                        }}>
                                            <Code sx={{ fontSize: 18 }} />
                                        </Box>
                                        <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: '-0.02em', fontSize: '1.25rem', color: '#ffffff' }}>
                                            Expect<span style={{ color: theme.palette.primary.main }}>Exception</span>
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" color="#94a3b8" sx={{ lineHeight: 1.7, fontSize: '0.9rem', maxWidth: '320px' }}>
                                        We design and build high-performance web systems, custom software automation, and autonomous AI pipelines engineered to scale.
                                    </Typography>
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', boxShadow: `0 0 10px ${theme.palette.primary.main}` }} />
                                        <Typography variant="caption" color="text.secondary" fontWeight="600">
                                            Accepting new projects
                                        </Typography>
                                    </Stack>
                                </Stack>
                            </Grid>

                            {/* Column 2: Engineering Services */}
                            <Grid item xs={6} sm={4} md={2.5}>
                                <Typography variant="subtitle2" color="#ffffff" fontWeight="800" sx={{ mb: 2.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Services
                                </Typography>
                                <Stack spacing={1.5}>
                                    <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = theme.palette.primary.main} onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}>
                                        Software Engineering
                                    </Link>
                                    <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = theme.palette.primary.main} onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}>
                                        Workflow Automation
                                    </Link>
                                    <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = theme.palette.primary.main} onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}>
                                        Autonomous AI Agents
                                    </Link>
                                </Stack>
                            </Grid>

                            {/* Column 3: Explore */}
                            <Grid item xs={6} sm={4} md={2.5}>
                                <Typography variant="subtitle2" color="#ffffff" fontWeight="800" sx={{ mb: 2.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Explore
                                </Typography>
                                <Stack spacing={1.5}>
                                    <Link to="/services" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = theme.palette.primary.main} onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}>
                                        All Developer Tools
                                    </Link>
                                    <Link to="/sandbox" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = theme.palette.primary.main} onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}>
                                        Sandbox & Mini Games
                                    </Link>
                                    <Box
                                        onClick={() => setChatbotOpen(true)}
                                        style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.2s', cursor: 'pointer' }}
                                        onMouseOver={(e) => e.currentTarget.style.color = theme.palette.primary.main}
                                        onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                                    >
                                        Daemon AI Chat
                                    </Box>
                                    <Link to="/blogs" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = theme.palette.primary.main} onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}>
                                        Technical Blog
                                    </Link>
                                </Stack>
                            </Grid>

                            {/* Column 4: Get in Touch */}
                            <Grid item xs={12} sm={4} md={3}>
                                <Typography variant="subtitle2" color="#ffffff" fontWeight="800" sx={{ mb: 2.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Connect
                                </Typography>
                                <Stack spacing={2}>
                                    <Typography variant="body2" color="#94a3b8" sx={{ fontSize: '0.85rem' }}>
                                        Have an automation or software project in mind? Let's build it.
                                    </Typography>
                                    <Button
                                        component={Link}
                                        to="/hire"
                                        variant="outlined"
                                        size="small"
                                        sx={{
                                            alignSelf: 'flex-start',
                                            borderRadius: '8px',
                                            px: 2.5,
                                            py: 0.75,
                                            borderColor: 'rgba(255, 255, 255, 0.15)',
                                            color: '#ffffff',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            '&:hover': {
                                                borderColor: 'primary.main',
                                                color: 'primary.main',
                                                bgcolor: alpha(theme.palette.primary.main, 0.03)
                                            }
                                        }}
                                    >
                                        Start a Project
                                    </Button>
                                </Stack>
                            </Grid>
                        </Grid>

                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mb: 4 }} />

                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={2}
                            justifyContent="space-between"
                            alignItems="center"
                        >
                            <Typography
                                variant="body2"
                                color="#94a3b8"
                                sx={{ fontSize: '0.8rem', textAlign: { xs: 'center', sm: 'left' } }}
                            >
                                © {new Date().getFullYear()} ExpectException. All rights reserved.
                            </Typography>
                            <Stack direction="row" spacing={3}>
                                <Link to="/privacy-policy" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.8rem', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = theme.palette.primary.main} onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}>
                                    Privacy
                                </Link>
                                <Link to="/terms-of-service" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.8rem', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = theme.palette.primary.main} onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}>
                                    Terms
                                </Link>
                                <Link to="/contact" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.8rem', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = theme.palette.primary.main} onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}>
                                    Contact
                                </Link>
                            </Stack>
                        </Stack>
                    </Container>
                </Box>
            )}

            {/* Scroll to Top Button */}
            <ScrollToTop />

            {/* Search Dialog */}
            <SearchDialog open={searchOpen} onClose={handleSearchClose} />
            {/* Command Palette */}
            <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

            {/* Global Chatbot Widget */}
            <ChatbotWidget isOpen={chatbotOpen} setIsOpen={setChatbotOpen} />
        </Box>
    );
};

export default Layout;
