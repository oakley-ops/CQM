import React from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Typography,
  Chip,
  Skeleton,
  useTheme,
} from '@mui/material';
import {
  Memory as ICMIcon,
  CreditCard as CBIcon,
  Contactless as ICCIcon,
  Straighten as PHYSIcon,
  Settings as MAGIcon,
  Person as PERSIcon,
  Nfc as PICCIcon,
  Category as DefaultIcon,
} from '@mui/icons-material';
import { TestCategory } from '../../../types/cqm';

interface CategorySelectorProps {
  categories: TestCategory[];
  selectedCategory?: TestCategory | null;
  onSelectCategory: (category: TestCategory) => void;
  loading?: boolean;
  completedCategories?: number[];
}

const getCategoryIcon = (code: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    ICM: <ICMIcon fontSize="large" />,
    CB: <CBIcon fontSize="large" />,
    ICC: <ICCIcon fontSize="large" />,
    PHYS: <PHYSIcon fontSize="large" />,
    MAG: <MAGIcon fontSize="large" />,
    PERS: <PERSIcon fontSize="large" />,
    PICC: <PICCIcon fontSize="large" />,
  };
  return iconMap[code] || <DefaultIcon fontSize="large" />;
};

const getCategoryColor = (code: string) => {
  const colorMap: Record<string, string> = {
    ICM: '#2196f3',
    CB: '#4caf50',
    ICC: '#ff9800',
    PHYS: '#9c27b0',
    MAG: '#f44336',
    PERS: '#00bcd4',
    PICC: '#673ab7',
  };
  return colorMap[code] || '#757575';
};

const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  loading = false,
  completedCategories = [],
}) => {
  const theme = useTheme();

  if (loading) {
    return (
      <Grid container spacing={2}>
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
            <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={2}>
      {categories.map((category) => {
        const isSelected = selectedCategory?.id === category.id;
        const isCompleted = completedCategories.includes(category.id);
        const categoryColor = getCategoryColor(category.category_code);

        return (
          <Grid item xs={12} sm={6} md={4} lg={3} key={category.id}>
            <Card
              sx={{
                height: '100%',
                border: isSelected ? `2px solid ${categoryColor}` : '1px solid',
                borderColor: isSelected ? categoryColor : 'divider',
                backgroundColor: isSelected
                  ? theme.palette.mode === 'dark'
                    ? `${categoryColor}20`
                    : `${categoryColor}10`
                  : 'background.paper',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: categoryColor,
                  transform: 'translateY(-2px)',
                  boxShadow: 3,
                },
              }}
            >
              <CardActionArea
                onClick={() => onSelectCategory(category)}
                sx={{ height: '100%' }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Box
                      sx={{
                        color: categoryColor,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {getCategoryIcon(category.category_code)}
                    </Box>
                    {isCompleted && (
                      <Chip
                        label="Complete"
                        size="small"
                        color="success"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                  <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    gutterBottom
                    noWrap
                  >
                    {category.category_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Section {category.section_number}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label={category.category_code}
                      size="small"
                      sx={{
                        backgroundColor: `${categoryColor}20`,
                        color: categoryColor,
                        fontWeight: 'bold',
                      }}
                    />
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default CategorySelector;
