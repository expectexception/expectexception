import React, { useState } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  TextField,
  InputAdornment,
  Chip,
  Stack,
  LinearProgress,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Menu,
  MenuItem,
  ListItemIcon,
} from '@mui/material';
import {
  Search,
  Download as DownloadIcon,
  Folder,
  InsertDriveFile,
  Image,
  Movie,
  AudioFile,
  Archive,
  CloudDownload,
  Info,
  Sort,
  FilterList,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/config';
import { endpoints } from '../api/endpoints';

const DownloadHubPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popularity'); // popularity, date, name, size
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Sync search state with URL query param
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('search');
    if (query) {
      setSearch(query);
    }
  }, [location.search]);

  const fileCategories = [
    { label: 'All Files', value: 'all', count: 128, icon: <Folder /> },
    { label: 'Documents', value: 'doc', count: 42, icon: <InsertDriveFile /> },
    { label: 'Images', value: 'img', count: 36, icon: <Image /> },
    { label: 'Videos', value: 'video', count: 24, icon: <Movie /> },
    { label: 'Audio', value: 'audio', count: 18, icon: <AudioFile /> },
    { label: 'Archives', value: 'archive', count: 8, icon: <Archive /> },
  ];

  const [stats, setStats] = useState({
    total_files: 0,
    total_downloads: 0,
    active_users: 0,
    latest_update: null
  });

  const [files, setFiles] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchDownloads = async () => {
      try {
        const [filesRes, statsRes] = await Promise.all([
          apiClient.get(endpoints.services.downloads),
          apiClient.get(endpoints.services.downloadStats)
        ]);
        setFiles(filesRes.data.results || filesRes.data);
        setStats(statsRes.data);
      } catch (error) {
        console.error('Failed to fetch downloads:', error);

      }
    };
    fetchDownloads();
  }, []);


  // Filter files based on search and category
  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(search.toLowerCase()) ||
      file.category.toLowerCase().includes(search.toLowerCase()) ||
      (file.version && file.version.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Sort files
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'popularity':
        comparison = (b.downloads || 0) - (a.downloads || 0);
        break;
      case 'date':
        comparison = new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime();
        break;
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'size':
        // Rough size comparison (assuming consistent units or bytes would be better)
        comparison = (parseInt(a.size || '0') - parseInt(b.size || '0'));
        break;
      default:
        comparison = 0;
    }
    return sortOrder === 'asc' ? comparison * -1 : comparison;
  });

  const popularFiles = [...files].sort((a, b) => (b.downloads || 0) - (a.downloads || 0)).slice(0, 5);

  const handleSortClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleSortClose = (option?: string) => {
    if (option) {
      if (sortBy === option) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setSortBy(option);
        setSortOrder('desc');
      }
    }
    setAnchorEl(null);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
  };

  const handleDownload = async (id: number, name: string) => {
    try {
      const response = await apiClient.get(endpoints.services.downloadFile(id), {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'doc': return <InsertDriveFile />;
      case 'img': return <Image />;
      case 'video': return <Movie />;
      case 'audio': return <AudioFile />;
      case 'archive': return <Archive />;
      default: return <InsertDriveFile />;
    }
  };

  const formatDownloadCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 800 }}>
          Download Hub
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Access premium resources, templates, and tools for your projects
        </Typography>
        {user?.is_staff && (
          <Button
            component={Link}
            to="/admin/upload-resource"
            variant="contained"
            startIcon={<CloudDownload />}
            sx={{ mt: 2 }}
          >
            Upload Resource
          </Button>
        )}
      </Box>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 6 }}>
        {[
          { label: 'Total Files', value: stats.total_files, color: 'primary' },
          { label: 'Total Downloads', value: stats.total_downloads.toLocaleString(), color: 'secondary' },
          { label: 'Active Users', value: stats.active_users.toLocaleString(), color: 'success' },
          {
            label: 'Latest Update',
            value: stats.latest_update ? new Date(stats.latest_update).toLocaleDateString() : 'N/A',
            color: 'warning'
          },
        ].map((stat, index) => (
          <Grid item xs={6} md={3} key={index}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h4" fontWeight={800} gutterBottom>
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stat.label}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={75}
                    sx={{
                      mt: 2,
                      height: 4,
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: `${stat.color}.main`,
                      },
                    }}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Search and Categories */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 2 }}>
            <TextField
              fullWidth
              placeholder="Search files by name, category, or version..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Advanced Filters">
                      <IconButton>
                        <FilterList />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2, height: '100%' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle2" fontWeight={600}>
                Sort by: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)} ({sortOrder})
              </Typography>
              <Button endIcon={<Sort />} size="small" onClick={handleSortClick}>
                Sort
              </Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => handleSortClose()}
              >
                <MenuItem onClick={() => handleSortClose('popularity')}>Popularity</MenuItem>
                <MenuItem onClick={() => handleSortClose('date')}>Date</MenuItem>
                <MenuItem onClick={() => handleSortClose('name')}>Name</MenuItem>
                <MenuItem onClick={() => handleSortClose('size')}>Size</MenuItem>
              </Menu>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* Categories */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {fileCategories.map((category) => (
          <Grid item key={category.value}>
            <motion.div whileHover={{ scale: 1.05 }}>
              <Chip
                icon={category.icon}
                label={`${category.label} (${category.count})`}
                variant={selectedCategory === category.value ? 'filled' : 'outlined'}
                color={selectedCategory === category.value ? 'primary' : 'default'}
                onClick={() => setSelectedCategory(category.value)}
                sx={{
                  px: 2,
                  py: 2,
                  '& .MuiChip-label': {
                    px: 1,
                  },
                }}
              />
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Files Table */}
      <Card sx={{ mb: 6 }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={600}>
                      File Name
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Category
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Size
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Downloads
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Version
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" fontWeight={600}>
                      Actions
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedFiles
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((file) => (
                    <motion.tr
                      key={file.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 1,
                              bgcolor: 'action.hover',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {getCategoryIcon(file.category)}
                          </Box>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {file.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Updated {file.date}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={fileCategories.find(c => c.value === file.category)?.label || 'Unknown'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{file.size}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <CloudDownload fontSize="small" />
                          <Typography variant="body2">
                            {formatDownloadCount(file.downloads)}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={file.version}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Download">
                            <IconButton size="small" color="primary" onClick={() => handleDownload(file.id, file.name)}>
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Info">
                            <IconButton size="small">
                              <Info />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </motion.tr>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={sortedFiles.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </CardContent>
      </Card>

      {/* Popular Files */}
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
        Most Popular Downloads
      </Typography>
      <Grid container spacing={3}>
        {popularFiles.map((file, index) => (
          <Grid item xs={12} md={6} key={file.id}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={3}>
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: 2,
                        bgcolor: 'primary.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                      }}
                    >
                      {getCategoryIcon(file.category)}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        {file.name}
                      </Typography>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          {file.size}
                        </Typography>
                        <Chip
                          label={`${formatDownloadCount(file.downloads)} downloads`}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      </Stack>
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      sx={{ whiteSpace: 'nowrap' }}
                      onClick={() => handleDownload(file.id, file.name)}
                    >
                      Download
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Download Guidelines */}
      <Card sx={{ mt: 6, bgcolor: 'info.light' }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Info sx={{ fontSize: 40, color: 'info.main' }} />
            <Box>
              <Typography variant="h6" gutterBottom>
                Download Guidelines
              </Typography>
              <Typography variant="body2">
                • All files are virus-scanned before upload
                • Respect copyright and licensing terms
                • Report any issues with downloads
                • Files are for personal/educational use unless specified
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Container >
  );
};

export default DownloadHubPage;