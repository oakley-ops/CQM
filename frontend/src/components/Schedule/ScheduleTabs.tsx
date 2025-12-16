import { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import {
  Assignment as TasksIcon,
  Timeline as GanttIcon,
  Flag as MilestonesIcon,
} from '@mui/icons-material';
import TaskList from './Tasks/TaskList';
import MilestoneList from './Milestones/MilestoneList';
import GanttChart from './GanttChart/GanttChart';

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
      id={`schedule-tabpanel-${index}`}
      aria-labelledby={`schedule-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface ScheduleTabsProps {
  projectId: number;
}

const ScheduleTabs = ({ projectId }: ScheduleTabsProps) => {
  const [value, setValue] = useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="schedule management tabs">
          <Tab icon={<TasksIcon />} label="Tasks" />
          <Tab icon={<GanttIcon />} label="Gantt Chart" />
          <Tab icon={<MilestonesIcon />} label="Milestones" />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <TaskList projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <GanttChart projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <MilestoneList projectId={projectId} />
      </TabPanel>
    </Box>
  );
};

export default ScheduleTabs;
