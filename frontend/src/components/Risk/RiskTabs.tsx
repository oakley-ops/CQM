import { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import {
  List as RegisterIcon,
  GridOn as MatrixIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import RiskRegister from './RiskRegister/RiskRegister';
import RiskMatrix from './RiskMatrix/RiskMatrix';
import RiskDashboard from './RiskDashboard/RiskDashboard';

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
      id={`risk-tabpanel-${index}`}
      aria-labelledby={`risk-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface RiskTabsProps {
  projectId: number;
}

const RiskTabs = ({ projectId }: RiskTabsProps) => {
  const [value, setValue] = useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="risk management tabs">
          <Tab icon={<RegisterIcon />} label="Risk Register" iconPosition="start" />
          <Tab icon={<MatrixIcon />} label="P-I Matrix" iconPosition="start" />
          <Tab icon={<DashboardIcon />} label="Dashboard" iconPosition="start" />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <RiskRegister projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <RiskMatrix projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <RiskDashboard projectId={projectId} />
      </TabPanel>
    </Box>
  );
};

export default RiskTabs;
