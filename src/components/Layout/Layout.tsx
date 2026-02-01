import React, { useState } from 'react';
import {
    AppBar,
    Toolbar,
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
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
    Menu as MenuIcon,
    Home,
    Build,
    Article,
    Download,
    Notifications,
    Search,
    Person,
    Close,
    Dashboard,
    Login,
    Logout,
    AppRegistration,
    ImageSearch,
    SmartToy,
} from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import ScrollToTop from '../layout/ScrollToTop';
import SearchDialog from '../layout/SearchDialog';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, logout, user } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const theme = useTheme();
    const location = useLocation();

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
    const { notifications, unreadCount } = useNotifications();
    const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null);

    const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
        setNotificationAnchorEl(event.currentTarget);
    };

    const handleNotificationClose = () => {
        setNotificationAnchorEl(null);
    };

    const handleNotificationItemClick = (id: number) => {
        handleNotificationClose();
    };

    // Search Dialog
    const [searchOpen, setSearchOpen] = useState(false);
    const handleSearchOpen = () => setSearchOpen(true);
    const handleSearchClose = () => setSearchOpen(false);

    const navItems = [
        { label: 'Home', path: '/', icon: <Home /> },
        { label: 'Services', path: '/services', icon: <Build /> },
        { label: 'ExpExc AI', path: '/chat', icon: <SmartToy /> },
        { label: 'Hire', path: '/hire', icon: <Person /> },
        { label: 'Blogs', path: '/blogs', icon: <Article /> },
    ];

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const drawer = (
        <Box sx={{
            width: 280,
            height: '100%',
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            backgroundImage: `linear-gradient(to bottom, ${alpha(theme.palette.primary.main, 0.05)}, transparent)`,
        }}>
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Dashboard sx={{ color: 'primary.main', fontSize: 28 }} />
                    <Typography variant="h6" color="text.primary" fontWeight="800" sx={{ letterSpacing: '-0.02em' }}>
                        ExpectException
                    </Typography>
                </Stack>
                <IconButton onClick={handleDrawerToggle} sx={{ bgcolor: alpha(theme.palette.text.primary, 0.05) }}>
                    <Close fontSize="small" />
                </IconButton>
            </Box>

            <List sx={{ px: 2, flexGrow: 1 }}>
                {navItems.map((item) => (
                    <ListItem
                        key={item.label}
                        component={Link}
                        to={item.path}
                        onClick={handleDrawerToggle}
                        sx={{
                            borderRadius: 3,
                            mb: 1,
                            py: 1.5,
                            bgcolor: location.pathname === item.path ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                            color: location.pathname === item.path ? 'primary.main' : 'text.secondary',
                            border: '1px solid',
                            borderColor: location.pathname === item.path ? alpha(theme.palette.primary.main, 0.2) : 'transparent',
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                color: 'primary.main',
                            },
                            transition: 'all 0.2s',
                        }}
                    >
                        <ListItemIcon sx={{
                            color: location.pathname === item.path ? 'primary.main' : 'text.secondary',
                            minWidth: 40
                        }}>
                            {item.icon}
                        </ListItemIcon>
                        <ListItemText
                            primary={item.label}
                            primaryTypographyProps={{
                                fontWeight: location.pathname === item.path ? 700 : 500,
                                fontSize: '0.95rem'
                            }}
                        />
                    </ListItem>
                ))}
            </List>

            {/* Mobile Auth Section */}
            <Box sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
                {isAuthenticated ? (
                    <Stack spacing={2}>
                        <Box sx={{
                            p: 2,
                            borderRadius: 3,
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                            border: '1px solid',
                            borderColor: alpha(theme.palette.primary.main, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2
                        }}>
                            <Avatar sx={{
                                bgcolor: 'secondary.main',
                                boxShadow: `0 4px 12px ${alpha(theme.palette.secondary.main, 0.4)}`,
                                border: '2px solid rgba(255,255,255,0.1)'
                            }}>
                                {user?.email?.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle2" fontWeight="bold" noWrap>
                                    {user?.email?.split('@')[0]}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap display="block">
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
                            sx={{ borderRadius: 3 }}
                        >
                            My Profile
                        </Button>
                        <Button
                            onClick={handleLogout}
                            variant="text"
                            color="error"
                            startIcon={<Logout />}
                            fullWidth
                            sx={{ borderRadius: 3 }}
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
                                borderRadius: 3,
                                py: 1.5,
                                borderColor: alpha(theme.palette.primary.main, 0.3),
                                color: 'text.primary',
                                '&:hover': {
                                    borderColor: theme.palette.primary.main,
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
                                borderRadius: 3,
                                py: 1.5,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                                fontWeight: 700,
                                '&:hover': {
                                    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
                                    transform: 'translateY(-2px)',
                                    boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
                                }
                            }}
                        >
                            Register Now
                        </Button>
                    </Stack>
                )}
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* App Bar - Hidden on chat page */}
            {!location.pathname.startsWith('/chat') && (
                <AppBar
                    position="sticky"
                    elevation={scrolled ? 4 : 0}
                    sx={{
                        bgcolor: scrolled ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.8)',
                        borderBottom: '1px solid',
                        borderColor: scrolled ? 'rgba(59, 130, 246, 0.2)' : 'divider',
                        backdropFilter: 'blur(20px)',
                        boxShadow: scrolled ? '0 8px 32px 0 rgba(59, 130, 246, 0.15)' : 'none',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                >
                    <Container maxWidth="xl">
                        <Toolbar sx={{ px: { xs: 1, md: 2 }, minHeight: { xs: 56, sm: 64, md: 70 } }}>
                            {/* Logo */}
                            <Box sx={{ display: 'flex', alignItems: 'center', mr: { xs: 1, md: 4 } }}>
                                <Dashboard sx={{ color: 'primary.main', fontSize: { xs: 24, md: 32 }, mr: 1 }} />
                                <Typography
                                    variant="h6"
                                    component={Link}
                                    to="/"
                                    sx={{
                                        fontWeight: 800,
                                        background: 'linear-gradient(45deg, #2563eb, #7c3aed)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        textDecoration: 'none',
                                        fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
                                        letterSpacing: '-0.02em',
                                    }}
                                >
                                    ExpectException
                                </Typography>
                            </Box>

                            {/* Desktop Navigation */}
                            <Box sx={{ display: { xs: 'none', md: 'flex' }, flexGrow: 1, gap: 1 }}>
                                {navItems.map((item) => (
                                    <Button
                                        key={item.label}
                                        component={Link}
                                        to={item.path}
                                        startIcon={item.icon}
                                        sx={{
                                            color: location.pathname === item.path ? 'primary.main' : 'text.secondary',
                                            fontWeight: location.pathname === item.path ? 600 : 400,
                                            position: 'relative',
                                            '&::after': {
                                                content: '""',
                                                position: 'absolute',
                                                bottom: 4,
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                width: location.pathname === item.path ? '60%' : '0%',
                                                height: '2px',
                                                bgcolor: 'primary.main',
                                                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            },
                                            '&:hover': {
                                                color: 'primary.light',
                                                bgcolor: 'transparent',
                                                '&::after': {
                                                    width: '60%',
                                                },
                                            },
                                        }}
                                    >
                                        {item.label}
                                    </Button>
                                ))}
                            </Box>

                            {/* Right Side Actions */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 2 }, ml: 'auto' }}>
                                <Tooltip title="Search">
                                    <IconButton onClick={handleSearchOpen}>
                                        <Search />
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title="Notifications">
                                    <IconButton onClick={handleNotificationClick}>
                                        <Badge badgeContent={unreadCount} color="error">
                                            <Notifications />
                                        </Badge>
                                    </IconButton>
                                </Tooltip>
                                <Menu
                                    anchorEl={notificationAnchorEl}
                                    open={Boolean(notificationAnchorEl)}
                                    onClose={handleNotificationClose}
                                    PaperProps={{
                                        sx: { mt: 1, width: 320, maxHeight: 400, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }
                                    }}
                                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                                >
                                    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="subtitle1" fontWeight="bold">Notifications</Typography>
                                        {unreadCount > 0 && (
                                            <Typography variant="caption" color="primary" sx={{ cursor: 'pointer' }}>
                                                Mark all read
                                            </Typography>
                                        )}
                                    </Box>
                                    {notifications.length === 0 ? (
                                        <Box sx={{ p: 3, textAlign: 'center' }}>
                                            <Typography variant="body2" color="text.secondary">No notifications</Typography>
                                        </Box>
                                    ) : (
                                        <List sx={{ p: 0 }}>
                                            {notifications.slice(0, 5).map((notification) => (
                                                <ListItem
                                                    key={notification.id}
                                                    button
                                                    onClick={() => handleNotificationItemClick(notification.id)}
                                                    divider
                                                    sx={{ bgcolor: notification.read ? 'transparent' : 'action.hover' }}
                                                >
                                                    <ListItemText
                                                        primary={notification.verb}
                                                        secondary={notification.description}
                                                        primaryTypographyProps={{ variant: 'body2', fontWeight: notification.read ? 400 : 600 }}
                                                        secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                                                    />
                                                </ListItem>
                                            ))}
                                            <Box sx={{ p: 1, textAlign: 'center' }}>
                                                <Button size="small" component={Link} to="/notifications" onClick={handleNotificationClose}>
                                                    View All
                                                </Button>
                                            </Box>
                                        </List>
                                    )}
                                </Menu>

                                {/* Desktop Auth */}
                                <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
                                    {isAuthenticated ? (
                                        <>
                                            <IconButton onClick={handleProfileMenuOpen}>
                                                <Avatar sx={{ bgcolor: 'secondary.main', width: 40, height: 40 }}>
                                                    {user?.email?.charAt(0).toUpperCase() || <Person />}
                                                </Avatar>
                                            </IconButton>
                                            <Menu
                                                anchorEl={anchorEl}
                                                open={Boolean(anchorEl)}
                                                onClose={handleProfileMenuClose}
                                                PaperProps={{
                                                    sx: { mt: 1, minWidth: 180, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }
                                                }}
                                            >
                                                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', mb: 1 }}>
                                                    <Typography variant="subtitle2" fontWeight="bold">Account</Typography>
                                                    <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
                                                </Box>
                                                <MenuItem
                                                    component={Link}
                                                    to={`/profile/${user?.email}`}
                                                    onClick={handleProfileMenuClose}
                                                    sx={{ borderRadius: 1, mx: 1 }}
                                                >
                                                    <ListItemIcon><Person fontSize="small" /></ListItemIcon>
                                                    My Profile
                                                </MenuItem>
                                                <MenuItem
                                                    onClick={handleLogout}
                                                    sx={{ borderRadius: 1, mx: 1, color: 'error.main' }}
                                                >
                                                    <ListItemIcon><Logout fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
                                                    Logout
                                                </MenuItem>
                                            </Menu>
                                        </>
                                    ) : (
                                        <>
                                            <Button component={Link} to="/login" variant="text">
                                                Sign In
                                            </Button>
                                            <Button component={Link} to="/register" variant="contained">
                                                Register
                                            </Button>
                                        </>
                                    )}
                                </Box>

                                {/* Mobile Menu Button */}
                                <IconButton
                                    color="inherit"
                                    edge="end"
                                    onClick={handleDrawerToggle}
                                    sx={{ display: { xs: 'flex', md: 'none' } }}
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
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280 },
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
                        bgcolor: 'rgba(15, 23, 42, 0.95)',
                        borderTop: '1px solid',
                        borderColor: 'rgba(59, 130, 246, 0.1)',
                        py: 6,
                        mt: 'auto',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '1px',
                            background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.5), transparent)',
                        },
                    }}
                >
                    <Container maxWidth="xl">
                        <Stack direction="row" spacing={3} justifyContent="center" sx={{ mb: 3 }}>
                            <Link to="/privacy-policy" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>
                                Privacy Policy
                            </Link>
                            <Link to="/terms-of-service" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>
                                Terms of Service
                            </Link>
                            <Link to="/contact" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>
                                Contact Us
                            </Link>
                        </Stack>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            align="center"
                            sx={{
                                mb: 2,
                                fontSize: '0.9rem',
                            }}
                        >
                            © {new Date().getFullYear()} ExpectException. All rights reserved.
                        </Typography>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            align="center"
                            display="block"
                            sx={{ opacity: 0.7 }}
                        >
                            Made with ❤️ for developers and creators
                        </Typography>
                    </Container>
                </Box>
            )}

            {/* Scroll to Top Button */}
            <ScrollToTop />

            {/* Search Dialog */}
            <SearchDialog open={searchOpen} onClose={handleSearchClose} />
        </Box>
    );
};

export default Layout;
