/**
 * Filter Panel Component
 * Reusable filter panel for list views
 */

import { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Grid,
  Collapse,
  IconButton,
  Typography,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';

interface FilterField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'date';
  options?: Array<{ value: string; label: string }>;
}

interface FilterPanelProps {
  fields: FilterField[];
  onApplyFilters: (filters: Record<string, any>) => void;
  onClearFilters: () => void;
}

const FilterPanel = ({ fields, onApplyFilters, onClearFilters }: FilterPanelProps) => {
  const [expanded, setExpanded] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({});

  const handleFilterChange = (name: string, value: any) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApply = () => {
    onApplyFilters(filters);
  };

  const handleClear = () => {
    setFilters({});
    onClearFilters();
  };

  return (
    <Paper sx={{ mb: 2 }}>
      <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" alignItems="center" gap={1}>
          <FilterIcon />
          <Typography variant="h6">Filters</Typography>
        </Box>
        <IconButton onClick={() => setExpanded(!expanded)}>
          <ExpandMoreIcon
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: '0.3s',
            }}
          />
        </IconButton>
      </Box>
      <Collapse in={expanded}>
        <Box p={2} pt={0}>
          <Grid container spacing={2}>
            {fields.map((field) => (
              <Grid item xs={12} sm={6} md={4} key={field.name}>
                {field.type === 'select' ? (
                  <TextField
                    fullWidth
                    select
                    label={field.label}
                    value={filters[field.name] || ''}
                    onChange={(e) => handleFilterChange(field.name, e.target.value)}
                    SelectProps={{ native: true }}
                  >
                    <option value="">All</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </TextField>
                ) : (
                  <TextField
                    fullWidth
                    type={field.type}
                    label={field.label}
                    value={filters[field.name] || ''}
                    onChange={(e) => handleFilterChange(field.name, e.target.value)}
                    InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
                  />
                )}
              </Grid>
            ))}
            <Grid item xs={12}>
              <Box display="flex" justifyContent="flex-end" gap={2}>
                <Button startIcon={<ClearIcon />} onClick={handleClear}>
                  Clear
                </Button>
                <Button variant="contained" startIcon={<FilterIcon />} onClick={handleApply}>
                  Apply Filters
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default FilterPanel;

