import { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { 
  CheckCircle as RequirementIcon, 
  AccountTree as WBSIcon, 
  Business as VendorIcon,
  Description as ContractIcon 
} from '@mui/icons-material';
import RequirementsView from './RequirementsView';
import WBSView from './WBSView';
import VendorsView from './VendorsView';
import ContractsView from './ContractsView';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface ScopeTabsProps {
  projectId: number;
}

const ScopeTabs = ({ projectId }: ScopeTabsProps) => {
  const [value, setValue] = useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange}>
          <Tab icon={<RequirementIcon />} label="Requirements" />
          <Tab icon={<WBSIcon />} label="WBS" />
          <Tab icon={<VendorIcon />} label="Vendors" />
          <Tab icon={<ContractIcon />} label="Contracts" />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <RequirementsView projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <WBSView projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <VendorsView projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={3}>
        <ContractsView projectId={projectId} />
      </TabPanel>
    </Box>
  );
};

export default ScopeTabs;
