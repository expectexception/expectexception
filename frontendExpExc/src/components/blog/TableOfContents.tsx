import React, { useState, useEffect } from 'react';
import { Box, Typography, List, ListItem, ListItemButton, Drawer, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { Menu as MenuIcon, Close } from '@mui/icons-material';
import { motion } from 'framer-motion';

interface TOCItem {
    id: string;
    text: string;
    level: number;
}

interface TableOfContentsProps {
    content: string;
}

const TableOfContents: React.FC<TableOfContentsProps> = ({ content }) => {
    const [tocItems, setTocItems] = useState<TOCItem[]>([]);
    const [activeId, setActiveId] = useState<string>('');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Extract headings from HTML content
    useEffect(() => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const headings = doc.querySelectorAll('h2, h3');

        const items: TOCItem[] = [];
        headings.forEach((heading, index) => {
            const level = parseInt(heading.tagName.substring(1));
            const text = heading.textContent || '';
            let id = heading.id;

            // Generate ID if not present
            if (!id) {
                id = `heading-${index}-${text.toLowerCase().replace(/[^\w]+/g, '-')}`;
                heading.id = id;
            }

            items.push({ id, text, level });
        });

        setTocItems(items);
    }, [content]);

    // Track active section on scroll
    useEffect(() => {
        const handleScroll = () => {
            const headings = tocItems.map(item => document.getElementById(item.id)).filter(Boolean);

            // Find the heading currently in view
            for (let i = headings.length - 1; i >= 0; i--) {
                const heading = headings[i];
                if (heading) {
                    const rect = heading.getBoundingClientRect();
                    if (rect.top <= 100) {
                        setActiveId(heading.id);
                        break;
                    }
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial check

        return () => window.removeEventListener('scroll', handleScroll);
    }, [tocItems]);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            const yOffset = -80; // Offset for fixed header
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });

            if (isMobile) {
                setDrawerOpen(false);
            }
        }
    };

    if (tocItems.length === 0) {
        return null;
    }

    const TOCContent = (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2, fontSize: { xs: '1rem', md: '1.25rem' } }}>
                Table of Contents
            </Typography>
            <List sx={{ p: 0 }}>
                {tocItems.map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <ListItem disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                onClick={() => scrollToSection(item.id)}
                                selected={activeId === item.id}
                                sx={{
                                    py: 1,
                                    px: item.level === 3 ? 3 : 2,
                                    borderRadius: 1,
                                    fontSize: item.level === 3 ? '0.875rem' : '0.95rem',
                                    color: activeId === item.id ? 'primary.main' : 'text.secondary',
                                    fontWeight: activeId === item.id ? 600 : 400,
                                    '&.Mui-selected': {
                                        bgcolor: 'primary.light',
                                        color: 'primary.main',
                                        '&:hover': {
                                            bgcolor: 'primary.light',
                                        },
                                    },
                                    '&:hover': {
                                        bgcolor: 'action.hover',
                                    },
                                    transition: 'all 0.2s',
                                }}
                            >
                                {item.text}
                            </ListItemButton>
                        </ListItem>
                    </motion.div>
                ))}
            </List>
        </Box>
    );

    if (isMobile) {
        return (
            <>
                <IconButton
                    onClick={() => setDrawerOpen(true)}
                    sx={{
                        position: 'fixed',
                        bottom: 16,
                        right: 16,
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': {
                            bgcolor: 'primary.dark',
                        },
                        zIndex: 1000,
                        boxShadow: 3,
                    }}
                >
                    <MenuIcon />
                </IconButton>
                <Drawer
                    anchor="right"
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    PaperProps={{
                        sx: {
                            width: 280,
                            bgcolor: 'background.paper',
                        },
                    }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider' }}>
                        <Typography variant="h6" fontWeight={700}>
                            Contents
                        </Typography>
                        <IconButton onClick={() => setDrawerOpen(false)}>
                            <Close />
                        </IconButton>
                    </Box>
                    {TOCContent}
                </Drawer>
            </>
        );
    }

    // Desktop sidebar
    return (
        <Box
            sx={{
                position: 'sticky',
                top: 100,
                height: 'fit-content',
                maxHeight: 'calc(100vh - 120px)',
                overflow: 'auto',
                bgcolor: 'background.paper',
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                boxShadow: 1,
            }}
        >
            {TOCContent}
        </Box>
    );
};

export default TableOfContents;
