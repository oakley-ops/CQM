import { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import {
  AccountBalance as BudgetIcon,
  Receipt as ExpenseIcon,
  TrendingUp as EVMIcon,
} from '@mui/icons-material';
import BudgetList from './Budget/BudgetList';
import ExpenseList from './Expenses/ExpenseList';
import EVMDashboard from './EVM/EVMDashboard';

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
      id={`cost-tabpanel-${index}`}
      aria-labelledby={`cost-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface CostTabsProps {
  projectId: number;
}

const CostTabs = ({ projectId }: CostTabsProps) => {
  const [value, setValue] = useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="cost management tabs">
          <Tab icon={<BudgetIcon />} label="Budget" />
          <Tab icon={<ExpenseIcon />} label="Expenses" />
          <Tab icon={<EVMIcon />} label="EVM Dashboard" />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <BudgetList projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <ExpenseList projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <EVMDashboard projectId={projectId} />
      </TabPanel>
    </Box>
  );
};

export default CostTabs;
