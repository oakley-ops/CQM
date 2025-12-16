const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const {
  getStatusReports,
  createStatusReport,
  updateStatusReport,
  deleteStatusReport,
  getMeetingMinutes,
  createMeetingMinute,
  updateMeetingMinute,
  deleteMeetingMinute,
  getCommunicationLogs,
  createCommunicationLog,
  updateCommunicationLog,
  deleteCommunicationLog
} = require('../controllers/communicationController');

// Status Reports
router.route('/status-reports')
  .get(protect, getStatusReports)
  .post(protect, createStatusReport);

router.route('/status-reports/:reportId')
  .put(protect, updateStatusReport)
  .delete(protect, deleteStatusReport);

// Meeting Minutes
router.route('/meeting-minutes')
  .get(protect, getMeetingMinutes)
  .post(protect, createMeetingMinute);

router.route('/meeting-minutes/:minuteId')
  .put(protect, updateMeetingMinute)
  .delete(protect, deleteMeetingMinute);

// Communication Logs
router.route('/logs')
  .get(protect, getCommunicationLogs)
  .post(protect, createCommunicationLog);

router.route('/logs/:logId')
  .put(protect, updateCommunicationLog)
  .delete(protect, deleteCommunicationLog);

module.exports = router;
