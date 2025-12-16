const { StatusReport, MeetingMinute, CommunicationLog, User, Project } = require('../models');
const { AppError } = require('../middleware/errorHandler');

// Status Reports
const getStatusReports = async (req, res, next) => {
  try {
    const reports = await StatusReport.findAll({
      where: { project_id: req.params.id },
      include: [{ model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] }],
      order: [['report_date', 'DESC']]
    });
    
    const formattedReports = reports.map(report => ({
      ...report.toJSON(),
      creator: report.creator ? {
        id: report.creator.id,
        name: `${report.creator.first_name || ''} ${report.creator.last_name || ''}`.trim() || report.creator.email,
        email: report.creator.email
      } : null
    }));
    
    res.status(200).json({ success: true, data: formattedReports });
  } catch (error) {
    next(error);
  }
};

const createStatusReport = async (req, res, next) => {
  try {
    const report = await StatusReport.create({
      project_id: req.params.id,
      created_by: req.user.id,
      ...req.body
    });
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

const updateStatusReport = async (req, res, next) => {
  try {
    const report = await StatusReport.findByPk(req.params.reportId);
    if (!report) return next(new AppError('Report not found', 404));
    await report.update(req.body);
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

const deleteStatusReport = async (req, res, next) => {
  try {
    const report = await StatusReport.findByPk(req.params.reportId);
    if (!report) return next(new AppError('Report not found', 404));
    await report.destroy();
    res.status(200).json({ success: true, message: 'Report deleted' });
  } catch (error) {
    next(error);
  }
};

// Meeting Minutes
const getMeetingMinutes = async (req, res, next) => {
  try {
    const minutes = await MeetingMinute.findAll({
      where: { project_id: req.params.id },
      include: [{ model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] }],
      order: [['meeting_date', 'DESC']]
    });
    
    const formattedMinutes = minutes.map(minute => ({
      ...minute.toJSON(),
      creator: minute.creator ? {
        id: minute.creator.id,
        name: `${minute.creator.first_name || ''} ${minute.creator.last_name || ''}`.trim() || minute.creator.email,
        email: minute.creator.email
      } : null
    }));
    
    res.status(200).json({ success: true, data: formattedMinutes });
  } catch (error) {
    next(error);
  }
};

const createMeetingMinute = async (req, res, next) => {
  try {
    const minute = await MeetingMinute.create({
      project_id: req.params.id,
      created_by: req.user.id,
      ...req.body
    });
    res.status(201).json({ success: true, data: minute });
  } catch (error) {
    next(error);
  }
};

const updateMeetingMinute = async (req, res, next) => {
  try {
    const minute = await MeetingMinute.findByPk(req.params.minuteId);
    if (!minute) return next(new AppError('Meeting minute not found', 404));
    await minute.update(req.body);
    res.status(200).json({ success: true, data: minute });
  } catch (error) {
    next(error);
  }
};

const deleteMeetingMinute = async (req, res, next) => {
  try {
    const minute = await MeetingMinute.findByPk(req.params.minuteId);
    if (!minute) return next(new AppError('Meeting minute not found', 404));
    await minute.destroy();
    res.status(200).json({ success: true, message: 'Meeting minute deleted' });
  } catch (error) {
    next(error);
  }
};

// Communication Logs
const getCommunicationLogs = async (req, res, next) => {
  try {
    const logs = await CommunicationLog.findAll({
      where: { project_id: req.params.id },
      include: [{ model: User, as: 'sender', attributes: ['id', 'first_name', 'last_name', 'email'] }],
      order: [['communication_date', 'DESC']]
    });
    
    const formattedLogs = logs.map(log => ({
      ...log.toJSON(),
      sender: log.sender ? {
        id: log.sender.id,
        name: `${log.sender.first_name || ''} ${log.sender.last_name || ''}`.trim() || log.sender.email,
        email: log.sender.email
      } : null
    }));
    
    res.status(200).json({ success: true, data: formattedLogs });
  } catch (error) {
    next(error);
  }
};

const createCommunicationLog = async (req, res, next) => {
  try {
    const log = await CommunicationLog.create({
      project_id: req.params.id,
      sender_id: req.user.id,
      ...req.body
    });
    res.status(201).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

const updateCommunicationLog = async (req, res, next) => {
  try {
    const log = await CommunicationLog.findByPk(req.params.logId);
    if (!log) return next(new AppError('Communication log not found', 404));
    await log.update(req.body);
    res.status(200).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

const deleteCommunicationLog = async (req, res, next) => {
  try {
    const log = await CommunicationLog.findByPk(req.params.logId);
    if (!log) return next(new AppError('Communication log not found', 404));
    await log.destroy();
    res.status(200).json({ success: true, message: 'Communication log deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
