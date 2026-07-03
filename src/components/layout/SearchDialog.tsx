import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    InputAdornment,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Typography,
    Box
} from '@mui/material';
import { Search, History, ArrowForward } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface SearchDialogProps {
    open: boolean;
    onClose: () => void;
}

const SearchDialog: React.FC<SearchDialogProps> = ({ open, onClose }) => {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    const handleSearch = () => {
        if (query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query)}`);
            onClose();
            setQuery('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Mock recent searches for better UX
    const recentSearches = ['Python Course', 'React Template', 'Django Starter'];

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                sx: { borderRadius: 2, position: 'absolute', top: 50 },
            }}
        >
            <DialogTitle>
                <TextField
                    autoFocus
                    fullWidth
                    placeholder="Search resources, tools, and blogs..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search color="action" />
                            </InputAdornment>
                        ),
                        sx: { fontSize: '1.2rem' }
                    }}
                    variant="standard"
                />
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Recent Searches
                    </Typography>
                    <List>
                        {recentSearches.map((text, index) => (
                            <ListItem
                                key={index}
                                button
                                onClick={() => {
                                    setQuery(text);
                                    // Optional: auto search on click
                                    // navigate(`/downloads?search=${encodeURIComponent(text)}`);
                                    // onClose();
                                }}
                            >
                                <ListItemIcon>
                                    <History fontSize="small" />
                                </ListItemIcon>
                                <ListItemText primary={text} />
                                <ListItemIcon sx={{ minWidth: 30 }}>
                                    <ArrowForward fontSize="small" sx={{ opacity: 0.5 }} />
                                </ListItemIcon>
                            </ListItem>
                        ))}
                    </List>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: 'action.hover' }}>
                <Button onClick={onClose} color="inherit">
                    Cancel
                </Button>
                <Button
                    onClick={handleSearch}
                    variant="contained"
                    disabled={!query.trim()}
                >
                    Search
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SearchDialog;
