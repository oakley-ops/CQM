import { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import {
  Speed as MetricsIcon,
  FindInPage as InspectionIcon,
  BugReport as DefectIcon,
} from '@mui/icons-material';
import MetricsList from './Metrics/MetricsList';
import InspectionList from './Inspections/InspectionList';
import DefectList from './Defects/DefectList';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`quality-tabpanel-${index}`}
      aria-labelledby={`quality-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface QualityTabsProps {
  projectId: number;
}

const QualityTabs = ({ projectId }: QualityTabsProps) => {
  const [value, setValue] = useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="quality management tabs">
          <Tab icon={<MetricsIcon />} label="Metrics" iconPosition="start" />
          <Tab icon={<InspectionIcon />} label="Inspections" iconPosition="start" />
          <Tab icon={<DefectIcon />} label="Defects" iconPosition="start" />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <MetricsList projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <InspectionList projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <DefectList projectId={projectId} />
      </TabPanel>
    </Box>
  );
};

export default QualityTabs;
