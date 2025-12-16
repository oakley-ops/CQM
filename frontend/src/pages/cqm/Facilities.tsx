/**
 * Facilities Page
 * List and manage manufacturing facilities
 */

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { fetchFacilities } from '../../store/slices/cqm/facilitySlice';
import { FilterPanel } from '../../components/CQM';
import type { RootState, AppDispatch } from '../../store/store';

const Facilities = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { facilities, loading, error } = useSelector((state: RootState) => state.facility);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    dispatch(fetchFacilities({ page: 1, limit: 50 }));
  }, [dispatch]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'suspended':
      case 'expired':
        return 'error';
      default:
        return 'default';
    }
  };

  const filteredFacilities = facilities.filter((facility) =>
    facility.facility_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facility.country_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filterFields = [
    {
      name: 'country',
      label: 'Country',
      type: 'text' as const,
    },
    {
      name: 'technology',
      label: 'Technology Type',
      type: 'select' as const,
      options: [
        { value: 'Contact', label: 'Contact' },
        { value: 'Contactless', label: 'Contactless' },
        { value: 'Dual Interface', label: 'Dual Interface' },
      ],
    },
    {
      name: 'status',
      label: 'Certification Status',
      type: 'select' as const,
      options: [
        { value: 'Active', label: 'Active' },
        { value: 'Pending', label: 'Pending' },
        { value: 'Expired', label: 'Expired' },
      ],
    },
  ];

  const handleApplyFilters = (filters: Record<string, any>) => {
    console.log('Applying filters:', filters);
    // TODO: Apply filters to API call
  };

  const handleClearFilters = () => {
    console.log('Clearing filters');
    // TODO: Clear filters
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="600">
          Manufacturing Facilities
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => console.log('Export facilities')}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/facilities/new')}
          >
            Add Facility
          </Button>
        </Box>
      </Box>

      <FilterPanel
        fields={filterFields}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search facilities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Card>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Facility Name</TableCell>
                  <TableCell>Country</TableCell>
                  <TableCell>Technology Type</TableCell>
                  <TableCell>Certification Status</TableCell>
                  <TableCell>CQM Label</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredFacilities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary" py={4}>
                        No facilities found. Click "Add Facility" to create one.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFacilities.map((facility) => (
                    <TableRow key={facility.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {facility.facility_name}
                        </Typography>
                      </TableCell>
                      <TableCell>{facility.country_code}</TableCell>
                      <TableCell>{facility.technology_type || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip
                          label={facility.certification_status || 'Unknown'}
                          color={getStatusColor(facility.certification_status || '')}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {facility.cqm_label || 'Not Generated'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/facilities/${facility.id}`)}
                          title="View Details"
                        >
                          <ViewIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/facilities/${facility.id}/edit`)}
                          title="Edit"
                        >
                          <EditIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Box>
  );
};

export default Facilities;

