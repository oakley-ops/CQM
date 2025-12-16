/**
 * Facility Form Component
 * Create/Edit Manufacturing Facility
 */

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Button,
  TextField,
  Grid,
  MenuItem,
  Card,
  CardContent,
  Typography,
  CircularProgress,
} from '@mui/material';
import { Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import type { FacilityFormData } from '../../../types/cqm';

interface FacilityFormProps {
  initialData?: Partial<FacilityFormData>;
  onSubmit: (data: FacilityFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

const technologyTypes = [
  'Contact',
  'Contactless',
  'Dual Interface',
  'Magnetic Stripe',
  'Hybrid',
];

const certificationStatuses = [
  'Active',
  'Pending',
  'Expired',
  'Suspended',
  'Not Certified',
];

const FacilityForm = ({ initialData, onSubmit, onCancel, loading = false }: FacilityFormProps) => {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FacilityFormData>({
    defaultValues: {
      facility_name: '',
      country_code: '',
      location_code: '',
      technology_type: '',
      certification_status: 'Not Certified',
      address: '',
      contact_email: '',
      contact_phone: '',
      ...initialData,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {initialData ? 'Edit Facility' : 'Create New Facility'}
        </Typography>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Controller
                name="facility_name"
                control={control}
                rules={{ required: 'Facility name is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Facility Name"
                    error={!!errors.facility_name}
                    helperText={errors.facility_name?.message}
                    disabled={loading}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Controller
                name="country_code"
                control={control}
                rules={{ required: 'Country code is required', minLength: 2, maxLength: 2 }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Country Code"
                    placeholder="US"
                    error={!!errors.country_code}
                    helperText={errors.country_code?.message}
                    disabled={loading}
                    inputProps={{ maxLength: 2, style: { textTransform: 'uppercase' } }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Controller
                name="location_code"
                control={control}
                rules={{ required: 'Location code is required', maxLength: 2 }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Location Code"
                    placeholder="01"
                    error={!!errors.location_code}
                    helperText={errors.location_code?.message}
                    disabled={loading}
                    inputProps={{ maxLength: 2 }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="technology_type"
                control={control}
                rules={{ required: 'Technology type is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    select
                    label="Technology Type"
                    error={!!errors.technology_type}
                    helperText={errors.technology_type?.message}
                    disabled={loading}
                  >
                    {technologyTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="certification_status"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    select
                    label="Certification Status"
                    disabled={loading}
                  >
                    {certificationStatuses.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Address"
                    multiline
                    rows={2}
                    disabled={loading}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="contact_email"
                control={control}
                rules={{
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Contact Email"
                    type="email"
                    error={!!errors.contact_email}
                    helperText={errors.contact_email?.message}
                    disabled={loading}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="contact_phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Contact Phone"
                    disabled={loading}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Box display="flex" justifyContent="flex-end" gap={2}>
                <Button
                  variant="outlined"
                  onClick={onCancel}
                  startIcon={<CancelIcon />}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Facility'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

export default FacilityForm;

