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
  useMediaQuery,
  useTheme,
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
import ResourceDetailsDialog from '../components/services/ResourceDetailsDialog';

const DownloadHubPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popularity'); // popularity, date, name, size
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedResource, setSelectedResource] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

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

  const handleResourceClick = (e: React.MouseEvent, resource: any) => {
    e.preventDefault();
    setSelectedResource(resource);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setTimeout(() => setSelectedResource(null), 300);
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
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: { xs: 3, sm: 4, md: 6 } }}>
        <Typography
          variant="h3"
          gutterBottom
          sx={{
            fontWeight: 800,
            fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' }
          }}
        >
          Download Hub
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{
            mb: 4,
            fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' },
            px: { xs: 0, sm: 0 }
          }}
        >
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
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 3, sm: 4, md: 6 } }}>
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
          <Grid item xs={6} sm={6} md={3} key={index}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card>
                <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    gutterBottom
                    sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' } }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                  >
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

      {/* Search and Sort */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 3, md: 4 } }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
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
              size="small"
            />
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: { xs: 1.5, sm: 2 }, height: '100%' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography
                variant="subtitle2"
                fontWeight={600}
                sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
              >
                Sort: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
              </Typography>
              <Button
                endIcon={<Sort />}
                size="small"
                onClick={handleSortClick}
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
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
      <Box sx={{ mb: { xs: 3, md: 4 } }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            overflowX: 'auto',
            pb: 1,
            '&::-webkit-scrollbar': {
              height: '6px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '3px',
            },
          }}
        >
          {fileCategories.map((category) => (
            <motion.div key={category.value} whileHover={{ scale: 1.05 }} style={{ flexShrink: 0 }}>
              <Chip
                icon={category.icon}
                label={`${category.label} (${category.count})`}
                variant={selectedCategory === category.value ? 'filled' : 'outlined'}
                color={selectedCategory === category.value ? 'primary' : 'default'}
                onClick={() => setSelectedCategory(category.value)}
                sx={{
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 1.5, sm: 2 },
                  '& .MuiChip-label': {
                    px: 1,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  },
                }}
              />
            </motion.div>
          ))}
        </Stack>
      </Box>

      {/* Files - Card View on Mobile, Table on Desktop */}
      <Card sx={{ mb: { xs: 3, md: 6 } }}>
        <CardContent sx={{ p: 0 }}>
          {isMobile ? (
            // Mobile Card View
            <Box sx={{ p: 2 }}>
              {sortedFiles
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((file) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card sx={{ mb: 2, bgcolor: 'action.hover' }} onClick={(e) => handleResourceClick(e, file)}>
                      <CardContent sx={{ p: 2, cursor: 'pointer' }}>
                        <Stack direction="row" alignItems="flex-start" spacing={2} sx={{ mb: 2 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 1,
                              bgcolor: 'background.paper',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              cursor: 'pointer'
                            }}
                            onClick={(e) => { e.stopPropagation(); handleResourceClick(e, file); }}
                          >
                            {getCategoryIcon(file.category)}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              sx={{ mb: 0.5, textDecoration: 'none', color: 'text.primary', '&:hover': { color: 'primary.main' } }}
                              onClick={(e) => { e.stopPropagation(); handleResourceClick(e, file); }}
                            >
                              {file.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Updated {file.date}
                            </Typography>
                          </Box>
                        </Stack>

                        <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
                          <Chip
                            label={fileCategories.find(c => c.value === file.category)?.label || 'Unknown'}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={file.version}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Stack>

                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Size: {file.size}
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <CloudDownload fontSize="small" sx={{ fontSize: '0.875rem' }} />
                              <Typography variant="caption">
                                {formatDownloadCount(file.downloads)}
                              </Typography>
                            </Stack>
                          </Box>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<Info />}
                            onClick={(e) => { e.stopPropagation(); handleResourceClick(e, file); }}
                            sx={{ fontSize: '0.75rem' }}
                          >
                            Details
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
            </Box>
          ) : (
            // Desktop Table View
            <TableContainer sx={{ overflowX: 'auto' }}>
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
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={(e) => handleResourceClick(e, file)}
                        style={{ cursor: 'pointer' }}
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
                                cursor: 'pointer'
                              }}
                              onClick={(e) => { e.stopPropagation(); handleResourceClick(e, file); }}
                            >
                              {getCategoryIcon(file.category)}
                            </Box>
                            <Box>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                sx={{ textDecoration: 'none', color: 'text.primary', '&:hover': { color: 'primary.main' }, cursor: 'pointer' }}
                                onClick={(e) => { e.stopPropagation(); handleResourceClick(e, file); }}
                              >
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
                            <Tooltip title="View Details">
                              <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleResourceClick(e, file); }}>
                                <Info />
                              </IconButton>
                            </Tooltip>
                            {/* Keep direct download or move to details? Let's hide it to encourage visiting page for SEO */}
                          </Stack>
                        </TableCell>
                      </motion.tr>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={sortedFiles.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Popular Files */}
      <Typography
        variant="h5"
        gutterBottom
        sx={{
          fontWeight: 700,
          mb: { xs: 2, md: 3 },
          fontSize: { xs: '1.25rem', sm: '1.5rem' }
        }}
      >
        Most Popular Downloads
      </Typography>
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {popularFiles.map((file, index) => (
          <Grid item xs={12} sm={6} md={6} key={file.id}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer' }} onClick={(e) => handleResourceClick(e, file)}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 }, flexGrow: 1 }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={{ xs: 2, sm: 3 }}
                  >
                    <Box
                      sx={{
                        width: { xs: 50, sm: 60 },
                        height: { xs: 50, sm: 60 },
                        borderRadius: 2,
                        bgcolor: 'primary.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        flexShrink: 0,
                        cursor: 'pointer'
                      }}
                      component={Link}
                      to={`/downloads/${file.slug}`}
                    >
                      {getCategoryIcon(file.category)}
                    </Box>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography
                        variant="h6"
                        fontWeight={600}
                        gutterBottom
                        component={Link}
                        to={`/downloads/${file.slug}`}
                        sx={{
                          fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' },
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'text.primary',
                          textDecoration: 'none',
                          '&:hover': { color: 'primary.main' }
                        }}
                      >
                        {file.name}
                      </Typography>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={{ xs: 0.5, sm: 2 }}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                      >
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                        >
                          {file.size}
                        </Typography>
                        <Chip
                          label={`${formatDownloadCount(file.downloads)} downloads`}
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                        />
                      </Stack>
                    </Box>
                    <Button
                      variant="outlined"
                      size={isMobile ? 'medium' : 'large'}
                      onClick={(e) => { e.stopPropagation(); handleResourceClick(e, file); }}
                      sx={{
                        whiteSpace: 'nowrap',
                        width: { xs: '100%', sm: 'auto' },
                        mt: { xs: 1, sm: 0 }
                      }}
                    >
                      View Details
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Download Guidelines */}
      <Card sx={{ mt: { xs: 3, md: 6 }, bgcolor: 'info.light' }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={2}
          >
            <Info
              sx={{
                fontSize: { xs: 32, sm: 40 },
                color: 'info.main',
                flexShrink: 0
              }}
            />
            <Box>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
              >
                Download Guidelines
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
              >
                • All files are virus-scanned before upload
                • Respect copyright and licensing terms
                • Report any issues with downloads
                • Files are for personal/educational use unless specified
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <ResourceDetailsDialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        resource={selectedResource}
        onDownload={(slug, name) => handleDownload(selectedResource?.id, name)}
      />
    </Container>
  );
};

export default DownloadHubPage;