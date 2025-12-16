import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import {
  Description as CharterIcon,
  People as StakeholdersIcon,
  ChangeCircle as ChangeRequestIcon,
  School as LessonsIcon,
  Schedule as ScheduleIcon,
  AttachMoney as CostIcon,
  VerifiedUser as QualityIcon,
  Warning as RiskIcon,
  Groups as ResourceIcon,
  Forum as CommunicationIcon,
  AccountTree as ScopeIcon,
  Assessment as ReportsIcon,
  Folder as DocumentsIcon,
} from '@mui/icons-material';
import CharterView from './Charter/CharterView';
import StakeholderList from './Stakeholders/StakeholderList';
import ChangeRequestList from './ChangeRequests/ChangeRequestList';
import LessonsLearnedList from './LessonsLearned/LessonsLearnedList';
import ScheduleTabs from '../Schedule/ScheduleTabs';
import CostTabs from '../Cost/CostTabs';
import QualityTabs from '../Quality/QualityTabs';
import RiskTabs from '../Risk/RiskTabs';
import ResourceTabs from '../Resource/ResourceTabs';
import CommunicationsTabs from '../Communications/CommunicationsTabs';
import ScopeTabs from '../Scope/ScopeTabs';
import ReportsTabs from '../Reports/ReportsTabs';
import { DocumentList } from '../Documents';

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
      id={`integration-tabpanel-${index}`}
      aria-labelledby={`integration-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface IntegrationTabsProps {
  projectId: number;
}

const IntegrationTabs = ({ projectId }: IntegrationTabsProps) => {
  const location = useLocation();
  const [value, setValue] = useState(0);

  // Map hash values to tab indices
  const hashToTab: { [key: string]: number } = {
    '#charter': 0,
    '#stakeholders': 1,
    '#scope': 2,
    '#schedule': 3,
    '#cost': 4,
    '#quality': 5,
    '#resources': 6,
    '#risk': 7,
    '#communications': 8,
    '#documents': 9,
    '#change-requests': 10,
    '#lessons': 11,
    '#reports': 12,
  };

  // Handle hash-based navigation
  useEffect(() => {
    const hash = location.hash;
    if (hash && hashToTab[hash] !== undefined) {
      setValue(hashToTab[hash]);
    }
  }, [location.hash]);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Paper sx={{ mt: 3 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="integration management tabs" variant="scrollable" scrollButtons="auto">
          {/* Initiation Phase */}
          <Tab icon={<CharterIcon />} label="Charter" />
          <Tab icon={<StakeholdersIcon />} label="Stakeholders" />
          
          {/* Planning Phase */}
          <Tab icon={<ScopeIcon />} label="Scope" />
          <Tab icon={<ScheduleIcon />} label="Schedule" />
          <Tab icon={<CostIcon />} label="Cost" />
          <Tab icon={<QualityIcon />} label="Quality" />
          <Tab icon={<ResourceIcon />} label="Resources" />
          <Tab icon={<RiskIcon />} label="Risk" />
          <Tab icon={<CommunicationIcon />} label="Communications" />
          
          {/* Execution & Monitoring Phase */}
          <Tab icon={<DocumentsIcon />} label="Documents" />
          <Tab icon={<ChangeRequestIcon />} label="Change Requests" />
          
          {/* Closing Phase */}
          <Tab icon={<LessonsIcon />} label="Lessons Learned" />
          <Tab icon={<ReportsIcon />} label="Reports" />
        </Tabs>
      </Box>
      
      {/* Initiation Phase */}
      <TabPanel value={value} index={0}>
        <CharterView projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <StakeholderList projectId={projectId} />
      </TabPanel>
      
      {/* Planning Phase */}
      <TabPanel value={value} index={2}>
        <ScopeTabs projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={3}>
        <ScheduleTabs projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={4}>
        <CostTabs projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={5}>
        <QualityTabs projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={6}>
        <ResourceTabs projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={7}>
        <RiskTabs projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={8}>
        <CommunicationsTabs projectId={projectId} />
      </TabPanel>
      
      {/* Execution & Monitoring Phase */}
      <TabPanel value={value} index={9}>
        <DocumentList projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={10}>
        <ChangeRequestList projectId={projectId} />
      </TabPanel>
      
      {/* Closing Phase */}
      <TabPanel value={value} index={11}>
        <LessonsLearnedList projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={12}>
        <ReportsTabs projectId={projectId} />
      </TabPanel>
    </Paper>
  );
};

export default IntegrationTabs;
