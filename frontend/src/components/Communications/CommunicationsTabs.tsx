import { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { Assessment as ReportIcon, Event as MeetingIcon, Chat as LogIcon } from '@mui/icons-material';
import StatusReportsView from './StatusReportsView';
import MeetingMinutesView from './MeetingMinutesView';
import CommunicationLogsView from './CommunicationLogsView';

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

interface CommunicationsTabsProps {
  projectId: number;
}

const CommunicationsTabs = ({ projectId }: CommunicationsTabsProps) => {
  const [value, setValue] = useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange}>
          <Tab icon={<ReportIcon />} label="Status Reports" />
          <Tab icon={<MeetingIcon />} label="Meeting Minutes" />
          <Tab icon={<LogIcon />} label="Communication Logs" />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <StatusReportsView projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <MeetingMinutesView projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <CommunicationLogsView projectId={projectId} />
      </TabPanel>
    </Box>
  );
};

export default CommunicationsTabs;
