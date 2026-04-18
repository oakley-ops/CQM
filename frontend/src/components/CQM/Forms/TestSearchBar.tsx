import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Chip,
  CircularProgress,
  ClickAwayListener,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { TestDefinition, TestCategory } from '../../../types/cqm';
import { searchDefinitions } from '../../../services/cqm/testEntryService';

interface TestSearchBarProps {
  onSelect: (def: TestDefinition, category: TestCategory) => void;
}

const categoryColors: Record<string, string> = {
  PHY: '#9c27b0',
  CBY: '#4caf50',
  ICC: '#ff9800',
  'ICC-REQ': '#ff9800',
  MCH: '#2196f3',
  ELE: '#f44336',
  ENV: '#00bcd4',
  MAG: '#795548',
  SMT: '#607d8b',
};

const TestSearchBar: React.FC<TestSearchBarProps> = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TestDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchDefinitions(val.trim());
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const handleSelect = (def: TestDefinition) => {
    if (!def.category) return;
    setQuery('');
    setResults([]);
    setOpen(false);
    onSelect(def, def.category as TestCategory);
  };

  const handleClickAway = () => {
    setOpen(false);
  };

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box sx={{ position: 'relative', maxWidth: 520 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search for a test by name, ID, or keyword…"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {loading ? <CircularProgress size={16} /> : <SearchIcon fontSize="small" color="action" />}
              </InputAdornment>
            ),
          }}
        />

        {open && results.length > 0 && (
          <Paper
            elevation={8}
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              mt: 0.5,
              zIndex: 1400,
              maxHeight: 360,
              overflow: 'auto',
            }}
          >
            <List dense disablePadding>
              {results.map((def) => {
                const catCode = def.category?.category_code ?? '';
                const color = categoryColors[catCode] ?? '#757575';
                return (
                  <ListItemButton
                    key={def.id}
                    onClick={() => handleSelect(def)}
                    divider
                    sx={{ gap: 1.5 }}
                  >
                    <Chip
                      label={catCode}
                      size="small"
                      sx={{
                        backgroundColor: `${color}20`,
                        color,
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        minWidth: 64,
                      }}
                    />
                    <ListItemText
                      primary={def.test_name}
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {def.test_id}
                          {def.iso_standard && ` · ${def.iso_standard}`}
                          {def.standard_section && ` §${def.standard_section}`}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Paper>
        )}

        {open && !loading && query.trim().length >= 2 && results.length === 0 && (
          <Paper elevation={8} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, mt: 0.5, zIndex: 1400, p: 2 }}>
            <Typography variant="body2" color="text.secondary" align="center">
              No tests found for "{query}"
            </Typography>
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
};

export default TestSearchBar;
