import { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { People as TeamIcon, Assignment as AllocationIcon } from '@mui/icons-material';
import TeamMembersView from './TeamMembersView';
import ResourceAllocationView from './ResourceAllocationView';

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

interface ResourceTabsProps {
  projectId: number;
}

const ResourceTabs = ({ projectId }: ResourceTabsProps) => {
  const [value, setValue] = useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange}>
          <Tab icon={<TeamIcon />} label="Team Members" />
          <Tab icon={<AllocationIcon />} label="Resource Allocation" />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <TeamMembersView projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <ResourceAllocationView projectId={projectId} />
      </TabPanel>
    </Box>
  );
};

export default ResourceTabs;
